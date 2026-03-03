const express = require('express');
const router = express.Router();
const db = require('../database');
const { getEffectivePlan, FEATURE_REQUIREMENTS, PLAN_LIMITS } = require('../middleware/featureGate');

let stripe;
try {
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  }
} catch (_) {}

// ─── POST /api/subscription/status ───────────────────────────────────────────
// Full subscription status including feature access map and usage meters
router.post('/status', (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(401).json({ error: 'userId required' });

  const user = db.getUserById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const planRow = db.getUserPlan(userId);
  const effectivePlan = getEffectivePlan(planRow);

  const contractsUsed = db.getContractCountThisMonth(userId);
  const vendorsUsed   = db.getVendorCount(userId);

  const limits = PLAN_LIMITS[effectivePlan] || PLAN_LIMITS.trial;
  const history = db.getSubscriptionHistory(userId);

  // Build feature access map
  const featureAccess = {};
  const PLAN_HIERARCHY = { trial: 0, basic: 1, professional: 2, enterprise: 3 };
  for (const [feature, minPlan] of Object.entries(FEATURE_REQUIREMENTS)) {
    featureAccess[feature] = (user.role === 'admin') ||
      PLAN_HIERARCHY[effectivePlan] >= PLAN_HIERARCHY[minPlan];
  }

  // Trial days remaining
  let trialDaysRemaining = null;
  if (planRow?.subscription_status === 'trial' && planRow?.trial_ends_at) {
    const msLeft = new Date(planRow.trial_ends_at) - new Date();
    trialDaysRemaining = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
  }

  res.json({
    plan: effectivePlan,
    subscription_status: planRow?.subscription_status || 'trial',
    trial_ends_at: planRow?.trial_ends_at || null,
    trial_days_remaining: trialDaysRemaining,
    stripe_subscription_id: planRow?.stripe_subscription_id || null,
    has_stripe_customer: !!planRow?.stripe_customer_id,
    feature_access: featureAccess,
    usage: {
      contracts: { used: contractsUsed, limit: limits.contracts === Infinity ? null : limits.contracts },
      vendors:   { used: vendorsUsed,   limit: limits.vendors   === Infinity ? null : limits.vendors },
    },
    history,
  });
});

// ─── POST /api/subscription/cancel ───────────────────────────────────────────
router.post('/cancel', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(401).json({ error: 'userId required' });

  const planRow = db.getUserPlan(userId);
  if (!planRow?.stripe_subscription_id) {
    return res.status(400).json({ error: 'No active subscription to cancel' });
  }

  if (!stripe) {
    // Soft cancel without Stripe (dev mode)
    db.updateUserPlan(userId, planRow.plan, 'canceled', planRow.stripe_customer_id, null);
    return res.json({ success: true, message: 'Subscription marked as canceled (Stripe not connected)' });
  }

  try {
    // Cancel at period end (user keeps access until billing period is over)
    await stripe.subscriptions.update(planRow.stripe_subscription_id, {
      cancel_at_period_end: true,
    });
    res.json({ success: true, message: 'Subscription will be canceled at the end of the billing period' });
  } catch (err) {
    console.error('Cancel subscription error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/subscription/check-feature ────────────────────────────────────
// Lightweight endpoint for frontend to verify feature access
router.post('/check-feature', (req, res) => {
  const { userId, feature } = req.body;
  if (!userId || !feature) return res.status(400).json({ error: 'userId and feature required' });

  const user = db.getUserById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (user.role === 'admin') return res.json({ allowed: true, plan: 'admin' });

  const planRow = db.getUserPlan(userId);
  const effectivePlan = getEffectivePlan(planRow);
  const requiredPlan = FEATURE_REQUIREMENTS[feature] || 'enterprise';

  const PLAN_HIERARCHY = { trial: 0, basic: 1, professional: 2, enterprise: 3 };
  const allowed = PLAN_HIERARCHY[effectivePlan] >= PLAN_HIERARCHY[requiredPlan];

  res.json({ allowed, plan: effectivePlan, requiredPlan });
});

module.exports = router;

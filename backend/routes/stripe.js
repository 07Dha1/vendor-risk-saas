const express = require('express');
const router = express.Router();
const db = require('../database');
const { getEffectivePlan } = require('../middleware/featureGate');

let stripe;
try {
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  }
} catch (_) {
  console.warn('⚠️  Stripe not installed or key missing. Payment features disabled.');
}

// Map plan names to Stripe Price IDs from .env
const PLAN_PRICE_IDS = {
  basic:        process.env.STRIPE_BASIC_PRICE_ID,
  professional: process.env.STRIPE_PRO_PRICE_ID,
  enterprise:   process.env.STRIPE_ENTERPRISE_PRICE_ID,
};

// ─── GET /api/stripe/subscription-status ─────────────────────────────────────
// Returns current plan info + usage for the frontend
router.get('/subscription-status', async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(401).json({ error: 'userId required' });

  const user = db.getUserById(parseInt(userId));
  if (!user) return res.status(404).json({ error: 'User not found' });

  const planRow = db.getUserPlan(parseInt(userId));
  const effectivePlan = getEffectivePlan(planRow);

  const contractsUsed = db.getContractCountThisMonth(parseInt(userId));
  const vendorsUsed   = db.getVendorCount(parseInt(userId));

  const LIMITS = { trial: { contracts: 3, vendors: 5 }, basic: { contracts: 25, vendors: 15 }, professional: { contracts: 250, vendors: 100 }, enterprise: { contracts: null, vendors: null } };
  const limits = LIMITS[effectivePlan] || LIMITS.trial;

  res.json({
    plan: effectivePlan,
    subscription_status: planRow?.subscription_status || 'trial',
    trial_ends_at: planRow?.trial_ends_at || null,
    stripe_subscription_id: planRow?.stripe_subscription_id || null,
    usage: { contractsUsed, vendorsUsed },
    limits,
  });
});

// ─── POST /api/stripe/create-checkout-session ─────────────────────────────────
router.post('/create-checkout-session', async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Payment system not configured. Add STRIPE_SECRET_KEY to .env' });
  }

  const { userId, plan, billingCycle = 'monthly' } = req.body;
  if (!userId || !plan) return res.status(400).json({ error: 'userId and plan required' });

  const user = db.getUserById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const priceId = PLAN_PRICE_IDS[plan];
  if (!priceId) {
    return res.status(400).json({ error: `No Stripe price configured for plan: ${plan}` });
  }

  try {
    const planRow = db.getUserPlan(userId);
    const hasHadSub = planRow?.stripe_subscription_id != null;

    const sessionParams = {
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?upgrade=success&plan=${plan}`,
      cancel_url:  `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pricing?upgrade=canceled`,
      metadata: { userId: userId.toString(), plan },
    };

    // Attach to existing Stripe customer if they have one
    if (planRow?.stripe_customer_id) {
      sessionParams.customer = planRow.stripe_customer_id;
    } else {
      sessionParams.customer_email = user.email;
    }

    // Offer 14-day trial only if they've never had a subscription
    if (!hasHadSub) {
      sessionParams.subscription_data = { trial_period_days: 14 };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/stripe/create-portal-session ───────────────────────────────────
// Returns Stripe Customer Portal URL for self-serve billing management
router.post('/create-portal-session', async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Payment system not configured' });
  }

  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const planRow = db.getUserPlan(userId);
  if (!planRow?.stripe_customer_id) {
    return res.status(400).json({ error: 'No Stripe customer found for this user' });
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: planRow.stripe_customer_id,
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/subscription`,
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe portal error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/stripe/webhook ─────────────────────────────────────────────────
// IMPORTANT: must use express.raw() body parser — see server.js
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) return res.status(503).send('Stripe not configured');

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = parseInt(session.metadata?.userId);
        const plan   = session.metadata?.plan;
        if (!userId || !plan) break;

        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        db.updateUserPlan(userId, plan, 'active', session.customer, session.subscription);
        db.addSubscriptionRecord(userId, plan, 'active', {
          subscriptionId: session.subscription,
          customerId: session.customer,
          amount: subscription.items.data[0]?.price?.unit_amount,
          currency: subscription.currency,
          periodStart: new Date(subscription.current_period_start * 1000).toISOString(),
          periodEnd:   new Date(subscription.current_period_end   * 1000).toISOString(),
        });
        console.log(`✅ User ${userId} upgraded to ${plan}`);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        if (!invoice.subscription) break;
        const user = db.getUserByStripeSubId(invoice.subscription);
        if (!user) break;

        // Reactivate if past_due
        if (user.subscription_status === 'past_due') {
          db.updateUserPlan(user.id, user.plan, 'active', user.stripe_customer_id, invoice.subscription);
        }
        console.log(`✅ Payment succeeded for user ${user.id}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (!invoice.subscription) break;
        const user = db.getUserByStripeSubId(invoice.subscription);
        if (!user) break;
        db.updateUserPlan(user.id, user.plan, 'past_due', user.stripe_customer_id, invoice.subscription);
        console.log(`⚠️  Payment failed for user ${user.id}`);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const user = db.getUserByStripeCustomerId(sub.customer);
        if (!user) break;

        // Determine plan from price ID
        const priceId = sub.items.data[0]?.price?.id;
        let newPlan = user.plan;
        for (const [p, id] of Object.entries(PLAN_PRICE_IDS)) {
          if (id === priceId) { newPlan = p; break; }
        }

        const newStatus = sub.status === 'active' ? 'active' : sub.status;
        db.updateUserPlan(user.id, newPlan, newStatus, sub.customer, sub.id);
        console.log(`✅ Subscription updated for user ${user.id}: ${newPlan} / ${newStatus}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const user = db.getUserByStripeCustomerId(sub.customer);
        if (!user) break;
        db.updateUserPlan(user.id, 'basic', 'canceled', sub.customer, null);
        console.log(`⚠️  Subscription canceled for user ${user.id}`);
        break;
      }

      default:
        // Unhandled event — ignore
        break;
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
    return res.status(500).send('Webhook handler error');
  }

  res.json({ received: true });
});

module.exports = router;

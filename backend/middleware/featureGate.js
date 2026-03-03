const db = require('../database');

// Plan hierarchy: higher number = more access
const PLAN_HIERARCHY = {
  trial:        0,
  basic:        1,
  professional: 2,
  enterprise:   3,
};

// Minimum plan required for each feature
const FEATURE_REQUIREMENTS = {
  // ── AI features ──────────────────────────────────────────────────────────
  ai_deep_analysis:        'basic',        // rich AI: summary, clauses, parties, dates, mitigations
  ai_contract_chat:        'professional', // Q&A chat with individual contracts
  ai_executive_summary:    'professional', // portfolio-level executive summary
  // ── Reports ───────────────────────────────────────────────────────────────
  download_pdf:            'basic',
  download_excel:          'professional',
  custom_report_builder:   'professional',
  scheduled_reports:       'professional',
  // ── Vendors & analysis ────────────────────────────────────────────────────
  compare_vendors:         'professional',
  risk_cost_analysis:      'professional',
  benchmarking:            'enterprise',
  ranking_table:           'professional',
  realtime_alerts:         'professional',
  incident_severity:       'basic',
  action_tracking:         'professional',
  task_assignment:         'professional',
  status_tracking:         'professional',
  // ── Compliance ────────────────────────────────────────────────────────────
  compliance_status:       'professional',
  cert_alerts:             'professional',
  audit_history:           'professional',
  pending_assessments:     'enterprise',
  compliance_reports_pdf:  'enterprise',
};

// Usage limits per plan (per month for contracts, total for vendors/team)
const PLAN_LIMITS = {
  trial:        { contracts: 3,   vendors: 5,   team: 1 },
  basic:        { contracts: 25,  vendors: 15,  team: 1 },
  professional: { contracts: 250, vendors: 100, team: 10 },
  enterprise:   { contracts: Infinity, vendors: Infinity, team: Infinity },
};

/**
 * Resolve effective plan for a user, accounting for expired trials.
 */
function getEffectivePlan(userPlanRow) {
  if (!userPlanRow) return 'trial';
  const { plan, subscription_status, trial_ends_at } = userPlanRow;

  if (subscription_status === 'trial') {
    if (trial_ends_at && new Date(trial_ends_at) < new Date()) {
      return 'trial'; // expired trial = most restricted
    }
    return 'trial'; // active trial gets trial-level access
  }

  if (subscription_status === 'canceled' || subscription_status === 'past_due') {
    return 'trial'; // no active sub = minimal access
  }

  return plan || 'trial';
}

/**
 * Middleware factory: requireFeature('ai_executive_summary')
 * Reads userId from req.body, checks plan against feature requirement.
 */
function requireFeature(featureName) {
  return (req, res, next) => {
    const userId = req.body?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = db.getUserById(userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Admins bypass all plan checks
    if (user.role === 'admin') return next();

    const planRow = db.getUserPlan(userId);
    const effectivePlan = getEffectivePlan(planRow);
    const requiredPlan = FEATURE_REQUIREMENTS[featureName] || 'enterprise';

    if (PLAN_HIERARCHY[effectivePlan] >= PLAN_HIERARCHY[requiredPlan]) {
      return next();
    }

    return res.status(403).json({
      error: 'PLAN_REQUIRED',
      feature: featureName,
      requiredPlan,
      currentPlan: effectivePlan,
      message: `This feature requires the ${requiredPlan} plan or higher.`,
    });
  };
}

/**
 * Middleware factory: requirePlan('professional')
 * Checks if user has AT LEAST the specified plan level.
 */
function requirePlan(minPlan) {
  return (req, res, next) => {
    const userId = req.body?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = db.getUserById(userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.role === 'admin') return next();

    const planRow = db.getUserPlan(userId);
    const effectivePlan = getEffectivePlan(planRow);

    if (PLAN_HIERARCHY[effectivePlan] >= PLAN_HIERARCHY[minPlan]) {
      return next();
    }

    return res.status(403).json({
      error: 'PLAN_REQUIRED',
      requiredPlan: minPlan,
      currentPlan: effectivePlan,
      message: `This action requires the ${minPlan} plan or higher.`,
    });
  };
}

/**
 * Check if user has hit their contract upload limit for the current month.
 * Returns { allowed: bool, used: number, limit: number }
 */
function checkContractLimit(userId) {
  const user = db.getUserById(userId);
  if (!user || user.role === 'admin') return { allowed: true, used: 0, limit: Infinity };

  const planRow = db.getUserPlan(userId);
  const effectivePlan = getEffectivePlan(planRow);
  const limit = PLAN_LIMITS[effectivePlan]?.contracts ?? 3;

  if (limit === Infinity) return { allowed: true, used: 0, limit: Infinity };

  const used = db.getContractCountThisMonth(userId);
  return { allowed: used < limit, used, limit };
}

/**
 * Check if user has hit their vendor limit.
 */
function checkVendorLimit(userId) {
  const user = db.getUserById(userId);
  if (!user || user.role === 'admin') return { allowed: true, used: 0, limit: Infinity };

  const planRow = db.getUserPlan(userId);
  const effectivePlan = getEffectivePlan(planRow);
  const limit = PLAN_LIMITS[effectivePlan]?.vendors ?? 5;

  if (limit === Infinity) return { allowed: true, used: 0, limit: Infinity };

  const used = db.getVendorCount(userId);
  return { allowed: used < limit, used, limit };
}

module.exports = {
  requireFeature,
  requirePlan,
  checkContractLimit,
  checkVendorLimit,
  getEffectivePlan,
  FEATURE_REQUIREMENTS,
  PLAN_HIERARCHY,
  PLAN_LIMITS,
};

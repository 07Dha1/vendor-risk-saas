import { useAuth } from '../AuthContext';

// Mirror of backend PLAN_HIERARCHY and FEATURE_REQUIREMENTS
const PLAN_HIERARCHY = { trial: 0, basic: 1, professional: 2, enterprise: 3 };

const FEATURE_REQUIREMENTS = {
  // ── AI features ──────────────────────────────────────────────────────────
  ai_deep_analysis:       'basic',        // rich AI: summary, clauses, parties, dates, mitigations
  ai_contract_chat:       'professional', // Q&A chat with individual contracts
  ai_executive_summary:   'professional', // portfolio-level executive summary
  // ── Reports ───────────────────────────────────────────────────────────────
  download_pdf:           'basic',
  download_excel:         'professional',
  custom_report_builder:  'professional',
  scheduled_reports:      'professional',
  // ── Vendors & analysis ────────────────────────────────────────────────────
  compare_vendors:        'professional',
  risk_cost_analysis:     'professional',
  benchmarking:           'enterprise',
  ranking_table:          'professional',
  realtime_alerts:        'professional',
  incident_severity:      'basic',
  action_tracking:        'professional',
  task_assignment:        'professional',
  status_tracking:        'professional',
  // ── Compliance ────────────────────────────────────────────────────────────
  compliance_status:      'professional',
  cert_alerts:            'professional',
  audit_history:          'professional',
  pending_assessments:    'enterprise',
  compliance_reports_pdf: 'enterprise',
};

const PLAN_LIMITS = {
  trial:        { contracts: 3,   vendors: 5,   team: 1 },
  basic:        { contracts: 25,  vendors: 15,  team: 1 },
  professional: { contracts: 250, vendors: 100, team: 10 },
  enterprise:   { contracts: null, vendors: null, team: null }, // null = unlimited
};

export const PLAN_DISPLAY = {
  trial:        { label: 'Trial',        color: 'bg-gray-100 text-gray-600',    ring: 'ring-gray-300' },
  basic:        { label: 'Basic',        color: 'bg-blue-100 text-blue-700',    ring: 'ring-blue-300' },
  professional: { label: 'Pro',          color: 'bg-purple-100 text-purple-700', ring: 'ring-purple-400' },
  enterprise:   { label: 'Enterprise',   color: 'bg-amber-100 text-amber-700',  ring: 'ring-amber-400' },
};

export function usePlan() {
  const { user } = useAuth();

  // Derive effective plan — fall back to 'trial' if fields missing
  const plan = user?.plan || 'trial';
  const status = user?.subscription_status || 'trial';
  const trialEndsAt = user?.trial_ends_at ? new Date(user.trial_ends_at) : null;
  const isAdmin = user?.role === 'admin';

  /** Is the user on an active paid subscription? */
  const isActive = status === 'active' || isAdmin;

  /** Is the trial still running? */
  const isTrialActive = status === 'trial' && trialEndsAt && trialEndsAt > new Date();

  /** Has the trial expired? */
  const isTrialExpired = status === 'trial' && (!trialEndsAt || trialEndsAt <= new Date());

  /** Calendar days left in trial (0 if expired) */
  const trialDaysLeft = isTrialActive
    ? Math.max(0, Math.ceil((trialEndsAt - new Date()) / (1000 * 60 * 60 * 24)))
    : 0;

  /** Effective plan rank — expired trial treated as lowest */
  const effectivePlan = (isTrialExpired && !isActive) ? 'trial' : plan;

  /**
   * Returns true if the user's plan meets the requirement for a feature.
   * Admins always have access.
   */
  function hasFeature(featureName) {
    if (isAdmin) return true;
    const requiredPlan = FEATURE_REQUIREMENTS[featureName] || 'enterprise';
    return PLAN_HIERARCHY[effectivePlan] >= PLAN_HIERARCHY[requiredPlan];
  }

  /**
   * Returns true if the user's plan is at least `minPlan`.
   */
  function atLeast(minPlan) {
    if (isAdmin) return true;
    return PLAN_HIERARCHY[effectivePlan] >= PLAN_HIERARCHY[minPlan];
  }

  /**
   * Returns the minimum plan required for a feature.
   */
  function requiredPlanFor(featureName) {
    return FEATURE_REQUIREMENTS[featureName] || 'enterprise';
  }

  /** Limits for the current plan */
  const limits = PLAN_LIMITS[effectivePlan] || PLAN_LIMITS.trial;

  /** Usage from AuthContext (populated by refreshPlan) */
  const usage = user?.usage || { contracts: { used: 0 }, vendors: { used: 0 } };

  /** Returns percentage of contract limit used (0-100) */
  function contractUsagePercent() {
    if (!limits.contracts) return 0;
    return Math.min(100, Math.round(((usage.contracts?.used || 0) / limits.contracts) * 100));
  }

  /** Returns true if user has hit their contract monthly limit */
  function isContractLimitReached() {
    if (!limits.contracts) return false;
    return (usage.contracts?.used || 0) >= limits.contracts;
  }

  return {
    plan: effectivePlan,
    rawPlan: plan,
    status,
    isAdmin,
    isActive,
    isTrialActive,
    isTrialExpired,
    trialDaysLeft,
    trialEndsAt,
    hasFeature,
    atLeast,
    requiredPlanFor,
    limits,
    usage,
    contractUsagePercent,
    isContractLimitReached,
    PLAN_DISPLAY,
    PLAN_HIERARCHY,
    FEATURE_REQUIREMENTS,
  };
}

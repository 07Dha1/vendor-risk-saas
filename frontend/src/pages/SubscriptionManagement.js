import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { api } from '../api';
import { usePlan, PLAN_DISPLAY } from '../hooks/usePlan';

const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    monthly: 2999,
    annual: 2399,
    monthlyLabel: '₹2,999',
    annualLabel: '₹2,399',
    description: 'For individual risk practitioners',
    limits: { contracts: '25/mo', vendors: '15', team: '1 user' },
    features: [
      'Download risk reports (PDF)',
      'Incident severity level',
      'Basic AI contract analysis',
      'Vendor directory',
    ],
    color: 'border-blue-200 bg-blue-50',
    badge: 'bg-blue-100 text-blue-700',
  },
  {
    id: 'professional',
    name: 'Professional',
    monthly: 8999,
    annual: 7199,
    monthlyLabel: '₹8,999',
    annualLabel: '₹7,199',
    description: 'For growing teams',
    limits: { contracts: '250/mo', vendors: '100', team: '10 users' },
    popular: true,
    features: [
      'Everything in Basic',
      'Custom report builder + Excel exports',
      'Scheduled email reports',
      'AI Executive Summary',
      'Compare vendors, Risk vs Cost',
      'Real-time risk alerts',
      'Action tracking & task assignment',
      'Compliance status & audit history',
    ],
    color: 'border-purple-300 bg-purple-50',
    badge: 'bg-purple-100 text-purple-700',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthly: 24999,
    annual: 19999,
    monthlyLabel: '₹24,999',
    annualLabel: '₹19,999',
    description: 'For large organisations',
    limits: { contracts: 'Unlimited', vendors: 'Unlimited', team: 'Unlimited' },
    features: [
      'Everything in Professional',
      'Performance benchmarking',
      'Pending Assessments module',
      'Auto-generated compliance PDFs',
      'Unlimited contracts & vendors',
      'Priority support + SLA',
      'Custom integrations',
    ],
    color: 'border-amber-200 bg-amber-50',
    badge: 'bg-amber-100 text-amber-700',
  },
];

function UsageMeter({ label, used, limit, color = 'bg-blue-500' }) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const isNearLimit = pct >= 80;
  const isAtLimit = pct >= 100;
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{label}</span>
        <span className={isAtLimit ? 'text-red-600 font-semibold' : isNearLimit ? 'text-amber-600 font-medium' : ''}>
          {limit ? `${used} / ${limit}` : `${used} / ∞`}
        </span>
      </div>
      {limit && (
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-amber-400' : color}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default function SubscriptionManagement() {
  const { user, refreshPlan } = useAuth();
  const { plan, status, trialDaysLeft, isTrialActive, isTrialExpired } = usePlan();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [subData, setSubData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [upgradeLoading, setUpgradeLoading] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadStatus = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await api.getSubscriptionStatus(user.id);
      setSubData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadStatus();
    // Handle Stripe redirect success/cancel
    if (searchParams.get('upgrade') === 'success') {
      setMessage('🎉 Subscription activated! Your plan has been upgraded.');
      refreshPlan(user?.id);
    } else if (searchParams.get('upgrade') === 'canceled') {
      setMessage('Checkout was canceled. Your plan has not changed.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpgrade = async (planId) => {
    if (!user) return navigate('/login');
    setUpgradeLoading(planId);
    setError('');
    try {
      const { url } = await api.createCheckoutSession(user.id, planId, billingCycle);
      window.location.href = url;
    } catch (e) {
      setError(e.message || 'Failed to start checkout.');
      setUpgradeLoading('');
    }
  };

  const handlePortal = async () => {
    if (!user) return;
    setPortalLoading(true);
    setError('');
    try {
      const { url } = await api.createPortalSession(user.id);
      window.location.href = url;
    } catch (e) {
      setError(e.message || 'Failed to open billing portal. Make sure you have an active subscription.');
      setPortalLoading(false);
    }
  };

  const handleCancel = async () => {
    setCancelLoading(true);
    setError('');
    try {
      const result = await api.cancelSubscription(user.id);
      setMessage(result.message || 'Subscription will be canceled at end of billing period.');
      setShowCancelConfirm(false);
      await loadStatus();
      await refreshPlan(user.id);
    } catch (e) {
      setError(e.message || 'Failed to cancel subscription.');
    } finally {
      setCancelLoading(false);
    }
  };

  const currentPlanMeta = PLANS.find(p => p.id === plan) || PLANS[0];
  const planDisplay = PLAN_DISPLAY[plan] || PLAN_DISPLAY.trial;

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-blue-600 text-sm font-medium transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </button>
          <span className="text-xs text-gray-400">VendorShield · Subscription</span>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">

        {/* Status messages */}
        {message && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-3 text-sm text-green-800 flex items-center gap-2">
            <span>{message}</span>
            <button onClick={() => setMessage('')} className="ml-auto text-green-600 hover:text-green-800">✕</button>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 text-sm text-red-700 flex items-center gap-2">
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">✕</button>
          </div>
        )}

        {/* Current Plan Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Current Plan</p>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{currentPlanMeta?.name || 'Trial'}</h1>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${planDisplay.color}`}>
                  {status === 'trial' ? (isTrialExpired ? 'EXPIRED' : `${trialDaysLeft}d left`) : status.toUpperCase()}
                </span>
              </div>
              {isTrialActive && (
                <p className="text-sm text-gray-500 mt-1">
                  Free trial · {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} remaining
                </p>
              )}
              {status === 'active' && (
                <p className="text-sm text-gray-500 mt-1">
                  {billingCycle === 'monthly' ? 'Monthly billing' : 'Annual billing'}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {subData?.has_stripe_customer && (
                <button
                  onClick={handlePortal}
                  disabled={portalLoading}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition disabled:opacity-50"
                >
                  {portalLoading ? 'Opening…' : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      Manage Billing
                    </>
                  )}
                </button>
              )}
              {status === 'active' && !showCancelConfirm && (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="px-4 py-2 bg-white border border-red-200 hover:bg-red-50 text-red-600 text-sm font-medium rounded-lg transition"
                >
                  Cancel Plan
                </button>
              )}
            </div>
          </div>

          {/* Cancel confirm */}
          {showCancelConfirm && (
            <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl text-sm">
              <p className="font-semibold text-red-700 mb-2">Cancel your subscription?</p>
              <p className="text-red-600 mb-3">You'll keep access until the end of your current billing period. After that, you'll be downgraded to trial access.</p>
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  disabled={cancelLoading}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
                >
                  {cancelLoading ? 'Canceling…' : 'Yes, cancel'}
                </button>
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="px-4 py-1.5 bg-white border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50"
                >
                  Keep my plan
                </button>
              </div>
            </div>
          )}

          {/* Usage Meters */}
          {loading ? (
            <div className="text-sm text-gray-400">Loading usage…</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <UsageMeter
                label="Contracts this month"
                used={subData?.usage?.contractsUsed ?? 0}
                limit={subData?.limits?.contracts}
                color="bg-blue-500"
              />
              <UsageMeter
                label="Vendors"
                used={subData?.usage?.vendorsUsed ?? 0}
                limit={subData?.limits?.vendors}
                color="bg-purple-500"
              />
            </div>
          )}
        </div>

        {/* Upgrade Plans */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-gray-900">
              {plan === 'enterprise' ? 'You have the best plan' : 'Upgrade your plan'}
            </h2>
            {/* Billing cycle toggle */}
            <div className="flex items-center bg-gray-100 rounded-full p-0.5 text-sm">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-1.5 rounded-full font-medium transition ${billingCycle === 'monthly' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-4 py-1.5 rounded-full font-medium transition ${billingCycle === 'annual' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}
              >
                Annual <span className="text-green-600 text-xs font-bold">-20%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PLANS.map(p => {
              const isCurrent = p.id === plan;
              const price = billingCycle === 'annual' ? p.annualLabel : p.monthlyLabel;

              return (
                <div
                  key={p.id}
                  className={`relative rounded-2xl border-2 p-6 ${
                    isCurrent
                      ? 'border-blue-500 bg-blue-50'
                      : p.popular
                        ? 'border-purple-300 bg-white'
                        : 'border-gray-200 bg-white'
                  }`}
                >
                  {p.popular && !isCurrent && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-bold px-3 py-0.5 rounded-full">
                      MOST POPULAR
                    </span>
                  )}
                  {isCurrent && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-0.5 rounded-full">
                      CURRENT PLAN
                    </span>
                  )}

                  <h3 className="font-bold text-gray-900 text-lg mb-0.5">{p.name}</h3>
                  <p className="text-xs text-gray-400 mb-3">{p.description}</p>

                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-3xl font-bold text-gray-900">{price}</span>
                    <span className="text-gray-400 text-sm">/mo</span>
                    {billingCycle === 'annual' && (
                      <span className="ml-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">save 20%</span>
                    )}
                  </div>

                  {/* Limits pills */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {Object.entries(p.limits).map(([k, v]) => (
                      <span key={k} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {v} {k}
                      </span>
                    ))}
                  </div>

                  <ul className="space-y-1.5 mb-5">
                    {p.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4 text-green-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <button disabled className="w-full py-2.5 rounded-xl bg-blue-100 text-blue-700 font-semibold text-sm opacity-80 cursor-not-allowed">
                      Current Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(p.id)}
                      disabled={!!upgradeLoading}
                      className="w-full py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-semibold text-sm transition disabled:opacity-50"
                    >
                      {upgradeLoading === p.id ? 'Redirecting…' : `Upgrade to ${p.name}`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            14-day free trial on Basic & Professional · Cancel anytime · Secured by Stripe
          </p>
        </div>

        {/* Subscription history */}
        {subData?.history?.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-4">Billing History</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                    <th className="pb-2 pr-4">Plan</th>
                    <th className="pb-2 pr-4">Amount</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {subData.history.map((h, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="py-2.5 pr-4 capitalize font-medium text-gray-700">{h.plan}</td>
                      <td className="py-2.5 pr-4 text-gray-600">
                        {h.amount ? `₹${(h.amount / 100).toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          h.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>{h.status}</span>
                      </td>
                      <td className="py-2.5 text-gray-400">
                        {new Date(h.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { api } from '../api';

const PLAN_FEATURES = {
  basic: [
    'Download risk reports (PDF)',
    'Incident severity level',
    'Up to 25 contracts/month',
    'Up to 15 vendors',
  ],
  professional: [
    'Everything in Basic',
    'Download Excel reports',
    'Custom report builder',
    'Scheduled email reports',
    'AI Executive Summary',
    'Compare up to 5 vendors',
    'Risk vs Cost analysis',
    'Real-time risk alerts',
    'Action tracking workflow',
    'Compliance status tracking',
    'Expiring cert alerts',
    'Audit history',
    'Up to 250 contracts/month',
    'Up to 10 team members',
  ],
  enterprise: [
    'Everything in Professional',
    'Performance benchmarking',
    'Compare unlimited vendors',
    'Pending Assessments module',
    'Auto-generated compliance PDFs',
    'Unlimited contracts & vendors',
    'Unlimited team members',
    'Priority support + SLA',
  ],
};

const PLAN_PRICES = {
  basic:        { monthly: '₹2,999', annual: '₹2,399', label: 'Basic' },
  professional: { monthly: '₹8,999', annual: '₹7,199', label: 'Professional' },
  enterprise:   { monthly: '₹24,999', annual: '₹19,999', label: 'Enterprise' },
};

export default function UpgradeModal({ isOpen, onClose, requiredPlan = 'professional', featureName = '' }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleUpgrade = async (plan) => {
    if (!user) { navigate('/login'); return; }
    setLoading(true);
    setError('');
    try {
      const { url } = await api.createCheckoutSession(user.id, plan);
      window.location.href = url;
    } catch (err) {
      setError(err.message || 'Failed to start checkout. Please try again.');
      setLoading(false);
    }
  };

  const plans = requiredPlan === 'enterprise'
    ? ['enterprise']
    : ['professional', 'enterprise'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-t-2xl p-6 text-white">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-blue-200 text-xs font-medium uppercase tracking-wide">Upgrade Required</p>
              <h2 className="text-xl font-bold">Unlock {featureName || 'this feature'}</h2>
            </div>
          </div>
          <p className="text-blue-100 text-sm">
            This feature requires the <strong className="text-white capitalize">{requiredPlan}</strong> plan or higher.
          </p>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          <div className={`grid gap-4 ${plans.length === 1 ? 'grid-cols-1 max-w-sm mx-auto' : 'grid-cols-1 sm:grid-cols-2'}`}>
            {plans.map(plan => {
              const price = PLAN_PRICES[plan];
              const features = PLAN_FEATURES[plan];
              const isRecommended = plan === requiredPlan;

              return (
                <div
                  key={plan}
                  className={`rounded-xl border-2 p-5 relative ${
                    isRecommended
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  {isRecommended && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-0.5 rounded-full">
                      RECOMMENDED
                    </span>
                  )}
                  <h3 className="font-bold text-gray-900 text-lg mb-1 capitalize">{price.label}</h3>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-2xl font-bold text-gray-900">{price.monthly}</span>
                    <span className="text-gray-500 text-sm">/mo</span>
                  </div>
                  <ul className="space-y-1.5 mb-5">
                    {features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4 text-green-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleUpgrade(plan)}
                    disabled={loading}
                    className={`w-full py-2.5 rounded-xl font-semibold text-sm transition ${
                      isRecommended
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-gray-900 hover:bg-gray-800 text-white'
                    } disabled:opacity-50`}
                  >
                    {loading ? 'Redirecting…' : `Upgrade to ${price.label}`}
                  </button>
                </div>
              );
            })}
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            14-day free trial · Cancel anytime · Secure payment via Stripe
          </p>

          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
            <button onClick={() => navigate('/pricing')} className="text-sm text-blue-600 hover:underline">
              View full pricing comparison →
            </button>
            <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600">
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

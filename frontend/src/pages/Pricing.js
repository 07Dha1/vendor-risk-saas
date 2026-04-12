import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { api } from '../api';

const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    monthly: '₹2,999',
    annual: '₹2,399',
    annualTotal: '₹28,788',
    description: 'For individual risk practitioners and small teams getting started.',
    limits: '25 contracts/mo · 15 vendors · 1 user',
    cta: 'Start Free Trial',
    color: 'border-gray-200',
    badge: null,
    features: [
      { label: 'AI contract risk analysis', included: true },
      { label: 'Download risk reports (PDF)', included: true },
      { label: 'Incident severity level', included: true },
      { label: 'Vendor directory', included: true },
      { label: 'Basic status tracking', included: true },
      { label: 'Download Excel reports', included: false },
      { label: 'Custom report builder', included: false },
      { label: 'Scheduled email reports', included: false },
      { label: 'AI Executive Summary', included: false },
      { label: 'Compare vendors / Risk vs Cost', included: false },
      { label: 'Real-time risk alerts', included: false },
      { label: 'Action tracking & task assignment', included: false },
      { label: 'Compliance status & audit history', included: false },
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    monthly: '₹8,999',
    annual: '₹7,199',
    annualTotal: '₹86,388',
    description: 'For growing teams that need deeper analytics and team collaboration.',
    limits: '250 contracts/mo · 100 vendors · 10 users',
    cta: 'Start Free Trial',
    popular: true,
    color: 'border-blue-500',
    badge: 'MOST POPULAR',
    badgeColor: 'bg-blue-600',
    features: [
      { label: 'AI contract risk analysis', included: true },
      { label: 'Download risk reports (PDF)', included: true },
      { label: 'Incident severity level', included: true },
      { label: 'Vendor directory', included: true },
      { label: 'Basic status tracking', included: true },
      { label: 'Download Excel reports', included: true },
      { label: 'Custom report builder', included: true },
      { label: 'Scheduled email reports', included: true },
      { label: 'AI Executive Summary', included: true },
      { label: 'Compare vendors / Risk vs Cost', included: true },
      { label: 'Real-time risk alerts', included: true },
      { label: 'Action tracking & task assignment', included: true },
      { label: 'Compliance status & audit history', included: true },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthly: '₹24,999',
    annual: '₹19,999',
    annualTotal: '₹2,39,988',
    description: 'For large organisations with advanced compliance and governance requirements.',
    limits: 'Unlimited contracts · Unlimited vendors · Unlimited users',
    cta: 'Contact Sales',
    color: 'border-gray-200',
    badge: null,
    features: [
      { label: 'Everything in Professional', included: true },
      { label: 'Performance benchmarking', included: true },
      { label: 'Pending Assessments module', included: true },
      { label: 'Auto-generated compliance PDFs', included: true },
      { label: 'Unlimited contracts & vendors', included: true },
      { label: 'Unlimited team members', included: true },
      { label: 'Priority support + SLA', included: true },
      { label: 'Custom integrations', included: true },
      { label: 'Dedicated account manager', included: true },
    ],
  },
];

const FAQS = [
  {
    q: 'Is there a free trial?',
    a: 'Yes. Basic and Professional plans come with a 14-day free trial — no credit card required. You can explore all features in your chosen tier before being charged.',
  },
  {
    q: 'Can I change my plan later?',
    a: 'Absolutely. You can upgrade or downgrade at any time from your Subscription page. Upgrades take effect immediately; downgrades take effect at the end of your current billing period.',
  },
  {
    q: 'What payment methods are accepted?',
    a: 'We accept all major credit and debit cards (Visa, Mastercard, RuPay, Amex) via Stripe. UPI and bank transfers are available on annual Enterprise plans.',
  },
  {
    q: 'What happens when I hit my contract limit?',
    a: "You'll receive an in-app warning at 80% usage. When you reach the limit, new uploads will be paused until the next billing month or until you upgrade.",
  },
  {
    q: 'Is pricing in INR inclusive of GST?',
    a: 'Displayed prices are exclusive of GST. 18% GST will be added at checkout for Indian customers in compliance with Indian tax regulations.',
  },
  {
    q: 'What does the Enterprise plan include?',
    a: 'Enterprise includes everything in Professional plus performance benchmarking, unlimited usage, pending assessments, auto-generated compliance PDFs, and a dedicated account manager. Contact our sales team for custom pricing if you need custom integrations or on-premise deployment.',
  },
];

function Check({ included }) {
  if (included) {
    return (
      <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left bg-white hover:bg-gray-50 transition"
      >
        <span className="font-medium text-gray-800 text-sm">{q}</span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed bg-white border-t border-gray-100">
          {a}
        </div>
      )}
    </div>
  );
}

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [billing, setBilling] = useState('monthly');
  const [loadingPlan, setLoadingPlan] = useState('');
  const [error, setError] = useState('');

  const handleCTA = async (plan) => {
    if (plan.id === 'enterprise') {
      navigate('/about');
      return;
    }
    if (!user) {
      navigate('/signup');
      return;
    }
    setLoadingPlan(plan.id);
    setError('');
    try {
      const { url } = await api.createCheckoutSession(user.id, plan.id, billing);
      if (!url) throw new Error('no_url');
      window.location.href = url;
    } catch (e) {
      setLoadingPlan('');
      if (e.message === 'no_url' || e.message?.toLowerCase().includes('not configured') || e.message?.toLowerCase().includes('stripe')) {
        setError('Payments are coming soon! Contact us at dhawansai1@gmail.com to upgrade your plan.');
      } else {
        setError(e.message || 'Failed to start checkout. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Nav */}
      <nav className="bg-white/80 backdrop-blur border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 font-bold text-gray-900 hover:text-blue-600 transition text-sm"
          >
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            VendorShield
          </button>
          <div className="flex items-center gap-3">
            {user ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="text-sm px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
              >
                Dashboard
              </button>
            ) : (
              <>
                <button onClick={() => navigate('/login')} className="text-sm text-gray-600 hover:text-gray-900 font-medium">Sign in</button>
                <button
                  onClick={() => navigate('/signup')}
                  className="text-sm px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
                >
                  Get started
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="bg-white border-b border-gray-100 py-16 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <span className="inline-block text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wide mb-4">
            Transparent pricing
          </span>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Simple, scalable plans</h1>
          <p className="text-gray-500 text-lg mb-8">
            Start free for 14 days. No credit card required. Upgrade when you're ready.
          </p>
          {/* Billing toggle */}
          <div className="inline-flex items-center bg-gray-100 rounded-full p-1 text-sm">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-5 py-2 rounded-full font-medium transition ${billing === 'monthly' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('annual')}
              className={`px-5 py-2 rounded-full font-medium transition flex items-center gap-2 ${billing === 'annual' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Annual
              <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Save 20%</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="max-w-4xl mx-auto px-6 mt-6">
          <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 text-sm text-red-700 flex items-center justify-between">
            {error}
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 ml-4">✕</button>
          </div>
        </div>
      )}

      {/* Plan cards */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {PLANS.map(plan => (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl border-2 p-7 shadow-sm ${plan.color} ${plan.popular ? 'ring-4 ring-blue-100 scale-[1.02]' : ''}`}
            >
              {plan.badge && (
                <span className={`absolute -top-3.5 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-4 py-1 rounded-full ${plan.badgeColor}`}>
                  {plan.badge}
                </span>
              )}
              <div className="mb-5">
                <h2 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h2>
                <p className="text-sm text-gray-400 leading-snug">{plan.description}</p>
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-bold text-gray-900">
                  {billing === 'annual' ? plan.annual : plan.monthly}
                </span>
                <span className="text-gray-400 text-sm">/mo</span>
              </div>
              {billing === 'annual' ? (
                <p className="text-xs text-green-600 font-medium mb-4">{plan.annualTotal} billed annually</p>
              ) : (
                <div className="mb-4" />
              )}
              <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 mb-5 font-medium">{plan.limits}</p>
              <button
                onClick={() => handleCTA(plan)}
                disabled={!!loadingPlan}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition mb-6 disabled:opacity-50 ${
                  plan.popular
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200'
                    : 'bg-gray-900 hover:bg-gray-800 text-white'
                }`}
              >
                {loadingPlan === plan.id ? 'Redirecting…' : plan.cta}
              </button>
              <ul className="space-y-2.5">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <Check included={f.included} />
                    <span className={`text-sm ${f.included ? 'text-gray-600' : 'text-gray-300'}`}>{f.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {/* Trust strip */}
        <div className="mt-10 flex flex-wrap justify-center gap-6 text-xs text-gray-400">
          {['🔒 Payments secured by Stripe', '📋 14-day free trial, no card needed', '↩️ Cancel anytime', '🇮🇳 GST invoices provided'].map((item, i) => (
            <span key={i}>{item}</span>
          ))}
        </div>
      </div>

      {/* Feature comparison table */}
      <div className="bg-white border-y border-gray-100 py-14">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Full feature comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left text-gray-500 font-medium pb-4 w-1/2">Feature</th>
                  {['Basic', 'Professional', 'Enterprise'].map(p => (
                    <th key={p} className="text-center text-gray-700 font-bold pb-4 px-2">{p}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  ['AI contract analysis',                 true,  true,  true ],
                  ['Download reports (PDF)',                true,  true,  true ],
                  ['Incident severity level',              true,  true,  true ],
                  ['Download Excel reports',               false, true,  true ],
                  ['Custom report builder',                false, true,  true ],
                  ['Scheduled email reports',              false, true,  true ],
                  ['AI Executive Summary',                 false, true,  true ],
                  ['Compare multiple vendors',             false, true,  true ],
                  ['Risk vs Cost analysis',                false, true,  true ],
                  ['Ranking table',                        false, true,  true ],
                  ['Real-time risk alerts',                false, true,  true ],
                  ['Action tracking workflow',             false, true,  true ],
                  ['Assign tasks to team members',         false, true,  true ],
                  ['Status tracking (Open/Investigating)', false, true,  true ],
                  ['Compliance status (ISO, SOC2, GDPR)',  false, true,  true ],
                  ['Expiring certification alerts',        false, true,  true ],
                  ['Audit history',                        false, true,  true ],
                  ['Performance benchmarking',             false, false, true ],
                  ['Pending Assessments module',           false, false, true ],
                  ['Auto-generated compliance reports',    false, false, true ],
                  ['Unlimited contracts & vendors',        false, false, true ],
                  ['Priority support + SLA',               false, false, true ],
                ].map(([label, ...vals], i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="py-3 text-gray-700">{label}</td>
                    {vals.map((v, j) => (
                      <td key={j} className="py-3 text-center"><Check included={v} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto px-6 py-14">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Frequently asked questions</h2>
        <div className="space-y-3">
          {FAQS.map((faq, i) => <FAQItem key={i} {...faq} />)}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 py-16 text-center text-white">
        <h2 className="text-3xl font-bold mb-3">Ready to secure your vendor contracts?</h2>
        <p className="text-blue-100 mb-8 text-lg">Start your 14-day free trial today. No credit card required.</p>
        <div className="flex justify-center gap-3 flex-wrap">
          <button
            onClick={() => navigate(user ? '/dashboard' : '/signup')}
            className="px-8 py-3 bg-white text-blue-700 font-semibold rounded-xl hover:bg-blue-50 transition shadow-lg"
          >
            {user ? 'Go to Dashboard' : 'Start Free Trial'}
          </button>
          <button
            onClick={() => navigate('/about')}
            className="px-8 py-3 bg-white/10 border border-white/30 text-white font-medium rounded-xl hover:bg-white/20 transition"
          >
            Contact Sales
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-100 py-8 text-center text-xs text-gray-400">
        <p>© 2026 VendorShield. All rights reserved.</p>
        <div className="flex justify-center gap-6 mt-2">
          <button onClick={() => navigate('/privacy')} className="hover:text-gray-600 transition">Privacy Policy</button>
          <button onClick={() => navigate('/terms')} className="hover:text-gray-600 transition">Terms of Service</button>
          <button onClick={() => navigate('/')} className="hover:text-gray-600 transition">Home</button>
        </div>
      </div>
    </div>
  );
}

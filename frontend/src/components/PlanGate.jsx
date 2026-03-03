import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlan } from '../hooks/usePlan';
import UpgradeModal from './UpgradeModal';

const PLAN_LABELS = {
  basic: 'Basic',
  professional: 'Professional',
  enterprise: 'Enterprise',
};

/**
 * PlanGate — wraps any feature and shows an upgrade prompt if user lacks access.
 *
 * Usage:
 *   <PlanGate feature="ai_executive_summary">
 *     <MyFeatureComponent />
 *   </PlanGate>
 *
 * Props:
 *   feature       — key from FEATURE_REQUIREMENTS (e.g. 'ai_executive_summary')
 *   children      — the feature UI to render when access is granted
 *   fallback      — optional custom locked UI; defaults to inline locked card
 *   minPlan       — override: require a specific plan regardless of feature map
 *   featureLabel  — human-readable feature name shown in the locked card
 *   compact       — show a small inline lock pill instead of full card
 */
export default function PlanGate({
  feature,
  children,
  fallback,
  minPlan,
  featureLabel,
  compact = false,
}) {
  const { hasFeature, atLeast, requiredPlanFor } = usePlan();
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();

  // Determine if access is granted
  const hasAccess = minPlan
    ? atLeast(minPlan)
    : feature
      ? hasFeature(feature)
      : true;

  if (hasAccess) return <>{children}</>;

  const requiredPlan = minPlan || (feature ? requiredPlanFor(feature) : 'professional');
  const label = featureLabel || (feature ? feature.replace(/_/g, ' ') : 'this feature');

  // If a custom fallback is provided, render it
  if (fallback) return <>{fallback}</>;

  // ── Compact lock pill ──────────────────────────────────────────────────────
  if (compact) {
    return (
      <>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-full transition cursor-pointer"
          title={`Requires ${PLAN_LABELS[requiredPlan]} plan`}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          {PLAN_LABELS[requiredPlan]}
        </button>
        <UpgradeModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          requiredPlan={requiredPlan}
          featureName={label}
        />
      </>
    );
  }

  // ── Full locked card ───────────────────────────────────────────────────────
  return (
    <>
      <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 flex flex-col items-center justify-center text-center gap-4 min-h-[200px]">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-gray-700 mb-1 capitalize">{label}</p>
          <p className="text-sm text-gray-400">
            Available on the <span className="font-medium text-gray-600 capitalize">{PLAN_LABELS[requiredPlan]}</span> plan
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition"
          >
            Upgrade Plan
          </button>
          <button
            onClick={() => navigate('/pricing')}
            className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 text-sm font-medium rounded-lg transition"
          >
            View Plans
          </button>
        </div>
      </div>
      <UpgradeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        requiredPlan={requiredPlan}
        featureName={label}
      />
    </>
  );
}

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlan } from '../hooks/usePlan';

export default function TrialBanner() {
  const { isTrialActive, isTrialExpired, trialDaysLeft } = usePlan();
  const navigate = useNavigate();

  if (isTrialExpired) {
    return (
      <div className="bg-red-600 text-white px-4 py-2.5 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span><strong>Your free trial has ended.</strong> Upgrade now to regain full access.</span>
        </div>
        <button
          onClick={() => navigate('/pricing')}
          className="shrink-0 ml-4 bg-white text-red-600 text-xs font-semibold px-3 py-1 rounded-full hover:bg-red-50 transition"
        >
          Choose a Plan
        </button>
      </div>
    );
  }

  if (isTrialActive && trialDaysLeft <= 7) {
    return (
      <div className="bg-amber-500 text-white px-4 py-2.5 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            <strong>{trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} left</strong> in your free trial.
          </span>
        </div>
        <button
          onClick={() => navigate('/pricing')}
          className="shrink-0 ml-4 bg-white text-amber-600 text-xs font-semibold px-3 py-1 rounded-full hover:bg-amber-50 transition"
        >
          Upgrade Now
        </button>
      </div>
    );
  }

  return null;
}

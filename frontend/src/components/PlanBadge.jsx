import React from 'react';
import { usePlan, PLAN_DISPLAY } from '../hooks/usePlan';

export default function PlanBadge({ className = '' }) {
  const { plan, isAdmin } = usePlan();
  const display = PLAN_DISPLAY[plan] || PLAN_DISPLAY.trial;

  if (isAdmin) {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 ${className}`}>
        ADMIN
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${display.color} ${className}`}>
      {display.label.toUpperCase()}
    </span>
  );
}

import React from 'react';

/**
 * StatusPill: Displays the strict participation role (投标 / 授标 / 履约 / 交付 / 验收)
 */
export function StatusPill({ role = 'performance', className = '' }) {
  const roleConfigs = {
    bidding: {
      label: '投标 (Bidding)',
      shortLabel: '投标',
      classes: 'bg-purple-50 text-purple-700 border-purple-200',
    },
    awarding: {
      label: '授标 (Awarded)',
      shortLabel: '授标',
      classes: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
    performance: {
      label: '履约 (In-Performance)',
      shortLabel: '履约',
      classes: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold',
    },
    delivery: {
      label: '交付 (Delivered)',
      shortLabel: '交付',
      classes: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    },
    acceptance: {
      label: '验收 (Accepted)',
      shortLabel: '验收',
      classes: 'bg-blue-50 text-blue-800 border-blue-200',
    }
  };

  const config = roleConfigs[role] || roleConfigs.performance;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-mono leading-none whitespace-nowrap shrink-0 select-none ${config.classes} ${className}`}>
      {config.label}
    </span>
  );
}

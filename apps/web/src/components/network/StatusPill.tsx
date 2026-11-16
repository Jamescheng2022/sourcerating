"use client";

import React from "react";

export interface StatusPillProps {
  role?: "prospect" | "contacted" | "active" | "paused" | "buyer" | "supplier" | "partner" | "other" | string;
  className?: string;
}

export function StatusPill({ role = "prospect", className = "" }: StatusPillProps) {
  const roleConfigs: Record<string, { label: string; classes: string }> = {
    // Relationship stages
    prospect: {
      label: "待联系 (Prospect)",
      classes: "bg-slate-100 text-slate-700 border-slate-300",
    },
    contacted: {
      label: "已联系 (Contacted)",
      classes: "bg-blue-50 text-blue-700 border-blue-200",
    },
    active: {
      label: "合作中 (Active)",
      classes: "bg-teal-50 text-teal-800 border-teal-300 font-semibold",
    },
    paused: {
      label: "已暂停 (Paused)",
      classes: "bg-amber-50 text-amber-700 border-amber-200",
    },
    // Relationship kinds
    buyer: {
      label: "客户 / 买方",
      classes: "bg-indigo-50 text-indigo-700 border-indigo-200",
    },
    supplier: {
      label: "供应商",
      classes: "bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold",
    },
    partner: {
      label: "合作伙伴",
      classes: "bg-purple-50 text-purple-700 border-purple-200",
    },
    other: {
      label: "其他",
      classes: "bg-slate-100 text-slate-600 border-slate-200",
    },
  };

  const config = roleConfigs[role] || { label: role, classes: "bg-slate-100 text-slate-700 border-slate-300" };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-mono leading-none whitespace-nowrap shrink-0 select-none ${config.classes} ${className}`}
    >
      {config.label}
    </span>
  );
}

export default StatusPill;

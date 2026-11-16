"use client";

import React from "react";
import { ShieldCheck, UserCheck, Bot, Clock } from "lucide-react";

export type VerificationLevel = "VERIFIED" | "SELF_CLAIMED" | "AI_CANDIDATE" | "PLANNED";

export interface VerificationBadgeProps {
  level?: VerificationLevel;
  isPerson?: boolean;
  showIcon?: boolean;
  className?: string;
  size?: "xs" | "sm";
}

export function VerificationBadge({
  level = "VERIFIED",
  isPerson = false,
  showIcon = true,
  className = "",
  size = "sm",
}: VerificationBadgeProps) {
  if (isPerson) {
    return (
      <span
        title="演示模式：模拟核验标记，非国家真实执业资格证书"
        className={`inline-flex items-center gap-1 font-semibold rounded-md border font-mono whitespace-nowrap shrink-0 select-none ${
          size === "xs" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5"
        } bg-teal-950/80 text-teal-300 border-teal-700/60 ${className}`}
      >
        {showIcon && <ShieldCheck className="w-3 h-3 text-teal-400 shrink-0" />}
        <span className="whitespace-nowrap">模拟核验</span>
      </span>
    );
  }

  const configs: Record<
    VerificationLevel,
    { label: string; icon: React.ComponentType<{ className?: string }>; classes: string; iconColor: string }
  > = {
    VERIFIED: {
      label: "模拟核验",
      icon: ShieldCheck,
      classes: "bg-teal-950/80 text-teal-300 border-teal-700/60",
      iconColor: "text-teal-400",
    },
    SELF_CLAIMED: {
      label: "机构自述",
      icon: UserCheck,
      classes: "bg-sky-950/80 text-sky-300 border-sky-700/60",
      iconColor: "text-sky-400",
    },
    AI_CANDIDATE: {
      label: "AI 候选事实",
      icon: Bot,
      classes: "bg-amber-950/80 text-amber-300 border-amber-700/60",
      iconColor: "text-amber-400",
    },
    PLANNED: {
      label: "计划预设",
      icon: Clock,
      classes: "bg-slate-800 text-slate-400 border-slate-700",
      iconColor: "text-slate-400",
    },
  };

  const config = configs[level] || configs.VERIFIED;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 font-bold rounded-md border font-mono whitespace-nowrap shrink-0 select-none ${
        size === "xs" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5"
      } ${config.classes} ${className}`}
      title="原型演示：模拟核验数据，非国家真实机构认证"
    >
      {showIcon && <Icon className={`w-3 h-3 ${config.iconColor} shrink-0`} />}
      <span className="whitespace-nowrap">{config.label}</span>
    </span>
  );
}

export default VerificationBadge;

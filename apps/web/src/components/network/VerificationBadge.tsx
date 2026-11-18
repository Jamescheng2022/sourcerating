"use client";

import React from "react";
import { ShieldCheck, UserCheck, Bot, Clock } from "lucide-react";

export type VerificationLevel = "VERIFIED" | "SELF_CLAIMED" | "AI_CANDIDATE" | "PLANNED";

export interface VerificationBadgeProps {
  level?: VerificationLevel;
  evidenceRef?: string;
  isPerson?: boolean;
  showIcon?: boolean;
  className?: string;
  size?: "xs" | "sm";
}

export function VerificationBadge({
  level = "SELF_CLAIMED",
  evidenceRef,
  isPerson = false,
  showIcon = true,
  className = "",
  size = "sm",
}: VerificationBadgeProps) {
  const configs: Record<
    VerificationLevel,
    { label: string; icon: React.ComponentType<{ className?: string }>; classes: string; iconColor: string; title: string }
  > = {
    VERIFIED: {
      label: "已核验",
      icon: ShieldCheck,
      classes: "bg-teal-950/80 text-teal-300 border-teal-700/60",
      iconColor: "text-teal-400",
      title: "经真实合同、检测报告或平台凭据核验",
    },
    SELF_CLAIMED: {
      label: isPerson ? "个人自述" : "企业自述",
      icon: UserCheck,
      classes: "bg-sky-950/80 text-sky-300 border-sky-700/60",
      iconColor: "text-sky-400",
      title: "由主体自主维护填报，尚未经过第三方机构核验",
    },
    AI_CANDIDATE: {
      label: "AI 提议事实",
      icon: Bot,
      classes: "bg-amber-950/80 text-amber-300 border-amber-700/60",
      iconColor: "text-amber-400",
      title: "由 AI 从会话或文件中结构化提取，待人工审核确认",
    },
    PLANNED: {
      label: "待完善",
      icon: Clock,
      classes: "bg-slate-800 text-slate-400 border-slate-700",
      iconColor: "text-slate-400",
      title: "信息待完善",
    },
  };

  const effectiveLevel = level === "VERIFIED" && !evidenceRef ? "SELF_CLAIMED" : level;
  const config = configs[effectiveLevel] || configs.SELF_CLAIMED;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 font-bold rounded-md border font-mono whitespace-nowrap shrink-0 select-none ${
        size === "xs" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5"
      } ${config.classes} ${className}`}
      title={config.title}
    >
      {showIcon && <Icon className={`w-3 h-3 ${config.iconColor} shrink-0`} />}
      <span className="whitespace-nowrap">{config.label}</span>
    </span>
  );
}

export default VerificationBadge;

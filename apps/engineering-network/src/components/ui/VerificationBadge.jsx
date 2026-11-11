import React from 'react';
import { ShieldCheck, UserCheck, Bot, Clock } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';

/**
 * Standard Verification Badge Component
 * 严格遵从规则：绝不暗示现实资质真实核实，统一展示 "模拟核验" / "自述" / "AI候选 (MOCK)"
 * Full i18n support across zh, en, and th
 */
export function VerificationBadge({
  level = 'VERIFIED',
  isPerson = false,
  showIcon = true,
  className = '',
  size = 'sm'
}) {
  const { locale, dict } = useI18n();

  const personLabel = dict.verification?.badgeVerified || (locale === 'zh' ? '模拟核验' : 'Mock Verified');
  const personTitle = dict.verification?.personTitle || (locale === 'zh' ? '演示模式：模拟核验标记，非国家真实执业资格证书' : 'Prototype Demo: Mock verification marker, not official license credentials');
  const badgeTitle = dict.verification?.badgeTitle || (locale === 'zh' ? '原型演示：模拟核验数据，非国家真实机构认证' : 'Prototype Demo: Mock verified data, not official government certification');

  if (isPerson) {
    return (
      <span
        title={personTitle}
        className={`inline-flex items-center gap-1 font-semibold rounded-md border font-mono whitespace-nowrap shrink-0 select-none ${
          size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'
        } bg-emerald-950/80 text-emerald-300 border-emerald-700/60 ${className}`}
      >
        {showIcon && <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />}
        <span className="whitespace-nowrap">{personLabel}</span>
      </span>
    );
  }

  const configs = {
    VERIFIED: {
      label: dict.verification?.badgeVerified || (locale === 'zh' ? '模拟核验' : 'Mock Verified'),
      icon: ShieldCheck,
      classes: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60',
      iconColor: 'text-emerald-400'
    },
    SELF_CLAIMED: {
      label: dict.verification?.badgeSelfClaimed || (locale === 'zh' ? '自述' : 'Self-Reported'),
      icon: UserCheck,
      classes: 'bg-sky-950/80 text-sky-300 border-sky-700/60',
      iconColor: 'text-sky-400'
    },
    AI_CANDIDATE: {
      label: dict.verification?.badgeAiCandidate || (locale === 'zh' ? 'AI候选 (MOCK)' : 'AI Candidate (MOCK)'),
      icon: Bot,
      classes: 'bg-amber-950/80 text-amber-300 border-amber-700/60',
      iconColor: 'text-amber-400'
    },
    PLANNED: {
      label: dict.verification?.badgePlanned || (locale === 'zh' ? '计划预设' : 'Planned / Future'),
      icon: Clock,
      classes: 'bg-slate-800 text-slate-400 border-slate-700',
      iconColor: 'text-slate-400'
    }
  };

  const config = configs[level] || configs.VERIFIED;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 font-bold rounded-md border font-mono whitespace-nowrap shrink-0 select-none ${
        size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'
      } ${config.classes} ${className}`}
      title={badgeTitle}
    >
      {showIcon && <Icon className={`w-3 h-3 ${config.iconColor} shrink-0`} />}
      <span className="whitespace-nowrap">{config.label}</span>
    </span>
  );
}

export default VerificationBadge;

import React from 'react';
import { AlertTriangle, Compass, Sparkles } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';

export function FictionalBanner({ currentScheme, onSwitchScheme }) {
  const { locale } = useI18n();

  return (
    <aside
      aria-label={locale === 'zh' ? '原型演示声明' : 'Prototype Demo Notice'}
      className="bg-amber-400 text-amber-950 border-b border-amber-500/80 px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-medium w-full select-none"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-1.5 sm:gap-2">
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 text-amber-900" />
          <span className="font-bold tracking-tight shrink-0">
            {locale === 'en' ? 'FICTIONAL DEMO' : locale === 'th' ? 'ข้อมูลจำลองเพื่อการสาธิต' : '虚构演示数据'}
          </span>
          <span className="font-mono text-[9px] sm:text-[10px] text-amber-900/80 font-bold shrink-0">
            / PROTOTYPE ONLY
          </span>
          <span className="hidden md:inline text-amber-900 truncate">
            {locale === 'en'
              ? '— All projects, contractors, and licensed engineers are prototype placeholders.'
              : locale === 'th'
              ? '— โครงการ บริษัท และวิศวกรทั้งหมดเป็นข้อมูลจำลองเพื่อการทดสอบระบบ'
              : '— 本站所有项目/机构/人员均为原型占位，严禁作为真实工程依据。'}
          </span>
        </div>

        {/* Mobile Subtle Compact Pill */}
        <div className="flex items-center gap-1 shrink-0 sm:hidden">
          <button
            type="button"
            onClick={() => onSwitchScheme(currentScheme === 'a' ? 'v2' : 'a')}
            className="px-1.5 py-0.5 rounded bg-amber-900 text-amber-100 font-semibold text-[9px] flex items-center gap-0.5 shadow-xs"
            title={locale === 'zh' ? '切换方案对照' : 'Switch Scheme Comparison'}
          >
            <span>{currentScheme === 'a' ? (locale === 'zh' ? '切回 V4' : 'V4.1') : (locale === 'zh' ? '对照 A' : 'Compare A')}</span>
          </button>
        </div>

        {/* Desktop / Tablet Buttons */}
        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
          <span className="text-amber-950 font-bold text-[11px]">
            {locale === 'zh' ? '原型版本：' : 'Edition:'}
          </span>
          <button
            type="button"
            onClick={() => onSwitchScheme('v2')}
            className={`px-2 py-0.5 rounded font-semibold text-xs flex items-center gap-1.5 transition-all ${
              currentScheme !== 'a'
                ? 'bg-amber-950 text-white shadow'
                : 'bg-amber-300 hover:bg-amber-200 text-amber-950'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
            <span>{locale === 'zh' ? 'V4.1 (国际化 + 专家作品集)' : 'V4.1 Multilingual & Portfolio'}</span>
          </button>
          <button
            type="button"
            onClick={() => onSwitchScheme('a')}
            className={`px-2 py-0.5 rounded font-semibold text-xs flex items-center gap-1 transition-all ${
              currentScheme === 'a'
                ? 'bg-amber-950 text-white shadow'
                : 'bg-amber-300 hover:bg-amber-200 text-amber-950'
            }`}
          >
            <span>{locale === 'zh' ? '历史对照 A' : 'Historical Scheme A'}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

export default FictionalBanner;

import React from 'react';
import { X, Building2, User, Award, CheckCircle2, ShieldCheck, Briefcase, Calendar, FileBadge } from 'lucide-react';
import { useDialogA11y } from '../../utils/useDialogA11y';
import { useI18n } from '../../i18n/I18nContext';

export function EntityDrawer({ entity, onClose }) {
  const { locale } = useI18n();
  const isZh = locale === 'zh';
  const isTh = locale === 'th';
  const dialogRef = useDialogA11y(onClose, Boolean(entity));

  if (!entity) return null;

  const isEngineer = !!entity.regNumber;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.36)' }}
    >
      <div 
        ref={dialogRef}
        tabIndex={-1}
        className="bg-surface rounded-xl shadow-2xl border border-hairline max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden text-ink focus:outline-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="entity-drawer-title"
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-hairline bg-surface-subtle text-ink flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-accent flex items-center justify-center text-white shrink-0 shadow-md">
              {isEngineer ? <User className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-surface border border-hairline text-accent">
                  {isEngineer ? '核验工程师履约档案' : '参建机构履约信誉档案'}
                </span>
                <span className="text-[10px] text-amber-300 font-medium">FICTIONAL DATA</span>
              </div>
              <h3 id="entity-drawer-title" className="text-base sm:text-lg font-bold text-ink mt-1">
                {entity.name}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface transition-colors"
            aria-label={isZh ? '关闭实体档案' : isTh ? 'ปิดแฟ้มข้อมูล' : 'Close entity profile'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-sm">
          {/* Top Attributes */}
          <div className="bg-surface-subtle rounded-lg border border-hairline p-3.5 space-y-2.5">
            <div>
              <span className="text-xs text-ink-muted font-medium">官方主体名称 / 执业身份:</span>
              <div className="font-semibold text-ink text-sm">{entity.fullName || entity.title}</div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-hairline">
              <div>
                <span className="text-ink-muted font-medium">统一信用/注册代码:</span>
                <div className="font-mono text-ink font-medium mt-0.5">{entity.licenseNo || entity.regNumber}</div>
              </div>
              <div>
                <span className="text-ink-muted font-medium">{isEngineer ? '核验执业年限:' : '注册资本 (DEMO):'}</span>
                <div className="font-semibold text-ink mt-0.5">
                  {isEngineer ? `${entity.verifiedYears} 年` : entity.registeredCapital}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-hairline flex items-center justify-between text-xs">
              <span className="text-ink-faint font-medium">存证履约信誉评级:</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                {entity.reputationScore || '已完成双向数字背书'}
              </span>
            </div>
          </div>

          {/* Description / Bio */}
          <div>
            <h4 className="text-xs font-bold text-ink-faint uppercase tracking-wider mb-1">
              {isEngineer ? '专业背景与执业范围' : '机构工程资质与专长'}
            </h4>
            <p className="text-ink text-xs sm:text-sm leading-relaxed bg-surface p-3 rounded-lg border border-hairline">
              {entity.description || entity.bio}
            </p>
          </div>

          {/* Fictional Track Record List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-ink-faint uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                真实存证业绩链 (Fictional Track Record)
              </h4>
              <span className="text-[11px] text-ink-muted">全部来自项目 WBS 交付</span>
            </div>

            <div className="space-y-2">
              {(entity.trackRecord || entity.milestones || []).map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-ink text-xs sm:text-sm">
                      {item.project}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                      {item.badge || item.phase}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-ink-faint mt-1">
                    <span>参建履约职责: <strong className="text-ink font-medium">{item.role}</strong></span>
                    <span className="font-mono text-[11px]">{item.year || item.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-ink-muted">
            来源：Project Atlas 行业工程师与企业履约数据库 (DEMO)
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-surface hover:bg-surface-hover text-ink border border-hairline text-xs font-semibold transition-colors"
          >
            关闭档案
          </button>
        </div>
      </div>
    </div>
  );
}

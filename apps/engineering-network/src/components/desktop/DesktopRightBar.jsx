import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, User, ShieldCheck, ChevronRight, TrendingUp, Sparkles, AlertCircle 
} from 'lucide-react';
import { VerificationBadge } from '../ui/VerificationBadge';
import { useI18n } from '../../i18n/I18nContext';

export function DesktopRightBar({ onSelectOrg, onSelectEngineer }) {
  const navigate = useNavigate();
  const { locale, dict } = useI18n();
  const isZh = locale === 'zh';

  return (
    <aside className="w-72 shrink-0 hidden xl:flex flex-col gap-5 select-none font-sans text-xs">
      {/* 1. Verified Evidence Trust Architecture Card */}
      <div className="bg-surface border border-hairline rounded-2xl p-4 text-ink shadow-xs space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-hairline">
          <div className="w-6 h-6 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-accent" />
          </div>
          <div>
            <div className="font-bold text-xs text-ink leading-tight">
              {isZh ? '工程角色与标段关联链' : 'Project Milestone & Role Chain'}
            </div>
            <div className="text-[10px] text-ink-muted">
              {isZh ? 'Project Atlas 结构化关系' : 'Project Atlas Structured Records'}
            </div>
          </div>
        </div>

        <div className="space-y-2 text-[11px] leading-relaxed text-ink-muted">
          <p>
            {isZh 
              ? '本原型系统工程角色与业绩结构化关联至 WBS/OBS 分工，仅作为原型示意，不代表法定确权。'
              : 'Project roles and milestone scopes are structured against WBS/OBS work packages for prototype demonstration.'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-hairline text-center">
          <div className="bg-surface-subtle p-2 rounded-lg border border-hairline">
            <div className="text-base font-bold text-accent font-mono">100%</div>
            <div className="text-[10px] text-ink-muted mt-0.5">
              {isZh ? '标段结构化覆盖' : 'Structured Packages'}
            </div>
          </div>
          <div className="bg-surface-subtle p-2 rounded-lg border border-hairline">
            <div className="text-base font-bold text-emerald-700 dark:text-emerald-400 font-mono">40 {locale === 'zh' ? '条' : locale === 'th' ? 'รายการ' : 'Items'}</div>
            <div className="text-[10px] text-ink-muted mt-0.5">
              {isZh ? '示例工程记录' : 'Mock Milestone Records'}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Trending Engineering Topics */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-ink uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-accent" />
            <span>{isZh ? '行业前沿热议' : 'Trending Industry Topics'}</span>
          </span>
          <span className="text-[10px] text-accent font-mono font-semibold">HOT</span>
        </div>

        <div className="space-y-1.5">
          {[
            {
              tag: isZh ? '#大跨度液压同步顶升' : '#HydraulicSynchronizedLifting',
              heat: '4.8k ' + (isZh ? '次研讨' : 'discuss'),
              desc: isZh ? '大跨度钢结构合龙精度与动态反力平衡控制' : 'Long-span steel truss closure precision and dynamic reaction force compensation'
            },
            {
              tag: isZh ? '#超净厂房微振动控制' : '#CleanroomMicroVibration',
              heat: '3.2k ' + (isZh ? '次研讨' : 'discuss'),
              desc: isZh ? '微电子生产环境 VC-D/E 动力管道隔振与华夫板仿真' : 'VC-D/E micro-vibration mitigation, process piping isolation and waffle slab FEA'
            },
            {
              tag: isZh ? '#深基坑地下连续墙变形' : '#DeepExcavationMonitoring',
              heat: '2.5k ' + (isZh ? '次研讨' : 'discuss'),
              desc: isZh ? '32m 超深地连墙近邻地铁微沉降伺服钢支撑补偿' : '32m deep diaphragm wall servo steel strut compensation adjacent to metro transit'
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-xl bg-surface border border-hairline hover:border-accent/40 transition-all cursor-pointer group space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-ink group-hover:text-accent transition-colors font-mono">
                  {item.tag}
                </span>
                <span className="text-[10px] font-mono text-ink-muted">{item.heat}</span>
              </div>
              <p className="text-[11px] text-ink-muted leading-snug line-clamp-2">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Featured Organizations */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-ink uppercase tracking-wider text-[11px]">
            {isZh ? '标杆参建主体' : 'Benchmark Contractors & Entities'}
          </span>
          <span className="text-[10px] text-ink-faint">
            {isZh ? '6 家入库主体' : '6 Entities'}
          </span>
        </div>

        <div className="space-y-1.5 text-xs">
          {[
            { 
              id: "ORG-A", 
              name: "Demo Org A", 
              role: isZh ? "建设单位 · 业主项目部" : "Owner / Client Dept", 
              badge: "VERIFIED" 
            },
            { 
              id: "ORG-B", 
              name: "Demo Org B", 
              role: isZh ? "施工总承包 · 特级资质" : "EPC Prime Contractor", 
              badge: "VERIFIED" 
            },
            { 
              id: "ORG-C", 
              name: "Demo Org C", 
              role: isZh ? "勘察设计单位 · 甲级院" : "Design & BIM Institute", 
              badge: "VERIFIED" 
            },
            { 
              id: "ORG-D", 
              name: "Demo Org D", 
              role: isZh ? "专业分包单位 · 地基基础" : "Foundations Subcontractor", 
              badge: "VERIFIED" 
            },
            { 
              id: "ORG-E", 
              name: "Demo Org E", 
              role: isZh ? "专业分包单位 · 洁净机电" : "Cleanroom MEP Subcontractor", 
              badge: "SELF_CLAIMED" 
            },
            { 
              id: "ORG-G", 
              name: "Demo Org G", 
              role: isZh ? "工程监理单位 · 综合资质" : "Supervision Advisory", 
              badge: "VERIFIED" 
            }
          ].map(org => (
            <button
              key={org.id}
              type="button"
              onClick={() => {
                navigate(`/companies/${org.id.toLowerCase()}`);
                if (onSelectOrg) onSelectOrg(org.id);
              }}
              className="w-full text-left p-2 rounded-lg bg-surface-subtle/60 hover:bg-surface-subtle border border-hairline/60 hover:border-slate-600 transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                <div className="min-w-0">
                  <div className="text-ink font-medium whitespace-normal break-words">{org.name}</div>
                  <div className="text-[10px] text-ink-muted">{org.role}</div>
                </div>
              </div>
              <VerificationBadge level={org.badge} size="xs" showIcon={false} />
            </button>
          ))}
        </div>
      </div>

      {/* 4. Key Personnel */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-ink uppercase tracking-wider text-[11px]">
            {isZh ? '关键岗位执业工程师' : 'Licensed Engineers'}
          </span>
          <span className="text-[10px] text-ink-faint">
            {isZh ? '3 位演示专家' : '3 Demo Experts'}
          </span>
        </div>

        <div className="space-y-1.5 text-xs">
          {[
            { 
              id: "ENG-01", 
              name: "Demo Engineer 01", 
              title: isZh ? "模拟施工总监 (演示角色)" : "Site Director (Mock)", 
              badge: "VERIFIED" 
            },
            { 
              id: "ENG-02", 
              name: "Demo Engineer 02", 
              title: isZh ? "模拟结构设计师 (演示角色)" : "Principal Structural Engineer", 
              badge: "VERIFIED" 
            },
            { 
              id: "ENG-03", 
              name: "Demo Engineer 03", 
              title: isZh ? "机电安装技术总工 (演示角色)" : "MEP Technical Lead", 
              badge: "SELF_CLAIMED" 
            },
          ].map(eng => (
            <button
              key={eng.id}
              type="button"
              onClick={() => {
                navigate(`/people/${eng.id.toLowerCase()}`);
                if (onSelectEngineer) onSelectEngineer(eng.id);
              }}
              className="w-full text-left p-2 rounded-lg bg-surface-subtle/60 hover:bg-surface-subtle border border-hairline/60 hover:border-slate-600 transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-2 min-w-0">
                <User className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                <div className="min-w-0">
                  <div className="text-ink font-medium whitespace-normal break-words">{eng.name}</div>
                  <div className="text-[10px] text-ink-muted">{eng.title}</div>
                </div>
              </div>
              <VerificationBadge level={eng.badge} size="xs" showIcon={false} />
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

export default DesktopRightBar;

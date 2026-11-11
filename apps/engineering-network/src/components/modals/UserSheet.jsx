import React from 'react';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { VerificationBadge } from '../ui/VerificationBadge';
import { User, LogIn, ExternalLink, Bookmark, Heart, Award, Globe, Check, Building2, UserCheck, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext';
import { resolveAuthorProfile } from '../../data/projectData';

export function UserSheet({ 
  isOpen, 
  onClose, 
  onOpenLogin, 
  currentRole = 'ENG-01', 
  onSelectRole 
}) {
  const navigate = useNavigate();
  const { locale, localeMode, setLocaleMode, dict } = useI18n();
  const isZh = locale === 'zh';
  const isTh = locale === 'th';

  const profile = resolveAuthorProfile(currentRole, locale);

  const isEngineer = currentRole === 'ENG-01';
  const isOwner = currentRole === 'ORG-A';
  const isGuest = currentRole === 'GUEST';

  const roleName = isGuest
    ? (isZh ? '访客观察员 (Guest)' : isTh ? 'ผู้สังเกตการณ์ทั่วไป' : 'Guest Observer')
    : isOwner
    ? (isZh ? 'Demo Organization A 经办人' : isTh ? 'ตัวแทน Demo Org A' : 'Demo Organization A Lead')
    : (isZh ? 'Demo Engineer 01' : isTh ? 'Demo Engineer 01' : 'Demo Engineer 01');

  const roleTitle = isGuest
    ? (isZh ? '未登录访客视角 · 公共浏览模式' : isTh ? 'มุมมองผู้เยี่ยมชมทั่วไป' : 'Public Observer (No Profile)')
    : isOwner
    ? (isZh ? '建设发包方负责人 (Demo Org A, 演示角色)' : isTh ? 'เจ้าของโครงการผู้ว่าจ้าง (Demo Org A)' : 'Project Owner / Procurement Lead (Mock)')
    : (isZh ? '模拟建造师 · 施工总监 (Demo Org B, 演示角色)' : isTh ? 'วิศวกรผู้ควบคุมงานจำลอง (Demo Org B)' : 'Licensed Builder · Site Director (Mock)');

  const orgSubtitle = isGuest
    ? (isZh ? '无组织绑定 · 匿名会话' : 'Anonymous session · Public view')
    : isOwner
    ? 'Demo Organization A (Industrial Investment Group)'
    : 'Demo Organization B (General Contractor Group)';

  const profileRoute = isGuest
    ? '/feed'
    : isOwner
    ? '/companies/demo-org-a'
    : '/people/demo-engineer-01';

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title={dict.nav?.profile || (isZh ? '个人中心 (我)' : isTh ? 'โปรไฟล์ของฉัน' : 'Profile (Me)')}
      subtitle={locale === 'zh' ? '原型模拟身份与个人工作台' : 'Demo Persona & Workspace Console'}
      position="bottom"
      className="safe-bottom"
    >
      <div className="space-y-4">
        {/* Profile Header */}
        <div className="flex items-center gap-3.5 p-3.5 bg-surface-subtle border border-hairline rounded-2xl">
          <Avatar 
            type={isOwner ? 'company' : isGuest ? 'guest' : 'person'} 
            name={roleName} 
            size="lg" 
            verified={!isGuest} 
          />
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-ink text-sm truncate">
                {roleName}
              </span>
              {!isGuest && <VerificationBadge isPerson={isEngineer} size="xs" />}
              <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-accent/10 text-accent font-bold">
                {currentRole}
              </span>
            </div>
            <p className="text-xs text-ink-muted truncate">
              {roleTitle}
            </p>
            <p className="text-[11px] text-ink-faint font-mono truncate">
              {orgSubtitle}
            </p>
          </div>
        </div>

        {/* Quick Role Switcher Chips */}
        <div className="p-3 bg-surface border border-hairline rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-ink flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-accent" />
              <span>{isZh ? '切换当前操作身份' : isTh ? 'สลับบทบาทปัจจุบัน' : 'Switch Active Persona'}</span>
            </span>
            <span className="text-[10px] text-ink-muted">
              {isZh ? '单点同步全局' : 'Syncs everywhere'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'ENG-01', labelZh: 'ENG-01 建造师', labelEn: 'ENG-01 Site Director', labelTh: 'ENG-01 ผู้อำนวยการ', icon: User },
              { id: 'ORG-A', labelZh: 'ORG-A 业主', labelEn: 'ORG-A Owner/Client', labelTh: 'ORG-A เจ้าของโครงการ', icon: Building2 },
              { id: 'GUEST', labelZh: 'GUEST 访客', labelEn: 'GUEST Observer', labelTh: 'GUEST ผู้สังเกตการณ์', icon: Shield },
            ].map(r => {
              const isSelected = currentRole === r.id;
              const Icon = r.icon;
              const roleChipLabel = isZh ? r.labelZh : isTh ? r.labelTh : r.labelEn;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    if (onSelectRole) onSelectRole(r.id);
                  }}
                  className={`py-2 px-1.5 rounded-lg text-center flex flex-col items-center gap-1 transition-all border ${
                    isSelected
                      ? 'bg-accent text-white font-bold border-accent shadow-xs'
                      : 'bg-surface-subtle hover:bg-surface-hover text-ink border-hairline'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-accent'}`} />
                  <span className="text-[11px] leading-tight font-medium truncate w-full">
                    {roleChipLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onClose();
              navigate(profileRoute);
            }}
          >
            {isGuest 
              ? (isZh ? '浏览公共动态 →' : 'Browse Public Feed →')
              : isOwner
              ? (isZh ? '查看企业机构主页 →' : 'View Company Profile →')
              : (isZh ? '查看工程师主页 →' : 'View Profile →')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              onClose();
              if (onOpenLogin) onOpenLogin();
            }}
          >
            {locale === 'zh' ? '角色详情说明' : 'Persona Details'}
          </Button>
        </div>

        {/* Language Selection Bar inside UserSheet */}
        <div className="p-3 bg-surface-subtle border border-hairline rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-ink flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-accent" />
              <span>{dict.lang?.label || '界面语言 / Language'}</span>
            </span>
            <span className="font-mono text-[10px] text-accent font-bold">
              {localeMode.toUpperCase()}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 text-xs">
            {[
              { id: 'auto', label: 'Auto' },
              { id: 'en', label: 'English' },
              { id: 'zh', label: '中文' },
              { id: 'th', label: 'ไทย' },
            ].map(l => (
              <button
                key={l.id}
                type="button"
                onClick={() => setLocaleMode(l.id)}
                className={`py-1.5 px-1 rounded-lg text-center font-medium transition-all ${
                  localeMode === l.id
                    ? 'bg-accent text-white font-bold shadow-xs'
                    : 'bg-surface hover:bg-surface-hover text-ink border border-hairline'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center py-2 border-y border-hairline">
          <div>
            <div className="text-sm font-bold font-mono text-ink">
              {isGuest ? '0' : isOwner ? '4' : '3'}
            </div>
            <div className="text-[10px] text-ink-muted">
              {isOwner ? (isZh ? '发包标段' : 'Work Packages') : (isZh ? '主导工程' : 'Key Projects')}
            </div>
          </div>
          <div>
            <div className="text-sm font-bold font-mono text-accent">100%</div>
            <div className="text-[10px] text-ink-muted">
              {locale === 'zh' ? '存证双向核实' : 'Evidence Verified'}
            </div>
          </div>
          <div>
            <div className="text-sm font-bold font-mono text-ink">
              {isGuest ? '0' : isOwner ? '1,200' : '830'}
            </div>
            <div className="text-[10px] text-ink-muted">
              {locale === 'zh' ? '同行关注' : 'Peer Followers'}
            </div>
          </div>
        </div>

        {/* Notice */}
        <p className="text-[11px] text-ink-faint text-center">
          {locale === 'zh' 
            ? '当前处于演示模式，所有履约数据与认证仅作为产品原型交互验证。'
            : 'Demo environment: All performance and credentials are for prototype evaluation only.'}
        </p>
      </div>
    </Sheet>
  );
}

export default UserSheet;

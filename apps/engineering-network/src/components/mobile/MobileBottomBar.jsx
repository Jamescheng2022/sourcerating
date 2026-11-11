import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, Sparkles, Bell, User } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';

export function MobileBottomBar({ onOpenNotifications, onOpenUser, onOpenCompose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { locale, dict } = useI18n();
  const path = location.pathname.toLowerCase();

  const isFeed = path === '/' || path.startsWith('/feed');
  const isNetwork = path.startsWith('/network') || path.startsWith('/people') || path.startsWith('/companies');

  return (
    <nav
      aria-label={locale === 'zh' ? '移动端底部导航' : locale === 'th' ? 'แถบนำทางด้านล่างสำหรับมือถือ' : 'Mobile Bottom Navigation'}
      className="md:hidden fixed bottom-0 inset-x-0 bg-surface backdrop-blur-md border-t border-hairline z-40 px-2 py-1 flex items-center justify-around select-none shadow-[0_-2px_8px_rgba(0,0,0,0.03)] dark:shadow-[0_-2px_12px_rgba(0,0,0,0.3)] pb-[max(0.6rem,env(safe-area-inset-bottom))]"
    >
      {/* 1. 首页 (Feed) */}
      <button
        type="button"
        onClick={() => navigate('/feed')}
        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all min-w-[56px] min-h-[44px] ${
          isFeed ? 'text-accent font-bold' : 'text-ink-muted hover:text-ink'
        }`}
        aria-label={locale === 'zh' ? '首页动态' : 'Feed'}
      >
        <Home className={`w-5 h-5 transition-transform ${isFeed ? 'scale-105 text-accent' : ''}`} />
        <span className="text-[11px] mt-0.5 tracking-tight font-medium">
          {locale === 'en' ? 'Feed' : locale === 'th' ? 'ฟีด' : '首页'}
        </span>
      </button>

      {/* 2. 人脉 (Network) */}
      <button
        type="button"
        onClick={() => navigate('/network')}
        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all min-w-[56px] min-h-[44px] ${
          isNetwork ? 'text-accent font-bold' : 'text-ink-muted hover:text-ink'
        }`}
        aria-label={locale === 'zh' ? '工程人脉' : 'Network'}
      >
        <Users className={`w-5 h-5 transition-transform ${isNetwork ? 'scale-105 text-accent' : ''}`} />
        <span className="text-[11px] mt-0.5 tracking-tight font-medium">
          {locale === 'en' ? 'Network' : locale === 'th' ? 'เครือข่าย' : '人脉'}
        </span>
      </button>

      {/* 3. Center Raised AI+ (Composition & Writing Assistance) */}
      <button
        type="button"
        onClick={onOpenCompose}
        className="relative -top-3 flex flex-col items-center justify-center group focus:outline-none min-w-[52px] min-h-[52px]"
        aria-label={locale === 'zh' ? 'AI 创作与发帖' : 'Post with AI'}
      >
        <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-accent to-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/30 border-2 border-surface group-hover:scale-105 group-active:scale-95 transition-all">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <span className="text-[10px] font-bold text-accent mt-0.5 tracking-tight">AI +</span>
      </button>

      {/* 4. 通知 (Notifications) */}
      <button
        type="button"
        onClick={onOpenNotifications}
        className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all min-w-[56px] min-h-[44px] text-ink-muted hover:text-ink relative"
        aria-label={locale === 'zh' ? '消息通知' : 'Notifications'}
      >
        <div className="relative">
          <Bell className="w-5 h-5" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent"></span>
        </div>
        <span className="text-[11px] mt-0.5 tracking-tight font-medium">
          {locale === 'en' ? 'Alerts' : locale === 'th' ? 'แจ้งเตือน' : '通知'}
        </span>
      </button>

      {/* 5. 我 (Profile / User) */}
      <button
        type="button"
        onClick={onOpenUser}
        className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all min-w-[56px] min-h-[44px] text-ink-muted hover:text-ink"
        aria-label={locale === 'zh' ? '个人主页与身份' : 'Profile'}
      >
        <User className="w-5 h-5" />
        <span className="text-[11px] mt-0.5 tracking-tight font-medium">
          {locale === 'en' ? 'Me' : locale === 'th' ? 'ฉัน' : '我'}
        </span>
      </button>
    </nav>
  );
}

export default MobileBottomBar;

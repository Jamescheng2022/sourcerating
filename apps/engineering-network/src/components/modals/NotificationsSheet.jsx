import React from 'react';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { Bell, CheckCircle2, ShieldCheck, Milestone, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext';

export function NotificationsSheet({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { locale, dict } = useI18n();

  const iconMap = {
    'notif-1': Milestone,
    'notif-2': ShieldCheck,
    'notif-3': MessageSquare,
  };

  const routeMap = {
    'notif-1': '/projects/p001',
    'notif-2': '/people/demo-engineer-01',
    'notif-3': '/feed',
  };

  const notificationItems = dict.notifications?.items || [
    {
      id: 'notif-1',
      title: locale === 'zh' ? 'DEMO Project P001 新里程碑记录 (Mock 示范)' : 'DEMO Project P001: New Milestone Entry (Mock)',
      text: locale === 'zh' ? '总承包 Demo Organization B 已提报第 4 单元高空顶升激光测控报告，示意关联各方核验记录 (Mock)。' : 'General contractor Demo Organization B submitted the Unit 4 lift laser inspection report, notifying verified parties (Mock).',
      time: locale === 'zh' ? '2 小时前' : '2h ago',
    },
    {
      id: 'notif-2',
      title: locale === 'zh' ? '参建关系双向背书成功 (Mock 示意)' : 'Dual-Party Endorsement Confirmed (Mock)',
      text: locale === 'zh' ? 'Demo Engineer 01 的大跨度钢结构总监职务已由建设单位 Demo Organization A 完成演示确认 (Mock)。' : 'Demo Engineer 01’s lead structural director role on the long-span truss was confirmed by client Demo Organization A (Mock).',
      time: locale === 'zh' ? '1 天前' : '1d ago',
    },
    {
      id: 'notif-3',
      title: locale === 'zh' ? '技术讨论新回复' : 'New Reply in Technical Discussion',
      text: locale === 'zh' ? 'Demo Engineer 02 评论了关于“大跨度双曲面网架瞬态风荷载响应仿真”的技术笔记。' : 'Demo Engineer 02 commented on the technical case note regarding transient wind response simulations.',
      time: locale === 'zh' ? '2 天前' : '2d ago',
    }
  ];

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title={dict.notifications?.sheetTitle || (locale === 'zh' ? '消息与工程通知 (MOCK)' : 'Messages & Engineering Notifications (MOCK)')}
      subtitle={dict.notifications?.sheetSubtitle || (locale === 'zh' ? '原型演示通知中心 · 模拟项目里程碑与多方签章提醒' : 'Prototype Notification Center · Mock project milestones and multi-party seal alerts')}
      position="right"
      width="max-w-md"
    >
      <div className="space-y-3">
        {notificationItems.map((item) => {
          const Icon = iconMap[item.id] || Bell;
          const route = routeMap[item.id] || '/feed';

          return (
            <div
              key={item.id}
              onClick={() => {
                onClose();
                navigate(route);
              }}
              className="p-3 rounded-xl border border-hairline bg-surface hover:bg-surface-hover transition-colors cursor-pointer space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-ink">
                  <Icon className="w-4 h-4 text-accent shrink-0" />
                  {item.title}
                </span>
                <span className="text-[10px] text-ink-muted font-mono">{item.time}</span>
              </div>
              <p className="text-xs text-ink-muted leading-relaxed">
                {item.text}
              </p>
              <div className="pt-1 flex justify-end">
                <span className="text-[11px] text-accent font-semibold hover:underline">
                  {dict.notifications?.viewDetails || (locale === 'zh' ? '查看详情 →' : 'View Details →')}
                </span>
              </div>
            </div>
          );
        })}

        <div className="pt-3 border-t border-hairline flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            {dict.notifications?.close || (locale === 'zh' ? '关闭' : 'Close')}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

export default NotificationsSheet;

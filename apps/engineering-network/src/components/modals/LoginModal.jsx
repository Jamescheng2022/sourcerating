import React from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { UserCheck, Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';

export function LoginModal({ isOpen, onClose, currentRole, onSelectRole }) {
  const { locale, dict } = useI18n();
  const isZh = locale === 'zh';
  const isTh = locale === 'th';

  const roles = [
    {
      id: 'ENG-01',
      name: 'Demo Engineer 01',
      title: isZh 
        ? '模拟建造师 / 施工总监 (Demo Org B, 演示角色)' 
        : isTh 
        ? 'วิศวกรผู้ควบคุมงานจำลอง / ผู้อำนวยการก่อสร้าง (Demo Org B)' 
        : 'Licensed Master Builder · Construction Site Director (Mock)',
      type: isZh ? '工程师身份 (演示)' : isTh ? 'บทบาทวิศวกร (จำลอง)' : 'Engineer Persona (Demo)',
      description: isZh
        ? '可以发布现场技术笔记、查看自己参建的履约工程包，并响应咨询。'
        : isTh
        ? 'สามารถเผยแพร่บันทึกเทคนิคหน้างาน ตรวจสอบสัญญาผลงาน และตอบคำถามได้'
        : 'Can publish field engineering notes, review contracted work packages, and respond to inquiries.'
    },
    {
      id: 'ORG-A',
      name: isZh ? 'Demo Organization A 经办人' : isTh ? 'ตัวแทน Demo Organization A' : 'Demo Organization A Representative',
      title: isZh 
        ? '建设发包方负责人 (Demo Org A, 演示角色)' 
        : isTh 
        ? 'เจ้าของโครงการผู้ว่าจ้าง (Demo Org A)' 
        : 'Project Owner / Procurement Lead (Demo Org A)',
      type: isZh ? '建设业主身份 (演示)' : isTh ? 'บทบาทเจ้าของโครงการ (จำลอง)' : 'Client / Owner Persona (Demo)',
      description: isZh
        ? '负责重大项目发包立项、管理参建方背书与工程验收流程。'
        : isTh
        ? 'รับผิดชอบการเปิดประมูลโครงการ การรับรองผู้รับเหมา และขั้นตอนการตรวจรับงาน'
        : 'Oversees project initiation, tendering packages, contractor endorsements, and acceptance.'
    },
    {
      id: 'GUEST',
      name: isZh ? '访客观察员 (Guest)' : isTh ? 'ผู้สังเกตการณ์ทั่วไป (Guest)' : 'Guest Observer',
      title: isZh ? '未登录访客视角' : isTh ? 'มุมมองผู้เยี่ยมชมทั่วไป' : 'Unauthenticated Visitor Perspective',
      type: isZh ? '公众观察视角' : isTh ? 'มุมมองสาธารณะ' : 'Public Viewer Persona',
      description: isZh
        ? '查阅公开工程百科维基、查看示意存证记录与检索参建网络。'
        : isTh
        ? 'เข้าถึงสารานุกรมโครงการ ตรวจสอบบันทึกหลักฐานจำลอง และสืบค้นเครือข่ายวิศวกรรม'
        : 'Browse public project wikis, inspect demonstration evidence records, and search network directory.'
    }
  ];

  const title = dict.dialogs?.loginTitle || (isZh ? '登录 / 切换演示身份 (Demo)' : isTh ? 'สลับบทบาทจำลอง / เข้าสู่ระบบ' : 'Switch Demo Persona / Login');
  const description = dict.dialogs?.loginNotice || (isZh 
    ? '本原型为前端无状态演示环境，无真实账号后端系统。您可以选择以下虚构角色进行交互体验：' 
    : isTh 
    ? 'ระบบจำลองนี้ไม่มีฐานข้อมูลบัญชีจริง เลือกบทบาทจำลองเพื่อทดลองใช้งาน:' 
    : 'This is a stateless frontend demonstration without real user accounts. Select an assumed demo role to test role-specific features:');

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
    >
      <div className="space-y-3">
        {/* Banner */}
        <div className="p-3 bg-surface-subtle border border-hairline rounded-xl text-xs text-ink-muted flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <p>
            {isZh
              ? '本原型无外部鉴权服务与账号数据库。选择以下角色可即时切换界面视角，模拟不同主体的操作权限。'
              : isTh
              ? 'ระบบจำลองนี้ไม่มีฐานข้อมูลบัญชีจริง เลือกบทบาทด้านล่างเพื่อสลับมุมมองและสิทธิการใช้งานทันที'
              : 'This prototype spike operates without external authentication or accounts database. Select an assumed persona below to switch views and preview role-based permissions.'}
          </p>
        </div>

        {/* Roles List */}
        <div className="space-y-2 pt-1">
          {roles.map(r => {
            const isSelected = currentRole === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  if (onSelectRole) onSelectRole(r.id);
                  onClose();
                }}
                className={`w-full text-left p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-500/10 ring-2 ring-emerald-500/20'
                    : 'border-hairline bg-surface hover:border-slate-300 hover:bg-surface-subtle'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-ink text-xs sm:text-sm">
                      {r.name}
                    </span>
                    <span className="font-mono text-[10px] bg-surface-subtle text-ink-muted px-1.5 py-0.5 rounded border border-hairline">
                      {r.type}
                    </span>
                  </div>
                  <div className="text-xs text-ink-muted font-medium">{r.title}</div>
                  <p className="text-[11px] text-ink-muted">{r.description}</p>
                </div>

                <div className="shrink-0 pt-1">
                  {isSelected ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> {isZh ? '当前' : isTh ? 'ปัจจุบัน' : 'Current'}
                    </span>
                  ) : (
                    <span className="text-xs text-ink-faint hover:text-ink">{isZh ? '切换 →' : isTh ? 'สลับ →' : 'Switch →'}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="pt-3 border-t border-hairline flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            {dict.common?.close || (isZh ? '关闭' : isTh ? 'ปิด' : 'Close')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export default LoginModal;

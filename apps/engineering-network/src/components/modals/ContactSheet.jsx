import React, { useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { Send, AlertCircle, FileText, Bookmark, Info, Check } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';

export function ContactSheet({ isOpen, onClose, person }) {
  const { locale, dict } = useI18n();
  const isZh = locale === 'zh';
  const isTh = locale === 'th';

  const [topic, setTopic] = useState('tech_consult');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saved' | 'failed'
  const [savedDraftId, setSavedDraftId] = useState(null);

  if (!person) return null;

  const topics = [
    { 
      id: 'tech_consult', 
      labelZh: '工程技术攻关与方案论证咨询', 
      labelEn: 'Engineering Methodology & Technical Review Consultation',
      labelTh: 'การปรึกษาด้านเทคนิควิศวกรรมและการตรวจทานแผนงาน'
    },
    { 
      id: 'expert_panel', 
      labelZh: '技术评审会与专家抽调邀请', 
      labelEn: 'Expert Technical Review Panel Invitation',
      labelTh: 'การเชิญเข้าร่วมคณะกรรมการผู้เชี่ยวชาญ'
    },
    { 
      id: 'subcontract', 
      labelZh: '重大工程分包或项目合作接洽', 
      labelEn: 'Project Subcontracting & Collaboration Inquiry',
      labelTh: 'การติดต่อร่วมงานและการรับเหมาช่วงโครงการ'
    },
    { 
      id: 'standards_patent', 
      labelZh: '工程论文、专利与工法交流', 
      labelEn: 'Engineering Standards, Patents & Methods Exchange',
      labelTh: 'การแลกเปลี่ยนมาตรฐานวิศวกรรม สิทธิบัตร และวิธีทำงาน'
    },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    // Save draft to browser localStorage with error trapping
    const draftId = `contact-draft-${Date.now()}`;
    let saveOk = false;
    try {
      const existing = localStorage.getItem('atlas_contact_drafts');
      const draftsList = existing ? JSON.parse(existing) : [];
      draftsList.unshift({
        id: draftId,
        recipientId: person.id,
        recipientName: person.name,
        recipientTitle: person.title,
        topic,
        message: message.trim(),
        createdAt: new Date().toISOString(),
        isLocalDraftOnly: true
      });
      localStorage.setItem('atlas_contact_drafts', JSON.stringify(draftsList.slice(0, 50)));
      saveOk = true;
    } catch (err) {
      console.warn('Failed to save contact draft to localStorage', err);
      saveOk = false;
    }

    setSavedDraftId(draftId);
    setSaveStatus(saveOk ? 'saved' : 'failed');
    setSubmitted(true);
  };

  const handleFinish = () => {
    setSubmitted(false);
    setMessage('');
    setSavedDraftId(null);
    setSaveStatus('idle');
    onClose();
  };

  const sheetTitle = isZh 
    ? '直接咨询与技术意向接洽' 
    : isTh 
    ? 'ติดต่อสอบถามและปรึกษาเชิงเทคนิค' 
    : 'Direct Inquiry & Technical Consultation';

  const sheetSubtitle = isZh
    ? `接洽对象：${person.name} (${person.title || '执业专家'})`
    : isTh
    ? `ผู้รับการติดต่อ: ${person.name} (${person.title || 'ผู้เชี่ยวชาญ'})`
    : `Recipient: ${person.name} (${person.title || 'Licensed Professional'})`;

  return (
    <Sheet
      isOpen={isOpen}
      onClose={submitted ? handleFinish : onClose}
      title={sheetTitle}
      subtitle={sheetSubtitle}
      position="right"
      width="max-w-md"
    >
      {!submitted ? (
        <form onSubmit={handleSubmit} className="space-y-4 text-ink">
          {/* Transparent Sandbox Warning Banner */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                {isZh ? '演示沙盒说明：外部消息通道停用' : isTh ? 'คำชี้แจงโหมดจำลอง: ปิดช่องทางส่งข้อความภายนอก' : 'Sandbox Demo: Live Delivery Disabled'}
              </span>
            </div>
            <p className="text-[11px] text-ink-muted leading-relaxed">
              {isZh
                ? '本原型为纯前端演示环境，未配置实际邮件或站内信后台服务。提交后咨询意向仅以草稿形式保存在浏览器本地，不会产生外部网络通信或触达真实人员。'
                : isTh
                ? 'ระบบจำลองนี้ไม่มีฐานข้อมูลหรือเซิร์ฟเวอร์ส่งข้อความจริง ข้อความของคุณจะถูกบันทึกเป็นร่างในเครื่องเท่านั้น และไม่มีการส่งไปยังบุคคลจริง'
                : 'This is a stateless frontend demonstration without outbound mail or message servers. Inquiries are stored strictly as local drafts; no external network outreach occurs.'}
            </p>
          </div>

          {/* Topic Select */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-ink">
              {isZh ? '咨询意向类别' : isTh ? 'ประเภทการติดต่อ' : 'Inquiry Topic'}
            </label>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-hairline bg-surface-subtle text-ink focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {topics.map(t => (
                <option key={t.id} value={t.id}>
                  {isZh ? t.labelZh : isTh ? t.labelTh : t.labelEn}
                </option>
              ))}
            </select>
          </div>

          {/* Message Textarea */}
          <div className="space-y-1">
            <label htmlFor="contact-msg" className="block text-xs font-semibold text-ink">
              {isZh ? '意向信息简述' : isTh ? 'ข้อความรายละเอียด' : 'Message Details'}
            </label>
            <textarea
              id="contact-msg"
              required
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={isZh 
                ? '简述您的工程项目背景、所需技术支持以及预计合作时序...' 
                : isTh 
                ? 'ระบุภูมิหลังโครงการ ความช่วยเหลือเชิงเทคนิคที่ต้องการ และกำหนดเวลาคร่าวๆ...' 
                : 'Describe your project background, required technical support, and expected schedule...'}
              className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-hairline bg-surface-subtle text-ink focus:outline-none focus:ring-1 focus:ring-accent resize-none"
            />
            <div className="text-[10px] text-ink-faint">
              {isZh ? '至少输入 10 个字符' : 'Minimum 10 characters'}
            </div>
          </div>

          {/* Explicit Consent Checkbox */}
          <div className="flex items-start gap-2 pt-1 text-xs">
            <input
              type="checkbox"
              id="contact-consent"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 rounded border-hairline text-accent focus:ring-accent"
            />
            <label htmlFor="contact-consent" className="text-[11px] text-ink-muted leading-tight cursor-pointer">
              {isZh
                ? '我已知悉此为原型演示环境，意向将作为草稿保存在本地，不会向真实人员发送外联信息。'
                : isTh
                ? 'ข้าพเจ้ารับทราบว่านี่คือสภาพแวดล้อมจำลอง ร่างจะถูกบันทึกไว้ในเครื่องและไม่มีการติดต่อบุคคลจริง'
                : 'I understand this is a mock prototype demonstration and no real outreach will occur.'}
            </label>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-hairline">
            <Button variant="outline" size="sm" onClick={onClose}>
              {isZh ? '取消' : isTh ? 'ยกเลิก' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              icon={Send}
              disabled={message.trim().length < 10 || !consent}
            >
              {isZh ? '保存意向草稿 (Mock)' : isTh ? 'บันทึกร่าง (Mock)' : 'Save Draft (Mock)'}
            </Button>
          </div>
        </form>
      ) : (
        /* Honest Result State: Distinguishes successful local draft from failed storage */
        <div className="space-y-4 text-center py-6 text-ink animate-fadeIn">
          {saveStatus === 'failed' ? (
            <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <AlertCircle className="w-7 h-7" />
            </div>
          ) : (
            <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <Bookmark className="w-7 h-7" />
            </div>
          )}

          <div className="space-y-1.5 px-2">
            {saveStatus === 'failed' ? (
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-300 font-mono text-[10px] font-bold border border-rose-500/20">
                {isZh ? 'STORAGE_WRITE_FAILED · 本地存储写入失败' : isTh ? 'STORAGE_WRITE_FAILED · บันทึกล้มเหลว' : 'STORAGE_WRITE_FAILED · STORAGE FAILED'}
              </span>
            ) : (
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 font-mono text-[10px] font-bold border border-amber-500/20">
                {isZh ? 'LOCAL DRAFT SAVED · 仅限本地草稿' : isTh ? 'LOCAL DRAFT SAVED · บันทึกร่างในเครื่อง' : 'LOCAL DRAFT SAVED · LOCAL SANDBOX ONLY'}
              </span>
            )}

            <h4 className="text-base font-bold text-ink leading-snug">
              {saveStatus === 'failed'
                ? (isZh ? '本地存储写入受阻 — 草稿未能持久化' : isTh ? 'การบันทึกลงในเครื่องล้มเหลว' : 'Local storage write failed — draft not persisted')
                : (isZh 
                    ? '当前演示身份尚未开通直联通道 — 咨询草稿已在本地留存' 
                    : isTh 
                    ? 'ยังไม่เปิดให้บริการสำหรับตัวตนจำลองนี้ — บันทึกร่างไว้ในเครื่องแล้ว' 
                    : 'Direct delivery disabled — draft saved to local browser')}
            </h4>

            <p className="text-xs text-ink-muted max-w-sm mx-auto leading-relaxed pt-1">
              {saveStatus === 'failed'
                ? (isZh
                    ? '由于浏览器本地存储配额超限或写权限被拒，咨询意向无法写入磁盘。本原型为纯前端离线演示，未向真实人员发送任何信息；关闭本窗口后此条草稿在刷新后不会保留。'
                    : isTh
                    ? 'เนื่องจากพื้นที่จัดเก็บในเบราว์เซอร์เต็มหรือถูกปฏิเสธสิทธิ์ ไม่สามารถบันทึกร่างได้ และไม่มีการส่งข้อความไปยังบุคคลจริง'
                    : 'Due to browser storage quota or denied permissions, the draft could not be written to local storage. Live delivery is disabled (no message was sent), and this draft will not survive reload.')
                : (isZh 
                    ? '直联后台服务尚未接入当前演示身份。您的咨询意向已作为草稿留存在本浏览器本地存储中，系统严格遵守原则：未向任何真实个人发送信息或邮件。' 
                    : isTh 
                    ? 'ระบบยังไม่เปิดให้บริการช่องทางติดต่อโดยตรงสำหรับตัวตนจำลองนี้ ร่างข้อความของคุณถูกบันทึกไว้ในเบราว์เซอร์แล้ว ไม่มีการส่งข้อความหรืออีเมลไปยังบุคคลจริง' 
                    : 'Direct messaging API is not connected for this demo identity. Your inquiry has been stored locally in browser storage. No real person was contacted.')}
            </p>
          </div>

          {/* Draft receipt preview card */}
          <div className="p-3 bg-surface-subtle border border-hairline rounded-xl text-left text-xs max-w-sm mx-auto space-y-1 font-mono text-[11px]">
            <div className="text-ink-muted flex justify-between">
              <span>{isZh ? '接收对象:' : 'Recipient:'}</span>
              <span className="font-semibold text-ink">{person.name}</span>
            </div>
            <div className="text-ink-muted flex justify-between">
              <span>{isZh ? '状态标识:' : 'Status:'}</span>
              <span className={saveStatus === 'failed' ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-amber-600 dark:text-amber-400 font-bold'}>
                {saveStatus === 'failed' ? 'STORAGE_WRITE_FAILED' : 'STORED_MOCK_ONLY'}
              </span>
            </div>
            <div className="text-ink-muted flex justify-between">
              <span>{isZh ? '草稿编号:' : 'Draft ID:'}</span>
              <span className="text-ink-faint truncate max-w-[180px]">{savedDraftId}</span>
            </div>
          </div>

          <div className="pt-2">
            <Button variant="primary" size="sm" onClick={handleFinish} className="w-full">
              {isZh ? '完成并返回主页' : isTh ? 'เสร็จสิ้น' : 'Done & Return'}
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

export default ContactSheet;

import React, { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { ShieldCheck, Building2, CheckCircle2, AlertCircle, Image as ImageIcon, Upload, X } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { getLocalizedCompany } from '../../i18n/entitiesEn';

export function ClaimModal({ isOpen, onClose, company, onClaimed }) {
  const { locale, dict } = useI18n();
  const [submitted, setSubmitted] = useState(false);
  const [replacementImage, setReplacementImage] = useState(null);
  const [imageFileName, setImageFileName] = useState('');

  if (!company) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setReplacementImage(url);
      setImageFileName(file.name);
    }
  };

  const handleClearImage = () => {
    if (replacementImage && replacementImage.startsWith('blob:')) {
      URL.revokeObjectURL(replacementImage);
    }
    setReplacementImage(null);
    setImageFileName('');
  };

  const handleClaim = () => {
    setSubmitted(true);
    if (onClaimed) onClaimed(company.id, replacementImage);
  };

  const handleFinish = () => {
    setSubmitted(false);
    onClose();
  };

  const c = dict.claim || {};
  const isZh = locale === 'zh';
  const activeCompany = getLocalizedCompany(company, locale) || company;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={submitted ? handleFinish : onClose}
      title={c.dialogTitle || (isZh ? '认领企业工程主页 (Mock)' : 'Claim Enterprise Profile (Mock)')}
      description={activeCompany.fullName || activeCompany.name || ''}
    >
      {!submitted ? (
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>{c.alertTitle || (isZh ? '演示说明：纯前端交互，无真实机构认领流程' : 'Demo Notice: Pure frontend interaction, no real institutional claim process')}</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300/80">
              {c.alertDesc || (isZh 
                ? '在正式平台中，企业法定代表人或经授权的企业管理员需通过电子营业执照核验或企业电子签章完成身份绑定，以托管机构主页、发布法定工程纪事及背书参建人员业绩。'
                : 'In production, corporate legal representatives or authorized admins bind credentials using electronic business licenses or digital seals to manage entity profiles, publish legal engineering records, and endorse personnel.')}
            </p>
          </div>

          <div className="border border-hairline rounded-xl p-3 bg-surface-subtle space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-ink-muted">{c.licenseNo || (isZh ? '统一信用代码：' : 'Unified Credit Code:')}</span>
              <span className="font-mono font-bold text-ink">{activeCompany.licenseNo || company.licenseNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">{c.sector || (isZh ? '资质等级：' : 'Qualification Level:')}</span>
              <span className="text-ink font-semibold">{activeCompany.sector || company.sector}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">{c.linkedProjects || (isZh ? '推导关联工程：' : 'Derived Projects:')}</span>
              <span className="font-mono text-accent font-bold">
                {c.linkedProjectsVal || (isZh ? '已自动归档关联标段' : 'Contract packages automatically archived')}
              </span>
            </div>
          </div>

          {/* Local Image Replacement Mock Preview Section */}
          <div className="border border-hairline rounded-xl p-3 bg-surface-subtle space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-ink">
                <ImageIcon className="w-4 h-4 text-accent" />
                <span>{c.coverTitle || (isZh ? '企业封面图 / 业绩示意图替换 (本地预览)' : 'Company Cover / Project Schematic Replacement (Local Preview)')}</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                {c.coverBadge || (isZh ? '仅本地预览 / 待审核接入' : 'Local Preview Only / Pending Review')}
              </span>
            </div>

            <p className="text-[11px] text-ink-muted">
              {c.coverDesc || (isZh
                ? '认领企业后，管理员可上传工程实景或生产基地全景。本原型仅提供纯前端临时预览，不提供数据存储服务。'
                : 'After claiming, administrators can test project photos or facility panoramas. In this frontend prototype, temporary preview only; no data storage or transmission service provided.')}
            </p>

            {replacementImage ? (
              <div className="relative rounded-lg overflow-hidden border border-hairline bg-surface aspect-video max-h-40">
                <img
                  src={replacementImage}
                  alt="企业封面本地替换预览"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={handleClearImage}
                  className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-rose-600 transition-colors"
                  title="Remove Preview Image"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[10px] text-amber-300 font-mono border border-amber-500/30">
                  ● {isZh ? '待人工合规审核 · 严禁冒充真实第三方项目现场' : 'Pending Compliance Review · Mock demo only'}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-surface border border-hairline hover:border-accent text-ink hover:text-accent font-medium text-xs flex items-center gap-1.5 transition-colors shadow-xs">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isZh ? '选择本地图片替换封面' : 'Select Local Image to Replace Cover'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                <span className="text-[11px] text-ink-faint">JPG / PNG / SVG</span>
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-hairline">
            <Button variant="outline" size="sm" onClick={onClose}>
              {dict.common?.cancel || (isZh ? '取消' : 'Cancel')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={ShieldCheck}
              onClick={handleClaim}
            >
              {c.confirmClaim || (isZh ? '模拟提交认领与封面 (Mock)' : 'Confirm Claim & Bind Role (Mock)')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 text-center py-3">
          <div className="w-12 h-12 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-ink">
              {c.submitSuccess || (isZh ? '已完成模拟认领托管 (Mock)' : 'Enterprise profile claim simulated successfully (Demo)')}
            </h4>
            <p className="text-xs text-ink-muted max-w-sm mx-auto">
              {c.submitSuccessDesc || (isZh 
                ? '企业主页状态已在本地更新为“已认领托管”，您可在演示中体验经办人维护业绩与动态。'
                : 'In this prototype spike, you now have local management preview privileges to test custom cover uploads.')}
            </p>
          </div>
          <div className="pt-2">
            <Button variant="primary" size="sm" onClick={handleFinish} className="w-full">
              {c.close || (isZh ? '我知道了' : 'Complete & Close')}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

export default ClaimModal;

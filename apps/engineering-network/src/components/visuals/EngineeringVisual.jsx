import React from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { pickEngineeringVisual, visualDisclosure } from '../../services/engineeringVisuals';
import { useI18n } from '../../i18n/I18nContext';
export function EngineeringVisual({record, className='', styleVariant, showCategory=false}) {
  const {locale}=useI18n();
  const visual=pickEngineeringVisual(record,{style:styleVariant});
  return <div className={'relative overflow-hidden rounded-xl bg-surface-subtle border border-hairline '+className}>
    <img src={visual.src} alt={visual.illustrativeOnly
      ? (locale==='zh'?'项目类别通用示意插图': 'Generic engineering category illustration; not a real project photo')
      : (record?.title || 'Verified project image')}
      loading="lazy" decoding="async" className="w-full h-full object-cover" />
    {visual.illustrativeOnly && <span className="absolute bottom-2 left-2 right-2 inline-flex items-center gap-1.5 w-fit max-w-[calc(100%-1rem)] text-[10px] leading-snug bg-slate-950/85 text-white rounded-md px-2 py-1.5 shadow">
      <ImageIcon className="w-3.5 h-3.5 shrink-0" /><span>{visualDisclosure(locale)}</span>
    </span>}
    {showCategory && visual.category && <span className="absolute top-2 right-2 text-[10px] bg-surface/90 text-ink px-2 py-1 rounded-md font-semibold">{locale==='zh'?visual.category.zh:locale==='th'?visual.category.th:visual.category.en}</span>}
  </div>;
}


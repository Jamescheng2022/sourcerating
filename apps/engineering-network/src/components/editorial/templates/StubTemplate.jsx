import React from 'react';
import { Clock, Layout, Sparkles, Layers } from 'lucide-react';
import { getTemplateById } from './templateContracts';

export function StubTemplate({ templateId = 'milestone', data = {} }) {
  const template = getTemplateById(templateId);

  return (
    <div className="w-full bg-surface-subtle border border-hairline rounded-xl p-5 text-center space-y-3 select-none">
      <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/30 text-accent flex items-center justify-center mx-auto">
        <Layout className="w-6 h-6" />
      </div>

      <div className="space-y-1 max-w-sm mx-auto">
        <div className="flex items-center justify-center gap-2">
          <h3 className="font-bold text-sm text-ink">{template.name}</h3>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
            即将推出 (Coming Soon)
          </span>
        </div>
        <p className="text-xs text-ink-muted leading-relaxed">
          {template.description}
        </p>
      </div>

      {/* Blueprint Layout Wireframe Mockup */}
      <div className="bg-canvas border border-dashed border-hairline rounded-lg p-3 text-left space-y-2 max-w-xs mx-auto">
        <div className="text-[10px] font-mono text-ink-faint flex items-center justify-between">
          <span>排版草案规约 (LAYOUT SPEC)</span>
          <span>{template.aspectRatio}</span>
        </div>
        <div className="space-y-1.5 opacity-60">
          <div className="h-16 rounded bg-surface border border-hairline flex items-center justify-center text-[10px] text-ink-muted">
            主视觉区域 ({template.aspectRatio})
          </div>
          <div className="flex gap-1.5">
            <div className="h-4 flex-1 rounded bg-surface border border-hairline"></div>
            <div className="h-4 w-12 rounded bg-surface border border-hairline"></div>
          </div>
        </div>
      </div>

      <div className="text-[11px] text-ink-faint font-mono pt-1">
        推荐适用场景：{template.suitableFor}
      </div>
    </div>
  );
}

export default StubTemplate;

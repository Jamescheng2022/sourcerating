import React from 'react';
import { PhotoEssayTemplate } from './PhotoEssayTemplate';
import { StubTemplate } from './StubTemplate';

export function MagazineTemplateRenderer({ templateId = 'photo_essay', data = {}, onInspect }) {
  if (templateId === 'photo_essay') {
    return <PhotoEssayTemplate data={data} onInspect={onInspect} />;
  }

  return <StubTemplate templateId={templateId} data={data} />;
}

export default MagazineTemplateRenderer;

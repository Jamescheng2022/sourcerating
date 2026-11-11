import React from 'react';
import {getEngineeringLayout} from '../../data/engineeringArticleLayouts';
/** Semantic HTML preview only; author text is escaped by React automatically. */
export function EngineeringArticlePreview({layoutId='journal',title='',summary='',project='',company='',questions=[],answers={},photos=[]}){
 const layout=getEngineeringLayout(layoutId), dark=layout.id==='blueprint';
 const cover=photos.length>0;
 const displayQ=questions.filter(q=>String(answers[q.key]||'').trim());
 const fg=layout.ink, accent=layout.accent;
 const isTimeline=layout.mode==='timeline';
 const isTechnical=layout.mode==='report';
 const isSplit=layout.mode==='split';
 const isGallery=layout.mode==='gallery';
 return <article data-article-layout={layout.id} className="rounded-xl border border-hairline overflow-hidden w-full max-w-full" style={{background:layout.paper,color:fg}}>
   <header className={'px-4 pt-6 pb-5 sm:px-8 sm:pt-9 '+(layout.mode==='blueprint'?'border-b border-white/20':'')}>
     <p className="text-[10px] uppercase font-bold tracking-[.20em]" style={{color:accent}}>SOURCE RATING · ENGINEERING ARTICLE · AUTHOR DRAFT</p>
     <h3 className="font-serif text-2xl sm:text-4xl font-semibold leading-tight mt-4 break-words">{title||'Untitled engineering report'}</h3>
     {summary&&<p className={'mt-4 leading-relaxed '+(isSplit?'text-base':'text-sm')} style={{opacity:.88}}>{summary}</p>}
     {(project||company)&&<div className="mt-4 border-t pt-3 text-[11px] space-y-1" style={{borderColor:dark?'#ffffff33':'#a6b6b24d',opacity:.85}}>
       {project&&<p><b>Project (author supplied):</b> {project}</p>}{company&&<p><b>Organization (author supplied):</b> {company}</p>}
     </div>}
   </header>
   {cover&&<div className={'px-4 sm:px-8 pb-5 '+(isGallery?'grid grid-cols-2 gap-2':isSplit?'grid grid-cols-1 sm:grid-cols-2 gap-3':'space-y-3')}>
     {photos.slice(0,isGallery?6:isSplit?4:1).map((p,i)=><figure key={i} className="overflow-hidden">
       <img src={p.url} alt={p.caption||'Author uploaded engineering image'} className={'w-full object-cover rounded-md '+(isGallery?'aspect-square':isSplit?'aspect-[4/3]':'aspect-[16/8]')} loading="lazy"/>
       <figcaption className="text-[10px] mt-1.5 leading-relaxed" style={{opacity:.65}}>Photo {i+1} · {p.caption||'Author-provided photograph'}</figcaption>
     </figure>)}
   </div>}
   <div className={'px-4 sm:px-8 pb-8 '+(isSplit?'grid grid-cols-1 sm:grid-cols-2 gap-x-8':'')}>
     {displayQ.map((q,i)=><section key={q.key} className={'my-4 '+(isTimeline?'border-l-[3px] pl-4':'')+(isTechnical?' border-b pb-4':'')} style={{borderColor:accent}}>
       <div className="flex items-center gap-2"><span className="text-[10px] font-bold" style={{color:accent}}>{String(i+1).padStart(2,'0')}</span><h4 className="text-sm font-semibold leading-relaxed">{q.en}</h4></div>
       <p className="text-sm leading-[1.8] whitespace-pre-wrap break-words mt-2" style={{opacity:.92}}>{answers[q.key]}</p>
     </section>)}
   </div>
   <footer className="px-4 sm:px-8 pb-7 pt-4 border-t text-[10px] leading-relaxed" style={{borderColor:dark?'#ffffff30':'#a6b6b255',opacity:.74}}>
     Author-supplied material. Figures, identities, compliance claims, images and participation require verification. Visual layout does not certify any claim.
   </footer>
 </article>;
}


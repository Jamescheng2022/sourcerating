import React, { useEffect, useMemo, useState, useRef } from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ClipboardCopy, Download, FileText, Image as ImageIcon, Loader2, Save, ShieldAlert, Sparkles, UploadCloud, X } from 'lucide-react';
import { ENGINEERING_ARTICLE_TEMPLATES, getArticleTemplate, questionsForInterview, composeArticleMarkdown } from '../../data/engineeringArticleTemplates';
import { EngineeringVisual } from '../visuals/EngineeringVisual';
import { ENGINEERING_ARTICLE_LAYOUTS, getEngineeringLayout, quickChoices, auditEngineeringArticle, exportEngineeringArticleHtml } from '../../data/engineeringArticleLayouts';
import { EngineeringArticlePreview } from '../article/EngineeringArticlePreview';
import { EngineeringCloudDrafts } from '../article/EngineeringCloudDrafts';

const STORAGE_KEY='sr_ai_publisher_draft_v1';
function cleanInput(s,max=3000){return String(s||'').slice(0,max)}
function makeImage(file){
  return new Promise(resolve=>{
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024){resolve(null);return;}
    const reader=new FileReader();
    reader.onerror=()=>resolve(null);
    reader.onload=()=>{
      const image=new Image();
      image.onerror=()=>resolve(null);
      image.onload=()=>{
        try{
          const ratio=Math.min(1,1400/Math.max(image.width,image.height));
          const canvas=document.createElement('canvas');
          canvas.width=Math.max(1,Math.round(image.width*ratio));
          canvas.height=Math.max(1,Math.round(image.height*ratio));
          canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
          resolve({url:canvas.toDataURL('image/jpeg',0.78),caption:file.name.replace(/\.[^.]+$/,''),fileName:file.name,isCustomUpload:true,mediaProvenance:'author-upload-unverified'});
        }catch{resolve(null)}
      };
      image.src=reader.result;
    };
    reader.readAsDataURL(file);
  });
}
const STEP_NAMES={zh:['选文章类型','上传素材','逐步采访','排版与确认'],en:['Choose format','Add materials','Guided interview','Review & export'],th:['เลือกประเภท','เพิ่มรูป','สัมภาษณ์','ตรวจสอบ']};
const WORDS={
 zh:{title:'AI 辅助工程发帖',sub:'使用既有发帖入口，采访和排版先行；模型服务尚未接入',pick:'选择最贴近你真实经历的文章结构',next:'下一步',back:'上一步',intro:'先给我一段简短描述，再附上照片、项目关联；无需先写文章。',summary:'用几句话讲讲这件事（选填）',headline:'你想使用的标题（选填）',project:'项目名称（作者声明）',company:'公司/单位（作者声明）',link:'关联已有的公开项目档案（可选）',independent:'不关联公开记录',upload:'上传现场照片或技术图片',limit:'最多 10 张，每张 ≤10MB。仅在本机浏览器处理，自动移除 EXIF；未传至服务器。',caption:'图片图注（请确认真实描述）',questions:'请回答你确实掌握的信息。不知道可以跳过，系统不会补造技术参数或结论。',prompt:'第',skip:'跳过',preview:'生成可核对文章草稿',need:'至少回答 3 个实际问题，才能生成较有价值的工程文章。',review:'杂志式排版预览与事实确认',copy:'复制 Markdown',download:'保存 .md',insert:'填入原发帖编辑器',agree:'我已检查本文的项目身份、技术参数、图片权限和结论；未确认内容将在正式发布前修正。',notReal:'本轮为本地结构化辅助写作，不调用线上大模型；AI 模型接口和正式服务器发布尚未开启。',saved:'文字草稿保存在当前浏览器，上传图片刷新后需重新选择。',photos:'照片',covered:'已回答',sourceOnly:'公开来源记录（非证明投稿者参与该项目）',change:'返回修改',copyOk:'已复制',error:'无法处理部分图片，请尝试 JPG/PNG/WebP ≤10MB',noIdentity:'此处仅收集作者自行提供的信息，未核实人员或公司身份。',direct:'已接入原编辑器；仍需检查并手动发布，当前预览仅为本地演示。'},
 en:{title:'Engineering Publisher',sub:'Guided interviewing and editorial layout inside the original composer',pick:'Choose an article format for your first-hand experience',next:'Continue',back:'Back',intro:'Start with a short account and optional photos. No need to draft a full article.',summary:'What happened? Short context (optional)',headline:'Preferred headline (optional)',project:'Project name (author-provided)',company:'Organization (author-provided)',link:'Link to a public project record (optional)',independent:'No source record link',upload:'Upload construction/technical photographs',limit:'Up to 10, ≤10MB each. Images are processed locally and EXIF is removed. Nothing is uploaded.',caption:'Photo caption (verify accuracy)',questions:'Only report what you personally know. Skip unknown facts; figures and outcomes will never be invented.',prompt:'Question',skip:'Skip',preview:'Compose reviewable article',need:'Answer at least three substantive questions to make a useful engineering article.',review:'Editorial preview and verification',copy:'Copy Markdown',download:'Save .md',insert:'Use in original post composer',agree:'I have checked project identity, technical values, image rights and conclusions; unresolved claims will be corrected before publication.',notReal:'This preview uses structured local drafting, not a live AI model. Cloud AI and server publishing are not connected.',saved:'Text drafts are saved in this browser; selected images must be reattached after refreshing.',photos:'Photos',covered:'Answered',sourceOnly:'Public-source record is not proof of the author’s project participation.',change:'Edit answers',copyOk:'Copied',error:'One or more images could not be safely processed (JPG/PNG/WebP ≤10MB).',noIdentity:'Author and organization identities are unverified in this preview.',direct:'Inserted into original editor. Please review; preview posts are local only.'}
};
function ui(locale,key){const lang=WORDS[locale]?'en'===locale?'en':'zh':'en';return WORDS[lang][key]||WORDS.en[key]||key;}
export function EngineeringPublisherWizard({isOpen,onClose,onUseDraft,locale='zh'}){
  const [step,setStep]=useState(0);
  const [templateId,setTemplateId]=useState('technical');
  const [layoutId,setLayoutId]=useState('journal');
  const [headline,setHeadline]=useState('');
  const [summary,setSummary]=useState('');
  const [project,setProject]=useState('');
  const [company,setCompany]=useState('');
  const [sourceRecordId,setSourceRecordId]=useState('');
  const [records,setRecords]=useState([]);
  const [photos,setPhotos]=useState([]);
  const [answers,setAnswers]=useState({});
  const [questionIndex,setQuestionIndex]=useState(0);
  const [confirmed,setConfirmed]=useState(false);
  const [markdown,setMarkdown]=useState('');
  const [alert,setAlert]=useState('');
  const [savingImage,setSavingImage]=useState(false);
  const uploader=useRef(null);
  const template=getArticleTemplate(templateId);
  const questions=useMemo(()=>questionsForInterview(template,summary),[template,summary]);
  const prepared=useMemo(()=>composeArticleMarkdown({template,project,company,headline,summary,answers,photoCaptions:photos.map(x=>x.caption)}),[template,project,company,headline,summary,answers,photos]);
  const linkedRecord=records.find(x=>x.sourceRecordId===sourceRecordId)||null;
  const audit=useMemo(()=>auditEngineeringArticle({headline,summary,project,company,answers,photos,linkedRecord}),[headline,summary,project,company,answers,photos,linkedRecord]);
  const isZh=locale==='zh';
  useEffect(()=>{
    if(!isOpen)return;
    try{
      const last=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
      if(last){setTemplateId(last.templateId||'technical');setLayoutId(getEngineeringLayout(last.layoutId).id);setHeadline(last.headline||'');setSummary(last.summary||'');setProject(last.project||'');setCompany(last.company||'');setSourceRecordId(last.sourceRecordId||'');setAnswers(last.answers||{});}
    }catch{}
  },[isOpen]);
  useEffect(()=>{
    if(!isOpen)return;
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify({templateId,layoutId,headline,summary,project,company,sourceRecordId,answers,updatedAt:new Date().toISOString()}))}catch{}
  },[isOpen,templateId,layoutId,headline,summary,project,company,sourceRecordId,answers]);
  useEffect(()=>{
    if(!isOpen)return;
    let live=true;
    fetch((import.meta.env.BASE_URL||'/')+'data/atlas/feed-snapshot.json')
      .then(x=>{if(!x.ok)throw Error('missing source snapshot');return x.json()})
      .then(x=>{if(live)setRecords((x.records||[]).slice(0,60))})
      .catch(()=>{if(live)setRecords([])});
    return ()=>{live=false};
  },[isOpen]);
  const uploadFiles=async e=>{
    const files=Array.from(e.target.files||[]);
    if(uploader.current)uploader.current.value='';
    const room=Math.max(0,10-photos.length);
    if(!files.length||!room)return;
    setSavingImage(true);
    const all=await Promise.all(files.slice(0,room).map(makeImage));
    const valid=all.filter(Boolean);
    setPhotos(old=>[...old,...valid]);
    if(valid.length<files.length)setAlert(ui(locale,'error'));
    setSavingImage(false);
  };
  const updateCaption=(index,value)=>setPhotos(old=>old.map((p,i)=>i===index?{...p,caption:cleanInput(value,180)}:p));
  const forward=()=>{
    setAlert('');
    if(step===2){
      if(prepared.answered<3){setAlert(ui(locale,'need'));return;}
      let article=prepared.markdown;
      if(linkedRecord?.sourceUrl)article+='\n\n**Related public-source record (not proof of participation):** '+linkedRecord.sourceUrl;
      setMarkdown(article);
    }
    setStep(old=>Math.min(3,old+1));
  };
  const copy=async()=>{try{await navigator.clipboard.writeText(markdown);setAlert(ui(locale,'copyOk'))}catch{setAlert('Clipboard unavailable: please select the draft text.')}};
  const save=()=>{
    const blob=new Blob([markdown],{type:'text/markdown;charset=utf-8'});
    const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='engineering-article-draft.md';link.click();URL.revokeObjectURL(url);
  };
  const cloudArticleInfo=()=>({
    title:prepared.title,
    summary,
    body_markdown:markdown || prepared.markdown,
    layout_id:layoutId,
    article_type:templateId,
    project_source_id:sourceRecordId || null,
    project_source_url:linkedRecord?.sourceUrl || null,
    project_name:project,
    company_name:company,
    interview:{templateId,layoutId,headline,summary,project,company,sourceRecordId,answers,photoCaptions:photos.map(p=>p.caption)},
    review_flags:audit.issues.filter(i=>i.severity==='review').map(i=>({id:i.id,severity:i.severity,field:i.field}))
  });
  const loadCloudArticle=(draft)=>{
    setTemplateId(getArticleTemplate(draft.templateId).id);
    setLayoutId(getEngineeringLayout(draft.layoutId).id);
    setHeadline(draft.headline || draft.title || '');
    setSummary(draft.summary || '');
    setProject(draft.project || '');
    setCompany(draft.company || '');
    setSourceRecordId(draft.sourceRecordId || '');
    setAnswers(draft.answers && typeof draft.answers==='object'?draft.answers:{});
    setMarkdown(String(draft.body_markdown || '').slice(0,16000));
    setPhotos([]);
    setConfirmed(false);
    setAlert('');
    setStep(3);
  };
  const saveHtml=()=>{
    const html=exportEngineeringArticleHtml({
      layoutId,title:prepared.title,summary,project,company,questions,answers,photos
    });
    const blob=new Blob([html],{type:'text/html;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;link.download='engineering-article-draft.html';document.body.appendChild(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  const use=()=>{
    if(!confirmed){setAlert(ui(locale,'agree'));return;}
    if(prepared.answered<3){setAlert(ui(locale,'need'));return;}
    onUseDraft({
      headline:prepared.title,bodyText:markdown,images:photos,category:template.category,
      linkedRecord:linkedRecord?{id:linkedRecord.sourceRecordId,title:linkedRecord.title,sourceUrl:linkedRecord.sourceUrl}:null,
      projectName:project,companyName:company
    });
    try{localStorage.removeItem(STORAGE_KEY)}catch{}
    setStep(0);setConfirmed(false);setAlert('');
  };
  if(!isOpen)return null;
  return <div className="fixed inset-0 z-[90] bg-slate-950/65 backdrop-blur-sm flex items-center justify-center sm:p-4" role="presentation" onClick={e=>{e.stopPropagation();onClose();}}>
    <div role="dialog" aria-modal="true" aria-labelledby="eng-wizard-title" className="bg-surface text-ink w-full h-full sm:h-auto sm:max-h-[94vh] sm:max-w-4xl sm:rounded-2xl border border-hairline shadow-2xl flex flex-col overflow-hidden" onClick={e=>e.stopPropagation()}>
      <div className="flex justify-between items-center gap-2 p-4 sm:px-6 border-b border-hairline bg-surface-subtle">
        <div className="min-w-0"><div className="text-accent text-[10px] font-bold tracking-widest">SOURCERATING · ENGINEERING STUDIO</div><h2 id="eng-wizard-title" className="font-bold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-accent"/>{ui(locale,'title')}</h2><p className="text-ink-muted text-[11px]">{ui(locale,'sub')}</p></div>
        <button type="button" aria-label="Close AI publisher" onClick={onClose} className="p-2 rounded-lg hover:bg-surface-hover"><X className="w-5 h-5"/></button>
      </div>
      <div className="flex gap-1 p-3 sm:px-6 border-b border-hairline text-[10px] sm:text-xs">
        {STEP_NAMES[WORDS[locale]?locale:'en'].map((name,i)=><div key={i} className={'min-w-0 flex-1 text-center rounded-md px-1 py-2 font-semibold '+(step===i?'bg-accent text-white':step>i?'bg-emerald-500/10 text-emerald-700':'bg-surface-subtle text-ink-muted')}>{i+1}. {name}</div>)}
      </div>
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-5">
        {alert&&<div role="alert" className="bg-amber-100 border border-amber-300 rounded-lg p-3 text-xs text-amber-900">{alert}</div>}
        {step===0&&<>
          <h3 className="font-semibold text-base">{ui(locale,'pick')}</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ENGINEERING_ARTICLE_TEMPLATES.map(tp=><button key={tp.id} type="button" onClick={()=>{setTemplateId(tp.id);setAnswers({});setQuestionIndex(0)}} className={'text-left p-4 rounded-xl border-2 transition-colors '+(templateId===tp.id?'border-accent bg-accent/5':'border-hairline hover:border-accent/50')}>
              <span className="font-bold block mb-2">{isZh?tp.name.zh:tp.name.en}</span>
              <span className="text-xs text-ink-muted">{isZh?tp.hint.zh:tp.hint.en}</span>
              {templateId===tp.id&&<CheckCircle2 className="w-5 h-5 text-accent mt-3"/>}
            </button>)}
          </div>
          <p className="bg-surface-subtle border border-hairline rounded-lg p-3 text-xs text-ink-muted">{ui(locale,'notReal')}</p>
        </>}
        {step===1&&<>
          <h3 className="font-semibold text-base">{ui(locale,'intro')}</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block text-xs font-semibold">{ui(locale,'headline')}<input value={headline} onChange={e=>setHeadline(cleanInput(e.target.value,160))} maxLength={160} className="mt-1 block w-full border border-hairline bg-surface-subtle rounded-lg p-3 text-sm" placeholder={isZh?'例如：某工业厂房预制梁吊装难点复盘':'e.g. Precast beam lifting lessons'}/></label>
            <label className="block text-xs font-semibold">{ui(locale,'project')}<input value={project} onChange={e=>setProject(cleanInput(e.target.value,200))} maxLength={200} className="mt-1 block w-full border border-hairline bg-surface-subtle rounded-lg p-3 text-sm"/></label>
            <label className="block text-xs font-semibold">{ui(locale,'company')}<input value={company} onChange={e=>setCompany(cleanInput(e.target.value,160))} maxLength={160} className="mt-1 block w-full border border-hairline bg-surface-subtle rounded-lg p-3 text-sm"/></label>
            <label className="block text-xs font-semibold">{ui(locale,'link')}<select value={sourceRecordId} onChange={e=>{setSourceRecordId(e.target.value);const found=records.find(x=>x.sourceRecordId===e.target.value);if(found && !project.trim())setProject(found.title)}} className="mt-1 block w-full border border-hairline bg-surface-subtle rounded-lg p-3 text-sm">
              <option value="">{ui(locale,'independent')}</option>{records.map(r=><option key={r.id} value={r.sourceRecordId}>{r.country}: {r.title.slice(0,75)}</option>)}
            </select></label>
          </div>
          <label className="block text-xs font-semibold">{ui(locale,'summary')}<textarea rows={3} maxLength={1200} value={summary} onChange={e=>setSummary(cleanInput(e.target.value,1200))} className="mt-1 block w-full border border-hairline bg-surface-subtle rounded-lg p-3 text-sm" placeholder={isZh?'只说你自己确切知道的事情，AI 会据此调整追问':'Only state what you know. The interview questions adapt to technical keywords.'}/></label>
          <div className="rounded-xl border border-dashed border-hairline bg-surface-subtle p-4">
            <label className="flex flex-wrap justify-between items-center gap-3 cursor-pointer">
              <span className="flex items-center gap-2 font-semibold text-sm"><UploadCloud className="w-5 h-5 text-accent"/>{ui(locale,'upload')}</span>
              <span className="rounded-lg bg-accent text-white text-xs px-3 py-2">{savingImage?<Loader2 className="w-4 h-4 animate-spin"/>:'+ Select photos'}</span>
              <input ref={uploader} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={uploadFiles} className="sr-only"/>
            </label>
            <p className="mt-2 text-[11px] text-ink-muted">{ui(locale,'limit')}</p>
          </div>
          {!!photos.length&&<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{photos.map((p,i)=><div key={i} className="border border-hairline rounded-xl p-2 space-y-2"><img src={p.url} alt={'Author image '+(i+1)} className="w-full aspect-[4/3] object-cover rounded-lg"/><input value={p.caption} onChange={e=>updateCaption(i,e.target.value)} aria-label={ui(locale,'caption')+(i+1)} className="w-full border border-hairline rounded-md text-xs p-2 bg-surface-subtle"/><button onClick={()=>setPhotos(old=>old.filter((_,k)=>k!==i))} className="text-[11px] text-rose-600">× Remove</button></div>)}</div>}
          <p className="text-xs text-ink-muted">{ui(locale,'sourceOnly')} {ui(locale,'noIdentity')}</p>
        </>}
        {step===2&&<>
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-[10px] text-accent font-bold uppercase tracking-wider">STRUCTURED INTERVIEW</p><h3 className="font-bold text-lg">{ui(locale,'prompt')} {questionIndex+1} / {questions.length}</h3></div>
            <div className="text-xs text-ink-muted">{ui(locale,'covered')}: {prepared.answered}/{questions.length}</div>
          </div>
          <p className="text-xs text-ink-muted">{ui(locale,'questions')}</p>
          <div className="rounded-xl border border-hairline bg-surface-subtle p-5 space-y-4">
            <h4 className="font-semibold text-base">{isZh?questions[questionIndex].zh:questions[questionIndex].en}</h4>
            <textarea rows={5} value={answers[questions[questionIndex].key]||''}
              onChange={e=>setAnswers(old=>({...old,[questions[questionIndex].key]:cleanInput(e.target.value,2800)}))}
              className="w-full border border-hairline rounded-xl bg-surface p-4 text-sm leading-relaxed"
              placeholder={isZh?'尽量填写具体事实：条件、操作、观察数据、发生的时间…':'Enter specific facts, observations, dates or measurements you have verified…'}/>
            <div className="space-y-2">
              <p className="text-[11px] text-ink-muted">{isZh?'可点选的候选表述（仅由作者确认，AI 不视为事实；也可直接填写）：':'Optional answer suggestions (author must confirm; not verified facts):'}</p>
              <div className="flex flex-wrap gap-1.5">
                {quickChoices(questions[questionIndex].key,locale).map(choice=><button type="button" key={choice.id}
                  onClick={()=>setAnswers(old=>{
                    const key=questions[questionIndex].key;const current=String(old[key]||'');
                    return current.includes(choice.value)?old:{...old,[key]:current?current+'；'+choice.value:choice.value};
                  })}
                  className="border border-hairline rounded-full px-2.5 py-1.5 text-[11px] text-ink-muted bg-surface hover:border-accent hover:text-accent">
                  {choice.label}
                </button>)}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={()=>setQuestionIndex(i=>Math.max(0,i-1))} disabled={questionIndex===0} className="border border-hairline rounded-lg px-3 py-2 text-xs disabled:opacity-40">{ui(locale,'back')}</button>
              <button onClick={()=>setQuestionIndex(i=>Math.min(questions.length-1,i+1))} disabled={questionIndex===questions.length-1} className="border border-hairline rounded-lg px-3 py-2 text-xs disabled:opacity-40">{ui(locale,'skip')} / {ui(locale,'next')}</button>
            </div>
          </div>
          <div className="grid grid-cols-6 gap-1.5">{questions.map((q,i)=><button key={q.key} type="button" onClick={()=>setQuestionIndex(i)} aria-label={'Interview question '+(i+1)} className={'h-2.5 rounded-full '+(answers[q.key]?.trim()?'bg-emerald-500':questionIndex===i?'bg-accent':'bg-surface-subtle border border-hairline')}/>)}</div>
          <p className="text-xs text-ink-muted">{ui(locale,'saved')}</p>
        </>}
        {step===3&&<>
          <h3 className="font-semibold text-base">{ui(locale,'review')}</h3>
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-ink">{isZh?'排版风格（只改变 HTML/CSS，不添加事实）':'Article layout (HTML/CSS only, no fabricated facts)'}
              <select aria-label="Article layout" value={layoutId} onChange={e=>setLayoutId(e.target.value)}
                className="mt-2 w-full p-2.5 border rounded-lg border-hairline bg-surface text-ink text-sm">
                {ENGINEERING_ARTICLE_LAYOUTS.map(layout=><option value={layout.id} key={layout.id}>
                  {locale==='zh'?layout.name.zh:layout.name.en} — {locale==='zh'?layout.hint.zh:layout.hint.en}
                </option>)}
              </select>
            </label>
            <EngineeringArticlePreview layoutId={layoutId} title={prepared.title} summary={summary} project={project} company={company}
              questions={questions} answers={answers} photos={photos}/>
          </div>
          <section className="border border-hairline rounded-xl p-3 sm:p-4 bg-surface-subtle space-y-3" aria-label="Engineering fact and logic check">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-bold">{isZh?'工程内容逻辑与数据预检':'Engineering logic & data preflight'}</h4>
              <span className={'text-[11px] px-2 py-1 rounded-full '+(audit.reviewCount?'bg-amber-100 text-amber-800':'bg-emerald-100 text-emerald-800')}>
                {audit.reviewCount?(isZh?audit.reviewCount+' 项需要核对':audit.reviewCount+' item(s) to review'):(isZh?'未命中明显矛盾':'No rule-triggered conflicts')}
              </span>
            </div>
            <p className="text-[11px] text-ink-muted">{isZh
              ? '当前为本地规则预检，不是大模型语义审核，也不是工程师签字认可。只提示疑点、不修改参数或补造证据。'
              : 'Deterministic local checks, not an LLM semantic audit or professional sign-off. Suspicions are flagged; facts are never changed automatically.'}</p>
            {audit.issues.filter(issue=>issue.severity!=='hint').map(issue=><div role="status" key={issue.id} className="border-l-2 border-amber-500 bg-amber-50 text-amber-900 rounded-r-md p-3 text-xs leading-relaxed">
              {locale==='zh'?issue.zh:issue.en}
            </div>)}
            {!!audit.hintCount&&<details className="text-xs text-ink-muted">
              <summary className="cursor-pointer font-semibold">{isZh?'信息完整性建议（'+audit.hintCount+' 项）':'Completeness suggestions ('+audit.hintCount+')'}</summary>
              <div className="space-y-1 mt-2">{audit.issues.filter(issue=>issue.severity==='hint').map(issue=><p key={issue.id}>• {locale==='zh'?issue.zh:issue.en}</p>)}</div>
            </details>}
          </section>
          <EngineeringCloudDrafts locale={locale} articleInfo={cloudArticleInfo} onLoadDraft={loadCloudArticle}/>
          <label className="text-xs font-semibold block">{isZh?'可编辑的 Markdown 正文':'Editable Markdown article'}<textarea rows={12} value={markdown} onChange={e=>setMarkdown(cleanInput(e.target.value,16000))} className="mt-2 border border-hairline rounded-lg w-full p-3 bg-surface-subtle text-xs font-mono leading-relaxed"/></label>
          <label className="flex items-start gap-3 p-3 bg-amber-50 text-amber-950 rounded-xl text-xs border border-amber-200"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} className="mt-0.5 shrink-0"/>{ui(locale,'agree')}</label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={saveHtml} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-hairline text-xs font-semibold">
              <Download className="w-4 h-4"/>{isZh?'导出 HTML 排版':'Export HTML layout'}
            </button>
            <button onClick={copy} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-hairline text-xs"><ClipboardCopy className="w-4 h-4"/>{ui(locale,'copy')}</button>
            <button onClick={save} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-hairline text-xs"><Download className="w-4 h-4"/>{ui(locale,'download')}</button>
          </div>
          <p className="text-xs text-ink-muted bg-surface-subtle p-3 rounded-lg">{ui(locale,'notReal')}</p>
        </>}
      </div>
      <div className="p-3 sm:px-6 border-t border-hairline bg-surface flex gap-3 justify-between items-center">
        <button onClick={()=>{setAlert('');if(step>0)setStep(i=>i-1);else onClose()}} className="flex items-center gap-2 px-3 py-2 text-sm text-ink-muted"><ArrowLeft className="w-4 h-4"/>{ui(locale,'back')}</button>
        {step===3?
          <button type="button" disabled={!confirmed} onClick={use} className="flex items-center gap-2 rounded-xl px-4 py-2.5 bg-accent text-white font-bold text-sm disabled:opacity-40"><Check className="w-4 h-4"/>{ui(locale,'insert')}</button>:
          <button type="button" onClick={forward} className="flex items-center gap-2 rounded-xl px-4 py-2.5 bg-accent text-white font-bold text-sm">{step===2?ui(locale,'preview'):ui(locale,'next')} <ArrowRight className="w-4 h-4"/></button>}
      </div>
    </div>
  </div>;
}


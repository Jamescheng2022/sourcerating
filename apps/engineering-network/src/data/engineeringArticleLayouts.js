/**
 * Author-led editorial design and conservative preflight.
 * Never invent facts, measurements, project relationships or technical results.
 * This is deterministic preflight: NOT an LLM or professional engineering review.
 */
export const ENGINEERING_ARTICLE_LAYOUTS=[
 {id:'journal',name:{zh:'工程杂志',en:'Editorial journal'},hint:{zh:'大标题与主图',en:'Large heading and cover'},ink:'#192e34',accent:'#13796f',paper:'#ffffff',mode:'cover'},
 {id:'field',name:{zh:'现场纪实',en:'Field notes'},hint:{zh:'施工过程记录',en:'Observations and process'},ink:'#203c38',accent:'#ad7941',paper:'#f8f7f1',mode:'field'},
 {id:'split',name:{zh:'图文对照',en:'Image & analysis'},hint:{zh:'图像与观点并列',en:'Paired image and text'},ink:'#172e45',accent:'#447b96',paper:'#f7fafb',mode:'split'},
 {id:'technical',name:{zh:'技术报告',en:'Technical report'},hint:{zh:'技术数据与证据',en:'Methods and evidence'},ink:'#1d3247',accent:'#2463a9',paper:'#f5f7fa',mode:'report'},
 {id:'timeline',name:{zh:'过程时间线',en:'Process timeline'},hint:{zh:'按阶段呈现',en:'Step-by-step narrative'},ink:'#283d34',accent:'#558b5b',paper:'#f9faf5',mode:'timeline'},
 {id:'photos',name:{zh:'工程影像',en:'Photo essay'},hint:{zh:'照片为主文字为辅',en:'Visual-first essay'},ink:'#252c32',accent:'#c17645',paper:'#fbf9f4',mode:'gallery'},
 {id:'blueprint',name:{zh:'蓝图手册',en:'Blueprint dossier'},hint:{zh:'专业技术画册',en:'Technical illustrated guide'},ink:'#e8f1fa',accent:'#91c9ec',paper:'#162c43',mode:'blueprint'},
 {id:'minimal',name:{zh:'简洁论文',en:'Minimal paper'},hint:{zh:'留白与清晰段落',en:'White space and clarity'},ink:'#202326',accent:'#666b72',paper:'#ffffff',mode:'minimal'}
];
export function getEngineeringLayout(id){
 return ENGINEERING_ARTICLE_LAYOUTS.find(x=>x.id===id)||ENGINEERING_ARTICLE_LAYOUTS[0];
}
const QUICK={
 context:[['现场施工','On-site construction'],['工厂生产','Factory production'],['质量检测','Testing / inspection'],['设计复核','Design review']],
 challenge:[['尺寸偏差','Dimensional variance'],['检测读数异常','Unexpected test reading'],['工序协调问题','Sequencing issue'],['文件与现场不一致','Site / record discrepancy']],
 method:[['重新测量并交叉复核','Remeasured and cross-checked'],['按图纸及规范复核','Reviewed drawings and standards'],['补做相关检测','Performed additional tests'],['与设计方核对','Consulted designer']],
 evidence:[['现场测量记录','Field measurement records'],['试验或检测报告','Test / inspection report'],['经授权的现场照片','Authorized site photographs'],['尚无可公开证据','No publishable evidence yet']],
 outcome:[['仍待复核确认','Pending independent verification'],['结果尚不明确','Outcome inconclusive'],['已按记录完成检查','Check completed per records'],['需要进一步整改','Further remediation required']],
 lessons:[['需要改进资料追溯','Improve evidence traceability'],['应增加复核环节','Add an independent check'],['应明确责任及验收条件','Clarify roles and acceptance criteria'],['待积累更多验证数据','More verification needed']],
 'foundation-check':[['有静载试验记录','Static load-test record available'],['仅有高应变测试记录','Only PDA record available'],['报告待工程师审核','Engineer review pending'],['尚未确认验收依据','Acceptance basis not confirmed']],
 'steel-check':[['焊缝检验记录可用','Weld inspection records available'],['吊装方案待复核','Lifting method under review'],['连接细节待确认','Connection detail unverified']],
 'concrete-check':[['已有强度检测报告','Strength-test report available'],['养护记录待核实','Curing log pending'],['生产批次待核对','Batch traceability pending']]
};
export function quickChoices(key,locale='en'){
 const rows=QUICK[key]||[];
 return rows.map(([zh,en])=>({id:en,label:locale==='zh'?zh:en,value:locale==='zh'?zh:en}));
}
const trim=s=>String(s||'').trim();
const hasAny=(value,list)=>list.some(x=>value.toLowerCase().includes(x));
export function auditEngineeringArticle({headline='',summary='',project='',company='',answers={},photos=[],linkedRecord=null}={}){
 const issues=[];
 const add=(id,severity,zh,en,field='all')=>{if(!issues.some(x=>x.id===id))issues.push({id,severity,zh,en,field})};
 const text=Object.values(answers).filter(Boolean).join('\n')+'\n'+summary;
 const evidence=trim(answers.evidence||'');
 const outcome=trim(answers.outcome||'');
 const method=trim(answers.method||'');
 const knownEvidence=evidence && !hasAny(evidence,['no publishable','not verified','no evidence','尚无','暂无','待确认','待核实','not available','未取得']);
 if(!trim(headline)&&!trim(summary))add('title','warning','标题和背景都未填写，文章主题不明确。','No title or contextual description supplied.','headline');
 if(outcome&&!knownEvidence&&hasAny(outcome,['已通过','合格','符合','已验证','confirmed','passed','compliant','verified','accepted','completed']))add('outcome-evidence','review','文章提出了确定性结论，但缺少可核对的证据。请补充报告或降低结论语气。','A definitive conclusion is stated without supporting evidence. Provide a record or qualify the claim.','evidence');
 if(hasAny(text,['100%合格','零缺陷','完全符合','毫无风险','guaranteed','100% compliant','zero defects','no risk','always safe'])) add('absolute','review','存在绝对化或保证性表述，需要明确适用边界及书面证据。','Absolute or guaranteed claim needs scope and documentary support.','all');
 if(outcome&&hasAny(outcome,['通过','pass','合格','accepted'])&&hasAny(outcome,['不通过','未通过','failed','不合格','rejected']))add('conflict','review','同一结论中同时存在“通过”和“未通过”等相反表述。请核对。','The outcome includes potentially conflicting pass/fail claims.','outcome');
 if(outcome&&hasAny(outcome,['已确认','通过','合格','verified','passed'])&&hasAny(evidence,['尚无','无证据','未取得','not available','no publishable','pending']))add('unsupported','review','结果称已确认，但证据描述尚无或待确认。请检查前后逻辑。','Outcome claims confirmation while evidence is absent or pending.','outcome');
 // Unit equivalence: flag only explicit numeric equality; don't infer engineering design limits.
 const unitRx=/(-?\d+(?:\.\d+)?)\s*(mm|cm|m)\s*(?:=|equals|等于|约等于)\s*(-?\d+(?:\.\d+)?)\s*(mm|cm|m)\b/gi;
 const factor={mm:0.001,cm:0.01,m:1};let m;
 while((m=unitRx.exec(text))!==null){const l=Number(m[1])*factor[m[2].toLowerCase()],r=Number(m[3])*factor[m[4].toLowerCase()];if(Math.abs(l-r)>Math.max(0.0005,Math.abs(l)*0.025))add('unit-equality','review','发现可能不一致的长度单位换算：'+m[0]+'。','Possible length-unit conversion mismatch: '+m[0]+'.','all')}
 const orderedDateRx=/(?:start|started|begin|commenced|开始|开工|起始)\s*[:：]?\s*(20\d{2}[-/]\d{1,2}[-/]\d{1,2})[\s\S]{0,95}?(?:end|ended|finish|complete|完成|结束|竣工)\s*[:：]?\s*(20\d{2}[-/]\d{1,2}[-/]\d{1,2})/i;
 const dm=orderedDateRx.exec(text);if(dm){const first=Date.parse(dm[1].replace(/\//g,'-')),last=Date.parse(dm[2].replace(/\//g,'-'));if(Number.isFinite(first)&&Number.isFinite(last)&&last<first)add('date-order','review','结束日期早于开始日期，请检查时间顺序。','End date precedes start date.','all')}
 if(!trim(answers.challenge||''))add('challenge','hint','尚未说明具体问题、目标或工程条件。','No clear engineering challenge or objective yet.','challenge');
 if(!trim(method))add('method','hint','尚未说明实际采取的措施，不建议 AI 补造。','No author-confirmed method recorded.','method');
 if(!knownEvidence)add('evidence','hint','尚缺可公开核实的证据，可以标注“待核实”，但不要编造。','No reviewable evidence recorded; mark pending instead of inventing details.','evidence');
 if(!trim(outcome))add('outcome','hint','请说明目前观察到的结果，或明确标注尚无结论。','State observed outcome or explicitly say it is unresolved.','outcome');
 if(linkedRecord)add('source-link','hint','公开项目档案关联仅证明来源存在，不证明投稿人参与该项目。','Linking a public record does not verify the author’s project involvement.','project');
 if(!photos.length)add('photos','hint','未附图片，文章仍可发布；正式工程案例更适合提供有权使用的现场素材。','No photos attached; acceptable, but authorized visuals can improve evidence.','photos');
 return {issues,reviewCount:issues.filter(x=>x.severity==='review').length,hintCount:issues.filter(x=>x.severity==='hint').length,modelVerified:false};
}
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeImage=x=>{const url=String(x?.url||'');return /^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(url)?url:''};
export function exportEngineeringArticleHtml({layoutId='journal',title='',summary='',project='',company='',questions=[],answers={},photos=[]}={}){
 const layout=getEngineeringLayout(layoutId);
 const css='body{margin:0;background:#e9eef0;font-family:system-ui,Arial,sans-serif}.paper{max-width:880px;margin:24px auto;padding:clamp(20px,6vw,64px);background:var(--paper);color:var(--ink);box-shadow:0 10px 40px #152b3820}.tag{color:var(--accent);font-size:12px;text-transform:uppercase;letter-spacing:.15em;font-weight:800}.title{font-family:Georgia,serif;line-height:1.1;font-size:clamp(32px,5vw,56px);margin:.3em 0}.lede{font-size:18px;line-height:1.65;opacity:.86}.meta{font-size:13px;opacity:.65;margin:16px 0}.photos{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:24px 0}.photos img{display:block;width:100%;aspect-ratio:16/10;object-fit:cover}figure{margin:0}figcaption{font-size:12px;opacity:.75;padding:6px 0}.part{margin:24px 0;padding:0 0 16px;border-bottom:1px solid currentColor;border-color:#7c909244}.part h2{font-size:18px;margin-bottom:8px}.part p{line-height:1.8;white-space:pre-wrap}.disclose{font-size:12px;line-height:1.6;margin-top:24px;border-top:1px solid #90a5a577;padding-top:16px;opacity:.75} .paper[data-layout=blueprint]{background:#162c43;color:#e8f1fa}.paper[data-layout=timeline] .part{border-left:3px solid var(--accent);padding-left:20px;border-bottom:0}.paper[data-layout=split] .photos{grid-template-columns:1fr 1fr}.paper[data-layout=photos] .photos img{aspect-ratio:4/3}.paper[data-layout=technical] .part h2{color:var(--accent);border-left:4px solid var(--accent);padding-left:12px}.paper[data-layout=minimal]{box-shadow:none}@media(max-width:620px){.paper{margin:0}.paper[data-layout=split] .photos{grid-template-columns:1fr}}';
 const photoHtml=photos.map((p,i)=>{const src=safeImage(p);return src?'<figure><img src="'+src+'" alt="Author-uploaded image '+(i+1)+'"><figcaption>'+escapeHtml(p.caption||'Author image')+'</figcaption></figure>':''}).join('');
 const sections=questions.filter(q=>trim(answers[q.key])).map(q=>'<section class="part"><h2>'+escapeHtml(q.en)+'</h2><p>'+escapeHtml(answers[q.key])+'</p></section>').join('');
 const meta=[project&&'Project (author supplied): '+project,company&&'Organization (author supplied): '+company].filter(Boolean).map(v=>'<p>'+escapeHtml(v)+'</p>').join('');
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>'+escapeHtml(title||'Engineering article draft')+'</title><style>:root{--ink:'+layout.ink+';--paper:'+layout.paper+';--accent:'+layout.accent+'}'+css+'</style></head><body><article class="paper" data-layout="'+layout.id+'"><div class="tag">Engineering report · author draft</div><h1 class="title">'+escapeHtml(title)+'</h1>'+(summary?'<p class="lede">'+escapeHtml(summary)+'</p>':'')+'<div class="meta">'+meta+'</div>'+(photoHtml?'<div class="photos">'+photoHtml+'</div>':'')+sections+'<p class="disclose">Author-supplied information. Project relationships, measurements, standards and images must be checked before any public publication. This document is an editable draft, not professional approval.</p></article></body></html>';
}


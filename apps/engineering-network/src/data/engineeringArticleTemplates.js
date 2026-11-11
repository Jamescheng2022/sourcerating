export const ENGINEERING_ARTICLE_TEMPLATES = [
 { id:'site-log',category:'site_update',name:{zh:'施工现场纪实',en:'Site field report'},hint:{zh:'现场工序、进展和控制点',en:'Site progress and critical controls'},
   questions:[['context','项目背景、现场工序和你承担的工作？','Project context, operation and your role?'],['challenge','最大的施工难点或安全风险是什么？','Main construction challenge or risk?'],['method','实际采用了哪些施工方法或控制措施？','Applied methods and controls?'],['evidence','哪些真实数据、检查记录或照片能够佐证？','Actual measurements, inspection records or photos?'],['outcome','观察到什么结果，仍有哪些不确定事项？','Observed outcome and uncertainties?'],['lessons','同行可借鉴哪些经验？','Practical lessons for peers?']]},
 { id:'technical',category:'technical_case',name:{zh:'技术攻关与工法',en:'Technical case study'},hint:{zh:'工程问题、方案、验证、复盘',en:'Engineering challenge, solution and validation'},
   questions:[['context','结构形式、工况、地质或设计边界是什么？','Structure, loading, ground or design context?'],['challenge','具体技术问题是什么？','The technical issue?'],['method','比较过哪些方法，最终采取什么措施？','Options considered and selected approach?'],['evidence','哪些计算参数、规范或试验数据可披露？','Calculations, codes and tests that can be disclosed?'],['outcome','措施执行后观察到什么？','Actual results observed?'],['lessons','适用边界、风险和教训是什么？','Limitations, risks and lessons?']]},
 { id:'quality',category:'technical_case',name:{zh:'质量检测与异常复盘',en:'Inspection & quality review'},hint:{zh:'异常、测试、复核、依据',en:'Anomalies, testing and verification'},
   questions:[['context','检测对象、条件和目的是什么？','What was tested, in what conditions and why?'],['challenge','发现了什么质量疑点或异常？','Quality anomaly or concern?'],['method','实际采用了什么检测仪器和复核方法？','Actual instruments and retest methods?'],['evidence','测量值、报告、规范依据有哪些？','Actual readings, documents and standards?'],['outcome','复核结论及待签署事项是什么？','Verified finding and pending approvals?'],['lessons','未来如何预防和更早发现？','Prevention and early detection lessons?']]},
 { id:'precast',category:'supply_chain',name:{zh:'预制构件与工厂案例',en:'Precast production & delivery'},hint:{zh:'设计、模具、浇筑、安装和交付',en:'Design, mould, casting, installation and delivery'},
   questions:[['context','构件类型、用途和设计约束是什么？','Component type, purpose and design limits?'],['challenge','模具、连接、浇筑、物流的难点？','Moulds, joints, casting or logistics challenges?'],['method','生产及质量控制的实际步骤？','Production and quality control steps?'],['evidence','可披露的尺寸、配筋、试验和质量记录？','Documented geometry, reinforcement, testing and QA?'],['outcome','交付和使用的实际结果？','Actual delivery and performance outcomes?'],['lessons','对采购方或工厂有什么经验？','Lessons for buyers and factories?']]},
 { id:'milestone',category:'project_progress',name:{zh:'项目节点与验收',en:'Project milestone & acceptance'},hint:{zh:'节点范围、进展、验收依据',en:'Scope, milestone and evidence'},
   questions:[['context','哪个项目的什么具体节点？','Which project and precise milestone?'],['challenge','此前存在什么风险或接口问题？','Prior risks and interface issues?'],['method','各专业如何协同完成？','How disciplines collaborated?'],['evidence','可核验的现场记录或文件是什么？','Documented evidence of completion?'],['outcome','已经完成和仍待完成的内容？','What was finished and what remains?'],['lessons','对下一阶段有哪些提醒？','Implications for the next stage?']]},
 { id:'interview',category:'engineer_interview',name:{zh:'工程师经验访谈',en:'Engineer experience interview'},hint:{zh:'真实经历、关键决策、经验教训',en:'First-hand experience and key decisions'},
   questions:[['context','经历发生在什么类型的项目？你的职责？','Project type and your role?'],['challenge','最典型的挑战是什么？','Most representative challenge?'],['method','为什么这样决策，其他方案是什么？','Decision rationale and alternatives?'],['evidence','哪些照片或成果可支持？','Photos or work records that substantiate this?'],['outcome','结果和影响是什么？','Outcome and impacts?'],['lessons','给年轻工程师的建议？','Advice for other engineers?']]}
];
export function getArticleTemplate(id){return ENGINEERING_ARTICLE_TEMPLATES.find(x=>x.id===id)||ENGINEERING_ARTICLE_TEMPLATES[0];}
export function questionsForInterview(template,signal=''){
  const questions=template.questions.map(([key,zh,en])=>({key,zh,en}));
  const x=String(signal).toLowerCase();
  if(/pile|桩|pda|csl|static load|静载|foundation|基坑/.test(x)) questions.splice(4,0,{key:'foundation-check',zh:'桩基、地基或基坑的检测条件和验收依据？',en:'Foundation test conditions and acceptance criteria?'});
  else if(/weld|truss|钢结构|焊|吊装|steel/.test(x)) questions.splice(4,0,{key:'steel-check',zh:'钢结构或吊装部分的连接、焊接和安全验收依据？',en:'Steelwork, lifting and weld acceptance evidence?'});
  else if(/concrete|混凝土|预制|precast|curing/.test(x)) questions.splice(4,0,{key:'concrete-check',zh:'配合比、养护、强度及生产批次的真实记录？',en:'Concrete mix, curing, strength and batch evidence?'});
  return questions;
}
export function composeArticleMarkdown({template,project='',company='',headline='',summary='',answers={},photoCaptions=[]}){
  const clean=s=>String(s||'').replace(/[\r\n]+/g,' ').trim();
  const title=clean(headline)||clean(summary).split(/[。.!?]/)[0].slice(0,85)||template.name.en;
  const sections=['# '+title];
  if(clean(summary))sections.push(clean(summary));
  if(clean(project))sections.push('**Project (author-supplied, unverified):** '+clean(project));
  if(clean(company))sections.push('**Organization (author-supplied, unverified):** '+clean(company));
  const questions=questionsForInterview(template,summary);
  let answered=0;
  for(const q of questions){const a=String(answers[q.key]||'').trim();if(a){answered++;sections.push('## '+q.en+'\n\n'+a)}}
  photoCaptions.filter(Boolean).forEach((c,i)=>sections.push('**Photo '+(i+1)+' (author caption):** '+clean(c)));
  sections.push('---\n**Editorial note:** All facts are author-supplied. Project identity, technical figures, standards and imagery require verification before public release.');
  return {title,markdown:sections.join('\n\n'),answered,total:questions.length};
}


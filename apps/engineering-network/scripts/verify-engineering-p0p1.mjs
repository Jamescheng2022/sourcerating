import {ENGINEERING_VISUAL_CATEGORIES,matchEngineeringCategory,pickEngineeringVisual} from '../src/services/engineeringVisuals.js';
import { ENGINEERING_ARTICLE_TEMPLATES, getArticleTemplate, questionsForInterview, composeArticleMarkdown } from '../src/data/engineeringArticleTemplates.js';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd();
assert.equal(ENGINEERING_VISUAL_CATEGORIES.length,13);
assert.equal(ENGINEERING_ARTICLE_TEMPLATES.length,6);
const vmanifest=JSON.parse(fs.readFileSync(path.join(root,'public/visual-templates/manifest.json'),'utf8'));
assert.equal(vmanifest.count,52);
assert.equal(vmanifest.templates.length,52);
for(const v of vmanifest.templates){
 const file=path.join(root,'public',v.image);
 const svg=fs.readFileSync(file,'utf8');
 assert.match(svg,/<svg/);
 assert.match(svg,/not a real project photograph/);
 assert(!svg.includes('http://') || svg.includes('xmlns="http://www.w3.org/2000/svg"'));
}
assert.equal(matchEngineeringCategory({title:'Cambridge social project'}).id,'general');
assert.equal(matchEngineeringCategory({title:'Cambridgeshire carriageway resurfacing'}).id,'road');
assert.equal(matchEngineeringCategory({title:'Bangkok water supply extension'}).id,'water');
assert.equal(matchEngineeringCategory({title:'Bridges for rural communities'}).id,'bridge'); // plural supported?
assert.equal(matchEngineeringCategory({title:'PDA test of foundation piles'}).id,'geotech');
assert.equal(pickEngineeringVisual({title:'Unknown'}).illustrativeOnly,true);
const tp=getArticleTemplate('technical');
assert(questionsForInterview(tp,'PDA 桩基检测').some(x=>x.key==='foundation-check'));
const answers={context:'Real site in Rayong.',challenge:'Unexpected PDA signal.',method:'Repeated impact and compared traces.',outcome:'Awaiting designer review.'};
const r=composeArticleMarkdown({template:tp,project:'Confidential project',company:'Example Co',headline:'PDA testing review',summary:'Observed field anomaly',answers,photoCaptions:['Pile testing rig view']});
assert.equal(r.answered,4);
for(const v of Object.values(answers))assert(r.markdown.includes(v));
assert(!r.markdown.includes('100% pass'));
assert(r.markdown.includes('author-supplied'));
console.log('P0P1_TEST_PASS',JSON.stringify({visualTemplates:52,articleStructures:6,interviewQuestions:questionsForInterview(tp,'PDA 桩基检测').length,composedMarkdownChars:r.markdown.length,uiSource:'original V4.2'}));


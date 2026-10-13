#!/usr/bin/env node
// SourceRating read-only static P0 smoke check (heuristic, not runtime acceptance).
import fs from 'node:fs';
const r=(p)=>{try{return fs.readFileSync(p,'utf8')}catch{return ''}};
const s=r('apps/web/src/lib/staging.ts');
const a=r('apps/web/src/lib/ai/runtime.ts');
const p=r('apps/web/src/app/api/project-room/analyze/route.ts');
const ui=r('apps/web/src/app/project-room/page.tsx');
const e2e=r('apps/web/scripts/s2-web-e2e.cjs');
const rules=a.split('export function classifyWithRules')[1]?.split('export async function classifyWithJevDirect')[0]||'';
const checks=[
 ['CTX',s&&!/recentContext:\s*\[\s*\]/.test(s),'real authorized history is sent to model'],
 ['EVENT',p&&/eventId|source_event_id|sourceEventId/.test(p)&&/from\([\"']room_events[\"']\)/.test(p),'model input server-bound to persisted event'],
 ['STAGING',p&&/staging_proposals|event_outbox|enqueue/i.test(p),'analysis has durable staging/worker enqueue'],
 ['ZH',/报价|价格|交期|确认/.test(rules),'fallback handles Chinese business signals'],
 ['TH',/ราคา|ส่งของ|ยืนยัน|ใบเสนอราคา/.test(rules),'fallback handles Thai business signals'],
 ['E2E',e2e.includes('playwright'),'real browser local E2E harness exists'],
 ['REVIEW',ui.includes('executeReviewStagingProposal'),'explicit review UI exists']
];
let gaps=0;
for(const [id,ok,desc] of checks){console.log((ok?'SIGNAL_PRESENT':'NEEDS_REVIEW')+'\t'+id+'\t'+desc);if(!ok)gaps++}
console.log('Static gaps '+gaps+'/'+checks.length+'; not confirmed runtime defects');
process.exitCode=gaps?2:0;

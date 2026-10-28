import test from "node:test";
import assert from "node:assert/strict";
import {classifyBusinessIntent} from "../../../supabase/functions/_shared/business-intent.mjs";
import {sanitizedContext, normalizeStagingResult, reviewTargetOrg} from "../../../supabase/functions/_shared/agent-staging.mjs";

// Scripted agents are synthetic personas; this is deterministic regression, NOT
// real customer interviews, live LLM evaluation or an RLS database security test.
const scenarios=[
  {role:"buyer", room:"shared-steel", text:"请问钢构报价由 CNY 320,000 改为 CNY 345,000，是否能在11月15日交货？", expected:"quote_change"},
  {role:"supplier", room:"shared-steel", text:"我们尽量在11月15日前交货，但还需要工厂确认", expected:"quote_change"},
  {role:"design", room:"buyer-internal", text:"新版图纸钢柱改成 H 300x200，不能直接按旧版施工",expected:"requirement"},
  {role:"pm", room:"buyer-internal", text:"请项目经理确认变更单，未批准前不能开工",expected:"requirement"},
  {role:"finance",room:"buyer-internal",text:"付款条款从30%预付款改为50%？",expected:"quote_change"},
  {role:"supplier",room:"shared-steel",text:"ราคาวัสดุเพิ่มเป็น 350000 บาท",expected:"quote_change"},
  {role:"buyer",room:"shared-steel",text:"อนุมัติแล้ว ดำเนินการตามใบเสนอราคา",expected:"quote_change"},
  {role:"warehouse",room:"shared-steel",text:"Shipment delayed due to defective batch",expected:"risk"},
  {role:"supplier",room:"shared-steel",text:"Thanks, will send you a photo shortly",expected:"conversation"},
  {role:"buyer",room:"shared-steel",text:"收到，谢谢",expected:"conversation"},
  {role:"retailer",room:"apparel",text:"补货数量调整为80件，颜色保持蓝色",expected:"requirement"},
  {role:"supplier",room:"apparel",text:"กำหนดส่งของจะล่าช้า 2 วัน",expected:"risk"},
  {role:"retailer",room:"apparel",text:"Is this the final approved color?",expected:"decision"},
  {role:"supplier",room:"apparel",text:"Please confirm invoice number",expected:"quote_change"},
  {role:"pm",room:"buyer-internal",text:"Final approval has not been issued",expected:"conversation"},
  {role:"design",room:"shared-steel",text:"Attached drawing revision V4 for steel beams",expected:"requirement"},
];
test("scripted multi-role language canary",()=>{
  const failures=[];
  for(const s of scenarios){
    const outcome=classifyBusinessIntent(s.text);
    if(outcome.intent!==s.expected) failures.push({role:s.role,message:s.text,expected:s.expected,actual:outcome.intent});
  }
  assert.deepEqual(failures,[]);
});
test("mixed-company room boundary excludes buyer internal and other project",()=>{
  const events=scenarios.map((s,i)=>({id:"e"+i,seq:i+1,room_id:s.room,event_type:"message.posted",payload:{text:s.text}}));
  const ctx=sanitizedContext(events,"shared-steel",events.length+1);
  assert.ok(ctx.length>0);
  assert.ok(ctx.every(e=>e.id.startsWith("e")));
  assert.ok(!ctx.some(e=>e.text.includes("付款条款")));
  assert.ok(!ctx.some(e=>e.text.includes("补货")));
});
test("only assigned counterparty should review a shared-room proposal",()=>{
  const room={kind:"external_supplier",owner_organization_id:"buyer-org",counterpart_organization_id:"supplier-org"};
  assert.equal(reviewTargetOrg(room,{actor_organization_id:"supplier-org"}),"buyer-org");
  assert.equal(reviewTargetOrg(room,{actor_organization_id:"buyer-org"}),"supplier-org");
  assert.equal(reviewTargetOrg(room,{actor_organization_id:"random-org"}),null);
});
test("unverifiable LLM change is not promoted into a fact",()=>{
 const source="Supplier says maybe next week, not guaranteed";
 const output={classification:"quote_change",actionable:true,summary:"Delivery committed",quoteChanges:[{field:"date",proposed:"2026-11-12",evidenceQuote:"confirmed November 12"}]};
 const result=normalizeStagingResult(output,source);
 assert.equal(result,null);
});

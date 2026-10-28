import test from "node:test";
import assert from "node:assert/strict";
import { normalizeStagingResult,reviewTargetOrg,sanitizedContext,normalizeKind,promptForRoomEvent } from "../../../supabase/functions/_shared/agent-staging.mjs";
const roomId="a", event={actor_organization_id:"seller"};
const room={kind:"supplier_shared",owner_organization_id:"buyer",counterpart_organization_id:"seller"};
test("supplier response targets buyer, buyer response targets seller",()=>{
  assert.equal(reviewTargetOrg(room,event),"buyer");
  assert.equal(reviewTargetOrg(room,{actor_organization_id:"buyer"}),"seller");
  assert.equal(reviewTargetOrg(room,{actor_organization_id:"other"}),null);
});
test("cross room context and future seq are excluded",()=>{
 const rows=[{id:"1",room_id:"a",seq:1,event_type:"message.posted",payload:{text:"RMB 320k"}},{id:"2",room_id:"private",seq:2,event_type:"message.posted",payload:{text:"secret margin"}},{id:"3",room_id:"a",seq:12,event_type:"message.posted",payload:{text:"future"}}];
 assert.deepEqual(sanitizedContext(rows,"a",12).map(e=>e.id),["1"]);
 const p=promptForRoomEvent("Quote changes",sanitizedContext(rows,"a",12));
 assert.ok(!p.includes("secret margin"));
 assert.ok(!p.includes("future"));
});
test("invalid invented evidence is rejected, never canonical",()=>{
 const text="报价改为 THB 50,000";
 const example={classification:"quote_change",summary:"THB 50,000 quote",actionable:true,quoteChanges:[{field:"price",proposed:"THB 50,000",evidenceQuote:"THB 50,000"},{field:"margin",proposed:"44%",evidenceQuote:"secret margin"}],confidence:0.8};
 const result=normalizeStagingResult(example,text,[]);
 assert.equal(result.quoteChanges.length,1);
 assert.equal(result.quoteChanges[0].field,"price");
 assert.ok(!JSON.stringify(result).includes("secret margin"));
 assert.ok(!JSON.stringify(result).includes("canonical"));
});
test("smalltalk, bad JSON and missing actionable data abstain",()=>{
 assert.equal(normalizeStagingResult('not json',"text"),null);
 assert.equal(normalizeStagingResult({classification:"conversation",summary:"hello",actionable:true},"hello"),null);
 assert.equal(normalizeStagingResult({classification:"question",summary:"no",actionable:false},"no"),null);
});
test("allowlist of business classes excludes other and conversation",()=>{
 assert.equal(normalizeKind("quote_change"),"quote_change");
 assert.equal(normalizeKind("conversation"),"general");
});

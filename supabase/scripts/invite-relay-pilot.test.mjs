// Exact pilot-branch relay tests, purely offline. Never sets cloud vars or sends email.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import {webcrypto,randomBytes} from "node:crypto";
import vm from "node:vm";

const require=createRequire(new URL("../../apps/web/package.json",import.meta.url));
const ts=require("typescript");
const shared=readFileSync(new URL("../functions/_shared/invite-relay.ts",import.meta.url),"utf8");
const server=readFileSync(new URL("../../apps/web/src/lib/invite-relay-server.ts",import.meta.url),"utf8");
function load(source,imports={}){
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={};
 vm.runInNewContext(code,{exports,crypto:webcrypto,TextEncoder,TextDecoder,URL,Request,Response,AbortSignal,
  require:name=>{assert(Object.hasOwn(imports,name),"Unexpected import "+name);return imports[name];},
  fetch:()=>{throw Error("Network is forbidden in offline relay tests");}
 },{timeout:2000});
 return exports;
}
const protocol=load(shared);
const handler=load(server,{"../../../../supabase/functions/_shared/invite-relay":protocol});
const secret=randomBytes(32).toString("hex"),token=randomBytes(32).toString("hex");
const expected="pilot/real-ai-acceptance-20261028";
const url="https://"+protocol.RELAY_PROJECT+".supabase.co";
const env={
  NEXT_PUBLIC_SUPABASE_URL:url,SR_INVITE_RELAY_PROJECT_REF:protocol.RELAY_PROJECT,
  SR_INVITE_RELAY_SECRET:secret,VERCEL:"1",VERCEL_ENV:"preview",
  VERCEL_GIT_COMMIT_REF:expected,VERCEL_URL:"pilot-exact-host.example.invalid",
};
const body=JSON.stringify({action:"preview",token});
function req(headers={},method="POST",payload=body){
 return new Request("https://irrelevant.example.invalid/api/project-invite",{
  method, ...(method==="GET"?{}:{body:payload}),
  headers:{Host:env.VERCEL_URL,Origin:"https://"+env.VERCEL_URL,
    "Content-Type":"application/json","Sec-Fetch-Site":"same-origin",...headers}
 });
}
test("pilot only permits its one exact branch in Preview",()=>{
 assert.equal(protocol.RELAY_BRANCH,expected);
 assert.doesNotThrow(()=>handler.relayConfig(env));
 for(const b of ["main","l1/stage2-continuation","codex/cloud-launch-20261023",expected+"/extra",""]){
  assert.throws(()=>handler.relayConfig({...env,VERCEL_GIT_COMMIT_REF:b}),b);
 }
 for(const patch of [{VERCEL_ENV:"production"},{VERCEL:""},{SR_INVITE_RELAY_PROJECT_REF:"invalid"},
   {NEXT_PUBLIC_SUPABASE_URL:"https://qnozpurjtgkmwtvsrjoi.supabase.co"}]){
  assert.throws(()=>handler.relayConfig({...env,...patch}));
 }
});
test("pilot keeps exact Host and Origin checks",async()=>{
 for(const headers of [{Host:"alias.invalid"},{Origin:"https://other.invalid"},
   {"Sec-Fetch-Site":"cross-site"},{Host:env.VERCEL_URL+":443"}]){
   let sends=0;
   const response=await handler.handleInviteRelay(req(headers),env,async()=>{sends++;throw Error("not allowed")});
   assert.equal(response.status,403);assert.equal(sends,0);
 }
});
test("pilot still signs only valid same-origin requests",async()=>{
 let sends=0;
 const result=await handler.handleInviteRelay(req(),env,async(target,options)=>{
  sends++;
  assert.equal(String(target),url+"/functions/v1/project-invite");
  const signed=new Request(target,options);
  assert(await protocol.verifyRelay(signed,body,protocol.RELAY_PROJECT,secret));
  assert.equal(await protocol.verifyRelay(signed,body+"x",protocol.RELAY_PROJECT,secret),null);
  return Response.json({ok:true});
 });
 assert.equal(result.status,200);assert.equal(sends,1);
});

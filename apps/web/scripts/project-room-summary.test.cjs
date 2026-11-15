const assert=require('node:assert/strict');
const fs=require('node:fs'), Module=require('node:module'), ts=require('typescript');
const room='11111111-1111-4111-8111-111111111111';
const rows=Array.from({length:80},(_,i)=>({id:'event-'+i,seq:i+1,event_type:'message.posted',payload:{text:'X'.repeat(1000)},actor_user_id:'u',actor_organization_id:'o',actor_display_name:'Alice',created_at:'2026-01-01T00:00:00Z'}));
const db={rooms:{id:room,name:'Room',kind:'main'},room_events:rows,room_members:[],room_file_versions:[],organizations:[]};
const client={auth:{getUser:async()=>({data:{user:{id:'u'}},error:null})},from(name){return {select(){return this},eq(){return this},is(){return this},order(){return this},limit(){return this},maybeSingle:async()=>({data:db[name],error:null}),then(ok){return Promise.resolve({data:db[name],error:null}).then(ok)}}}};
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
const old=Module._load;
Module._load=function(name,parent,main){
 if(name==='@supabase/supabase-js') return {createClient:()=>client};
 if(name==='@/lib/supabase-config') return {SUPABASE_URL:'http://localhost',SUPABASE_ANON_KEY:'fake'};
 return old.call(this,name,parent,main);
};
const {POST}=require('../src/app/api/project-room-b/assist/route.ts');
Module._load=old;
process.env.SOURCERATING_OPENCODE_GO_API_KEY='synthetic';
const request=()=>new Request('http://localhost',{method:'POST',headers:{authorization:'Bearer test','content-type':'application/json'},body:JSON.stringify({roomId:room,mode:'summary'})});
(async()=>{
 let calls=[];
 global.fetch=async(_url,opts)=>{
  calls.push(JSON.parse(opts.body));
  if(calls.length===1) return Response.json({choices:[{finish_reason:'length',message:{content:'{"summary":"cut'}}]});
  return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({summary:'ok',decided:[{text:'x',sources:[80,999]}]})}}]});
 };
 let r=await POST(request()), out=await r.json();
 assert.equal(r.status,200);assert.equal(calls.length,2);
 assert.ok(calls[0].messages[1].content.length<18000,'first prompt is bounded');
 assert.ok(calls[1].messages[1].content.length<calls[0].messages[1].content.length,'retry reduces context');
 assert.deepEqual(out.result.decided[0].sources,['event-79']);
 calls=[];global.fetch=async()=>{calls.push(1);return Response.json({choices:[{message:{content:'not json'}}]})};
 r=await POST(request());out=await r.json();
 assert.equal(r.status,502);assert.equal(out.error,'AI returned invalid JSON');assert.equal(calls.length,2);
 global.fetch=async()=>{throw Error('sensitive network detail')};
 r=await POST(request());out=await r.json();
 assert.equal(r.status,502);assert.equal(out.error,'AI provider connection failed');assert.ok(!JSON.stringify(out).includes('sensitive'));
 console.log('PASS bounded summary, truncated retry, source validation, and classified failures');
})().catch(e=>{console.error(e);process.exitCode=1});

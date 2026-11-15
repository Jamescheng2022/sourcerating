const assert=require('node:assert/strict');
const fs=require('node:fs'), Module=require('node:module'), ts=require('typescript');
let handler;
global.Deno={env:{get:k=>k==='SR_ALLOWED_ORIGINS'?'https://other.example':k==='SUPABASE_URL'?'http://localhost':k==='SUPABASE_ANON_KEY'?'anon':k==='SUPABASE_SERVICE_ROLE_KEY'?'test':undefined},serve:fn=>{handler=fn}};
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
const old=Module._load;
Module._load=function(name,parent,main){
 if(name.startsWith('npm:@supabase/supabase-js')) return {createClient:()=>({auth:{getUser:async()=>{throw Error('offline')}}})};
 return old.call(this,name,parent,main);
};
require('../../../supabase/functions/room-file-gateway/index.ts');
Module._load=old;
(async()=>{
 const lab='https://sourcerating-room-lab.vercel.app';
 for(const origin of [lab,'http://localhost:3000','http://127.0.0.1:3000']){
  const r=await handler(new Request('http://local',{method:'OPTIONS',headers:{origin,'access-control-request-method':'POST','access-control-request-headers':'authorization,apikey,x-client-info,content-type'}}));
  assert.equal(r.headers.get('access-control-allow-origin'),origin);
  assert.match(r.headers.get('access-control-allow-headers'),/authorization/);
  assert.match(r.headers.get('access-control-allow-headers'),/apikey/);
  assert.match(r.headers.get('access-control-allow-headers'),/x-client-info/);
  assert.match(r.headers.get('access-control-allow-headers'),/content-type/);
  assert.match(r.headers.get('access-control-allow-methods'),/POST/);
  assert.equal(r.headers.get('access-control-allow-credentials'),null);
 }
 let r=await handler(new Request('http://local',{method:'OPTIONS',headers:{origin:'https://evil.example'}}));
 assert.equal(r.headers.get('access-control-allow-origin'),null);
 r=await handler(new Request('http://local',{method:'POST',headers:{origin:lab}}));
 assert.equal(r.status,401); assert.equal(r.headers.get('access-control-allow-origin'),lab);
 r=await handler(new Request('http://local',{method:'POST',headers:{origin:lab,authorization:'Bearer synthetic','content-type':'application/json'},body:'{}'}));
 assert.equal(r.status,500); assert.equal(r.headers.get('access-control-allow-origin'),lab);
 console.log('PASS gateway preflight, explicit origins, denied origin, and error CORS');
})().catch(e=>{console.error(e);process.exitCode=1});

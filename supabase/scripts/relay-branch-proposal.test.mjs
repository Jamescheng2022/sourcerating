// Offline proposal only: evaluate current source and its one-line draft in
// separate memory contexts. No process.env edits, Vercel call or network fetch.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {randomBytes,webcrypto} from 'node:crypto';
import vm from 'node:vm';
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url));
const ts=require('typescript');
const sharedPath=new URL('../functions/_shared/invite-relay.ts',import.meta.url);
const serverPath=new URL('../../apps/web/src/lib/invite-relay-server.ts',import.meta.url);
const patchPath=new URL('../../docs/proposals/invite-relay-cloud-branch.patch',import.meta.url);
const original=readFileSync(sharedPath,'utf8'),server=readFileSync(serverPath,'utf8'),patch=readFileSync(patchPath,'utf8');
const oldBranch='l1/stage2-continuation',newBranch='codex/cloud-launch-20261023';
const oldLine=`export const RELAY_BRANCH = "${oldBranch}";`,newLine=`export const RELAY_BRANCH = "${newBranch}";`;
assert.equal(original.split(oldLine).length,2,'Production source must retain the existing branch');
assert.deepEqual(patch.split('\n').filter(l=>/^[-+][^-+]/.test(l)),['-'+oldLine,'+'+newLine]);
const candidateSource=original.replace(oldLine,newLine);
function load(source,imports={}) {
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={};
 vm.runInNewContext(code,{exports,require:name=>{assert(Object.hasOwn(imports,name),'Unexpected module import');return imports[name];},
  crypto:webcrypto,TextEncoder,TextDecoder,URL,Request,Response,AbortSignal,
  fetch:()=>{throw Error('No external fetch is authorized in this isolated proposal');}}, {timeout:1000});
 return exports;
}
const currentProtocol=load(original),candidateProtocol=load(candidateSource);
const current=load(server,{'../../../../supabase/functions/_shared/invite-relay':currentProtocol});
const candidate=load(server,{'../../../../supabase/functions/_shared/invite-relay':candidateProtocol});
const secret=randomBytes(32).toString('hex'),token=randomBytes(32).toString('hex');
// Synthetic call arguments, never written to platform/runtime environment.
const fixture={NEXT_PUBLIC_SUPABASE_URL:`https://${currentProtocol.RELAY_PROJECT}.supabase.co`,
 SR_INVITE_RELAY_PROJECT_REF:currentProtocol.RELAY_PROJECT,SR_INVITE_RELAY_SECRET:secret,
 VERCEL:'1',VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:newBranch,VERCEL_URL:'isolated-preview.example.invalid'};
const body=JSON.stringify({action:'preview',token});
function request(headers={},method='POST',payload=body) {
 return new Request('https://internal-next.example.invalid/api/project-invite',{method,
  ...(method==='GET'?{}:{body:payload}),headers:{Host:fixture.VERCEL_URL,Origin:'https://'+fixture.VERCEL_URL,
   'Content-Type':'application/json','Sec-Fetch-Site':'same-origin',...headers}});
}
test('proposal changes exactly one branch binding; current deployed-source policy still rejects cloud branch',async()=>{
 assert.equal(currentProtocol.RELAY_BRANCH,oldBranch);assert.equal(candidateProtocol.RELAY_BRANCH,newBranch);
 assert.throws(()=>current.relayConfig(fixture));assert.doesNotThrow(()=>current.relayConfig({...fixture,VERCEL_GIT_COMMIT_REF:oldBranch}));
 assert.doesNotThrow(()=>candidate.relayConfig(fixture));assert.throws(()=>candidate.relayConfig({...fixture,VERCEL_GIT_COMMIT_REF:oldBranch}));
 let sends=0;const result=await current.handleInviteRelay(request(),fixture,async()=>{sends++;throw Error('Must not send');});
 assert.equal(result.status,503);assert.equal(sends,0);
});
test('candidate retains exact project, single branch, Preview-only and hosted/local separation',async()=>{
 for(const [key,value] of [
  ['VERCEL_GIT_COMMIT_REF','main'],['VERCEL_GIT_COMMIT_REF',newBranch+'/suffix'],['VERCEL_GIT_COMMIT_REF',''],
  ['VERCEL_ENV','production'],['VERCEL',''],['SR_INVITE_RELAY_PROJECT_REF','unrelated'],
  ['NEXT_PUBLIC_SUPABASE_URL','https://unrelated.supabase.co'],['NEXT_PUBLIC_SUPABASE_URL',fixture.NEXT_PUBLIC_SUPABASE_URL+'/path'],
  ['NEXT_PUBLIC_SUPABASE_URL',fixture.NEXT_PUBLIC_SUPABASE_URL+'?extra=1'],['NEXT_PUBLIC_SUPABASE_URL','http://127.0.0.1:54321'],
  ['SR_INVITE_RELAY_SECRET',''],
 ]) {
  let sends=0;const r=await candidate.handleInviteRelay(request(),{...fixture,[key]:value},async()=>{sends++;throw Error('Must not send');});
  assert.equal(r.status,503,key);assert.equal(sends,0,key);
 }
});
test('candidate keeps actual Host equal to VERCEL_URL and same Origin; forwarded headers do not authorize aliases',async()=>{
 for(const headers of [
  {Host:'alias.example.invalid','X-Forwarded-Host':fixture.VERCEL_URL},
  {Host:fixture.VERCEL_URL+':443'},{Origin:'https://other.example.invalid'},{Origin:''},
  {'Sec-Fetch-Site':'cross-site'},{'Content-Type':'text/plain'},
 ]) {
  let sends=0;const r=await candidate.handleInviteRelay(request(headers),fixture,async()=>{sends++;throw Error('Must not send');});
  assert.equal(r.status,403);assert.equal(sends,0);
 }
 assert.equal((await candidate.handleInviteRelay(request({},'GET'),fixture,async()=>{throw Error('Must not send');})).status,403);
});
test('candidate signs unchanged fixed project/path; original Edge verifier accepts only the untampered envelope',async()=>{
 let sends=0;
 const r=await candidate.handleInviteRelay(request({'X-SR-Signature':'forged',Cookie:'untrusted=1'}),fixture,async(target,init)=>{
  sends++;assert.equal(String(target),fixture.NEXT_PUBLIC_SUPABASE_URL+'/functions/v1/project-invite');
  assert.equal(init.redirect,'error');assert.equal(init.cache,'no-store');
  const upstream=new Request(target,init);
  assert.equal(upstream.headers.get('cookie'),null);assert.equal(upstream.headers.get('authorization'),null);
  const verified=await currentProtocol.verifyRelay(upstream,body,currentProtocol.RELAY_PROJECT,secret);assert(verified);
  assert.equal(await currentProtocol.verifyRelay(upstream,body+' ',currentProtocol.RELAY_PROJECT,secret),null);
  assert.equal(await currentProtocol.verifyRelay(upstream,body,'other-project',secret),null);
  assert.equal(await currentProtocol.verifyRelay(upstream,body,currentProtocol.RELAY_PROJECT,randomBytes(32).toString('hex')),null);
  return Response.json({ok:true},{headers:{'Set-Cookie':'not-forwarded=1'}});
 });
 assert.equal(r.status,200);assert.equal(sends,1);assert.deepEqual(await r.json(),{ok:true});
 const cookie=r.headers.get('set-cookie');assert.match(cookie,/HttpOnly; SameSite=Strict/);assert.match(cookie,/; Secure$/);
 assert(!cookie.includes(secret));assert(!cookie.includes('not-forwarded'));
});
test('oversize/invalid invite actions stay rejected and global signup remains disabled',async()=>{
 for(const [payload,status] of [['x'.repeat(8193),413],[JSON.stringify({action:'unrestricted-signup',token}),400]]) {
  let sends=0;const r=await candidate.handleInviteRelay(request({},'POST',payload),fixture,async()=>{sends++;throw Error('Must not send');});
  assert.equal(r.status,status);assert.equal(sends,0);
 }
 const config=readFileSync(new URL('../config.toml',import.meta.url),'utf8');
 const auth=config.split(/^\[auth\]\s*$/m)[1]?.split(/^\[/m)[0];assert(auth);assert.match(auth,/^enable_signup\s*=\s*false\s*$/m);
});

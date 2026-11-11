import {createRemoteJWKSet, jwtVerify} from "npm:jose@6.1.0";
import {createClient} from "npm:@supabase/supabase-js@2.119.0";

const ISSUER="https://token.actions.githubusercontent.com";
const AUDIENCE="sourcerating-atlas-refresh-v1";
const REPO="Jamescheng2022/sourcerating";
const REF="refs/heads/feature/engineering-network-v45-concrete-20261111";
const WORKFLOW=REPO+"/.github/workflows/en-atlas-standby-refresh.yml@"+REF;
const JWKS=createRemoteJWKSet(new URL(ISSUER+"/.well-known/jwks"));
const json=(v:unknown,s=200)=>new Response(JSON.stringify(v),{
 status:s,headers:{"content-type":"application/json","cache-control":"no-store","x-content-type-options":"nosniff"}
});
function adminKey(){
 const raw=Deno.env.get("SUPABASE_SECRET_KEYS");
 if(raw){try{const v=JSON.parse(raw).default;if(typeof v==="string"&&v.startsWith("sb_secret_"))return v;}catch{}}
 return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
}
type Candidate={candidate_id:string;source_name:string;source_url:string;record_title:string;source_status?:string;
 source_published_at?:string|null;item_sha256:string;candidate_data:Record<string,unknown>};
function valid(c:Candidate){
 if(!c||typeof c!=="object"||typeof c.candidate_id!=="string"||!/^uk:[a-z0-9-]{5,90}$/.test(c.candidate_id))return false;
 if(c.source_name!=="UK Contracts Finder"||typeof c.record_title!=="string"||c.record_title.length<3||c.record_title.length>700)return false;
 if(typeof c.item_sha256!=="string"||!/^[a-f0-9]{64}$/.test(c.item_sha256))return false;
 if(typeof c.source_url!=="string"||!/^https:\/\/www\.contractsfinder\.service\.gov\.uk\/Published\/Notice\/releases\/[A-Za-z0-9-]{5,100}\.json$/.test(c.source_url))return false;
 if(c.source_status&&String(c.source_status).length>120)return false;
 if(c.source_published_at&&!Number.isFinite(Date.parse(String(c.source_published_at))))return false;
 if(!c.candidate_data||typeof c.candidate_data!=="object"||Array.isArray(c.candidate_data))return false;
 const serialized=JSON.stringify(c.candidate_data);if(serialized.length>11000)return false;
 if(c.candidate_data["source"]!=="UK Contracts Finder"||typeof c.candidate_data["notice_id"]!=="string")return false;
 if(!Array.isArray(c.candidate_data["tags"]))return false;
 return true;
}
Deno.serve(async(req:Request)=>{
 if(req.method!=="POST")return json({error:"METHOD_NOT_ALLOWED"},405);
 const authorization=req.headers.get("authorization")||"";
 if(!authorization.startsWith("Bearer "))return json({error:"AUTH_REQUIRED"},401);
 const token=authorization.slice(7);
 if(token.length>14000)return json({error:"AUTH_INVALID"},401);
 let claims:Record<string,unknown>;
 try{
  const result=await jwtVerify(token,JWKS,{issuer:ISSUER,audience:AUDIENCE,
    algorithms:["RS256"],clockTolerance:"5s",maxTokenAge:"5m"});
  claims=result.payload as Record<string,unknown>;
  if(claims.repository!==REPO||claims.ref!==REF||claims.ref_type!=="branch"||
      claims.workflow_ref!==WORKFLOW||!["push","workflow_dispatch","schedule"].includes(String(claims.event_name))||
      !/^[0-9a-f]{40}$/.test(String(claims.sha||""))||!claims.run_id)throw Error("CLAIMS_SCOPE");
 }catch{return json({error:"GITHUB_OIDC_REJECTED"},401)}
 const raw=await req.text();
 if(raw.length>150000)return json({error:"PAYLOAD_TOO_LARGE"},413);
 let input:any;
 try{input=JSON.parse(raw)}catch{return json({error:"INVALID_JSON"},400)}
 const runId=String(claims.run_id)+":"+String(claims.run_attempt||"1");
 if(!Array.isArray(input?.candidates)||input.candidates.length>50||input.candidates.length<1)return json({error:"BATCH_SIZE"},400);
 if(!input.candidates.every(valid))return json({error:"INVALID_CANDIDATE"},400);
 const records=input.candidates as Candidate[];
 if(new Set(records.map(c=>c.candidate_id)).size!==records.length)return json({error:"DUPLICATE_IDS"},400);
 const serviceKey=adminKey(),url=Deno.env.get("SUPABASE_URL");
 if(!serviceKey||!url)return json({error:"SERVER_NOT_CONFIGURED"},503);
 const client=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 try{
  const rows=records.map(c=>({
   candidate_id:c.candidate_id,source_name:c.source_name,source_url:c.source_url,
   record_title:c.record_title,source_status:c.source_status||null,
   source_published_at:c.source_published_at||null,
   item_sha256:c.item_sha256,candidate_data:c.candidate_data,
   observed_at:new Date().toISOString(),review_state:"pending"
  }));
  // Batch upsert only this staging table; never touch published Atlas records or user tables.
  const {error}=await client.from("en_atlas_refresh_candidates").upsert(rows,{onConflict:"candidate_id"});
  if(error)return json({error:"STAGING_UNAVAILABLE"},503);
  // Log aggregate only; no personal identity, contact or model prompts retained.
  const {error:runError}=await client.from("en_atlas_refresh_runs").upsert({
   run_id:runId,origin:"github-actions",status:"succeeded",received_count:records.length,finished_at:new Date().toISOString()
  },{onConflict:"run_id"});
  if(runError)return json({error:"RUN_LOG_UNAVAILABLE"},503);
  return json({ok:true,staged:records.length,run_id:runId,disposition:"private_pending_review"});
 }catch{return json({error:"INGEST_UNAVAILABLE"},503)}
});
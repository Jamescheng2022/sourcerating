import "jsr:@supabase/functions-js@2.118.0/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { classifyBusinessIntent } from "../_shared/business-intent.mjs";
import {
  normalizeKind, normalizeStagingResult, promptForRoomEvent,
  reviewTargetOrg, sanitizedContext, stagingTitle,
} from "../_shared/agent-staging.mjs";

/**
 * Isolated SourceRating P1.5 room event worker, NOT a public business API.
 * Never runs inline with chat; never writes canonical_objects.
 * The database alone authorizes human review via review_staging_proposal RPC.
 */
function respond(data: unknown, status=200) {
  return new Response(JSON.stringify(data), {
    status, headers: { "Content-Type":"application/json", "Cache-Control":"no-store" },
  });
}
const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const limited=(value:unknown,max:number)=>
  typeof value==="string" ? value.trim().slice(0,max):"";
const safeError=(error:unknown)=> {
  const msg=error instanceof Error ? error.message:String(error);
  return /file_verification_pending/.test(msg) ? "file_verification_pending" :
    /23505/.test(msg) ? "duplicate_proposal" : "worker_failed";
};

/** Only the explicitly approved synthetic rooms may be claimed or sent to a model. */
function pilotRoomIds():string[] {
  const value=Deno.env.get("SOURCERATING_PILOT_ROOM_IDS") || "";
  const ids=value.split(",").map(v=>v.trim()).filter(Boolean);
  return ids.length>0 && ids.length<=50 && ids.every(id=>uuidPattern.test(id))
    ? [...new Set(ids)] : [];
}

async function deepSeekAnalysis(sourceText:string,context: Array<{id:string,seq:number,text:string}>) {
  const apiKey=Deno.env.get("SOURCERATING_DEEPSEEK_API_KEY");
  const selected=Deno.env.get("SOURCERATING_LLM_PROVIDER") || "auto";
  if (!apiKey || !["auto","deepseek-direct"].includes(selected)) return null;
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),12000);
  try {
    const endpoint="https://api.deepseek.com/chat/completions";
    const model=Deno.env.get("SOURCERATING_DEEPSEEK_MODEL") || "deepseek-flash";
    const response=await fetch(endpoint, {
      method:"POST", cache:"no-store", signal:controller.signal,
      headers:{Authorization:"Bearer "+apiKey,"Content-Type":"application/json"},
      body:JSON.stringify({
        model,response_format:{type:"json_object"},temperature:0.1,max_tokens:1500,
        messages:[
          {role:"system",content:"You extract business facts from cross-company chat. Output ONLY valid JSON drafts, never approve contractual terms."},
          {role:"user",content:promptForRoomEvent(sourceText,context)},
        ],
      }),
    });
    if(!response.ok)return null;
    const json=await response.json();
    const content=json?.choices?.[0]?.message?.content;
    if(typeof content!=="string")return null;
    return normalizeStagingResult(content,sourceText,context);
  } catch {
    return null;
  } finally { clearTimeout(timeout); }
}

Deno.serve(async(req)=>{
  if(req.method!=="POST")return respond({ok:false,error:"method_not_allowed"},405);

  const url=Deno.env.get("SUPABASE_URL") || "";
  const anonKey=Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const roomIds=pilotRoomIds();
  // No credentials in logs or response. Never process arbitrary customer rooms.
  if(!url||!anonKey||!serviceKey)return respond({ok:false,error:"backend_not_configured"},503);
  if(Deno.env.get("SOURCERATING_PILOT_TENANT_CONFIRMED")!=="YES_ISOLATED_SYNTHETIC_TENANT" ||
     roomIds.length===0)return respond({ok:false,error:"isolated_pilot_not_approved"},503);
  let host="";
  try { host=new URL(url).hostname; } catch { return respond({ok:false,error:"invalid_backend_url"},503); }
  const isolated=host==="fzrberkeoizarduwuisp.supabase.co" ||
    ["kong","127.0.0.1","localhost"].includes(host);
  if(!isolated)return respond({ok:false,error:"unsafe_pilot_backend"},503);

  const secret=req.headers.get("x-source-rating-agent-secret") || "";
  if(!secret)return respond({ok:false,error:"missing_agent_secret"},401);
  const anon=createClient(url,anonKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const verified=await anon.rpc("validate_source_rating_agent_secret",{p_secret:secret});
  if(verified.error || verified.data!==true)
    return respond({ok:false,error:"invalid_agent_secret"},401);

  const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  // Database claim itself is restricted to these room IDs. Merely filtering after
  // an unscoped claim would corrupt other organizations' outbox processing.
  const claimed=await admin.rpc("agent_claim_scoped_outbox",{
    p_allowed_room_ids:roomIds,p_limit:5,
  });
  if(claimed.error)return respond({ok:false,error:"scoped_claim_failed"},503);
  const items=Array.isArray(claimed.data)?claimed.data:[];
  const results:Array<Record<string,unknown>>=[];

  for (const job of items) {
    let success=false, errorCode:string|null=null, retrySeconds=60;
    try {
      if(!roomIds.includes(job.room_id))throw Error("unscoped_job");
      const eventResponse=await admin.from("room_events")
        .select("id,room_id,event_type,payload,actor_user_id,actor_organization_id,seq,created_at")
        .eq("id",job.room_event_id).eq("room_id",job.room_id).maybeSingle();
      if(eventResponse.error||!eventResponse.data)throw Error("event_missing");
      const event=eventResponse.data;
      if(!["message.posted","file.attached"].includes(event.event_type)){
        success=true;
        results.push({outboxId:job.id,result:"skipped_event_type"});
      } else {
        const roomResponse=await admin.from("rooms")
          .select("id,kind,owner_organization_id,counterpart_organization_id")
          .eq("id",event.room_id).maybeSingle();
        if(roomResponse.error||!roomResponse.data)throw Error("room_missing");
        const room=roomResponse.data;
        const targetOrg=reviewTargetOrg(room,event);
        if(!targetOrg)throw Error("unbound_actor_organization");

        // Check BEFORE calling an LLM and before inserting. Do not reopen an
        // accepted/dismissed proposal after a retry or provider switch.
        const existing=await admin.from("staging_proposals").select("id,status")
          .eq("source_event_id",event.id).limit(1).maybeSingle();
        if(existing.error)throw Error("proposal_lookup_failed");
        let proposalId=existing.data?.id || null;
        let proposalStatus=existing.data?.status || null;
        let kind="general",confidence=0.3,provider="rules";
        let payload:Record<string,unknown>={};
        let priority="normal";
        if (!proposalId) {
          if(event.event_type==="message.posted") {
            const source=limited(event.payload?.text,12000);
            const intent=classifyBusinessIntent(source);
            if(!source||intent.intent==="conversation") {
              success=true;
              results.push({outboxId:job.id,result:"ordinary_chat_no_proposal"});
              // Continue only after the outbox is completed in the common footer.
            } else {
              const previousResponse=await admin.from("room_events")
                .select("id,room_id,seq,event_type,payload")
                .eq("room_id",event.room_id).eq("event_type","message.posted")
                .lt("seq",event.seq).order("seq",{ascending:false}).limit(8);
              if(previousResponse.error)throw Error("room_context_failed");
              const context=sanitizedContext(previousResponse.data||[],event.room_id,event.seq);
              const generated=await deepSeekAnalysis(source,context);
              kind=normalizeKind(generated?.classification||intent.intent);
              confidence=generated?.confidence||0.35;
              provider=generated?"deepseek-direct":"rules";
              priority=kind==="risk"?"high":"normal";
              payload=generated ? {
                ...generated,sourceSeq:event.seq,sourceContextEventIds:context.map(c=>c.id),
                analysisSource:"deepseek-draft",model:Deno.env.get("SOURCERATING_DEEPSEEK_MODEL")||"deepseek-flash",
                humanReviewRequired:true,
              } : {
                classification:kind,summary:source.slice(0,300),evidenceQuote:source.slice(0,500),
                sourceSeq:event.seq,sourceContextEventIds:context.map(c=>c.id),
                analysisSource:"rules-only",confidence:0.35,humanReviewRequired:true,
              };
            }
          } else {
            const fileId=limited(event.payload?.file_version_id,80);
            if(!uuidPattern.test(fileId))throw Error("file_version_missing");
            const fileResponse=await admin.from("room_file_versions")
              .select("id,room_id,verification_status,logical_name,version_no,mime_type,size_bytes,server_sha256")
              .eq("id",fileId).eq("room_id",event.room_id).maybeSingle();
            if(fileResponse.error||!fileResponse.data)throw Error("file_outside_room_or_missing");
            const file=fileResponse.data;
            if(file.verification_status==="pending"){
              retrySeconds=15;throw Error("file_verification_pending");
            }
            kind=file.verification_status==="verified"?"file_update":"risk";
            confidence=1;priority=kind==="risk"?"high":"normal";
            payload={
              classification:kind,summary:limited(file.logical_name,220),
              fileVersionId:file.id,fileVersionNo:file.version_no,
              verificationStatus:file.verification_status,
              sha256:typeof file.server_sha256==="string" ? file.server_sha256:null,
              sourceSeq:event.seq,analysisSource:"verified-metadata",
              humanReviewRequired:true,
            };
          }
          if(Object.keys(payload).length>0) {
            const inserted=await admin.from("staging_proposals").upsert({
              room_id:event.room_id,source_event_id:event.id,proposal_type:kind,
              payload,confidence,provider,status:"pending",
            },{onConflict:"source_event_id",ignoreDuplicates:true}).select("id,status").maybeSingle();
            if(inserted.error)throw Error("proposal_insert_failed");
            proposalId=inserted.data?.id || null;
            proposalStatus=inserted.data?.status || null;
            if(!proposalId) {
              const raced=await admin.from("staging_proposals").select("id,status")
                .eq("source_event_id",event.id).limit(1).maybeSingle();
              if(raced.error||!raced.data)throw Error("proposal_conflict_unresolved");
              proposalId=raced.data.id;proposalStatus=raced.data.status;
            }
          }
        }
        if(proposalId && proposalStatus==="pending"){
          const needs=await admin.from("needs_you").select("id")
            .eq("proposal_id",proposalId).limit(1).maybeSingle();
          if(needs.error)throw Error("needs_you_lookup_failed");
          if(!needs.data){
            const data=await admin.from("needs_you").insert({
              room_id:event.room_id,source_event_id:event.id,proposal_id:proposalId,
              title:stagingTitle(kind==="general" ? "general":kind),
              detail:limited(payload.summary||event.payload?.text,300)||"Please review project update",
              priority,target_organization_id:targetOrg,
            });
            if(data.error && data.error.code!=="23505")throw Error("needs_you_insert_failed");
          }
        }
        if(proposalId || success){
          success=true;
          results.push({outboxId:job.id,result:proposalId ? "staged_for_human_review":"skipped",
            provider:proposalId?provider:null});
        }
      }
    } catch(e) {
      errorCode=safeError(e);success=false;
      results.push({outboxId:job.id,result:errorCode});
    }
    const done=await admin.rpc("agent_complete_outbox",{
      p_id:job.id,p_success:success,p_error:errorCode,p_retry_seconds:retrySeconds,
    });
    if(done.error)results.push({outboxId:job.id,result:"outbox_finalize_failed"});
  }
  return respond({ok:true,claimed:items.length,results});
});
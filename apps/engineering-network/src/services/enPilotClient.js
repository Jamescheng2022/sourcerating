import { createClient } from '@supabase/supabase-js';
// Public-only pilot credentials. No service_role/secret key in frontend.
export const enPilotClient = createClient('https://qnozpurjtgkmwtvsrjoi.supabase.co', "sb_publishable_ksRD_ocrn4jnK6F2h6buFg_GzT9roS6", {
  auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:true }
});
const TABLE='en_pilot_article_drafts';
export async function getPilotUser(){
  const {data,error}=await enPilotClient.auth.getUser();
  if(error||!data?.user) throw new Error('Please sign in with a verified email account before saving.');
  return data.user;
}
export async function savePilotDraft(input,existingId=null){
  const user=await getPilotUser();
  const safe={
    author_id:user.id,
    title:String(input.title||'').slice(0,180),
    summary:String(input.summary||'').slice(0,2000),
    body_markdown:String(input.body_markdown||'').slice(0,25000),
    layout_id:input.layout_id||'journal',
    article_type:input.article_type||'technical',
    project_source_id:input.project_source_id?String(input.project_source_id).slice(0,200):null,
    project_source_url:input.project_source_url?String(input.project_source_url).slice(0,700):null,
    project_name:String(input.project_name||'').slice(0,200),
    company_name:String(input.company_name||'').slice(0,200),
    interview:input.interview||{},
    review_flags:input.review_flags||[],
    status:'draft',
    updated_at:new Date().toISOString()
  };
  const query=existingId
    ?enPilotClient.from(TABLE).update(safe).eq('id',existingId).eq('author_id',user.id)
    :enPilotClient.from(TABLE).insert(safe);
  const {data,error}=await query.select('id,title,status,updated_at').single();
  if(error) throw new Error(error.message);
  return data;
}
export async function getPilotDrafts(){
  await getPilotUser();
  const {data,error}=await enPilotClient.from(TABLE).select('id,title,status,updated_at,layout_id,article_type,project_name,company_name,project_source_id,body_markdown,summary,interview').order('updated_at',{ascending:false}).limit(10);
  if(error) throw new Error(error.message);
  return data||[];
}
export async function removePilotDraft(id){
  const user=await getPilotUser();
  const {error}=await enPilotClient.from(TABLE).delete().eq('id',id).eq('author_id',user.id);
  if(error) throw new Error(error.message);
}


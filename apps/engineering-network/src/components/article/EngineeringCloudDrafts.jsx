import React, {useEffect,useState} from 'react';
import { enPilotClient, getPilotUser, savePilotDraft, getPilotDrafts } from '../../services/enPilotClient';

/** Preview-only account area inside the original Engineering Publisher review step.
 * No public publishing. All persisted records are private owner-only drafts.
 */
export function EngineeringCloudDrafts({locale='en',articleInfo,onLoadDraft}){
  const zh=locale==='zh';
  const [user,setUser]=useState(null);
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [drafts,setDrafts]=useState([]);
  const [savedId,setSavedId]=useState(null);
  const [authOpen,setAuthOpen]=useState(false);
  const [aiConsent,setAiConsent]=useState(false);
  const [aiFindings,setAiFindings]=useState([]);
  const [aiSummary,setAiSummary]=useState('');
  const [aiProvider,setAiProvider]=useState(null);

  useEffect(()=>{
    let active=true;
    getPilotUser().then(u=>{if(active)setUser(u)}).catch(()=>{if(active)setUser(null)});
    const {data:{subscription}}=enPilotClient.auth.onAuthStateChange((_event,session)=>{
      if(!active)return;
      setUser(session?.user||null);
      setSavedId(null);setDrafts([]);
    });
    return()=>{active=false;subscription.unsubscribe()};
  },[]);
  const loadList=async()=>{
    try{const rows=await getPilotDrafts();setDrafts(rows);setMessage(zh?'已获取云端草稿。':'Private cloud drafts loaded.')}
    catch(e){setMessage((zh?'读取失败：':'Load failed: ')+e.message)}
  };
  const runAuth=async(mode)=>{
    if(!email.includes('@')||password.length<8){setMessage(zh?'请填写有效邮箱及至少 8 位密码。':'Enter a valid email and password (8+ characters).');return;}
    setBusy(true);setMessage('');
    try{
      if(mode==='register'){
        const {data,error}=await enPilotClient.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:window.location.origin+'/#/feed'}});
        if(error)throw error;
        if(data?.session){
          const actual=await getPilotUser();setUser(actual);
          setMessage(zh?'注册并登录成功，可以保存私人草稿。':'Registered and signed in; private draft saving is available.');
        }else setMessage(zh?'注册请求已提交。请检查邮箱验证信息，验证后返回这里登录。邮件跳转需要服务端允许当前预览域名。':'Sign-up submitted. Verify your email, then return to sign in. Email redirects require the preview URL to be allowed by Supabase.');
      }else{
        const {error}=await enPilotClient.auth.signInWithPassword({email:email.trim(),password});
        if(error)throw error;
        const actual=await getPilotUser();setUser(actual);
        setMessage(zh?'已验证登录。':'Signed in successfully.');
      }
    }catch(e){setMessage((zh?'操作失败：':'Sign-in failed: ')+e.message)}
    finally{setPassword('');setBusy(false)}
  };
  const save=async()=>{
    setBusy(true);setMessage('');
    try{
      const base=articleInfo();
      const modelIssues=aiFindings.slice(0,4).map(issue=>({
        id:'model-review',severity:String(issue.severity||'warning').slice(0,25),
        claim:String(issue.claim||'').slice(0,180),concern:String(issue.concern||'').slice(0,250)
      }));
      const result=await savePilotDraft({...base,review_flags:[...(base.review_flags||[]),...modelIssues]},savedId);
      setSavedId(result.id);
      setMessage(zh?'已保存到云端私人草稿（未公开发布，不包含未上传的图片文件）。':'Saved as a PRIVATE cloud draft (not publicly published; locally selected photos are not uploaded).');
      await loadList();
    }catch(e){setMessage((zh?'保存失败：':'Save failed: ')+e.message)}
    finally{setBusy(false)}
  };
  const requestAiReview=async()=>{
    if(!aiConsent){setMessage(zh?'请先确认同意将文章文字发送给外部模型审核。':'Confirm consent before sending your draft text to the model provider.');return}
    setBusy(true);setMessage('');setAiFindings([]);setAiSummary('');setAiProvider(null);
    try{
      await getPilotUser();
      const base=articleInfo();
      const article=String(base.body_markdown||'').trim();
      if(article.length<30){setMessage(zh?'至少输入 30 个字符的真实内容。':'Provide at least 30 characters of author-supplied material.');return}
      const {data,error}=await enPilotClient.functions.invoke('en-pilot-article-audit',{body:{article:article.slice(0,10000)}});
      if(error){
        let reason=error.message;
        try{const d=await error.context.json();reason=d.message||d.error||reason}catch{}
        throw new Error(reason);
      }
      if(data?.kind!=='semantic-draft-review'||data?.source!=='deepseek-chat')throw new Error('Unexpected AI review result');
      setAiFindings(Array.isArray(data.issues)?data.issues:[]);
      setAiSummary(String(data.summary||''));
      setAiProvider(data.source);
      setMessage(zh?'外部模型完成初步文字审稿。必须由作者复核疑点，不能替代专业工程审查。':'AI completed a preliminary semantic review. Verify every finding; this is not professional engineering approval.');
    }catch(e){setMessage((zh?'AI 审稿不可用：':'AI review unavailable: ')+e.message)}
    finally{setBusy(false)}
  };
  const signOut=async()=>{
    setBusy(true);
    try{const {error}=await enPilotClient.auth.signOut();if(error)throw error;setUser(null);setSavedId(null);setDrafts([]);setMessage(zh?'已退出。':'Signed out.');}
    catch(e){setMessage((zh?'退出失败：':'Sign out failed: ')+e.message)}
    finally{setBusy(false)}
  };
  const chooseDraft=(row)=>{
    const obj=row.interview||{};
    setSavedId(row.id);
    onLoadDraft({...obj,title:row.title,body_markdown:row.body_markdown,summary:row.summary,layoutId:row.layout_id,templateId:row.article_type,project:row.project_name,company:row.company_name,sourceRecordId:row.project_source_id||''});
    setMessage(zh?'已加载云端草稿。图片需要重新选择。':'Cloud draft loaded; please reattach any images.');
  };
  return <section className="border border-hairline rounded-xl p-3 sm:p-4 space-y-3 bg-surface" aria-label="Private cloud article drafts">
    <header className="flex flex-wrap justify-between items-center gap-2">
      <div>
        <h4 className="font-bold text-sm">{zh?'私人云端草稿 · 真实账户':'Private cloud drafts · Verified account'}</h4>
        <p className="text-[11px] text-ink-muted">{zh?'本功能独立于旧版演示登录；只保存文字和结构化资料，暂不公开发布。':'Separate from legacy demo login. Saves text/structured data only. No public publishing.'}</p>
      </div>
      {user?<span className="text-[11px] break-all text-accent">{user.email}</span>:<button type="button" onClick={()=>setAuthOpen(o=>!o)} className="border border-accent text-accent rounded-lg px-3 py-2 text-xs">{zh?'登录以保存':'Sign in to save'}</button>}
    </header>
    {!user&&authOpen&&<div className="grid sm:grid-cols-2 gap-2">
      <input type="email" autoComplete="username" placeholder={zh?'邮箱地址':'Email address'} value={email} onChange={e=>setEmail(e.target.value)} className="px-3 py-2 border border-hairline rounded-lg text-sm bg-surface-subtle"/>
      <input type="password" autoComplete="current-password" placeholder={zh?'密码（至少8位）':'Password (8+ characters)'} value={password} onChange={e=>setPassword(e.target.value)} className="px-3 py-2 border border-hairline rounded-lg text-sm bg-surface-subtle"/>
      <div className="flex gap-2 sm:col-span-2">
        <button type="button" disabled={busy} onClick={()=>runAuth('login')} className="px-3 py-2 text-xs rounded-lg bg-accent text-white disabled:opacity-50">{zh?'登录':'Sign in'}</button>
        <button type="button" disabled={busy} onClick={()=>runAuth('register')} className="px-3 py-2 text-xs rounded-lg border border-hairline disabled:opacity-50">{zh?'注册并验证邮箱':'Register'}</button>
      </div>
    </div>}
    {user&&<div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={save} className="rounded-lg px-3 py-2 text-xs font-semibold bg-accent text-white disabled:opacity-50">{zh?'保存私人草稿':'Save private draft'}</button>
        <button type="button" disabled={busy} onClick={loadList} className="rounded-lg px-3 py-2 text-xs border border-hairline">{zh?'读取我的草稿':'My saved drafts'}</button>
        <button type="button" disabled={busy} onClick={signOut} className="rounded-lg px-3 py-2 text-xs border border-hairline">{zh?'退出':'Sign out'}</button>
      </div>
      {drafts.length>0&&<div className="space-y-1 border-t border-hairline pt-2">
        {drafts.map(d=><button type="button" key={d.id} onClick={()=>chooseDraft(d)} className="block w-full text-left border border-hairline hover:border-accent rounded-lg p-2 text-xs">
          <span className="font-semibold">{d.title||'Untitled draft'}</span><span className="text-ink-muted ml-2">{new Date(d.updated_at).toLocaleString()}</span>
        </button>)}
      </div>}
    </div>}
    {user&&<div className="border-t border-hairline pt-3 space-y-2">
      <h5 className="text-sm font-semibold">{zh?'可选：真正的大模型语义审稿':'Optional: external AI semantic draft review'}</h5>
      <p className="text-[11px] text-ink-muted">{zh?'需要服务器端启用 DeepSeek API；只上传文章文字，不传照片或密码。限额每用户24小时3次；模型费用由服务端承担。':'Requires a server-configured DeepSeek API key. Only manuscript text, never photos or passwords, is sent. Limit: three requests per verified user per 24h.'}</p>
      <label className="flex items-start gap-2 text-[11px] leading-relaxed">
        <input type="checkbox" checked={aiConsent} onChange={e=>setAiConsent(e.target.checked)} className="mt-0.5 shrink-0"/>
        {zh?'我同意将这份未公开文章的文字提交给外部模型，仅用于本次审稿。':'I consent to sending my unpublished manuscript text to the external AI provider for this review.'}
      </label>
      <button type="button" disabled={busy||!aiConsent} onClick={requestAiReview}
        className="rounded-lg px-3 py-2 text-xs border border-accent text-accent disabled:opacity-40">
        {zh?'提交 AI 逻辑审核':'Request AI semantic review'}
      </button>
      {aiProvider&&<div className="space-y-2 bg-surface-subtle border border-hairline rounded-lg p-3 text-xs" aria-label="AI semantic findings">
        <p className="font-semibold">{zh?'模型建议（并非独立事实核查）':'Model suggestions (not independent fact-checking)'} · {aiProvider}</p>
        <p>{aiSummary}</p>
        {aiFindings.map((finding,i)=><div className="border-l-2 border-amber-500 pl-2 space-y-1" key={i}>
          <p><b>{finding.severity}</b> — {finding.claim}</p><p>{finding.concern}</p><p>{finding.question}</p>
        </div>)}
      </div>}
    </div>}
    {message&&<p role="status" className="rounded-md bg-surface-subtle border border-hairline text-xs p-2 leading-relaxed">{message}</p>}
  </section>;
}


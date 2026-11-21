// Recovery must never use an unrelated project login left in this browser.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
module.exports = async function recoveryBoundary(d) {
  const { buyer, check, url, values, output, signedIn, createClient, login, passwords, remoteRequests, pageErrors } = d;
  let mainSession = await buyer.evaluate(() => localStorage.getItem('sr_p1_supabase_auth'));
  const openRecovery = async target => {
    try { await buyer.goto(target); } catch { throw Error('Unable to open local recovery callback (URL withheld)'); }
  };
  const sameProjectSession = async () => assert(await buyer.evaluate(expected => localStorage.getItem('sr_p1_supabase_auth') === expected, mainSession), 'project session must remain unchanged');
  const noRecoveryForm = async () => {
    await buyer.getByText(/reset link is missing or expired/).waitFor();
    assert.equal(await buyer.getByLabel('New password').count(),0);
    await sameProjectSession();
  };
  await check('An expired recovery link cannot offer to change the existing project account password', async () => {
    await buyer.goto(url+'/reset-password#error=access_denied&error_code=otp_expired&type=recovery');
    await buyer.waitForLoadState('networkidle');
    assert.equal(await buyer.getByLabel('New password').count(),0,'existing project login must not authorize a recovery form');
    await noRecoveryForm();
  });
  await check('A normal project login and a missing recovery link never expose a password-change form', async () => {
    await buyer.goto(url+'/reset-password'); await noRecoveryForm();
    await buyer.goto(url+'/project-room'); await buyer.getByRole('textbox',{name:'Room message',exact:true}).waitFor();
  });
  const email = 's2-recovery-boundary-'+Date.now()+'@s2-test.invalid';
  const oldPassword = crypto.randomBytes(24).toString('hex'), newPassword = crypto.randomBytes(24).toString('hex');
  const admin = createClient(values.API_URL,values.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  assert.ifError((await admin.auth.admin.createUser({email,password:oldPassword,email_confirm:true})).error);
  let resetLink;
  await check('Real local recovery email opens the named recovery account without replacing the project login', async () => {
    await buyer.setViewportSize({width:390,height:844});
    await buyer.goto(url+'/forgot-password'); await buyer.getByLabel('Account email').fill(email);
    await buyer.getByRole('button',{name:'Send reset link'}).click();
    await buyer.getByRole('status').filter({hasText:'If this account exists'}).waitFor();
    let message;
    for(let i=0;i<40;i++) {
      const inbox = await (await fetch('http://127.0.0.1:54324/api/v1/messages')).json();
      message = inbox.messages.find(m=>m.To.some(to=>to.Address===email));
      if(message) break; await new Promise(r=>setTimeout(r,250));
    }
    assert(message,'local recovery email captured');
    const detail = await (await fetch('http://127.0.0.1:54324/api/v1/message/'+message.ID)).json();
    const match=(detail.HTML||detail.Text).match(/https?:\/\/[^\s"<>]*\/auth\/v1\/verify[^\s"<>]*/); assert(match);
    resetLink=match[0].replaceAll('&amp;','&'); const target=new URL(resetLink);
    assert.equal(target.origin,values.API_URL); assert.equal(target.searchParams.get('type'),'recovery');
    assert.equal(target.searchParams.get('redirect_to'),url+'/reset-password');
    await openRecovery(resetLink); await buyer.getByLabel('New password').waitFor();
    await buyer.getByText(email,{exact:true}).waitFor(); await sameProjectSession();
    assert(await buyer.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
    await buyer.screenshot({path:path.join(output,'recovery-account-390.png')});
  });
  await check('A validated recovery survives reload in its tab without using the unrelated project session', async () => {
    await buyer.reload(); await buyer.getByLabel('New password').waitFor();
    await buyer.getByText(email,{exact:true}).waitFor(); await sameProjectSession();
  });
  await check('Switching the project account in another tab cannot retarget the open recovery form', async () => {
    const project=await buyer.context().newPage();
    await project.goto(url+'/project-room'); await project.getByRole('textbox',{name:'Room message',exact:true}).waitFor();
    project.once('dialog',dialog=>dialog.accept());
    await project.getByRole('button',{name:'Sign out · 退出',exact:true}).first().click();
    await project.getByLabel('Email',{exact:true}).waitFor();
    await login(project,'s2-supplier@s2-test.invalid',passwords.S2_SUPPLIER_PASSWORD);
    mainSession=await project.evaluate(()=>localStorage.getItem('sr_p1_supabase_auth'));
    await buyer.getByText(email,{exact:true}).waitFor(); await buyer.getByLabel('New password').waitFor();
    await sameProjectSession(); await project.close();
  });
  await check('Reusing an actual consumed link invalidates an older recovery session without falling back to the project account', async () => {
    await openRecovery(resetLink); await noRecoveryForm();
    await buyer.reload(); await noRecoveryForm();
  });
  // A fresh local Auth grant avoids retrying a real email request/rate limit.
  const fresh = await admin.auth.admin.generateLink({type:'recovery',email,options:{redirectTo:url+'/reset-password'}});
  assert.ifError(fresh.error); assert.equal(new URL(fresh.data.properties.action_link).origin,values.API_URL);
  await openRecovery(fresh.data.properties.action_link); await buyer.getByLabel('New password').waitFor();
  await buyer.getByText(email,{exact:true}).waitFor();
  await check('An isolated failed password update reports failure and leaves the actual old password valid', async () => {
    await buyer.route('**/auth/v1/user', route => route.request().method()==='PUT' ? route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({code:'unexpected_failure',msg:'Isolated update failure'})}) : route.fallback());
    await buyer.getByLabel('New password').fill(newPassword); await buyer.getByRole('button',{name:'Update password',exact:true}).click();
    await buyer.getByRole('status').filter({hasText:'Unable to update password'}).waitFor();
    await signedIn(email,oldPassword); await sameProjectSession();
    await buyer.unroute('**/auth/v1/user');
  });
  await check('Real password update remains successful when isolated logout fails; only the named recovery account changes', async () => {
    await buyer.route('**/auth/v1/logout?*',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({code:'unexpected_failure',msg:'Isolated logout failure'})}));
    await buyer.getByLabel('New password').fill(newPassword); await buyer.getByRole('button',{name:'Update password',exact:true}).click();
    await buyer.getByRole('status').filter({hasText:'Password updated.'}).waitFor();
    await buyer.getByText(/server sign-out could not be confirmed/).waitFor();
    assert.equal(await buyer.getByLabel('New password').count(),0); await sameProjectSession();
    const anon=createClient(values.API_URL,values.ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
    assert((await anon.auth.signInWithPassword({email,password:oldPassword})).error);
    await signedIn(email,newPassword);
    await signedIn('s2-buyer@s2-test.invalid',passwords.S2_BUYER_PASSWORD);
    await signedIn('s2-supplier@s2-test.invalid',passwords.S2_SUPPLIER_PASSWORD);
    await buyer.screenshot({path:path.join(output,'recovery-logout-warning-390.png')});
    await buyer.unroute('**/auth/v1/logout?*');
  });
  await check('Completed recovery clears its tab credentials while the unrelated project login still restores', async () => {
    await buyer.reload(); await noRecoveryForm();
    await buyer.goto(url+'/project-room'); await buyer.getByRole('textbox',{name:'Room message',exact:true}).waitFor();
  });
  await check('Recovery boundary acceptance has no external browser requests or uncaught page errors', async () => {
    assert.deepEqual(remoteRequests,[]); assert.deepEqual(pageErrors,[]);
  });
};

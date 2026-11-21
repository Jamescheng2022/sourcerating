// Existing B8 recovery assertions, separated so invitation outages do not hide Auth results.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
module.exports = async function recovery(d) {
  const { context, check, url, values, output, signedIn, anon, remoteRequests, pageErrors, email, oldPassword, stamp } = d;
  const resetCtx = await context(), reset = await resetCtx.newPage();
  let resetLink, uniformNotice;
  await check('L-4 seeded test account requests recovery through sign-in link at 390px', async () => {
    await reset.setViewportSize({width:390,height:844}); await reset.goto(url+'/project-room'); await reset.getByRole('link',{name:'Forgot password?'}).click();
    await reset.getByLabel('Account email').fill(email); await reset.getByRole('button',{name:'Send reset link'}).click();
    await reset.getByRole('status').waitFor(); uniformNotice=await reset.getByRole('status').innerText(); assert(uniformNotice.startsWith('If this account exists'));
    await reset.screenshot({path:path.join(output,'03-recovery-request-390.png')});
  });
  await check('L-4 local Mailpit captures Auth recovery with exact allowed redirect', async () => {
    let message;
    for(let i=0;i<40;i++) {
      const inbox = await (await fetch('http://127.0.0.1:54324/api/v1/messages')).json();
      message = inbox.messages.find(m=>m.To.some(to=>to.Address===email));
      if(message) break; await new Promise(r=>setTimeout(r,250));
    }
    assert(message,'recovery mail captured');
    const detail=await (await fetch('http://127.0.0.1:54324/api/v1/message/'+message.ID)).json();
    const html=detail.HTML || detail.Text; const match=html.match(/https?:\/\/[^\s"<>]*\/auth\/v1\/verify[^\s"<>]*/); assert(match);
    resetLink=match[0].replaceAll('&amp;','&'); const link=new URL(resetLink);
    assert.equal(link.origin,values.API_URL); assert.equal(link.searchParams.get('type'),'recovery'); assert.equal(link.searchParams.get('redirect_to'),url+'/reset-password');
  });
  const newPassword=crypto.randomBytes(24).toString('hex');
  await check('L-4 captured reset link changes password and signs out; old password denied', async () => {
    await reset.goto(resetLink); await reset.getByLabel('New password').waitFor(); await reset.getByLabel('New password').fill('short');
    assert.equal(await reset.getByLabel('New password').getAttribute('minlength'),'10');
    await reset.getByLabel('New password').fill(newPassword); await reset.getByRole('button',{name:'Update password'}).click();
    await reset.getByRole('status').filter({hasText:'Password updated'}).waitFor();
    assert.equal(await reset.getByLabel('New password').count(),0);
    assert((await anon.auth.signInWithPassword({email,password:oldPassword})).error); await signedIn(email,newPassword);
    await reset.screenshot({path:path.join(output,'04-recovery-completed-390.png')});
  });
  await check('L-4 absent account reset uses same neutral response', async () => {
    await reset.goto(url+'/forgot-password'); await reset.getByLabel('Account email').fill(stamp+'-absent@s2-test.invalid'); await reset.getByRole('button',{name:'Send reset link'}).click();
    await reset.getByRole('status').waitFor(); assert.equal(await reset.getByRole('status').innerText(),uniformNotice);
  });
  await check('L-4 missing/expired recovery has a fresh-link path without change form', async () => {
    await reset.goto(url+'/reset-password'); await reset.getByText(/reset link is missing or expired/).waitFor(); assert.equal(await reset.getByLabel('New password').count(),0);
    await reset.getByRole('link',{name:'Request a new reset link'}).click(); await reset.getByLabel('Account email').waitFor();
  });
  await check('L-4 server enforces 10-character minimum for password updates', async () => {
    const actor = await signedIn(email,newPassword); assert.equal((await actor.api.auth.updateUser({password:'short'})).error?.code,'weak_password');
  });
  await check('B8 browser acceptance stays local with no page errors', async () => {assert.deepEqual(remoteRequests,[]);assert.deepEqual(pageErrors,[]);});
  await resetCtx.close();
};

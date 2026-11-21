const {chromium,expect}=require('/qa/node_modules/@playwright/test');
const fs=require('fs');
const accounts=JSON.parse(fs.readFileSync('/lab/account-input.json','utf8'));
const channels=JSON.parse(fs.readFileSync('/lab/channels.json','utf8'));
const url=fs.readFileSync('/lab/public-url.txt','utf8').trim();
const checks=[],errors=[];
let browser;
async function check(name,action){await action();checks.push({name,passed:true});console.log('PASS',name)}
async function login(role){
 const context=await browser.newContext({viewport:{width:1440,height:1000},timezoneId:'Asia/Bangkok'});
 const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
 await page.goto(url+'/login/');
 await page.locator('input[name=username]').fill(accounts[role].email);
 await page.locator('input[name=password]').fill(accounts[role].password);
 await page.locator('button[type=submit]').click();
 await page.waitForLoadState('domcontentloaded');
 const welcome=page.getByRole('button',{name:'Continue',exact:true});
 if(await welcome.isVisible())await welcome.click();
 await expect(page.locator('#stream_filters')).toBeVisible({timeout:30000});
 const skip=page.getByText("Skip video — I'm familiar with Zulip",{exact:true});
 if(await skip.isVisible())await skip.click();
 const zone=page.getByText("No, don't ask again.",{exact:true});if(await zone.isVisible())await zone.click();
 await page.goto(url+'/#narrow/channel/'+channels['supplier-a'].id);
 return page;
}
(async()=>{
 browser=await chromium.launch({headless:true});
 const buyer=await login('buyer'),supplier=await login('supplier-a');
 await check('two real browser password logins',async()=>{await expect(buyer.locator('#stream_filters')).toBeVisible();await expect(supplier.locator('#stream_filters')).toBeVisible()});
 await check('supplier navigation hides internal and other supplier channels',async()=>{await expect(supplier.locator('#stream_filters').getByText('[S2-TEST] Buyer internal',{exact:true})).toHaveCount(0);await expect(supplier.locator('#stream_filters').getByText('[S2-TEST] Supplier B',{exact:true})).toHaveCount(0)});
 const message='[S2-TEST] Hello, browser group chat '+Date.now();
 await check('native compose sends and peer receives over real-time connection',async()=>{
  await buyer.keyboard.press('c');await expect(buyer.locator('#compose-textarea')).toBeVisible();
  await buyer.locator('#stream_message_recipient_topic').fill('Browser check');
  await buyer.locator('#compose-textarea').fill(message);await buyer.locator('#compose-send-button').click();
  await expect(buyer.getByText(message,{exact:true})).toBeVisible({timeout:20000});
  await supplier.goto(url+'/#narrow/channel/'+channels['supplier-a'].id+'/topic/Browser.20check');
  await expect(supplier.getByText(message,{exact:true})).toBeVisible({timeout:20000});
 });
 await check('chat survives full browser reload',async()=>{await buyer.reload();await expect(buyer.getByText(message,{exact:true})).toBeVisible({timeout:30000})});
 await buyer.screenshot({path:'/out/zulip-desktop.jpg',type:'jpeg',quality:75});
 await check('390px mobile web layout remains usable without horizontal overflow',async()=>{
  await buyer.setViewportSize({width:390,height:844});expect(await buyer.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
  await expect(buyer.getByText(message,{exact:true})).toBeVisible();
 });
 await buyer.screenshot({path:'/out/zulip-mobile.jpg',type:'jpeg',quality:80});
 await check('no unhandled browser exceptions',async()=>expect(errors).toEqual([]));
 fs.writeFileSync('/out/browser-acceptance.json',JSON.stringify({checks,errors},null,2));await browser.close();
})().catch(async error=>{fs.writeFileSync('/out/browser-acceptance.json',JSON.stringify({checks,errors,error:error.message},null,2));console.error(error.message);if(browser)await browser.close();process.exit(1)});

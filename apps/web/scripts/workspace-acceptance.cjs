const { chromium, expect } = require('@playwright/test');
const fs = require('fs');
const credentials = JSON.parse(fs.readFileSync(process.env.SR_TEST_CREDENTIALS, 'utf8'));
const results = [];
const errors = [];
const url = process.env.PILOT_URL;
if (!url || !process.env.SR_TEST_CREDENTIALS) throw Error('PILOT_URL and SR_TEST_CREDENTIALS are required; synthetic pilot only.');
const output = process.env.SR_QA_OUTPUT || '/tmp/sourcerating-workspace-qa';
fs.mkdirSync(output, {recursive:true});
async function check(name, fn) { await fn(); results.push({name, passed:true}); console.log('PASS', name); }
(async () => {
 const browser = await chromium.launch({headless:true});
 const context = await browser.newContext({viewport:{width:1440,height:1000}});
 const page = await context.newPage();
 page.on('pageerror', e => errors.push(e.message));
 await page.goto(url + '/project-room');
 await page.getByLabel('Email', {exact:true}).fill('s2-buyer@s2-test.invalid');
 await page.getByLabel('Password', {exact:true}).fill(credentials.buyer);
 await page.getByRole('button', {name:'Sign in', exact:true}).click();
 await expect(page.getByRole('heading', {name:'Live AI Project Room', exact:true})).toBeVisible({timeout:30000});
 await check('desktop three-column layout and live room default', async()=>{
  await expect(page.getByRole('navigation',{name:'工作空间和聊天室'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'AI 项目助理'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
 });
 await page.screenshot({path:output + '/workspace-desktop.jpg',type:'jpeg',quality:75});
 await check('collapsed room tiles remain usable', async()=>{
  await page.getByRole('button',{name:'折叠菜单',exact:true}).click();
  await expect(page.getByRole('button',{name:'展开菜单',exact:true})).toBeVisible();
  const internal=page.getByRole('button',{name:/Buyer Internal/});
  await internal.click(); await expect(page.getByRole('heading',{name:'Buyer Internal',exact:true})).toBeVisible();
  await page.getByRole('button',{name:/Live AI Project Room/}).click();
  await expect(page.getByRole('heading',{name:'Live AI Project Room',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'展开菜单',exact:true}).click();
 });
 await check('AI sidebar folds and restores', async()=>{
  await page.getByRole('button',{name:'关闭 AI 面板',exact:true}).click();
  await page.getByRole('button',{name:'展开 AI 总结',exact:true}).click();
  await expect(page.getByRole('heading',{name:'沟通里程碑'})).toBeVisible();
 });
 await check('DeepSeek configured status and authenticated real connection check',async()=>{
  await page.getByRole('button',{name:'设置与 AI 连接',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'工作空间设置'});
  await expect(dialog.getByText('服务端密钥已配置',{exact:true})).toBeVisible({timeout:30000});
  await expect(dialog.getByText('当前聊天室已启用',{exact:true})).toBeVisible();
  await dialog.getByRole('button',{name:'检查真实 AI 连接',exact:true}).click();
  await expect(dialog.getByRole('status')).toContainText('连接成功',{timeout:45000});
  await page.screenshot({path:output + '/workspace-settings.jpg',type:'jpeg',quality:75});
  await page.getByRole('button',{name:'关闭设置'}).click();
 });
 const message='[S2-TEST] UI group chat '+Date.now()+' please confirm delivery on 12 November.';
 await check('browser message send and persisted reload',async()=>{
  await page.getByRole('textbox',{name:'Room message'}).fill(message);
  await page.getByRole('button',{name:'发送 ↑',exact:true}).click();
  await expect(page.getByText(message,{exact:true})).toHaveCount(1,{timeout:20000});
  await expect(page.getByText(message,{exact:true})).toBeVisible();
  await page.reload();
  await expect(page.getByText(message,{exact:true})).toBeVisible({timeout:30000});
 });
 await check('search current room messages',async()=>{
  await page.getByRole('button',{name:'搜索消息',exact:true}).click();
  await page.getByRole('textbox',{name:'搜索当前聊天室消息'}).fill('UI group chat');
  await expect(page.getByText(message,{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'关闭消息搜索',exact:true}).click();
 });
 const supplierContext=await browser.newContext({viewport:{width:1280,height:900}});
 const supplier=await supplierContext.newPage();
 await check('second authenticated group member receives messages and cannot select internal room',async()=>{
  await supplier.goto(url+'/project-room');
  await supplier.getByLabel('Email',{exact:true}).fill('s2-supplier@s2-test.invalid');
  await supplier.getByLabel('Password',{exact:true}).fill(credentials.supplier);
  await supplier.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(supplier.getByText(message,{exact:true})).toBeVisible({timeout:30000});
  await expect(supplier.getByRole('button',{name:/Buyer Internal/})).toHaveCount(0);
  const reply='[S2-TEST] Supplier UI reply '+Date.now();
  await supplier.getByRole('textbox',{name:'Room message'}).fill(reply);
  await supplier.getByRole('button',{name:'发送 ↑',exact:true}).click();
  await expect(page.getByText(reply,{exact:true})).toBeVisible({timeout:30000});
 });
 for(const width of [390,768]) {
  await page.setViewportSize({width,height:844});
  await check('responsive drawers and no horizontal overflow at '+width,async()=>{
   expect(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
   await page.getByRole('button',{name:'打开聊天室菜单',exact:true}).click();
   const nav=page.getByRole('dialog',{name:'工作空间和聊天室'});
   await expect(nav).toBeVisible();
   await nav.getByRole('button',{name:/Live AI Project Room/}).click();
   await expect(nav).not.toBeVisible();
   await page.getByRole('button',{name:'AI 总结与里程碑',exact:true}).click();
   await expect(page.getByRole('dialog',{name:'AI 总结与里程碑'})).toBeVisible();
   await page.keyboard.press('Escape');
   await expect(page.getByRole('textbox',{name:'Room message'})).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  });
  if(width===390) await page.screenshot({path:output + '/workspace-mobile.jpg',type:'jpeg',quality:80});
 }
 await check('no unhandled browser exceptions',async()=>expect(errors).toEqual([]));
 fs.writeFileSync(output + '/workspace-acceptance.json',JSON.stringify({results,errors},null,2));
 await browser.close();
})().catch(error=>{ fs.writeFileSync(output + '/workspace-acceptance.json',JSON.stringify({results,errors,error:error.message},null,2)); console.error(error.message); process.exit(1); });
// Local component regression; jsdom lives under the ignored .localdb/ui tool directory.
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const { JSDOM } = require(path.resolve(__dirname, '../../../.localdb/ui/node_modules/jsdom'));
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {url:'http://localhost'});
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = require('react-dom/client');
require.extensions['.css'] = (mod) => { mod.exports = {default:{}}; };
require.extensions['.tsx'] = (mod, file) => {
  const output = ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText;
  mod._compile(output,file);
};
const originalLoad = Module._load;
Module._load = function(name, parent, main) {
  if (name === '../project-room-lab/message') return {OrgMark: () => null};
  if (name === '../project-room-lab/demo/adapter') return {formatSize: () => '1 B',timeOf: () => ''};
  return originalLoad.call(this,name,parent,main);
};
const { FileCard, RealPanel } = require('../src/app/project-room-b/real-ui.tsx');
Module._load = originalLoad;
const calls = [];
const actions = {
  requestReview: (id,note,key) => new Promise((resolve,reject) => calls.push({id,note,key,resolve,reject})),
};
const f = {id:'file-1',roomId:'room-1',name:'file.pdf',lineage:'file.pdf',version:1,size:1,sha256:'a'.repeat(64),uploaderUserId:'u',uploaderOrgId:'o',createdAt:'2026-01-01T00:00:00Z',verification:'verified'};
const real = {s:{files:[f],confirmations:[],orgId:'o'},room:{memberIds:['u'],roomMembers:[{userId:'u',orgId:'o',displayName:'Alice',role:'member'}]},user:()=>({name:'Alice',orgId:'o'}),org:()=>({short:'A'}),actions};
const root = createRoot(document.getElementById('root'));
const tick = async fn => { await React.act(async () => { fn(); }); };
const button = () => [...document.querySelectorAll('button')].find(x => x.textContent.includes('\u8bf7\u5404\u65b9\u5ba1\u6838'));
const click = detail => button().dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true,detail}));
(async () => {
  await tick(() => root.render(React.createElement(FileCard,{real,f,latest:true})));
  await tick(() => { click(1); click(2); });
  assert.equal(calls.length,1,'double click submits once');
  assert.equal(button().disabled,true,'button disabled during request');
  await tick(() => calls[0].resolve());
  assert.equal(button().disabled,false,'button re-enabled after success');
  await tick(() => click(2));
  assert.equal(calls.length,1,'second click is ignored even if first RPC resolved quickly');
  await tick(() => click(1));
  assert.equal(calls.length,2,'a later intentional click may request another review');
  assert.notEqual(calls[1].key,calls[0].key,'separate intents have separate keys');
  await tick(() => calls[1].reject(Error('response lost')));
  await tick(() => click(1));
  assert.equal(calls.length,3);
  assert.equal(calls[2].key,calls[1].key,'retry after uncertain failure reuses key');
  await tick(() => calls[2].resolve());
  // A member may act for a different organization in another room. The
  // global user lookup must never determine this room's confirmation chips.
  const multi={...real,
    room:{memberIds:['u','v'],roomMembers:[
      {userId:'u',orgId:'o',displayName:'Alice',role:'member'},
      {userId:'v',orgId:'buyer',displayName:'Bob',role:'member'}]},
    user:id=>({name:id==='u'?'Alice':'Bob',orgId:id==='u'?'other-supplier':'buyer'}),
    org:id=>({short:id}),
    s:{...real.s,confirmations:[
      {id:'c1',roomId:'room-1',fileVersionId:'file-1',orgId:'o',userId:'u',decision:'confirmed',at:'2026-01-01T00:00:00Z'},
      {id:'c2',roomId:'room-1',fileVersionId:'file-1',orgId:'buyer',userId:'v',decision:'confirmed',at:'2026-01-01T00:00:01Z'}]}};
  await tick(() => root.render(React.createElement(FileCard,{real:multi,f,latest:true})));
  const chips=[...document.querySelectorAll('[data-d="confirmed"]')];
  assert.equal(chips.length,2,'both room-specific organizations are confirmed');
  assert.ok(chips.some(c=>c.textContent.includes('buyer')),'buyer confirmation shown');
  assert.ok(chips.some(c=>c.textContent.startsWith('o')),'room supplier confirmation shown');
  assert.ok(!document.body.textContent.includes('other-supplier'),'other room organization is not shown');
  const people={...multi, meId:'u',
    org:id=>({short:id,name:id,color:'#000'}),
    room:{...multi.room,id:'room-1',myRole:'admin'},
    s:{...multi.s,panel:{tab:'people'},memberships:[{orgId:'o',role:'owner'}],colleagues:[],aiTurns:[],splits:[]}};
  await tick(() => root.render(React.createElement(RealPanel,{real:people})));
  const groups=[...document.querySelectorAll('h3')].map(h=>({name:h.textContent,content:h.parentElement.textContent}));
  assert.ok(groups.some(g=>g.name==='o' && g.content.includes('Alice')),'Alice remains under room supplier');
  assert.ok(groups.some(g=>g.name==='buyer' && g.content.includes('Bob')),'Bob remains under room buyer');
  assert.ok(!groups.some(g=>g.name==='other-supplier'),'foreign membership does not form a room group');
  await tick(() => root.unmount());
  console.log('PASS review button and room-specific confirmation organizations');
})().catch(e => { console.error(e); process.exitCode=1; });

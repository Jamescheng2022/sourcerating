// Exercises useReal against controlled out-of-order Supabase responses.
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const { JSDOM } = require(path.resolve(__dirname,'../../../.localdb/ui/node_modules/jsdom'));
const dom = new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost',pretendToBeVisual:true});
global.window = dom.window; global.document = dom.window.document;
global.localStorage = dom.window.localStorage; global.navigator = dom.window.navigator;
global.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = require('react-dom/client');
const uid='user-1', org='org-1', room='room-1';
const model = {
 organization_memberships:[{organization_id:org,user_id:uid,role:'owner',display_name:'Bob'}],
 organizations:[{id:org,name:'Supplier'}],
 rooms:[{id:room,name:'Old project',kind:'main',project_id:'p1',owner_organization_id:org,parent_room_id:null,purpose:null,last_seq:1,projects:{name:'Old project'}}],
 room_members:[{room_id:room,user_id:uid,acting_organization_id:org,room_role:'admin',member_display_name:'Bob',last_read_seq:0}],
 room_events:[],
 room_file_versions:[{room_id:room,id:'file-1',logical_name:'ep600.pdf',mime_type:'application/pdf',size_bytes:12,version_no:2,supersedes_version_id:null,sha256:'a'.repeat(64),uploader_organization_id:org,uploader_user_id:uid,created_at:'2026-01-01T00:00:00Z',verification_status:'verified'}],
 room_confirmations:[], staging_proposals:[]
};
let deferTable=null, deferred=null, eventCallback;
const query = table => {
  let filters=[];
  const chain = {
    select(){return this},is(){return this},order(){return this},limit(){return this},
    eq(key,value){filters.push([key,value]); return this},gt(){return this},lt(){return this},
    then(resolve,reject){
      const rows = structuredClone(model[table] || []).filter(r => filters.every(([k,v])=>r[k]===v));
      if (deferTable===table) { deferTable=null; return new Promise(r=>{deferred=()=>r({data:rows,error:null})}).then(resolve,reject); }
      return Promise.resolve({data:rows,error:null}).then(resolve,reject);
    }
  };
  return chain;
};
const confirmation = {id:'confirm-1',room_id:room,file_version_id:'file-1',file_sha256:'a'.repeat(64),organization_id:org,user_id:uid,decision:'confirmed',comment:null,created_at:'2026-11-15T04:00:00Z'};
const supabase = {
 auth:{getSession:async()=>({data:{session:{user:{id:uid,email:'bob@example.test'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},
 from:query,
 rpc:async name => {
   if(name==='sr_record_confirmation'){model.room_confirmations=[confirmation];return {data:confirmation,error:null};}
   return {data:{},error:null};
 },
 channel:()=>({on(_event,_filter,cb){eventCallback=cb;return this},subscribe(){return this}}),
 removeChannel:async()=>{}
};
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
const old=Module._load;
Module._load=function(name,parent,main){
 if(name==='@/lib/supabase') return {supabase};
 if(name==='@/lib/room-files') return {uploadRoomAttachment:async()=>{}};
 return old.call(this,name,parent,main);
};
const {useReal}=require('../src/app/project-room-b/use-real.ts');
Module._load=old;
let current;
function Harness(){current=useReal();return null}
const root=createRoot(document.getElementById('root'));
const flush=async fn=>React.act(async()=>{if(fn) fn(); await new Promise(r=>setTimeout(r,10));});
(async()=>{
 await flush(()=>root.render(React.createElement(Harness)));
 for(let i=0;i<20 && (!current.s.files.length || !eventCallback);i++) await flush();
 assert.equal(current.s.files.length,1,'initial room loaded');
 deferTable='room_confirmations';
 await flush(()=>eventCallback({new:{id:'event-old',room_id:room,seq:2,client_msg_id:null,actor_user_id:uid,actor_organization_id:org,actor_display_name:'Bob',event_type:'confirmation.recorded',payload:{},created_at:'2026-01-01T00:00:01Z'}}));
 assert.ok(deferred,'older confirmation fetch was held');
 await React.act(async()=>{await current.actions.confirmFile(current.s.files[0],'confirmed','')});
 assert.equal(current.s.confirmations.filter(c=>c.fileVersionId==='file-1' && c.decision==='confirmed').length,1,'own RPC result visible');
 await flush(()=>deferred());
 assert.equal(current.s.confirmations.filter(c=>c.fileVersionId==='file-1' && c.decision==='confirmed').length,1,'late stale response cannot erase confirmation');

 deferTable='rooms'; deferred=null;
 await flush(()=>window.dispatchEvent(new dom.window.Event('online')));
 assert.ok(deferred,'older room-list fetch was held');
 model.rooms.push({id:'room-2',name:'New project',kind:'main',project_id:'p2',owner_organization_id:org,parent_room_id:null,purpose:null,last_seq:0,projects:{name:'New project'}});
 model.room_members.push({room_id:'room-2',user_id:uid,acting_organization_id:org,room_role:'member',member_display_name:'Bob',last_read_seq:0});
 const oldResolve=deferred;
 await flush(()=>window.dispatchEvent(new dom.window.Event('online')));
 assert.ok(current.myRooms.some(r=>r.id==='room-2'),'recovery discovers new membership');
 await flush(()=>oldResolve());
 assert.ok(current.myRooms.some(r=>r.id==='room-2'),'late stale room list cannot remove new membership');
 // With no realtime frame or reconnect, the periodic fallback also refreshes
 // the implicitly selected room and discovers newly visible memberships.
 model.room_confirmations.push({...confirmation,id:'confirm-2',organization_id:'org-2',user_id:'user-2'});
 model.rooms.push({id:'room-3',name:'Polling project',kind:'main',project_id:'p3',owner_organization_id:org,parent_room_id:null,purpose:null,last_seq:0,projects:{name:'Polling project'}});
 model.room_members.push({room_id:'room-3',user_id:uid,acting_organization_id:org,room_role:'member',member_display_name:'Bob',last_read_seq:0});
 await React.act(async()=>{await new Promise(resolve=>setTimeout(resolve,5300));});
 assert.ok(current.myRooms.some(r=>r.id==='room-3'),'poll discovers membership without realtime');
 assert.ok(current.s.confirmations.some(c=>c.id==='confirm-2'),'poll refreshes confirmations for fallback room');
 await flush(()=>root.unmount());
 console.log('PASS confirmation out-of-order response, membership recovery, and missed-event polling');
})().catch(e=>{console.error(e);process.exitCode=1; root.unmount()});

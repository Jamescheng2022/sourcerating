import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import http from 'node:http';
import { canonicalEntity, ORGANIZATIONS, PERSONS } from '../src/data/canonicalEntities.js';
import { PROJECT_DATA, COMPANIES_LIST, PEOPLE_LIST, POSTS_LIST, getCompanyById, getPersonById, resolveAuthorProfile } from '../src/data/projectData.js';
import { getLocalizedCompany, getLocalizedPerson } from '../src/i18n/entitiesEn.js';
import { getLocalizedPost } from '../src/i18n/postsEn.js';
import { queryNearby, searchMock } from '../src/services/mockApi.js';
import { createContactSandbox } from '../src/services/contactSandbox.js';
import { createMockServer } from './mock-api-server.js';

const body = {recipient_id:'ENG-02', message:'A sandbox contact request.', consent:true};
const denied = (status) => e => e.status === status;
test('canonical aliases, localizations, feed and dossier identities agree', () => {
  for (const company of COMPANIES_LIST) {
    assert.equal(getCompanyById(company.slug.toUpperCase()), company);
    assert.equal(getLocalizedCompany(company, 'en').name, company.name);
    assert.equal(getLocalizedCompany(company, 'en').fullName, company.fullName);
    assert.equal(PROJECT_DATA.entityDossiers[company.id]?.fullName, company.fullName);
  }
  for (const person of PEOPLE_LIST) {
    assert.equal(getPersonById(person.slug.toUpperCase()), person);
    assert.equal(getLocalizedPerson(person, 'en').orgName, ORGANIZATIONS[person.orgId].name);
    assert.equal(PROJECT_DATA.entityDossiers[person.id]?.name, person.name);
  }
  for (const post of POSTS_LIST) {
    assert.equal(post.authorName, canonicalEntity(post.authorId).name);
    assert.equal(getLocalizedPost(post, 'en').authorName, post.authorName);
    assert.equal(resolveAuthorProfile(post.authorId).authorName, post.authorName);
  }
  assert.equal(canonicalEntity('__proto__'), undefined);
  assert.equal(getCompanyById('ORG-Z'), undefined);
  assert.equal(resolveAuthorProfile('unknown').isGuest, true);
  function visit(v) {
    if (!v || typeof v !== 'object') return;
    const e = canonicalEntity(v.id);
    if (e) { assert.equal(v.name, e.name); if (ORGANIZATIONS[e.id]) assert.equal(v.fullName,e.fullName); if (PERSONS[e.id]) assert.equal(v.orgId,e.orgId); }
    Object.values(v).forEach(visit);
  }
  visit(PROJECT_DATA);
});
test('geo snapshot is jurisdiction-only and never derives precision from supplied GPS', () => {
  const response = queryNearby({city:'Bangkok', coordinates:{lat:13,lon:100}});
  assert.equal(response.isMock,true); assert.equal(response.data.length,5);
  assert.equal(new Set(response.data.map(r=>r.ocid)).size,5);
  for (const r of response.data) {
    assert.equal(r.coordinates,null); assert.equal(r.distance_km,null);
    assert.equal(r.record_type,'PROCUREMENT_NOTICE'); assert.equal(r.is_verified_site,false);
    assert.equal(r.provenance,'LOCAL_QA_SNAPSHOT');
  }
  for (const city of ['Rayong','Chonburi','ระยอง','ชลบุรี']) assert.deepEqual(queryNearby({city}).data,[]);
  assert.deepEqual(queryNearby({mode:'RADIUS',city:'Bangkok'}).data,[]);
  assert.deepEqual(queryNearby({country_iso:'CN',city:'Bangkok'}).data,[]);
});
test('search supports every entity class with explicit mock envelope and canonical authors', () => {
  const response = searchMock();
  assert.equal(response.isMock,true); assert.equal(response.live_service,false);
  assert.deepEqual(new Set(response.data.map(r=>r.type)),new Set(['post','project','company','person']));
  assert.equal(searchMock({q:'ORG-D',type:'company'}).data[0].name,ORGANIZATIONS['ORG-D'].name);
  assert.deepEqual(searchMock({q:'<script>alert(1)</script>'}).data,[]);
  assert.throws(()=>searchMock({q:'a'.repeat(201)}));
});
test('contact checks verified server session, field authority, consent and opt-in', () => {
  const api=createContactSandbox();
  assert.throws(()=>api.create(null,body,'request01'),denied(401));
  for (const token of ['sandbox-guest','sandbox-eng-03-unverified']) assert.throws(()=>api.create(token,body,'request01'),denied(403));
  for (const altered of [{...body,sender_id:'ENG-02'},{...body,role:'admin'},{...body,consent:false},{...body,message:'short'}]) assert.throws(()=>api.create('sandbox-eng-01',altered,'request01'),denied(400));
  for (const id of ['ENG-01','ENG-03','ORG-B','__proto__','demo-engineer-02']) assert.throws(()=>api.create('sandbox-eng-01',{...body,recipient_id:id},'request01'),denied(403));
});
test('contact stores only mock state, deduplicates, limits spam and enforces participant reads', () => {
  let now=100000000;
  const api=createContactSandbox({now:()=>now});
  const result=api.create('sandbox-eng-01',body,'request01');
  assert.equal(result.data.delivery,'DISABLED');
  assert.equal(result.data.status,'STORED_MOCK_ONLY');
  assert.equal(api.create('sandbox-eng-01',body,'request01').data.id,result.data.id);
  assert.throws(()=>api.create('sandbox-eng-01',{...body,message:'A changed sandbox message'},'request01'),denied(409));
  assert.throws(()=>api.create('sandbox-eng-01',body,'request02'),denied(429));
  assert.equal(api.read('sandbox-eng-02',result.data.id).data.id,result.data.id);
  const privateResult=api.create('sandbox-eng-01',{...body,recipient_id:'ORG-A'},'request03');
  assert.throws(()=>api.read('sandbox-eng-02',privateResult.data.id),denied(404));
  for (let i=0;i<1;i++) {now+=61000;api.create('sandbox-eng-01',body,'request04');}
  now+=61000;assert.throws(()=>api.create('sandbox-eng-01',body,'request05'),denied(429));
  result.data.message='mutated';assert.equal(api.read('sandbox-eng-01',result.data.id).data.message,body.message);
});
test('real local HTTP sandbox: CORS, host, body limits, auth, create and read', async () => {
  const server=createMockServer();server.listen(0,'127.0.0.1');await once(server,'listening');
  const base=`http://127.0.0.1:${server.address().port}/api/atlas/v1`;
  const headers={'Content-Type':'application/json',Origin:'http://localhost:3000',Authorization:'Bearer sandbox-eng-01','Idempotency-Key':'http-test01'};
  try {
    let response=await fetch(`${base}/health`);assert.equal((await response.json()).isMock,true);assert.equal(response.headers.get('x-atlas-data-mode'),'MOCK');
    response=await fetch(`${base}/search?q=ENG-01`);assert.ok((await response.json()).data.some(r=>r.type==='person'));
    response=await fetch(`${base}/nearby/query`,{method:'POST',headers,body:JSON.stringify({city:'Chonburi'})});assert.deepEqual((await response.json()).data,[]);
    response=await fetch(`${base}/contact_requests`,{method:'POST',headers,body:JSON.stringify(body)});assert.equal(response.status,201);const saved=(await response.json()).data;
    response=await fetch(`${base}/contact_requests/${saved.id}`,{headers});assert.equal(response.status,200);
    response=await fetch(`${base}/contact_requests`,{method:'POST',headers:{...headers,Authorization:''},body:JSON.stringify(body)});assert.equal(response.status,401);
    response=await fetch(`${base}/contact_requests`,{method:'POST',headers:{...headers,Origin:'https://evil.example'},body:JSON.stringify(body)});assert.equal(response.status,403);
    const hostStatus=await new Promise((resolve,reject)=>{const req=http.get(`${base}/health`,{headers:{Host:'evil.example'}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);});assert.equal(hostStatus,403);
    response=await fetch(`${base}/contact_requests`,{method:'POST',headers,body:'{' });assert.equal(response.status,400);
    response=await fetch(`${base}/contact_requests`,{method:'POST',headers,body:'x'.repeat(9000)});assert.equal(response.status,413);
    response=await fetch(`${base}/contact_requests`,{method:'POST',headers:{...headers,'Content-Type':'text/plain'},body:'hello'});assert.equal(response.status,415);
  } finally { server.closeAllConnections();await new Promise(resolve=>server.close(resolve)); }
});

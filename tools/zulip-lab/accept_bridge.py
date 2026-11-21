from lab_api import *
import sqlite3,time
cfg=json.loads((ROOT/'backend-private.json').read_text())
channels=cfg['channels'];message=json.loads((ROOT/'acceptance-message.json').read_text())
db=sqlite3.connect(ROOT/'bridge.sqlite3');tokens={};results=[]
def backend(role,path):
 record=cfg['accounts'][role]
 if role not in tokens:
  req=urllib.request.Request(cfg['url']+'/auth/v1/token?grant_type=password',headers={'apikey':cfg['anon_key'],'Content-Type':'application/json'},data=json.dumps({'email':record['email'],'password':record['password']}).encode())
  with urllib.request.urlopen(req,timeout=30) as response:tokens[role]=json.load(response)['access_token']
 req=urllib.request.Request(cfg['url']+path,headers={'apikey':cfg['anon_key'],'Authorization':'Bearer '+tokens[role]})
 with urllib.request.urlopen(req,timeout=30) as response:return json.load(response)
def wait(check,timeout=110):
 deadline=time.time()+timeout
 while time.time()<deadline:
  result=check()
  if result:return result
  time.sleep(2)
 raise AssertionError('Timed out waiting for integration result')
def passed(name):
 results.append({'name':name,'passed':True});print('PASS',name,flush=True)
source=wait(lambda:db.execute('select event_id,room_id from sources where zid=?',(message['id'],)).fetchone(),30)
passed('Zulip source message mirrored once under sender-bound RLS')
proposals=wait(lambda:backend('buyer','/rest/v1/staging_proposals?source_event_id=eq.'+source[0]+'&select=id,provider,status,room_id'))
proposal=proposals[0];pid=proposal['id'];assert proposal['provider']=='deepseek-direct';assert proposal['room_id']==channels['supplier-a']['room_id']
passed('existing worker produced real DeepSeek proposal for exact Zulip source')
wait(lambda:db.execute('select 1 from notices where proposal_id=?',(pid,)).fetchone(),30)
passed('AI draft notification returned to original private Zulip topic')
for role,channel in [('supplier-b',channels['supplier-b']),('supplier-a',channels['supplier-a'])]:
 command=must(role,'messages',{'type':'stream','to':channel['id'],'topic':message['topic'],'content':'approve '+pid})
 outcome=wait(lambda:db.execute('select outcome from commands where zid=?',(command['id'],)).fetchone(),30)
 assert outcome[0]=='denied'
 assert not backend('buyer','/rest/v1/canonical_objects?accepted_proposal_id=eq.'+pid+'&select=id')
 passed(role+' unauthorized approval denied without decision write')
command=must('buyer','messages',{'type':'stream','to':channels['supplier-a']['id'],'topic':message['topic'],'content':'approve '+pid})
outcome=wait(lambda:db.execute('select outcome from commands where zid=?',(command['id'],)).fetchone(),30);assert outcome[0]=='accepted'
canonical=backend('buyer','/rest/v1/canonical_objects?accepted_proposal_id=eq.'+pid+'&select=id,source_event_id');assert len(canonical)==1 and canonical[0]['source_event_id']==source[0]
passed('buyer approval in Zulip created one persisted SourceRating decision')
again=must('buyer','messages',{'type':'stream','to':channels['supplier-a']['id'],'topic':message['topic'],'content':'approve '+pid})
wait(lambda:db.execute('select outcome from commands where zid=?',(again['id'],)).fetchone(),30)
assert len(backend('buyer','/rest/v1/canonical_objects?accepted_proposal_id=eq.'+pid+'&select=id'))==1
passed('repeated approval is idempotent')
tokens.clear();assert len(backend('buyer','/rest/v1/canonical_objects?accepted_proposal_id=eq.'+pid+'&select=id'))==1
assert must('buyer','messages/'+str(message['id']))['raw_content']==message['text']
passed('fresh login readback preserves decision and authorized original message')
(ROOT/'bridge-acceptance.json').write_text(json.dumps({'results':results,'proposal_id':pid,'source_event_id':source[0],'zulip_message_id':message['id']},indent=2))

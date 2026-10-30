from lab_api import *
import time
channels=json.loads((ROOT/'channels.json').read_text())
results=[]
fixture_path=ROOT/'native-fixtures.json'
if fixture_path.exists():fixtures=json.loads(fixture_path.read_text())
else:
 fixtures={role:must('bot','messages',{'type':'stream','to':channel['id'],'topic':'Private fixture','content':'[S2-TEST] Private '+role+' evidence '+str(time.time())})['id'] for role,channel in channels.items()}
 fixture_path.write_text(json.dumps(fixtures))
def check(name,condition):
 assert condition,name
 results.append({'name':name,'passed':True});print('PASS',name,flush=True)
for role in ['buyer','supplier-a','supplier-b']:
 check(role+' real authenticated API login',must(role,'users/me')['user_id']==ACCOUNTS[role]['id'])
for role,other in [('supplier-a','supplier-b'),('supplier-b','supplier-a')]:
 streams=must(role,'users/me/subscriptions')['subscriptions']
 check(role+' channel isolation',[s['stream_id'] for s in streams]==[channels[role]['id']])
 status,body=request(role,'messages?'+urllib.parse.urlencode({'anchor':'newest','num_before':20,'num_after':0,'narrow':json.dumps([{'operator':'channel','operand':channels[other]['id']}])}))
 check(role+' cannot read other supplier channel',status in [400,403,404] or (status==200 and body.get('messages')==[]))
 status,body=request(role,'messages/'+str(fixtures[other]))
 check(role+' cannot fetch other supplier message by exact ID',status in [400,403,404])
 users=must(role,'users')['members']
 check(role+' cannot discover other supplier email',all(row.get('user_id')!=ACCOUNTS[other]['id'] for row in users))
topic='Quotation approval'
text='[S2-TEST] Please revise quotation from USD 30 to USD 31 per unit for 500 pieces, delivery in 35 days. Buyer approval required. '+str(int(time.time()))
message=must('supplier-a','messages',{'type':'stream','to':channels['supplier-a']['id'],'topic':topic,'content':text})
(ROOT/'acceptance-message.json').write_text(json.dumps({'id':message['id'],'text':text,'topic':topic}))
check('supplier message saved in native Zulip',isinstance(message['id'],int))
status,body=request('buyer','messages/summary?'+urllib.parse.urlencode({'narrow':json.dumps([{'operator':'channel','operand':channels['supplier-a']['id']},{'operator':'topic','operand':topic}])}))
check('native Zulip DeepSeek summary returns real content',status==200 and isinstance(body.get('summary'),str) and len(body['summary'])>20)
(ROOT/'native-summary.txt').write_text(body['summary'])
(ROOT/'native-acceptance.json').write_text(json.dumps(results,indent=2))

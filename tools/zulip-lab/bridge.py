"""Synthetic Zulip-to-SourceRating adapter. Existing worker and review RPC remain authoritative."""
import fcntl,json,os,re,sqlite3,time,urllib.request,urllib.error,urllib.parse,uuid
from lab_api import ROOT,URL,ACCOUNTS,must,request
config=json.loads((ROOT/'backend-private.json').read_text())
channels=config['channels'];actors=config['accounts']
by_stream={channel['id']:channel for channel in channels.values()}
by_sender={ACCOUNTS[role]['id']:role for role in actors}
lock=(ROOT/'bridge.lock').open('w')
fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
db=sqlite3.connect(ROOT/'bridge.sqlite3')
os.chmod(ROOT/'bridge.sqlite3',0o600)
db.executescript('''
create table if not exists sources(zid integer primary key,event_id text unique,room_id text,stream_id integer,topic text,body text);
create table if not exists notices(proposal_id text primary key);
create table if not exists commands(zid integer primary key,outcome text);
create table if not exists meta(key text primary key,value text);
''')
tokens={}
class ApiError(Exception):
 def __init__(self,status):self.status=status
def backend(role,path,data=None,method=None):
 record=actors[role]
 if role not in tokens or tokens[role][1]<time.time():
  req=urllib.request.Request(config['url']+'/auth/v1/token?grant_type=password',headers={'apikey':config['anon_key'],'Content-Type':'application/json'},data=json.dumps({'email':record['email'],'password':record['password']}).encode())
  with urllib.request.urlopen(req,timeout=20) as response:session=json.load(response)
  tokens[role]=(session['access_token'],time.time()+max(30,session['expires_in']-120))
 headers={'apikey':config['anon_key'],'Authorization':'Bearer '+tokens[role][0],'Content-Type':'application/json'}
 req=urllib.request.Request(config['url']+path,headers=headers,data=json.dumps(data).encode() if data is not None else None,method=method)
 try:
  with urllib.request.urlopen(req,timeout=25) as response:return json.load(response)
 except urllib.error.HTTPError as error:raise ApiError(error.code)
def send(stream_id,topic,text):
 return must('bot','messages',{'type':'stream','to':stream_id,'topic':topic or 'Project updates','content':text})
def link(stream_id,zid):
 return URL+'/#narrow/channel/'+str(stream_id)+'/near/'+str(zid)
def last_zid():
 row=db.execute("select value from meta where key='last_zid'").fetchone()
 return int(row[0]) if row else 0
def process(message):
 zid=message['id'];stream_id=message.get('stream_id');role=by_sender.get(message['sender_id'])
 if stream_id not in by_stream or not role:return
 channel=by_stream[stream_id];room=channel['room_id'];topic=message.get('subject','Project updates');text=message['content'].strip()
 if role not in channel['members']:return
 status,identity=request(role,'users/me')
 if status!=200:return
 subscriptions=must(role,'users/me/subscriptions')['subscriptions']
 if stream_id not in {item['stream_id'] for item in subscriptions}:return
 command=re.fullmatch(r'(approve|dismiss)\s+([0-9a-fA-F-]{36})',text,re.I)
 if command:
  if db.execute('select 1 from commands where zid=?',(zid,)).fetchone():return
  action,pid=command.groups();outcome='denied'
  try:
   visible=backend(role,'/rest/v1/staging_proposals?id=eq.'+pid+'&room_id=eq.'+room+'&select=id')
   if not visible:raise ApiError(403)
   result=backend(role,'/rest/v1/rpc/review_staging_proposal',{'p_proposal_id':pid,'p_action':'accept' if action.lower()=='approve' else 'dismiss','p_actor_organization_id':actors[role]['org_id'],'p_payload_override':None})
   outcome='already_processed' if result.get('idempotent') else 'accepted' if action.lower()=='approve' else 'dismissed'
   if outcome=='already_processed':
    send(stream_id,topic,'此提议已经处理，本次没有重复生成项目决议。Proposal: '+pid)
   else:send(stream_id,topic,'**'+('已采纳 · Confirmed' if outcome=='accepted' else '已忽略 · Dismissed')+'**\nProposal: '+pid+'\n审批人：'+message['sender_full_name']+'\n已保存至 SourceRating 项目记录。此为指定一方审批，不代表双方签认。')
  except ApiError as error:
   if error.status>=500:raise
   send(stream_id,topic,'此审批不属于你当前房间的可处理任务，或未分配给你的公司。No decision was written.')
  db.execute('insert into commands values (?,?)',(zid,outcome));db.commit();return
 if db.execute('select 1 from sources where zid=?',(zid,)).fetchone():return
 event=backend(role,'/rest/v1/rpc/append_room_event',{'p_room_id':room,'p_client_msg_id':str(uuid.uuid5(uuid.NAMESPACE_URL,URL+'/message/'+str(zid))),'p_actor_organization_id':actors[role]['org_id'],'p_event_type':'message.posted','p_payload':{'text':text}})
 assert event['room_id']==room
 db.execute('insert into sources values (?,?,?,?,?,?)',(zid,event['id'],room,stream_id,topic,text));db.commit()
def notify():
 room_ids=','.join(channel['room_id'] for channel in channels.values())
 proposals=backend('buyer','/rest/v1/staging_proposals?status=eq.pending&room_id=in.('+room_ids+')&select=id,source_event_id,payload')
 assignments={}
 for role in actors:
  tasks=backend(role,'/rest/v1/needs_you?status=eq.open&room_id=in.('+room_ids+')&select=proposal_id,target_organization_id')
  for task in tasks:
   if task['target_organization_id']==actors[role]['org_id']:assignments[task['proposal_id']]=role
 for proposal in proposals:
  pid=proposal['id']
  if pid not in assignments or db.execute('select 1 from notices where proposal_id=?',(pid,)).fetchone():continue
  source=db.execute('select zid,stream_id,topic from sources where event_id=?',(proposal['source_event_id'],)).fetchone()
  if not source:continue
  zid,stream_id,topic=source
  text='**AI 草稿 · 待人工审核**\n'+str(proposal['payload'].get('summary','Business update'))+'\n\n[查看原始消息]('+link(stream_id,zid)+')\n待处理方：'+assignments[pid]+'\n采纳请回复：\n\x60approve '+pid+'\x60\n忽略请回复：\n\x60dismiss '+pid+'\x60\n\nAI 草稿未写入已确认决议。'
  send(stream_id,topic,text)
  db.execute('insert into notices values (?)',(pid,));db.commit()
def iteration():
 query=urllib.parse.urlencode({'anchor':last_zid(),'num_before':0,'num_after':100,'include_anchor':'false','apply_markdown':'false'})
 for message in must('bot','messages?'+query)['messages']:
  process(message)
  db.execute("insert or replace into meta values ('last_zid',?)",(str(message['id']),));db.commit()
 notify()
if __name__=='__main__':
 print('Scoped synthetic bridge started',flush=True)
 while True:
  try:iteration()
  except Exception as error:print('Bridge iteration retry:',type(error).__name__,getattr(error,'status',''),flush=True)
  time.sleep(3)

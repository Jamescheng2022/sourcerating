import json,urllib.request,urllib.error
from pathlib import Path
from lab_api import ROOT
stack=Path('/home/newmedajames/sourcerating-pilot/stack')
env=dict(line.split('=',1) for line in (stack/'.env').read_text().splitlines() if '=' in line)
BASE='http://127.0.0.1:18001'
key=env['SERVICE_ROLE_KEY']
def admin(path,data=None,method=None,conflict=None):
 if conflict:path+='?on_conflict='+conflict
 headers={'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=representation'}
 req=urllib.request.Request(BASE+path,headers=headers,data=json.dumps(data).encode() if data is not None else None,method=method)
 try:
  with urllib.request.urlopen(req,timeout=30) as response:return json.load(response)
 except urllib.error.HTTPError as error:raise RuntimeError(path+': '+str(error.code)+' '+error.read().decode()[:500])
accounts=json.loads((ROOT/'account-input.json').read_text())
users=admin('/auth/v1/admin/users?per_page=200')['users']
for role,record in accounts.items():
 hit=next((user for user in users if user['email']==record['email']),None)
 if not hit:hit=admin('/auth/v1/admin/users',{'email':record['email'],'password':record['password'],'email_confirm':True,'user_metadata':{'display_name':'[S2-TEST] Zulip '+role}})
 record['user_id']=hit['id']
 record['org_id']='53000000-0000-4000-8000-0000000000'+{'buyer':'b1','supplier-a':'c1','supplier-b':'c2'}[role]
project='53000000-0000-4000-8000-0000000000d1'
buyer=accounts['buyer']
admin('/rest/v1/organizations',[{'id':record['org_id'],'name':'[S2-TEST] Zulip '+role,'slug':'s2-zulip-'+role} for role,record in accounts.items()],conflict='id')
admin('/rest/v1/projects',[{'id':project,'owner_organization_id':buyer['org_id'],'name':'[S2-TEST] Zulip Integration Lab','code':'S2-ZULIP-001'}],conflict='id')
admin('/rest/v1/project_participants',[{'project_id':project,'organization_id':record['org_id'],'project_role':'buyer' if role=='buyer' else 'supplier'} for role,record in accounts.items()],conflict='project_id,organization_id,project_role')
channels=json.loads((ROOT/'channels.json').read_text())
rooms=[]
for index,(role,channel) in enumerate(channels.items(),1):
 room_id='53000000-0000-4000-8000-0000000000e'+str(index)
 channel['room_id']=room_id
 rooms.append({'id':room_id,'project_id':project,'kind':'buyer_internal' if role=='internal' else 'supplier_external','name':'[S2-TEST] Zulip '+role,'owner_organization_id':buyer['org_id'],'counterpart_organization_id':None if role=='internal' else accounts[role]['org_id']})
admin('/rest/v1/rooms',rooms,conflict='id')
admin('/rest/v1/organization_memberships',[{'organization_id':record['org_id'],'user_id':record['user_id'],'role':'owner','removed_at':None} for record in accounts.values()],conflict='organization_id,user_id')
members=[]
for role,channel in channels.items():
 for member in ['buyer']+([] if role=='internal' else [role]):
  record=accounts[member]
  members.append({'room_id':channel['room_id'],'user_id':record['user_id'],'acting_organization_id':record['org_id'],'room_role':'admin' if member=='buyer' else 'member','removed_at':None})
admin('/rest/v1/room_members',members,conflict='room_id,user_id,acting_organization_id')
p=ROOT/'backend-private.json';p.write_text(json.dumps({'url':BASE,'anon_key':env['ANON_KEY'],'accounts':accounts,'channels':channels}));p.chmod(0o600)
(ROOT/'channels.json').write_text(json.dumps(channels,indent=2))
for filename in ['.env.worker','.env.app']:
 p=stack/filename;s=p.read_text();prefix='SOURCERATING_PILOT_ROOM_IDS='
 if not (ROOT/(filename+'.before-zulip')).exists():
  backup=ROOT/(filename+'.before-zulip');backup.write_text(s);backup.chmod(0o600)
 lines=s.splitlines()
 old=next((line[len(prefix):] for line in lines if line.startswith(prefix)),'')
 allowed=list(dict.fromkeys([value for value in old.split(',') if value]+[room['id'] for room in rooms]))
 p.write_text('\n'.join(line for line in lines if not line.startswith(prefix))+'\n'+prefix+','.join(allowed)+'\n');p.chmod(0o600)
print('Fresh synthetic backend project with three companies and three rooms ready; original room memberships unchanged')

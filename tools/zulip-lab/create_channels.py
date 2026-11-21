from lab_api import *
rooms=[('internal','[S2-TEST] Buyer internal',['buyer','bot']),('supplier-a','[S2-TEST] Supplier A',['buyer','supplier-a','bot']),('supplier-b','[S2-TEST] Supplier B',['buyer','supplier-b','bot'])]
out={}
for role,name,members in rooms:
 result=must('buyer','users/me/subscriptions',{'subscriptions':[{'name':name,'description':'Synthetic SourceRating evaluation only'}],'principals':[ACCOUNTS[key]['id'] for key in members],'invite_only':True,'history_public_to_subscribers':False})
 streams=must('buyer','users/me/subscriptions')['subscriptions']
 stream=next(row for row in streams if row['name']==name)
 out[role]={'id':stream['stream_id'],'name':name,'members':members}
(ROOT/'channels.json').write_text(json.dumps(out,indent=2))
print('Three private channels ready; suppliers are guests in separate channels')
for key in ['supplier-a','supplier-b']:
 names=[row['name'] for row in must(key,'users/me/subscriptions')['subscriptions']]
 assert names==[out[key]['name']],(key,names)
 print('PASS',key,'only receives its own private channel')

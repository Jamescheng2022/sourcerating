import json,os
from pathlib import Path
from zerver.actions.create_realm import do_create_realm
from zerver.actions.create_user import do_create_user
from zerver.actions.realm_settings import do_change_realm_permission_group_setting
from zerver.models import Realm,UserProfile,NamedUserGroup
from zerver.models.groups import SystemGroups
data=json.loads(Path('/tmp/lab-input.json').read_text())
realm=Realm.objects.filter(string_id='').first()
if not realm:realm=do_create_realm(string_id='',name='[S2-TEST] SourceRating · Zulip Lab',invite_required=True)
realm.allow_message_editing=False
realm.save(update_fields=['allow_message_editing'])
members=NamedUserGroup.objects.get(name=SystemGroups.MEMBERS,realm_for_sharding=realm)
do_change_realm_permission_group_setting(realm,'can_access_all_users_group',members,acting_user=None)
out={}
for role,record in data.items():
 user=UserProfile.objects.filter(realm=realm,delivery_email=record['email']).first()
 if not user:
  user=do_create_user(record['email'],record['password'],realm,'[S2-TEST] '+role.title(),role=UserProfile.ROLE_REALM_OWNER if role=='buyer' else UserProfile.ROLE_GUEST,tos_version=UserProfile.TOS_VERSION_BEFORE_FIRST_LOGIN,acting_user=None,enable_marketing_emails=False,add_initial_stream_subscriptions=False)
 out[role]={**record,'id':user.id,'api_key':user.api_key}
buyer=UserProfile.objects.get(id=out['buyer']['id'])
bot=UserProfile.objects.filter(realm=realm,delivery_email='z-ai@s2-test.invalid').first()
if not bot:bot=do_create_user('z-ai@s2-test.invalid',None,realm,'SourceRating AI',bot_type=UserProfile.DEFAULT_BOT,bot_owner=buyer,acting_user=None,add_initial_stream_subscriptions=False)
out['bot']={'email':bot.delivery_email,'id':bot.id,'api_key':bot.api_key}
p=Path('/tmp/lab-accounts.json');p.write_text(json.dumps(out));os.chmod(p,0o600)
print('Synthetic realm, three test accounts and scoped bot ready')

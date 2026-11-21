from pathlib import Path
import secrets, subprocess, re, time
r=Path('/home/newmedajames/sourcerating-zulip-lab')
p=r/'upstream-docker/.env'
if not p.exists():
 p.write_text('\n'.join('ZULIP__'+k+'='+secrets.token_hex(32) for k in ['POSTGRES_PASSWORD','MEMCACHED_PASSWORD','RABBITMQ_PASSWORD','REDIS_PASSWORD','SECRET_KEY','EMAIL_PASSWORD'])+'\n');p.chmod(0o600)
if not (r/'tunnel.pid').exists():
 with (r/'tunnel.log').open('a') as log:
  process=subprocess.Popen(['/home/newmedajames/sourcerating-pilot/cloudflared','tunnel','--url','http://127.0.0.1:18080','--no-autoupdate'],stdout=log,stderr=log,start_new_session=True)
  (r/'tunnel.pid').write_text(str(process.pid))
for attempt in range(40):
 match=re.search(r'https://[a-z0-9-]+\.trycloudflare\.com',(r/'tunnel.log').read_text())
 if match:break
 time.sleep(.5)
assert match,'tunnel URL unavailable'
url=match.group(0);host=url.split('//')[1];(r/'public-url.txt').write_text(url)
secrets_block='secrets:\n'+''.join('  zulip__'+k.lower()+':\n    environment: ZULIP__'+k+'\n' for k in ['POSTGRES_PASSWORD','MEMCACHED_PASSWORD','RABBITMQ_PASSWORD','REDIS_PASSWORD','SECRET_KEY','EMAIL_PASSWORD'])
over=secrets_block+'''
services:
  database:
    mem_limit: 512m
  memcached:
    mem_limit: 128m
  rabbitmq:
    mem_limit: 384m
  redis:
    mem_limit: 128m
  zulip:
    mem_limit: 3g
    ports: !override
      - "127.0.0.1:18080:80"
    environment:
      SETTING_EXTERNAL_HOST: "'''+host+'''"
      SETTING_ZULIP_ADMINISTRATOR: "admin@s2-test.invalid"
      SETTING_EMAIL_BACKEND: "django.core.mail.backends.dummy.EmailBackend"
      SETTING_SEND_LOGIN_EMAILS: "False"
      SETTING_OPEN_REALM_CREATION: "False"
      CONFIG_application_server__queue_workers_multiprocess: "false"
      CONFIG_application_server__uwsgi_processes: "2"
      TRUST_GATEWAY_IP: "True"
'''
(r/'upstream-docker/compose.override.yaml').write_text(over)
print('isolated lab configured:',url)

from pathlib import Path
import json,secrets
r=Path('/home/newmedajames/sourcerating-zulip-lab');d=r/'upstream-docker'
app=dict(line.split('=',1) for line in Path('/home/newmedajames/sourcerating-pilot/stack/.env.app').read_text().splitlines() if '=' in line)
p=d/'.env';s=p.read_text()
if 'ZULIP__TOPIC_SUMMARIZATION_API_KEY=' not in s:s+='ZULIP__TOPIC_SUMMARIZATION_API_KEY='+app['SOURCERATING_DEEPSEEK_API_KEY']+'\n'
p.write_text(s);p.chmod(0o600)
p=d/'compose.override.yaml';s=p.read_text()
if 'zulip__topic_summarization_api_key:' not in s:
 s=s.replace('services:', '  zulip__topic_summarization_api_key:\n    environment: ZULIP__TOPIC_SUMMARIZATION_API_KEY\nservices:',1)
 s=s.replace('  zulip:\n', '  zulip:\n    secrets:\n      - zulip__topic_summarization_api_key\n',1)
 s=s.replace('      SETTING_EXTERNAL_HOST:', '      SETTING_TOPIC_SUMMARIZATION_MODEL: "deepseek-flash"\n      SETTING_TOPIC_SUMMARIZATION_API_BASE: "https://api.deepseek.com/v1"\n      SETTING_EXTERNAL_HOST:',1)
p.write_text(s)
p=r/'account-input.json'
if not p.exists():
 p.write_text(json.dumps({role:{'email':'z-'+role+'@s2-test.invalid','password':secrets.token_urlsafe(24)} for role in ['buyer','supplier-a','supplier-b']}));p.chmod(0o600)
print('DeepSeek secret configured server-side; three isolated test identities prepared')

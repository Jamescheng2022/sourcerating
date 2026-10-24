"""Make shareable Playwright traces; never change the original trace archives.

Usage: python3 scrub-journey-traces.py RUN_DIRECTORY [LOCAL_SYNTHETIC_PASSWORD_JSON]
The run's trace-receipt.json points to its private rawDirectory. Tokens, cookies,
passwords and OAuth grants are removed; JS bundles are unnecessary to DOM replay.
This is an evidence utility, not an assertion/result rewriter.
"""
import hashlib, json, re, sys, zipfile
from pathlib import Path
from urllib.parse import unquote

out=Path(sys.argv[1]);receipt=json.loads((out/'trace-receipt.json').read_text())
raw=Path(receipt['rawDirectory']);archives=sorted(raw.glob('*.zip'));assert archives
secret=set()
sensitive=re.compile(r'^(password|old_password|new_password|access_token|refresh_token|id_token|token|token_hash|code|code_verifier|client_secret|nonce|state|authorization|cookie|set-cookie|apikey)$',re.I)
jwt=re.compile(r'eyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}')
query=re.compile(r'(?:access_token|refresh_token|id_token|token|token_hash|code|code_verifier|code_challenge|nonce|state)=([^&\s"<>\\]+)',re.I)
opaque_hex=re.compile(r'(?<![a-fA-F0-9])[a-fA-F0-9]{48,}(?![a-fA-F0-9])')
def remember(value):
    if isinstance(value,str) and len(value)>8:secret.add(value)
def discover(value):
    if isinstance(value,dict):
        if sensitive.fullmatch(str(value.get('name',''))):remember(value.get('value'))
        if value.get('method')=='fill' and 'password' in str(value.get('params',{}).get('selector','')).lower():remember(value.get('params',{}).get('value'))
        for k,v in value.items():
            if sensitive.fullmatch(k):remember(v)
            discover(v)
    elif isinstance(value,list):
        for v in value:discover(v)
    elif isinstance(value,str):
        secret.update(jwt.findall(value))
        for v in query.findall(value):remember(v);remember(unquote(v))
        if value[:1] in ('{','['):
            try:discover(json.loads(value))
            except (ValueError,RecursionError):pass
if len(sys.argv)>2:
    for v in json.loads(Path(sys.argv[2]).read_text()).values():remember(v)

def decode(data):
    try:return data.decode('utf-8')
    except UnicodeDecodeError:return None
def read_json(text):
    for line in text.splitlines():
        try:discover(json.loads(line))
        except (ValueError,RecursionError):pass
    try:discover(json.loads(text))
    except (ValueError,RecursionError):pass

# Discover across all contexts first (a password can appear in a fill event in
# one context and an auth request body in another).
for archive in archives:
    with zipfile.ZipFile(archive) as z:
        assert z.testzip() is None
        for info in z.infolist():
            assert not Path(info.filename).is_absolute() and '..' not in Path(info.filename).parts
            t=decode(z.read(info))
            if t is not None:
                secret.update(jwt.findall(t));secret.update(opaque_hex.findall(t))
                for v in query.findall(t):remember(v);remember(unquote(v))
                if not info.filename.endswith(('.js','.css')):read_json(t)
ordered=sorted(secret,key=len,reverse=True)
rows=[]
for archive in archives:
    removed_js=set();changes=0;redactions=0;target=out/archive.name
    assert not target.exists(),'Preserve previous sanitized output; use a new run directory'
    with zipfile.ZipFile(archive) as src:
        for name in src.namelist():
            if name.endswith('.network'):
                for line in src.read(name).decode().splitlines():
                    x=json.loads(line).get('snapshot',{}).get('response',{}).get('content',{})
                    if 'javascript' in x.get('mimeType','') and x.get('_sha1'):removed_js.add('resources/'+x['_sha1'])
        with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as dest:
            for info in src.infolist():
                data=src.read(info);t=decode(data)
                if info.filename in removed_js or info.filename.endswith(('.js','.map')):
                    data=b'/* Application bundle omitted from shareable trace. Rebuild the recorded commit. */'
                elif t is not None:
                    original=t
                    for value in ordered:
                        # JSON escaping may differ between embedded JSON and the outer record.
                        for literal in (value,json.dumps(value,ensure_ascii=False)[1:-1]):
                            redactions+=t.count(literal);t=t.replace(literal,'[redacted]')
                    t=jwt.sub('[redacted]',t);t=opaque_hex.sub('[redacted]',t)
                    assert not jwt.search(t)
                    assert not any(value in t for value in ordered)
                    if info.filename.endswith(('.trace','.network','.stacks')):
                        for line in t.splitlines():json.loads(line)
                    data=t.encode()
                    if original!=t:changes+=1
                dest.writestr(info.filename,data)
    with zipfile.ZipFile(target) as z:assert z.testzip() is None
    rows.append({'file':target.name,'rawSHA256':hashlib.sha256(archive.read_bytes()).hexdigest(),
        'shareableSHA256':hashlib.sha256(target.read_bytes()).hexdigest(),'bytes':target.stat().st_size,
        'changedTextMembers':changes,'redactionOccurrences':redactions,'omittedJavaScriptResources':len(removed_js)})
receipt['shareableTraces']=rows
receipt['sanitization']='Credentials/OAuth grants removed; executable bundles replaced; DOM, CSS, screenshots, actions and network outcomes retained. Raw archives remain private and unchanged.'
(out/'trace-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({'directory':str(out),'traces':len(rows),'bytes':sum(r['bytes'] for r in rows),'credentialValuesPrinted':0}))

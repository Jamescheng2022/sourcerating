"""Real native UI acceptance on the existing AVD; local synthetic data only.

Start the local stack, build/install the local APK and boot SourceRating_API35
read-only without snapshot load/save, or use the authorized dedicated clone.
No SDK/emulator install, package uninstall,
snapshot mutation, remote backend, or user creation is performed here.
"""
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import re
import shlex
import subprocess
import sys
import time
import traceback
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
import zipfile

REPO = Path(__file__).resolve().parents[3]
ROOT = REPO.parent
URL = 'http://127.0.0.1:54321'
SHARED = '52000000-0000-4000-8000-0000000000e2'
INTERNAL = '52000000-0000-4000-8000-0000000000e1'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--adb-port', default='5038')
parser.add_argument('--avd-name', choices=['SourceRating_API35', 'SourceRating_API35_L1'], default='SourceRating_API35')
parser.add_argument('--package', default='com.sourcerating.mobile.stage2')
parser.add_argument('--evidence-dir', type=Path, default=ROOT / 'carryover/B7-artifacts/live')
args = parser.parse_args()
if not re.fullmatch(r'com\.sourcerating\.mobile(?:\.stage2)?', args.package):
    parser.error('only the SourceRating package or local stage2 variant is supported')
OUT = args.evidence_dir.resolve()
if not OUT.is_relative_to(ROOT.resolve()) or OUT.is_relative_to(REPO.resolve()):
    parser.error('evidence must be in this lane workspace, outside Git')
OUT.mkdir(parents=True, exist_ok=True)
ADB = [str(Path(os.environ.get('ANDROID_HOME', 'D:/Android/Sdk')) / 'platform-tools/adb.exe'),
       '-P', args.adb_port, '-s', 'emulator-5554']
KEY = (ROOT / 'secrets/s2-anon-key.txt').read_text(encoding='utf-8-sig').strip()
PASSWORDS = json.loads((ROOT / 'secrets/s2-local-passwords.json').read_text(encoding='utf-8-sig'))
CHECKS = []
STAMP = 'S2-TEST-B7-' + str(time.time_ns() // 1000000)
sys.stdout.reconfigure(encoding='utf-8')

def adb(*argv):
    return subprocess.check_output(ADB + list(argv), stderr=subprocess.STDOUT, timeout=45)

def nodes():
    # A cold boot can briefly return no hierarchy before the Activity draws.
    for attempt in range(3):
        adb('shell', 'uiautomator', 'dump', '/sdcard/s2-b7-ui.xml')
        try:
            return list(ET.fromstring(adb('exec-out', 'cat', '/sdcard/s2-b7-ui.xml')).iter('node'))
        except ET.ParseError:
            if attempt == 2:
                raise AssertionError('ADB returned no valid UI hierarchy after three reads') from None
            time.sleep(.5)

def texts():
    return [n.get('text', '') for n in nodes() if n.get('password') != 'true']

def tap_node(node):
    x1, y1, x2, y2 = map(int, re.findall(r'\d+', node.get('bounds')))
    adb('shell', 'input', 'tap', str((x1 + x2) // 2), str((y1 + y2) // 2))

def tap(text):
    current = nodes()
    matches = [n for n in current if n.get('text', '') == text]
    if not matches:
        matches = [n for n in current if n.get('text', '').casefold() == text.casefold()]
    tap_node(matches[0])

def input_text(value):
    adb('shell', 'input', 'text', shlex.quote(value.replace(' ', '%s')))

def fill(hint, value):
    tap(hint)
    input_text(value)
    adb('shell', 'input', 'keyevent', '4')

def wait_ui(needle, timeout=45):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        visible = '\n'.join(texts())
        if needle in visible:
            return visible
        if 'failed (' in visible or 'not sent' in visible:
            raise AssertionError('UI operation failed: ' + visible)
        time.sleep(.3)
    raise AssertionError('UI never displayed ' + needle)

def scroll_message_into_view(needle, older):
    # A narrow phone cannot show both participants and all file cards at once.
    for attempt in range(9):
        current = nodes()
        visible = '\n'.join(n.get('text', '') for n in current if n.get('password') != 'true')
        if needle in visible:
            return visible
        if attempt == 8:
            break
        listing = next(n for n in current if n.get('class') == 'android.widget.ListView')
        x1, y1, x2, y2 = map(int, re.findall(r'\d+', listing.get('bounds')))
        top, bottom = y1 + (y2 - y1) // 5, y2 - (y2 - y1) // 5
        start, end = (top, bottom) if older else (bottom, top)
        adb('shell', 'input', 'swipe', str((x1 + x2) // 2), str(start), str((x1 + x2) // 2), str(end), '400')
    raise AssertionError('Native message list never displayed ' + needle)

def check(label, condition):
    assert condition, label
    CHECKS.append(label)
    print('PASS', label, flush=True)
    (OUT / 'checks.json').write_text(json.dumps(CHECKS, indent=2), encoding='utf-8')

def screenshot(label):
    (OUT / (label + '.png')).write_bytes(adb('exec-out', 'screencap', '-p'))

def http(path, token=None, body=None):
    headers = {'apikey': KEY, 'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    data = None if body is None else json.dumps(body).encode()
    request = urllib.request.Request(URL + path, data=data, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.status, json.loads(response.read())
    except urllib.error.HTTPError as error:
        return error.code, json.loads(error.read())

def auth(role):
    status, result = http('/auth/v1/token?grant_type=password', body={
        'email': 's2-' + role + '@s2-test.invalid', 'password': PASSWORDS['S2_' + role.upper() + '_PASSWORD']})
    assert status == 200, 'seed account authentication failed'
    return result['access_token']

def login(role):
    wait_ui('Sign-in email')
    fill('Sign-in email', 's2-' + role + '@s2-test.invalid')
    fill('Sign-in password', PASSWORDS['S2_' + role.upper() + '_PASSWORD'])
    tap('Sign in')
    wait_ui('polling 3s')

def room(name):
    tap_node(next(n for n in nodes() if n.get('class') == 'android.widget.Spinner'))
    # Retained fixtures can put the selected item below the first menu item.
    for _ in range(6):
        if name in texts(): break
        size = adb('shell', 'wm', 'size').decode()
        width, height = map(int, re.findall(r'(\d+)x(\d+)', size)[-1])
        adb('shell', 'input', 'swipe', str(width // 2), str(height // 3), str(width // 2), str(height * 3 // 4), '400')
    tap(name)
    wait_ui(name)
    wait_ui('polling 3s')

def upload(path):
    adb('push', str(path), '/sdcard/Download/' + path.name)
    tap('+')
    # Wait for DocumentsUI to draw its navigation controls on a cold boot.
    deadline = time.monotonic() + 45
    while time.monotonic() < deadline:
        listed_nodes = nodes()
        if any(n.get('content-desc') == 'Show roots' or n.get('text') == path.name for n in listed_nodes):
            break
        time.sleep(.3)
    else:
        raise AssertionError('native document picker never became ready')
    listed = texts()
    if path.name not in listed:
        tap_node(next(n for n in nodes() if n.get('content-desc') == 'Show roots'))
        tap('Downloads')
    tap(path.name)
    wait_ui('SourceRating')
    wait_ui('📎 ' + path.name)

def files(token, room_id=SHARED):
    status, rows = http('/rest/v1/room_file_versions?select=*&room_id=eq.' + room_id + '&order=version_no.asc', token)
    assert status == 200
    return [row for row in rows if row['logical_name'].startswith(STAMP.lower())]

def wait_files(token, count, room_id=SHARED):
    deadline = time.monotonic() + 40
    while time.monotonic() < deadline:
        rows = files(token, room_id)
        if len(rows) == count and all(r['verification_status'] == 'verified' for r in rows):
            return rows
        time.sleep(.3)
    raise AssertionError('native upload did not register/verify all files')

def send(message):
    fill('Message…', message)
    tap('Send')
    wait_ui(message)

def events(token):
    status, rows = http('/rest/v1/room_events?select=payload&room_id=eq.' + SHARED, token)
    assert status == 200
    return [r['payload'].get('text') for r in rows]

def main():
    avd_name = adb('emu', 'avd', 'name').decode().splitlines()[0].strip()
    check('authorized ' + args.avd_name + ' AVD selected', avd_name == args.avd_name)
    buyer, supplier = auth('buyer'), auth('supplier')
    supplier_status, supplier_identity = http('/auth/v1/user', supplier)
    assert supplier_status == 200 and supplier_identity.get('id'), 'live supplier identity required'
    adb('shell', 'am', 'force-stop', args.package)
    adb('shell', 'am', 'start', '-n', args.package + '/com.sourcerating.mobile.MainActivity')
    deadline = time.monotonic() + 45
    while time.monotonic() < deadline:
        initial = texts()
        if 'Logout' in initial:
            tap('Logout')
            break
        if 'Sign-in email' in initial:
            break
        time.sleep(.3)
    else: raise AssertionError('native startup controls never became ready')
    login('buyer')
    room('[S2-TEST] Buyer Internal')
    check('buyer email/password login', 'Buyer Internal' in '\n'.join(texts()))
    screenshot('01-buyer-login')
    fixture_dir = OUT / 'fixtures'
    fixture_dir.mkdir(exist_ok=True)
    pdf = fixture_dir / (STAMP + '.pdf')
    objects = [b'<< /Type /Catalog /Pages 2 0 R >>',
               b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
               b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>',
               b'<< /Length 0 >>\nstream\n\nendstream']
    data = b'%PDF-1.4\n'
    offsets = [0]
    for i, obj in enumerate(objects, 1):
        offsets.append(len(data))
        data += str(i).encode() + b' 0 obj\n' + obj + b'\nendobj\n'
    xref = len(data)
    data += b'xref\n0 5\n0000000000 65535 f \n' + b''.join(('%010d 00000 n \n' % n).encode() for n in offsets[1:])
    data += b'trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n' + str(xref).encode() + b'\n%%EOF\n'
    pdf.write_bytes(data)
    png = fixture_dir / (STAMP + '.png')
    png.write_bytes(base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1cAAAAASUVORK5CYII='))
    xlsx = fixture_dir / (STAMP + '.xlsx')
    with zipfile.ZipFile(xlsx, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/></Types>')
        z.writestr('xl/workbook.xml', '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheets/></workbook>')
    room('[S2-TEST] Buyer Internal')
    upload(pdf)
    private = wait_files(buyer, 1, INTERNAL)[0]
    check('buyer internal PDF native upload and server byte checks', private['server_sha256'] == hashlib.sha256(pdf.read_bytes()).hexdigest())
    status, rows = http('/rest/v1/room_file_versions?select=id&id=eq.' + private['id'], supplier)
    check('non-member file read denied', status == 200 and rows == [])
    for action in ('verify', 'sign'):
        status, response = http('/functions/v1/room-file-gateway', supplier, {'action': action, 'fileVersionId': private['id']})
        check('non-member ' + action + ' denied', status == 404 and response.get('error') == 'file_not_found')
    room('[S2-TEST] Supplier Co - Shared')
    buyer_message = '[S2-TEST] ' + STAMP + ' native buyer'
    send(buyer_message)
    check('native buyer message visible to supplier through RLS', buyer_message in events(supplier))
    for path in (pdf, xlsx, png):
        upload(path)
        rows = wait_files(buyer, (pdf, xlsx, png).index(path) + 1)
        row = next(r for r in rows if r['logical_name'] == path.name.lower())
        check(path.suffix + ' native upload and SHA/type/size server checks', row['server_sha256'] == hashlib.sha256(path.read_bytes()).hexdigest() and row['detected_mime_type'] == row['mime_type'] and row['size_bytes'] == path.stat().st_size)
    pdf.write_bytes(pdf.read_bytes() + b'% S2-TEST native revision 2\n')
    upload(pdf)
    rows = wait_files(buyer, 4)
    revisions = [r for r in rows if r['logical_name'] == pdf.name.lower()]
    check('same-name PDF v1/v2 history retained', [r['version_no'] for r in revisions] == [1, 2] and revisions[1]['supersedes_version_id'] == revisions[0]['id'])
    tap('📎 ' + pdf.name + '  ·  v2')
    detail = wait_ui('Server check: verified')
    check('native file version and precise verification details', 'Version 2' in detail and 'do not certify document contents' in detail)
    screenshot('02-file-version-server-checks')
    tap('Download')
    target = STAMP + '-download-v2.pdf'
    edit = next(n for n in nodes() if n.get('class') == 'android.widget.EditText')
    tap_node(edit)
    adb('shell', 'input', 'keyevent', '123')
    adb('shell', 'input', 'keyevent', *(['67'] * len(edit.get('text', ''))))
    input_text(target)
    tap('Save')
    deadline = time.monotonic() + 40
    expected = hashlib.sha256(pdf.read_bytes()).hexdigest()
    while time.monotonic() < deadline:
        try:
            actual = adb('exec-out', 'cat', '/sdcard/Download/' + target)
            if hashlib.sha256(actual).hexdigest() == expected: break
        except subprocess.CalledProcessError: pass
        time.sleep(.5)
    else: raise AssertionError('native download bytes did not match fixture')
    (OUT / target).write_bytes(actual)
    check('member native download SHA-256 matches PDF v2', hashlib.sha256(actual).hexdigest() == expected)
    tap('Logout')
    login('supplier')
    check('supplier email/password login', 'Supplier Co - Shared' in '\n'.join(texts()))
    tap_node(next(n for n in nodes() if n.get('class') == 'android.widget.Spinner'))
    check('supplier room picker excludes buyer internal through RLS', 'Buyer Internal' not in '\n'.join(texts()))
    adb('shell', 'input', 'keyevent', '4')
    check('buyer message visible in native supplier UI', buyer_message in wait_ui(buyer_message))
    supplier_message = '[S2-TEST] ' + STAMP + ' native supplier'
    send(supplier_message)
    check('native supplier reply visible to buyer through RLS', supplier_message in events(buyer))
    upload(png)
    supplier_files = wait_files(supplier, 5)
    check('supplier native attachment upload uses its own org-scoped version chain', any(r['logical_name'] == png.name.lower() and r['version_no'] == 1 and r['uploader_user_id'] == supplier_identity['id'] and r['server_sha256'] == hashlib.sha256(png.read_bytes()).hexdigest() for r in supplier_files))
    screenshot('03-supplier-message-and-files')
    tap('Logout')
    login('buyer')
    room('[S2-TEST] Supplier Co - Shared')
    check('supplier reply visible in native buyer UI', supplier_message in wait_ui(supplier_message))
    status, sender_rows = http('/rest/v1/room_events?select=actor_display_name&room_id=eq.' + SHARED + '&payload->>text=eq.' + urllib.parse.quote(supplier_message), buyer)
    check('native sender label comes from server actor snapshot', status == 200 and len(sender_rows) == 1 and sender_rows[0]['actor_display_name'] in wait_ui(sender_rows[0]['actor_display_name']))
    adb('shell', 'am', 'force-stop', args.package)
    adb('shell', 'am', 'start', '-n', args.package + '/com.sourcerating.mobile.MainActivity')
    wait_ui(supplier_message)
    check('force-stop/reopen restores session room and both messages', buyer_message in scroll_message_into_view(buyer_message, older=True))
    scroll_message_into_view(supplier_message, older=False)
    version_label = '📎 ' + pdf.name + '  ·  v2'
    check('force-stop/reopen retains attachment versions', version_label in scroll_message_into_view(version_label, older=True))
    scroll_message_into_view(supplier_message, older=False)
    # Emulator network is restored in finally, including on test failure.
    adb('shell', 'svc', 'wifi', 'disable')
    adb('shell', 'svc', 'data', 'disable')
    wait_ui('Offline', timeout=50)
    screenshot('04-offline')
    check('offline failure is recoverable with visible status', 'Offline' in '\n'.join(texts()))
    adb('shell', 'svc', 'wifi', 'enable')
    adb('shell', 'svc', 'data', 'enable')
    check('reconnect restores room messages and versions', 'Online' in wait_ui('Online', timeout=50) and supplier_message in '\n'.join(texts()))
    screenshot('05-reconnected-persistent-room')
    print(f'{len(CHECKS)}/{len(CHECKS)} native live checks passed; {STAMP}', flush=True)

try:
    main()
except Exception as failure:
    try: screenshot('failure')
    except Exception: pass
    error = traceback.format_exc()
    if isinstance(failure, subprocess.CalledProcessError):
        error += '\nCommand output: ' + failure.output.decode('utf-8', errors='replace')
    for password in PASSWORDS.values(): error = error.replace(password, '[REDACTED TEST PASSWORD]')
    error = re.sub(r'eyJ[\w-]+\.[\w-]+\.[\w-]+', '[REDACTED JWT]', error)
    (OUT / 'failure.txt').write_text(error, encoding='utf-8')
    print(error, flush=True)
    sys.exit(1)
finally:
    for network in ('wifi', 'data'):
        try: adb('shell', 'svc', network, 'enable')
        except Exception: pass
    try:
        pid = adb('shell', 'pidof', args.package).decode().strip()
        if pid:
            log = adb('logcat', '-d', '--pid=' + pid, '-v', 'threadtime').decode('utf-8', errors='replace')
            for value in [KEY, *PASSWORDS.values()]: log = log.replace(value, '[REDACTED]')
            log = re.sub(r'eyJ[\w-]+\.[\w-]+\.[\w-]+|token=[^\s&]+', '[REDACTED TOKEN]', log)
            (OUT / 'adb-logcat.txt').write_text(log, encoding='utf-8')
    except Exception: pass

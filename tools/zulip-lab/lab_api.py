import base64,json,urllib.request,urllib.parse,urllib.error
from pathlib import Path
ROOT=Path(__file__).resolve().parent
URL=(ROOT/'public-url.txt').read_text().strip()
ACCOUNTS=json.loads((ROOT/'accounts-api-private.json').read_text())
def request(role,path,data=None,method=None):
 account=ACCOUNTS[role]
 headers={'Authorization':'Basic '+base64.b64encode((account['email']+':'+account['api_key']).encode()).decode()}
 encoded=None
 if data is not None:
  encoded=urllib.parse.urlencode({k:json.dumps(v) if isinstance(v,(dict,list,bool)) else str(v) for k,v in data.items()}).encode()
  headers['Content-Type']='application/x-www-form-urlencoded'
 req=urllib.request.Request(URL+'/api/v1/'+path,headers=headers,data=encoded,method=method)
 try:
  with urllib.request.urlopen(req,timeout=45) as response:return response.status,json.load(response)
 except urllib.error.HTTPError as error:return error.code,json.load(error)
def must(role,path,data=None,method=None):
 status,result=request(role,path,data,method)
 assert status==200 and result.get('result')=='success',(path,status,result.get('msg'))
 return result

#!/usr/bin/env python3
"""Independent read-only official UK procurement API → private Supabase candidate staging.

No GCP, no paid desktop channel, no API secret, and NO publication to en_atlas_records.
Authenticates the job to Supabase using short-lived GitHub Actions OIDC.
"""
from __future__ import annotations
import argparse, datetime as dt, hashlib, json, os, re, sys, time, urllib.parse, urllib.request
from pathlib import Path

API="https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search"
ENDPOINT="https://qnozpurjtgkmwtvsrjoi.supabase.co/functions/v1/en-atlas-oidc-stage"
AUD="sourcerating-atlas-refresh-v1"
UA="SourceRating-Engineering-Atlas/0.2 (+https://sourcerating.com)"
ENGINEERING=re.compile(r"\b(construction|civil engineering|geotechnical|bridge|highway|roadwork|railway|tunnel|dam|power station|structural|foundation|piling|pile testing|concrete|prefab|precast|roof|refurbish|water treatment|drainage|building work|survey(?:ing)?|asbestos remov|infrastructure)\b",re.I)
ALLOWED_HOST="www.contractsfinder.service.gov.uk"

def http_json(url:str, headers:dict|None=None, timeout=45):
    req=urllib.request.Request(url,headers={"User-Agent":UA,"Accept":"application/json",**(headers or {})})
    with urllib.request.urlopen(req,timeout=timeout) as response:
        if response.status!=200: raise RuntimeError(f"Upstream HTTP {response.status}")
        if not response.headers.get("content-type","").lower().startswith("application/json"):
            raise RuntimeError("Unexpected upstream MIME type")
        payload=response.read(4_000_001)
        if len(payload)>4_000_000: raise RuntimeError("Unexpected large upstream page")
        return json.loads(payload)

def source_releases(now:dt.datetime,days:int=3,max_pages:int=4):
    from_date=(now-dt.timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%SZ")
    to_date=now.strftime("%Y-%m-%dT%H:%M:%SZ")
    params=urllib.parse.urlencode({"publishedFrom":from_date,"publishedTo":to_date,"limit":100})
    url=API+"?"+params;scanned=0
    for page_num in range(max_pages):
        parsed=urllib.parse.urlparse(url)
        if parsed.scheme!="https" or parsed.netloc!=ALLOWED_HOST or parsed.path!="/Published/Notices/OCDS/Search":
            raise RuntimeError("Untrusted API pagination URL")
        document=http_json(url)
        if not isinstance(document,dict) or not isinstance(document.get("releases"),list):
            raise RuntimeError("Malformed official OCDS search package")
        for release in document["releases"]:
            if isinstance(release,dict): yield release
            scanned+=1
        next_url=(document.get("links") or {}).get("next")
        if not next_url:break
        url=str(next_url)
        time.sleep(.4)

def interested(release:dict)->bool:
    tender=release.get("tender") or {}
    if not isinstance(tender,dict):return False
    codes=[]
    classification=tender.get("classification") or {}
    if isinstance(classification,dict): codes.append(str(classification.get("id","")))
    for item in (tender.get("items") or [])[:12]:
        if isinstance(item,dict): codes.append(str((item.get("classification") or {}).get("id","")))
    if any(code.startswith(("44","45","71")) for code in codes):return True
    if str(tender.get("mainProcurementCategory","")).lower()=="works":return True
    title=str(tender.get("title") or "")
    return bool(ENGINEERING.search(title))

def normalized(release:dict)->dict|None:
    rid=str(release.get("id") or "")
    if not re.fullmatch(r"[A-Za-z0-9-]{5,100}",rid):return None
    tender=release.get("tender") or {}
    title=str(tender.get("title") or "").strip()
    if len(title)<3:return None
    url=f"https://{ALLOWED_HOST}/Published/Notice/releases/{rid}.json"
    tags=release.get("tag") if isinstance(release.get("tag"),list) else []
    when=str(release.get("date") or "")
    try:
        parsed=dt.datetime.fromisoformat(when.replace("Z","+00:00"))
        if parsed.year<2000 or parsed>dt.datetime.now(dt.timezone.utc)+dt.timedelta(days=2):return None
    except Exception:return None
    classification=tender.get("classification") or {}
    data={"source":"UK Contracts Finder","notice_id":rid,"ocid":str(release.get("ocid") or "")[:140],
          "title":title[:700],"tags":[str(x)[:50] for x in tags[:5]],
          "classification":str((classification or {}).get("id") or "")[:50],
          "mainProcurementCategory":str(tender.get("mainProcurementCategory") or "")[:35],
          "sourcePublishedAt":when,
          "disclaimer":"Official notice; award is not proof of contract execution, and records are not verified job-sites."}
    encoded=json.dumps(data,ensure_ascii=False,separators=(",",":"),sort_keys=True).encode("utf8")
    if len(encoded)>11000:return None
    return {"candidate_id":"uk:"+hashlib.sha256(rid.encode()).hexdigest()[:24],
            "source_name":"UK Contracts Finder","source_url":url,
            "record_title":title[:700],
            "source_status":",".join(str(x) for x in tags[:4])[:120] or "source_notice",
            "source_published_at":when,"item_sha256":hashlib.sha256(encoded).hexdigest(),
            "candidate_data":data}

def get_oidc_token():
    endpoint=os.getenv("ACTIONS_ID_TOKEN_REQUEST_URL","")
    bearer=os.getenv("ACTIONS_ID_TOKEN_REQUEST_TOKEN","")
    if not endpoint or not bearer:raise RuntimeError("GitHub OIDC not available; cannot upload without authentication")
    joiner="&" if "?" in endpoint else "?"
    u=endpoint+joiner+urllib.parse.urlencode({"audience":AUD})
    obj=http_json(u,{"Authorization":"Bearer "+bearer},timeout=25)
    token=obj.get("value")
    if not isinstance(token,str) or token.count(".")!=2:raise RuntimeError("Invalid OIDC token response")
    return token

def send_batch(token, candidates):
    raw=json.dumps({"candidates":candidates},ensure_ascii=False,separators=(",",":")).encode("utf8")
    if len(raw)>150000:raise RuntimeError("Candidate batch too large")
    req=urllib.request.Request(ENDPOINT,method="POST",data=raw,
        headers={"Authorization":"Bearer "+token,"Content-Type":"application/json","Accept":"application/json","User-Agent":UA})
    with urllib.request.urlopen(req,timeout=50) as response:
        data=json.loads(response.read(5000))
        if response.status!=200 or data.get("ok") is not True or data.get("staged")!=len(candidates):
            raise RuntimeError("Supabase staging did not acknowledge full batch")
        return data

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--dry-run",action="store_true")
    parser.add_argument("--lookback-days",type=int,default=3)
    parser.add_argument("--max-pages",type=int,default=4)
    args=parser.parse_args()
    if not (1<=args.lookback_days<=7 and 1<=args.max_pages<=6):parser.error("unsafe scan horizon")
    now=dt.datetime.now(dt.timezone.utc)
    total=0;seen=set();results=[]
    for release in source_releases(now,args.lookback_days,args.max_pages):
        total+=1
        if interested(release):
            item=normalized(release)
            if item and item["candidate_id"] not in seen:
                seen.add(item["candidate_id"]);results.append(item)
                if len(results)>=100:break
    if total<=0:raise RuntimeError("Official source returned zero records; do not report success")
    if len(results)>100:raise RuntimeError("Unexpected candidate volume")
    staged=0
    if not args.dry_run and results:
        token=get_oidc_token()
        for i in range(0,len(results),30):
            result=send_batch(token,results[i:i+30])
            staged+=int(result["staged"])
    summary={"checked_at":now.isoformat(),"official_source":"UK Contracts Finder",
             "scanned_releases":total,"engineering_candidates":len(results),
             "private_candidates_staged":staged,"mode":"dry-run" if args.dry_run else "private-staging",
             "public_snapshot_untouched":True}
    print(json.dumps(summary,separators=(",",":")))
    report=os.getenv("GITHUB_STEP_SUMMARY")
    if report:
        with open(report,"a",encoding="utf8") as f:
            f.write("### SourceRating Atlas independent source check\n\n")
            f.write("| Metric | Result |\n|---|---:|\n")
            for key in ("scanned_releases","engineering_candidates","private_candidates_staged"):
                f.write(f"| {key} | {summary[key]} |\n")
            f.write("\n**Only private, pending-review candidate data was updated. The 17,337 published snapshot was not modified.**\n")
    return 0

if __name__=="__main__":
    try:sys.exit(main())
    except Exception as exc:
        # no tokens or secrets in exception output
        print("ATLAS_REFRESH_FAILED",type(exc).__name__,str(exc)[:200],file=sys.stderr)
        sys.exit(1)

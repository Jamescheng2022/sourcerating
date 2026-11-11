#!/usr/bin/env python3
"""Generate public, evidence-labeled Atlas read-only records from v2 SQLite.
Only curated World Bank CC BY 4.0 metadata and UK Contracts Finder OGL records are published.
Website case-study claims, unverified people, private contacts and raw evidence stay internal.
"""
import argparse
import datetime as dt
import hashlib
import json
import re
import sqlite3
from collections import Counter, defaultdict
from pathlib import Path
from urllib.parse import urlparse

ENGINEERING_TITLE = re.compile(
    r"\b(infrastructur\w*|road\w*|highway\w*|bridge\w*|rail\w*|metro|"
    r"transport\w*|port\w*|airport\w*|water|wastewater|sanitation|sewer\w*|"
    r"flood\w*|drain\w*|irrigat\w*|dam\w*|hydro\w*|power|energy|electric\w*|"
    r"transmission|grid|renewable\w*|construction|building\w*|housing|urban|"
    r"engineering|industrial|pipeline\w*|solid waste|landfill)\b", re.I
)
WB_SOURCE = "https://datacatalog.worldbank.org/search/dataset/0037800/world-bank-projects-operations"
UK_SOURCE = "https://www.gov.uk/government/publications/open-contracting"
WB_LICENSE = "https://www.worldbank.org/ext/en/legal/terms-conditions/datasets"
UK_LICENSE = "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/"

def iso_date(value):
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        return dt.datetime.fromisoformat(value.strip().replace("Z", "+00:00")).date().isoformat()
    except ValueError:
        try:
            return dt.datetime.strptime(value.strip().split(" ")[0], "%m/%d/%Y").date().isoformat()
        except ValueError:
            return None

def money(value, currency=None):
    if isinstance(value, dict):
        currency = value.get("currency", currency)
        value = value.get("amount")
    if isinstance(value, str):
        value = value.replace(",", "").strip()
    try:
        n = float(value)
    except (ValueError, TypeError):
        return None
    if not 0 <= n < 1e15:
        return None
    return {"value": n, "currency": currency if currency in ("USD", "GBP") else (currency or "unknown")}

def public_url(url, domains):
    if not isinstance(url, str):
        return None
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.hostname not in domains:
        return None
    return url

def compact_row(r):
    return dict(r)

def export(db, dest):
    dest.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    check = con.execute("PRAGMA quick_check").fetchone()[0]
    if check != "ok":
        raise RuntimeError("SQLite quick_check failed: " + str(check))
    meta = con.execute("SELECT id, kind, name, attributes FROM v2_entities WHERE kind IN ('project','procurement','award','organization')").fetchall()
    entities = {r["id"]: {"kind": r["kind"], "name": r["name"], "data": json.loads(r["attributes"])} for r in meta}
    buyer_of = defaultdict(list)
    supplier_of = defaultdict(list)
    award_under = defaultdict(list)
    for row in con.execute("SELECT subject,predicate,object,status FROM v2_assertions WHERE predicate IN ('buyer_of','supplier_of','award_under') AND status='source_declared'"):
        if row["predicate"] == "buyer_of":
            buyer_of[row["object"]].append(row["subject"])
        elif row["predicate"] == "supplier_of":
            supplier_of[row["object"]].append(row["subject"])
        else:
            award_under[row["object"]].append(row["subject"])
    wb, uk = [], []
    for id, obj in entities.items():
        d = obj["data"]
        name = (obj["name"] or "").strip()
        if not name:
            continue
        if obj["kind"] == "project":
            link = public_url(d.get("source_url"), {"projects.worldbank.org"})
            if not link:
                continue
            wb.append({
                "id": id, "type": "world_bank_project", "title": name,
                "country": d.get("country") if isinstance(d.get("country"), str) else None,
                "region": d.get("region") if isinstance(d.get("region"), str) else None,
                "status": d.get("status") if d.get("status") in ("Active", "Closed", "Pipeline", "Dropped") else "Unknown",
                "amount": money(d.get("amount"), d.get("currency")),
                "approvalDate": iso_date(d.get("approval_date")),
                "closingDate": iso_date(d.get("closing_date")),
                "sourceUrl": link,
                "recordCode": link.rsplit("/", 1)[-1],
                "titleEngineeringSignal": bool(ENGINEERING_TITLE.search(name)),
                "source": "World Bank Projects & Operations",
                "evidenceLevel": "official_source_record",
                "statusCaveat": "World Bank status does not establish construction phase or tender availability",
            })
        elif obj["kind"] == "procurement":
            source = public_url(d.get("source_url"), {"www.contractsfinder.service.gov.uk"})
            if not source:
                continue
            awards = []
            for aid in sorted(set(award_under.get(id, []))):
                award = entities.get(aid)
                if not award or award["kind"] != "award":
                    continue
                av = award["data"]
                docs = [public_url(x.get("url"), {"www.contractsfinder.service.gov.uk"})
                        for x in av.get("documents", []) if isinstance(x, dict)]
                docs = [x for x in docs if x]
                suppliers = []
                for orgid in sorted(set(supplier_of.get(aid, []))):
                    org = entities.get(orgid)
                    if org and org["kind"] == "organization":
                        suppliers.append({"id": orgid, "name": org["name"], "evidenceLevel": "source_declared"})
                awards.append({
                    "id": aid, "status": av.get("status"), "date": iso_date(av.get("date")),
                    "value": money(av.get("value")), "sourceUrl": docs[0] if docs else source,
                    "suppliers": suppliers
                })
            buyers = []
            for orgid in sorted(set(buyer_of.get(id, []))):
                org = entities.get(orgid)
                if org and org["kind"] == "organization":
                    buyers.append({"id": orgid, "name": org["name"], "evidenceLevel": "source_declared"})
            cpv = d.get("classification") or {}
            if not isinstance(cpv, dict):
                cpv = {}
            uk.append({
                "id": id, "type": "uk_procurement_notice", "title": name,
                "country": "United Kingdom", "region": None,
                "status": "Award information published" if awards else "Procurement notice",
                "amount": money(d.get("value")) or next((a["value"] for a in awards if a["value"]), None),
                "sourceUrl": awards[0]["sourceUrl"] if awards else source,
                "ocid": d.get("ocid"), "classification": {"id": cpv.get("id"), "description": cpv.get("description")},
                "description": str(d.get("description") or "")[:360].strip(),
                "buyers": buyers, "awards": awards,
                "titleEngineeringSignal": True,
                "source": "UK Contracts Finder",
                "evidenceLevel": "source_declared",
                "statusCaveat": "An award notice is not proof of a signed contract or an open opportunity",
            })
    wb.sort(key=lambda x: (x["country"] or "", x["title"], x["id"]))
    uk.sort(key=lambda x: (x["title"], x["id"]))
    data_files = [
        ("worldbank-projects.json", wb),
        ("uk-procurement.json", uk),
    ]
    hashes = {}
    for filename, rows in data_files:
        text = json.dumps(rows, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
        out = dest / filename
        out.write_text(text, encoding="utf-8")
        hashes[filename] = {"sha256": hashlib.sha256(text.encode("utf-8")).hexdigest(), "bytes": out.stat().st_size, "records": len(rows)}
    counts = Counter(x["status"] for x in wb)
    manifest = {
        "schemaVersion": "atlas-public/1.0",
        "generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        "dataType": "Read-only, source-attributed engineering/development records; not a live tender feed",
        "totals": {
            "worldBank": len(wb), "ukProcurements": len(uk),
            "engineeringTitleSignal": sum(x["titleEngineeringSignal"] for x in wb),
            "worldBankActive": counts["Active"], "worldBankClosed": counts["Closed"],
            "ukNoticesWithBuyer": sum(bool(x["buyers"]) for x in uk),
            "ukNoticesWithAward": sum(bool(x["awards"]) for x in uk)
        },
        "sourceLicenses": [
            {"name": "World Bank Projects & Operations", "license": "CC BY 4.0", "licenseUrl": WB_LICENSE, "datasetUrl": WB_SOURCE, "attribution": "The World Bank: World Bank Projects & Operations; reformatted and filtered by Project Atlas; not endorsed by the World Bank."},
            {"name": "UK Contracts Finder", "license": "OGL v3.0", "licenseUrl": UK_LICENSE, "datasetUrl": UK_SOURCE, "attribution": "Contains public sector information licensed under the Open Government Licence v3.0."}
        ],
        "excluded": ["website project-case content (redistribution rights unresolved)", "individual contacts and private data", "inferred identity matches"],
        "dataFiles": hashes,
        "limits": ["World Bank projects are not all engineering construction projects.", "Source status is not construction phase.", "Buyer and supplier links reflect source-declared OCDS data, not independent identity verification.", "Geocoordinates and exact jobsite locations are not verified.", "No evidence that award equals contract execution."]
    }
    (dest / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"output": str(dest), "counts": manifest["totals"], "files": hashes, "sqlite": check}, ensure_ascii=False))
    con.close()
    assert wb and uk
    return manifest

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()
    export(args.db, args.out)

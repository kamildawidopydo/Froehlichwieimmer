import json, urllib.request, urllib.parse
from pymongo import MongoClient

env = dict(l.strip().split("=", 1) for l in open("/app/backend/.env") if "=" in l)
db = MongoClient(env["MONGO_URL"].strip('"'))[env["DB_NAME"].strip('"')]
DIR = "/app/frontend/public/assets/bank-logos"
MAP_F = "/app/backend/data/seed_production/bank_logos.json"
mapping = json.load(open(MAP_F))
UA = {"User-Agent": "EssenceInvestLogoFetcher/1.0 (contact: admin@essenceinvest.com)"}
TITLES = {
    "bawag": "BAWAG_Group", "abn-amro": "ABN_AMRO", "societe-generale": "Société_Générale",
    "wizink": "WiZink", "intesa-sanpaolo": "Intesa_Sanpaolo", "op-financial": "OP_Financial_Group",
    "orange-bank": "Orange_Bank", "bank-austria": "UniCredit_Bank_Austria", "caixabank": "CaixaBank",
    "illimity": "Illimity_Bank", "swedbank": "Swedbank",
}


def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=15).read()


for slug, title in TITLES.items():
    res = None
    for lang in ("en", "de", "it", "es", "fr"):
        try:
            q = json.loads(get(f"https://{lang}.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=original&redirects=1&titles={urllib.parse.quote(title)}"))
            page = next(iter(q["query"]["pages"].values()))
            src = page.get("original", {}).get("source")
            if src and "logo" in src.lower():
                res = src
                break
        except Exception:
            continue
    if not res:
        print("NO", slug)
        continue
    ext = res.rsplit(".", 1)[-1].lower()
    if ext == "svg":
        data = get(res)
    else:
        data = get(res)
    fn = f"{slug}.{ 'svg' if ext == 'svg' else 'png' if ext == 'png' else ext}"
    open(f"{DIR}/{fn}", "wb").write(data)
    mapping[slug] = f"/assets/bank-logos/{fn}"
    db.banks.update_one({"slug": slug}, {"$set": {"logo_url": mapping[slug]}})
    print("OK", slug, res)
json.dump(mapping, open(MAP_F, "w"), indent=1, sort_keys=True)

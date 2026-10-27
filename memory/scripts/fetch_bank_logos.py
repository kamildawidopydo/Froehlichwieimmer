import io, json, re, urllib.request, urllib.parse
from PIL import Image
from pymongo import MongoClient

env = dict(l.strip().split("=", 1) for l in open("/app/backend/.env") if "=" in l)
db = MongoClient(env["MONGO_URL"].strip('"'))[env["DB_NAME"].strip('"')]
DIR = "/app/frontend/public/assets/bank-logos"
MAP_F = "/app/backend/data/seed_production/bank_logos.json"
mapping = json.load(open(MAP_F))
DOM_FIX = {"bawag": "bawag.at", "seb": "seb.se", "op-financial": "op.fi", "norisbank": "norisbank.de",
           "younited": "younited-credit.com", "bgl-bnpp": "bgl.lu", "belfius": "belfius.be"}
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36"}


def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=12).read()


def size_of(data):
    try:
        im = Image.open(io.BytesIO(data)); return min(im.size), im
    except Exception:
        if b"<svg" in data[:2000].lower():
            return 999, None
        return 0, None


def candidates(dom):
    base = f"https://www.{dom}" if not dom.startswith("www.") else f"https://{dom}"
    urls = []
    try:
        html = get(base + "/").decode("utf-8", "ignore")
        for m in re.finditer(r"<link[^>]+>", html, re.I):
            tag = m.group(0)
            if re.search(r'rel=["\'][^"\']*(icon|apple-touch)', tag, re.I):
                h = re.search(r'href=["\']([^"\']+)', tag)
                if h:
                    urls.append(urllib.parse.urljoin(base + "/", h.group(1)))
        og = re.search(r'property=["\']og:image["\'][^>]*content=["\']([^"\']+)', html, re.I)
    except Exception:
        pass
    urls += [base + "/apple-touch-icon.png", f"https://icon.horse/icon/{dom}",
             f"https://www.google.com/s2/favicons?domain={dom}&sz=256"]
    return urls


todo = []
for b in db.banks.find({}, {"slug": 1, "website_url": 1, "logo_url": 1}):
    slug, url = b["slug"], b.get("logo_url")
    cur = 0
    if url and url.startswith("/assets/"):
        try:
            cur, _ = size_of(open("/app/frontend/public" + url, "rb").read())
        except Exception:
            cur = 0
    if cur < 100:
        dom = DOM_FIX.get(slug) or re.sub(r"^https?://(www\.)?", "", b.get("website_url") or "").split("/")[0]
        todo.append((slug, dom, cur))

fixed, still = [], []
for slug, dom, cur in todo:
    best, best_data, ext = cur, None, "png"
    for u in candidates(dom) if dom else []:
        try:
            data = get(u)
        except Exception:
            continue
        s, im = size_of(data)
        if s > best:
            best, best_data = s, data
            ext = "svg" if s == 999 else "png"
            if im is not None and ext == "png":
                buf = io.BytesIO(); im.convert("RGBA").save(buf, "PNG"); best_data = buf.getvalue()
        if best >= 180:
            break
    if best_data:
        open(f"{DIR}/{slug}.{ext}", "wb").write(best_data)
        mapping[slug] = f"/assets/bank-logos/{slug}.{ext}"
        db.banks.update_one({"slug": slug}, {"$set": {"logo_url": mapping[slug]}})
        fixed.append((slug, best))
    else:
        still.append((slug, dom, cur))
json.dump(mapping, open(MAP_F, "w"), indent=1, sort_keys=True)
print("FIXED", fixed)
print("STILL", still)

# Iteration 92 helper: list/cleanup TEST alerts (target 55.55) + watchlist/orders snapshot for tester
import os, requests, json
B = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
s = requests.Session()
r = s.post(f"{B}/api/auth/login", json={"email": "tester@mester.de", "password": "HHHKKK222"})
tok = r.json().get("access_token") or r.json().get("token")
if tok:
    s.headers["Authorization"] = f"Bearer {tok}"
al = s.get(f"{B}/api/alerts").json()
items = al.get("items", al) if isinstance(al, dict) else al
print("alerts:", json.dumps(items)[:600])
for a in items:
    if str(a.get("target_price", a.get("target"))).startswith("55.55"):
        d = s.delete(f"{B}/api/alerts/{a['id']}")
        print("deleted", a["id"], d.status_code)
wl = s.get(f"{B}/api/portfolio/watchlist").json()
print("watchlist:", [w.get("symbol") for w in (wl if isinstance(wl, list) else wl.get("items", []))])
o = s.get(f"{B}/api/portfolio/orders").json()
items = o.get("items", o) if isinstance(o, dict) else o
print("orders:", [(x["symbol"], x["status"], x.get("limit_price")) for x in items][:15])
print("cash:", s.get(f"{B}/api/portfolio/cash").json())
print("positions:", str(s.get(f"{B}/api/portfolio/stock-positions").json())[:300])

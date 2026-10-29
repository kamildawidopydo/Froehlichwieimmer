import requests, json, sys
B = "https://finance-platform-v2.preview.emergentagent.com"
def login(e, p):
    s = requests.Session()
    r = s.post(f"{B}/api/auth/login", json={"email": e, "password": p}); print(e, r.status_code)
    tok = r.json().get("access_token") or r.json().get("token")
    if tok: s.headers["Authorization"] = f"Bearer {tok}"
    return s
a = login("qa.admin@kapital-direkt24.de", "Qa-ra46CVrWIW3wg6l5EI6IKqbx")
r = a.get(f"{B}/api/admin/ipo/requests"); d = r.json()
items = d if isinstance(d, list) else d.get("items") or d.get("requests") or d.get("data")
print("total", len(items))
for it in items:
    if (it.get("notes") or "").startswith("TEST") or "test_eur" in json.dumps(it.get("customer") or it.get("profiles") or {}).lower():
        print({k: it.get(k) for k in ("id","ticker","status","notes","amount_eur","shares_requested","subscription_price_per_share","listing_price_per_share","position_symbol","source")})
if len(sys.argv) > 1:
    t = login("tester@mester.de", "HHHKKK222")
    for ep in ["/api/ipo/my-requests", "/api/ipo/requests/me", "/api/portfolio/cash", "/api/cash/balance", "/api/depot/positions"]:
        x = t.get(B + ep); print(ep, x.status_code, x.text[:300])

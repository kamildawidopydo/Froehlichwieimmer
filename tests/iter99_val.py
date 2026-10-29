import requests, sys
B = "https://finance-platform-v2.preview.emergentagent.com"
a = requests.Session()
r = a.post(f"{B}/api/auth/login", json={"email": "qa.admin@kapital-direkt24.de", "password": "Qa-ra46CVrWIW3wg6l5EI6IKqbx"})
tok = r.json().get("access_token") or r.json().get("token")
if tok: a.headers["Authorization"] = f"Bearer {tok}"
r = a.patch(f"{B}/api/admin/ipo/requests/6ae3439bf000027daa675546/valuation", json={"listing_price_per_share": sys.argv[1]})
print(r.status_code, r.json().get("listing_price_per_share"), r.json().get("valuation"))

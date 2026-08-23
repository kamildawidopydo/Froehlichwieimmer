import os
import requests
from dotenv import dotenv_values

env = dotenv_values("/app/frontend/.env")
BASE = (os.environ.get("REACT_APP_BACKEND_URL") or env.get("REACT_APP_BACKEND_URL")).rstrip("/")

s = requests.Session()
r = s.post(f"{BASE}/api/auth/login", json={"email": "admin@kapitalmitte.com", "password": "admin123"})
print("login", r.status_code)
for sym in ["DAX", "TSLA"]:
    r = s.post(f"{BASE}/api/watchlist", json={"symbol": sym})
    print("add", sym, r.status_code, r.text[:200])
r = s.get(f"{BASE}/api/watchlist")
print("list", r.status_code, r.text[:500])
for sym in ["DAX", "TSLA"]:
    r = s.get(f"{BASE}/api/news-markte/market/sparkline/{sym}")
    print("sparkline", sym, r.status_code, r.text[:200])

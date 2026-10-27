# UI test setup/teardown helper: python ui_setup.py up|down
import sys
import os
from datetime import date, timedelta
import requests

BASE = "https://finance-platform-v2.preview.emergentagent.com/api/careers"
s = requests.Session()
s.post("https://finance-platform-v2.preview.emergentagent.com/api/auth/login", json={"email": "admin@kapitalmitte.com", "password": "admin123"})
s.headers["Authorization"] = f"Bearer {s.cookies.get('access_token')}"
if sys.argv[1] == "up":
    print(s.put(f"{BASE}/admin/settings", json={"site_public": False, "applications_enabled": True, "retention_days": 180}).status_code)
    for t, loc, et in [("TEST_ UI Berater Berlin (m/w/d)", "Berlin", "Vollzeit"), ("TEST_ UI Analyst Hamburg", "Hamburg", "Teilzeit")]:
        j = s.post(f"{BASE}/admin/jobs", json={"title": t, "level": "einsteiger" if loc == "Berlin" else "erfahren", "location": loc,
                                               "employment_type": et, "summary": "Kurzbeschreibung TEST", "tasks": ["Aufgabe 1"],
                                               "requirements": ["Anf 1"], "offer": ["Angebot 1"],
                                               "deadline": (date.today() + timedelta(days=20)).isoformat()}).json()
        print(j["slug"], s.post(f"{BASE}/admin/jobs/{j['id']}/status", json={"status": "published"}).status_code)
else:
    for a in s.get(f"{BASE}/admin/applications").json()["items"]:
        print("del app", a["id"], s.delete(f"{BASE}/admin/applications/{a['id']}").status_code)
    for j in s.get(f"{BASE}/admin/jobs").json()["items"]:
        if j["title"].startswith("TEST_"):
            print("del job", j["slug"], s.delete(f"{BASE}/admin/jobs/{j['id']}").status_code)
    for u in s.get(f"{BASE}/admin/team").json()["items"]:
        print("del user", u["email"], s.delete(f"{BASE}/admin/team/{u['id']}").status_code)
    print(s.put(f"{BASE}/admin/settings", json={"site_public": False, "applications_enabled": False, "retention_days": 180, "notify_email": None}).json())

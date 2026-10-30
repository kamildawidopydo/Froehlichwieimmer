# Iter108: per-IP login limit (20 failed / 15 min, public IPs). RUN LAST - locks this IP; afterwards run
#   python /app/backend/tests/iter108_ip_tool.py clear
import os
import uuid

import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

ADMIN = ("qa.admin@kapital-direkt24.de", "Qa-ra46CVrWIW3wg6l5EI6IKqbx")


def test_ip_lockout_after_20_distinct_emails():
    codes = []
    for i in range(22):
        email = f"nobody_ip108_{i}_{uuid.uuid4().hex[:6]}@example.com"
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": "wrong-pass-123"}, timeout=30)
        codes.append(r.status_code)
    print("ip codes", codes)
    assert 429 in codes
    first = codes.index(429)
    assert first >= 19, f"locked too early at attempt {first + 1}"
    assert all(c == 429 for c in codes[first:])
    # correct credentials are also blocked while the IP is locked
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN[0], "password": ADMIN[1]}, timeout=30)
    print("admin while ip locked", r.status_code)
    assert r.status_code == 429

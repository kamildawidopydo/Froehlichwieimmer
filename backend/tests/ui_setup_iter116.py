# UI helper iter116: setup (TEST user + TEST bond + 1 direct order) | addreq <email> <pw> <bid> (adds non-direct request)
import os, sys, json
import requests
from dotenv import load_dotenv
sys.path.insert(0, os.path.dirname(__file__))
import ui_setup_iter114 as base

load_dotenv("/app/frontend/.env")
B = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")


def cust(email, pw):
    s = requests.Session(); s.headers.update({"Origin": B})
    assert s.post(f"{B}/api/auth/login", json={"email": email, "password": pw}).ok
    return s


if sys.argv[1] == "order":
    s = cust(sys.argv[2], sys.argv[3])
    r = s.post(f"{B}/api/bonds/orders", json={"bond_id": sys.argv[4], "amount_eur": 1000})
    print(r.status_code, r.json().get("id"), r.json().get("status"))
elif sys.argv[1] == "addreq":
    s = cust(sys.argv[2], sys.argv[3])
    r = s.post(f"{B}/api/bonds/requests", json={"bond_id": sys.argv[4], "amount_eur": 1000})
    print(r.status_code, r.text[:200])

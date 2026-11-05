# Helper for iteration 118 UI tests: set Rabobank test price states + temporary deposit + strict cleanup
import json, os, sys, uuid
from datetime import datetime, timedelta, timezone
import requests
from bson import ObjectId
from pymongo import MongoClient
from dotenv import load_dotenv
load_dotenv("/app/frontend/.env"); load_dotenv("/app/backend/.env")
BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
RABO = "6aec4ccd70262b166764f09d"
STATE = "/tmp/ui118_state.json"
m = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
uid = m.users.find_one({"email": "tester@mester.de"})["_id"]
uq = {"user_id": {"$in": [uid, str(uid)]}}


def admin():
    s = requests.Session(); s.headers.update({"Origin": BASE})
    assert s.post(f"{BASE}/api/auth/login", json={"email": "qa.admin@kapital-direkt24.de",
                                                  "password": "Qa-ra46CVrWIW3wg6l5EI6IKqbx"}).status_code == 200
    return s


def patch(**kw):
    r = admin().patch(f"{BASE}/api/admin/bonds/catalog/{RABO}", json=kw); print(r.status_code, r.text[:150])


cmd = sys.argv[1]
now = datetime.now(timezone.utc)
if cmd == "start":
    json.dump({"t0": now.isoformat(), "ledger": [str(d["_id"]) for d in m.cash_ledger.find(uq, {"_id": 1})],
               "pos": [str(d["_id"]) for d in m.bond_positions.find(uq, {"_id": 1})]}, open(STATE, "w"))
elif cmd == "price":
    h = float(sys.argv[2]) if len(sys.argv) > 2 else 2
    patch(kaufkurs=109.10, kaufkurs_art="verbindlich", kaufkurs_quelle="TEST Vorschau",
          kaufkurs_quoted_at=(now - timedelta(hours=max(0, -h) + 1)).isoformat(),
          kaufkurs_valid_until=(now + timedelta(hours=h)).isoformat())
elif cmd == "deposit":
    r = admin().post(f"{BASE}/api/admin/portfolio/cash/deposit", json={"user_id": str(uid), "amount": sys.argv[2],
                     "idempotency_key": f"TEST_ui118_{uuid.uuid4().hex}", "description": "TEST Vorschau-Guthaben"})
    print(r.status_code, r.text[:120])
elif cmd == "basis":
    patch(min_order_basis=sys.argv[2])
elif cmd == "orders":
    for d in m.bond_purchase_requests.find({**uq, "isin": "XS1002121454"}):
        print(d["_id"], d.get("status"), d.get("order_type"), d.get("requested_nominal"), d.get("amount_eur"))
    print("ibp", m.insufficient_buying_power_events.count_documents({**uq, "bond_id": RABO}))
elif cmd == "cleanup":
    st = json.load(open(STATE)); t0 = datetime.fromisoformat(st["t0"]) - timedelta(seconds=5)
    patch(kaufkurs=None, kaufkurs_art=None, kaufkurs_quelle=None, kaufkurs_quoted_at=None, kaufkurs_valid_until=None,
          min_order_basis="purchase", requests_enabled=True, orders_enabled=True)
    reqs = [d["_id"] for d in m.bond_purchase_requests.find({**uq, "isin": "XS1002121454", "created_at": {"$gte": t0}})]
    print("reqs", reqs)
    m.bond_executions.delete_many({"bond_request_id": {"$in": reqs}})
    m.bond_purchase_requests.delete_many({"_id": {"$in": reqs}})
    m.audit_log.delete_many({"entity_id": {"$in": [str(o) for o in reqs] + reqs}})
    print("ibp", m.insufficient_buying_power_events.delete_many({**uq, "bond_id": RABO, "created_at": {"$gte": t0}}).deleted_count)
    newpos = [d["_id"] for d in m.bond_positions.find(uq) if str(d["_id"]) not in st["pos"]]
    m.bond_positions.delete_many({"_id": {"$in": newpos}})
    newl = [d["_id"] for d in m.cash_ledger.find(uq) if str(d["_id"]) not in st["ledger"]]
    print("ledger", newl, "pos", newpos)
    m.cash_ledger.delete_many({"_id": {"$in": newl}})

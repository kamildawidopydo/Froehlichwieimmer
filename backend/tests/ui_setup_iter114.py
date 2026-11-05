# UI test data helper for iteration 114 (direct bond orders). Usage: setup | cleanup <uid> <bid>
import os, sys, json, uuid
from datetime import datetime, timedelta, timezone
import requests
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env"); load_dotenv("/app/backend/.env")
B = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
mdb = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]


def admin():
    s = requests.Session(); s.headers.update({"Origin": B})
    assert s.post(f"{B}/api/auth/login", json={"email": "qa.admin@kapital-direkt24.de", "password": "Qa-ra46CVrWIW3wg6l5EI6IKqbx"}).ok
    return s


def setup():
    a = admin()
    email = f"test_uibond_{uuid.uuid4().hex[:6]}@example.com"
    u = a.post(f"{B}/api/admin/users", json={"email": email, "name": "TEST_UI Kunde"}).json()
    mdb.users.update_one({"_id": ObjectId(u["id"])}, {"$set": {
        "onboarding_completed": True, "first_name": "TEST_UI", "last_name": "Kunde", "country": "DE",
        "must_change_password": False,
        "onboarding_steps_completed": ["profile", "security", "portfolio", "notifications"]}})
    a.post(f"{B}/api/admin/portfolio/cash/deposit", json={"user_id": u["id"], "amount": "1500.00",
           "idempotency_key": f"TEST_dep_{uuid.uuid4().hex}"}).raise_for_status()
    now = datetime.now(timezone.utc)
    r = a.post(f"{B}/api/admin/bonds/catalog", json={
        "isin": "TEST00000099", "bond_name": "TEST_Direktkauf Anleihe", "issuer": "TEST Issuer", "kupon_rate": 5.0,
        "kaufkurs": 101.5, "aktueller_kurs": 101.5, "faelligkeitsdatum": "2030-12-31", "min_order_eur": 1000,
        "denomination": 25, "currency": "EUR", "is_available": True, "kaufkurs_art": "verbindlich",
        "kaufkurs_quelle": "TEST Partnerbank", "kaufkurs_quoted_at": now.isoformat(),
        "kaufkurs_valid_until": (now + timedelta(days=2)).isoformat(), "buy_fee_pct": 0.25, "buy_fee_min_eur": 10,
        "buy_fee_fixed_eur": 2.5, "accrued_interest_pct": 0.8, "accrued_note": "TEST Stückzinsen"})
    r.raise_for_status()
    print(json.dumps({"uid": u["id"], "email": email, "pw": u["temporary_password"], "bid": r.json()["id"]}))


def cleanup(uid, bid):
    a = admin(); uoid = ObjectId(uid)
    oids = [d["_id"] for d in mdb.bond_purchase_requests.find({"$or": [{"user_id": uoid}, {"bond_id": bid}]}, {"_id": 1})]
    print("orders", [str(o) for o in oids])
    print("execs", mdb.bond_executions.delete_many({"bond_request_id": {"$in": oids}}).deleted_count)
    mdb.bond_purchase_requests.delete_many({"_id": {"$in": oids}})
    print("audit", mdb.audit_log.delete_many({"entity_id": {"$in": [str(o) for o in oids] + oids + [bid, ObjectId(bid)]}}).deleted_count)
    ibp = [d["_id"] for d in mdb.insufficient_buying_power_events.find({"bond_id": bid}, {"_id": 1})]
    print("ibp", [str(i) for i in ibp]); mdb.insufficient_buying_power_events.delete_many({"_id": {"$in": ibp}})
    for c in ("bond_positions", "cash_ledger", "stock_alert_notifications"):
        print(c, mdb[c].delete_many({"user_id": {"$in": [uoid, uid]}}).deleted_count)
    print("user", a.delete(f"{B}/api/admin/users/{uid}").status_code)
    print("bond", a.delete(f"{B}/api/admin/bonds/catalog/{bid}").status_code)
    print("ph", mdb.bond_price_history.delete_many({"bond_id": {"$in": [bid, ObjectId(bid)]}}).deleted_count)


if __name__ == "__main__":
    setup() if sys.argv[1] == "setup" else cleanup(sys.argv[2], sys.argv[3])

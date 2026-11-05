import os
from bson import ObjectId
from pymongo import MongoClient
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")
m = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
RABO = "6aec4ccd70262b166764f09d"
b = m.bond_catalog.find_one({"_id": ObjectId(RABO)})
print({k: b.get(k) for k in ("isin", "kaufkurs", "kaufkurs_art", "kaufkurs_quelle", "kaufkurs_quoted_at",
                             "kaufkurs_valid_until", "min_order_basis", "min_order_eur", "denomination",
                             "requests_enabled", "orders_enabled", "is_available", "accrued_interest_pct",
                             "buy_fee_pct", "buy_fee_min_eur", "buy_fee_fixed_eur", "aktueller_kurs")})
u = m.users.find_one({"email": "tester@mester.de"})
uid = u["_id"]
q = {"user_id": {"$in": [uid, str(uid)]}}
print("ledger", m.cash_ledger.count_documents(q), "reqs", m.bond_purchase_requests.count_documents(q),
      "ibp", m.insufficient_buying_power_events.count_documents(q), "pos", m.bond_positions.count_documents(q),
      "execs", m.bond_executions.count_documents(q))
for r in m.bond_purchase_requests.find(q):
    print(" req", r["_id"], r.get("status"), r.get("order_type"), r.get("isin"))
print("other verbindlich bonds:", [(str(x["_id"]), x.get("kaufkurs_valid_until")) for x in
                                   m.bond_catalog.find({"kaufkurs_art": "verbindlich", "kaufkurs": {"$ne": None}})])
print("cash_ledger sample keys", list((m.cash_ledger.find_one(q) or {}).keys()))

"""Seed helper for 80.41 frontend E2E: creates 2 handoffs (deliverable + blocked)."""
from datetime import datetime, timezone

from dotenv import dotenv_values
from pymongo import MongoClient

env = dotenv_values("/app/backend/.env")
db = MongoClient(env["MONGO_URL"])[env["DB_NAME"]]

db.assistant_handoffs.delete_many({"name": {"$regex": "^TEST_UI8041"}})

base = {
    "concern": "Ich moechte Beratung zu Tagesgeld und ETF-Sparplaenen erhalten.",
    "created_at": datetime.now(timezone.utc),
    "status": "new",
    "status_history": [],
    "reply_history": [],
    "reply_count": 0,
    "context_summary": "Kunde fragte nach Tagesgeld und ETFs.",
    "recent_topics": ["tagesgeld", "etf"],
    "current_route": "/",
    "source": "assistant_chat",
}
ok = dict(base, name="TEST_UI8041 Deliverable", email="delivered@resend.dev")
bad = dict(base, name="TEST_UI8041 Blocked", email="blocked-ui@example.com")
ids = db.assistant_handoffs.insert_many([ok, bad]).inserted_ids
print("OK_ID", ids[0])
print("BAD_ID", ids[1])

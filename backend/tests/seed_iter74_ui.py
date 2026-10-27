# Seed/cleanup TEST_ data for iter74 UI checks: python seed_iter74_ui.py seed|clean
import os
import sys
from datetime import datetime, timezone
from dotenv import load_dotenv
from pymongo import MongoClient
from bson import ObjectId

load_dotenv("/app/backend/.env")
db = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
CS_ID = ObjectId("6ae0aaaaaaaaaaaaaaaa0074")
DU_ID = ObjectId("6ae0aaaaaaaaaaaaaaaa0075")

if sys.argv[1] == "seed":
    now = datetime.now(timezone.utc)
    db.contract_form_submissions.replace_one({"_id": CS_ID}, {
        "_id": CS_ID, "product_key": "festgeld", "bank_name": "TEST Bank", "customer_name": "TEST_Iter74 Kunde",
        "customer_email": "test_iter74@example.com", "summary": {"Betrag": "10.000 EUR", "Laufzeit": "12 Monate"},
        "files": [], "status": "new", "admin_email_sent": True, "admin_email_error": None,
        "customer_email_sent": False, "customer_email_error": "TEST fail", "created_at": now, "updated_at": now,
    }, upsert=True)
    db.document_upload_submissions.replace_one({"_id": DU_ID}, {
        "_id": DU_ID, "code_id": "TEST", "used_by_name": "TEST_Iter74 Upload", "email": "test_iter74_du@example.com",
        "status": "new", "admin_email_sent": True, "files": [], "created_at": now,
    }, upsert=True)
    print("seeded", CS_ID, DU_ID)
else:
    print(db.contract_form_submissions.delete_one({"_id": CS_ID}).deleted_count,
          db.document_upload_submissions.delete_one({"_id": DU_ID}).deleted_count)

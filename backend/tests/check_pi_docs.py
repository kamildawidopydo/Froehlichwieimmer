import os
from dotenv import dotenv_values
from pymongo import MongoClient

env = dotenv_values("/app/backend/.env")
mc = MongoClient(env["MONGO_URL"])
db = mc[env["DB_NAME"]]
coll = db["product_inquiry_email_idempotency"]
print("indexes:")
for i in coll.list_indexes():
    print("  ", i)
print("total docs:", coll.count_documents({}))
for d in coll.find().sort("created_at", -1).limit(8):
    d.pop("_id", None)
    print(d)

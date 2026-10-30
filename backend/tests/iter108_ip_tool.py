# Iter108 helper: list / clear login_attempts test counters (ip:, email:nobody, email:csrf). Usage: python iter108_ip_tool.py [list|clear]
import asyncio
import sys

from dotenv import dotenv_values
from motor.motor_asyncio import AsyncIOMotorClient

env = dotenv_values("/app/backend/.env")
FILTER = {"identifier": {"$regex": "^(ip:|email:nobody|email:csrf)"}}


async def main(cmd):
    db = AsyncIOMotorClient(env["MONGO_URL"])[env["DB_NAME"]]
    if cmd == "clear":
        r = await db.login_attempts.delete_many(FILTER)
        print("deleted", r.deleted_count)
    async for d in db.login_attempts.find(FILTER, {"_id": 0}):
        print(d)


asyncio.run(main(sys.argv[1] if len(sys.argv) > 1 else "list"))

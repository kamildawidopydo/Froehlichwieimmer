"""Manueller Aufruf des idempotenten Rabobank-Seeds (läuft sonst beim Backend-Start).
Aufruf: cd /app/backend && python scripts/seed_rabobank_bond.py
"""
import asyncio
import os
import sys

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
load_dotenv(os.path.join(ROOT, ".env"))

from services.bond_seed import ensure_rabobank_bond  # noqa: E402


async def main():
    db = AsyncIOMotorClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
    print("inserted" if await ensure_rabobank_bond(db) else "exists – unchanged")


asyncio.run(main())

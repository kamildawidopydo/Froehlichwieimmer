"""Verschlüsselte, endgültig löschbare Ablage für Bewerbungsunterlagen (MongoDB GridFS + Fernet)."""
from __future__ import annotations

import os
from typing import Tuple

from cryptography.fernet import Fernet
from motor.motor_asyncio import AsyncIOMotorGridFSBucket

BUCKET = "career_files"


def _master() -> Fernet:
    return Fernet(os.environ["CAREER_FILES_KEY"].encode())


def _bucket(db) -> AsyncIOMotorGridFSBucket:
    return AsyncIOMotorGridFSBucket(db, bucket_name=BUCKET)


async def store(db, file_id: str, application_id: str, data: bytes, content_type: str, name: str) -> None:
    data_key = Fernet.generate_key()
    cipher = Fernet(data_key).encrypt(data)
    await _bucket(db).upload_from_stream_with_id(
        file_id, name, cipher, metadata={"application_id": application_id, "content_type": content_type})
    await db.career_file_keys.insert_one(
        {"_id": file_id, "application_id": application_id, "wrapped_key": _master().encrypt(data_key)})


async def load(db, file_id: str) -> Tuple[bytes, str]:
    key = await db.career_file_keys.find_one({"_id": file_id})
    if not key:
        raise FileNotFoundError(file_id)
    stream = await _bucket(db).open_download_stream(file_id)
    cipher = await stream.read()
    data_key = _master().decrypt(key["wrapped_key"])
    return Fernet(data_key).decrypt(cipher), (stream.metadata or {}).get("content_type") or "application/octet-stream"


async def purge_application(db, application_id: str) -> int:
    """Löscht Schlüssel und verschlüsselte Datei-Chunks endgültig."""
    bucket = _bucket(db)
    await db.career_file_keys.delete_many({"application_id": application_id})
    n = 0
    async for f in db[f"{BUCKET}.files"].find({"metadata.application_id": application_id}, {"_id": 1}):
        await bucket.delete(f["_id"])
        n += 1
    return n

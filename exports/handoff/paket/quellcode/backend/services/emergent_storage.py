"""Session 82.99 — Emergent Object Storage Service.

Backend-seitiger Wrapper um die `INTEGRATION_PROXY_URL`/`EMERGENT_LLM_KEY`
Storage-API. Nur der Backend kennt Credentials — Frontend sieht ausschließlich
`/api/...`-URLs.

Verträge:
- Kein Delete-API vorhanden → wir persistieren `is_deleted=True` in der Mongo-
  Metadaten-Collection und blocken Reads darauf.
- Kein Presign — jeder Read läuft durch den Backend-Proxy mit Auth-Check.
- Pfad-Konvention: `froehlich/<scope>/<subject_id>/<uuid>.<ext>` (App-Prefix
  verhindert Bucket-Kollisionen, UUID verhindert Path-Traversal).
"""
from __future__ import annotations

import logging
import os
from typing import Optional, Tuple

import requests

log = logging.getLogger("kapitalmitte")

_STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = _STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
APP_PREFIX = "froehlich"

_storage_key: Optional[str] = None


def init_storage(force: bool = False) -> str:
    global _storage_key
    if _storage_key and not force:
        return _storage_key
    key = os.environ.get("EMERGENT_LLM_KEY")
    if not key:
        raise RuntimeError("EMERGENT_LLM_KEY nicht gesetzt")
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": key}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    """Upload. Bei 404 (dead key) einmal `force`-Init + Retry."""
    key = init_storage()
    for attempt in (1, 2):
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data, timeout=120,
        )
        if resp.status_code == 404 and attempt == 1:
            key = init_storage(force=True)
            continue
        resp.raise_for_status()
        return resp.json()
    raise RuntimeError("put_object retry exhausted")


def get_object(path: str) -> Tuple[bytes, str]:
    key = init_storage()
    for attempt in (1, 2):
        resp = requests.get(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key}, timeout=60,
        )
        if resp.status_code == 404 and attempt == 1:
            # Könnte dead-key ODER echt fehlender Path sein — force-init + Retry
            key = init_storage(force=True)
            continue
        if resp.status_code == 404:
            return b"", ""  # File does not exist
        resp.raise_for_status()
        return resp.content, resp.headers.get("Content-Type", "application/octet-stream")
    return b"", ""

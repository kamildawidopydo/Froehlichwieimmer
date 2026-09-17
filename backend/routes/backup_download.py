"""Temporary token-guarded backup download endpoint.

Serves the full-project backup ZIP (or its split parts) generated in
/app/backend/exports/. Requires the ephemeral token stored in
/app/backend/exports/current_token.txt.

Delete this router + folder after the user has downloaded the backup.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import List

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse, JSONResponse

router = APIRouter(prefix="/api", tags=["backup"])

EXPORT_DIR = Path("/app/backend/exports")
TOKEN_FILE = EXPORT_DIR / "current_token.txt"
STAMP_FILE = EXPORT_DIR / "current_stamp.txt"


def _load_token() -> str:
    if not TOKEN_FILE.exists():
        raise HTTPException(404, "No backup available.")
    return TOKEN_FILE.read_text().strip()


def _load_stamp() -> str:
    if not STAMP_FILE.exists():
        raise HTTPException(404, "No backup available.")
    return STAMP_FILE.read_text().strip()


def _check(token: str) -> None:
    expected = _load_token()
    if not token or not expected or token != expected:
        raise HTTPException(401, "Invalid token.")


@router.get("/backup/manifest")
def backup_manifest(token: str = Query(...)) -> JSONResponse:
    _check(token)
    stamp = _load_stamp()
    files: List[dict] = []
    prefix = f"backup_{stamp}.zip"
    for p in sorted(EXPORT_DIR.iterdir()):
        if p.name.startswith(prefix):
            files.append({"name": p.name, "size_bytes": p.stat().st_size})
    return JSONResponse({"stamp": stamp, "files": files, "count": len(files)})


@router.get("/backup/file")
def backup_file(name: str = Query(...), token: str = Query(...)) -> FileResponse:
    _check(token)
    # Only allow files inside EXPORT_DIR, forbid traversal
    safe_name = os.path.basename(name)
    if safe_name != name:
        raise HTTPException(400, "Invalid filename.")
    if not (safe_name.startswith("backup_") and (".zip" in safe_name)):
        raise HTTPException(400, "Invalid filename.")
    p = EXPORT_DIR / safe_name
    if not p.exists():
        raise HTTPException(404, "File not found.")
    return FileResponse(
        p,
        media_type="application/octet-stream",
        filename=safe_name,
        headers={"Cache-Control": "no-store"},
    )

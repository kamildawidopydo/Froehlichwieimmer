"""Temporary token-guarded backup download endpoint.

Serves the full-project backup ZIP (or its split parts) generated in
/app/backend/exports/. Requires the ephemeral token stored in
/app/backend/exports/current_token.txt.

Delete this router + folder after the user has downloaded the backup.
"""
from __future__ import annotations

import os
import re
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Header, HTTPException, Query, Request
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse

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


_RANGE_RE = re.compile(r"bytes=(\d*)-(\d*)")


def _resolve_backup_path(name: str) -> Path:
    safe_name = os.path.basename(name)
    if safe_name != name:
        raise HTTPException(400, "Invalid filename.")
    if not safe_name.startswith("backup_"):
        raise HTTPException(400, "Invalid filename.")
    if not (safe_name.endswith(".tar.gz") or ".zip" in safe_name):
        raise HTTPException(400, "Invalid filename.")
    p = EXPORT_DIR / safe_name
    if not p.exists():
        raise HTTPException(404, "File not found.")
    # Follow symlinks but keep the confined check
    real = p.resolve()
    return real


@router.get("/backup/file")
def backup_file(
    request: Request,
    name: str = Query(...),
    token: str = Query(...),
    range_header: Optional[str] = Header(default=None, alias="Range"),
) -> StreamingResponse:
    _check(token)
    p = _resolve_backup_path(name)
    safe_name = os.path.basename(name)
    file_size = p.stat().st_size

    start = 0
    end = file_size - 1
    status_code = 200
    headers = {
        "Content-Disposition": f'attachment; filename="{safe_name}"',
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-store",
    }

    if range_header:
        m = _RANGE_RE.match(range_header.strip())
        if not m:
            raise HTTPException(416, "Invalid Range header.")
        s, e = m.group(1), m.group(2)
        if s == "" and e == "":
            raise HTTPException(416, "Invalid Range header.")
        if s == "":
            # suffix range: last N bytes
            length = int(e)
            if length <= 0:
                raise HTTPException(416, "Invalid Range header.")
            start = max(0, file_size - length)
            end = file_size - 1
        else:
            start = int(s)
            end = int(e) if e else file_size - 1
        if start >= file_size or end >= file_size or start > end:
            raise HTTPException(
                status_code=416,
                detail="Requested Range Not Satisfiable",
                headers={"Content-Range": f"bytes */{file_size}"},
            )
        status_code = 206
        headers["Content-Range"] = f"bytes {start}-{end}/{file_size}"

    content_length = end - start + 1
    headers["Content-Length"] = str(content_length)

    chunk_size = 1024 * 1024  # 1 MB

    def iterator():
        with open(p, "rb") as f:
            f.seek(start)
            remaining = content_length
            while remaining > 0:
                read_size = min(chunk_size, remaining)
                data = f.read(read_size)
                if not data:
                    break
                remaining -= len(data)
                yield data

    return StreamingResponse(
        iterator(),
        status_code=status_code,
        media_type="application/octet-stream",
        headers=headers,
    )

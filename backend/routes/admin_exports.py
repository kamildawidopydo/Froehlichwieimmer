"""Geschützter Download von Export-Paketen (nur Admins)."""
import os
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

from server import require_admin  # type: ignore[attr-defined]

router = APIRouter(prefix="/api/admin/exports", tags=["admin-exports"])
EXPORT_DIR = Path("/app/exports/packages")


@router.get("")
async def list_exports(_admin: dict = Depends(require_admin)):
    if not EXPORT_DIR.exists():
        return []
    return [{"name": p.name, "size_bytes": p.stat().st_size} for p in sorted(EXPORT_DIR.glob("*.zip"))]


@router.get("/{name}")
async def download_export(name: str, _admin: dict = Depends(require_admin)):
    path = (EXPORT_DIR / os.path.basename(name)).resolve()
    if path.parent != EXPORT_DIR.resolve() or path.suffix != ".zip" or not path.is_file():
        raise HTTPException(status_code=404, detail="Export nicht gefunden")
    return FileResponse(path, media_type="application/zip", filename=path.name)

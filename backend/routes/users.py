"""Session 81.05 — Onboarding-Persistierung von Legacy-Backend auf FastAPI/Mongo migriert.

Root Cause: Legacy-Frontend schrieb Profile-Update über eine externe Auth-User-ID (UUID),
aber `user.id` = FastAPI-Mongo-ObjectId. Bei FastAPI-registrierten Kunden matched das Update
0 Rows bzw. RLS blockiert → generischer Toast „Onboarding konnte nicht gespeichert werden".

Fix: Zwei authentifizierte Endpoints (`GET/PATCH /api/users/onboarding`) speichern und lesen die
Onboarding-Felder direkt im bestehenden Mongo-`users`-Document. `user_id` **ausschließlich**
aus `Depends(get_current_user)` — nie aus Request-Body/Query/Header.
"""
from __future__ import annotations
from typing import List, Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator

from server import db, get_current_user

router = APIRouter(prefix="/api/users", tags=["users"])

ALLOWED_STEP_KEYS = {"profile", "security", "portfolio", "notifications"}
_ONBOARDING_FIELDS = [
    "first_name", "last_name", "phone", "country",
    "street", "house_number", "address_addition", "postal_code", "city",
    "notification_prefs", "email_digest_enabled",
    "onboarding_completed_steps", "onboarding_completed",
]


class OnboardingPatch(BaseModel):
    """Strikte Pydantic-Signatur — Mass-Assignment verhindert (`extra='forbid'`)."""
    model_config = {"extra": "forbid"}

    first_name: Optional[str] = Field(default=None, max_length=80)
    last_name: Optional[str] = Field(default=None, max_length=80)
    phone: Optional[str] = Field(default=None, max_length=40)
    country: Optional[str] = Field(default=None, max_length=8)
    street: Optional[str] = Field(default=None, max_length=120)
    house_number: Optional[str] = Field(default=None, max_length=20)
    address_addition: Optional[str] = Field(default=None, max_length=120)
    postal_code: Optional[str] = Field(default=None, max_length=16)
    city: Optional[str] = Field(default=None, max_length=120)
    notification_prefs: Optional[dict] = None
    email_digest_enabled: Optional[bool] = None
    onboarding_completed_steps: Optional[List[str]] = None
    onboarding_completed: Optional[bool] = None

    @field_validator("first_name", "last_name", "phone", "country",
                     "street", "house_number", "address_addition",
                     "postal_code", "city")
    @classmethod
    def _trim(cls, v):
        if v is None:
            return None
        v = v.strip()
        return v or None

    @field_validator("onboarding_completed_steps")
    @classmethod
    def _steps(cls, v):
        if v is None:
            return None
        cleaned = [s for s in v if isinstance(s, str) and s in ALLOWED_STEP_KEYS]
        return list(dict.fromkeys(cleaned))  # dedup, preserve order


def _slice_onboarding(user_doc: dict) -> dict:
    """Public-Projection der Onboarding-Felder — E-Mail bleibt Auth-Identität."""
    return {k: user_doc.get(k) for k in _ONBOARDING_FIELDS}


@router.get("/onboarding")
async def get_onboarding(user: dict = Depends(get_current_user)):
    doc = await db.users.find_one({"_id": ObjectId(user["id"])})
    if not doc:
        raise HTTPException(404, "User nicht gefunden.")
    return _slice_onboarding(doc)


@router.patch("/onboarding")
async def patch_onboarding(payload: OnboardingPatch, user: dict = Depends(get_current_user)):
    """Aktualisiert Onboarding-Felder des eingeloggten Users.

    Sicherheit: `user_id` kommt AUSSCHLIESSLICH aus `Depends(get_current_user)`
    (JWT-Cookie-Session). Payload darf keinen `user_id`/`email`-Override enthalten
    (`extra='forbid'` im Pydantic-Modell → 422 bei Manipulation).
    """
    update = payload.model_dump(exclude_unset=True, exclude_none=False)
    # Nur explizit gesetzte Felder aktualisieren (None-Werte durchlassen für Clear)
    if not update:
        doc = await db.users.find_one({"_id": ObjectId(user["id"])})
        return _slice_onboarding(doc or {})
    await db.users.update_one(
        {"_id": ObjectId(user["id"])},
        {"$set": update},
    )
    doc = await db.users.find_one({"_id": ObjectId(user["id"])})
    return _slice_onboarding(doc or {})

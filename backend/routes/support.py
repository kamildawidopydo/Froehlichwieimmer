"""
Session 82.70 · Mongo-nativer Customer-Support-Backend.

Ersetzt Supabase-Tabellen `support_tickets` + `support_messages` durch
Mongo-Collections gleichen Namens. Customer-Scope. Ownership serverseitig
aus Cookie-JWT.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Body, Depends, HTTPException
from pydantic import BaseModel, Field

from server import db, get_current_user


router = APIRouter(prefix="/api/support", tags=["support"])


# ─── Serializer ───────────────────────────────────────────────────────
def _iso(v):
    if not v:
        return None
    if isinstance(v, datetime):
        return v.isoformat()
    return str(v)


def _serialize_ticket(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "user_id": str(doc.get("user_id")) if doc.get("user_id") else None,
        "subject": doc.get("subject") or "",
        "category": doc.get("category") or "general",
        "status": doc.get("status") or "open",
        "priority": doc.get("priority") or "normal",
        "created_at": _iso(doc.get("created_at")),
        "updated_at": _iso(doc.get("updated_at")),
        "last_message_at": _iso(doc.get("last_message_at")),
        "unread_for_user": int(doc.get("unread_for_user") or 0),
        "unread_for_admin": int(doc.get("unread_for_admin") or 0),
    }


def _serialize_message(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "ticket_id": str(doc.get("ticket_id")) if doc.get("ticket_id") else None,
        "sender_id": str(doc.get("sender_id")) if doc.get("sender_id") else None,
        "sender_role": doc.get("sender_role") or "user",
        "body": doc.get("body") or "",
        "created_at": _iso(doc.get("created_at")),
        "read_at": _iso(doc.get("read_at")),
    }


# ─── Indizes ──────────────────────────────────────────────────────────
async def ensure_support_indexes(db_) -> None:
    await db_.support_tickets.create_index(
        [("user_id", 1), ("updated_at", -1)], name="user_updated_desc",
    )
    await db_.support_tickets.create_index(
        [("status", 1), ("updated_at", -1)], name="status_updated_desc",
    )
    await db_.support_messages.create_index(
        [("ticket_id", 1), ("created_at", 1)], name="ticket_created_asc",
    )


# ─── Schemas ──────────────────────────────────────────────────────────
class TicketCreateIn(BaseModel):
    subject: str = Field(..., min_length=1, max_length=200)
    category: Optional[str] = Field(default="general", max_length=40)
    body: str = Field(..., min_length=1, max_length=8000)
    model_config = {"extra": "forbid"}


class MessageCreateIn(BaseModel):
    body: str = Field(..., min_length=1, max_length=8000)
    model_config = {"extra": "forbid"}


def _uid(user: dict) -> ObjectId:
    return ObjectId(user["id"])


# ─── Endpoints ────────────────────────────────────────────────────────
@router.get("/tickets")
async def list_tickets(user: dict = Depends(get_current_user)):
    cursor = db.support_tickets.find({"user_id": _uid(user)}).sort([
        ("last_message_at", -1), ("created_at", -1)
    ]).limit(200)
    return [_serialize_ticket(d) async for d in cursor]


@router.post("/tickets", status_code=201)
async def create_ticket(payload: TicketCreateIn = Body(...), user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    uid = _uid(user)
    ticket_doc = {
        "user_id": uid,
        "subject": payload.subject.strip(),
        "category": (payload.category or "general").strip().lower(),
        "status": "open",
        "priority": "normal",
        "created_at": now,
        "updated_at": now,
        "last_message_at": now,
        "unread_for_user": 0,
        "unread_for_admin": 1,
    }
    res = await db.support_tickets.insert_one(ticket_doc)
    ticket_doc["_id"] = res.inserted_id
    msg_doc = {
        "ticket_id": res.inserted_id,
        "sender_id": uid,
        "sender_role": "user",
        "body": payload.body.strip(),
        "created_at": now,
        "read_at": None,
    }
    await db.support_messages.insert_one(msg_doc)
    return _serialize_ticket(ticket_doc)


def _validate_oid(s: str) -> ObjectId:
    try:
        return ObjectId(s)
    except Exception:
        raise HTTPException(status_code=404, detail="Ticket nicht gefunden.")


async def _get_owned_ticket(tid: str, user: dict) -> dict:
    oid = _validate_oid(tid)
    doc = await db.support_tickets.find_one({"_id": oid, "user_id": _uid(user)})
    if not doc:
        raise HTTPException(status_code=404, detail="Ticket nicht gefunden.")
    return doc


@router.get("/tickets/{ticket_id}")
async def get_ticket(ticket_id: str, user: dict = Depends(get_current_user)):
    doc = await _get_owned_ticket(ticket_id, user)
    return _serialize_ticket(doc)


@router.get("/tickets/{ticket_id}/messages")
async def list_messages(ticket_id: str, user: dict = Depends(get_current_user)):
    ticket = await _get_owned_ticket(ticket_id, user)
    cursor = db.support_messages.find({"ticket_id": ticket["_id"]}).sort([("created_at", 1)])
    return [_serialize_message(d) async for d in cursor]


@router.post("/tickets/{ticket_id}/messages", status_code=201)
async def create_message(
    ticket_id: str,
    payload: MessageCreateIn = Body(...),
    user: dict = Depends(get_current_user),
):
    ticket = await _get_owned_ticket(ticket_id, user)
    if ticket.get("status") == "closed":
        raise HTTPException(status_code=400, detail="Ticket ist geschlossen.")
    now = datetime.now(timezone.utc)
    msg = {
        "ticket_id": ticket["_id"],
        "sender_id": _uid(user),
        "sender_role": "user",
        "body": payload.body.strip(),
        "created_at": now,
        "read_at": None,
    }
    res = await db.support_messages.insert_one(msg)
    msg["_id"] = res.inserted_id
    await db.support_tickets.update_one(
        {"_id": ticket["_id"]},
        {
            "$set": {"updated_at": now, "last_message_at": now, "status": "open"},
            "$inc": {"unread_for_admin": 1},
        },
    )
    return _serialize_message(msg)


@router.post("/tickets/{ticket_id}/read")
async def mark_read(ticket_id: str, user: dict = Depends(get_current_user)):
    ticket = await _get_owned_ticket(ticket_id, user)
    now = datetime.now(timezone.utc)
    await db.support_tickets.update_one(
        {"_id": ticket["_id"]},
        {"$set": {"unread_for_user": 0, "updated_at": now}},
    )
    await db.support_messages.update_many(
        {"ticket_id": ticket["_id"], "sender_role": "admin", "read_at": None},
        {"$set": {"read_at": now}},
    )
    return {"status": "ok"}

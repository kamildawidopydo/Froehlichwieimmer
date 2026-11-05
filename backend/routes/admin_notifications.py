"""Session 82.98 — Admin Notification-Counts (aggregated read-only).

Ersetzt die 9 Supabase-Realtime-Channels aus `AdminGlobalNotifications.jsx`
und `AdminDashboardLayout.jsx` durch einen einzigen Poll-Endpoint. Jede
Zahl kommt aus einer echten Mongo-Count-Abfrage. Fehlt eine Datenquelle
(Legacy-Supabase-Collection nie migriert), liefern wir `null` (nicht 0!),
damit das UI faithful Empty-States anzeigen kann.

Keine Fake-Notifications · keine synthetischen Events · kein WebSocket ·
kein SSE. Reines Read-Only.
"""
from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorClient

from server import require_admin  # type: ignore  # noqa: E402

_client = AsyncIOMotorClient(os.environ["MONGO_URL"], tz_aware=True)
_db = _client[os.environ["DB_NAME"]]

router = APIRouter(prefix="/api/admin/notifications", tags=["admin-notifications"])


async def _count_or_none(collection: str, query: Dict[str, Any]) -> Optional[int]:
    """Zählt genau dann, wenn die Collection existiert. Kein Fake-Fallback."""
    try:
        names = await _db.list_collection_names(filter={"name": collection})
        if not names:
            return None
        return await _db[collection].count_documents(query)
    except Exception:
        return None


async def _support_unread_total() -> Optional[int]:
    try:
        names = await _db.list_collection_names(filter={"name": "support_tickets"})
        if not names:
            return None
        pipeline = [
            {"$project": {"unread_for_admin": 1}},
            {"$group": {"_id": None, "total": {"$sum": {"$ifNull": ["$unread_for_admin", 0]}}}},
        ]
        cursor = _db.support_tickets.aggregate(pipeline)
        docs = await cursor.to_list(1)
        return int(docs[0]["total"]) if docs else 0
    except Exception:
        return None


@router.get("/counts")
async def admin_notification_counts(
    _admin: dict = Depends(require_admin),
) -> Dict[str, Any]:
    """Aggregierte Pending-Counts für Admin-Sidebar + Toast-Diff.

    Legacy-Namen der 16 Badges (aus `AdminDashboardLayout.jsx`) bleiben
    stabil, damit das Frontend ein `key`-Mapping ohne Umbau nutzen kann.
    """
    counts: Dict[str, Optional[int]] = {}

    # Real vorhandene Collections
    counts["pending_orders"] = await _count_or_none("stock_orders", {"status": "pending"})
    counts["pending_bond_requests"] = await _count_or_none(
        "bond_purchase_requests", {"status": "pending"}
    )
    counts["bond_offer_responses"] = await _count_or_none(
        "bond_purchase_requests",
        {"offer.status": {"$in": ["accepted", "declined"]}, "offer.admin_seen": False},
    )
    counts["pending_ipo_requests"] = await _count_or_none(
        "ipo_requests", {"status": "pending"}
    )
    counts["pending_support"] = await _support_unread_total()
    counts["pending_offer_interests"] = await _count_or_none("offer_interests", {})

    # Session 82.100 · aktiviert für Collections mit neuen Mongo-Endpoints.
    # Existiert die Collection nicht → `_count_or_none` liefert weiterhin null.
    counts["pending_credit_leads"] = await _count_or_none("credit_leads", {"status": "new"})
    counts["pending_product_inquiry"] = await _count_or_none("product_inquiry_leads", {"status": "new"})
    counts["pending_social_preview"] = await _count_or_none("social_preview_messages", {"status": "new"})
    counts["pending_contract_submissions"] = await _count_or_none("contract_form_submissions", {"status": "new"})
    counts["failed_contract_admin_email"] = await _count_or_none("contract_form_submissions", {"admin_email_sent": False})
    counts["pending_document_uploads"] = await _count_or_none("document_upload_submissions", {"status": "new"})
    counts["pending_payout_requests"] = await _count_or_none("payout_requests", {"status": "pending"})

    # Nicht migriert (siehe 82.95-Audit)
    counts["pending_users"] = None                       # `profiles.status=pending` — Legacy
    counts["pending_applications"] = None                # `applications.status=Neu`
    counts["pending_offer_reviews"] = None               # `offer_reviews.status=pending`
    counts["failed_application_email"] = None            # `application_email_outbox.status=failed`
    counts["pending_insufficient_buying_power"] = None   # `insufficient_buying_power_events.status=new`

    return {
        "counts": counts,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

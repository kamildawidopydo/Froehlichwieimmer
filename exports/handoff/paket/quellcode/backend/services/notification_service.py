"""Session 82.52 — Financial Event Notifications.

Insert idempotent side-effect notifications into `stock_alert_notifications`
AFTER a financial saga has reached its `completed` terminal state.

Contract:
    * MUST be called only after status == "completed".
    * MUST be non-critical: if insert fails, the caller MUST log & continue —
      the financial saga stays completed.
    * MUST be idempotent via deterministic `event_key`:
        - order-executed:{order_id}
        - ipo-allocated:{request_id}
        - bond-executed:{request_id}
    * MUST NOT leak cross-user data (user_id is a required argument, never
      derived from client input).
    * MUST NOT trigger any global banner (81.35 / 82.35 semantics).
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId

logger = logging.getLogger(__name__)


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def insert_financial_notification(
    db,
    *,
    user_id: str,
    event_type: str,
    event_key: str,
    title: str,
    message: str,
    route: Optional[str] = None,
    symbol: Optional[str] = None,
    isin: Optional[str] = None,
    reference_type: Optional[str] = None,
    reference_id: Optional[str] = None,
) -> Optional[ObjectId]:
    """Idempotent side-effect notification insert.

    Returns the inserted ObjectId or None (dedupe hit / insert failure).
    Failures are logged, never raised — the financial saga must not roll back
    because a notification write failed.
    """
    try:
        # Idempotency guard — same event_key means we already notified.
        existing = await db.stock_alert_notifications.find_one({"event_key": event_key})
        if existing is not None:
            return None
        doc = {
            "user_id": str(user_id),
            "type": event_type,
            "title": title,
            "body": message,
            "route": route,
            "symbol": symbol,
            "isin": isin,
            "reference_type": reference_type,
            "reference_id": reference_id,
            "event_key": event_key,
            "triggered_at": _now(),
            "seen": False,
        }
        res = await db.stock_alert_notifications.insert_one(doc)
        return res.inserted_id
    except Exception:  # noqa: BLE001
        logger.exception(
            "insert_financial_notification failed event_key=%s type=%s",
            event_key,
            event_type,
        )
        return None


def format_eur_de(value) -> str:
    """Format numeric value as DE-locale EUR (`232,10 €`). Best-effort."""
    try:
        f = float(value)
        s = f"{f:,.2f}"  # 1,234.56
        # swap separators to DE
        s = s.replace(",", "§").replace(".", ",").replace("§", ".")
        return f"{s} €"
    except Exception:  # noqa: BLE001
        return str(value)


def format_pct_de(value) -> str:
    try:
        f = float(value)
        s = f"{f:,.2f}"
        s = s.replace(",", "§").replace(".", ",").replace("§", ".")
        return f"{s} %"
    except Exception:  # noqa: BLE001
        return str(value)

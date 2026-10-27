"""Kunden-E-Mails im Stil B (Modern hell): Willkommen, Upload, Auszahlung, Dokument, Order."""
from __future__ import annotations

import asyncio
import logging
import os
from html import escape
from typing import Iterable, Optional, Sequence, Tuple

logger = logging.getLogger(__name__)
_BG: set = set()

FIRM = "Fröhlich Vermögensberatung GmbH · Bösgrunder Weg 62 · 55543 Bad Kreuznach"
LEGAL = "Amtsgericht Bad Kreuznach · HRB 23436 · Geschäftsführer: Manfred Franz Fröhlich"


def _site() -> str:
    return (os.environ.get("FRONTEND_URL") or "https://essenceinvest.com").rstrip("/")


def eur(v) -> str:
    try:
        n = float(v)
    except (TypeError, ValueError):
        return "–"
    return f"{n:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".") + " €"


def mask_iban(iban: str) -> str:
    s = (iban or "").replace(" ", "")
    return f"{s[:4]} •••• •••• {s[-4:]}" if len(s) > 8 else s


def render(title: str, lead: str, rows: Sequence[Tuple[str, str]], cta: str, path: str,
           steps: Iterable[str] = (), note: Optional[str] = None) -> str:
    row_html = "".join(
        f"<tr><td style='padding:9px 0;color:#686A64;font-size:13px;border-bottom:1px solid #E8E4DA;'>{escape(k)}</td>"
        f"<td style='padding:9px 0;text-align:right;font-size:13px;font-weight:600;border-bottom:1px solid #E8E4DA;'>{escape(str(v))}</td></tr>"
        for k, v in rows
    )
    steps = list(steps)
    step_html = ""
    if steps:
        items = "".join(
            f"<tr><td style='width:28px;vertical-align:top;'><span style='display:inline-block;width:20px;height:20px;border-radius:50%;"
            f"background:#36A852;color:#fff;font-size:11px;line-height:20px;text-align:center;'>{i}</span></td>"
            f"<td style='font-size:13px;padding:0 0 10px;color:#252722;'>{escape(s)}</td></tr>"
            for i, s in enumerate(steps, 1)
        )
        step_html = ("<p style='font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:#686A64;margin:22px 0 10px;'>"
                     f"So geht es weiter</p><table>{items}</table>")
    note_html = f"<p style='font-size:13px;line-height:1.6;color:#555;margin:18px 0 0;'>{escape(note)}</p>" if note else ""
    return f"""<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;background:#F7F5F0;padding:26px;color:#252722;">
<div style="border-top:4px solid #36A852;background:#fff;padding:30px;border-radius:14px;">
<p style="margin:0;font-size:12px;font-weight:700;color:#36A852;">Fröhlich Vermögensberatung</p>
<h1 style="margin:14px 0 8px;font-size:24px;line-height:1.25;color:#252722;">{escape(title)}</h1>
<p style="font-size:14.5px;line-height:1.6;color:#555;margin:0 0 20px;">{escape(lead)}</p>
<div style="background:#F7F5F0;border-radius:10px;padding:6px 16px;"><table style="width:100%;border-collapse:collapse;">{row_html}</table></div>
{step_html}{note_html}
<p style="margin:26px 0 0;"><a href="{_site()}{path}" style="display:inline-block;background:#36A852;color:#fff;padding:13px 28px;text-decoration:none;font-size:14px;font-weight:600;border-radius:999px;">{escape(cta)} →</a></p>
<p style="font-size:13px;margin:24px 0 0;color:#252722;">Mit freundlichen Grüßen<br>Ihr Team der Fröhlich Vermögensberatung</p></div>
<p style="font-size:10.5px;color:#9B9A93;text-align:center;line-height:1.6;margin:18px 0 0;">{FIRM}<br>{LEGAL}</p></div>"""


def send_later(to: Optional[str], subject: str, html: str) -> None:
    """Versand im Hintergrund; Fehler werden nur geloggt."""
    if not to:
        return
    from server import _send_email_via_emergent

    async def _run() -> None:
        for attempt in range(3):
            try:
                await _send_email_via_emergent(to=to, subject=subject, html=html)
                return
            except Exception as exc:
                if attempt == 2 or "429" not in str(exc):
                    logger.warning("customer mail '%s' to %s failed: %s", subject, to, exc)
                    return
                await asyncio.sleep(1.5 * (attempt + 1))

    task = asyncio.create_task(_run())
    _BG.add(task)
    task.add_done_callback(_BG.discard)


def greet(name: Optional[str]) -> str:
    return f"Herzlich willkommen, {name}" if name else "Herzlich willkommen"

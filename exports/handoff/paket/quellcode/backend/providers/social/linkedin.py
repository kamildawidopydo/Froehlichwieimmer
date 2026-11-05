"""LinkedIn REST API Publisher (Session 80.1).

Aktuelle offizielle LinkedIn REST-API (Stand Feb 2026):
- Endpoint: ``POST https://api.linkedin.com/rest/posts`` (ersetzt das deprecated
  ``ugcPosts``).
- Header: ``Authorization: Bearer …``, ``LinkedIn-Version: YYYYMM``,
  ``X-Restli-Protocol-Version: 2.0.0``, ``Content-Type: application/json``.
- Scope: ``w_organization_social`` (gated, Marketing Developer Program).
- Autor: ``urn:li:organization:{id}`` — der authentifizierte Nutzer muss
  ADMINISTRATOR/CONTENT_ADMIN/DIRECT_SPONSORED_CONTENT_POSTER auf der Seite sein.
- Permission-Probe (read-only): ``GET /rest/organizationAuthorizations?…``.

Design
------
Reine Provider-Schicht — keine DB-Zugriffe, keine Endpoints, keine Logs von
Secrets. Wird von ``social_content`` aufgerufen, das alle State-Transitions
und den At-most-once-Lock verwaltet.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

BASE_URL = "https://api.linkedin.com/rest"
# LinkedIn releases monthly versions in `YYYYMM` format; use a supported one.
# Kann per ENV überschrieben werden, wenn LinkedIn eine ältere Version deprecatet.
API_VERSION = os.environ.get("LINKEDIN_API_VERSION", "202608")
DEFAULT_TIMEOUT = float(os.environ.get("LINKEDIN_HTTP_TIMEOUT", "12.0"))


def _org_urn_from_env() -> Optional[str]:
    org_id = (os.environ.get("LINKEDIN_ORGANIZATION_ID") or "").strip()
    if not org_id:
        return None
    # Erlaube sowohl reine ID („1234567") als auch bereits gebildete URN.
    if org_id.startswith("urn:li:organization:"):
        return org_id
    if org_id.isdigit():
        return f"urn:li:organization:{org_id}"
    return None


def is_configured() -> bool:
    return bool(
        (os.environ.get("LINKEDIN_ACCESS_TOKEN") or "").strip()
        and _org_urn_from_env()
    )


def public_config_summary() -> dict:
    """Für Admin-UI — NIEMALS Token/Secret ausgeben."""
    org_urn = _org_urn_from_env()
    return {
        "provider": "linkedin",
        "configured": is_configured(),
        "has_access_token": bool((os.environ.get("LINKEDIN_ACCESS_TOKEN") or "").strip()),
        "organization_urn": org_urn,
        "api_version": API_VERSION,
        "auto_publish_enabled": (os.environ.get("LINKEDIN_AUTO_PUBLISH_ENABLED", "false").lower() == "true"),
    }


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {os.environ['LINKEDIN_ACCESS_TOKEN']}",
        "LinkedIn-Version": API_VERSION,
        "X-Restli-Protocol-Version": "2.0.0",
        "Content-Type": "application/json",
    }


def build_payload(*, commentary: str, author_urn: Optional[str] = None) -> dict:
    """Erzeugt den Payload-Body für ``POST /rest/posts`` (organische Publikation)."""
    author = author_urn or _org_urn_from_env()
    if not author:
        raise ValueError("LINKEDIN_ORGANIZATION_ID missing — cannot build payload")
    if not commentary or len(commentary) < 20:
        raise ValueError("commentary too short")
    if len(commentary) > 3000:
        raise ValueError("commentary too long (>3000)")
    return {
        "author": author,
        "commentary": commentary,
        "visibility": "PUBLIC",
        "distribution": {
            "feedDistribution": "MAIN_FEED",
            "targetEntities": [],
            "thirdPartyDistributionChannels": [],
        },
        "lifecycleState": "PUBLISHED",
        "isReshareDisabledByAuthor": False,
    }


async def validate_credentials() -> dict:
    """Read-only Permission-Probe — postet nichts.

    Ruft ``GET /rest/organizationAuthorizations?q=roleAssignee`` mit dem
    aktuellen Token auf. Prüft:
      - Token gültig (kein 401)
      - benötigter Scope reicht (kein 403)
      - Ziel-Organization ist in der Antwort enthalten
    """
    result = {
        "configured": is_configured(),
        "token_valid": False,
        "scopes_ok": False,
        "organization_accessible": False,
        "http_status": None,
        "error": None,
        "api_version": API_VERSION,
    }
    if not is_configured():
        result["error"] = "credentials_missing"
        return result

    target_urn = _org_urn_from_env()
    url = f"{BASE_URL}/organizationAuthorizations?q=roleAssignee"
    try:
        async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:
            r = await client.get(url, headers=_headers())
        result["http_status"] = r.status_code
        if r.status_code == 401:
            result["error"] = "token_invalid_or_expired"
            return result
        if r.status_code == 403:
            result["token_valid"] = True
            result["error"] = "scope_missing_or_role_missing"
            return result
        if r.status_code >= 400:
            result["error"] = f"http_{r.status_code}"
            return result
        data = r.json()
        result["token_valid"] = True
        result["scopes_ok"] = True
        elements = data.get("elements") or []
        # Elemente enthalten `organizationalTarget` als URN; wir matchen exakt.
        found = any((el.get("organizationalTarget") or el.get("organization")) == target_urn for el in elements)
        result["organization_accessible"] = bool(found)
        if not found:
            result["error"] = "organization_not_authorized_for_token"
    except httpx.TimeoutException:
        result["error"] = "timeout"
    except Exception as exc:  # noqa: BLE001
        result["error"] = f"{type(exc).__name__}"
        logger.warning("linkedin: validate_credentials failed: %s", exc)
    return result


class LinkedInPublishError(Exception):
    def __init__(self, kind: str, message: str, http_status: Optional[int] = None,
                 provider_ref: Optional[str] = None):
        super().__init__(message)
        self.kind = kind  # credentials, rate_limited, provider_error, timeout, payload_invalid, unknown
        self.message = message
        self.http_status = http_status
        self.provider_ref = provider_ref


async def publish(commentary: str, *, author_urn: Optional[str] = None) -> dict:
    """Führt genau EINEN Publish-Call gegen die LinkedIn REST-API aus.

    Rückgabe bei Erfolg:
        {"external_post_id": "urn:li:share:…", "external_post_url": "https://…"}
    """
    if not is_configured():
        raise LinkedInPublishError("credentials", "LinkedIn provider is not configured")
    payload = build_payload(commentary=commentary, author_urn=author_urn)
    url = f"{BASE_URL}/posts"
    try:
        async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:
            r = await client.post(url, headers=_headers(), json=payload)
    except httpx.TimeoutException as exc:
        # Timeout: unbekannt ob LinkedIn bereits verarbeitet hat → NIE blind retryen.
        raise LinkedInPublishError("timeout", "linkedin timeout — manual review required") from exc

    if r.status_code == 401:
        raise LinkedInPublishError("credentials", "linkedin 401 — token invalid", http_status=401)
    if r.status_code == 403:
        raise LinkedInPublishError("credentials", "linkedin 403 — scope/role missing", http_status=403)
    if r.status_code == 429:
        raise LinkedInPublishError("rate_limited", "linkedin 429 — retry later", http_status=429)
    if r.status_code >= 500:
        raise LinkedInPublishError("provider_error", f"linkedin {r.status_code}", http_status=r.status_code)
    if r.status_code >= 400:
        body_snippet = (r.text or "")[:300]
        raise LinkedInPublishError("payload_invalid", f"linkedin {r.status_code}: {body_snippet}",
                                   http_status=r.status_code)

    # LinkedIn REST /rest/posts liefert den Post-URN im Header `x-restli-id` (bevorzugt)
    # oder im Body-Feld `id`.
    external_post_id = r.headers.get("x-restli-id") or (r.json() or {}).get("id")
    if not external_post_id:
        raise LinkedInPublishError("unknown", "linkedin returned 2xx without post id")
    # LinkedIn liefert Share-URLs traditionell nicht direkt zurück. Für organische
    # Posts konstruieren wir die kanonische URL aus dem numerischen Suffix.
    numeric = external_post_id.rsplit(":", 1)[-1]
    external_post_url = f"https://www.linkedin.com/feed/update/urn:li:share:{numeric}/"
    return {"external_post_id": external_post_id, "external_post_url": external_post_url}

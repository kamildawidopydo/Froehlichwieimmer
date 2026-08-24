"""News-Routen (Session 78.4 — server.py Modularisierung Wave 3).

Extrahiert 33 News-bezogene HTTP-Endpoints aus `server.py`. Rein struktureller
Refactor: die Funktions-**Bodies** (inkl. Signaturen, Response-Models,
Dependencies, Docstrings, Error-Handling) bleiben unverändert in server.py.
Dieses Modul entfernt lediglich die `@api.<verb>(...)`-Decorators dort und
registriert dieselben Callables gegen einen dedizierten APIRouter.

Warum dieser Shim-Ansatz?
- 100 % API-Vertragserhalt: gleiche URLs, Methoden, Query-Parameter, Response-
  Shapes, Statuscodes, Auth-Guards.
- Keine Code-Duplikation: keine Logik in zwei Dateien.
- Keine Import-Zyklen: `server.py` importiert am Ende `from routes import news`,
  zu diesem Zeitpunkt sind alle Namen (Funktionen, Modelle, DB-Handles) im
  `server`-Modul bereits definiert.

Verbleibende News-nahe Endpoints, die absichtlich **nicht** hier registriert
sind:
- `/api/content/news`          → Content-Router (Bank-/Offer-Content, kein News-Pipeline).
- `/api/newsletter/*`          → Newsletter-Digest (eigenständiges Feature).
- `/api/admin/news*`           → Investment-Topic-Mapping (registriert via
                                 `_register_investment_topics(api, db, …)`).
- `/api/news/by-slugs`         → bereits in `investment_topics.py` gepflegt.
"""
from __future__ import annotations

from typing import List

from fastapi import APIRouter

# --- Imports aus server (top-level, weil dieses Modul erst am Ende von
#     server.py geladen wird — Namen sind zu diesem Zeitpunkt vollständig).
from server import (
    # Response-Model-Klassen
    MarketInsight,
    EditorialOut,
    # /news-markte/* — Block 1
    news_markte_feed,
    news_markte_markets,
    list_editorial,
    list_editorial_admin,
    create_editorial,
    update_editorial,
    delete_editorial,
    list_anlagetrends,
    list_investment_radar,
    list_market_voices,
    get_preferences,
    update_preferences,
    news_for_you,
    # /news-markte/market/* + /symbol[s]/news
    market_overview,
    market_stocks,
    market_indices,
    market_commodities,
    market_fx,
    market_quote,
    market_quotes,
    market_sparkline,
    symbol_news,
    symbol_news_batch,
    # /news/admin/*
    _admin_fetch_feeds,
    _admin_synthesize,
    _admin_news_list,
    _admin_news_image_sweep,
    _admin_purge_demo,
    _admin_news_status,
    # /news/nachrichten* + /news/publishers
    news_nachrichten_list,
    news_publishers_list,
    news_nachrichten_detail,
    news_nachrichten_related,
)

router = APIRouter(prefix="/api", tags=["news"])


def _add(path: str, endpoint, methods: List[str], **kwargs) -> None:
    """Thin wrapper for `router.add_api_route` to keep the registration table
    dense and readable."""
    router.add_api_route(path, endpoint, methods=methods, **kwargs)


# --- /news-markte/* (Block 1) ------------------------------------------------

_add("/news-markte/feed", news_markte_feed, methods=["GET"])
_add("/news-markte/markets", news_markte_markets, methods=["GET"], response_model=List[MarketInsight])

_add("/news-markte/editorial", list_editorial, methods=["GET"], response_model=List[EditorialOut])
_add("/news-markte/editorial/admin", list_editorial_admin, methods=["GET"], response_model=List[EditorialOut])
_add("/news-markte/editorial", create_editorial, methods=["POST"], response_model=EditorialOut)
_add("/news-markte/editorial/{post_id}", update_editorial, methods=["PUT"], response_model=EditorialOut)
_add("/news-markte/editorial/{post_id}", delete_editorial, methods=["DELETE"])

_add("/news-markte/anlagetrends", list_anlagetrends, methods=["GET"])
_add("/news-markte/investment-radar", list_investment_radar, methods=["GET"])
_add("/news-markte/market-voices", list_market_voices, methods=["GET"])

_add("/news-markte/preferences", get_preferences, methods=["GET"])
_add("/news-markte/preferences", update_preferences, methods=["PUT"])
_add("/news-markte/for-you", news_for_you, methods=["GET"])


# --- /news-markte/market/* + /news-markte/symbol[s]/news ---------------------

_add("/news-markte/market/overview", market_overview, methods=["GET"])
_add("/news-markte/market/stocks", market_stocks, methods=["GET"])
_add("/news-markte/market/indices", market_indices, methods=["GET"])
_add("/news-markte/market/commodities", market_commodities, methods=["GET"])
_add("/news-markte/market/fx", market_fx, methods=["GET"])
_add("/news-markte/market/quote/{symbol}", market_quote, methods=["GET"])
_add("/news-markte/market/quotes", market_quotes, methods=["GET"])
_add("/news-markte/market/sparkline/{symbol}", market_sparkline, methods=["GET"])
_add("/news-markte/symbol/{symbol}/news", symbol_news, methods=["GET"])
_add("/news-markte/symbols/news", symbol_news_batch, methods=["GET"])


# --- /news/admin/* -----------------------------------------------------------

_add("/news/admin/fetch-feeds", _admin_fetch_feeds, methods=["POST"], summary="Admin: RSS-Feeds sofort abrufen")
_add("/news/admin/synthesize", _admin_synthesize, methods=["POST"], summary="Admin: neue Artikel synthetisieren")
_add("/news/admin/list", _admin_news_list, methods=["GET"], summary="Admin: alle Artikel inkl. needs_review")
_add("/news/admin/image-sweep", _admin_news_image_sweep, methods=["POST"], summary="Admin: alle publizierten Bild-URLs revalidieren")
_add("/news/admin/purge-demo", _admin_purge_demo, methods=["POST"], summary="Admin: DEMO-Nachrichten aus DB entfernen")
_add("/news/admin/status", _admin_news_status, methods=["GET"], summary="Admin: News-Pipeline Freshness & Health")


# --- /news/nachrichten* + /news/publishers (public) --------------------------

_add("/news/nachrichten", news_nachrichten_list, methods=["GET"])
_add("/news/publishers", news_publishers_list, methods=["GET"])
_add("/news/nachrichten/{slug}", news_nachrichten_detail, methods=["GET"])
_add("/news/nachrichten/{slug}/related", news_nachrichten_related, methods=["GET"])

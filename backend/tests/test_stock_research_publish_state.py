"""Session 79.2 — Regression: Publish-State-Semantik in `_sync_analysts`.

Sichert dauerhaft ab, dass ein manueller Sync ohne `auto_publish=True` KEINE
bereits publizierten Rows zurück auf Draft schaltet. Der Bug wurde in
Session 79.2 gefixt (chirurgischer Change in
`routes/stock_research_sync.py::_sync_analysts`).

Testfälle:
  1. Existing published row + auto_publish=False   → published bleibt True
  2. Existing draft row     + auto_publish=False   → published bleibt False
  3. New provider row       + auto_publish=False   → published=False (Draft-First)
  4. Valid row              + auto_publish=True    → published=True (guard passes)
  5. Invalid row (missing current_price)  + auto_publish=True
                                                    → published=False (guard fails)

Die Tests umgehen den vollen Ingest-Pfad und rufen `_sync_analysts` direkt
mit einem in-memory-Fake-DB an, das nur die von der Funktion tatsächlich
angesprochenen Motor-Methoden nachbaut. Kein Netzwerkzugriff, kein Yahoo.
"""
from __future__ import annotations

import asyncio
import copy
import os
import sys
import uuid
from datetime import datetime, timezone
from typing import Any

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# --- Fake-Mongo (minimal, für _sync_analysts) --------------------------------

def _match(doc: dict, query: dict) -> bool:
    for k, v in query.items():
        if k == "$or":
            if not any(_match(doc, sub) for sub in v):
                return False
            continue
        if isinstance(v, dict):
            for op, arg in v.items():
                val = doc.get(k)
                if op == "$in":
                    if val not in arg:
                        return False
                elif op == "$exists":
                    if arg and k not in doc:
                        return False
                    if not arg and k in doc:
                        return False
                elif op == "$ne":
                    if doc.get(k) == arg:
                        return False
                else:
                    raise NotImplementedError(op)
        else:
            if doc.get(k) != v:
                return False
    return True


class _Cursor:
    def __init__(self, docs):
        self._docs = list(docs)

    def __aiter__(self):
        self._iter = iter(self._docs)
        return self

    async def __anext__(self):
        try:
            return next(self._iter)
        except StopIteration:
            raise StopAsyncIteration


class _FakeCollection:
    def __init__(self):
        self._docs: dict = {}

    async def find_one(self, query, projection=None, sort=None):
        for d in self._docs.values():
            if _match(d, query):
                return copy.deepcopy(d)
        return None

    def find(self, query=None, projection=None):
        query = query or {}
        return _Cursor([copy.deepcopy(d) for d in self._docs.values() if _match(d, query)])

    async def update_one(self, filt, update, upsert=False):
        for d in self._docs.values():
            if _match(d, filt):
                if "$set" in update:
                    d.update(update["$set"])
                class _R:
                    modified_count = 1
                return _R()
        class _R:
            modified_count = 0
        return _R()

    async def insert_one(self, doc):
        d = copy.deepcopy(doc)
        d.setdefault("_id", uuid.uuid4().hex)
        self._docs[d["_id"]] = d

    async def count_documents(self, q):
        return sum(1 for d in self._docs.values() if _match(d, q))

    async def create_index(self, *a, **kw):
        return "idx"

    def seed(self, doc: dict):
        d = copy.deepcopy(doc)
        d.setdefault("_id", uuid.uuid4().hex)
        self._docs[d["_id"]] = d


class _FakeDB:
    def __init__(self):
        self.stock_research = _FakeCollection()
        self.stock_research_rejects = _FakeCollection()


# --- Fake-Provider (deterministisch) -----------------------------------------

class _FakeRow:
    def __init__(self, ticker, company_name, target_price, currency="EUR",
                 rating="Strong Buy", record_type="provider_consensus"):
        self.ticker = ticker
        self.company_name = company_name
        self.analyst = None
        self.research_house = None
        self.rating = rating
        self.target_price = target_price
        self.currency = currency
        self.source_name = "Test Provider"
        self.source_url = "https://example.test"
        self.research_date = datetime.now(timezone.utc)
        self.fetched_at = datetime.now(timezone.utc)
        self._provider_meta = {"record_type": record_type, "number_analysts": 12}


class _FakeProvider:
    name = "test-provider"
    available = True

    def __init__(self, rows):
        self._rows = rows

    async def fetch(self, tickers):
        return list(self._rows)


# --- Helpers -----------------------------------------------------------------

def _run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


def _install_sync_module_with_fake_db(fake_db, fake_provider):
    """Patcht das echte Modul so, dass `_sync_analysts` gegen den Fake läuft.

    Wichtig: `server.py` MUSS zuerst importiert werden, weil
    `routes.stock_research_sync` `from server import db, require_admin` macht.
    Ohne Vor-Import würde bei Test-Kollektion ein zirkulärer Import entstehen
    (server importiert stock_research_sync am Ende, stock_research_sync importiert
    server oben).
    """
    import importlib
    import server  # noqa: F401  — triggers full route registration
    import providers.fx_yfinance as fxmod
    original_get_fx = fxmod.get_fx_rate

    async def _stub_fx(a, b):
        return 1.0

    fxmod.get_fx_rate = _stub_fx

    mod = importlib.import_module("routes.stock_research_sync")
    original_db = mod.db
    original_provider_fn = mod._analyst_provider

    mod.db = fake_db
    mod._analyst_provider = lambda: fake_provider

    def _restore():
        mod.db = original_db
        mod._analyst_provider = original_provider_fn
        fxmod.get_fx_rate = original_get_fx

    return mod, _restore


# --- Tests --------------------------------------------------------------------

def test_existing_published_row_stays_published_when_auto_publish_false():
    async def _t():
        db = _FakeDB()
        # Dedupe-Key wird vom Sync neu berechnet — wir müssen sicherstellen,
        # dass der Fake nach demselben Key findet. Wir seeden mit einem
        # Placeholder-Key, überschreiben aber gleich mit dem echten Key nach
        # dem ersten Sync-Lauf (siehe unten).
        row = _FakeRow("NVDA", "NVIDIA", 300.0, currency="EUR")
        provider = _FakeProvider([row])
        mod, restore = _install_sync_module_with_fake_db(db, provider)
        try:
            # 1. Erster Sync mit auto_publish=True → row wird published=True
            #    (current_price muss in DB stehen, damit _publish_guard passt).
            db.stock_research.seed({
                "ticker": "NVDA", "current_price": 200.0,
                "current_price_currency": "EUR", "currency": "EUR",
                "dedupe_key": "will-be-overwritten",
                "published": True,  # bereits publiziert, alt
                "target_price": 250.0,
            })
            # Damit `find_one({"dedupe_key": ...})` matcht, holen wir zunächst
            # den kanonischen Key durch einen Trockenlauf, der die interne
            # Berechnung durchläuft. Einfacher: wir seeden mit einer Row, die
            # sicher matcht — Der Sync ruft `find_one({"dedupe_key": stored["dedupe_key"]})`.
            # Wir überschreiben nach Bedarf. Alternative: manuell _duplicate_key aufrufen.
            from routes.stock_research_sync import _duplicate_key
            probe_stored = {
                "ticker": "NVDA", "target_price": 300.0, "currency": "EUR",
                "research_date": row.research_date,
                "source_url": row.source_url,
                "analyst": None, "research_house": None,
            }
            key = _duplicate_key(probe_stored)
            # Re-seed with correct dedupe_key + published=True
            db.stock_research._docs.clear()
            db.stock_research.seed({
                "ticker": "NVDA", "current_price": 200.0,
                "current_price_currency": "EUR", "currency": "EUR",
                "dedupe_key": key,
                "published": True,
                "target_price": 250.0,  # wird gleich vom Sync auf 300 aktualisiert
            })

            # 2. Sync ohne auto_publish → published DARF NICHT auf False fallen.
            summary = await mod._sync_analysts(["NVDA"], auto_publish=False)
            assert summary["updated"] == 1, summary
            assert summary["inserted"] == 0, summary
            after = await db.stock_research.find_one({"ticker": "NVDA"})
            assert after["published"] is True, f"published wurde fälschlich zurückgesetzt: {after}"
            assert after["target_price"] == 300.0, "target_price muss aktualisiert werden"
        finally:
            restore()

    _run(_t())


def test_existing_draft_row_stays_draft_when_auto_publish_false():
    async def _t():
        db = _FakeDB()
        row = _FakeRow("AAPL", "Apple", 250.0, currency="USD")
        provider = _FakeProvider([row])
        mod, restore = _install_sync_module_with_fake_db(db, provider)
        try:
            from routes.stock_research_sync import _duplicate_key
            probe_stored = {
                "ticker": "AAPL", "target_price": 250.0, "currency": "USD",
                "research_date": row.research_date,
                "source_url": row.source_url,
                "analyst": None, "research_house": None,
            }
            key = _duplicate_key(probe_stored)
            db.stock_research.seed({
                "ticker": "AAPL", "current_price": 200.0,
                "current_price_currency": "EUR", "currency": "USD",
                "dedupe_key": key,
                "published": False,  # draft
                "target_price": 240.0,
            })
            summary = await mod._sync_analysts(["AAPL"], auto_publish=False)
            assert summary["updated"] == 1
            after = await db.stock_research.find_one({"ticker": "AAPL"})
            assert after["published"] is False
        finally:
            restore()

    _run(_t())


def test_new_provider_row_defaults_to_draft_when_auto_publish_false():
    async def _t():
        db = _FakeDB()
        row = _FakeRow("MSFT", "Microsoft", 550.0, currency="USD")
        provider = _FakeProvider([row])
        mod, restore = _install_sync_module_with_fake_db(db, provider)
        try:
            summary = await mod._sync_analysts(["MSFT"], auto_publish=False)
            assert summary["inserted"] == 1
            assert summary["updated"] == 0
            after = await db.stock_research.find_one({"ticker": "MSFT"})
            assert after is not None
            assert after["published"] is False, "Draft-First verletzt"
        finally:
            restore()

    _run(_t())


def test_valid_row_gets_published_when_auto_publish_true():
    async def _t():
        db = _FakeDB()
        row = _FakeRow("SAP", "SAP SE", 200.0, currency="EUR")
        provider = _FakeProvider([row])
        mod, restore = _install_sync_module_with_fake_db(db, provider)
        try:
            summary = await mod._sync_analysts(["SAP"], auto_publish=True)
            assert summary["inserted"] == 1
            after = await db.stock_research.find_one({"ticker": "SAP"})
            assert after["published"] is True
        finally:
            restore()

    _run(_t())


def test_invalid_row_stays_draft_even_when_auto_publish_true():
    """Der `_publish_guard`-Check probes mit `current_price=1.0`, prüft aber
    zusätzlich `target_price>0`, `research_date`, `source_url` etc. Eine Row
    ohne `target_price` muss unpubliziert bleiben, auch bei auto_publish=True.
    """
    async def _t():
        db = _FakeDB()
        row = _FakeRow("BAD", "Broken Inc", 0.0, currency="EUR")  # target_price=0 → guard fails
        provider = _FakeProvider([row])
        mod, restore = _install_sync_module_with_fake_db(db, provider)
        try:
            summary = await mod._sync_analysts(["BAD"], auto_publish=True)
            # Row wird rejected wegen fehlendem target_price (validate_analyst).
            # Wenn validate_analyst nicht rejected: dann muss guard published=False setzen.
            after = await db.stock_research.find_one({"ticker": "BAD"})
            if after is not None:
                assert after["published"] is False, f"invalide Row wurde publiziert: {after}"
            else:
                # rejected → landet in stock_research_rejects, nicht in stock_research
                rej = await db.stock_research_rejects.find_one({"ticker": "BAD"})
                assert rej is not None
        finally:
            restore()

    _run(_t())

"""Provider symbol map — canonical ticker → provider-specific symbol.

Session 78.12 — löst den ADR/Home-Listing-Konflikt: für deutsche Blue-Chips
müssen Provider (Yahoo) an die XETRA-Notierung (`.DE`), damit Analysten-Targets
und interne Preise dasselbe Instrument darstellen.
"""
from __future__ import annotations
from typing import Optional

# canonical → provider → (provider_symbol, exchange, trading_currency)
_MAP = {
    # German blue chips — force XETRA on Yahoo
    "SAP":   {"yahoo-finance": ("SAP.DE", "XETRA", "EUR")},
    "ALV":   {"yahoo-finance": ("ALV.DE", "XETRA", "EUR")},
    "SIE":   {"yahoo-finance": ("SIE.DE", "XETRA", "EUR")},
    "DBK":   {"yahoo-finance": ("DBK.DE", "XETRA", "EUR")},
    "IFX":   {"yahoo-finance": ("IFX.DE", "XETRA", "EUR")},
    "RHM":   {"yahoo-finance": ("RHM.DE", "XETRA", "EUR")},
    # US mega caps — canonical == Yahoo
    "AAPL":  {"yahoo-finance": ("AAPL",   "NASDAQ", "USD")},
    "MSFT":  {"yahoo-finance": ("MSFT",   "NASDAQ", "USD")},
    "GOOGL": {"yahoo-finance": ("GOOGL",  "NASDAQ", "USD")},
    "AMZN":  {"yahoo-finance": ("AMZN",   "NASDAQ", "USD")},
    "NVDA":  {"yahoo-finance": ("NVDA",   "NASDAQ", "USD")},
}


def resolve(canonical: str, provider: str) -> Optional[tuple[str, str, str]]:
    """Return (provider_symbol, exchange, trading_currency) or None if the
    canonical ticker has no explicit mapping (then callers should fall back
    to the canonical symbol unchanged)."""
    entry = _MAP.get((canonical or "").upper())
    if not entry:
        return None
    return entry.get(provider)

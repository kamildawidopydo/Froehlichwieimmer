"""Session 94 · Backend feed dedup regression.

Assertions:
  1. article_id-Duplikate über alle Sektionen = 0
  2. image_key-Duplikate über alle Sektionen = 0
  3. fehlendes Bild wird als `image_url=null` serialisiert, nicht als Default
  4. dieselbe unsplash photo-id kommt nicht mehrfach vor
"""
import os
import re
import requests
from dotenv import dotenv_values

_FE = dotenv_values("/app/frontend/.env")
BASE = (os.environ.get("REACT_APP_BACKEND_URL") or _FE.get("REACT_APP_BACKEND_URL", "")).rstrip("/")


_UNSPLASH = re.compile(r"photo-([0-9a-f]{10,})", re.IGNORECASE)


def _image_key(url):
    if not url or not isinstance(url, str):
        return None
    m = _UNSPLASH.search(url)
    if m:
        return f"unsplash:{m.group(1).lower()}"
    return f"url:{url.split('?')[0].split('#')[0].rstrip('/').lower()}"


def _get(path, **params):
    r = requests.get(f"{BASE}{path}", params=params or None, timeout=30)
    r.raise_for_status()
    return r.json()


def test_feed_no_article_duplicates_across_sections():
    body = _get("/api/news-markte/feed")
    seen = {}
    all_ids = []
    for sec in ("top", "overview", "weitere", "anleger"):
        for a in body.get(sec, []):
            all_ids.append((sec, a["id"]))
    id_counts = {}
    for sec, aid in all_ids:
        id_counts.setdefault(aid, []).append(sec)
    dupes = {aid: sects for aid, sects in id_counts.items() if len(sects) > 1}
    assert not dupes, f"article_id duplicates across sections: {dupes}"


def test_feed_no_image_duplicates_across_sections():
    body = _get("/api/news-markte/feed")
    key_counts = {}
    for sec in ("top", "overview", "weitere", "anleger"):
        for a in body.get(sec, []):
            k = _image_key(a.get("image_url"))
            if k is None:
                continue
            key_counts.setdefault(k, []).append((sec, a["id"], a.get("title", "")[:40]))
    dupes = {k: v for k, v in key_counts.items() if len(v) > 1}
    assert not dupes, f"image_key duplicates: {dupes}"


def test_feed_missing_image_serialised_as_null_not_default():
    body = _get("/api/news-markte/feed")
    # nachdem Dedup gelaufen ist, dürfen die Werte entweder eine echte URL
    # oder explizit None sein — kein leerer String, kein Default-Placeholder
    for sec in ("top", "overview", "weitere", "anleger"):
        for a in body.get(sec, []):
            v = a.get("image_url")
            assert v is None or (isinstance(v, str) and v.startswith("http")), \
                f"unexpected image_url in {sec}/{a['id']}: {v!r}"


def test_feed_category_filter_still_dedupes():
    body = _get("/api/news-markte/feed", category="maerkte")
    all_ids = []
    for sec in ("top", "overview", "weitere", "anleger"):
        for a in body.get(sec, []):
            all_ids.append(a["id"])
    assert len(all_ids) == len(set(all_ids)), \
        f"category-filtered feed has duplicate article_ids: {all_ids}"


def test_feed_shape_intact():
    body = _get("/api/news-markte/feed")
    for k in ("top", "overview", "weitere", "anleger", "categories"):
        assert k in body, f"missing key {k}"
    # top max 3, overview <= 15, weitere <= 9, anleger <= 6
    assert len(body["top"]) <= 3
    assert len(body["overview"]) <= 15
    assert len(body["weitere"]) <= 9
    assert len(body["anleger"]) <= 6

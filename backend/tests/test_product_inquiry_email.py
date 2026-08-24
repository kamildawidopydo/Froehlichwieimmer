"""Session 74.9 — POST /api/send-product-inquiry-email
Persistente MongoDB-Idempotenz (Collection product_inquiry_email_idempotency).
Erwartung: Endpoint gibt IMMER 200 zurueck; Duplicate-Antwort {ok:true, duplicate:true}.
"""
import concurrent.futures
import hashlib
import os
import subprocess
import time
import uuid

import pytest
import requests
from dotenv import dotenv_values
from pymongo import MongoClient

frontend_env = dotenv_values("/app/frontend/.env")
backend_env = dotenv_values("/app/backend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")
EP = f"{BASE_URL}/api/send-product-inquiry-email"

MONGO_URL = os.environ.get("MONGO_URL") or backend_env.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME") or backend_env.get("DB_NAME")
COLL = "product_inquiry_email_idempotency"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def mongo():
    if not MONGO_URL or not DB_NAME:
        pytest.skip("MONGO_URL/DB_NAME missing")
    mc = MongoClient(MONGO_URL)
    yield mc[DB_NAME]
    mc.close()


@pytest.fixture(scope="module")
def created_lead_ids():
    return []


@pytest.fixture(scope="module", autouse=True)
def cleanup(mongo, created_lead_ids):
    yield
    if created_lead_ids:
        mongo[COLL].delete_many({"lead_id": {"$in": created_lead_ids}})


def _payload(**over):
    p = {
        "product": "aktien",
        "first_name": "TEST_Max",
        "last_name": "TEST_Mustermann",
        "email": f"test-{uuid.uuid4().hex[:8]}@example.com",
        "phone": "+49 30 123456",
        "customer_number": "K-4711",
        "answers": {"erfahrung": {"label": "Einsteiger"}, "horizont": {"label": "5 Jahre"}},
        "consent_marketing": True,
        "leadId": "TEST-" + str(uuid.uuid4()),
    }
    p.update(over)
    return p


def _hash_key(product, email, first, last, phone):
    raw = "|".join([product, email.strip().lower(), first.strip().lower(), last.strip().lower(), phone.strip()])
    return "hash:" + hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]


# --- Basis-Validierung / Robustheit (bestehende 74.8-Suite) --------------------
class TestProductInquiryEmailBasics:
    def test_valid_aktien_payload(self, client, created_lead_ids):
        p = _payload()
        created_lead_ids.append(p["leadId"])
        r = client.post(EP, json=p, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        if d.get("ok") is not True:
            assert d.get("error") == "email_provider_failed", d
            pytest.xfail(f"email provider rejects recipient: {d}")
        assert isinstance(d.get("dry_run"), bool), d

    def test_invalid_product(self, client):
        r = client.post(EP, json=_payload(product="krypto"), timeout=30)
        assert r.status_code == 200
        assert r.json() == {"ok": False, "error": "invalid_product"}

    def test_empty_product(self, client):
        r = client.post(EP, json=_payload(product=""), timeout=30)
        assert r.status_code == 200
        assert r.json().get("error") == "invalid_product"

    @pytest.mark.parametrize("bad", ["", "   ", "not-an-email"])
    def test_invalid_email(self, client, bad):
        r = client.post(EP, json=_payload(email=bad), timeout=30)
        assert r.status_code == 200
        assert r.json() == {"ok": False, "error": "invalid_email"}

    def test_all_six_products_accepted(self, client, created_lead_ids):
        for prod in ["aktien", "anleihen", "fonds", "tagesgeld", "festgeld", "flexgeld"]:
            p = _payload(product=prod)
            created_lead_ids.append(p["leadId"])
            r = client.post(EP, json=p, timeout=60)
            assert r.status_code == 200, (prod, r.text)
            body = r.json()
            assert body.get("error") in (None, "email_provider_failed"), (prod, body)

    def test_minimal_payload_never_5xx(self, client, created_lead_ids):
        email = f"min-{uuid.uuid4().hex[:6]}@example.com"
        created_lead_ids.append(_hash_key("fonds", email, "", "", ""))
        r = client.post(EP, json={"product": "fonds", "email": email}, timeout=60)
        assert r.status_code == 200, r.text
        assert r.json().get("error") in (None, "email_provider_failed"), r.text

    def test_empty_body_no_crash(self, client):
        r = client.post(EP, json={}, timeout=30)
        assert r.status_code == 200, r.text
        assert r.json().get("ok") is False

    def test_malformed_answers_no_crash(self, client, created_lead_ids):
        p = _payload(answers={"a": "plain string", "b": None, "c": {"nolabel": 1}})
        created_lead_ids.append(p["leadId"])
        r = client.post(EP, json=p, timeout=60)
        assert r.status_code == 200, r.text
        assert r.json().get("error") in (None, "email_provider_failed"), r.text

    def test_xss_in_name_does_not_500(self, client, created_lead_ids):
        p = _payload(first_name="<script>alert(1)</script>")
        created_lead_ids.append(p["leadId"])
        r = client.post(EP, json=p, timeout=60)
        assert r.status_code == 200, r.text
        assert r.json().get("error") in (None, "email_provider_failed"), r.text


# --- Session 74.9: MongoDB-Idempotenz -----------------------------------------
class TestIdempotency:
    def test_indexes_exist(self, mongo):
        idx = list(mongo[COLL].list_indexes())
        by_key = {tuple(i["key"].items()): i for i in idx}
        lead = by_key.get((("lead_id", 1),))
        assert lead is not None, idx
        assert lead.get("unique") is True, lead
        created = by_key.get((("created_at", 1),))
        assert created is not None, idx
        assert created.get("expireAfterSeconds") == 60 * 60 * 24 * 30, created

    def test_doc_created_with_status(self, client, mongo, created_lead_ids):
        p = _payload()
        created_lead_ids.append(p["leadId"])
        r = client.post(EP, json=p, timeout=60)
        assert r.status_code == 200
        doc = mongo[COLL].find_one({"lead_id": p["leadId"]})
        assert doc is not None, "idempotency doc not persisted"
        assert doc["status"] in ("sent", "failed"), doc
        assert doc["product"] == "aktien"
        assert doc.get("created_at") is not None

    def test_retry_after_failed_is_allowed(self, client, mongo, created_lead_ids):
        p = _payload()
        created_lead_ids.append(p["leadId"])
        d1 = client.post(EP, json=p, timeout=60).json()
        doc1 = mongo[COLL].find_one({"lead_id": p["leadId"]})
        if doc1["status"] == "sent":
            pytest.skip("provider delivered — failed-retry path not exercisable")
        assert d1.get("error") == "email_provider_failed", d1
        d2 = client.post(EP, json=p, timeout=60).json()
        # Retry darf NICHT als duplicate geschluckt werden (kein reserved-forever lock)
        assert d2.get("duplicate") is not True, d2
        assert d2.get("error") == "email_provider_failed", d2
        doc2 = mongo[COLL].find_one({"lead_id": p["leadId"]})
        assert doc2["status"] == "failed", doc2
        assert doc2.get("reserved_at") is not None, doc2

    def test_second_call_when_sent_is_duplicate(self, client, mongo, created_lead_ids):
        p = _payload()
        created_lead_ids.append(p["leadId"])
        client.post(EP, json=p, timeout=60)
        # Simuliere erfolgreichen Send (Provider ist im aktuellen Env 422)
        mongo[COLL].update_one({"lead_id": p["leadId"]}, {"$set": {"status": "sent", "error": None}})
        d2 = client.post(EP, json=p, timeout=60).json()
        assert d2 == {"ok": True, "already_sent": True, "duplicate": True}, d2

    def test_parallel_requests_only_one_send_attempt(self, client, mongo, created_lead_ids):
        p = _payload()
        created_lead_ids.append(p["leadId"])
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:
            futs = [ex.submit(requests.post, EP, json=p, timeout=60) for _ in range(2)]
            res = [f.result().json() for f in futs]
        assert all(isinstance(x, dict) for x in res), res
        dups = [x for x in res if x.get("duplicate") is True]
        sends = [x for x in res if x.get("duplicate") is not True]
        assert len(dups) == 1 and len(sends) == 1, res
        assert sends[0].get("error") in (None, "email_provider_failed"), sends[0]

    def test_hash_fallback_dedupe_without_leadid(self, client, mongo, created_lead_ids):
        email = f"nolead-{uuid.uuid4().hex[:8]}@example.com"
        body = {
            "product": "anleihen",
            "first_name": "TEST_Anna",
            "last_name": "TEST_Berg",
            "email": email,
            "phone": "+49 40 999",
        }
        key = _hash_key("anleihen", email, "TEST_Anna", "TEST_Berg", "+49 40 999")
        created_lead_ids.append(key)
        r1 = client.post(EP, json=body, timeout=60).json()
        doc = mongo[COLL].find_one({"lead_id": key})
        assert doc is not None, f"hash key doc missing for {key}"
        # forciere sent, damit der 2. Call als duplicate erkannt werden muss
        mongo[COLL].update_one({"lead_id": key}, {"$set": {"status": "sent", "error": None}})
        r2 = client.post(EP, json=body, timeout=60).json()
        assert r2.get("duplicate") is True, (r1, r2)

    def test_hash_fallback_other_payload_separate_doc(self, client, mongo, created_lead_ids):
        email = f"nolead2-{uuid.uuid4().hex[:8]}@example.com"
        body = {"product": "anleihen", "first_name": "TEST_Otto", "last_name": "TEST_Klein",
                "email": email, "phone": "+49 40 111"}
        key1 = _hash_key("anleihen", email, "TEST_Otto", "TEST_Klein", "+49 40 111")
        body2 = dict(body, phone="+49 40 222")
        key2 = _hash_key("anleihen", email, "TEST_Otto", "TEST_Klein", "+49 40 222")
        created_lead_ids.extend([key1, key2])
        client.post(EP, json=body, timeout=60)
        r2 = client.post(EP, json=body2, timeout=60).json()
        assert r2.get("duplicate") is not True, r2
        assert mongo[COLL].find_one({"lead_id": key1}) is not None
        assert mongo[COLL].find_one({"lead_id": key2}) is not None


# --- Persistenz über Backend-Restart ------------------------------------------
class TestRestartPersistence:
    """Restartet das Backend — muss seriell laufen (pytest.ini nutzt xdist).
    Aktivieren mit: PI_RESTART_TEST=1 pytest tests/test_product_inquiry_email.py -n0
    """

    @pytest.mark.skipif(os.environ.get("PI_RESTART_TEST") != "1",
                        reason="restart test only with PI_RESTART_TEST=1 and -n0 (verified green 74.9)")
    def test_idempotency_survives_restart(self, client, mongo, created_lead_ids):
        p = _payload()
        created_lead_ids.append(p["leadId"])
        client.post(EP, json=p, timeout=60)
        mongo[COLL].update_one({"lead_id": p["leadId"]}, {"$set": {"status": "sent", "error": None}})
        subprocess.run(["sudo", "supervisorctl", "restart", "backend"], check=False, timeout=120)
        # warte bis Backend wieder antwortet
        for _ in range(40):
            time.sleep(2)
            try:
                if requests.get(f"{BASE_URL}/api/", timeout=10).status_code < 500:
                    break
            except Exception:
                continue
        d = client.post(EP, json=p, timeout=60).json()
        assert d.get("duplicate") is True and d.get("already_sent") is True, d
        # Indexe nach Restart weiterhin vorhanden
        keys = [tuple(i["key"].items()) for i in mongo[COLL].list_indexes()]
        assert (("lead_id", 1),) in keys and (("created_at", 1),) in keys, keys

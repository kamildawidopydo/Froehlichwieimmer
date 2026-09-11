"""Session 82.107 — Backend tests for Bestandskunden-Bestätigung endpoints."""
import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://finance-platform-v2.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@kapitalmitte.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def created_id(admin_session):
    payload = {
        "anrede": "Herr", "vorname": "Max", "nachname": "Mustermann",
        "strasse": "Musterstraße 12", "plz": "60311", "ort_kunde": "Frankfurt",
        "land": "Deutschland", "email": "test-ccf@example.com",
        "kundennummer": "KM-TEST-42", "ort": "Frankfurt am Main",
    }
    r = admin_session.post(f"{BASE_URL}/api/admin/customer-confirmations", json=payload, timeout=30)
    assert r.status_code == 200, f"Create failed: {r.status_code} {r.text}"
    data = r.json()
    assert "id" in data and "size_bytes" in data and "created_at" in data
    assert data["size_bytes"] > 5000, f"PDF too small: {data['size_bytes']}"
    return data["id"]


class TestAuthProtection:
    """All endpoints must reject unauthenticated requests."""

    def test_unauth_create(self):
        r = requests.post(f"{BASE_URL}/api/admin/customer-confirmations",
                          json={"vorname": "A", "nachname": "B", "kundennummer": "X"}, timeout=15)
        assert r.status_code in (401, 403)

    def test_unauth_list(self):
        r = requests.get(f"{BASE_URL}/api/admin/customer-confirmations", timeout=15)
        assert r.status_code in (401, 403)

    def test_unauth_view(self):
        r = requests.get(f"{BASE_URL}/api/admin/customer-confirmations/000000000000000000000000/view", timeout=15)
        assert r.status_code in (401, 403)

    def test_unauth_download(self):
        r = requests.get(f"{BASE_URL}/api/admin/customer-confirmations/000000000000000000000000/download", timeout=15)
        assert r.status_code in (401, 403)

    def test_unauth_send_email(self):
        r = requests.post(f"{BASE_URL}/api/admin/customer-confirmations/000000000000000000000000/send-email",
                          json={"email": "x@y.com"}, timeout=15)
        assert r.status_code in (401, 403)


class TestCreateValidation:
    def test_create_missing_required(self, admin_session):
        r = admin_session.post(f"{BASE_URL}/api/admin/customer-confirmations",
                                json={"anrede": "Herr"}, timeout=15)
        assert r.status_code == 422


class TestPdfEndpoints:
    def test_view_returns_pdf(self, admin_session, created_id):
        r = admin_session.get(f"{BASE_URL}/api/admin/customer-confirmations/{created_id}/view", timeout=20)
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("application/pdf")
        assert "inline" in r.headers.get("content-disposition", "").lower()
        assert r.content[:4] == b"%PDF"

    def test_download_returns_pdf(self, admin_session, created_id):
        r = admin_session.get(f"{BASE_URL}/api/admin/customer-confirmations/{created_id}/download", timeout=20)
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("application/pdf")
        cd = r.headers.get("content-disposition", "")
        assert "attachment" in cd.lower()
        assert "Bestandskunden-Bestaetigung.pdf" in cd
        assert r.content[:4] == b"%PDF"

    def test_view_nonexistent_404(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/admin/customer-confirmations/6543210987abcdef01234567/view", timeout=15)
        assert r.status_code == 404


class TestListEndpoint:
    def test_list_returns_items(self, admin_session, created_id):
        r = admin_session.get(f"{BASE_URL}/api/admin/customer-confirmations", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "items" in data and isinstance(data["items"], list)
        assert data["count"] >= 1
        assert any(it["id"] == created_id for it in data["items"])
        # ensure no ObjectId leakage
        for it in data["items"]:
            assert "_id" not in it


class TestSendEmail:
    def test_send_email_ok(self, admin_session, created_id):
        r = admin_session.post(
            f"{BASE_URL}/api/admin/customer-confirmations/{created_id}/send-email",
            json={"email": "delivered@resend.dev", "message": ""}, timeout=45,
        )
        assert r.status_code == 200, f"send-email failed: {r.status_code} {r.text}"
        data = r.json()
        assert data.get("status") == "sent"
        assert data.get("sent_to") == "delivered@resend.dev"
        assert "sent_at" in data


class TestPublicSurface:
    """Sanity: no unauthenticated public download route serves customer PDFs."""

    def test_no_public_downloads_dir_leak(self):
        # /downloads should NOT serve an actual PDF file publicly.
        # SPA catch-all may return 200 text/html (index.html) — that's acceptable.
        r = requests.get(f"{BASE_URL}/downloads/Bestandskunden-Bestaetigung.pdf", timeout=10, allow_redirects=False)
        ct = r.headers.get("content-type", "")
        assert not ct.startswith("application/pdf"), f"Public PDF leak! ct={ct}"
        if r.status_code == 200:
            # Must be SPA fallback (HTML), not a PDF
            assert r.content[:4] != b"%PDF", "Public PDF leak via /downloads/"

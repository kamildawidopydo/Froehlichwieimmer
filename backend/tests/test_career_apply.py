# Career application endpoint (/api/career/apply) validation + rate-limit tests
# NOTE: no valid submissions here (email burst limit) - valid flow is covered via UI test.
import os
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
URL = f"{BASE_URL}/api/career/apply"


def _ip():
    return f"10.{uuid.uuid4().int % 250}.{uuid.uuid4().int % 250}.{uuid.uuid4().int % 250}"


def _post(data, files=None, ip=None):
    return requests.post(URL, data=data, files=files, headers={"X-Forwarded-For": ip or _ip()}, timeout=30)


BASE = {"name": "TEST_Invalid", "email": "test@example.com", "consent": "true"}


class TestCareerValidation:
    def test_invalid_email_400(self):
        r = _post({**BASE, "email": "not-an-email"})
        assert r.status_code == 400, r.text
        assert "E-Mail" in r.json()["detail"]

    def test_consent_false_400(self):
        r = _post({**BASE, "consent": "false"})
        assert r.status_code == 400, r.text
        assert "Datenverarbeitung" in r.json()["detail"]

    def test_missing_name_422(self):
        r = _post({"email": "test@example.com", "consent": "true"})
        assert r.status_code in (400, 422)

    def test_txt_cv_400(self):
        r = _post(BASE, files={"cv": ("cv.txt", b"hello", "text/plain")})
        assert r.status_code == 400, r.text
        assert "PDF" in r.json()["detail"]

    def test_too_large_cv_400(self):
        big = b"%PDF-1.4\n" + b"0" * (8 * 1024 * 1024 + 10)
        r = _post(BASE, files={"cv": ("cv.pdf", big, "application/pdf")})
        assert r.status_code in (400, 413), r.text


class TestCareerRateLimit:
    def test_rate_limit_429(self):
        ip = _ip()
        codes = [_post({**BASE, "consent": "false"}, ip=ip).status_code for _ in range(4)]
        print("codes", codes)
        assert codes[:3] == [400, 400, 400]
        assert codes[3] == 429

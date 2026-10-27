# Careers: encrypted GridFS file storage, permanent deletion, retention, deletion-log re-apply after restore
import os
import subprocess
import time
import uuid
from datetime import date, datetime, timedelta, timezone

import pytest
import requests
from bson import ObjectId
from dotenv import dotenv_values
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api/careers"
LOCAL = "http://localhost:8001/api/careers"
ENV = dotenv_values("/app/backend/.env")
DB = MongoClient(ENV["MONGO_URL"])[ENV["DB_NAME"]]
ADMIN = ("admin@kapitalmitte.com", "admin123")
MARKER = b"TEST_PLAINTEXT_MARKER_" + uuid.uuid4().hex.encode()
PDF = b"%PDF-1.4\n" + MARKER * 50 + b"\n%%EOF"
PDF2 = b"%PDF-1.4\nzweites " + MARKER + b"\n%%EOF"
UNI_NAME = "Zeugnis_Müller_日本.pdf"


def login(email, pw):
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": pw})
    if r.status_code != 200:
        pytest.skip(f"login failed {r.status_code}")
    s.headers["Authorization"] = f"Bearer {s.cookies.get('access_token')}"
    return s


def ip():
    return f"10.{uuid.uuid4().int % 250}.{uuid.uuid4().int % 250}.{uuid.uuid4().int % 250}"


def form(job_id="", **over):
    d = {"first_name": "TEST_Store", "last_name": "Muster", "email": "delivered@resend.dev",
         "phone": "+49 170 1234567", "position": "TEST_ Storage", "job_id": job_id,
         "privacy_consent": "true", "website": "", "form_started_at": str(int(time.time() * 1000) - 10000)}
    d.update(over)
    return d


AUTH = {}


def submit(job_id="", files=None):
    r = requests.post(f"{LOCAL}/applications", data=form(job_id), files=files or [], headers={"x-real-ip": ip(), **AUTH})
    assert r.status_code == 201, r.text
    return r.json()["id"]


def file_counts(aid):
    fids = [f["_id"] for f in DB["career_files.files"].find({"metadata.application_id": aid})]
    return (len(fids), DB["career_files.chunks"].count_documents({"files_id": {"$in": fids}}) if fids else 0,
            DB.career_file_keys.count_documents({"application_id": aid}))


@pytest.fixture(scope="module")
def admin():
    return login(*ADMIN)


@pytest.fixture(scope="module")
def st(admin):
    s = {"apps": [], "logs": []}
    AUTH["Authorization"] = admin.headers["Authorization"]
    admin.put(f"{API}/admin/settings", json={"site_public": False, "applications_enabled": True, "retention_days": 180})
    j = admin.post(f"{API}/admin/jobs", json={"title": "TEST_ Storage Stelle", "level": "einsteiger", "location": "Berlin",
                                              "employment_type": "Vollzeit",
                                              "deadline": (date.today() + timedelta(days=10)).isoformat()}).json()
    admin.post(f"{API}/admin/jobs/{j['id']}/status", json={"status": "published"})
    s["job"] = j["id"]
    yield s
    for a in s["apps"]:
        admin.delete(f"{API}/admin/applications/{a}")
    admin.delete(f"{API}/admin/jobs/{s['job']}")
    admin.put(f"{API}/admin/settings", json={"site_public": False, "applications_enabled": False, "retention_days": 180,
                                             "notify_email": None})
    DB.career_deletion_log.delete_many({"application_id": {"$in": s["logs"]}})


class TestEncryptedStorage:
    def test_upload_download_identical_and_encrypted(self, admin, st):
        aid = submit(st["job"], [("cv", ("lebenslauf.pdf", PDF, "application/pdf")),
                                 ("attachments", (UNI_NAME, PDF2, "application/pdf"))])
        st["apps"].append(aid)
        st["aid"] = aid
        d = admin.get(f"{API}/admin/applications/{aid}").json()
        assert len(d["files"]) == 2
        for f in d["files"]:
            r = admin.get(f"{API}/admin/files/{f['file_id']}")
            assert r.status_code == 200, r.text
            assert r.content == (PDF if f["kind"] == "cv" else PDF2)
            assert "no-store" in r.headers.get("cache-control", "")
        uni = [f for f in d["files"] if f["kind"] == "attachment"][0]
        cd = admin.get(f"{API}/admin/files/{uni['file_id']}").headers["content-disposition"]
        print("unicode name stored:", uni["name"], "| CD:", cd)
        assert "filename*=UTF-8''" in cd
        # DB: chunks must not contain plaintext
        nf, nc, nk = file_counts(aid)
        assert (nf, nk) == (2, 2) and nc >= 2
        fids = [f["_id"] for f in DB["career_files.files"].find({"metadata.application_id": aid})]
        for ch in DB["career_files.chunks"].find({"files_id": {"$in": fids}}):
            assert MARKER not in bytes(ch["data"]) and b"%PDF" not in bytes(ch["data"])
        for k in DB.career_file_keys.find({"application_id": aid}):
            assert isinstance(k["wrapped_key"], bytes) and k["wrapped_key"].startswith(b"gAAAA")
        # legacy uploads dir should not contain new files
        assert not DB.career_applications.find_one({"_id": ObjectId(aid), "files.path": {"$exists": True}})

    def test_oversize_and_empty_rejected(self, st):
        big = b"%PDF" + b"0" * (10 * 1024 * 1024 + 1)
        r = requests.post(f"{LOCAL}/applications", data=form(), files=[("cv", ("big.pdf", big, "application/pdf"))],
                          headers={"x-real-ip": ip(), **AUTH})
        assert r.status_code == 413, r.text
        r = requests.post(f"{LOCAL}/applications", data=form(), files=[("cv", ("e.pdf", b"", "application/pdf"))],
                          headers={"x-real-ip": ip(), **AUTH})
        assert r.status_code == 422, r.text


class TestPermanentDeletion:
    def test_delete_purges_everything(self, admin, st):
        aid = st["aid"]
        st["backup"] = DB.career_applications.find_one({"_id": ObjectId(aid)})
        fid = st["backup"]["files"][0]["file_id"]
        r = admin.delete(f"{API}/admin/applications/{aid}")
        assert r.status_code == 200
        st["apps"].remove(aid)
        st["logs"].append(aid)
        assert DB.career_applications.count_documents({"_id": ObjectId(aid)}) == 0
        assert file_counts(aid) == (0, 0, 0)
        assert admin.get(f"{API}/admin/files/{fid}").status_code == 404
        log = DB.career_deletion_log.find_one({"application_id": aid})
        assert log and log["reason"] == "manuell" and log["files_deleted"] == 2
        assert set(log.keys()) <= {"_id", "application_id", "deleted_at", "reason", "by", "files_deleted"}
        s = admin.get(f"{API}/admin/settings").json()
        assert "expired_count" in s and any(e["reason"] == "manuell" for e in s["deletion_log"])
        assert all("application_id" not in e and "email" not in e for e in s["deletion_log"])

    def test_retention_run(self, admin, st):
        aid = submit("", [("cv", ("cv.pdf", PDF2, "application/pdf"))])
        st["apps"].append(aid)
        DB.career_applications.update_one({"_id": ObjectId(aid)},
                                          {"$set": {"updated_at": datetime.now(timezone.utc) - timedelta(days=200)}})
        s = admin.get(f"{API}/admin/settings").json()
        assert s["expired_count"] >= 1
        r = admin.post(f"{API}/admin/retention/run")
        assert r.status_code == 200 and r.json()["deleted"] >= 1
        st["apps"].remove(aid)
        st["logs"].append(aid)
        assert DB.career_applications.count_documents({"_id": ObjectId(aid)}) == 0
        assert file_counts(aid) == (0, 0, 0)
        assert DB.career_deletion_log.find_one({"application_id": aid})["reason"].startswith("Frist")
        assert admin.get(f"{API}/admin/settings").json()["expired_count"] == 0

    def test_reapply_deletion_log_on_restart(self, st):
        bk = st["backup"]
        DB.career_applications.insert_one(bk)
        DB.career_file_keys.insert_one({"_id": "TEST_orphan_" + uuid.uuid4().hex, "application_id": str(bk["_id"]),
                                        "wrapped_key": b"x"})
        subprocess.run(["sudo", "supervisorctl", "restart", "backend"], check=True, capture_output=True)
        for _ in range(60):
            try:
                if requests.get(f"{LOCAL}/status", timeout=3).status_code == 200:
                    break
            except Exception:
                pass
            time.sleep(1)
        time.sleep(3)
        assert DB.career_applications.count_documents({"_id": bk["_id"]}) == 0
        assert DB.career_file_keys.count_documents({"application_id": str(bk["_id"])}) == 0

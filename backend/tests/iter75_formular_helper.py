# Iteration 75 helper: create formular code+session (seed) / expire session (expire) / cleanup (clean)
import json, sys, datetime, requests
from bson import ObjectId
from pymongo import MongoClient
B = open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].split()[0].rstrip("/")
env = dict(l.strip().split("=", 1) for l in open("/app/backend/.env") if "=" in l)
db = MongoClient(env["MONGO_URL"].strip('"'))[env["DB_NAME"].strip('"')]
S = "/tmp/iter75_formular.json"
a = requests.Session()
assert a.post(f"{B}/api/auth/login", json={"email": "petrowski616@outlook.com", "password": "HHHKKK222"}).status_code == 200
cmd = sys.argv[1]
if cmd == "seed":
    r = a.post(f"{B}/api/admin/formular-access/codes", json={"admin_label": "TEST_it75_ui"}).json()
    v = requests.post(f"{B}/api/formular-access/verify", json={"code": r["code"], "used_by_name": "TEST Ui"}).json()
    out = {"cid": r["id"], "sid": v.get("session_id") or v.get("sessionId")}
    json.dump(out, open(S, "w")); print(out)
elif cmd == "expire":
    d = json.load(open(S))
    print(db.formular_sessions.update_one({"session_id": d["sid"]}, {"$set": {"expires_at": datetime.datetime(2020, 1, 1)}}).modified_count)
elif cmd == "clean":
    d = json.load(open(S))
    db.formular_sessions.delete_many({"code_id": ObjectId(d["cid"])})
    print(a.delete(f"{B}/api/admin/formular-access/codes/{d['cid']}").status_code)
if cmd == "submit":
    import base64
    d = json.load(open(S))
    html = ('<table><tr><td>Anleger</td><td>TEST_It75 UI</td></tr><tr><td>Anlagebetrag</td><td>25.000 EUR</td></tr>'
            '<tr><td>Zinssatz p.a.</td><td>2,85 %</td></tr><tr><td>Laufzeit</td><td>24 Monate</td></tr>'
            '<tr><td>IBAN</td><td>DE89370400440532013000</td></tr><tr><td>Zweiter Anleger</td><td>—</td></tr></table>')
    r = requests.post(f"{B}/api/send-knab-festgeld-email", headers={"X-Formular-Session": d["sid"]}, timeout=90, json={
        "customerEmail": "delivered@resend.dev", "customerName": "TEST_It75 UI",
        "pdfBase64": base64.b64encode(b"%PDF-1.4\n%%EOF\n" * 30).decode(), "formSummaryHtml": html,
        "formSummary": {"iban": "DE89370400440532013000", "secondInvestor": None}})
    print(r.status_code, r.text); d["sub"] = r.json().get("submissionId"); json.dump(d, open(S, "w"))
if cmd == "clean" and json.load(open(S)).get("sub"):
    sid = json.load(open(S))["sub"]
    db.storage_files.delete_many({"subject_id": sid}); print("sub del", db.contract_form_submissions.delete_one({"_id": ObjectId(sid)}).deleted_count)

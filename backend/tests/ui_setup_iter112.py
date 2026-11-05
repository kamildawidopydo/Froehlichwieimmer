# Helper for iter112 UI tests: create TEST requests as customer (Rabobank + optional second bond). Prints ids.
import sys
import requests
B = [l.split("=", 1)[1].strip() for l in open("/app/frontend/.env") if l.startswith("REACT_APP_BACKEND_URL=")][0].rstrip("/")


def login(e, p):
    s = requests.Session(); s.headers.update({"Origin": B})
    assert s.post(B + "/api/auth/login", json={"email": e, "password": p}).status_code == 200
    return s


c = login("tester@mester.de", "HHHKKK222")
a = login("qa.admin@kapital-direkt24.de", "Qa-ra46CVrWIW3wg6l5EI6IKqbx")
mode = sys.argv[1]
if mode == "rabo":
    r = c.post(B + "/api/bonds/requests", json={"bond_id": "6aec4ccd70262b166764f09d", "amount_eur": 1000})
    print("RID", r.status_code, r.json().get("id"))
elif mode == "second":
    cat = c.get(B + "/api/bonds/catalog").json()
    b = next(x for x in cat if x["id"] != "6aec4ccd70262b166764f09d" and x.get("requests_enabled") is not False
             and (x.get("min_order_eur") or 0) <= 5000 and (x.get("denomination") or 0) <= 1000)
    amt = max(1000, b.get("min_order_eur") or 0)
    r = c.post(B + "/api/bonds/requests", json={"bond_id": b["id"], "amount_eur": amt})
    rid = r.json().get("id")
    nom = b.get("denomination") or 1000
    nom = nom * max(1, round(1000 / nom))
    o = a.post(B + f"/api/admin/bonds/requests/{rid}/offer", json={"price_pct": 99.5, "nominal": nom, "valid_until": "2027-12-31"})
    print("RID2", r.status_code, rid, o.status_code, b["bond_name"])
elif mode == "counts":
    print(a.get(B + "/api/admin/notifications/counts").json()["counts"]["bond_offer_responses"])

# Iteration 69 helper: seed / cleanup tester@mester.de depot data (usage: python iter69_seed.py seed|clean)
import json, sys, requests
B = open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].split()[0].rstrip("/")
UID = "6adf710ec883ed7588dd7e36"
S = "/tmp/iter69_seed.json"
a = requests.Session()
assert a.post(f"{B}/api/auth/login", json={"email": "petrowski616@outlook.com", "password": "HHHKKK222"}).status_code == 200
if sys.argv[1] == "seed":
    banks = a.get(f"{B}/api/admin/banks/list?limit=500").json()["items"]
    b1, b2 = banks[0], banks[5]
    out = {"banks": [b1.get("name"), b2.get("name")]}
    r1 = a.post(f"{B}/api/admin/customers/{UID}/depot-contracts", json={"bank_id": b1["id"], "product_type": "festgeld", "amount_eur": 10000, "zinssatz": 3.1, "laufzeit_monate": 12, "active_from": "2026-01-01", "note": "TEST_iter69"})
    r2 = a.post(f"{B}/api/admin/customers/{UID}/depot-contracts", json={"bank_id": b2["id"], "product_type": "tagesgeld", "amount_eur": 5000, "zinssatz": 2.5, "active_from": "2026-01-01", "note": "TEST_iter69"})
    r3 = a.post(f"{B}/api/admin/customers/{UID}/stock-positions", json={"symbol": "AAPL", "name": "Apple Inc.", "quantity": 10, "avg_cost": 150})
    r4 = a.post(f"{B}/api/admin/customers/{UID}/bond-positions", json={"isin": "DE0001102580", "bond_name": "TEST Bund 2032", "issuer": "Bund", "nominal_betrag": 2000, "kurs": 98.5, "coupon_rate": 2.1, "maturity_date": "2032-02-15"})
    r5 = a.post(f"{B}/api/admin/customers/{UID}/documents", files={"file": ("TEST_iter69.pdf", b"%PDF-1.4\n%%EOF\n", "application/pdf")}, data={"title": "TEST_iter69 Depotauszug"})
    for r in (r1, r2, r3, r4, r5):
        print(r.status_code, r.text[:300])
    out.update(contracts=[r1.json()["id"], r2.json()["id"]], stock=r3.json().get("id"), bond=r4.json().get("id"), doc=r5.json().get("id"))
    json.dump(out, open(S, "w")); print(out)
else:
    d = json.load(open(S))
    for c in d["contracts"]:
        print(a.delete(f"{B}/api/admin/depot-contracts/{c}").status_code)
    print(a.delete(f"{B}/api/admin/stock-positions/{d['stock']}").status_code)
    print(a.delete(f"{B}/api/admin/bond-positions/{d['bond']}").status_code)
    print(a.delete(f"{B}/api/admin/customer-documents/{d['doc']}").status_code)
    for p in a.get(f"{B}/api/admin/payout-requests?status=pending").json():
        if p["customer_email"] == "tester@mester.de":
            print("reject", p["id"], a.post(f"{B}/api/admin/payout-requests/{p['id']}/reject", json={"reason": "TEST cleanup"}).status_code)

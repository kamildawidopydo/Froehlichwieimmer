import json
import urllib.error
import urllib.request

from dotenv import dotenv_values

lv = dotenv_values("/app/lovable_source/.env")
be = dotenv_values("/app/backend/.env")
URL = (lv.get("VITE_SUPABASE_URL") or lv.get("SUPABASE_URL")).strip().strip('"')
KEY = (lv.get("VITE_SUPABASE_PUBLISHABLE_KEY") or lv.get("SUPABASE_PUBLISHABLE_KEY")).strip().strip('"')


def call(path, method="GET", body=None, token=None, extra=None):
    h = {"apikey": KEY, "Content-Type": "application/json", "Authorization": f"Bearer {token or KEY}"}
    h.update(extra or {})
    req = urllib.request.Request(URL + path, method=method, headers=h, data=json.dumps(body).encode() if body else None)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.headers, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.headers, e.read().decode()


def login():
    st, _, txt = call("/auth/v1/token?grant_type=password", "POST",
                      {"email": be["LOVABLE_ADMIN_EMAIL"].strip(), "password": be["LOVABLE_ADMIN_PASSWORD"].strip()})
    if st != 200:
        print("LOGIN FAILED", st, json.loads(txt).get("error_description") or json.loads(txt).get("msg"))
        return None
    d = json.loads(txt)
    print("LOGIN OK, user role:", d["user"].get("role"), "| app_metadata:", d["user"].get("app_metadata", {}).get("role"))
    return d["access_token"]


if __name__ == "__main__":
    print("project:", URL.split("//")[1].split(".")[0])
    tok = login()
    if tok:
        tables = json.load(open("/app/memory/lovable_export/tables.json"))
        res = {}
        for t in tables:
            st, h, _ = call(f"/rest/v1/{t}?select=*&limit=1", token=tok, extra={"Prefer": "count=exact", "Range": "0-0"})
            cr = h.get("Content-Range", "") if h else ""
            res[t] = cr.split("/")[-1] if st in (200, 206) else f"HTTP {st}"
        for t, c in res.items():
            print(f"{t}: {c}")
        json.dump(res, open("/app/memory/lovable_export/table_counts.json", "w"), indent=1)

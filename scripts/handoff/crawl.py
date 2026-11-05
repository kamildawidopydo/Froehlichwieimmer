"""Crawlt die öffentliche Website (ohne Login) für das Übergabepaket.
Aufruf: python crawl.py https://essenceinvest.com /app/exports/handoff
"""
import asyncio
import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import urlparse

from playwright.async_api import async_playwright

BASE = sys.argv[1].rstrip("/")
OUT = Path(sys.argv[2])
APP_JS = Path("/app/frontend/src/App.js").read_text(encoding="utf-8")
WIDTHS = {"desktop-1440": 1440, "tablet-810": 810, "mobile-390": 390}
PRIVATE = ("/dashboard", "/admin", "/mein-", "/portal", "/onboarding")
STORAGE = {
    "kapitalmitte_visitor_profile": json.dumps({"role": "private", "residence": "DE", "version": "1.0",
                                                "timestamp": "2026-01-01T00:00:00Z"}),
    "kapitalmitte_cookie_consent": json.dumps({"preferences": {"necessary": True, "preferences": False,
                                               "analytics": False, "marketing": False},
                                               "version": "1.0", "timestamp": "2026-01-01T00:00:00Z"}),
}

EXTRACT_JS = r"""
() => {
  const txt = (el) => (el.innerText || '').replace(/\n{3,}/g, '\n\n').trim();
  const blocks = [];
  const roots = document.querySelectorAll('header, nav, main > *, section, footer');
  const seen = new Set();
  roots.forEach((el, i) => {
    if ([...seen].some((s) => s.contains(el))) return;
    seen.add(el);
    const h = el.querySelector('h1,h2,h3');
    blocks.push({ index: i, tag: el.tagName.toLowerCase(), id: el.id || null,
      testid: el.getAttribute('data-testid'), heading: h ? h.innerText.trim() : null, text: txt(el) });
  });
  const link = (a) => ({ text: (a.innerText || a.getAttribute('aria-label') || '').trim(), href: a.href,
    target: a.target || null });
  const region = (sel) => [...document.querySelectorAll(sel + ' a[href]')].map(link);
  const imgs = [...document.querySelectorAll('img')].map((i) => ({ src: i.currentSrc || i.src, alt: i.alt || null,
    title: i.title || null, width: i.naturalWidth, height: i.naturalHeight }));
  const forms = [...document.querySelectorAll('form, [role=form]')].map((f) => ({
    testid: f.getAttribute('data-testid'), id: f.id || null,
    fields: [...f.querySelectorAll('input, select, textarea')].map((x) => ({
      tag: x.tagName.toLowerCase(), type: x.type || null, name: x.name || null, id: x.id || null,
      placeholder: x.placeholder || null, required: x.required,
      label: (x.labels && x.labels[0] ? x.labels[0].innerText.trim() : x.getAttribute('aria-label')),
      options: x.tagName === 'SELECT' ? [...x.options].map((o) => o.text) : undefined })),
    buttons: [...f.querySelectorAll('button')].map((b) => b.innerText.trim()).filter(Boolean) }));
  const inputsOutsideForms = [...document.querySelectorAll('input, select, textarea')].filter((x) => !x.closest('form'))
    .map((x) => ({ tag: x.tagName.toLowerCase(), type: x.type || null, placeholder: x.placeholder || null,
      testid: x.getAttribute('data-testid'), label: x.getAttribute('aria-label'),
      options: x.tagName === 'SELECT' ? [...x.options].map((o) => o.text) : undefined }));
  const meta = {};
  document.querySelectorAll('meta[name], meta[property]').forEach((m) => {
    meta[m.getAttribute('name') || m.getAttribute('property')] = m.content; });
  return { title: document.title, canonical: (document.querySelector('link[rel=canonical]') || {}).href || null,
    meta, blocks, header_links: region('header'), footer_links: region('footer'),
    all_links: [...document.querySelectorAll('a[href]')].map(link), images: imgs, forms, inputs: inputsOutsideForms,
    buttons: [...document.querySelectorAll('main button, section button')].map((b) => b.innerText.trim()).filter(Boolean).slice(0, 80) };
}
"""


def routes():
    redirects = dict(re.findall(r'path="([^"]+)"\s+element=\{<Navigate\s+to="([^"]+)"', APP_JS))
    paths = sorted(set(re.findall(r'path="(/[^"]*)"', APP_JS)))
    public = [p for p in paths if not p.startswith(PRIVATE) and p != "/*"]
    static = [p for p in public if ":" not in p and p not in redirects]
    templates = [p for p in public if ":" in p]
    return static, templates, redirects


def slug(path):
    s = re.sub(r"[^a-zA-Z0-9]+", "_", path.strip("/")) or "startseite"
    return s[:120]


async def autoscroll(page):
    await page.evaluate("""async () => { const step = 600; let y = 0;
      while (y < document.body.scrollHeight) { window.scrollTo(0, y); y += step; await new Promise(r => setTimeout(r, 120)); }
      window.scrollTo(0, 0); }""")
    await page.wait_for_timeout(800)


async def new_ctx(browser, width, consent=True):
    ctx = await browser.new_context(viewport={"width": width, "height": 900}, locale="de-DE")
    if consent:
        js = "".join(f"localStorage.setItem({json.dumps(k)}, {json.dumps(v)});" for k, v in STORAGE.items())
        await ctx.add_init_script(js)
    return ctx


async def capture(browser, path, results, api_log, discovered, kind):
    sname = slug(path)
    cache = OUT / "entries" / f"{sname}.json"
    if cache.exists():
        c = json.loads(cache.read_text(encoding="utf-8"))
        results.append(c["entry"])
        api_log.extend(c["api"])
        discovered.update(c["links"])
        return
    my_api, my_links = [], set()
    entry = {"path": path, "kind": kind, "url": BASE + path, "screens": {}, "states": []}
    for label, width in WIDTHS.items():
        ctx = await new_ctx(browser, width)
        page = await ctx.new_page()

        def on_resp(r, _p=path):
            if "/api/" in r.url:
                my_api.append({"page": _p, "url": r.url.split("?")[0], "status": r.status,
                               "type": r.headers.get("content-type", "")})
        page.on("response", on_resp)
        try:
            resp = await page.goto(BASE + path, wait_until="networkidle", timeout=45000)
            entry["http_status"] = resp.status if resp else None
            await autoscroll(page)
            final = urlparse(page.url).path
            entry["final_path"] = final
            shot = OUT / "screenshots" / label / f"{sname}.jpg"
            shot.parent.mkdir(parents=True, exist_ok=True)
            await page.screenshot(path=str(shot), full_page=True, type="jpeg", quality=55)
            entry["screens"][label] = str(shot.relative_to(OUT))
            if label == "desktop-1440":
                data = await page.evaluate(EXTRACT_JS)
                entry.update({k: data[k] for k in ("title", "canonical", "meta")})
                (OUT / "inhalte" / "seiten").mkdir(parents=True, exist_ok=True)
                (OUT / "inhalte" / "seiten" / f"{sname}.json").write_text(
                    json.dumps({"url": BASE + path, **data}, ensure_ascii=False, indent=1), encoding="utf-8")
                for l in data["all_links"]:
                    my_links.add(l["href"])
                await states_desktop(page, sname, entry)
            if label == "mobile-390":
                await state_mobile_nav(page, sname, entry)
        except Exception as exc:  # noqa: BLE001
            entry.setdefault("errors", []).append(f"{label}: {exc}"[:300])
        await ctx.close()
    results.append(entry)
    api_log.extend(my_api)
    discovered.update(my_links)
    cache.parent.mkdir(parents=True, exist_ok=True)
    cache.write_text(json.dumps({"entry": entry, "api": my_api, "links": sorted(my_links)}, ensure_ascii=False), encoding="utf-8")
    print(time.strftime("%H:%M:%S"), kind, path, entry.get("title"), entry.get("errors", ""), flush=True)


async def states_desktop(page, sname, entry):
    d = OUT / "screenshots" / "zustaende" / sname
    tabs = page.locator("main [role=tab]")
    for i in range(min(await tabs.count(), 8)):
        try:
            await tabs.nth(i).click(timeout=2000)
            await page.wait_for_timeout(500)
            d.mkdir(parents=True, exist_ok=True)
            p = d / f"tab_{i+1}.jpg"
            await tabs.nth(i).scroll_into_view_if_needed()
            await page.screenshot(path=str(p), type="jpeg", quality=55)
            entry["states"].append({"state": f"Tab {i+1}: {(await tabs.nth(i).inner_text())[:60]}", "file": str(p.relative_to(OUT))})
        except Exception:  # noqa: BLE001
            pass
    exp = page.locator("main [aria-expanded=false], main summary")
    for i in range(min(await exp.count(), 6)):
        try:
            el = exp.nth(i)
            name = (await el.inner_text())[:60]
            await el.scroll_into_view_if_needed()
            await el.click(timeout=2000)
            await page.wait_for_timeout(400)
            d.mkdir(parents=True, exist_ok=True)
            p = d / f"aufgeklappt_{i+1}.jpg"
            await page.screenshot(path=str(p), type="jpeg", quality=55)
            entry["states"].append({"state": f"Aufgeklappt: {name}", "file": str(p.relative_to(OUT))})
        except Exception:  # noqa: BLE001
            pass


async def state_mobile_nav(page, sname, entry):
    btn = page.locator("header button[aria-label*='enü' i], header button[aria-label*='menu' i]").first
    try:
        if await btn.count():
            await page.evaluate("window.scrollTo(0,0)")
            await btn.click(timeout=2000)
            await page.wait_for_timeout(600)
            p = OUT / "screenshots" / "zustaende" / sname / "mobile_navigation_offen.jpg"
            p.parent.mkdir(parents=True, exist_ok=True)
            await page.screenshot(path=str(p), type="jpeg", quality=55)
            entry["states"].append({"state": "Mobile Navigation geöffnet", "file": str(p.relative_to(OUT))})
    except Exception:  # noqa: BLE001
        pass


async def header_menus(browser):
    """Desktop-Hauptmenü: jedes Menü einzeln geöffnet (Hover/Klick)."""
    ctx = await new_ctx(browser, 1440)
    page = await ctx.new_page()
    await page.goto(BASE + "/", wait_until="networkidle", timeout=45000)
    out = []
    items = page.locator("header nav button, header nav [aria-haspopup]")
    d = OUT / "screenshots" / "zustaende" / "hauptmenue"
    d.mkdir(parents=True, exist_ok=True)
    for i in range(min(await items.count(), 14)):
        try:
            el = items.nth(i)
            name = (await el.inner_text()).strip()[:40]
            await el.hover()
            await page.wait_for_timeout(500)
            if (await el.get_attribute("aria-expanded")) == "false":
                await el.click(timeout=1500)
                await page.wait_for_timeout(500)
            p = d / f"menue_{i+1}_{slug(name)}.jpg"
            await page.screenshot(path=str(p), type="jpeg", quality=60)
            links = await page.evaluate("() => [...document.querySelectorAll('[role=menu] a, [data-radix-popper-content-wrapper] a, header nav a')].map(a => ({text: a.innerText.trim(), href: a.href}))")
            out.append({"menu": name, "file": str(p.relative_to(OUT)), "links": links})
            await page.mouse.move(5, 600)
            await page.keyboard.press("Escape")
        except Exception:  # noqa: BLE001
            pass
    await ctx.close()
    return out


async def consent_states(browser):
    """Wohnsitz-/Besucherrollenabfrage und Cookie-Abfrage in allen Zuständen."""
    res = []
    d = OUT / "screenshots" / "abfragen"
    d.mkdir(parents=True, exist_ok=True)
    for label, width in WIDTHS.items():
        ctx = await new_ctx(browser, width, consent=False)
        page = await ctx.new_page()
        await page.goto(BASE + "/", wait_until="networkidle", timeout=45000)
        await page.wait_for_timeout(1500)
        p = d / f"{label}_1_besucherabfrage.jpg"
        await page.screenshot(path=str(p), type="jpeg", quality=60)
        info = await page.evaluate("""() => ({
          dialogs: [...document.querySelectorAll('[role=dialog], [aria-modal=true]')].map(d => d.innerText.trim()),
          selects: [...document.querySelectorAll('[role=dialog] select, [aria-modal=true] select, select')].map(s => ({label: (s.labels && s.labels[0] ? s.labels[0].innerText : s.getAttribute('aria-label')), options: [...s.options].map(o => o.text)})),
          radios: [...document.querySelectorAll('[role=dialog] input[type=radio], [role=dialog] [role=radio]')].map(r => r.value || r.innerText),
          buttons: [...document.querySelectorAll('[role=dialog] button, [aria-modal=true] button')].map(b => b.innerText.trim()).filter(Boolean) })""")
        res.append({"viewport": label, "state": "Besucher-/Wohnsitzabfrage", "file": str(p.relative_to(OUT)), **info})
        if label == "desktop-1440":
            sels = page.locator("select")
            for si in range(await sels.count()):
                opts = await sels.nth(si).locator("option").all_inner_texts()
                for oi, ot in enumerate(opts[:40]):
                    try:
                        await sels.nth(si).select_option(index=oi)
                        await page.wait_for_timeout(250)
                        q = d / f"auswahl_{si+1}_{oi+1}.jpg"
                        await page.screenshot(path=str(q), type="jpeg", quality=50)
                        res.append({"viewport": label, "state": f"Auswahlfeld {si+1}: {ot}", "file": str(q.relative_to(OUT))})
                    except Exception:  # noqa: BLE001
                        pass
            try:
                await sels.last.select_option(index=1)
            except Exception:  # noqa: BLE001
                pass
        for step, rx in enumerate([r"Akzeptieren|Weiter|Bestätigen|Fortfahren", r"Einstellungen|Anpassen", r"Speichern|Alle akzeptieren"], 2):
            try:
                b = page.get_by_role("button", name=re.compile(rx)).first
                if await b.count():
                    await b.click(timeout=2000)
                    await page.wait_for_timeout(800)
                    p = d / f"{label}_{step}_nach_{slug(rx)[:20]}.jpg"
                    await page.screenshot(path=str(p), type="jpeg", quality=60)
                    txt = await page.evaluate("() => [...document.querySelectorAll('[role=dialog], [aria-modal=true], [data-testid*=cookie i]')].map(d => d.innerText.trim())")
                    res.append({"viewport": label, "state": f"Nach Klick auf '{rx}'", "file": str(p.relative_to(OUT)), "dialogs": txt})
            except Exception:  # noqa: BLE001
                pass
        await ctx.close()
    return res


def match_template(tpl, url_path):
    rx = "^" + re.sub(r":[^/]+", "[^/]+", tpl) + "$"
    return re.match(rx, url_path) is not None


async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    static, templates, redirects = routes()
    results, api_log, discovered = [], [], set()
    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        sem = asyncio.Semaphore(3)

        async def run(p, kind):
            async with sem:
                await capture(browser, p, results, api_log, discovered, kind)

        await asyncio.gather(*(run(p, "fest") for p in static))
        internal = sorted({urlparse(u).path for u in discovered if urlparse(u).netloc in ("", urlparse(BASE).netloc)})
        tpl_map = {t: [u for u in internal if match_template(t, u) and u not in static] for t in templates}
        examples = [v[0] for v in tpl_map.values() if v]
        await asyncio.gather(*(run(p, "vorlagen-beispiel") for p in examples))
        menus = await header_menus(browser)
        consent = await consent_states(browser)
        await browser.close()
    externals = sorted({u for u in discovered if urlparse(u).scheme in ("http", "https")
                        and urlparse(u).netloc not in ("", urlparse(BASE).netloc)})
    other = sorted(u for u in discovered if urlparse(u).scheme not in ("http", "https"))
    (OUT / "crawl.json").write_text(json.dumps({
        "base": BASE, "crawled_at": time.strftime("%Y-%m-%d %H:%M:%S %Z"),
        "pages": sorted(results, key=lambda r: r["path"]), "redirects": redirects,
        "templates": tpl_map, "internal_links_discovered": internal, "external_links": externals,
        "other_links": other, "api_calls": api_log, "header_menus": menus, "consent_states": consent,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    print("FERTIG", len(results), flush=True)


asyncio.run(main())

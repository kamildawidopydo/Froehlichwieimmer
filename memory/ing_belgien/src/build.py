import pymupdf as f

SRC = "/app/memory/ing_belgien/src"
OUT = "/app/memory/ing_belgien"
REG, BOLD = f"{SRC}/DINish-Regular.ttf", f"{SRC}/DINish-Bold.ttf"
FR, FB = f.Font(fontfile=REG), f.Font(fontfile=BOLD)
BANK = "ING Belgien SA/NV"
ADDR_FOOT = "ING Belgien SA/NV | Avenue Marnix 24 | 1000 Brüssel | Belgien | Unternehmensnr. 0403.200.393 (RPM Brüssel)"


def rgb(c):
    return ((c >> 16) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255)


def lines_of(page):
    out = []
    for b in page.get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            if l["dir"] != (1.0, 0.0):
                continue
            out.append(l)
    return out


def find_line(page, startswith, x_min=0, exact=False, x_max=1000):
    for l in lines_of(page):
        t = "".join(s["text"] for s in l["spans"])
        ok = t.strip() == startswith if exact else t.startswith(startswith)
        if ok and x_min <= l["bbox"][0] <= x_max:
            return l
    raise ValueError(f"line not found: {startswith!r} on page {page.number + 1}")


class Editor:
    def __init__(self, path):
        self.doc = f.open(path)
        self.ops = {}

    def page(self, n):
        p = self.doc[n - 1]
        self.ops.setdefault(n, [])
        return p

    def redact(self, n, rect):
        p = self.page(n)
        r = f.Rect(rect)
        p.add_redact_annot(f.Rect(r.x0 - 0.3, r.y0 + 0.3, r.x1 + 0.6, r.y1 - 0.3), fill=False)

    def write(self, n, x, y, segments):
        # segments: list of (text, bold, size, color)
        self.ops[n].append((x, y, segments))

    def replace_line(self, n, startswith, new_text=None, x_min=0, segments=None, exact=False, x_max=1000):
        l = find_line(self.page(n), startswith, x_min, exact, x_max)
        s0 = l["spans"][0]
        self.redact(n, l["bbox"])
        x, y = s0["origin"]
        if segments is None:
            segments = [(new_text, "Bold" in s0["font"], s0["size"], s0["color"])]
        self.write(n, x, y, segments)

    def reflow(self, n, first_starts, n_lines, text, width, x_min=0, slots=None, extra_slots=0):
        """Replace n_lines consecutive lines starting at first_starts by re-wrapped text."""
        p = self.page(n)
        all_lines = [l for l in lines_of(p) if abs(l["bbox"][0] - find_line(p, first_starts, x_min)["bbox"][0]) < 1]
        start = find_line(p, first_starts, x_min)
        idx = next(i for i, l in enumerate(all_lines) if l is start or l["bbox"] == start["bbox"])
        block = all_lines[idx: idx + n_lines]
        s0 = block[0]["spans"][0]
        size, color = s0["size"], s0["color"]
        positions = [l["spans"][0]["origin"] for l in block]
        for l in block:
            self.redact(n, l["bbox"])
        if len(positions) > 1:
            step = positions[1][1] - positions[0][1]
        else:
            step = size * 1.3
        if slots:
            positions = positions + slots
        for _ in range(extra_slots):
            positions.append((positions[-1][0], positions[-1][1] + step))
        wrapped = self.wrap(text, size, width)
        if len(wrapped) > len(positions):
            raise ValueError(f"overflow on page {n}: {len(wrapped)} lines > {len(positions)} slots for {first_starts!r}")
        for (x, y), line in zip(positions, wrapped):
            self.write(n, x, y, [(line, False, size, color)])

    @staticmethod
    def wrap(text, size, width):
        out, cur = [], ""
        for w in text.split():
            cand = (cur + " " + w).strip()
            if FR.text_length(cand, fontsize=size) <= width:
                cur = cand
            else:
                out.append(cur)
                cur = w
        out.append(cur)
        return out

    def logo(self, n, rect, bg=None, file="ing_logo.png"):
        self.ops[n].append(("logo", rect, bg, file))

    def save(self, path):
        for n, ops in self.ops.items():
            p = self.doc[n - 1]
            p.apply_redactions(images=f.PDF_REDACT_IMAGE_NONE, graphics=f.PDF_REDACT_LINE_ART_NONE, text=f.PDF_REDACT_TEXT_REMOVE)
            p.insert_font(fontname="dinr", fontfile=REG)
            p.insert_font(fontname="dinb", fontfile=BOLD)
            for op in ops:
                if op[0] == "logo":
                    _, rect, bg, file = op
                    if bg is not None:
                        p.draw_rect(f.Rect(rect), color=None, fill=bg, overlay=True)
                    p.insert_image(f.Rect(rect), filename=f"{SRC}/{file}", keep_proportion=True, overlay=True)
                    continue
                x, y, segs = op
                for text, bold, size, color in segs:
                    fn, fo = ("dinb", FB) if bold else ("dinr", FR)
                    p.insert_text((x, y), text, fontname=fn, fontsize=size, color=rgb(color))
                    x += fo.text_length(text, fontsize=size)
        self.doc.set_metadata({**self.doc.metadata, "title": path.rsplit("/", 1)[-1].replace(".pdf", ""), "author": "Fröhlich Vermögensberatung GmbH", "producer": "Fröhlich Vermögensberatung GmbH"})
        self.doc.save(path, garbage=3, deflate=True)


def fix_logo(ed, n, broken_img_rect, ing_text_line_start, logo_rect, bg=None):
    l = find_line(ed.page(n), ing_text_line_start)
    ed.redact(n, l["bbox"])
    ed.logo(n, logo_rect, bg)


def build_vertrag():
    ed = Editor(f"{SRC}/nl.pdf")
    # Logo (broken image + alt text "ING") on all pages
    for n, y in [(1, 17), (2, 8), (3, 7), (4, 8)]:
        p = ed.page(n)
        l = next(l for l in lines_of(p) if "".join(s["text"] for s in l["spans"]).strip() == "ING" and l["bbox"][1] < 40)
        ed.redact(n, l["bbox"])
        ed.logo(n, (39, y - 1, 39 + 52, y + 12), bg=(1, 1, 1))
    # Footers
    ed.replace_line(1, "ING B.V. | Landsberger", ADDR_FOOT)
    for n in (2, 3, 4):
        ed.replace_line(n, "ING B.V. | Naritaweg", ADDR_FOOT)
    # Page 1
    l = find_line(ed.page(1), "ING B.V.", exact=True)
    s = l["spans"][0]
    ed.redact(1, l["bbox"])
    cx = (l["bbox"][0] + l["bbox"][2]) / 2
    ed.write(1, cx - FB.text_length(BANK, fontsize=s["size"]) / 2, s["origin"][1], [(BANK, True, s["size"], s["color"])])
    ed.reflow(1, "Dieses Dokument bestätigt", 2,
              f"Dieses Dokument bestätigt die Vereinbarung zwischen dem oben genannten Anleger und der {BANK} über eine Flexgeldanlage zu den nachfolgend aufgeführten Bedingungen.",
              503)
    # Page 2
    ed.reflow(2, "Die Gewährung des Willkommensbonus", 2,
              f"Die Gewährung des Willkommensbonus setzt voraus, dass zum Zeitpunkt der Kontoeröffnung keine bestehende Geschäftsbeziehung in Form eines Kontos bei der {BANK} vorliegt. Der Bonus wird ausschließlich Neukunden gewährt. Bestehende oder ehemalige Kontoverbindungen können zum Ausschluss von der Bonusgewährung führen.",
              497)
    # Page 3 – § 9 Einlagensicherung (column 2 bottom + column 3 top)
    p3 = ed.page(3)
    col3 = [l for l in lines_of(p3) if abs(l["bbox"][0] - 389.2) < 1 and 175 < l["bbox"][1] < 220]
    col3_pos = [l["spans"][0]["origin"] for l in col3]
    for l in col3:
        ed.redact(3, l["bbox"])
    ed.reflow(3, "Die Einlagen bei der Bank sind durch das", 9,
              "Die Einlagen bei der Bank sind durch das belgische Einlagensicherungssystem geschützt. Zuständige Sicherungseinrichtung ist der Garantiefonds für Finanzdienstleistungen (Garantiefonds voor financiële diensten / Fonds de garantie pour les services financiers) beim FÖD Finanzen. Die Absicherung beträgt bis zu 100.000 € pro Einleger und Kreditinstitut; bei Gemeinschaftskonten bis zu 200.000 €. Eine Entschädigung wird in Euro ausgezahlt. Nähere Informationen ergeben sich aus dem Informationsblatt für Einleger.",
              156, x_min=200, slots=col3_pos)
    ed.reflow(3, "Geschäftsbedingungen der ING B.V.", 4,
              f"Geschäftsbedingungen der {BANK} sowie die Sonderbedingungen für den Zahlungsverkehr; bei Widersprüchen haben diese Flexgeldbedingungen Vorrang.",
              152, x_min=380, extra_slots=1)
    # Page 4
    ed.reflow(4, "Ich bestätige, die Datenschutzhinweise", 5,
              f"Ich bestätige, die Datenschutzhinweise der {BANK} (abrufbar unter https://www.essenceinvest.com) zur Kenntnis genommen zu haben und willige ein, dass meine personenbezogenen Daten im Einklang mit der DSGVO und dem BDSG zum Zwecke der Durchführung und Abwicklung der Geschäftsbeziehung, insbesondere nach GwG und KWG, verarbeitet",
              228, x_min=300)
    ed.replace_line(4, "Aufnahmebestätigung der ING B.V.", f"Aufnahmebestätigung der {BANK}")
    ed.reflow(4, "Die ING B.V. bestätigt hiermit", 2,
              f"Die {BANK} bestätigt hiermit die Annahme des Kundenantrags. Die Begründung der Geschäftsbeziehung erfolgt vorbehaltlich der abschließenden Prüfung sämtlicher erforderlicher Unterlagen sowie der Einhaltung gesetzlicher und aufsichtsrechtlicher Anforderungen.",
              488)
    ed.save(f"{OUT}/ING_Belgien_Flexgeldvertrag.pdf")


def build_produktinfo():
    ed = Editor(f"{SRC}/de.pdf")
    dark = None
    for n in (1, 2, 3, 4):
        p = ed.page(n)
        l = next(l for l in lines_of(p) if "".join(s["text"] for s in l["spans"]).strip() == "ING" and l["bbox"][1] < 30)
        ed.redact(n, l["bbox"])
        ed.logo(n, (24, 6, 24 + 62, 6 + 16), bg=(8 / 255, 32 / 255, 24 / 255), file="ing_logo_dark.png")
        ed.replace_line(n, "ING B.V. | Landsberger", ADDR_FOOT)
    ed.replace_line(1, "ING B.V. | Stand", f"{BANK} | Stand: 11.06.2026")
    for n in (2, 3, 4):
        ed.replace_line(n, "ING B.V. | Produktinformationsblatt", f"{BANK} | Produktinformationsblatt Flexgeld")
    # right-align header texts
    for n, ops in ed.ops.items():
        for i, op in enumerate(ops):
            if op[0] != "logo" and op[2][0][0].startswith(f"{BANK} | ") and op[1] < 30 and op[0] > 400:
                text, bold, size, color = op[2][0]
                x = 570.5 - FR.text_length(text, fontsize=size)
                ops[i] = (x, op[1], op[2])
    # Page 1 intro (bold bank name across lines)
    p1 = ed.page(1)
    l1 = find_line(p1, "Dieses Dokument enthält")
    l2 = find_line(p1, "B.V.")
    s1, s2 = l1["spans"][0], l2["spans"][1]
    ed.redact(1, l1["bbox"]); ed.redact(1, l2["bbox"])
    size, col = s1["size"], s1["color"]
    bcol = l1["spans"][1]["color"]
    ed.write(1, s1["origin"][0], s1["origin"][1], [
        ("Dieses Dokument enthält auf Seite 1 eine zusammenfassende Darstellung der wichtigsten Produktmerkmale der Flexgeldanlage in EUR der ", False, size, col),
        ("ING", True, size, bcol)])
    ed.write(1, s2["origin"][0] - FB.text_length("B.V.", fontsize=size), s1["origin"][1] + 12, [
        ("Belgien SA/NV", True, size, bcol),
        (" [Details auf den Folgeseiten]. Die Angaben stellen keine Anlageberatung dar. Eine aufmerksame Lektüre wird empfohlen.", False, size, col)])
    l3 = find_line(p1, "finden Sie in den Vertragsinformationen")
    ed.redact(1, l3["bbox"])
    ed.write(1, l3["spans"][0]["origin"][0], l3["spans"][0]["origin"][1], [
        ("Weitere Details finden Sie in den Vertragsinformationen sowie unter ", False, size, col),
        ("https://www.essenceinvest.com", True, size, bcol), (".", False, size, col)])
    ed.replace_line(1, "ING B.V.", BANK, exact=True)
    ed.replace_line(1, "Landsberger Str. 302, 80687", "Avenue Marnix 24, 1000 Brüssel, Belgien")
    # Page 2 – c) Einlagensicherung
    l = find_line(ed.page(2), "Einlagen inklusive Zinserträge")
    s = l["spans"][2]
    ed.redact(2, s["bbox"])
    ed.write(2, s["origin"][0], s["origin"][1], [(" je Kunde und je Bank gesetzlich durch den", False, s["size"], s["color"])])
    ed.reflow(2, "Entschädigungseinrichtung deutscher Banken", 2,
              "belgischen Garantiefonds für Finanzdienstleistungen (Garantiefonds voor financiële diensten / Fonds de garantie pour les services financiers, FÖD Finanzen) abgesichert. Im Falle einer Auszahlung erfolgt diese in Euro [EUR].",
              530)
    ed.reflow(2, "Über die gesetzliche Einlagensicherung hinaus", 2,
              "Bei Gemeinschaftskonten beträgt die Absicherung 200.000,00 EUR.", 530)
    ed.reflow(2, "Diese gesetzliche Absicherung bezieht sich", 2,
              f"Diese gesetzliche Absicherung bezieht sich auf die gesamten Einlagen eines Kunden bei der {BANK}. Sie ist insbesondere dann relevant, wenn ein Kunde neben den über die Fröhlich Vermögensberatung GmbH vermittelten Flexgeldeinlagen auch weitere Einlagen bei derselben Bank unterhält.",
              545)
    l = find_line(ed.page(2), "Weitere Informationen finden Sie unter")
    s = l["spans"]
    ed.redact(2, s[2]["bbox"])
    ed.write(2, s[2]["origin"][0], s[2]["origin"][1], [(" sowie im Informationsblatt zur", False, s[2]["size"], s[2]["color"])])
    # Page 4
    ed.reflow(4, "Die Rückzahlung des Flexgelds", 2,
              "Die Rückzahlung des Flexgelds ist mit dem Insolvenzrisiko der Bank behaftet. Im Falle eines Einlagensicherungsfalles würde die Rückzahlung über den Einlagensicherungsfonds in Belgien gemäß den EU-Richtlinien abgewickelt werden.",
              535)
    ed.replace_line(4, "Im Falle einer Einschränkung des Zahlungsverkehrs",
                    "Im Falle einer Einschränkung des Zahlungsverkehrs aus dem Sitzland der Bank (Belgien) könnte es zu Problemen bei der Auszahlung kommen.")
    ed.replace_line(4, "ANSCHRIFT ING B.V.", "ANSCHRIFT ING BELGIEN SA/NV")
    ed.replace_line(4, "Landsberger Str. 302", "Avenue Marnix 24")
    ed.replace_line(4, "80687 München", "1000 Brüssel")
    ed.replace_line(4, "Deutschland", "Belgien", exact=True, x_max=100)
    ed.save(f"{OUT}/ING_Belgien_Produktinformationsblatt_Flexgeld.pdf")


if __name__ == "__main__":
    import os
    os.makedirs(OUT, exist_ok=True)
    build_vertrag()
    build_produktinfo()
    print("OK")

"""Entwurfs-Stellen für die Karriereplattform (werden nie automatisch veröffentlicht)."""

SEED_VERSION = 11

_OFFER = [
    "Eine Tätigkeit für die Fröhlich Vermögensberatung GmbH mit Sitz in Bad Kreuznach",
    "Ein persönlicher Beratungsansatz, bei dem die individuellen Bedürfnisse und finanziellen Ziele der Kunden im Mittelpunkt stehen",
    "Ein reguliertes Umfeld: vertraglich gebundener Vermittler gemäß § 3 Abs. 2 WpIG und Darlehensvermittler gemäß § 34c GewO",
]

_FEST = "Festanstellung"
_TYPE = {
    "quereinsteiger-finanzberatung": "Festanstellung oder selbstständige Tätigkeit",
    "investmentberater": "Festanstellung oder selbstständige Tätigkeit",
    "vertriebsmitarbeiter-finanzdienstleistungen": "Selbstständige Tätigkeit",
}

_AREA = {
    "junior-finanzberater": "Finanzberatung", "quereinsteiger-finanzberatung": "Finanzberatung",
    "investmentberater": "Finanzberatung", "vertriebsmitarbeiter-finanzdienstleistungen": "Vertrieb",
    "kundenbetreuer-vermoegensberatung": "Kundenbetreuung", "recruiting-manager": "Personal & Recruiting",
    "social-media-marketing-manager": "Marketing & Kommunikation", "teamleiter-finanzberatung": "Finanzberatung",
    "assistenz-der-geschaeftsfuehrung": "Geschäftsführung & Verwaltung", "business-development-manager": "Unternehmensentwicklung",
}

def _job(slug, title, level, summary, tasks, reqs, location="Bad Kreuznach", etype=None, area=None, levels=None):
    return {
        "slug": slug, "title": title, "level": level, "levels": levels or [level], "area": area or _AREA[slug], "summary": summary,
        "tasks": tasks, "requirements": reqs, "offer": list(_OFFER),
        "career_path": "",
        "location": location, "employment_type": _TYPE.get(slug, _FEST) if etype is None else etype, "deadline": None,
    }


_BERATER_TASKS = [
    "Persönliche Beratung von Kundinnen und Kunden",
    "Analyse individueller finanzieller Situationen und Ziele",
    "Vorstellung geeigneter Spar-, Festgeld- und Anlagelösungen unserer Partnerbanken",
    "Beachtung regulatorischer Vorgaben und Dokumentation der Beratungsgespräche",
    "Aufbau und Pflege langfristiger Kundenbeziehungen",
]
_BERATER_REQS = [
    "Interesse an Finanzthemen und wirtschaftlichen Zusammenhängen",
    "Kommunikationsstärke und Freude am Umgang mit Menschen",
    "Sorgfältige und verantwortungsbewusste Arbeitsweise",
    "Zuverlässigkeit und Eigeninitiative",
    "Erforderliche fachliche Qualifikationen oder die Bereitschaft, diese zu erwerben",
]
_FB_TASKS = [
    "Ganzheitliche Beratung zu Vermögensaufbau und Geldanlage",
    "Analyse von Anlagezielen, Risikobereitschaft und Zeithorizont",
    "Entwicklung individueller Finanz- und Anlagekonzepte",
    "Beobachtung der Finanzmärkte und Einordnung aktueller Entwicklungen",
    "Dokumentation von Beratungsgesprächen gemäß regulatorischen Vorgaben",
]
_FB_REQS = [
    "Erfahrung in der Finanz- oder Anlageberatung oder vergleichbare Erfahrung in der Kundenbetreuung",
    "Kenntnisse relevanter Finanzprodukte oder die Bereitschaft, sich diese anzueignen",
    "Analytisches Denken und Kundenorientierung",
    "Verantwortungsbewusstsein und Diskretion",
    "Erforderliche fachliche Qualifikationen und regulatorische Berechtigungen oder die Bereitschaft, diese zu erwerben",
]


_BOTH = "Festanstellung oder selbstständige Tätigkeit"
_QE = ["quereinsteiger", "erfahren"]


def _berater(city, slug):
    return _job(f"berater-{slug}", "Berater (m/w/d)", "quereinsteiger",
                f"Sie beraten Kundinnen und Kunden persönlich zu Spar-, Festgeld- und Anlagelösungen und begleiten sie bei wichtigen finanziellen Entscheidungen – am Standort {city}.",
                list(_BERATER_TASKS), list(_BERATER_REQS), location=city, etype=_BOTH, area="Finanzberatung", levels=_QE)


def _finanzberater(city, slug):
    return _job(f"finanzberater-{slug}", "Finanzberater (m/w/d)", "quereinsteiger",
                f"Sie betreuen Kundinnen und Kunden in Finanz- und Vermögensfragen und erarbeiten gemeinsam mit ihnen passende Anlagelösungen – am Standort {city}.",
                list(_FB_TASKS), list(_FB_REQS), location=city, etype=_BOTH, area="Finanzberatung", levels=_QE)


CONTENT_FIELDS = ("title", "level", "levels", "area", "location", "employment_type", "summary", "tasks", "requirements", "offer", "career_path")

SEED_JOBS = [
    _job("junior-finanzberater", "Junior Finanzberater (m/w/d)", "einsteiger",
         "Starten Sie Ihre Karriere in der Finanzwelt und begleiten Sie Menschen auf ihrem Weg zu einer strukturierten finanziellen Zukunft.",
         ["Unterstützung bei der Betreuung von Kunden",
          "Vorbereitung und Begleitung von Beratungsgesprächen",
          "Mitarbeit an individuellen Finanzkonzepten",
          "Analyse von Kundenbedürfnissen",
          "Aufbau langfristiger Kundenbeziehungen"],
         ["Interesse an Finanzmärkten und Investments",
          "Kommunikationsfähigkeit",
          "Eigeninitiative und Lernbereitschaft",
          "Verantwortungsbewusstsein",
          "Freude am Umgang mit Menschen"]),
    _job("quereinsteiger-finanzberatung", "Quereinsteiger Finanzberatung (m/w/d)", "quereinsteiger",
         "Sie möchten sich beruflich neu orientieren und interessieren sich für Finanzen? Entdecken Sie neue Perspektiven in der Finanzberatung.",
         ["Einarbeitung in die Finanzdienstleistungsbranche",
          "Kennenlernen verschiedener Finanzprodukte",
          "Unterstützung bei Kundengesprächen",
          "Aufbau von Fachwissen",
          "Entwicklung langfristiger Kundenbeziehungen"],
         ["Motivation und Lernbereitschaft",
          "Kommunikationsstärke",
          "Interesse an wirtschaftlichen Themen",
          "Zuverlässigkeit",
          "Eigenverantwortliche Arbeitsweise"]),
    _job("investmentberater", "Investmentberater (m/w/d)", "erfahren",
         "Sie verfügen über Erfahrung in der Anlageberatung und möchten Kundinnen und Kunden mit fundierten Investmentstrategien langfristig begleiten.",
         ["Analyse individueller Anlageziele",
          "Entwicklung geeigneter Investmentstrategien",
          "Betreuung bestehender Kunden",
          "Beobachtung von Finanzmärkten",
          "Dokumentation von Beratungsgesprächen"],
         ["Erfahrung in der Finanz- oder Investmentberatung",
          "Kenntnisse relevanter Finanzprodukte",
          "Analytisches Denken",
          "Kundenorientierung",
          "Erforderliche fachliche Qualifikationen und regulatorische Berechtigungen"]),
    _job("vertriebsmitarbeiter-finanzdienstleistungen", "Vertriebsmitarbeiter Finanzdienstleistungen (m/w/d)", "quereinsteiger",
         "Sie begeistern Menschen gerne und möchten im Vertrieb von Finanzdienstleistungen durchstarten? Gewinnen Sie neue Kunden und bauen Sie nachhaltige Beziehungen auf.",
         ["Gewinnung neuer Interessenten",
          "Aufbau von Geschäftskontakten",
          "Vereinbarung von Beratungsterminen",
          "Unterstützung bei Vertriebsaktivitäten",
          "Pflege langfristiger Kundenbeziehungen"],
         ["Kommunikationsstärke",
          "Begeisterung für Vertrieb",
          "Eigeninitiative",
          "Zielorientierung",
          "Interesse an Finanzdienstleistungen"]),
    _job("kundenbetreuer-vermoegensberatung", "Kundenbetreuer Vermögensberatung (m/w/d)", "einsteiger",
         "Als erste Ansprechperson sorgen Sie dafür, dass sich unsere Kundinnen und Kunden jederzeit gut betreut und verstanden fühlen.",
         ["Betreuung bestehender Kunden",
          "Bearbeitung von Kundenanfragen",
          "Koordination von Beratungsterminen",
          "Unterstützung der Finanzberater",
          "Pflege von Kundendaten"],
         ["Organisationstalent",
          "Serviceorientierung",
          "Freundliches Auftreten",
          "Zuverlässigkeit",
          "Sorgfältige Arbeitsweise"]),
    _job("recruiting-manager", "Recruiting Manager (m/w/d)", "erfahren",
         "Sie haben ein Gespür für Menschen und Potenziale? Gestalten Sie unser Recruiting und helfen Sie uns, die richtigen Talente für die Fröhlich Vermögensberatung GmbH zu gewinnen.",
         ["Gewinnung neuer Mitarbeiter",
          "Erstellung von Stellenanzeigen",
          "Organisation von Bewerbungsgesprächen",
          "Betreuung von Bewerbern",
          "Weiterentwicklung unserer Recruiting-Prozesse"],
         ["Kommunikationsfähigkeit",
          "Organisationstalent",
          "Interesse an Personalgewinnung",
          "Eigenverantwortliche Arbeitsweise",
          "Erfahrung im Recruiting von Vorteil"]),
    _job("social-media-marketing-manager", "Social Media & Marketing Manager (m/w/d)", "erfahren",
         "Sie sind kreativ, digital zu Hause und möchten einer Finanzmarke eine starke Stimme geben? Machen Sie die Fröhlich Vermögensberatung GmbH und www.essenceinvest.com sichtbar.",
         ["Betreuung unserer Social-Media-Kanäle",
          "Entwicklung von Marketingkampagnen",
          "Erstellung von Content",
          "Unterstützung beim Employer Branding",
          "Analyse der Kampagnenergebnisse"],
         ["Kreativität",
          "Erfahrung mit sozialen Medien",
          "Interesse an Marketing",
          "Selbstständige Arbeitsweise",
          "Gespür für digitale Trends"]),
    _job("teamleiter-finanzberatung", "Teamleiter Finanzberatung (m/w/d)", "erfahren",
         "Sie möchten Verantwortung übernehmen und ein Team von Beraterinnen und Beratern erfolgreich führen? Gestalten Sie mit uns die Qualität unserer Beratung.",
         ["Fachliche und disziplinarische Führung eines Beratungsteams",
          "Coaching und Weiterentwicklung der Teammitglieder",
          "Sicherstellung einer hohen Beratungsqualität",
          "Planung und Steuerung von Teamzielen",
          "Mitarbeit an Prozessen und strategischen Themen"],
         ["Mehrjährige Erfahrung in der Finanzberatung",
          "Führungserfahrung oder ausgeprägtes Führungspotenzial",
          "Kommunikationsstärke und Verantwortungsbewusstsein",
          "Unternehmerisches Denken",
          "Erforderliche fachliche Qualifikationen und regulatorische Berechtigungen"]),
    _job("assistenz-der-geschaeftsfuehrung", "Assistenz der Geschäftsführung (m/w/d)", "erfahren",
         "Sie behalten auch in turbulenten Zeiten den Überblick? Unterstützen Sie unsere Geschäftsführung als rechte Hand in Organisation und Kommunikation.",
         ["Organisation von Terminen, Reisen und Besprechungen",
          "Vorbereitung von Präsentationen, Berichten und Unterlagen",
          "Koordination interner und externer Kommunikation",
          "Übernahme eigenständiger Projekte",
          "Unterstützung im Tagesgeschäft der Geschäftsführung"],
         ["Abgeschlossene kaufmännische Ausbildung oder Studium",
          "Berufserfahrung in einer Assistenzfunktion",
          "Diskretion und hohe Zuverlässigkeit",
          "Organisationstalent und strukturierte Arbeitsweise",
          "Sehr gute Deutschkenntnisse in Wort und Schrift"]),
    _job("business-development-manager", "Business Development Manager (m/w/d)", "erfahren",
         "Sie denken unternehmerisch und erkennen Chancen, bevor andere sie sehen? Treiben Sie das Wachstum der Fröhlich Vermögensberatung GmbH mit neuen Partnerschaften und Geschäftsfeldern voran.",
         ["Identifikation und Bewertung neuer Geschäftsmöglichkeiten",
          "Aufbau und Pflege strategischer Partnerschaften",
          "Erstellung von Business Cases und Entscheidungsvorlagen",
          "Beobachtung von Markt und Wettbewerb",
          "Enge Zusammenarbeit mit der Geschäftsführung"],
         ["Erfahrung im Business Development, Vertrieb oder in der Strategieberatung",
          "Verständnis für Finanzdienstleistungen",
          "Analytische Stärke und Verhandlungsgeschick",
          "Eigeninitiative und Gestaltungswille",
          "Überzeugendes Auftreten"]),
    _berater("Hamburg", "hamburg"),
    _berater("Berlin", "berlin"),
    _berater("Frankfurt am Main", "frankfurt-am-main"),
    _finanzberater("Frankfurt am Main", "frankfurt-am-main"),
    _berater("Bad Kreuznach", "bad-kreuznach"),
    _finanzberater("Bad Kreuznach", "bad-kreuznach"),
    _job("sekretaer-frankfurt-am-main", "Sekretärin / Sekretär (m/w/d)", "erfahren",
         "Sie sorgen für einen reibungslosen Büroalltag und unterstützen die Geschäftsführung der Fröhlich Vermögensberatung GmbH – am Standort Frankfurt am Main.",
         ["Büroorganisation und Sicherstellung reibungsloser Abläufe im Sekretariat",
          "Terminplanung und Kalenderverwaltung",
          "Bearbeitung der Korrespondenz per E-Mail, Post und Telefon",
          "Unterstützung der Geschäftsführung bei administrativen Aufgaben",
          "Vorbereitung von Besprechungen und Kundenterminen",
          "Dokumentenverwaltung und Ablage unter Beachtung des Datenschutzes"],
         ["Abgeschlossene kaufmännische Ausbildung oder vergleichbare Qualifikation",
          "Berufserfahrung im Sekretariat oder in der Assistenz von Vorteil",
          "Sicherer Umgang mit gängigen Office-Anwendungen",
          "Sehr gute Deutschkenntnisse in Wort und Schrift",
          "Organisationstalent, Zuverlässigkeit und Diskretion",
          "Freundliches und professionelles Auftreten"],
         location="Frankfurt am Main", etype=_FEST, area="Geschäftsführung & Verwaltung"),
]

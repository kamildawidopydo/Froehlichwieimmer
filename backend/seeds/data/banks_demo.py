"""Demo bank master data — Session 93.

WICHTIG:
    * Alle Datensätze werden mit `is_demo=True` und `data_source="demo_seed"`
      geseedet. Sie dürfen NICHT als reale, verifizierte Bankangaben angezeigt
      werden.
    * Logo-URLs bleiben leer (`logo_url=None`). Reale Logos werden später
      manuell oder via Provider-Integration ergänzt (kein Erfinden).
    * Ratings bleiben leer — es werden NIE Fitch/Moody's/S&P-Angaben erfunden.
    * Die Liste ist bewusst als Python-Konstante geführt und deckt die
      wichtigsten europäischen Märkte ab; das Datenmodell ist aber nicht
      auf diese Liste begrenzt.

Verteilung (Session 93 · Phase 1):
    DE ×10  AT ×8   NL ×8   ES ×10  FR ×10
    IT ×4   PT ×3   IE ×3   BE ×3   LU ×2
    EE ×2   LV ×2   LT ×2   FI ×2   SE ×2
    ≈ 71 Banken
"""
from __future__ import annotations
from typing import List, Dict, Any


def _b(slug: str, name: str, cc: str, dgs: str, website: str,
       founded: int | None = None, regulator: str | None = None,
       legal: str | None = None) -> Dict[str, Any]:
    return {
        "slug": slug,
        "name": name,
        "legal_name": legal,
        "country_code": cc,
        "dgs_code": dgs,
        "website_url": website,
        "founded_year": founded,
        "regulator_name": regulator,
    }


# ---------------------------------------------------------------------------
# Bank-Stammdaten (real existierende europäische Banken).
# Diese Master-Daten (Name, Sitz, Regulator, Gründungsjahr) sind öffentlich.
# Zins- und Angebots-Werte werden separat als Demo-Daten geseedet.
# ---------------------------------------------------------------------------
DEMO_BANKS: List[Dict[str, Any]] = [
    # ---------- Deutschland (DE) --------------------------------------------
    _b("deutsche-bank",   "Deutsche Bank",       "DE", "DE_EDB", "https://www.deutsche-bank.de", 1870, "BaFin", "Deutsche Bank AG"),
    _b("commerzbank",     "Commerzbank",         "DE", "DE_EDB", "https://www.commerzbank.de",   1870, "BaFin", "Commerzbank AG"),
    _b("dkb",             "DKB",                 "DE", "DE_EDB", "https://www.dkb.de",           1990, "BaFin", "Deutsche Kreditbank AG"),
    _b("comdirect",       "comdirect",           "DE", "DE_EDB", "https://www.comdirect.de",     1994, "BaFin", "comdirect (Commerzbank AG)"),
    _b("ing",             "ING Deutschland",     "DE", "DE_EDB", "https://www.ing.de",           1965, "BaFin", "ING-DiBa AG"),
    _b("postbank",        "Postbank",            "DE", "DE_EDB", "https://www.postbank.de",      1909, "BaFin", "Postbank – eine Niederlassung der Deutsche Bank AG"),
    _b("targobank",       "TARGOBANK",           "DE", "DE_EDB", "https://www.targobank.de",     1926, "BaFin", "TARGOBANK AG"),
    _b("consorsbank",     "Consorsbank",         "DE", "DE_EDB", "https://www.consorsbank.de",   1994, "BaFin", "Consorsbank (BNP Paribas S.A. Niederlassung Deutschland)"),
    _b("c24-bank",        "C24 Bank",            "DE", "DE_EDB", "https://www.c24.de",           2020, "BaFin", "C24 Bank GmbH"),
    _b("hypovereinsbank", "HypoVereinsbank",     "DE", "DE_EDB", "https://www.hvb.de",           1998, "BaFin", "UniCredit Bank GmbH"),
    _b("volkswagen-bank", "Volkswagen Bank",     "DE", "DE_EDB", "https://www.vwfs.de",          1949, "BaFin", "Volkswagen Bank GmbH"),

    # ---------- Österreich (AT) ---------------------------------------------
    _b("erste-bank",      "Erste Bank",          "AT", "AT_ESA", "https://www.erstebank.at",     1819, "FMA",  "Erste Group Bank AG"),
    _b("raiffeisen-at",   "Raiffeisen Bank International", "AT", "AT_ESA", "https://www.rbinternational.com", 1927, "FMA", "Raiffeisen Bank International AG"),
    _b("bawag",           "BAWAG P.S.K.",        "AT", "AT_ESA", "https://www.bawag.com",        1922, "FMA",  "BAWAG P.S.K. AG"),
    _b("bank-austria",    "Bank Austria",        "AT", "AT_ESA", "https://www.bankaustria.at",   1855, "FMA",  "UniCredit Bank Austria AG"),
    _b("bank99",          "bank99",              "AT", "AT_ESA", "https://www.bank99.at",        2020, "FMA",  "bank99 AG"),
    _b("oberbank",        "Oberbank",            "AT", "AT_ESA", "https://www.oberbank.at",      1869, "FMA",  "Oberbank AG"),
    _b("denizbank-at",    "DenizBank AG",        "AT", "AT_ESA", "https://www.denizbank.at",     1996, "FMA",  "DenizBank AG (Austria)"),
    _b("hypo-noe",        "HYPO NOE",            "AT", "AT_ESA", "https://www.hyponoe.at",       1888, "FMA",  "HYPO NOE Landesbank für Niederösterreich und Wien AG"),

    # ---------- Niederlande (NL) --------------------------------------------
    _b("abn-amro",        "ABN AMRO",            "NL", "NL_DGS", "https://www.abnamro.nl",       1991, "DNB",  "ABN AMRO Bank N.V."),
    _b("rabobank",        "Rabobank",            "NL", "NL_DGS", "https://www.rabobank.nl",      1972, "DNB",  "Coöperatieve Rabobank U.A."),
    _b("bunq",            "bunq",                "NL", "NL_DGS", "https://www.bunq.com",         2012, "DNB",  "bunq B.V."),
    _b("knab",            "Knab",                "NL", "NL_DGS", "https://www.knab.nl",          2012, "DNB",  "Knab (Aegon Bank N.V.)"),
    _b("dhb",             "DHB Bank",            "NL", "NL_DGS", "https://www.dhbbank.com",      1992, "DNB",  "Demir-Halk Bank (Nederland) N.V."),
    _b("nibc-direct",     "NIBC Direct",         "NL", "NL_DGS", "https://www.nibcdirect.de",    1945, "DNB",  "NIBC Bank N.V."),
    _b("triodos",         "Triodos Bank",        "NL", "NL_DGS", "https://www.triodos.com",      1980, "DNB",  "Triodos Bank N.V."),
    _b("ing-nl",          "ING Nederland",       "NL", "NL_DGS", "https://www.ing.nl",           1991, "DNB",  "ING Bank N.V."),

    # ---------- Belgien (BE) ------------------------------------------------
    _b("kbc",             "KBC Bank",            "BE", "BE_GDF", "https://www.kbc.be",           1998, "NBB",  "KBC Bank NV"),
    _b("belfius",         "Belfius",             "BE", "BE_GDF", "https://www.belfius.be",       2011, "NBB",  "Belfius Bank NV/SA"),
    _b("argenta",         "Argenta",             "BE", "BE_GDF", "https://www.argenta.be",       1956, "NBB",  "Argenta Spaarbank NV"),

    # ---------- Frankreich (FR) ---------------------------------------------
    _b("bnp-paribas",     "BNP Paribas",         "FR", "FR_FGDR","https://www.bnpparibas.com",   2000, "ACPR", "BNP Paribas S.A."),
    _b("credit-agricole", "Crédit Agricole",     "FR", "FR_FGDR","https://www.credit-agricole.fr", 1885, "ACPR", "Crédit Agricole S.A."),
    _b("societe-generale","Société Générale",    "FR", "FR_FGDR","https://www.societegenerale.com", 1864, "ACPR", "Société Générale S.A."),
    _b("lcl",             "LCL",                 "FR", "FR_FGDR","https://www.lcl.fr",           1863, "ACPR", "LCL (Le Crédit Lyonnais)"),
    _b("boursorama",      "Boursorama",          "FR", "FR_FGDR","https://www.boursorama-banque.com", 1995, "ACPR", "Boursorama S.A."),
    _b("hello-bank",      "Hello bank!",         "FR", "FR_FGDR","https://www.hellobank.fr",     2013, "ACPR", "Hello bank! (BNP Paribas)"),
    _b("fortuneo",        "Fortuneo",            "FR", "FR_FGDR","https://www.fortuneo.fr",      2000, "ACPR", "Fortuneo Banque (Crédit Mutuel Arkéa)"),
    _b("orange-bank",     "Orange Bank",         "FR", "FR_FGDR","https://www.orangebank.fr",    2017, "ACPR", "Orange Bank S.A."),
    _b("banque-postale",  "La Banque Postale",   "FR", "FR_FGDR","https://www.labanquepostale.fr", 2006, "ACPR", "La Banque Postale S.A."),
    _b("monabanq",        "Monabanq",            "FR", "FR_FGDR","https://www.monabanq.com",     2006, "ACPR", "Monabanq (Crédit Mutuel Alliance Fédérale)"),

    # ---------- Spanien (ES) ------------------------------------------------
    _b("santander",       "Banco Santander",     "ES", "ES_FGD", "https://www.santander.com",    1857, "Banco de España", "Banco Santander S.A."),
    _b("bbva",            "BBVA",                "ES", "ES_FGD", "https://www.bbva.com",         1857, "Banco de España", "Banco Bilbao Vizcaya Argentaria S.A."),
    _b("caixabank",       "CaixaBank",           "ES", "ES_FGD", "https://www.caixabank.es",     1904, "Banco de España", "CaixaBank S.A."),
    _b("sabadell",        "Banco Sabadell",      "ES", "ES_FGD", "https://www.bancsabadell.com", 1881, "Banco de España", "Banco de Sabadell S.A."),
    _b("bankinter",       "Bankinter",           "ES", "ES_FGD", "https://www.bankinter.com",    1965, "Banco de España", "Bankinter S.A."),
    _b("openbank",        "Openbank",            "ES", "ES_FGD", "https://www.openbank.es",      1995, "Banco de España", "Openbank S.A. (Santander)"),
    _b("ebn-banco",       "EBN Banco",           "ES", "ES_FGD", "https://www.ebnbanco.com",     1990, "Banco de España", "EBN Banco de Negocios S.A."),
    _b("wizink",          "WiZink",              "ES", "ES_FGD", "https://www.wizink.es",        2016, "Banco de España", "WiZink Bank S.A."),
    _b("renault-bank",    "Renault Bank",        "ES", "ES_FGD", "https://www.renaultbank.es",   1929, "Banco de España", "RCI Banque, Sucursal en España"),
    _b("younited",        "Younited",            "ES", "ES_FGD", "https://www.younited.es",      2009, "ACPR / Banco de España", "Younited S.A."),

    # ---------- Italien (IT) ------------------------------------------------
    _b("intesa-sanpaolo", "Intesa Sanpaolo",     "IT", "IT_FITD","https://www.intesasanpaolo.com", 2007, "Banca d'Italia", "Intesa Sanpaolo S.p.A."),
    _b("unicredit",       "UniCredit",           "IT", "IT_FITD","https://www.unicredit.it",     1998, "Banca d'Italia", "UniCredit S.p.A."),
    _b("ing-it",          "ING Italia",          "IT", "IT_FITD","https://www.ing.it",           2001, "Banca d'Italia", "ING Bank N.V. Milan Branch"),
    _b("illimity",        "illimity",            "IT", "IT_FITD","https://www.illimity.com",     2018, "Banca d'Italia", "illimity Bank S.p.A."),

    # ---------- Portugal (PT) -----------------------------------------------
    _b("bpi",             "Banco BPI",           "PT", "PT_FGD", "https://www.bancobpi.pt",      1985, "Banco de Portugal", "Banco BPI S.A."),
    _b("millennium-bcp",  "Millennium bcp",      "PT", "PT_FGD", "https://www.millenniumbcp.pt", 1985, "Banco de Portugal", "Banco Comercial Português S.A."),
    _b("caixa-geral",     "Caixa Geral de Depósitos","PT","PT_FGD","https://www.cgd.pt",         1876, "Banco de Portugal", "Caixa Geral de Depósitos S.A."),

    # ---------- Irland (IE) -------------------------------------------------
    _b("aib",             "AIB",                 "IE", "IE_DGS", "https://aib.ie",               1966, "Central Bank of Ireland", "Allied Irish Banks p.l.c."),
    _b("bank-of-ireland", "Bank of Ireland",     "IE", "IE_DGS", "https://www.bankofireland.com",1783, "Central Bank of Ireland", "The Governor and Company of the Bank of Ireland"),
    _b("ptsb",            "Permanent TSB",       "IE", "IE_DGS", "https://www.permanenttsb.ie",  1884, "Central Bank of Ireland", "Permanent TSB p.l.c."),

    # ---------- Luxemburg (LU) ----------------------------------------------
    _b("bgl-bnpp",        "BGL BNP Paribas",     "LU", "LU_FGDL","https://www.bgl.lu",           1919, "CSSF", "BGL BNP Paribas S.A."),
    _b("banque-lu",       "Banque de Luxembourg","LU", "LU_FGDL","https://www.banquedeluxembourg.com", 1920, "CSSF", "Banque de Luxembourg S.A."),

    # ---------- Estland (EE) ------------------------------------------------
    _b("lhv",             "LHV Pank",            "EE", "EE_TF",  "https://www.lhv.ee",           1999, "Finantsinspektsioon", "AS LHV Pank"),
    _b("coop-pank",       "Coop Pank",           "EE", "EE_TF",  "https://www.cooppank.ee",      1992, "Finantsinspektsioon", "Coop Pank AS"),

    # ---------- Lettland (LV) -----------------------------------------------
    _b("citadele",        "Citadele Banka",      "LV", "LV_NGF", "https://www.citadele.lv",      2010, "Latvijas Banka", "AS Citadele banka"),
    _b("seb-lv",          "SEB banka",           "LV", "LV_NGF", "https://www.seb.lv",           1993, "Latvijas Banka", "AS SEB banka"),

    # ---------- Litauen (LT) ------------------------------------------------
    _b("siauliu",         "Šiaulių bankas",      "LT", "LT_INDS","https://www.sb.lt",            1992, "Bank of Lithuania", "AB Šiaulių bankas"),
    _b("luminor",         "Luminor Bank",        "LT", "LT_INDS","https://www.luminor.lt",       2017, "Bank of Lithuania", "Luminor Bank AS"),

    # ---------- Finnland (FI) -----------------------------------------------
    _b("op-financial",    "OP Financial Group",  "FI", "FI_FSA", "https://www.op.fi",            1902, "FIN-FSA", "OP Osuuskunta"),
    _b("nordea-fi",       "Nordea Finland",      "FI", "FI_FSA", "https://www.nordea.fi",        1820, "FIN-FSA", "Nordea Bank Abp"),

    # ---------- Schweden (SE) -----------------------------------------------
    _b("seb",             "SEB",                 "SE", "SE_RGK", "https://sebgroup.com",         1856, "Finansinspektionen", "Skandinaviska Enskilda Banken AB"),
    _b("swedbank",        "Swedbank",            "SE", "SE_RGK", "https://www.swedbank.se",      1820, "Finansinspektionen", "Swedbank AB"),
    _b("ikano",           "Ikano Bank",          "SE", "SE_RGK", "https://www.ikanobank.se",     1995, "Finansinspektionen", "Ikano Bank AB"),

    # ---------- US-Retail-Angebote am DE-Markt (Grenzfälle) -----------------
    _b("chase",           "Chase",               "DE", "DE_EDB", "https://www.chase.de",         2024, "BaFin", "Chase / J.P. Morgan SE"),
]

"""Deposit Guarantee Schemes — Session 93.

Ein Eintrag pro Land, jeweils die staatliche Einlagensicherung nach EU-Richtlinie
2014/49/EU (DGSD, gesetzlicher Mindestbetrag 100.000 EUR pro Einleger und Institut).

Zusätzliche freiwillige Sicherungssysteme (z. B. Einlagensicherungsfonds des
Bundesverbands deutscher Banken) sind hier NICHT enthalten und werden pro Bank
optional erfasst.
"""
DEPOSIT_GUARANTEE_SCHEMES = [
    {"code": "DE_EDB", "country_code": "DE", "name": "Entschädigungseinrichtung deutscher Banken (EdB)", "coverage_limit_eur": 100000, "authority": "BaFin"},
    {"code": "AT_ESA", "country_code": "AT", "name": "Einlagensicherung AUSTRIA GesmbH",                   "coverage_limit_eur": 100000, "authority": "FMA"},
    {"code": "NL_DGS", "country_code": "NL", "name": "Depositogarantiestelsel",                              "coverage_limit_eur": 100000, "authority": "De Nederlandsche Bank (DNB)"},
    {"code": "BE_GDF", "country_code": "BE", "name": "Garantiefonds voor financiële diensten",               "coverage_limit_eur": 100000, "authority": "FSMA"},
    {"code": "FR_FGDR","country_code": "FR", "name": "Fonds de Garantie des Dépôts et de Résolution (FGDR)", "coverage_limit_eur": 100000, "authority": "ACPR"},
    {"code": "ES_FGD", "country_code": "ES", "name": "Fondo de Garantía de Depósitos (FGD)",                  "coverage_limit_eur": 100000, "authority": "Banco de España"},
    {"code": "IT_FITD","country_code": "IT", "name": "Fondo Interbancario di Tutela dei Depositi (FITD)",      "coverage_limit_eur": 100000, "authority": "Banca d'Italia"},
    {"code": "PT_FGD", "country_code": "PT", "name": "Fundo de Garantia de Depósitos",                         "coverage_limit_eur": 100000, "authority": "Banco de Portugal"},
    {"code": "IE_DGS", "country_code": "IE", "name": "Irish Deposit Guarantee Scheme",                         "coverage_limit_eur": 100000, "authority": "Central Bank of Ireland"},
    {"code": "LU_FGDL","country_code": "LU", "name": "Fonds de Garantie des Dépôts Luxembourg (FGDL)",         "coverage_limit_eur": 100000, "authority": "CSSF"},
    {"code": "EE_TF",  "country_code": "EE", "name": "Tagatisfond",                                            "coverage_limit_eur": 100000, "authority": "Eesti Pank"},
    {"code": "LV_NGF", "country_code": "LV", "name": "Noguldījumu garantiju fonds",                            "coverage_limit_eur": 100000, "authority": "Latvijas Banka"},
    {"code": "LT_INDS","country_code": "LT", "name": "Indėlių ir investicijų draudimas",                        "coverage_limit_eur": 100000, "authority": "Bank of Lithuania"},
    {"code": "FI_FSA", "country_code": "FI", "name": "Talletussuojarahasto",                                    "coverage_limit_eur": 100000, "authority": "Financial Stability Authority"},
    {"code": "SE_RGK", "country_code": "SE", "name": "Insättningsgaranti (Riksgälden)",                         "coverage_limit_eur": 100000, "authority": "Riksgälden"},
]

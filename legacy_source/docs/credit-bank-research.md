# Kapitalmitte Kredit Research (Initial Draft)

Last updated: 2026-04-27

This is a research-first draft for the current banks found in `public.banks`.
Sources are official bank domains (from the bank master data). Product-level loan pages still need final per-bank verification in admin before publishing.

## Notes

- Existing `banks` table currently returns 21 banks (not 26) in remote data.
- For each bank below:
  - `Source` is the official website URL.
  - `Produktinformationen` and `Annahmerichtlinien` are starter defaults for admin editing.
  - Use confidence `Low` until a specific credit product page is confirmed.

## Starter template values (for admin prefill)

### Produktinformationen (starter)

- Sicherheit
  - Kreditabsicherung optional
  - Gesetzliches Widerrufsrecht gemaess Vertragsbedingungen
- Flexibilitaet
  - Sondertilgungen gemaess Tarif moeglich
  - Vorzeitige Gesamttilgung gemaess Tarif moeglich
  - Ratenpause tarifabhaengig
- Kundenfreundlichkeit
  - Transparente Kostenaufstellung vor Vertragsabschluss

### Annahmerichtlinien (starter)

- Kreditnehmer ist volljaehrig
- Wohnsitz in Deutschland (oder laenderspezifisch gemaess Bank)
- Regelmaessiges Einkommen erforderlich
- Positive Bonitaetspruefung erforderlich
- Gueltige Bankverbindung erforderlich
- Weitere Unterlagen gemaess Bankrichtlinie

## Bank research list

| Bank | Country | Source | Confidence | Research status |
|---|---|---|---|---|
| ABN AMRO Bank | Netherlands | https://www.abnamro.nl | Low | Pending product-page verification |
| Banca Mediolanum | Italy | https://www.bancamediolanum.it | Low | Pending product-page verification |
| Banco Sabadell | Spain | https://www.grupbancsabadell.com | Low | Pending product-page verification |
| BBVA Bank Deutschland | Germany | https://www.bbva.de | Medium | Existing relationship in project; still verify loan tariff page |
| BNP Paribas | France | https://www.bnpparibas.com | Low | Pending product-page verification |
| Bunq Bank | Netherlands | https://www.bunq.com | Low | Pending product-page verification |
| CaixaBank | Spain | https://www.caixabank.es | Low | Pending product-page verification |
| Comdirect Bank | Germany | https://www.comdirect.de | Low | Pending product-page verification |
| Crédit Agricole | France | https://www.credit-agricole.fr | Low | Pending product-page verification |
| Deutsche Kreditbank (DKB) | Germany | https://www.dkb.de | Medium | Verify consumer credit conditions page |
| Erste Bank | Austria | https://www.erstebank.at | Low | Pending product-page verification |
| ING Belgium | Belgium | https://www.ing.be | Low | Pending product-page verification |
| ING-DiBa | Germany | https://www.ing.de | Medium | Verify Ratenkredit conditions page |
| KBC Bank | Belgium | https://www.kbc.be | Low | Pending product-page verification |
| Millennium BCP | Portugal | https://www.millenniumbcp.pt | Low | Pending product-page verification |
| N26 Bank | Germany | https://www.n26.com | Low | Check if classic installment loan offer is active |
| OP Financial Group | Finland | https://www.op.fi | Low | Pending product-page verification |
| Raiffeisen Bank International | Austria | https://www.rbinternational.com | Low | Pending product-page verification |
| Raisin Bank | Germany | https://www.raisin.de | Low | Check product scope for lending |
| Spuerkeess | Luxembourg | https://www.spuerkeess.lu | Low | Pending product-page verification |
| UniCredit | Italy | https://www.unicredit.it | Low | Pending product-page verification |

## Recommended next content step

1. In admin, prefill each active credit offer with the starter template.
2. For each bank that will be publicly listed, replace starter lines with verified product-page wording.
3. Store source URL and last-checked date per offer in admin notes for auditability.

## Applied one-time verified updates (2026-04-27)

The following offers were updated with verified content from official sources:

1. DKB
   - Source: https://www.dkb.de/privatkunden/kredite/privatkredit
   - Applied:
     - offer range/term updates (up to 100.000 EUR, up to 120 months)
     - refreshed features
     - bank-specific Produktinformationen
     - bank-specific Annahmerichtlinien
2. ING-DiBa
   - Source: https://www.ing.de/kredit/
   - Applied:
     - term/amount alignment where explicitly available
     - refreshed features
     - bank-specific Produktinformationen
     - bank-specific Annahmerichtlinien
3. Comdirect (via Commerzbank Ratenkredit path)
   - Sources:
     - https://www.comdirect.de/kredit/kredit.html
     - https://www.commerzbank.de/privatkunden/kredite/ratenkredit/
   - Applied:
     - offer range/term updates (1.500 - 100.000 EUR, 6 - 119 months)
     - product and acceptance content aligned to published conditions

All other banks remain on editable starter defaults and require manual bank-page verification.

## Applied one-time verified updates (2026-04-27, batch 2)

The following offers were additionally updated with verified content from official sources:

4. ABN AMRO Bank
   - Source: https://www.abnamro.nl/en/personal/loans/index.html
   - Applied:
     - amount/term alignment (5.000 - 75.000 EUR, 12 - 144 months)
     - representative base rate alignment from published "from 7.5%"
     - refreshed Produktinformationen and Annahmerichtlinien
5. Banco Sabadell
   - Source: https://www.bancsabadell.com/bsnacional/en/personal/loans-and-credits/
   - Applied:
     - amount/term alignment (3.000 - 60.000 EUR, 12 - 96 months)
     - prepayment fee details and customer eligibility requirements
     - refreshed Produktinformationen and Annahmerichtlinien
6. CaixaBank
   - Source: https://www.caixabank.es/particular/prestamos-personales/prestamo-personal.html
   - Applied:
     - amount/term alignment (3.000 - 30.000 EUR, 1 - 72 months)
     - representative APR/TIN alignment (12,57% / 11,90%)
     - refreshed Produktinformationen and Annahmerichtlinien
7. Crédit Agricole
   - Source: https://www.credit-agricole.fr/particulier/credit/consommation/pret-a-consommer-perso.html
   - Applied:
     - product flexibility options (modulation, payment pause, early repayment)
     - max amount alignment where explicitly stated in product copy (up to 75.000 EUR online path)
     - refreshed Produktinformationen and Annahmerichtlinien
8. ING Belgium
   - Source: https://www.ing.be/en/individuals/borrowing/personal-loan
   - Applied:
     - max amount alignment (up to 50.000 EUR)
     - representative APR alignment (7,74%)
     - payout timing and digital process details
     - refreshed Produktinformationen and Annahmerichtlinien
9. KBC Bank
   - Source: https://www.kbc.be/particulieren/nl/lenen/faq-lening-op-afbetaling.html
   - Applied:
     - amount/term alignment (500 - 50.000 EUR, up to 120 months by repayment plan)
     - no dossier/admin fee detail and early repayment conditions
     - refreshed Produktinformationen and Annahmerichtlinien
10. Spuerkeess
   - Source: https://www.spuerkeess.lu/en/private-customers/loans/personal-loan/
   - Applied:
     - amount/term alignment (5.000 - 100.000 EUR, 12 - 60 months)
     - representative APR alignment (6,0698%)
     - early repayment fee condition and optional insurance details
     - refreshed Produktinformationen and Annahmerichtlinien

## Applied one-time verified updates (2026-04-27, batch 3)

The following offers were additionally updated with verified content from official sources:

11. UniCredit
   - Source: https://www.unicredit.it/it/privati/prestiti/tutti-i-prestiti/per-le-esigenze-di-tutti-i-giorni/prestito-unicredit.html
   - Applied:
     - amount/term alignment for main personal-loan range (3.001 - 75.000 EUR, 36 - 120 months depending on purpose)
     - flexibility options (Salto Rata, Cambio Rata, Ricarica Prestito)
     - refreshed Produktinformationen and Annahmerichtlinien
12. OP Financial Group
   - Source: https://www.op.fi/en/private-customers/loans-and-homes/consumer-credit
   - Applied:
     - unsecured consumer credit range alignment (2.000 - 30.000 EUR)
     - margin+Euribor pricing logic in notes/details
     - refreshed Produktinformationen and Annahmerichtlinien
13. Millennium BCP
   - Source: https://www.millenniumbcp.pt/en/loans/personal-loan/online
   - Applied:
     - online personal-loan range alignment (1.000 - 25.000 EUR, 18 - 84 months)
     - representative TAEG/TAN alignment (10,1% / 8,7%)
     - refreshed Produktinformationen and Annahmerichtlinien
14. N26 Bank
   - Source: https://n26.com/en-de/credit
   - Applied:
     - amount/term alignment (1.000 - 25.000 EUR, 12 - 60 months)
     - minimum representative effective/nominal rate alignment (4,06% / 3,99%)
     - eligibility notes (90-day account age, SCHUFA check)
     - refreshed Produktinformationen and Annahmerichtlinien
15. BNP Paribas (Germany via Consors Finanz channel)
   - Source: https://www.consorsfinanz.de/karte-kredite/online-kredit
   - Applied:
     - amount/term alignment (1.500 - 80.000 EUR, up to 120 months)
     - published entry-rate note ("ab 3,49% p.a.")
     - refreshed Produktinformationen and Annahmerichtlinien

## Applied one-time verified updates (2026-04-27, batch 4)

The following offers were additionally updated with verified content from official sources:

16. Erste Bank
   - Source: https://www.sparkasse.at/sgruppe/privatkunden/wohnen-finanzieren/konsumfinanzierung/konsumkredit
   - Applied:
     - amount/term alignment (3.000 - 50.000 EUR, 12 - 120 months)
     - payout-speed and eligibility details (24h payout after positive check)
     - refreshed Produktinformationen and Annahmerichtlinien
17. Raiffeisen Bank International (AT consumer channel)
   - Source: https://www.raiffeisen.at/de/privatkunden/kredit-leasing/konsumkredit.html
   - Applied:
     - product and process details for Konsumkredit (regional and profile-dependent pricing)
     - refreshed Produktinformationen and Annahmerichtlinien
18. Banca Mediolanum
   - Source: https://www.bancamediolanum.it/mutui-prestiti-online/prestito-mediolanum
   - Applied:
     - amount/term alignment (2.000 - 250.000 EUR, 12 - 120 months)
     - variable-rate structure and representative TAN/TAEG example alignment
     - refreshed Produktinformationen and Annahmerichtlinien
19. Bunq Bank
   - Source: https://help.bunq.com/articles/can-i-get-a-loan-with-my-bunq-account
   - Applied:
     - marked offer inactive (`is_active=false`) due to no consumer loan / overdraft offer
     - note and feature set updated to reflect official product scope
20. Raisin Bank
   - Source: https://www.raisin.bank/
   - Applied:
     - marked offer inactive (`is_active=false`) due to BaaS/infrastructure positioning and no direct consumer installment loan page
     - note and feature set updated to reflect official product scope

## Applied one-time verified updates (2026-04-27, batch 5)

The following offer was additionally updated with verified content from official sources:

21. BBVA Bank Deutschland
   - Source: https://www.bbva.de/privat/produkte/kredite/sofortkredit.html
   - Applied:
     - amount/term alignment (3.000 - 10.000 EUR, 12 - 96 months)
     - representative APR/nominal alignment (5,11% / 4,99%) and bonitatsabhaengiger Sollzinskorridor
     - 1%-Punkt Zinsvorteil-Logik bei Gehaltseingang und Lastschrifteinzug dokumentiert
     - refreshed Produktinformationen and Annahmerichtlinien

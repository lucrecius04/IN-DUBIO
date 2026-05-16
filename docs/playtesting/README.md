# Playtesting a balanc (AI běhy)

Dokumentace pro **simulované / automatizované průchody** hrou (persony, reporty, metriky). Slouží k ladění ekonomiky, rysů, frakcí a obtížnosti — až bude hra **hratelná přes UI** (viz [`../UI/README.md`](../UI/README.md)).

| Dokument | Obsah |
|----------|--------|
| [`AI-persony-a-reporty.md`](./AI-persony-a-reporty.md) | 12 person, chovací pravidla, formát reportu (JSON), odvozené metriky, výchozí čísla z kódu, fáze práce |
| [`Analyza-os-hrani.md`](./Analyza-os-hrani.md) | Reálná data z poolu: průměrné efekty verdiktů, 3 archetypy (tvrdý/empatický/alibista), finanční a rysové trajektorie, identifikované slabiny |
| [`Jizdni-rad-balancingu.md`](./Jizdni-rad-balancingu.md) | Mapa konstant (kde v kódu leží každé číslo), pořadí balancovacích kroků, exploity k ověření, doporučení pro sjednocení inkoustu |

**Zdroj pravdy pro stav hry:** `js/state.js` (`VYCHOZI_STAV`, `archive`, `tydenni_statistiky`, `revealedInfo`, …).

**Poznámka k pořadí vývoje:** grafika → hratelnost → AI běhy a balanc → encyklopedie (až je obsah stabilní).

# Playtesting a balanc (AI běhy)

Dokumentace pro **simulované / automatizované průchody** hrou (persony, reporty, metriky). Slouží k ladění ekonomiky, rysů, frakcí a obtížnosti — až bude hra **hratelná přes UI** (viz [`../UI/README.md`](../UI/README.md)).

| Dokument | Obsah |
|----------|--------|
| [`AI-persony-a-reporty.md`](./AI-persony-a-reporty.md) | 12 person, chovací pravidla, formát reportu (JSON), odvozené metriky, výchozí čísla z kódu, fáze práce |
| [`Analyza-os-hrani.md`](./Analyza-os-hrani.md) | Reálná data z poolu: průměrné efekty verdiktů, 3 archetypy (tvrdý/empatický/alibista), finanční a rysové trajektorie, identifikované slabiny |
| [`Jizdni-rad-balancingu.md`](./Jizdni-rad-balancingu.md) | Mapa konstant (kde v kódu leží každé číslo), pořadí balancovacích kroků, exploity k ověření, doporučení pro sjednocení inkoustu |
| [`Plan-balancing-F-hratelnost.md`](./Plan-balancing-F-hratelnost.md) | Plán kalendáře konců, přežití vs. hrdina, ruční hratelnost |
| [`Balanc-G-navrh-velicin.md`](./Balanc-G-navrh-velicin.md) | **Vlna G** — pestřejší rysy (škálování verdiktů, diminishing returns) |
| [`Balanc-I-implementace.md`](./Balanc-I-implementace.md) | **Vlna I** — Naděje/Moudrost, úplatek v čase, kampan statistiky, epilog |
| [`Analyza-matice-konce-2026-05-19-run4.md`](./Analyza-matice-konce-2026-05-19-run4.md) | Matice 8 konců — běh 4 (7/8 zásah) |
| [`Analyza-matice-konce-2026-05-20.md`](./Analyza-matice-konce-2026-05-20.md) | **Finální matice 8/8** + Integrita/Naděje + návrhy vlny I+ |

**Zdroj pravdy pro stav hry:** `js/state.js` (`VYCHOZI_STAV`, `archive`, `tydenni_statistiky`, `revealedInfo`, …).

**Poznámka k pořadí vývoje:** grafika → hratelnost → AI běhy a balanc → encyklopedie (až je obsah stabilní).

**Čtyři referenční běhy (balanc):** `rychlosoudce`, `archivar`, `milosrny`, `prisny_statnik` — viz [`Balancing-backlog-tri-runy.md`](./Balancing-backlog-tri-runy.md).

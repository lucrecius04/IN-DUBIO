# Analýza matice konců — 4. běh (po vlně E)

**Datum:** 2026-05-19  
**Stav:** 8/8 běhů dokončeno (`aborted: false`)  
**Zásah cíle:** **7/8** (nově i hrdina + atentát)

---

## Souhrnná tabulka

| Persona | Cíl | Výsledek | Den | Finance | Úplatek | Operace | Zásah |
|---------|-----|----------|-----|---------|---------|---------|-------|
| `korupcni` | korupce | **korupce** | 15 | 694 | ano | ne | ✓ |
| `hrdina_cisty` | hrdina | **hrdina** | 15 | 143 | ne | ne | ✓ |
| `zbohaceny_utek` | útěk | **utek** | 15 | 509 | ne | zaplacena | ✓ |
| `smireni_mekky` | smíření | **smireni** | 15 | 305 | ne | ne | ✓ |
| `atentat_moc` | atentát | **atentát** | 15 | 454 | ne | odložena | ✓ |
| `kruh_temny` | kruh | **rad** | 16 | 735 | ano | zaplacena | ✓ |
| `anna_pravda` | anna | **anna** | 15 | 70 | ne | ne | ✓ |
| `stredni_cesta` | přežití | **hrdina** | 15 | 165 | ne | ne | ✗ |

**Unikátní konce v sadě:** 7 typů (`korupce`, `hrdina`×2, `utek`, `smireni`, `atentát`, `rad`, `anna`) — **`preziti` se v této matici neobjevilo**.

### Reporty (nejnovější běh)

| Persona | Soubor |
|---------|--------|
| stredni_cesta | `5e9aae81-eb30-4f0f-871f-6b425b456952.json` |
| korupcni | `3e261d59-a752-46cb-9240-347a1540b16d.json` |
| hrdina_cisty | `c6b9950f-1e4b-4f30-8575-148e2f40e760.json` |
| zbohaceny_utek | `e91e2f3e-1576-4ad3-91e9-6a6b468735d9.json` |
| smireni_mekky | `36ced3bb-70cc-4e2a-8017-bae7d9ac28b1.json` |
| atentat_moc | `c078670e-52ad-48af-8ae0-5204991f594d.json` |
| kruh_temny | `736c4b29-d8c4-43a4-a285-c482b8c60340.json` |
| anna_pravda | `bfd9f7c2-8f4f-4de4-a43c-9305bd7bd618.json` |

---

## Co se naučili (design)

### 1. Balancing vlně E funguje

Oproti běhu 3 (5/8) je matice **téměř kompletní**:

- **Atentát před útěkem** + `odlozit_vcas` → atentát na D15 (operace odložena, `osobni_cena: odmitl`).
- **Útěk** → zaplacená operace (`zaplatit_vcas`), balance 509, D15.
- **Smíření** po Anně, Beneš přijal, Vina 4, balance 305, D15.
- **Anna** — chudoba (70 Kčs), Beneš přijal, Vina 7, D15.
- **Hrdina** — vzdor, Beneš odmitl, INT/ODV vysoké, Vina 68, D15.
- **Korupce** — úplatek, D15 po Haasovi.
- **Kruh** — úplatek + Zavadová D16.

Hráčský signál u sedmi person odpovídá větvi (pravda / úplatek / peníze / vzdor).

### 2. Jediný problém: konvergence hrdina ↔ střední cesta

`stredni_cesta` skončila jako **`hrdina` na D15**, ne `preziti` (D15–19).

**Uzlové stavy na konci (oba profily skoro stejné):**

| | stredni_cesta | hrdina_cisty |
|--|---------------|--------------|
| vlcek_vztah | vzdor | vzdor |
| haas_kontakt | odmitnut | odmitnut |
| benes_pravda | odmitl | odmitl |
| Integrita | 100 | 100 |
| Odvaha | 88 | 100 |
| Vina | 65 | 68 |

**Přežití** vyžaduje **4/5 rysů 30–70** a **ne vzdor**. Persona `stredni` ale driftovala k extrému (Lid 100, INT 100) — splnila podmínky **hrdiny** dřív, než mohla doběhnout ke střednímu pásmu nebo D19 fallbacku.

**Závěr:** runner „střední“ verdikty nestačí — rysy z volby a případů tlačí hru do hrdinského profilu. Potřeba buď:

- silnější strop růstu INT/ODV u `stredni` persony (méně frakčních bonusů, více NG),
- nebo engine: hrdina jen pokud `benes_pravda === 'odmitl'` **a** záměrně vysoká odvaha (např. ODV ≥ 90), zatímco střední má ODV 30–70,
- nebo `stredni_cesta`: `trust.vlcek: 2`, `vecerniVolba` bez Lid extrému.

### 3. Ekonomika operace (D16 auto-platba)

- **Zbohacený:** `operace_zaplacena`, `osobni_cena: zaplatil` → **útěk** (správně).
- **Atentát:** `operace_odlozena`, `osobni_cena: odmitl`, balance 454 → **ne útěk**, **atentát** (správně).
- **Anna / smíření:** operace nezaplacena, smíření přes Beneše + balance cestu (305 u smíření).

Oddělení větví přes „zaplatil matce“ vs. „odložil kvůli politice“ **drží**.

### 4. Pořadí a den konce

| Konec | Typický den |
|-------|-------------|
| korupce, hrdina, utek, smireni, anna, atentát | **D15** (po Haasovi / pásmu D15+) |
| rad (kruh) | **D16** (Zavadová) |
| preziti | v této matici **chybí** (střední → hrdina) |

Variabilní konce **nekonvergují na D19 přežití**, pokud profil sedí dřív — to je žádoucí.

### 5. Drobné poznámky k datům

- **`uzlove_subset` v reportu** může u korupce ukazovat `haas_kontakt: odmitnut` v den snapshotu, zatímco `uplatek_prijat: true` v `flags` — pro vyhodnocení platí stav **po** `vypoctiUzloveFlagy()` po rozsudku; konec `korupce` je konzistentní s úplatkem.
- **`kampan_statistiky`** v JSON často chybí na top levelu; průzkum Anny je potřeba číst z `tydenni_statistiky` / běhu — anna skončila správně i při nižším počtu spisů v posledním týdnu.

---

## Srovnání běhů

| Běh | Dokončeno | Zásah cíle | Poznámka |
|-----|-----------|------------|----------|
| 1–2 | ABORT | 0–3/8 | Runner / server |
| 3 | 8/8 | 5/8 | smireni, hrdina, atentát chyběly |
| **4** | **8/8** | **7/8** | všechny cílové větve kromě střední→hrdina |

---

## Doporučené další kroky

Podrobný plán (F1–F6, tabulka dnů, checklist): **[`Plan-balancing-F-hratelnost.md`](Plan-balancing-F-hratelnost.md)**.

Shrnutí priorit:
1. **F1** — sladit `minDay` konců s `currentDay` / mapou (konec u Markové / Velezrady, ne u Haase).
2. **F2** — oddělit `preziti` vs. `hrdina` (engine + persona `stredni_cesta`).
3. Matice **běh 5** → cíl **8/8** + správné dny.
4. **F6** — ruční hraní (přežití + Anna min.).

# Analýza matice konců — 2. běh (po opravách P0/P1)

**Datum:** 2026-05-19  
**Příkaz:** `npm run playtest:konce` (8×19 dní)

---

## Souhrn

| Persona | Cíl | Výsledek | Stav běhu |
|---------|-----|----------|-----------|
| `stredni_cesta` | přežití | — | **ABORT** (timeout přechod dne) |
| `korupcni` | korupce | **korupce** ✓ | OK — D15 po `guilty_vzit_obalku` |
| `hrdina_cisty` | hrdina | — | **ABORT** (timeout) |
| `zbohaceny_utek` | útěk | — | **ABORT** (timeout) |
| `smireni_mekky` | smíření | **smireni** ✓ | OK — D12 |
| `atentat_moc` | atentát | **smireni** ✗ | OK — D12 (konvergence se smířením) |
| `kruh_temny` | kruh | **rad** ✓ | OK — D16 |
| `anna_pravda` | anna | — | **ABORT** — D15 Haas bez kroku 2 |

**Dokončeno:** 4/8 · **Zásah cíle:** 3/8 · **Unikátní konce:** 4 (`korupce`, `smireni`, `rad`, + duplicity)

**Oproti 1. běhu (před opravami):** poprvé **korupce**; stále dominuje **rad** u přerušených „čistých“ person; **anna** stále ne.

---

## Co se zlepšilo (ověřené opravy)

### Korupce funguje
- `korupcni` → **korupce na D15** po spisu Haas (`guilty_vzit_obalku`), INT 42, úplatek ano.
- Report: `a9180585-d97d-4996-a3a7-625a1ea12adf.json`
- Práh INT ≤45 + start INT 22 + úplatek na Haasovi = cílová větev dosažitelná.

### Smíření stabilní
- `smireni_mekky` → smireni D12, Vina 10, bez úplatku (stejně jako dříve).

### Kruh stabilní
- `kruh_temny` → rad D16, úplatek + operace (záměr splněn).

---

## Co stále nefunguje

### 1. Tři běhy spadly na timeoutu runneru
`stredni_cesta`, `hrdina_cisty`, `zbohaceny_utek` — `page.waitForFunction: Timeout 20000ms exceeded` při čekání na další den (prázdný `daily_snapshots` v ABORTED JSON).

→ **Není důkaz**, že hra nedovede k hrdině/útěku/přežití; je to **selhání automatizace**. Zvýšit timeout nebo robustnější čekání na `currentDay`.

### 2. Anna — abort na Haasovi D15
Z logu: po 2 spisech D15 zůstal **Haas (`tyc_haas_d11`) bez dostupného kroku 2** („žádná skupina verdiktu nemá dostupný krok 2“). Hra neposunula den → timeout.

Profil před pádem byl správný (D14: balance 15, Vina 8, max průzkum) — **anna by pravděpodobně padla na D14**, ale běh pokračoval do D15 kvůli neuzavřenému slotu.

### 3. Atentát → smíření
`atentat_moc` skončila jako `smireni_mekky` (D12, balance **159**, Vina 11, Beneš přijal).

- **Smíření:** splněno (Beneš, nízká Vina, INT 100).
- **Atentát:** ne — potřeba Vina >20 (OK), Moc ≤25 (Moc **0** OK), vzdor, **bez úplatku** OK, ale smíření vyhodnotí dřív (D12).
- **Anna-kandidát:** ne — balance **159** ≥ 120, takže `annaKandidat` false; smíření legální.

→ Atentát a smíření sdílejí „čistou“ větev; rozlišit: např. smíření vyžaduje `operace_zaplacena` nebo atentát vyžaduje `vina > 25` a `moc <= 25` bez Beneš smíření větev.

### 4. Hrdina / útěk — neověřeno (abort)
Předchozí běh: obálka → rad. Po opravě obálky u `prijmoutUplatek: false` by měly projít, ale běh nedošel do D15+.

### 5. Přežití — neověřeno (abort)
`stredni_cesta` nedoběhla.

---

## Srovnání 1. vs 2. běh

| Konec | Běh 1 | Běh 2 |
|-------|-------|-------|
| korupce | 0× | **1×** (`korupcni`) |
| smireni | 2× | 2× (+ atentat místo cíle) |
| rad | 4× | 1× (jen kruh dokončen) |
| preziti | 2× | 0× (abort) |
| hrdina, utek, anna | 0× | 0× |

---

## Reporty (2. běh)

| Persona | Soubor |
|---------|--------|
| korupcni | `a9180585-d97d-4996-a3a7-625a1ea12adf.json` |
| smireni_mekky | `3c2c8391-6587-4e90-bec3-dad0bc8cf001.json` |
| atentat_moc | `86fb8c06-619b-48e2-a7d8-b805df736739.json` |
| kruh_temny | `f7d71ca2-04fe-4a79-ada2-0a11bc4f9d67.json` |
| stredni_cesta | `64f00b90-…_ABORTED.json` |
| hrdina_cisty | `40a8ea0f-…_ABORTED.json` |
| zbohaceny_utek | `eedefb11-…_ABORTED.json` |
| anna_pravda | `90569673-…_ABORTED.json` |

---

## Doporučené další kroky

| P | Akce |
|---|------|
| **P0** | Runner: timeout 20s → 45–60s; po nevyřešeném spisu logovat a skip/force close |
| **P0** | Haas D15: fallback verdikt když krok 2 chybí (nebo runner vybere dostupnou skupinu) |
| **P1** | Rozdělit **atentát** vs **smíření**: např. smíření jen s `operace_zaplacena`; atentát `vina >= 30` |
| **P1** | Anna: ověřit vyhodnocení **D14** (balance <120) — možná ukončit den po posledním uzavřeném spisu |
| **P2** | Znovu spustit jen 4 přerušené persony po opravě runneru |

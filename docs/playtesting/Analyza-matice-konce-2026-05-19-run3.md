# Analýza matice konců — 3. běh (po opravách runneru)

**Datum:** 2026-05-19  
**Stav:** 8/8 běhů **dokončeno** (`aborted: false`)  
**Reporty:** nejnovější JSON v `artifacts/playtest/` (cca 14:47–15:13)

---

## Souhrnná tabulka

| Persona | Cíl | Výsledek | Den konce | Finance | Úplatek | Operace zaplacena | Zásah cíle |
|---------|-----|----------|-----------|---------|---------|-------------------|------------|
| `stredni_cesta` | přežití | **preziti** | D19 | 180 | ne | ne | ✓ |
| `korupcni` | korupce | **korupce** | D15 | 653 | ano | ano | ✓ |
| `hrdina_cisty` | hrdina | **preziti** | D19 | 632 | ne | ne | ✗ |
| `zbohaceny_utek` | útěk | **utek** | D15 | 526 | ne | ano | ✓ |
| `smireni_mekky` | smíření | **preziti** | D19 | 212 | ne | ne | ✗ |
| `atentat_moc` | atentát | **utek** | D15 | 398 | ne | ano | ✗ |
| `kruh_temny` | kruh (`rad`) | **rad** | D16 | 691 | ano | ano | ✓ |
| `anna_pravda` | anna | **anna** | D15 | 51 | ne | ne | ✓ |

**Dokončeno:** 8/8 · **Zásah cíle:** 5/8 · **Unikátní konce:** 5 (`korupce`, `utek`, `anna`, `rad`, `preziti`)

---

## Oproti běhům 1–2 (před opravami)

| Metrika | Běh 1–2 | Běh 3 |
|---------|---------|-------|
| ABORT | 7–8/8 | **0/8** |
| Haas D15 uzavřen | často ne | **ano** (log: `guilty_vzit_obalku` / `odmitnut_slusne`) |
| Potvrzené cílové konce | 3 | **5** |
| `anna` | ne | **ano (D15)** |
| `korupce` | ano | **ano (D15)** |

Opravy runneru (obálka vs. odmítnutí, milníkové verdikty, sdílený server) **fungují**.

---

## Co funguje dobře

### Korupce (`korupcni`)
- D15 po `guilty_vzit_obalku` na Haasovi → `endingType=korupce`.
- Report: `78ddd042-1314-440f-98cf-cdb5b42b20d2.json`

### Kruh (`kruh_temny`)
- D16, úplatek + `guilty_podepsat` u Závadové (log terminálu).
- Report: `7c8350f8-7150-4a3d-86a5-1ff5b4af1c32.json`

### Anna (`anna_pravda`)
- D15, balance **51**, Vina **7**, bez úplatku, operace nezaplacena — profil sedí.
- Haas: `not_guilty_odmitnut_slusne`.
- Report: `0afb6b66-75e3-4118-9a7f-03054cc5b67f.json`

### Útěk (`zbohaceny_utek`)
- D15, balance **526**, operace zaplacena — cíl splněn.
- Report: `b32c185a-56b2-44fd-a7fd-64a531302f0e.json`

### Přežití (`stredni_cesta`)
- D19 fallback — pro personu bez extrémní větve očekávané.
- Report: `e5acd08f-8050-46c2-8628-fae627e5da3d.json`

---

## Co nesedí (3 persony)

### 1. Smíření → přežití (`smireni_mekky`)
- Kampaň doběhla až na **D19**, konec **`preziti`**.
- Po celou hru **`operace_zaplacena: false`** (balance max ~153 Kčs na D14 — nikdy 400).
- Po úpravě engine smíření **vyžaduje zaplacenou operaci** → podmínka nikdy nesplněna.
- Persona hraje mírně (`milosrny`), málo příjmů → ekonomicky nedosáhne na operaci.

**Doporučení:** u `smireni_mekky` vyšší start balance / více `guilty` verdiktů v runneru, nebo testovací připsání 400 Kčs před D12; případně mírnější prah „smíření bez operace“ v designu.

### 2. Atentát → útěk (`atentat_moc`)
- Konec **`utek` na D15** (balance 398, **operace zaplacena**).
- Persona má `operaceVolba: 'odlozit'`, ale hra/runner při dosažení ~400 Kčs operaci **zaplatil** → splněna větev **útěk** (pořadí v engine: útěk před atentátem).
- Profil: Vina 94, INT 100 — spíš „extrém“, ne čistý atentát (vzdor + Moc).

**Doporučení:** u atentát persony vynutit `operace_odlozena` na D16 v runneru dřív, než balance překročí 400; nebo snížit příjmy; v engine zvážit útěk jen při `osobni_cena === 'zaplatil'` bez konfliktu s atentátem.

### 3. Hrdina → přežití (`hrdina_cisty`)
- Konec až **D19** `preziti` — žádný variabilní konec mezi D15–18 neskočil.
- `trust.vlcek` zůstal **0** (vzdor OK), ale **Vina 97–100** (příliš mnoho tvrdých rozsudků v runneru).
- D16 podepsání u Závadové (`guilty_podepsat`) — větev kruhu, ne hrdiny.

**Doporučení:** persona `cisty` / méně `guilty_maximum`; ověřit `benes_pravda` a `vlcek_vztah` v uzlových stavech v den D15.

---

## Konvergence konců

| Konec | Persony | Poznámka |
|-------|---------|----------|
| `preziti` | střední, smíření, hrdina | 3× — fallback D19; u smíření/hrdiny chyběla dřívější větev |
| `utek` | zbohaceny, atentát | 2× — u atentátu nechtěně (operace + balance) |
| `korupce` | korupcni | 1× |
| `rad` | kruh | 1× |
| `anna` | anna | 1× |

**Chybí v této matici:** `smireni`, `hrdina`, `atentát` jako `endingType`.

---

## Reporty (běh 3)

| Persona | Soubor |
|---------|--------|
| kruh_temny | `7c8350f8-7150-4a3d-86a5-1ff5b4af1c32.json` |
| atentat_moc | `ec558f2e-b119-4607-92da-791e01e5fd61.json` |
| anna_pravda | `0afb6b66-75e3-4118-9a7f-03054cc5b67f.json` |
| smireni_mekky | `2111e24e-4470-4e3f-97ae-aea01b7d98af.json` |
| korupcni | `78ddd042-1314-440f-98cf-cdb5b42b20d2.json` |
| zbohaceny_utek | `b32c185a-56b2-44fd-a7fd-64a531302f0e.json` |
| stredni_cesta | `e5acd08f-8050-46c2-8628-fae627e5da3d.json` |
| hrdina_cisty | `edfca0d7-a6f0-40be-873e-48a684e29f4e.json` |

---

## Závěr

**Technicky:** matice je poprvé **kompletní** — runner i milníky (Haas, Zavadová) projdou.

**Design/balancing:** **5 z 8** cílových větví dosažitelných při současných personách. Tři zbývající selhání jsou spíš **konvergence pravidel a ekonomiky** než pád runneru:

1. **Smíření** — operace nikdy zaplacena.  
2. **Atentát** — předběhl útěk (zaplacená operace + vysoký zůstatek).  
3. **Hrdina** — profil driftuje k Vina 100, hra dojede až k D19 přežití.

**Další krok (doporučený pořadí):** doladit persony/runner pro `smireni_mekky`, `atentat_moc`, `hrdina_cisty` → jeden ověřovací běh každé → případně jemná úprava prahů v `engine.js` podle `Konce_15dni.csv`.

---

## Aktualizace 2026-05-19 (vlna balancingu E)

Implementováno v kódu — **ověřit celou matici** (`npm run playtest:konce`):

| Oblast | Změna |
|--------|--------|
| `engine.js` | Pořadí: atentát před útěkem; smíření D14+ po Anně; rozlišení profilů; Haas „otevřený“ neblokuje čisté větve |
| `finance.js` | Auto-zaplacení operace až od D16 (dříve šlo omylem spustit útěk) |
| `cases.js` | Větší rozptyl odměn guilty vs. NG |
| `state.js` | Vzdor i při `trust.vlcek === 1` |
| `playtest-run.js` | Persony + `zaplatit_vcas` / `odlozit_vcas`; politiky `hrdina`, `zbohaceny` |

**Ověřeno:** `smireni_mekky` → `smireni` D15 (run `d9bbaa91…`).

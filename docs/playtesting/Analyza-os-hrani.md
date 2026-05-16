# Analýza os hraní a herních strategií

Tento dokument zachycuje **reálná data z `data/pool_cases_akt1.json`** a odvozené strategie, od kterých se odpichuje balancing.  
Čísla jsou průměry přes celý pool (39 případů, 128+ variant rozsudků) — nikoliv cíle, ale výchozí stav.

Poslední měření: **květen 2026**, verze poolu s 39 případy.

---

## 1. OSA VERDIKTŮ: Tvrdý soudce ↔ Empatický ↔ Alibista

Toto jsou **průměrné přímé efekty** jednoho rozsudku na každý typ verdiktu.  
Nezahrnuje meta-vrstvu z `cases.js` (procesní kvalita, normativní směr) ani typové příplatky.

| Verdikt | Finance | Moc | Lid | Integrita | Vina | Naděje | Moudrost | Odvaha |
|---------|--------:|----:|----:|----------:|-----:|-------:|---------:|-------:|
| `guilty_maximum` (n=31) | +15,8 | +4,5 | −6,5 | +0,9 | **+5,6** | −3,7 | 0,1 | 0,2 |
| `guilty_standard` (n=32) | +12,9 | +2,3 | −3,3 | +1,2 | +3,3 | −1,7 | 0,1 | 0,1 |
| `guilty_lenient` (n=30) | +10,1 | −0,8 | +1,9 | +0,6 | +1,4 | +1,0 | 0,6 | 0,5 |
| `alternative` (n=29) | +10,0 | −3,2 | **+5,3** | **+4,4** | +0,2 | **+2,9** | **2,8** | **2,5** |
| `not_guilty_formal` (n=30) | +8,3 | −3,3 | +4,1 | +1,5 | **−1,5** | +1,2 | 0,5 | 2,6 |
| `not_guilty_comment` (n=48) | +8,6 | −4,4 | +5,1 | **+4,0** | −1,6 | +1,8 | 1,5 | **3,7** |
| `insufficient_close` (n=50) | +7,0 | −0,2 | +0,4 | +0,6 | +1,1 | +0,2 | 2,3 | 0,0 |
| `insufficient_reinvestigate` (n=10) | **0,0** | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 | 2,2 | 0,0 |

> **Poznámka ke struktuře JSON:**  
> `not_guilty` a `insufficient_evidence` jsou v JSONu pod klíči `.approaches` resp. `.options`, nikoliv `.sentences`.  
> `_aplikujDusledky` v `cases.js` musí tyto struktury rozlišovat při výpočtu meta-vrstvy.

---

## 2. Tři čisté archetypy a jejich trajektorie

### Archetyp A — Tvrdý státník (`prisny_statnik`, `rychlosoudce`)
**Verdikty:** převážně `guilty_maximum` / `guilty_standard`  
**Průzkum:** minimální nebo žádný (soudit bez informací)

| Veličina | Trend za 15 pracovních dní (~30 spisů) |
|----------|----------------------------------------|
| Finance | Nejlepší z možností (~+450–475 Kčs z rozsudků) |
| Vina | Silný růst (+3–6/rozsudek) → krize při Vina > 80 |
| Moc | Roste → při ●●●●● zmizí odvážné rozsudky |
| Lid | Padá → při ●○○○○ svědci odmítají, Naděje klesá rychleji |
| Naděje | Klesá (−1,7 až −3,7/rozsudek) → při ★☆☆☆☆ zmizí optimistické volby |

**Přirozený konec:** PŘEŽITÍ nebo KORUPCE (pokud přijme Haase + Integrita klesne)  
**Slabé místo:** Vina se přirozeně blíží ke krizovému stavu, ale hráč to nevidí explicitně. Finance nezdůvodňují sebereflexe.

---

### Archetyp B — Empatický soudce (`milosrny`, `chudobni_obhajce`)
**Verdikty:** převážně `not_guilty_comment`, `alternative`, `guilty_lenient`  
**Průzkum:** aktivní (pro odemčení alternativy potřeba 2+ akce)

| Veličina | Trend za 15 pracovních dní (~30 spisů) |
|----------|----------------------------------------|
| Finance | Nejnižší (~+245–260 Kčs z rozsudků) |
| Integrita | Silný růst (+4,0/rozsudek u `not_guilty_comment`) |
| Odvaha | Silný růst (+3,7 u `not_guilty_comment`) → odemyká konfrontaci |
| Vina | Klesá (−1,5 až −1,6) — jediný archetyp, kde Vina klesá |
| Lid | Roste (+4–5) → při ●●●●● levnější informátor |

**Přirozený konec:** HRDINA (pokud odmítl Haase + Závadová ≥2 + Vlček = 0) nebo ANNA  
**Slabé místo:** Finanční deficit oproti Tvrdému je **~210 Kčs za kampaň** (7 Kčs/spis × 30 spisů). Bez dirty path nebo bez operace jde tento hráč snadno do mínusu.  
**Nutný test:** Lze empatický hráč přežít bez bankrotu na čisté cestě a bez Haase? Viz Jízdní řád §3.

---

### Archetyp C — Alibista (`byrokrat_odkladac`)
**Verdikty:** převážně `insufficient_close` (uzavřít bez rozsudku)  
**Průzkum:** minimální

| Veličina | Trend za 15 pracovních dní (~30 spisů) |
|----------|----------------------------------------|
| Finance | Nejnižší z „uzavírání" (+7 Kčs/případ vs. +15,8 u maxima) |
| Moudrost | **Největší růst ze všech archetypů!** (+2,3/případ) — paradox „alibisty co ví" |
| Frakce | Téměř nulové pohyby — neutrální postoj |
| Vina | Mírně roste (+1,1) — nečinnost má cenu |

**Přirozený konec:** PŘEŽITÍ (nejpravděpodobnější, protože nespouští žádný trigger)  
**Slabé místo / exploit:** Uzavírat vše `insufficient_close` dává finance +7 + Moudrost +2,3 bez frakcních ztrát. Je to `too safe`. **Doporučení:** přidat Vina +2 nebo snížit finance na +3–4 u `insufficient_close`.  
**`insufficient_reinvestigate`** je fakticky nulový (0 Kčs, 0 rysů). Spis se vrátí — ale v jakém stavu? Pokud identický, je to exploit (odložit donekonečna).

---

## 3. OSA PRŮZKUMU: Čistá cesta (inkoust) ↔ Špinavá cesta (dirty path)

### Ekonomika průzkumu

**Kapky inkoustu:**
- Baseline: **3 kapky/den** (ostré; testovací hodnota 15 je jen pro debug)
- Maximum denně: 5 kapek
- Průměrný maximální náklad na jeden spis (všechny 4 akce): **4,8 kapky**
- Kapky jsou **sdílené** mezi všemi spisy daného dne

Při 3 kapkách a 2 spisech denně: hráč **nemůže prozkoumat vše** — musí volit priority.

**Dirty path:**
- Dostupná u **všech 39 případů**, u **117 slotů** (průměr ~3 na spis)
- Konfrontace dirty path **neexistuje** (pravidlo v `cases.mdc`)
- Standardní penalizace (výchozí z `_defaultDirtyFinanceDelta`): −12 až −20 Kčs + Integrita −2 + Vina +1
- Reálné hodnoty v JSONu jsou na konkrétních slotech: −5 až −20 Kčs (81 slotů má custom override)
- Moudrost po neoficiálním zdroji roste ×2 místo ×3

### Tři kombinované strategie

| Strategie | Fin/den (z rozsudků) | Dirty penalizace/den | Integrita | Inkoust/den |
|-----------|---------------------:|---------------------:|----------:|------------:|
| **Tvrdý + dirty** | +30–35 | −30 až −50 Kčs | Padá | ~0 |
| **Tvrdý + čistý** | +25–30 | 0 | Stabilní | ~3 |
| **Empatický + čistý** | +15–20 | 0 | Roste | ~3 |
| **Empatický + dirty** | +10–15 | −30 až −50 Kčs | Stagnuje | ~0 |

**Klíčový princip pro balancing:**  
Dirty path není finančně neutrální — přidává ~30–50 Kčs denního výdaje nad rámec základních −55 Kčs. Empatický + dirty je ekonomicky nejrizikovější kombinace a měla by vést k bankrotu nebo nutnosti přijmout Haase.

---

## 4. OSA FINANCÍ: Bohatý ↔ Chudý

### Výchozí stav a checkpointy (z `Balancing.csv`)

| Checkpoint | Finance min | Finance střed | Finance max | Riziko bankrotu |
|------------|------------:|--------------:|------------:|:----------------|
| Start | 120 | 120 | 120 | 0 |
| Po D7 (výplata) | −27 | −2 | +23 | střední |
| Po D11 (Haas) | +74 | +138 | +203 | nízké (pokud přijal) |
| Po D16 (finále) | +41 | +124 | +207 | závisí na předchozím |

> Čísla z Balancing.csv předpokládají průměrový průchod. Empatický hráč bez Haase bude o ~100–150 Kčs níže.

### Haasova obálka (D11)

Jednorázová injekce +300 Kčs (`vzit_obalku` v pool JSON) — klíčový `fork`:
- Přijmout: Finance skokem +300, ale Integrita a frakcní trajektorie k KORUPCI
- Odmítnout: Finance zůstávají pod tlakem; odemyká cestu k HRDINA / ANNA / SMÍŘENÍ

Bez Haase je finanční přežití empatického hráče závislé na operaci (−400 Kčs hit) a výplatách. Operace v D4 je designovaná jako **první krize** — ne nutně prohraná, ale bolestivá.

---

## 5. Interakce os a přirozené konce

| Verdikty | Průzkum | Finance | Přirozený konec |
|----------|---------|---------|-----------------|
| maximum/standard | žádný | tvrdá cesta | PŘEŽITÍ / KORUPCE |
| maximum/standard | čistý | tvrdá cesta | PŘEŽITÍ |
| not_guilty/alternative | čistý | chudá cesta, odmítl Haase | HRDINA / ANNA |
| not_guilty/alternative | dirty | chudá cesta, odmítl Haase | ANNA (pokud průzkum ≥80%) |
| insufficient/close | žádný | střed | PŘEŽITÍ |
| mix | čistý | odmítl Haase, Vina ★☆☆☆☆ | SMÍŘENÍ |
| independent/fair | čistý | odmítl Vlčka, MOC nízká | ATENTÁT (skrytý) |

---

## 6. Identifikované slabiny (k opravě při balancingu)

### A) Příliš malá finanční penalizace empatického verdiktu
Rozdíl `guilty_maximum` vs. `not_guilty_comment` = **+7,2 Kčs/spis**.  
Za 30 spisů: **−216 Kčs celkem** — to je reálný tlak, ale ne dramatický.  
Pokud hra nemá dostatečně viditelné varování blížícího se bankrotu, hráč tlak nepocítí.  
→ **Test:** empatický + čistý bez Haase — je D7 balance nad 0?

### B) `insufficient_close` je příliš bezpečný
Finance +7 + Moudrost +2,3 + nulové frakční dopady. Žádná penalizace za nečinnost.  
→ **Návrh:** Vina +2 nebo finance snížit na +3–4.

### C) `insufficient_reinvestigate` je fakticky prázdné
0 Kčs, 0 rysů, 0 frakcí. Otázka: v jakém stavu se spis vrátí? Pokud identickém, je to exploit.  
→ **Nutné dořešit v engine** — co se stane s vráceným spisem.

### D) Alternativní verdikt má skvělé rysy, ale stejnou cenu jako mírný trest
`alternative` průměrně +10 Kčs (stejně jako `guilty_lenient`), ale Integrita +4,4 a Naděje +2,9.  
Podmínka (2+ akce + rozpor) ho dělá vzácným, ale odměna je možná moc dobrá.  
→ **Sledovat:** pokud má `archivar` Integritu 85+ na konci D7, je alternativa přeplacená.

### E) Inkoust (15 → 3) změní hru zásadně
Přechod z testovacích 15 na produkční 3 kapky je největší plánovaná změna.  
Při 3 kapkách `archivar` nemůže mít `pruzkum_na_spis` > 1,5 (3 kapky / 2 spisy).  
Alternativní verdikt (vyžaduje 2+ akce) bude dostupný jen pro **fokusovaný spis** — ne oba.  
→ **Toto je záměrné designové napětí**, nutno otestovat, zda není příliš frustrující.

---

## 7. Metriky pro srovnání archetypů (z `AI-persony-a-reporty.md`)

Pro každý testovací průchod sledovat minimálně:

| Metrika | Kde | Prahové hodnoty pro alarm |
|---------|-----|--------------------------|
| `finance_konec` | `terminal_state` | < 0 = bankrot, > 300 = příliš snadné |
| `pomer_not_guilty` | z `verdicts` | > 0,7 u `milosrny` = ok; > 0,7 u `prisny` = chyba persony |
| `pomer_insufficient` | z `verdicts` | > 0,5 u `byrokrat` = ok; > 0,3 u jiných = alarm |
| `pruzkum_na_spis` | `investigation_summary` | < 0,5 u `archivar` = inkoust moc nízko |
| `integrita_konec` | `terminal_state.traits` | < 30 u `milosrny` = chyba; > 80 u `prisny` = chyba |
| `vina_konec` | `terminal_state.traits` | > 80 u `rychlosoudce` = krize (záměrné) |
| `endingType` | `terminal_state` | viz tabulka §5 — nesprávný konec pro personu = alarm |

---

*Navazující dokument: [`Jizdni-rad-balancingu.md`](./Jizdni-rad-balancingu.md) — kde a jak měnit čísla.*

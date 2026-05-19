# Plán — Fáze F: hratelnost a kalendář konců

**Datum:** 2026-05-19  
**Vychází z:** běh matice 4 (`Analyza-matice-konce-2026-05-19-run4.md`), vlny C–E hotové  
**Cíl:** 8/8 konců dosažitelných **ve správném herním dni**, přežití oddělené od hrdiny, ověření **lidským** hraním

---

## 1. Kde jsme

| Metrika | Stav |
|---------|------|
| Matice 8 person (běh 4) | 8/8 dokončeno, **7/8** zásah cíle |
| Typy konců v jedné sadě | 7 (`preziti` chybí — střední → hrdina) |
| Typický den konce v matici | `currentDay` **15** (≈ 16. 3.) u 6 person |
| Scénář (`Mapa_15dni`, `days.json`) | **Beze změny** — obsah sedí |
| Problém | Prahy konců ≠ kalendář mapy; předčasný konec hry |

---

## 2. Dva čísla dne (nutné sjednotit)

| Pojem | Příklad | Použití |
|-------|---------|---------|
| **`currentDay`** (`days.json`) | 1–19 včetně SO/NE | Engine, `zkontrolujKonecDne`, reporty |
| **Pracovní den mapy** (`Mapa_15dni` sloupec Den) | 1–15 | Scénář, datum 2.–20. 3. |

**Převod (kampaň 1931):**

| `currentDay` | Datum | Mapa Den | Milník / konec dle mapy |
|--------------|-------|----------|-------------------------|
| 15 | 16. 3. | 11 | Haas osobně — **korupce** |
| 16 | 17. 3. | 12 | Zavadová — **smíření** (možné) |
| 17 | 18. 3. | 13 | Karas — **útěk / atentát** |
| 18 | 19. 3. | 14 | Marková — **kruh / Anna** |
| 19 | 20. 3. | 15 | Velezrada — **hrdina / přežití** |

**Pravidlo pro fázi F:** sloupec **„Nejdříve“** v `Konce_15dni.csv` = vždy **`currentDay`**, ne sloupec Den z mapy. Doplnit do CSV sloupec `currentDay_min` + `datum_nejdrive` (volitelně).

---

## 3. Cílový stav (Definition of Done)

- [ ] **8/8** person v matici trefí cíl (po F4 ověřeno `anna_pravda` → `anna` D18; celá matice znovu doporučena).
- [x] **`preziti`** se v matici objeví — `stredni_cesta` → `preziti` D19 (běh 5, částečně).
- [ ] Hráč u každé větve **dožije** scénu, ke které konec patří (nekončí u Haase, pokud má skončit u Markové / Velezrady).
- [ ] **2 ruční** průchody (min. přežití + 1 extrémní větev) — poznámky do `docs/playtesting/`.
- [ ] `Konce_15dni.csv` = jedna tabulka pravdy s `engine.js` (komentář + sloupce dní).

---

## 4. Fáze F — pořadí práce

### F1 — Kalendář konců (priorita 1)

**Problém:** Konec se vyhodnocuje jen po dni **se spisy**; D13–14 nemají spisy → kontrola až D15. Prahy „D14“ v CSV = herní den 14 = neděle bez soudů.

| ID | Úkol | Kde | Poznámka |
|----|------|-----|----------|
| F1a | Přemapovat `minDay` konců na `currentDay` dle mapy | `engine.js`, `Konce_15dni.csv` | viz tabulka §5 |
| F1b | **Anna, kruh** → `den >= 18` (19. 3., Marková) | `engine.js` | Po obsahu D14 mapy |
| F1c | **Smíření** → `den >= 16` (17. 3., Zavadová) nebo 17 po Karasovi | `engine.js` | Ne dřív než po Benešovi + prostor na operaci |
| F1d | **Útěk / atentát** → `den >= 17` (18. 3., Karas) | `engine.js` | Po VETVENÍ 4 |
| F1e | **Hrdina / přežití** → `den >= 19` (20. 3., Velezrada) | `engine.js` | Finále aktu |
| F1f | **Korupce** → ponechat `den >= 15` (den Haase) nebo 11 pokud úplatek dřív | `engine.js` | Sladit s tím, kdy jde vzít obálku |
| F1g | Volitelně: vyhodnotit variabilní konec i v **večer** dne bez spisů (D13–14), pokud uzly + rysy sedí | `engine.js` `zkontrolujKonecDne` | Jinak vždy čeká na další spisový den |

**Ověření:** 8× `npm run playtest:konce` → sloupec `den_konce` v tabulce odpovídá §5.

---

### F2 — Přežití vs. hrdina (priorita 1)

**Problém:** Střední profil driftuje na INT/ODV 100 + vzdor → splní hrdinu dřív než přežití.

| ID | Úkol | Kde |
|----|------|-----|
| F2a | **Hrdina** jen pokud `odv >= 78` **a** (`integ >= 78` nebo vina <= 55`) — ne čistě „vysoká integrita z poolu“ | `engine.js` |
| F2b | **Přežití:** vyžadovat `vlcek_vztah === 'neutral'` (ne vzdor, ne kompromitovan) + 4/5 rysů 30–70 | `engine.js` |
| F2c | Persona `stredni_cesta`: vyšší start `trust.vlcek: 2`, `vecerniVolba: 'middle'`, méně frakčních skoků (volba NG) | `playtest-run.js` |
| F2d | Volitelně: mírnější růst INT u `not_guilty` / `insufficient` (BALANC) | `cases.js` |

**Ověření:** `stredni_cesta` → `preziti` na **D19**; `hrdina_cisty` → `hrdina` na **D19** (ne D15).

---

### F3 — Oddělení větví (priorita 2, většinou hotovo)

| ID | Úkol | Stav |
|----|------|------|
| F3a | Atentát před útěkem | ✅ hotovo |
| F3b | Smíření po Anně, ne chudý archivář | ✅ hotovo |
| F3c | Auto-platba operace až od D16 | ✅ hotovo |
| F3d | Zkontrolovat, že **korupce** vyžaduje `haas_kontakt === 'zavazany'` po obálce (ne jen `uplatek` bez Haase) | k revizi |

---

### F4 — Průzkum a Anna (priorita 2)

| ID | Úkol | Stav |
|----|------|------|
| F4a | `kampan_statistiky` ve snapshotu a `metrics` reportu | ✅ `playtest-run.js` |
| F4b | Anna: `profilAnnaPotencial`, operace `odmitl`/`nerozhodl`, Anna před smířením, finance strop | ✅ `engine.js` |
| F4c | Persona `anna_pravda`: nižší start, `odlozit_vcas` | ✅ `playtest-run.js` |
| F4d | Volitelně: `pruzkumProcent` ve `state.js` | později |

---

### F5 — Ekonomika a pocity hry (priorita 3)

| ID | Úkol | Kde |
|----|------|-----|
| F5a | Sjednotit `economy.mdc` s kódem (48 vs 55 výdajů, plat 90 vs 80) | `.cursor/rules/economy.mdc` |
| F5b | UI hint: při balance ≥ 400 před D16 „Můžete zaplatit operaci“ / po D16 „Termín operace“ | `finance.js` / UI |
| F5c | Ověřit spread tvrdý−měkký na D7 (4 persony × 7 dní) — cíl 100–200 Kčs | playtest 7d |

---

### F6 — Ruční hratelnost (priorita 1 po F1+F2)

| ID | Úkol | Výstup |
|----|------|--------|
| F6a | Průvodce: **8 cest ke konci** (1 strana) — co hráč dělá / nedělá | `docs/playtesting/Průvodce-8-koncu.md` |
| F6b | Ruční průchod: **přežití** + **anna** (min.) | poznámky v `docs/playtesting/Rucni-F6-*.md` |
| F6c | Volitelně: přežití, korupce, atentát | rozšíření F6b |

**Kritérium:** „Cítím, že konec odpovídá tomu, jak jsem hrál“ (škála 1–5 v poznámkách).

---

## 5. Cílová tabulka: persona → konec → `currentDay`

| Persona | Cíl | Očekávaný `currentDay` | Datum | Klíčová rozhodnutí |
|---------|-----|------------------------|-------|-------------------|
| `korupcni` | korupce | **15** | 16. 3. | úplatek / obálka Haas |
| `zbohaceny_utek` | utek | **17** | 18. 3. | zaplatit operaci, Karas, bohatý |
| `atentat_moc` | atentát | **17** | 18. 3. | Beneš přijal, operace odložena, vzdor |
| `smireni_mekky` | smireni | **16–17** | 17.–18. 3. | Beneš přijal, klid, ne Anna |
| `anna_pravda` | anna | **18** | 19. 3. | chudoba, průzkum, Beneš, ne operace |
| `kruh_temny` | rad | **16–18** | 17.–19. 3. | úplatek + Zavadová |
| `hrdina_cisty` | hrdina | **19** | 20. 3. | vzdor, Beneš ne, Velezrada |
| `stredni_cesta` | preziti | **19** | 20. 3. | neutrální Vlček, rysy střed |

---

## 6. Návrh úprav `Konce_15dni.csv` (sloupec Nejdrive)

| Konec | Nový `Nejdrive` (`currentDay`) | Poznámka |
|-------|-------------------------------|----------|
| Korupce | 15 | den Haase (dřív 11 — mýlící) |
| Útěk | 17 | po Karasovi |
| Atentát | 17 | po Karasovi |
| Smíření | 16 | po Zavadové (min.) |
| Anna | 18 | Marková |
| Kruh | 16 | Zavadová (nebo 18 pokud až po Markové) |
| Hrdina | 19 | Velezrada |
| Přežití | 19 | Velezrada; fallback pokud nic jiného |

---

## 7. Příkazy

```powershell
# Terminál 1
npm run serve

# Terminál 2 — po F1+F2
$env:PLAYTEST_EXTERNAL_SERVER='1'
npm run playtest:konce

# Jen problematické
node scripts/playtest-run.js stredni_cesta 19
node scripts/playtest-run.js anna_pravda 19
```

---

## 8. Rizika a mitigace

| Riziko | Mitigace |
|--------|----------|
| Posun minDay → žádný konec do D15 v matici | Postupně upravit persony (dřívější splnění podmínek) |
| Hra příliš dlouhá (všechny do D19) | OK — záměr pro přežití/hrdinu; extrémy končí dřív |
| F1g (konec ve dnech bez spisů) rozbije flow | Implementovat až pokud F1a–f nestačí |
| Regrese runneru | Porovnat reporty před/po (`uzlove_subset`, `endingType`, `currentDay`) |

---

## 9. Checklist (tisknutelný)

```
Fáze F — postup
[x] F1  Kalendář minDay v engine + CSV (2026-05-19)
[x] F2  Přežití vs hrdina (2026-05-19)
[ ] Matice 8×19 — tabulka vs §5
[ ] F6  Průvodce 8 konců + 2 ruční běhy
[x] F4  Anna + kampan_statistiky v reportu
[ ] F5  Docs economy sjednocení
[ ] Aktualizovat Analyza-matice-konce-*-run5.md
```

---

## 10. Co záměrně neřešit teď

- Přepis `Mapa_15dni` nebo přesun případů mezi dny (scénář je OK).
- Nové příběhové texty / osmý „devátý“ konec.
- Plná automatizace CI (stačí lokální matice + 2 ruční běhy).

---

*Po dokončení F1+F2 spustit matici jako **běh 5** a uložit `Analyza-matice-konce-2026-05-19-run5.md`.*

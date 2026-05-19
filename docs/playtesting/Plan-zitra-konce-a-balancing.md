# Plán na zítřek — vlny balancingu + osm konců

**Datum přípravy:** 2026-05-17  
**Aktualizace:** 2026-05-18 — Vlna C+D implementovány v kódu, 8 cílových person v runneru.  
**Navazuje na:** Vlna A+B (hotovo), 4 referenční běhy 19 dní, validace 7 dní (`92341cc8…`, `cba7e61e…`).

---

## 1. Kde jsme skončili

| Oblast | Stav |
|--------|------|
| Playtest runner | 4 persony, reporty v `artifacts/playtest/` |
| Globální páky | Výdaje 48, výplata 90, frakce ×0,75, Vina guilty ×0,75, fragment Vina≥80, UI hinty |
| Rozdíl person (1. týden) | Finance a Vina se oddělily; **spread tvrdý−měkký na D7 stále malý** (~18 Kčs, cíl 100–200) |
| Konce | Všechny 4 běhy skončily **`preziti` na D19** — žádný variabilní konec 1–7 |
| CSV vs kód | `docs/scenar/Konce_15dni.csv` ≠ plně napojené; vyhodnocení v `engine.js` → `_vyhodnotVariabilniKonec()` |

**Závěr dneška:** ekonomika a rysy se hýbou, ale **koncové větve zatím nejsou dosažitelné** při současných personách a prioritě kontrol.

---

## 2. Jak fungují konce v kódu (nutné vědět)

Vyhodnocení: po **posledním rozsudku dne**, `den ≥ 11`, `allowVariabilni === true` → `State.vypoctiUzloveFlagy()` → `_vyhodnotVariabilniKonec()`.

**Pořadí (první shoda vyhrává):**

| Pořadí | `type` | minDay | Klíč v kódu |
|--------|--------|--------|-------------|
| 1 | `korupce` | 11 | `uzlove`: vlček kompromitovan + Haas zavázaný + Integrita ≤ 20 |
| 2 | `smireni` | 12 | Beneš přijal + Haas ≠ zavázaný + Integrita ≥ 60 + Vina ≤ 20 |
| 3 | `utek` | 13 | Haas ≠ zavázaný + osobní cena zaplatil + Karas ≥ 2 + balance > 300 |
| 4 | `atentát` | 13 | Vlček vzdor + Haas odmítnut + Beneš přijal + Odvaha ≥ 80 + Moc ≤ 20 |
| 5 | `rad` (Kruh) | 14 | Vlček ≠ vzdor + Haas zavázaný + Beneš ≠ přijal + (Mašek podepsán **nebo** Závadová ≥ 3) |
| 6 | `anna` | 14 | Beneš přijal + Haas odmítnut + osobní **nerozhodl** + balance < 100 + Moudrost ≥ 60 (proxy průzkumu) |
| 7 | `hrdina` | 15 | Vlček vzdor + Haas odmítnut + Integrita ≥ 80 + Odvaha ≥ 80 |
| 8 | `preziti` | 19 | vždy (fallback) |

Uzlové stavy (`state.js` → `vypoctiUzloveFlagy`):

- **vlček kompromitovan:** úplatek **nebo** (`flag_vlcek_upozorneni` + Integrita ≤ 35)
- **vlček vzdor:** bez úplatku + `trust.vlcek ≤ 0` + Odvaha ≥ 65
- **Haas zavázaný:** jen `uplatek_prijat`
- **Haas otevřený:** obálka / Beneš identifikován / rodný list — **není** „zavázaný“, ale blokuje čistou větev „odmítnut“ v designu CSV
- **Beneš přijal:** zatím jen `benes_identified` → auto `benes_pravda = prijal` (scéna „odmítl“ chybí)
- **osobní cena:** operace zaplacena / odložena / haasem (úplatek+zaplaceno)

---

## 3. Mapování CSV ↔ kód ↔ čtyři persony

| # | CSV | Design (zkráceně) | Kód — hlavní odchylky | 4 persony dnes |
|---|-----|-------------------|------------------------|----------------|
| 1 | Přežití | Střední rysy, Vlček 1–2, žádný extrém | Jen D19, pokud nic jiného | **ANO** (všechny 4) |
| 2 | Korupce | INT≤20, Vlček/Haas, úplatek, hnus | INT≤20 **tvrdé**; Haas zavázaný = úplatek | **NE** (úplatek ano, INT 84–100) |
| 3 | Hrdina | INT/ODV≥80, Vlček 0, odmítl Haas/Beneše, NE rodný list | Beneš „odmítl“ neexistuje; potřeba vzdor + INT/ODV 80 | **NE** (vlček trust 1–2, ODV ~50) |
| 4 | Útěk | Karas, finance >300, poslechl D11, operace | `trust.karas≥2`, zaplatil operaci, bez úplatku | **NE** (útěk blokuje úplatek; finance u měkkých nízké) |
| 5 | Smíření | INT≥60, Vina≤20, Beneš ano, Haas ne | Operace/Beneš v CSV; kód jen uzly | **NE** (Vina u tvrdých 100; milosrny Vina 63 ale Beneš?) |
| 6 | Atentát | ODV/MOU, Moc≤20, Vlček 0, ignoroval D11 | Chybí Integrita≥60 z CSV; **smíření D12 může předběhnout** | **NE** |
| 7 | Kruh | Vlček odmítl, Závadová 3, Mašek, NE rodný list | `rad` v kódu; potřeba úplatek + nepřijmout Beneše | **NE** (Beneš z případů často identifikován) |
| 8 | Anna | Vina≤20, finance<100, 80 % průzkum, tichá katarze | Proxy Moudrost≥60; `osobni_cena` musí zůstat **nerozhodl** | **NE** (finance 263 u milosrny; operace deadline) |

**Odpověď na otázku „lze dojít do každého konce?“**

- **Ano, principiálně** — podmínky nejsou logicky neslučitelné jako celek.
- **Ne, se současným obsahem + prioritou + 4 personami** — hra **konverguje na `preziti`**, protože:
  1. **Korupce** vyžaduje INT≤20, ale guilty/úplatek persony drží INT vysokou.
  2. **Úplatek** nastaví Haas=zavázaný → vyloučí Hrdinu, Atentát, Annu, Útěk (ne zavázaný).
  3. **Smíření (D12)** může „sežrat“ hráče mířícího na **Atentát (D13)** se stejným Benešem a nízkou Vinou.
  4. **Anna (D14)** vs **Hrdina (D15)** — Anna bere hráče s Benešem + chudobou dřív; Hrdina vyžaduje `trust.vlcek ≤ 0` (velmi tvrdé).
  5. **Beneš „odmítl“** a **průzkum 80 %** v CSV **nemají** vlastní mechaniku.
  6. **`preziti`** je až D19 — mezitím nic nevyhodnotí „střední přežití“ dříve (CSV říká D15).

→ **Doporučení:** upravit CSV **a** kód společně; přidat **8 cílových person** (nebo 8 scénářů v runneru); změnit **pořadí / vylučující skupiny** konců.

---

## 4. Matice konfliktů (pro redesign)

```
                    úplatek   bez úplatku   Beneš přijal   Beneš ne   operace zaplacena   operace ne / odložena
KORUPCE               ✓          —            —              —            —                    —
SMÍŘENÍ               —          ✓            ✓              —            (často ✓)            ✓
ÚTĚK                  —          ✓            —              —            ✓                    odložení blokuje
ATENTÁT               —          ✓            ✓              —            —                    —
KRUH                  ✓          —            —              ✓            —                    —
ANNA                  —          ✓            ✓              —            —                    ✓ (nerozhodl)
HRDINA                —          ✓            —              —            —                    —
PŘEŽITÍ               (fallback D19 — vše ostatní nepadne dříve)
```

**Kritické páry:**

- **Korupce × vše čisté** — řešeno úplatkem (OK).
- **Smíření × Atentát** — oba „čistí“, rozdíl až Odvaha/Moc a den; **priorita 2 vs 4** = smíření vyhrává na D12.
- **Anna × Útěk** — oba potřebují peníze, ale Anna **<100**, Útěk **>300** (OK oddělené).
- **Anna × zaplacení operace** — zaplacení → `osobni_cena=zaplatil` → Anna **nikdy**.

---

## 5. Cílové persony / strategie (playtest na zítřek)

Každý konec = **jedna deterministická persona** (rozšíření `scripts/playtest-run.js`), běh **19 dní**, výstup `endingType` v reportu.

| Persona (návrh) | Cílový konec | Strategie (zkráceně) |
|-----------------|--------------|----------------------|
| `stredni_cesta` | Přežití | Střední verdikty, 1× průzkum, občas NG, **ne** úplatek, Beneš neutrální, operace odložit |
| `korupcni` | Korupce | Úplatek + obálka + maximum guilty, **vyhýbat se** +Integrita (fragmenty?) |
| `hrdina_cisty` | Hrdina | Bez úplatku, odmítnout obálku, Vlček ignorovat (trust→0), guilty kde třeba ODV, D15+ |
| `zbohaceny_utek` | Útěk | Bez úplatku, šetřit, Karas volby, zaplatit operaci v termínu, balance>300 D13 |
| `smireni_mekky` | Smíření | NG/mírné, Vina nízko, Beneš identifikace, **bez** úplatku, INT držet 60+ |
| `atentat_moc` | Atentát | Vina nízká do D12?, pak ODV↑, Moc↓ (NG pro Lid?), Beneš ano, Vlček vzdor, **nesplnit** smíření (Vina>20 do D12) |
| `kruh_temny` | Kruh | Úplatek, **nepoužít** rodný list / Beneše, Mašek podepsat, Závadová návštěvy |
| `anna_pravda` | Anna | Beneš, bez úplatku, **nezaplatit** operaci (odložit), max průzkum, držet finance <100 |

**Stávající 4 persony** mapují jen na **Přežití** (+ případně budoucí Korupce, pokud snížíme INT práh).

---

## 6. Vlny změn (pořadí práce zítra)

### Vlna C — oddělení stylů hry (statistiky)

**Cíl:** stejný den, jiná persona → **viditelně jiné** finance / rysy / frakce (ne jen globální ×0,75).

| ID | Změna | Kde | Poznámka |
|----|-------|-----|----------|
| C1 | Guilty +finance / NG −finance v poolu | `pool_cases_akt1.json` (vzorek 5–10 spisů, pak šablona) | Spread tvrdý−měkký D7 směrem k 100–200 |
| C2 | `insufficient_close` / mírné NG víc −Vina | pool + `cases.js` | Milosrny realističtější |
| C3 | Prahy frakcí (např. Moc≥70 → fragment) | `fragments.json` + kontrola v `engine.js` | Zpomalení extrémů 0/100 |
| C4 | Důvěra z milníků (D7 dopis Vlček, D9 Beneš…) | `days.json` + dopisy / volby | Vliv na `trust`, ne jen uzly |
| C5 | Runner: archivář „nejinformovanější“ verdikt | `playtest-run.js` | Skóre podle clue / průzkum |
| C6 | Runner: milosrny NG jen kde `fair` | `playtest-run.js` | Jinak `insufficient` |

**Ověření:** 4 staré persony × 7 dní + diff checkpointů oproti `92341cc8` / `cba7e61e`.

---

### Vlna D — konce (CSV + engine + uzly)

**Cíl:** každý konec **dosažitelný** jednou personou z §5; žádný „mrtvý“ konec.

| ID | Změna | Kde |
|----|-------|-----|
| D1 | Sjednotit `Konce_15dni.csv` s kódem (jedna tabulka pravdy) | CSV + komentář v `engine.js` |
| D2 | **Korupce:** INT≤20 **nebo** (úplatek + INT≤35) — aby úplatek persony končily korupcí, ne přežitím | `engine.js` |
| D3 | **Smíření vs Atentát:** smíření vyžaduje Vina≤20 **a** Moudrost≥50; atentát vyžaduje Vina>20 **nebo** Moc≤20 (rozštěpení) | `engine.js` + CSV |
| D4 | **Beneš:** volba `benes_pravda = odmitl` (D9 scéna / listek) | `days.json`, UI, `state.js` |
| D5 | **Anna:** `pruzkumProcent` ve stavu (počet akcí / max) místo Moudrost≥60 | `state.js`, `cases.js`, `engine.js` |
| D6 | **Přežití:** vyhodnotit na **D15** pokud rysy 30–70 a žádný extrémní uzel | CSV řádek 1 + `engine.js` |
| D7 | **Pořadí konců:** skupiny (hnusné / čisté / únikové) místo jedné řady | refaktor `_vyhodnotVariabilniKonec` |
| D8 | 8 person v runneru + `npm run playtest:konce` (skript na všechny) | `playtest-run.js`, `package.json` |

**Ověření:** 8× běh 19 dní → tabulka `persona → endingType` (musí být 8 různých).

---

### Vlna E — milníky a obsah (dny 9–15)

| ID | Změna |
|----|-------|
| E1 | Haas D15: větve `not_guilty_*` výrazně sníží Moc / zvednou Lid |
| E2 | Operace D17: tři větve (`zaplatil` / `odložil` / `haasem`) vázat na `osobni_cena` bez race |
| E3 | Rodný list: flag `flag_rodny_list_pouzit` vs `NEPOUZIL` pro Hrdinu/Kruh |
| E4 | Mašek / Závadová: spolehlivá cesta k `rad` bez náhodného Beneše |

---

## 7. Návrh úprav CSV (volně — k odsouhlasení)

Navrhované sloupce pro **implementovatelný** kontrakt (engine čte přímo nebo generuje z CSV):

| Konec | Nejdrive | Tvrdé vyloučení | Min / max rysy | Uzly | Finance | Poznámka |
|-------|----------|-----------------|----------------|------|---------|----------|
| Přežití | D15 | žádný jiný konec 1–7 | INT,ODV,Vina,Nad 30–70 | — | — | Dřív než D19 |
| Korupce | D11 | `haas_kontakt≠zavazany` | INT ≤ 35 pokud úplatek; ≤ 20 jinak | vlček=kompromitovan | — | Sblížit s chováním |
| Smíření | D12 | úplatek | INT≥55, Vina≤25 | benes=prijal, haas≠zavazany | — | |
| Útěk | D13 | úplatek | — | osobni=zaplatil, karas≥2 | > 280 | |
| Atentát | D13 | úplatek, smíření nesplněno | ODV≥75, Moc≤25 | vzdor, benes=prijal | — | |
| Kruh | D14 | benes=prijal | — | haas=zavazany, masek **nebo** zavad≥3 | — | |
| Anna | D14 | úplatek, operace zaplacena | Vina≤25, Moudrost≥55 | benes=prijal, osobni=nerozhodl | < 120 | průzkum ≥ 75 % |
| Hrdina | D15 | úplatek, rodný list | INT,ODV≥75 | vzdor, haas=odmitnut | — | |

---

## 8. Checklist session

1. [ ] Spustit **7d** validaci (4 staré persony) — spread finance
2. [x] CSV `Konce_15dni.csv` sladěno s enginem
3. [x] **Vlna C** — finance podle skupiny verdiktu, kampan průzkum, fragmenty Moc/Lid
4. [x] **Vlna D** — přepracované `_vyhodnotVariabilniKonec`, Přežití D15
5. [x] 8 person + `npm run playtest:konce`
6. [x] Spustit matici — viz `Analyza-matice-konce-2026-05-19.md` (3/8 typů, 3/8 zásah cíle)
7. [ ] Vlna E — milníky operace, rodný list, Mašek (po matici)

**→ Navazuje:** [`Plan-balancing-F-hratelnost.md`](Plan-balancing-F-hratelnost.md) — fáze F (kalendář konců, přežití vs. hrdina, ruční hratelnost). Běh 4: [`Analyza-matice-konce-2026-05-19-run4.md`](Analyza-matice-konce-2026-05-19-run4.md).

---

## 9. Příkazy na start

```bash
# Krátká kontrola po včerejších změnách
node scripts/playtest-run.js rychlosoudce 7
node scripts/playtest-run.js milosrny 7

# Po implementaci D8 (zítra)
# npm run playtest:konce   # 8×19 dní — doplnit do package.json
```

---

## 10. Rizika

| Riziko | Mitigace |
|--------|----------|
| Úprava konců rozbije save | verze `uzlove` + migrace v `state.js` |
| 8 person × 19 dní = dlouhý CI | paralelní běhy / jen smoke 11–15 pro konce |
| Pool JSON 15k řádků | C1 jen vzorek + skript na guilty/NG finance |
| Příběhová nekonzistence | změny CSV projít proti `story.mdc` před merge |

---

*Dokument je vstupní bod pro zítřejší práci; po každé vlně doplnit `run_id` a tabulku checkpointů.*

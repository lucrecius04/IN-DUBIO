# Analýza matice konců — finální běh (8/8)

**Datum:** 2026-05-20  
**Příkaz:** `npm run playtest:konce` (8×19 dní)  
**Stav:** 8/8 dokončeno, žádný `ABORTED`  
**Zásah cíle:** **8/8**  
**Kalendář:** sedí s [`Konce_15dni.csv`](../scenar/Konce_15dni.csv)

---

## Souhrnná tabulka

| Persona | Cíl | Výsledek | Den | Finance | Úplatek | INT | ODV | VIN | NAD | MOU | Moc | Lid |
|---------|-----|----------|-----|---------|---------|-----|-----|-----|-----|-----|-----|-----|
| `stredni_cesta` | přežití | **preziti** ✓ | 19 | 229 | ne | 86 | 67 | 82 | 99 | 100 | 22 | 100 |
| `korupcni` | korupce | **korupce** ✓ | 15 | 814 | ano | **31** | 50 | 100 | 32 | 42 | 100 | 2 |
| `hrdina_cisty` | hrdina | **hrdina** ✓ | 19 | 221 | ne | 100 | 94 | 83 | 98 | 94 | 3 | 100 |
| `zbohaceny_utek` | útěk | **utek** ✓ | 17 | 645 | ne | 74 | 69 | 100 | 29 | 99 | 100 | 11 |
| `smireni_mekky` | smíření | **smireni** ✓ | 16 | 319 | ne | 92 | 81 | 20 | 100 | 99 | 0 | 100 |
| `atentat_moc` | atentát | **atentát** ✓ | 17 | 584 | ne | 76 | 92 | 100 | 34 | 99 | 80 | 27 |
| `kruh_temny` | kruh | **rad** ✓ | 16 | 847 | ano | 62 | 49 | 100 | 21 | 44 | 100 | 0 |
| `anna_pravda` | anna | **anna** ✓ | 18 | 145 | ne | 99 | 83 | 13 | 100 | 100 | 0 | 100 |

**Unikátních typů konců:** 8 / 8.

### Reporty

| Persona | Soubor (artifacts/playtest/) |
|---------|------------------------------|
| stredni_cesta | `0137304f-800e-402c-a465-dffb777bb683.json` |
| korupcni | `dbf890bb-3e25-4acc-9ef8-c6f9971e8771.json` |
| hrdina_cisty | `4bf5a99f-9162-4bb3-822b-3d54fbc6a019.json` |
| zbohaceny_utek | `6568202e-a75f-4abb-9fc0-8ebdf7e2311f.json` |
| smireni_mekky | `efcc899f-b6df-42bc-86a4-2667e06f4944.json` |
| atentat_moc | `fa395e67-fd02-4902-8784-e6c6340aeea7.json` |
| kruh_temny | `bdc8b320-7a2d-4497-87f8-0afbe39c2646.json` |
| anna_pravda | `b17cd52e-b79d-460e-b509-1a73315b0fcc.json` |

Úplatek v reportu: `metrics.uplatek` (ne vždy v `terminal_state`).

---

## Co funguje (po vlnách D + F + H+)

1. **Všech 8 konců dosažitelných** cílenými personami — korupce, hrdina, útěk, smíření, atentát, kruh, anna, přežití.
2. **Kalendář dnů** odpovídá mapě (D15 korupce, D16 smíření/kruh, D17 útěk/atentát, D18 anna, D19 hrdina/přežití).
3. **Rozdělení větví:** úplatek → korupce/kruh; bez úplatku → anna/hrdina/smíření; operace zaplacena vs. odložena → útěk vs. atentát.
4. **Runner** — API-first pro `tyc_*`, recovery timeoutu, fallback verdiktů (viz běhy 2–3 vs. tento).

---

## Integrita — stále vysoko u měkkých větví

| Skupina | INT na konci | Komentář |
|---------|--------------|----------|
| Anna, smíření, hrdina | 92–100 | NG + večerní volby + typové bonusy |
| střední, útěk, atentát | 74–86 | středně vysoké |
| kruh | 62 | temná, ale ne ★☆ |
| **korupce** | **31** | jediná opravdu nízká — práh ≤55 + úplatek funguje |

**Pro konce:** stačí (korupce oddělená, hrdina má vzdor + vysokou INT).  
**Pro zážitek / zápisník:** měkké persony skončí často na ★★★★★ Integrita — hráč necítí „opotřebení“.

### Úprava po této analýze (vlna H++, 2026-05-20)

| Místo | Změna |
|-------|--------|
| `js/state.js` | Přísnější strop **kladné** delty jen u **Integrita** (58→72→85+) |
| `js/cases.js` | `TRAIT_DELTA_SCALE_NG_INT: 0.48` (NG Integrita pomaleji než Odvaha) |
| `js/state.js` | Výchozí Integrita **68** (dříve 70) |

**Cíl:** měkké větve na D19 spíš INT **82–92**, korupce zůstane pod prahem.

---

## Naděje — bipolární, u konců nefiguruje

Naděj **neřídí žádný z 8 konců** v `engine.js` (jen přežití: 3/5 rysů v pásmu 25–75).

| Persona | NAD | Tón |
|---------|-----|-----|
| anna, smíření | **100** | nejoptimističtější |
| hrdina | 98 | |
| střední | **99** | paradox: „klidné přežití“ s téměř max. nadějí |
| atentát | 34 | |
| útěk | 29 | |
| korupce | 32 | |
| kruh | **21** | nejbleakší |

Trajektorie (vzorek): D1 ~42–58 → D7 ~43–78 → konec buď ~100 (měkké), nebo ~21–34 (tvrdé).

**Závěr:** Naděj dobře odděluje bleak vs. nadějné **epilogové** profily; na výběr konce nepůsobí. Vlna G **nemá** diminishing u Naděje — proto snadný strop u NG větví.

---

## Srovnání běhů matice

| Běh | Dokončeno | Zásah | Poznámka |
|-----|-----------|-------|----------|
| 1 | 8/8 | 3/8 | rad dominuje, korupce 0× |
| 2 | 4/8 | 3/8 | aborty runneru |
| 3 | 8/8 | 5/8 | po vlně E |
| 4 | 8/8 | 7/8 | střední → hrdina |
| **5 (tento)** | **8/8** | **8/8** | po D+F+H+ a opravách runneru |

---

## Návrhy designéra — statistiky a veličiny (vlna I+)

Priorita: co hráči **vidí** (zápisník, noviny, epilog) a co **tajně váží** konce — bez rozbití 8/8.

### A. Kampanové statistiky (`kampan_statistiky`)

Dnes hlavně `pripady_celkem` / `pripady_s_prurzkumem`. Doplnit:

| Metrika | Výpočet | K čemu |
|---------|---------|--------|
| `verdikty_tvrdy_pomer` | podíl guilty_maximum + standard | noviny „soudce tvrdý“ |
| `verdikty_ng_streak_max` | nejdelší série NG | Anna / hrdina — už částečně ve `verdikty_smer` |
| `dny_integrita_pod_40` | počet dní s INT&lt;40 | korupční oblouk v epilogu |
| `uplatky_odmitnuty` vs. `prijaty` | z Haas + pool | větev bez jediného boolean |
| `finance_z_poolu` vs. `z_veceru` | rozpad zdrojů | útěk vs. smíření čitelnější |
| `prumer_pruzkum_den` | průzkum / spisy | místo jednoho % na konci |

**UI:** v sobotním přehledu jedna věta typu *„Tento týden jste v 4 z 5 spisech sáhl po důkazech.“*

### B. Týdenní statistiky (`tydenni_statistiky`)

Rozšířit `verdikty_smer` o **štítek typu případu** (moralni/politicky/osobni) → týdenní „tón soudu“.

| Nové pole | Účinek |
|-----------|--------|
| `frakcni_tlak_tydne` | součet \|Δ Moc,Lid,Kap\| | krize frakce dřív než absolutní 72 |
| `tezke_rozsudky` | už existuje | propojit s fragmentem Vina≥80 |

### C. Rysy — další balanc (bez G2 hromadného JSON)

| Nápad | Mechanika |
|-------|-----------|
| **Naděj — diminishing** | stejný vzor jako INT u 70+ (měkké větve 98→88) |
| **Moudrost strop** | u MOU 90+ ×0,3 růst — méně „všichni 100“ |
| **Vina „klidová“** | při Vina≤15 a NAD≥80: +1 Vina za týden (tlak na smíření) |
| **Integrita z úplatku** | rozložit −18 na 3 dny „tíha svědomí“ místo jednorázově |

### D. Frakce — momentum, ne jen číslo

| Veličina | Popis |
|----------|--------|
| `moc_momentum` | 3× po sobě +Moc → fragment „úřad si vás pamatuje“ |
| `lid_kap_rozpor` | Lid≥70 a Kap≥70 → večerní volba jen 2 možnosti |
| Cap večerní volby | ±4 na frakci (z plánu G2) |

### E. Finance — příběhové metriky

| Metrika | Použití |
|---------|---------|
| `pomer_mzda_vs_mimo` | útěk: balance z „šedé“ ekonomiky |
| `dny_pod_prazdnou_kapsou` | krize Finance=0 — už v economy.mdc |
| `operace_%_uspor` | kolik % balance šlo na matku | epilog Síber |

### F. Epilog / StatsSummary (`stats-summary.js`)

Po dohrání **radar** 5 rysů + 3 frakce + 3 „karty rozhodnutí“:

1. **Cena spravedlnosti** — `(finance_konec − start) / max(1, 100 − Vina)`  
2. **Odchylka od středu** — kolik rysů mimo 30–70 (přežití vs. hrdina)  
3. **Tichá Anna** — průzkum % + balance &lt;130  

Režim `statsDisplayMode: hybrid` už existuje — přidat řádek „Kampaň v číslech“ jen pro curious hráče.

### G. Konce — jemné rozlišení (až po ručním F6)

| Problém | Návrh |
|---------|--------|
| střední: NAD 99 u přežití | přežití bonus: NAD 40–65, nebo fallback D19 jen pokud NAD≤70 |
| hrdina vs. střední | hrdina: ODV≥90 **a** vzdor; přežití: ODV 25–75 **a** neutral Vlček |
| smíření vs. anna | už `profilBlokujeSmireni` u chudé Anny — držet |

### H. Playtest reporty

Do JSON reportu doplnit top-level `kampan_statistiky` + snapshot `rozhodovaci_styl` — dnes se musí dohledávat v `daily_snapshots`.

---

## Vlna I — implementováno (2026-05-20)

| Oblast | Změna |
|--------|--------|
| `state.js` | Diminishing **Naděje** + **Moudrost**; frakce cap ±8; kampan statistiky |
| `cases.js` | NG Naděj ×0,58; guilty −Naděj ×1,12; úplatek −12/−5/+3 Vina + 2× ranní tíha |
| `finance.js` | Úplatek jen finance + flag (rysy v Cases) |
| `engine.js` | Ranní tíha úplatku; neděle → pondělí emotivní Vina; hrdina ODV≥88; přežití NAD 28–72 |
| `stats-summary.js` | Epilog: cena spravedlnosti + kampan metriky |

---

## Doporučené další kroky

| P | Akce |
|---|------|
| **P0** | Ověřit matici po H++ + I (`npm run playtest:konce`) |
| **P1** | **F6** — ruční hraní přežití + Anna (2×15 min) |
| **P2** | **G2** — effects v `pool_cases_akt1.json` + cap večerních voleb |
| **P3** | Vlna **I** — 2–3 metriky z tabulky A + epilog karty (F) |
| **P4** | Sjednotit `traits-factions.mdc` výchozí INT 68 s kódem |

---

## Související dokumenty

- [`Analyza-matice-konce-2026-05-19-run4.md`](./Analyza-matice-konce-2026-05-19-run4.md) — předchozí 7/8  
- [`Plan-balancing-F-hratelnost.md`](./Plan-balancing-F-hratelnost.md) — F1–F6  
- [`Balanc-G-navrh-velicin.md`](./Balanc-G-navrh-velicin.md) — vlna G  
- [`Balancing-backlog-tri-runy.md`](./Balancing-backlog-tri-runy.md) — 4 referenční persony

# Balancing backlog — čtyři referenční běhy

**Stav:** 4/4 referenční běhy hotovo. **Vlna A + B** implementovány v kódu (2026-05-17).

## Referenční běhy (19 dní)

| # | `persona_id` | `run_id` | Stav | Poznámka |
|---|--------------|----------|------|----------|
| 1 | `rychlosoudce` | `32d46892-cec4-4397-b096-839e91b9f69c` | OK | Tvrdá větev bez průzkumu |
| 2 | `archivar` | `d98e8fd6-a194-4f4e-bcce-27903d5705b7` | OK | Max průzkum, první legální verdikt |
| 3 | `milosrny` | `b2d1b6cb-41f4-408c-8ec2-ed95a2a4b109` | OK | 100 % NG, bez Haase, Lid 100 |
| 4 | `prisny_statnik` | `dc54fd92-caa8-4fe9-9de1-5497c213348f` | OK | Min. průzkum, guilty_standard finále |

**Spuštění 4. běhu:**

```bash
npm run playtest:prisny
# nebo: node scripts/playtest-run.js prisny_statnik 19
```

**Očekávání u přísného státníka:** `guilty_maximum` na velezradě, `guilty_vzit_obalku` u Haase, D7 bohatší než milosrny (spread 100–200 Kčs), `uplatek: true`, Moc vysoko.

---

## Hypotézy k ověření třetím runem

| Otázka | Rychlosoudce | Archivář | Očekávání u milosrny |
|--------|--------------|----------|----------------------|
| Balance D5 / D7 | 0 / −30 | 0 / −30 | **vyšší** (více NG, méně guilty) |
| `pomer_guilty` | vysoký | vysoký | **nižší** |
| `pomer_insufficient` | ~0,03 | 0 | **vyšší** |
| Vina konec | 100 | 100 | **nižší** (ideálně < 80 na D7) |
| Moudrost konec | ~57 | 100 | střední (clue-only, ne full průzkum) |
| Haas D15 | `guilty_vzit_obalku` | stejné | **`not_guilty_*` / odmítnutí obálky** |
| `uplatek` / `haas_obalka` | true | true | **false** |
| Konec | `preziti` | `preziti` | ? |

**Spread finance D7** (cíl z jízdního řádu): `rychlosoudce − milosrny` ≈ **100–200 Kčs**. Pokud < 50 → empatická větev není dost odlišná.

---

## Prioritní backlog (nezpracováno — čeká na 3 runy)

### P1 — Finance v 1. týdnu (oba tvrdé styly)

- **Signál:** D5 balance **0**, D7 **−30** u rychlosoudce i archiváře.
- **Možné páky:** `DENNI_VYDAJE_KC` (`finance.js`), výše výplaty, finance u `not_guilty_*` v poolu.
- **Rozhodnutí až po milosrny:** pokud milosrny má D7 > 0, stačí ladit tvrdé větve; pokud taky pod nulou, globální výdaje.

### P2 — Vina na 100 už ~D5

- **Signál:** `Vina` 100 brzy u guilty-heavy person.
- **Možné páky:** snížit `traits.vina` u `guilty_standard` / meta „naslepo“ v JSON; zpomalení v `cases.js`.
- **Rozhodnutí:** porovnat `vina` na checkpointech D3/D5/D7 u všech tří person.

### P3 — Frakce Moc 100 / Lid 0

- **Signál:** extrémní posun u tvrdých běhů.
- **Rozhodnutí:** jestli milosrny drží Lid > 30 na D11; jinak guilty efekty nebo meta `legalistni`.

### P4 — Runner (ne obsah hry)

- Archivář: verdikt stále „první legální“, ne „nejinformovanější“.
- Haas: obě tvrdé persony berou `guilty_vzit_obalku` — **milosrny runner** má preferovat `not_guilty` (implementováno v `playtest-run.js`).
- Po třech runech případně doplnit `prisny_statnik` jako 4. běh (horní hranice).

### P5 — Inkoust / průzkum

- Archivář: `pruzkum_na_spis` ~0,69, `pruzkum_pouzit` 16 — 3 kapky/den stačí.
- Alarm z jízdního řádu: `pruzkum_na_spis > 2,0` — **nesplněno**, OK.
- Rychlosoudce: `pruzkum_na_spis` ≈ 0 — OK.

### P6 — Obsahové rozdíly od průzkumu

- `tyc_hranice_2`: insufficient vs guilty_napomenuti — záměr dat, OK.
- `tyc_velezrada`: guilty_maximum vs guilty_standard — ověřit, zda je mírnější finále u archiváře žádoucí.

---

## Checkpointy (finance Kčs / Vina)

| Den | Rychlosoudce | Archivář | Milosrdný |
|-----|--------------|----------|-----------|
| D3 | 45 | 45 | **57** |
| D5 | 0 | 0 | **18** |
| D7 | −30 | −30 | **−12** |
| D11 | 132 | 140 | 130 |
| D15 | 422 | 430 | **100** |
| D19 | 641 | 648 | **263** |

| Konec | Rychlosoudce | Archivář | Milosrdný |
|-------|--------------|----------|-----------|
| Vina | 100 | 100 | **63** |
| Moc / Lid | 100 / 0 | 100 / 0 | **0 / 100** |
| Integrita | 84 | 96 | **100** |
| `pomer_not_guilty` | 0,11 | 0,11 | **1,00** |
| `uplatek` | true* | true* | **false** |
| Haas | `guilty_vzit_obalku` | stejné | **`not_guilty_odmitnut_s_komentarem`** |
| Hranice | `insufficient_prerusit` | `guilty_napomenuti` | **`not_guilty_with_comment`** |
| Velezrada | `guilty_maximum` | `guilty_standard` | **`not_guilty_formal`** |

\*uplatek flag v metrikách; Haas obálka u tvrdých person.

**Spread D7 (tvrdý − empatický):** (−30) − (−12) = **−18 Kčs** (cíl jízdního řádu 100–200) → empatická větev **není** finančně horší, v 1. týdnu je dokonce mírně lepší.

---

## Rozhodnutí backlogu (po 3 runech)

| ID | Verdikt | Akce |
|----|---------|------|
| **P1** | **Globální** — krize D5–D7 u všech tří | Snížit `DENNI_VYDAJE_KC` **nebo** mírně zvýšit výplatu / NG odměny v poolu; milosrny D7 stále −12 |
| **P2** | **Potvrzeno** | Ladit růst `Vina` u `guilty_*` (tvrdé persony na 100 už D5; milosrny ~60) |
| **P3** | **Potvrzeno** | Damping frakcí / guilty→Moc, NG→Lid (oba extrémy 0/100) |
| **P4** | Částečně hotovo | Milosrny runner OK (Haas). Archivář: pořád „první guilty“ — runner, ne JSON |
| **P5** | OK | Inkoust 3/den drží; archivář 0,69/spis |
| **P6** | OK | Obsah reaguje na průzkum (hranice, velezrada) |

**Po 4. běhu:** aplikovat návrh změn v sekci „Plán úprav veličin“ (jeden PR).

---

## Plán úprav veličin (po 4. běhu — návrh k odsouhlasení)

| Páka | Soubor | Teď | Navrh | Cíl |
|------|--------|-----|-------|-----|
| Denní výdaje | `js/finance.js` + `state.js` `resetDen` | ~~55~~ | **48** ✅ | D5 ≥ 15, D7 ≥ −10 u tvrdých |
| Výplata | `js/finance.js` `VYPLATA_KC` | ~~80~~ | **90** ✅ | |
| Frakce ×0,75 | `js/cases.js` `BALANC.FRAKCE_DELTA_SCALE` | 1,0 | **0,75** ✅ | `_aplikujDusledky` |
| Skrytý verdikt | `BALANC.SKRYTY_VERDIKT_KOEF` | ~~1,25~~ | **1,15** ✅ | |
| Meta vysoká Moudrost | `META_PROCESNI_VYSOKA_MOUD` | ~~2~~ | **1** ✅ | |
| Vina guilty ×0,75 | `BALANC.VINA_GUILTY_TRESTNI_SCALE` | 1,0 | **0,75** ✅ | `guilty_maximum` / `guilty_standard` |
| Fragment Vina ≥ 80 | `fragment_vina_krize_80` | — | **nový** ✅ | flag `vina_krize_80_zobrazeno` |
| UI dopad na verdiktu | `_wfVerdiktDopadovyHint` | osy | **čísla** ✅ | např. `Vina: +4 · Moc: +2` |
| Vina z guilty (pool) | `pool_cases_akt1.json` | často +8…+15 | **−20 %** u `guilty_standard` / `maximum` | Vina < 90 na D7 u rychlosoudce |
| Frakce damping | `js/cases.js` nebo pool | plné delty | **×0,75** na `factions` u verdiktů | Moc/Lid ne na 0/100 za 1 týden |

**Ověření:** znovu jen checkpointy D3/D5/D7 (krátký běh 7 dní stačí) nebo porovnat 4 JSON po úpravě.

**Nespěchat:** hromadná úprava 36 spisů — nejdřív globální páky, pak doladit milníky (Haas, hranice, velezrada).

**Poznámka k milosrny:** 100 % NG je extrémní stress-test (každý spis má volnou skupinu Nevinen); `insufficient` nikdy nevybrán. Pro „realističtější“ empatickou hranu zvážit runner: NG jen kde `fair`, jinak `insufficient`.

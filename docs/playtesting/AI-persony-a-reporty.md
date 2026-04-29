# AI / simulované betatesty: 12 person a reporty

Tento dokument je **produční spec** pro budoucí skript (Playwright, vlastní runner, nebo headless klikání). Cíl: generovat **srovnatelné JSON reporty** pro analýzu balancu (finance, rysy, frakce, průzkum / „akční body“, konce).

---

## 0) Pořadí práce (soulad s plánem týmu)

1. **Grafika + základní UX** — hra musí jít spolehlivě „proklikat“ bez ručních obchůzek.
2. **Instrumentace** (volitelné rozšíření): ukládat `playtest_log` do stavu nebo posílat batch reporty (viz níže).
3. **AI běhy** podle person z tohoto dokumentu.
4. **Balanc** podle agregátů (stovky až tisíce běhů).
5. **Encyklopedie** až po zhruba stabilním obsahu a číslech.

---

## 1) Výchozí čísla (odkaz na kód — ne hádat)

Startovní stav je v `js/state.js` v `VYCHOZI_STAV`:

```262:401:c:\projekty\IN DUBIO\js\state.js
  const VYCHOZI_STAV = {
    currentDay: 1,
    phase: 'morning',          // morning | forenoon | noon | afternoon | evening | night
    investigationActionsLeft: 10,

    traits: {
      Integrita: 70,
      Odvaha:    50,
      Moudrost:  55,
      Vina:      60,   // min. 1 — viz upravRys (GDD)
      Nadeje:    60
    },

    factions: {
      Moc:     50,
      Kapital: 50,
      Lid:     50
    },

    trust: {
      vlcek:    1,
      zavadova: 0,
      karas:    2
    },

    finance: {
      balance: 150,
      /** Kumulovaný dluh (nájem apod.). */
      dluh: 0,
      /** Dny (7,14,21,28), ve kterých už proběhla nedělní výplata +80 Kčs. */
      vyplataPrijataVDnech: []
    },
    // … flags, uzlove, archive, revealedInfo, tydenni_statistiky, rozhodovaci_styl, …
    settings: {
      patraniNaCas: false
    }
  };
```

**Denní pevný výdaj** při přechodu dne: `State.resetDen()` volá `upravFinance(-55)` (viz `js/state.js` kolem řádku s `upravFinance(-55)`). To je klíčové pro simulace — bot musí znát ekonomický tlak stejně jako člověk.

**„Akční body“ průzkumu:** sdílený počet `investigationActionsLeft` (výchozí 10; mění se bonusy z kávy, spisů, týdenních metrik atd.). Pro reporty používej název pole **`inkoust_zbyva`** (alias) + **`inkoust_spotreba_odhad`** z rozdílu proti teorii maxima dne, pokud loguješ denní snapshoty.

---

## 2) Dvanáct person (ID + chovací politika)

Každá persona je **prioritní pravidlo**, ne literární postava. Implementace = deterministická heuristika (ne LLM náhodnost), aby šly běhy opakovat se stejným seedem.

| `persona_id` | Název | Průzkum / pátrání | Verdikty | Večerní volby (obecně) | Adventure / dopisy |
|--------------|--------|-------------------|----------|------------------------|----------------------|
| `rychlosoudce` | Rychlosoudce | Žádný průzkum; rovnou krok rozsudku | První legální `guilty_*` / `not_guilty_*` podle UI pořadí | Rychlé / nízkointerakční | První volba / přeskočení čtení |
| `archivar` | Archivář | Vždy max. odhalitelných kroků; clue system pokud existuje | Preferuje varianty s vyšší informovaností; `insufficient_*` až když UI dovolí | Volby +Moudrost / spisy | Konzervativní pravda, pokud není proti pravidlům persony |
| `milosrny` | Milosrdný soudce | Průzkum jen pokud zjemňuje obraz obžalovaného | Preferuje `not_guilty_*`, `guilty_lenient`, mírné pokuty | Volby +Naděje / méně tvrdé | Často „smířlivější“ větev v adventure |
| `prisny_statnik` | Přísný státník | Průzkum jen pro „tvrdý“ důkazní rámec | Preferuje `guilty_maximum` / `guilty_standard`, politicky `system` | Méně „hospoda“, více image Moc | Sklon k Vlčkovi pokud hra nabídne system track |
| `integritni_peclivec` | Integritní pečlivý | Průzkum systematicky; neoficiální zdroj jen pokud neporuší vlastní pravidlo | Snaží se o soulad průzkum ↔ verdikt (viz `Cases.posoudPruzkumProVerdikt`) | Vyvážené; neúplatek | Adventure: „pravda“, ne skrývání |
| `vlcekuv_poslusnik` | Vlčkův poslušník | Průzkum střední — aby nebyl „naslepo“ | Preferuje politicky bezpečné / `system` dle `political_stance` ve verdiktech | Vyhýbá se konfliktu s mocí | Přijme tlak, pokud UI nabídne výhodnější Moc |
| `financni_pragmatik` | Finanční pragmatik | Průzkum pokud snižuje riziko revize / zvyšuje odměnu typu případu | Volí verdikt s lepším `finance` důsledkem (pokud je v UI vidět; jinak preferuje typové odměny morální/politický/osobní) | Večery s ekonomickým bonusem | Úplatek přijme, pokud je nabízený a persona to má povolené |
| `chudobni_obhajce` | Chudobní obhájce | Průzkum směrem k sociálním faktům (svědci, záznamy) | Preferuje `fair` k Lidu (`Cases._verdiktJeFairKChudym`) | Volby posilující Lid / Naději | Odmítání tvrdých trestů na „malého člověka“ |
| `hazarder` | Riskantní hazardér | Náhodný průzkum 30–70 % kroků (seedovaný RNG) | Náhodný legální verdikt v rámci kroku 2 | Náhodná večerní volba | Občas riskantní adventure větev |
| `byrokrat_odkladac` | Byrokrat-odkladač | Minimální průzkum | Preferuje `insufficient_*`, `postpone`, odklady | Konzervativní, vyhýbá se dramatu | „Nejistší“ adventure volby |
| `protistatni_tichac` | Proti-státní tichý | Průzkum přes neoficiální cesty, pokud UI dovolí | Preferuje `independent` politický postoj; tvrdší vůči Moci | Méně institucí, více „lidu“ | Nižší důvěra Vlčkovi pokud volby dávají signál |
| `completionist` | Completionista vláken | Max průzkum + clue | Střídá typy verdiktů podle toho, co ještě nebylo v `usedCaseIds` / archivu | Systematicky prochází všechny typy večerů | Adventure vždy větev, která nastaví víc flagů (`sets_flag`) |

**Poznámka k implementaci:** u pool případů záleží na odemčených verdiktech podle průzkumu — persony `milosrny` / `prisny_statnik` musí respektovat disabled tlačítka stejně jako hráč.

---

## 3) Jednotný formát reportu (JSON)

Každý dokončený běh (nebo každý den u dlouhého běhu) emituje jeden soubor:

`artifacts/playtest/<run_id>.json`

### 3.1 Kořenový objekt `run`

| Pole | Typ | Popis |
|------|-----|--------|
| `schema_version` | `string` | Např. `"1.0.0"` |
| `run_id` | `string` | UUID |
| `persona_id` | `string` | Jedna z tabulky výše |
| `seed` | `number \| string` | Pro reprodukci RNG (`Math.random` override / vlastní PRNG) |
| `build` | `object` | `{ "git": "…", "timestamp": "ISO8601" }` |
| `started_at` | `string` | ISO8601 |
| `ended_at` | `string` | ISO8601 |
| `aborted` | `boolean` | true při chybě UI / timeout |
| `abort_reason` | `string \| null` | |

### 3.2 `terminal_state` (snapshot z `State.get()`)

Minimalistický, ale stačí na balanc:

```json
{
  "currentDay": 15,
  "phase": "evening",
  "gameOver": true,
  "endingType": "preziti",
  "traits": { "Integrita": 62, "Odvaha": 48, "Moudrost": 71, "Vina": 55, "Nadeje": 58 },
  "factions": { "Moc": 55, "Kapital": 48, "Lid": 52 },
  "trust": { "vlcek": 1, "zavadova": 1, "karas": 2 },
  "finance": { "balance": 40, "dluh": 60, "vyplataPrijataVDnech": [7, 14] },
  "investigationActionsLeft": 3,
  "tydenni_statistiky": { "pruzkum_pouzit": 12, "pripady_celkem": 8, "pripady_s_prurzkumem": 6, "pripady_odlozeny": 1, "tezke_rozsudky": 2, "uplatek_prijat": false, "verdikty_smer": [] },
  "tydenni_nasobek_moudrosti": 1.5,
  "rozhodovaci_styl": { "fair_lid_streak": 2, "tough_stat_streak": 0, "investigation_streak": 4, "no_investigation_streak": 0 },
  "uzlove": { "vlcek_vztah": "neutral", "haas_kontakt": "odmitnut", "benes_pravda": "prijal", "osobni_cena": "zaplatil" },
  "flags_subset": { "operace_zaplacena": false, "uplatek_prijat": false }
}
```

**Doporučení:** `flags_subset` = jen whitelist klíčů pro analýzu (operace, Haas, Beneš, dopisy…), ne celý objekt `flags` (může narůst).

### 3.3 `verdicts` (zkrácený výpis z `archive.verdicts`)

Pole objektů:

```json
{
  "day": 4,
  "caseId": "pool_a1_…",
  "caseType": "moralni",
  "verdictId": "not_guilty_with_comment",
  "verdictText": "…",
  "procesniKvalita": "stredni",
  "normativniSmer": "socialni",
  "hiddenVerdictBoost": false,
  "pouzit_pruzkum": true,
  "soulad_pruzkum_verdikt": true
}
```

Poznámka: `pouzit_pruzkum` / `soulad` lze dopočítat z `revealedInfo` + `verdictId` stejně jako v `Cases.posoudPruzkumProVerdikt` — pro report je lepší **vycompute při zápisu**, ať nemusíš tahat celý spis.

### 3.4 `investigation_summary`

```json
{
  "celkem_odhalenych_informaci": 34,
  "podle_pripadu": { "pool_a1_x": 5, "pool_a1_y": 3 },
  "neoficialnich_kroku": 6,
  "clue_potvrzeni_pocet": 2,
  "inkoust_prumer_na_konec_dne": null
}
```

Pole `inkoust_prumer_na_konec_dne` vyplň jen pokud loguješ **denní snapshoty** (viz sekce 5).

### 3.5 `evening_choices` a `adventure_choices` (volitelné, ale cenné)

Krátké logy:

```json
{ "day": 6, "volba_text": "…", "effects": { "Moudrost": 2 } }
```

```json
{ "scene_id": "adventure_benes_d9", "screen_id": "s4", "label": "…", "sets_flag": "benes_pravda_prijata" }
```

---

## 4) Odvozené metriky pro analýzu (CSV / notebook)

Po batchi běhů exportuj agregát (jeden řádek = jeden `run_id`):

| Sloupec | Význam |
|---------|--------|
| `persona_id` | |
| `endingType` | |
| `dnu_do_konce` | `currentDay` v době `gameOver` nebo 19 u dohrání |
| `finance_konec` | `finance.balance` |
| `dluh_konec` | `finance.dluh` |
| `bankrot_flag` | `balance < 0` nebo `flags.bankrot_varovani_zobrazeno` |
| `prumer_integrita` | jen pokud máš denní série |
| `pomer_not_guilty` | z `verdicts` |
| `pomer_insufficient` | |
| `pruzkum_na_spis` | `celkem_odhalenych_informaci / pocet_spisu` |
| `uplatek` | bool z flags nebo archivu |
| `operace_stav` | z `flags` + `uzlove.osobni_cena` |

**„Letmý skóre“ běhu (0–100)** pro první řadu ladění — čistě heuristika, upravitelná:

- `S_finance = clamp(50 + balance_konec/5 - dluh_konec/2, 0, 100)`
- `S_tlak = 100 - (Moc - Lid)` po normalizaci 0–100
- `S_prace = min(100, pruzkum_pouzit * 3)` — penalizuje „moc snadno bez práce“ podle designu

Toto **není** herní skóre pro hráče, jen interní index pro řazení outlierů v tabulce.

---

## 5) Denní snapshoty (doporučené rozšíření enginu)

Pro jemné ladění inkoustu a platů přidej volitelně do stavu např. `playtest_daily: [{ day, balance, dluh, investigationActionsLeft, traits… }]`.

Bez toho pořád uvidíš **jen terminál**, což na začátek stačí.

---

## 6) Minimální checklist před prvním batchi

- [ ] Hra běží přes HTTP, uložení do `localStorage` funguje (`State.uloz()`).
- [ ] Bot umí: nová hra, klik složky, projít modál případu, zavřít fragment, večerní volbu.
- [ ] Seedovaný RNG (`Math.random` hook) pro reprodukci `hazarder`.
- [ ] Export JSON po `gameOver` nebo po dni 19.

---

## 7) Co záměrně neřešíme v tomto dokumentu

- Přesné číselné cíle balancu (mění se s obsahem poolu a dny v `days.json`).
- Text encyklopedie — až po stabilizaci mechanik a čísel.

Pravidla ekonomiky a traitů zůstávají v **`.cursor/rules/economy.mdc`** a **`traits-factions.mdc`**; tento dokument jen říká, **co měřit** a **jak reportovat**.

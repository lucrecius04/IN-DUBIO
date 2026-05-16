# Jízdní řád balancingu — kde a jak měnit čísla

Tento dokument říká **kde v kódu leží každá klíčová konstanta** a v jakém pořadí ji měnit.  
Analýza os a výchozích čísel: [`Analyza-os-hrani.md`](./Analyza-os-hrani.md)  
Persony a formát reportů: [`AI-persony-a-reporty.md`](./AI-persony-a-reporty.md)

---

## 1. Mapa konstant — jediný přehled

### Vrstva 1: Ekonomické konstanty (2 soubory, 5 čísel)

| Konstanta | Soubor | Řádek | Aktuální hodnota | Co řídí |
|-----------|--------|------:|-----------------|---------|
| `DENNI_VYDAJE_KC` | `js/finance.js` | 10 | `55` | Denní pevný výdaj (odečte se každý den přechodu) |
| `VYPLATA_KC` | `js/finance.js` | 12 | `80` | Týdenní výplata (neděle, dny 7 a 14) |
| `VYPLATA_DNY` | `js/finance.js` | 14 | `[7, 14]` | Ve které dny chodí výplata |
| `_INVESTIGATION_ACTIONS_BASE_DEN_S_PRIPADY` | `js/engine.js` | 20 | `15` ⚠️ | Kapky inkoustu/den — **ostré = 3**, teď 15 jen pro debug |

> **Poznámka k inkoustu:** konstanta v `engine.js` přepisuje `investigationActionsLeft` každý pracovní den se spisy. Samostatně, `state.js` řádek 1086 (funkce `resetDen`) ji nastaví na `10` — to je fallback při přechodu dne přes `State.dalsiDen()`. **Oba řádky musí být změněny najednou**, jinak hráč dostane různé hodnoty v různých průchodech. Viz §3.

---

### Vrstva 2: Typové příplatky za druh případu (v `cases.js`)

Každý uzavřený nerutinní případ dá navíc finance a +1 inkoust. Leží v `vypoctiTypoveDoplnky`:

| Typ případu | Finance bonus | Soubor | Řádek |
|-------------|-------------:|--------|------:|
| Morální | `+25 Kčs` | `js/cases.js` | 604 |
| Politický | `+35 Kčs` | `js/cases.js` | 622 |
| Osobní | `+30 Kčs` | `js/cases.js` | 645 |
| Rutinní | `+0 Kčs` | (bez příplatku) | — |
| Bonus inkoust (morální/pol./osob.) | `+1 kapka` | `js/cases.js` | 708–709 |

Tyto hodnoty jsou **psané přímo v kódu** jako číselné literály — pro balancing je vhodné je vyčlenit do pojmenovaných konstant (viz §4).

---

### Vrstva 3: Meta-vrstva rozsudku (v `cases.js`)

Nad JSON efekty verdiktů běží dvě meta-vyhodnocení.

#### 3a. Procesní kvalita — `_metaDoplnkyZaKvalituANormu` (řádek 1649)

| Procesní kvalita | Moudrost | Integrita | Vina | Narativ |
|-----------------|:--------:|:---------:|:----:|---------|
| `vysoka` (2+ akce, soulad) | +2 | +1 | −1 | „Postup byl procesně pečlivý." |
| `stredni` (1 akce) | +1 | 0 | 0 | „Postup byl procesně přijatelný." |
| `nizka` (0 akcí) | −1 | 0 | +1 | „Procesní opora rozsudku byla slabá." |

#### 3b. Normativní směr rozsudku — `_metaDoplnkyZaKvalituANormu` (řádek 1667)

| Normativní směr | Moc | Lid | Kapital | Integrita |
|-----------------|:---:|:---:|:-------:|:---------:|
| `legalistni` (systém) | +2 | −2 | 0 | 0 |
| `socialni` (lid) | −1 | +2 | −1 | 0 |
| `vyvazeny` | 0 | 0 | 0 | +1 |

#### 3c. Skrytý verdikt — koeficient (řádek 491)

```
const _SKRYTY_VERDIKT_KOEF = 1.25;
```

Verdikty odemčené průzkumem/pátráním mají všechny efekty (traits, factions, trust, finance) násobeny `1.25`. Tato konstanta platí globálně pro **všechny** skryté verdikty.

---

### Vrstva 4: Dirty path (neoficiální zdroj)

Výchozí penalizace v `_defaultDirtyFinanceDelta` (`js/cases.js`, řádek 712–714):

```javascript
// cost = počet kapek, které by slot normálně stál (1 nebo 2)
cost >= 2  →  finance −20 Kčs
cost == 1  →  finance −12 Kčs
```

Plus vždy (pokud není override v JSON): `Integrita −2`, `Vina +1`.

Pokud má konkrétní slot v JSON `dirty_unlock: { finance: N, traits: {...} }`, přepíše výchozí hodnoty. Platné pro 81 slotů z 117 (81 má custom override).

---

### Vrstva 5: Base efekty v JSON (zdroj pravdy pro verdikty)

| Soubor | Co obsahuje | Jak editovat |
|--------|-------------|--------------|
| `data/pool_cases_akt1.json` | Efekty všech verdiktů pro pool případy | Přímo v JSONu, key `effects` u každé sentence/approach/option |
| `data/days.json` | Efekty večerních voleb a dopisů | Key `effects` u každé `evening_choice` / adventure scene |
| `data/cases-akt1.json` … `cases-akt3.json` | Legacy scénářové případy | Stejná struktura, ale `_fromPool: false` |

Průměrné base efekty z celého poolu jsou v [`Analyza-os-hrani.md §1`](./Analyza-os-hrani.md).

---

## 2. Pořadí balancovacích kroků

### Krok 0 — Připravit prostředí (jednorázově)

- [ ] Nastavit `_INVESTIGATION_ACTIONS_BASE_DEN_S_PRIPADY = 3` v `js/engine.js` řádek 20
- [ ] Nastavit `investigationActionsLeft = 3` v `js/state.js` řádek 1086 (funkce `resetDen`)
- [ ] Spustit hru přes HTTP (`npx serve .`), ověřit že hra běží
- [ ] Projít jeden případ ručně — zkontrolovat, že 3 kapky jsou při 2 spisech opravdu těsné

Teprve po tomto kroku mají čísla smysl — s 15 kapkami je vše dostupné a nic nebolí.

---

### Krok 1 — Finanční osa (priorita: první)

**Proč první:** Finance jsou nejviditelněji měřitelná veličina. Pokud hráč skončí s Kčs < 0 nebo > 300, je to okamžitý signál.

**Průchod A — Worst case** (empatický + čistý, bez Haase):
1. Hraj jako `milosrny` / `chudobni_obhajce` persona (viz `AI-persony-a-reporty.md`)
2. Nikdy nepřijímej `vzit_obalku` (Haas)
3. Zaznamenej balance po D3, D7, D11, D16 do `Balancing.csv` nový sloupec `skutecny_empaticky`
4. Srovnej s checkpointy ze sloupce `Kumulativ_stred`

**Průchod B — Best case** (tvrdý + dirty):
1. Hraj jako `prisny_statnik` persona
2. Průzkum minimální, dirty path povolená
3. Zaznamenej balance stejné checkpointy do sloupce `skutecny_tvrdy`

**Cílový spread:** `skutecny_tvrdy − skutecny_empaticky` by měl být 100–200 Kčs na D7.  
Pokud menší: buď zvýšit penalizaci empatického (snížit `not_guilty` finance ~8→5) nebo zvýšit odměnu tvrdého (zvýšit `maximum` finance ~15→18).  
Pokud větší: empatický hráč bude bankrotovat — snížit `DENNI_VYDAJE_KC` nebo zvýšit `not_guilty` finance.

---

### Krok 2 — Inkoust (přímá závislost na Kroku 1)

Po nastavení finance ověřit, zda dostupnost průzkumu nekazí finanční rovnováhu.

**Co měřit:**
- `pruzkum_na_spis` — průměr odhaleních za spis (z `investigation_summary`)
- Při 3 kapkách a 2 spisech: max 1,5 odhalení/spis (3 kapky / 2 spisy × 1 akce)
- Alternativní verdikt (potřeba 2+ akce) = dostupný jen pro **jeden spis** ze dvou

**Alarmy:**
- `archivar` má `pruzkum_na_spis > 2,0` → inkoust stále příliš vysoký
- `rychlosoudce` má `pruzkum_na_spis > 0,3` → leak inkoustu z jiného zdroje

**Kde měnit:**
- Baseline: `_INVESTIGATION_ACTIONS_BASE_DEN_S_PRIPADY` v `engine.js` řádek 20
- Bonus z náročného spisu: `_bonusInkoustZaNarocnySpis` v `cases.js` řádek 704 (+1 za morální/pol./osob.)
- Bonus z alternativního verdiktu: v JSON `effects.flags[].key = "bonus_inkoust_rano"` (79 % alt. větví ho má)
- Strop kapek: v `cases.mdc` uveden jako max 5/den, ale není implementován jako tvrdý clamp — doplnit pokud přetéká

---

### Krok 3 — Rysy (po stabilizaci financí a inkoustu)

**Osy pro ověření:**

| Rys | Kdo ho pohybuje | Kam by měl směřovat |
|-----|----------------|---------------------|
| Integrita | Verdikty (hlavně `not_guilty_comment` +4, `alternative` +4,4), dirty path (−2/slot) | Empatický: 80–90 na konci; tvrdý-dirty: 30–40 |
| Vina | `guilty_maximum` (+5,6/rozsudek), meta-vrstva (naslepo +1) | Tvrdý: 80+ na D11 (záměrná krize); empatický: 30–40 |
| Odvaha | `not_guilty_comment` (+3,7/rozsudek), meta-vrstva | Empatický: 70–80 (odemyká konfrontaci); tvrdý: 40–50 |
| Naděje | `guilty_maximum` (−3,7/rozsudek), večerní volby | Tvrdý: 30–40 (temnější textová atmosféra); empatický: 65–75 |
| Moudrost | Alibista (`insufficient_close` +2,3/rozsudek), vyšší procesní kvalita | Alibista: 70–80; tvrdý-naslepo: 40–50 |

**Kde měnit:**
- Base hodnoty verdiktů: `data/pool_cases_akt1.json` (`effects.integrita`, `effects.vina` atd.)
- Meta-vrstva: `_metaDoplnkyZaKvalituANormu` v `cases.js` řádek 1649
- Typové doplňky: `vypoctiTypoveDoplnky` v `cases.js` řádek 565
- Výchozí hodnoty: `VYCHOZI_STAV.traits` v `js/state.js` řádek ~270

---

### Krok 4 — Frakce (po stabilizaci rysů)

Frakce se pohybují hlavně přes:
- Base verdikty (`moc`, `lid`, `kapital` v JSON effects)
- Meta-vrstva normativního směru (+2/−2 podle `legalistni`/`socialni`)
- Večerní volby v `days.json`
- Speciální události (Haas = `Kapital+++`, Závadová = `Lid+`)

**Cílový stav na konci kampany:**

| Archetyp | Moc | Lid | Kapital |
|----------|:---:|:---:|:-------:|
| Tvrdý státník | 70–80 | 25–35 | 50–60 |
| Empatický + nezávislý | 25–35 | 70–80 | 40–50 |
| Alibista (přežití) | 45–55 | 45–55 | 45–55 |

Pokud `Moc ≥ 80` (u tvrdého), zmizí odvážné rozsudky — to je záměrné, ale musí se stát až ke konci (D14+), ne D8.

---

### Krok 5 — Exploity a hraniční scénáře

Po ověření základních os otestovat specifické exploity (viz `Analyza-os-hrani.md §6`):

| Exploit | Test | Oprava |
|---------|------|--------|
| `insufficient_close` spam | `byrokrat_odkladac` 15 dní — finance > 0? Vina < 50? | Přidat Vina +2 nebo snížit finance na +3 |
| `insufficient_reinvestigate` loop | Vrátit 3+ spisy k došetření — vrátí se? V jakém stavu? | Definovat chování vráceného spisu |
| Alternativa over-reward | `archivar` — Integrita > 85 na D7? | Snížit Integrita bonus alternativy nebo zvýšit podmínky |
| Empatický bankrot | `milosrny` bez Haase — balance D7 < 0? | Snížit `DENNI_VYDAJE_KC` nebo zvýšit `not_guilty` finance |

---

## 3. Konkrétní doporučení: sjednocení inkoustové konstanty

Aktuálně jsou dvě místa, kde se nastavuje výchozí inkoust, a nesouhlasí:

| Místo | Soubor | Řádek | Hodnota |
|-------|--------|------:|---------|
| Pracovní den se spisy | `js/engine.js` | 20 | `15` (testovací) |
| Fallback přechodu dne | `js/state.js` | 1086 | `10` |
| Výchozí stav (`VYCHOZI_STAV`) | `js/state.js` | 297 | `3` |

Před ostrým balancingem sjednotit na `3` na všech třech místech nebo vyčlenit do sdílené konstanty.

**Doporučení:** vyčlenit do `js/finance.js` nebo do bloku konstant na začátku `js/engine.js`:

```javascript
// v engine.js nebo finance.js — jedno místo
const INKOUST_BASELINE_DEN = 3;  // ostré; 15 jen pro debug průchozí testy
const INKOUST_MAX_DEN = 5;        // tvrdý strop (bonusy nemůžou přesáhnout)
```

A nahradit číselné literály v `engine.js:20`, `state.js:1086`, `state.js:297`.

---

## 4. Doporučení: pojmenované konstanty pro typové příplatky

Aktuálně jsou finance za druh případu jako číselné literály v `cases.js`. Pro balancing doporučeno vyčlenit:

```javascript
// js/cases.js — přidat blok konstant na začátek souboru
const TYPOVY_PRIPLATEK = {
  moralni:   25,  // Kčs za uzavření morálního případu
  politicky: 35,  // Kčs za uzavření politického případu
  osobni:    30,  // Kčs za uzavření osobního případu
  rutinni:    0,  // bez příplatku
};
```

Nahradit literály `25`, `35`, `30` odkazem `TYPOVY_PRIPLATEK.moralni` atd. na řádcích 604, 622, 645.  
Pak stačí změnit číslo **jednou** a projeví se všude.

---

## 5. Jednoduchý deník balancovacích změn

Před každou změnou do `Balancing.csv` přidat řádek nebo zapsat sem:

```
DATUM | KONSTANTA | STARÁ HODNOTA | NOVÁ HODNOTA | DŮVOD | VÝSLEDEK (po testu)
2026-05-17 | _INVESTIGATION_ACTIONS_BASE... | 15 | 3 | ostré | TBD
```

Bez deníku není možné odhalovaní regresí — „fungovalo to před dvěma týdny" nestačí.

---

## 6. Co záměrně neřeší tento dokument

- **Obsah verdiktů** (texty, narativy) — ty jsou v `data/pool_cases_akt1.json` a patří autorovi
- **Přesné cílové hodnoty** pro všechny checkpointy — ty se ladí iterativně z testů
- **Headless runner** — viz `AI-persony-a-reporty.md §0`; nejdřív ruční průchody, pak automatizace

---

*Navazující dokumenty:*  
- [`Analyza-os-hrani.md`](./Analyza-os-hrani.md) — datová analýza strategií  
- [`AI-persony-a-reporty.md`](./AI-persony-a-reporty.md) — persony a formát reportů  
- [`../../.cursor/rules/economy.mdc`](../../.cursor/rules/economy.mdc) — kanonická pravidla ekonomiky  
- [`../../Balancing.csv`](../../docs/scenar/Balancing.csv) — denní makro-checkpointy

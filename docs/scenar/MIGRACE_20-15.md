# MIGRACE IN DUBIO: 20 dní → 15 dní

## Účel tohoto dokumentu

Toto je kompletní zadání pro migraci hry IN DUBIO z 20denní kampaně na **15denní kampaň** (3 týdny). Obsahuje všechny designové změny, které je třeba promítnout do kódu, dat a dokumentace. Při implementaci dodržuj hierarchii: tento dokument > stávající `.cursor/rules/` > stávající `docs/`.

---

## PŘEHLED ZMĚN

### Rozsah kampaně
- **Bylo:** 20 pracovních dní, 4 týdny (So+Ne cykly: 3×)
- **Nyní:** 15 pracovních dní, 3 týdny (So+Ne cykly: 2×)
- Hard stop: `currentDay > 15` → `Engine.spustKonec('preziti')`

### Vlákna postav — max 3 beaty
- Každé vlákno (Božena, Pospíšil, Hranice, Marková) má **max 3 příběhové případy**
- Vlček, Martin, Haas mají max 3 klíčové dopisy/události

### Variabilní konce — hra může skončit od D11
- 8 konců zůstává, ale každý má přiřazený **nejbližší den**, kdy se může spustit
- Engine kontroluje podmínky konců **po každém rozsudku od D11**

### Třetí spis — od D8, light režim
- Od D8 (podmíněně) může být na stole třetí případ
- Třetí případ = existující pool případ v **light režimu** (zkrácené zobrazení)
- Separátní pool `pool_cases_light_akt1.json` **není potřeba**

### Pátrání — pokusy místo timeru
- Timed hunt (`timed_hunt`) se odstraňuje jako výchozí mechanika
- Nahrazeno systémem **omezených pokusů** (5 pokusů na případ)
- Volitelně zapnutelné v nastavení hry

### Revize spisů — zcela odstraněny
- `review_card` v datech případů se ignoruje
- Žádné plánování revizí, žádné revizní karty

### Countdown matka
- **Bylo:** dopis doktora D6, deadline D16 (10 dní)
- **Nyní (kanon dat):** dopis doktora **pracovní D4** (`data/days.json` + `letters.json` `doktor_d4`) — **MUDr. Síber, Nemocnice Podolí, operace 17. března 1931, 400 Kč při příjmu**; ranní text **`fragment_d4_rano`**. Countdown ve hře: `js/finance.js` → **`OPERACE_DEADLINE_DEN = 16`** (`currentDay` = den operace v kalendáři kampaně). Tabulky: `Mapa_15dni.csv`, `Dopisy_15dni.csv`, `story.mdc`.
- **Vlček — doplněná eskalace:** `vlcek_d13` (fond / matka), `vlcek_d14_letter` (poslední dopis), oba v `letters.json` + doručení v `days.json`; u `vlcek_d11` / `vlcek_d14_letter` je **`condition: null`** (dopisy se neblokují přes `trust.vlcek`).

---

## 1. ZMĚNY V ENGINE (`js/engine.js`)

### 1.1 Hard stop
```
// BYLO:
if (currentDay > 30) Engine.spustKonec('preziti');

// NYNÍ:
if (currentDay > 15) Engine.spustKonec('preziti');
```
Poznámka: číslo 30 v originálu odpovídalo kalendářním dnům (20 pracovních + víkendy). Nově: 15 pracovních dní + 2 víkendy = kalendářně ~21 dní. Uprav logiku podle toho, zda `currentDay` počítá pracovní nebo kalendářní dny.

### 1.2 Variabilní konce — kontrola po rozsudku od D11
V `Cases.zpracujRozsudek` (nebo v `Engine.zkontrolujKonecDne`) přidat kontrolu konců **v pořadí priority**, pokud `currentDay >= 11`:

```javascript
// Pořadí kontroly (priorita od nejvyšší):
const KONCE_VARIABILNI = [
  { type: 'korupce',  minDay: 11, check: () => /* INT<=20 && vlcek_splnil && haas_prijal */ },
  { type: 'smireni',  minDay: 12, check: () => /* INT>=60 && VIN<=20 && benes_prijal */ },
  { type: 'utek',     minDay: 13, check: () => /* karas>=1 && finance>300 && karas_poslechl */ },
  { type: 'atentat',  minDay: 13, check: () => /* INT>=60 && ODV>=80 && MOC<=20 && vše odmítl */ },
  { type: 'rad',      minDay: 14, check: () => /* vlcek_odmitl && zavadova==3 && rodny_list_pouzil */ },
  { type: 'anna',     minDay: 14, check: () => /* VIN<=20 && finance<100 && pruzkum>=80 && vše odmítl */ },
  { type: 'hrdina',   minDay: 15, check: () => /* INT>=80 && ODV>=80 */ },
  { type: 'preziti',  minDay: 15, check: () => true }, // výchozí fallback
];

// Spustit po vyřešení všech případů dne:
if (State.currentDay >= 11) {
  for (const konec of KONCE_VARIABILNI) {
    if (State.currentDay >= konec.minDay && konec.check()) {
      Engine.spustKonec(konec.type);
      return;
    }
  }
}
```

Konec se spouští **na konci dne** (po vyřešení všech případů), ne uprostřed. Hráč vždy dohraje oba (nebo tři) spisy, pak přijde večerní scéna, a místo tlačítka „Další den" se spustí epilog.

### 1.3 Třetí spis — light režim od D8
V `Engine.spustDen()` a `Cases.nastavPripadyProDen`:

```javascript
// Podmínky pro třetí spis (od D8):
const tretiSpisPovoleny = (
  State.currentDay >= 8 &&
  State.traits.integrita >= 50 &&
  State.traits.moudrost >= 45 &&
  State.flags.revize_vracena !== true // žádná vrácená revize (legacy)
);

// Pokud povoleno, vybrat pool případ a označit light:
if (tretiSpisPovoleny) {
  const lightCase = PoolManager.vyberPoolPripad({ lightMode: true });
  // lightCase.lightMode = true → UI zobrazí zkráceně
}
```

**Light režim zobrazení** (v `js/ui.js`):
- Zobrazit jen: hlavička + description + 1 svědectví (první) + rozsudek
- **Žádné** pátrání (two-click skryto)
- **Žádný** průzkum (kapky se nespotřebovávají)
- **Žádná** informovanost (lišta skryta)
- Rozsudek: jen Vinen (přiměřený) / Nevinen (formální) — žádné alternativy
- Vizuálně: tenčí složka na stole, jiná barva (šedá/hnědá)

### 1.4 Odstranění revizí
- V `Cases.zpracujRozsudek`: **neplánovat** revizi (`State.naplánujRevizi` — zakomentovat/odstranit)
- V `Engine.spustDen()`: **přeskočit** `State.vyzvedniRevizeProDen` (zakomentovat/odstranit)
- V UI: **nerendrovat** revizní karty/obálky na stole
- Data: `review_card` v JSON případů se ignoruje (nemazat, jen nečíst)

### 1.5 Nedělní a sobotní zjednodušení

**Sobotní bonusy — zredukovat na 2:**
- Pečlivý (75%+ průzkum): Moudrost +5, Finance +15, +1 kapka příští týden
- Nezávislý (bez úplatku): Integrita +5, LID +8

Odstranit: Odvážný, Konzistentní.

**Nedělní volby — zredukovat na 3:**
- Matka → Naděje +5, Vina -3, Finance -5, +1 kapka pondělí
- Procházka → Naděje +3, Moudrost +2, +1 kapka pondělí
- Spisy → Moudrost +3, Naděje -2, extra detail

Odstranit: Kostel, Nepsat synovi (jako samostatná volba — integrovat do fragmentu).

### 1.6 Výplaty
Hráč dostává výplatu **2×** za 15 dní (místo 3×):
- 1. neděle (po D5): +80 Kčs
- 2. neděle (po D10): +80 Kčs
Uprav logiku v `js/finance.js` nebo `engine.js` podle toho, jak je výplata vázána na den.

---

## 2. ZMĚNY V PÁTRÁNÍ (`js/cases.js`, `js/ui.js`)

### 2.1 Nový systém: omezené pokusy

**Odstranit/zakomentovat:**
- Vše kolem `timed_hunt`: countdown, `setTimeout`, `auto_confirm_best_on_timeout`, `speed_upgrade_sec`, `timeout_downgrade`
- Timer UI v hlavičce případu

**Přidat:**

```javascript
// Globální konfigurace (nebo v State/Settings):
const PATRANI_CONFIG = {
  max_attempts: 5,           // 3–5, laditelné
  moudrost_bonus: 1,         // +1 pokus při Moudrost ★★★★★ (81+)
  close_on_any_pair: false,  // true = zavři po jakémkoli páru; false = zavři jen po strong
};

// Stav pátrání pro jeden případ:
// State.cases[caseId].patrani = {
//   attempts_left: 5 (nebo 6),
//   found_pairs: [],        // nalezené páry (weak/medium/strong)
//   closed: false,
//   best_strength: null,
// }
```

### 2.2 Flow pátrání

1. Hráč otevře spis → klikatelné stopy (`span.clue`) jsou aktivní po stisku Zahájit pátrání (přepínač režimu, bez timeru)
2. Hráč klikne na stopu A → žluté zvýraznění
3. Hráč klikne na stopu B → engine hledá pár:
   - **Žádný pár:** červený flash, `attempts_left--`, reset výběru
   - **Nalezen pár:**
     - Engine vybere **nejsilnější** pár, do kterého obě stopy patří
     - Zelený flash, odměna podle síly, pár uložen do `found_pairs`
     - Pokud `close_on_any_pair === true` NEBO síla === `strong`: pátrání **uzavřeno**
     - Pokud `close_on_any_pair === false` A síla < `strong`: odměna aplikována, hráč **pokračuje** se zbylými pokusy
4. `attempts_left === 0` a žádný pár nenalezen → pátrání uzavřeno neúspěšně
5. Uzavřené pátrání: stopy zašednou, žádné další klikání

### 2.3 Sdílené stopy ve více párech

Jedna stopa (`data-clue-id`) může být součástí **více párů** s různou silou. To je záměrný designový nástroj, ne chyba. Příklad:

```json
"pairs": [
  { "pair_id": "p1", "a_id": "young_man", "b_id": "14_days_vs_2", "strength": "strong" },
  { "pair_id": "p2", "a_id": "young_man", "b_id": "masek_no_visits", "strength": "weak" }
]
```

Při kliknutí na `young_man` + `masek_no_visits` → engine najde pár `p2` (weak).
Při kliknutí na `young_man` + `14_days_vs_2` → engine najde pár `p1` (strong).
Pokud by obě stopy patřily do dvou párů zároveň (teoreticky), engine vybere **nejsilnější**.

### 2.4 UI pátrání

```
Pátrání: ●●●●● (5 pokusů)

[Po neúspěšném pokusu]
"Tohle nesedí."
Pátrání: ●●●●○

[Po úspěšném slabém páru, close_on_any_pair=false]
"Něco jsi našel... ale je to dost?"
Pátrání: ●●●○○ (pokračuje)

[Po úspěšném silném páru]
"Rozpor potvrzen."
Pátrání uzavřeno. ✓

[Po vyčerpání pokusů]
"Pátrání uzavřeno. Rozhodni na základě toho, co víš."
Pátrání uzavřeno. ✗
```

### 2.5 Volitelný timed hunt v nastavení
V nastavení hry (`Settings` / menu) přidat toggle:
- **Pátrání s časovým limitem** (výchozí: false)
- Pokud true: aktivovat stávající timed_hunt logiku MÍSTO systému pokusů (ne obojí)
- Label v UI: „Pátrání na čas (pro zkušené hráče)"

---

## 3. ZMĚNY V DATECH

### 3.1 `data/days.json`
Přepsat na 15 pracovních dní + 2 víkendy. Struktura dnů podle `Mapa_15dni.csv` (viz přiložený soubor). Klíčové změny:
- Dopis doktora: den 4 (ne 6)
- Haasova vizitka: den 6 (ne 10)
- Vlček VĚTVENÍ 1: den 7 (ne 8)
- Vlček nátlak: den 8 (ne 11)
- Beneš přijde: den 9 (ne 13)
- Zvraty (rodný list): den 10 (ne 15)
- Haas osobně: den 11 (ne 16)
- Zavadová podvrh: den 12 (ne 17)
- Karas varuje: neděle 2. týdne (ne den 18)
- Velezrada: den 15 (ne 20)
- Vlček **d13** / **d14_letter**: dopisy nad rámec původní migrace — viz `data/letters.json` a `data/days.json` (den 16 / den 18 vedle Martina)

### 3.2 Pool případy — přiřazení k dnům
Místo čistě náhodného výběru **natvrdo přiřadit** pool případy k dnům podle tematického echa:

| Den | Pool slot | Doporučený případ | Proč |
|-----|-----------|-------------------|------|
| D2 | Oba sloty | `pool_a1_lekarna` + `pool_a1_weiss` | Haas v záznamech + první signál z Německa |
| D5 | Slot 1 (morální) | `pool_a1_nemocenska` nebo `pool_a1_stavba` | Systém trestá chudé — echo countdownu |
| D5 | Slot 2 (rutinní) | `pool_a1_vytrznost` nebo `pool_a1_trafika` | Kontrast |
| D6 | Slot 1 (morální) | `pool_a1_stara_rana` nebo `pool_a1_exekuce` | Zákon vs. pravda — echo Haasovy vizitky |
| D7 | Slot 2 (pol) | `pool_a1_vyveseni` | Zákon na ochranu republiky — echo Horáčkové |
| D9 | Slot 2 (morální) | `pool_a1_spravce` nebo `pool_a1_bytova_komise` | Systém vs. lidskost — echo Beneše |
| D10+ | Pool light | Zbylé rutinní | Kratší, jako třetí spis |

Poznámka: `available_days` v JSON případů přepočítat na nový rozsah (max D15 místo D20).

### 3.3 Harmonogram vláken (tyčové případy)

**Aktuální runtime** (`data/days.json` + [`Pripady_15dni.csv`](./Pripady_15dni.csv)):

```
Božena:   D1 (slot 1), D4 (slot 1), D8 (slot 1)     — 3 beaty
Osobní trilogie: D10 slot 2 tyc_zvraty_d10, D11 slot 2 tyc_haas_d11, D12 slot 2 tyc_zavadova_d12
Marková:  D3 (slot 2), D14 (slot 1) tyc_markova_3   — beaty 1 a 3 v kampani; beat 2 (tyc_markova_2) zatím není ve days.json
Pospíšil: D3 (slot 1), D6 (slot 2)                  — beaty 1–2; beat 3 (tyc_pospisil_3) zatím není ve days.json
Hranice:  D4 (slot 2), D8 (slot 2)                  — beaty 1–2; beat 3 (tyc_hranice_3) zatím není ve days.json
```

*JSON případy `tyc_markova_2`, `tyc_pospisil_3`, `tyc_hranice_3` zůstávají v `pool_cases_akt1.json` — doplnit do kalendáře až bude rozhodnuto, kam je zařadit.*

### 3.4 `pool_cases_akt1.json` — úpravy
- Pole `available_days`: přepočítat rozsahy na 1–15 (ne 1–20)
- `review_card`: **ponechat v datech** (pro budoucí použití), engine ho ignoruje
- `timed_hunt`: ponechat v datech (pro volitelný režim), výchozí chování je systém pokusů

---

## 4. ZMĚNY V DOKUMENTACI

### 4.1 Soubory k **nahrazení** (novými verzemi z této migrace):
- `docs/scenar/Mapa_15dni.csv` → `docs/scenar/Mapa_15dni.csv`
- `docs/scenar/Dopisy_15dni.csv` → nová verze (15 dní)
- `docs/scenar/Konce.csv` → nová verze (sloupec `Nejdrive` s dnem)
- `docs/scenar/Vlakna_15dni.csv` → nová verze (max 3 beaty)

### 4.2 Soubory k **aktualizaci** (přepsat relevantní sekce):

**`docs/scenar/InDubio_20dni_Mapa-scenar.md`** → přejmenovat na `InDubio_15dni_Mapa-scenar.md`:
- §1 Týdenní skelet: 3 týdny místo 4
- §3 Matka: fáze Zavedení (T1), Napětí (T2), Rozhodnutí (T3 — kratší)
- §4 Harmonogram soudců: nové dny (viz §3.3 výše)
- §7 Modifikátory: pár zvláštních dní, ne víc
- §8 Revize: **celou sekci nahradit větou** „Revize spisů nejsou v 15denní verzi implementovány."
- Všude: `Mapa_15dni.csv` → `Mapa_15dni.csv`

**`docs/scenar/Milniky-dynamika-akt1.md`**:
- §1 Tabulka milníků: přečíslovat dny (viz Mapa_15dni.csv)
- §4 Revize: **celou sekci nahradit** „Revize nejsou v 15denní verzi."
- §7 Třetí spis: „od D8" místo „od D15", light režim z existujícího poolu

**`docs/herni-smycka-a-cile.md`**:
- §2: „20 dní" → „15 dní", přečíslování fází
- §3: hard stop `> 15`, variabilní konce od D11 (nová podsekce)
- §3: smazat/zjednodušit sekci o revizích
- §5: shrnutí — „Hra končí po 15 dnech nebo dříve při splnění podmínek."

**`docs/spis-patrani-pruzkum-rozsudek.md`**:
- §2 Pátrání: přepsat na systém pokusů (5 pokusů, sdílené stopy, viz §2 tohoto dokumentu)
- §2: zmínit volitelný timed hunt v nastavení
- §7: smazat sekci o revizích, nebo nahradit „Revize nejsou v 15denní verzi."

**`.cursor/rules/cases.mdc`**:
- DENNÍ STRUKTURA: „15 DNÍ" místo „20 DNÍ"
- TŘETÍ SPIS: „od D8" místo „od D15", light režim, bez separátního pool JSON
- HARMONOGRAM VLÁKEN: nové dny (3 beaty)
- VÁHOVÁNÍ PŘÍPADŮ: přepočítat na 15 dní:
  ```
  D1-3: rutinní 100%
  D4-5: rutinní 60%, morální 40%
  D6-8: rutinní 30%, morální 35%, politický 25%, osobní 10%
  D9-15: rutinní 15%, morální 30%, politický 35%, osobní 20%
  ```
- Two-Click: přepsat na systém pokusů, smazat timed_hunt jako výchozí
- Revize: smazat celou sekci
- Sobotní bonusy: 2 místo 4
- Nedělní volby: 3 místo 5

### 4.3 Soubory k **ponechání** beze změny:
- `docs/world-reference.md` — beze změny
- `docs/scenar/ReadMeScenar.md` — jen aktualizovat odkazy na přejmenované soubory
- `data/pool_cases_akt1.json` — jen `available_days` přepočítat

### 4.4 Soubory k **odstranění** (nebo archivaci):
- `data/pool_cases_light_akt1.json` — nepotřeba, třetí spis je light režim existujícího poolu
- Reference na `pool_cases_light_akt1.json` v `DataLoader` — zakomentovat

---

## 5. SHRNUTÍ PRIORIT IMPLEMENTACE

### Fáze 1 — kostra (nutné pro hratelnost):
1. `days.json` přepsat na 15 dní s novým rozvrhem
2. Hard stop na D15
3. Smazat/zakomentovat revize
4. Třetí spis od D8 v light režimu

### Fáze 2 — pátrání (nutné pro gameplay):
5. Systém pokusů místo timed hunt
6. Sdílené stopy ve více párech
7. Toggle v nastavení pro timed hunt

### Fáze 3 — variabilní konce (nutné pro drama):
8. Kontrola konců po D11
9. Podmínky 8 konců s `minDay`
10. Epilogové texty pro každý konec

### Fáze 4 — ladění (po prvním průchodu):
11. Ekonomika/balance na 15 dní
12. Váhování pool případů
13. Sobotní/nedělní zjednodušení
14. Texty ranních fragmentů a večerních voleb

---

## 6. KONTROLNÍ OTÁZKY PRO IMPLEMENTACI

Při každé změně si ověř:
- [ ] Funguje uložení a načtení stavu (`State.nacti/uloz`) s novými poli (`patrani.attempts_left`, `found_pairs`, variabilní konce)?
- [ ] `currentDay` logika konzistentně rozlišuje pracovní/kalendářní dny?
- [ ] Pool případy mají `available_days` v rozsahu 1–15?
- [ ] Třetí spis v light režimu nespotřebovává kapky inkoustu?
- [ ] Variabilní konec se spouští až **po** vyřešení všech případů dne, ne uprostřed?
- [ ] Timed hunt toggle v nastavení skutečně přepíná mezi dvěma systémy, ne obojí najednou?

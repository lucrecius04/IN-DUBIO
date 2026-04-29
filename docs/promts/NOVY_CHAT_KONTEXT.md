# Kontext pro nový chat — projekt IN DUBIO

## Co je IN DUBIO

Textová hra v prohlížeči (HTML/CSS/JS), zasazená do Prahy roku 1931.
Hráč hraje za soudce Benedikta Vraného — každý pracovní den rozhoduje
soudní případy a zároveň čelí narůstajícímu politickému tlaku, osobním
dilematům a síti vzájemně provázaných příběhů.

Hra má 15 pracovních dní, 8 narativních konců a je vyvíjena solo
v Cursoru (JS/HTML/CSS), s Claudem jako AI partnerem pro obsah i architekturu.

---

## Technická architektura

**Stack:** Vanilla JS + HTML/CSS, žádný framework.

**Klíčové soubory:**
- `js/engine.js` — herní smyčka, průchod dnem, kontrola konců
- `js/state.js` — stav hry (flagy, rysy, finance, uzlové flagy)
- `js/ui.js` — rendering, modály, adventure scény
- `js/data-loader.js` — načítání a normalizace JSON dat
- `js/cases.js` — mechanika případů (pátrání, rozsudky)
- `data/days.json` — obsah každého dne (fragmenty, případy, volby)
- `data/letters.json` — texty dopisů (auto/desk), podmínky a efekty
- `data/pool_cases_akt1.json` — hlavní katalog případů (pool JSON; existuje i light pool a legacy)
- `docs/Pripady/` — staging JSON (do hry se musí sloučit do pool_cases_akt1.json)
- `.cursor/rules/` — kanon mechanik a příběhu (core.mdc, story.mdc, cases.mdc)

**Důležité:** Hlavní katalog případů je `data/pool_cases_akt1.json` (pool JSON).
Existuje i `pool_cases_light_akt1.json` a legacy soubory — loader preferuje pool podle ID.
Soubory v `docs/Pripady/` jsou staging — musí se sloučit do pool JSONu před nasazením.

---

## Systém případů

```json
{
  "id": "pool_a1_nazev",
  "slot": "pool",
  "case_track": "pillar",
  "case_track_label": "tycove",
  "type": "moralni",
  "available_days": [7, 8, 9],
  "weight_conditions": { "forced": true },
  "testimonies": [...],
  "clue_system": { "pairs": [...], "decoys": [...] },
  "investigation": { "interview": {}, "records": {}, "informant": {}, "confrontation": {} },
  "verdicts": { "guilty": {}, "not_guilty": {}, "insufficient_evidence": {} },
  "aftermath": {},
  "stamp_moment": {}
}
```

**Typy případů — normalizované hodnoty jsou ČESKY:**
- `rutinni`, `moralni`, `politicky`, `osobni`
- JSON soubory mohou mít anglické hodnoty (routine, moral_dilemma, political, personal)
  — cases.js je normalizuje automaticky

**Two-click pátrání:**
- Každý `data-clue-id` musí být v `pairs` nebo `decoys` — jinak nefunguje
- Žádná diakritika v identifikátorech (clue ID, pair ID, flag klíče) — vždy ASCII
- Žádné nested clue spany v textech svědectví

**Uzlové flagy** (přepočítávány denně v `State.vypoctiUzloveFlagy()`):
- `vlcek_vztah`: neutral / kompromitovan / vzdor
- `haas_kontakt`: odmitnut / otevren / zavazany
- `benes_pravda`: nezna / prijal / odmitl
- `osobni_cena`: nerozhodl / zaplatil / haasem / odmitl

Tyto čtyři flagy určují, který z 8 konců hráč dostane.

**Adventure scény** (D9 Beneš, D13 Karas):
Pole `adventure_scene` v days.json — runtime v `UI.zobrazAdventureScenu()`.

---

## Aktuální stav nasazení

**Zdroj pravdy je vždy `data/days.json` + `docs/scenar/Pripady_15dni.csv`.**
Nepřebírej stav z tohoto dokumentu — přilož oba soubory do chatu a přečti je přímo.

Orientačně: early game (D1–D7) jsou převážně pool případy s pillar tyčemi od D8;
D9 a D13 mají adventure scény, D10–D12 osobní pillar scény (zvraty/haas/zavadova),
D14 má tyc_markova_3, D15 má velezradu. Přesná ID a sloty jsou v days.json.

---

## Co ještě chybí

### Kritické:
1. **days.json obsah** — ranní fragmenty, večerní volby, noční fragmenty D1–D15
2. **Epilogy** — 8 konců × 1–2 odstavce (do story.mdc nebo separátních souborů)

### Střední priorita:
4. Balancing — ekonomika, rysy, frakce (po prvním průchodu)
5. stamp_moment texty pro pool případy
6. Echo verdiktů v ranních fragmentech (morning_conditional_lines)

---

## Klíčová narativní propojení

- **PRAGA ROADS / Knot:** Šebek (B1→B3) → Pospíšil 2 → Pospíšil 3 → Zavadová D12
- **Wolf / Haas / Anna:** Složka D10 → Haas D11 → Velezrada D15
- **Vlček oblouk:** D1 → D7 VĚTVENÍ1 → D8 nátlak → D11 hrozba
- **Sešit Marková:** D3 podezřelá → D10 záchrankyně → D14 obžalovaná
  *(časová osa vláken ověř v days.json — některá ID mohou být jen v poolu bez přiřazeného dne)*
- **Hranice oblouk:** D4 zeď → D8 německý dopis → D12 smír nebo ne

---

## Designové principy

- **Stamp moment:** pole stamp_moment s guilty/not_guilty/insufficient
- **Echo verdiktů:** morning_conditional_lines v days.json
- **Bonus inkoust:** effects.flags[{key:"bonus_inkoust_rano", value:1}]
- **Žádná diakritika v identifikátorech** — vždy ASCII
- **Žádné nested clue spany** v textech svědectví
- **Definice případů primárně v pool JSON** — docs/Pripady je staging

---

## Soubory pro nový chat

### Vždy přilož:
1. `data/days.json` — co tam je, co chybí
2. `data/letters.json` — dopisy dne, podmínky, efekty a delivery
3. `data/pool_cases_akt1.json` — runtime zdroj všech případů
4. `docs/scenar/Mapa_15dni.csv` — mapa dnů a flagů
5. `docs/scenar/FLAGS_VETVENI_KONCE.md` — flagy a 8 konců

### Pro psaní obsahu days.json:
6. `docs/scenar/Pripady_15dni.csv`
7. Vzorový hotový den z days.json jako šablona

### Pro technické změny:
8. `js/state.js`, `js/engine.js`, `js/data-loader.js`

### Pro psaní nových případů:
9. Vzorový případ z pool_cases_akt1.json (doporučeno: tyc_bozena_3)
10. `.cursor/rules/cases.mdc`

### Volitelně:
11. `docs/InDubio_StoryBible_v2_Cursor.txt`
12. `docs/pool_cases_akt1_prehled.md`

# Prompt pro autora — Knihovna → Příběh (`pribeh`)

Účel: doplnit do `data/knihovna.json` u `pribeh` **(1) úvodní text** (`perex` + `body`) a **(2)** milníkové položky v `rozhodnuti` (`titulek` + `text`).  
Zdroje kanonu: `docs/InDubio_StoryBible_v2_Cursor.txt` (plná bible), `.cursor/rules/story.mdc`, `docs/scenar/Mapa_15dni.csv`, `docs/scenar/FLAGS_VETVENI_KONCE.md`.

---

## Úkol pro AI autora — dva výstupy

1. **Úvod** — přepsat nebo nahradit `pribeh.perex` a `pribeh.body` (viz sekce níže).  
2. **Milníky** — pole `pribeh.rozhodnuti` podle bodů A–K (viz další sekce).

**Společná pravidla:** Tón noir, středoevropský rámec 30. let, úřední zkratka; **nehodnotit hráče**. Texty v Knihovně jsou **rámec**, ne přepis fragmentů, snů ani dopisů ze hry (ty patří do záložky ZÁZNAMY). U milníků: **bez spoilerů** na konkrétní verdikt v případu; u úvodu: **bez konkrétních jmen kauz z poolu** a bez odhalení z D10+.

**Formát výstupu:**  
- Úvod: dva řetězce JSON — `"perex": "..."`, `"body": "..."` (v `body` používat odstavce jako `\n\n`).  
- Milníky: pole `{ "titulek": "...", "text": "..." }` v pořadí A → K, nebo Markdown po sekcích.

---

## Úvodní text na začátek hry (`pribeh.perex`, `pribeh.body`)

Hráč si to přečte v Zápisníku → Knihovna → podzáložka **Příběh** kdykoliv; část hráčů to uvidí **před** prvním dnem. Musí tedy **stát samo o sobě** a sladit se s kanonem (postava Benedikta Vraného, role soudce, tíha minulosti, denní rytmus hry, že cílem není „vyhrát“).

### `perex` (jeden řádek pod nadpisem v UI)

- **1–2 krátké věty** (cca 20–45 slov celkem).  
- Funkce: **hák** — kdo jsi v jedné větě + v čem je napětí (soud / doba / osobní cena), **bez** jmen vedlejších postav z plot twistů.

### `body` (hlavní text pod perexem)

- **2–4 odstavce**, odstavce oddělené `\n\n`.  
- **Celkem cca 100–200 slov** (ne román).  
- Obsah má pokrýt v libovolném pořadí (ne všechno musí být v každé verzi):  
  - kdo je hráč (JUDr. Benedikt Vraný, soudce; oslovení „pane doktore“ zůstává věcí hry, v úvodu stačí naznačit);  
  - **kde a kdy** obecně (meziválečné Československo, krize, anonymizované město/stát dle bible);  
  - **co hra dělá** — dny se spisy, večerní volby, osobní tlaky; že minulost soudce na něj doléhá;  
  - **ústřední otázku** z `story.mdc` formulovat jako otázku nebo napětí, **ne** jako odpověď;  
  - jedna věta typu „cílem je dohrát příběh a nést důsledky“, ne gamifikace.  
- **Neuvádět:** konkrétní případy z poolu, Beneše/Haase/Vlčka jako spoilery odhalení, přesné datumy kauz. Obecné „dopisy, úřad, tisk“ je v pořádku.

### Kontrola vůči existujícímu JSON

V repu už jsou výchozí `perex` / `body` v `data/knihovna.json` — autor může **nahradit celé** vlastní verzí nebo **přepsat styl** při zachování faktů z bible. Nesmí rozchodit fakta s `story.mdc` (Anna vs. matka, role postav, gradace tlaku atd.).

---

## Milníky — `pribeh.rozhodnuti`

Doplň krátké bloky (každý: `titulek` + `text`). **Pravidla délky u milníků:** `text` cca **3–7 vět** na položku (max ~120 slov), `titulek` krátký (3–8 slov).

---

## Neurální body — situace → počet položek

### A — D3–D4 (Karas / spis + dopis doktora, odpočet operace)

- **Situace:** Hráč už chápe, že „domov“ a „soud“ soupeří.
- **Počet položek `rozhodnuti`:** **1**
- **Účel textu:** Zarámovat dvojí zátěž — instituce vs. tělo blízkých; bez čísel z ekonomiky.

### B — D6 (Haasova vizitka)

- **Situace:** „Průmysl“ vstoupil do kanceláře jako fakt.
- **Počet:** **1**
- **Účel:** Neviditelné provázanosti (síň a peníze ve stejném vzduchu), ne popis scény.

### C — VETVENÍ 1 (~D7, Horáčková + večerní osa s Vlčkem)

- **Situace:** Politický rámec soudu.
- **Počet:** **1**
- **Účel:** Soudce jako jméno v systému, ne anonymní stroj.

### D — D8 (Vlčkovo očekávání, Božena / Hranice, první třetí spis)

- **Situace:** Zvyšující se objem a náznak nejednoznačnosti „správně“.
- **Počet:** **1**
- **Účel:** Zátěž práce + morální šedá zóna.

### E — VETVENÍ 2 (D9 Beneš)

- **Situace:** Po adventure / volbě ohledně Benešovy pravdy.
- **Počet:** **2** (dvě tonální linie)
- **Účel:** (1) Přijetí pravdy jako zátěž poznání. (2) Odmítnutí / neproběhnutí jako setrvání v instituci. Obecně, bez citátů ze scény.

### F — D10 zvraty (`tyc_zvraty_d10`)

- **Situace:** Osobní spis, minulost, identita — téma, ne checklist faktů.
- **Počet:** **1**
- **Účel:** „Minulost není uzavřená kniha“ — bez opakování konkrétních odhalení z fragmentu.

### G — VETVENÍ 3 (D11 Haas, 300 Kč, hrozba Vlčka, operace)

- **Situace:** Krizový střed ekonomiky a integrity.
- **Počet:** **3** (tři úhly)
- **Účel:** (1) Odmítnutí peněz jako cena. (2) Přijetí jako kompromis přežití. (3) Mezistav / lhůta jako morální časovač. Bez verdiktu nad hráčem.

### H — D12 Závadová (Kruh, podvrh, tlak)

- **Situace:** Po druhém zvratu / osobní tyči Závadové.
- **Počet:** **2**
- **Účel:** (1) Nástroj systému vs. člověk. (2) Zrcadlo („kdo mohl kdysi pomoct“) obecně, ne jména ze spisu.

### I — VETVENÍ 4 (D13 Karas, osobní scéna)

- **Situace:** Vídeň, varování / zrada.
- **Počet:** **2**
- **Účel:** (1) Přátelství jako poslední pokus o ochranu. (2) Přátelství jako již proběhlá zrada — tonálně, ne soudní spis.

### J — D14 (před finále: Marková, Martin, poslední dopisy v datech)

- **Situace:** Zúžení světa před posledním tahem.
- **Počet:** **1**
- **Účel:** Rodina a město na dosah; bez spoilera výsledku případu.

### K — D15 velezrada / epilog (konec aktu 1)

- **Situace:** Uzavření oblouku.
- **Počet:** **1**
- **Účel:** Návrat k ústřední otázce z `story.mdc` („Může být jeden člověk spravedlivý v nespravedlivém světě?“) — **neodpovídat**, nejmenovat konkrétní konec z osmi.

### L — volitelné (první neděle v mapě, volba matka / procházka / spisy)

- **Počet:** **0–1** (jen pokud neduplicituje A)
- **Účel:** Neděle jako protijed vůči pracovnímu týdnu.

---

## Souhrn počtů (`rozhodnuti` — bez úvodu)

Úvod (`perex` + `body`) = **1 sada** textů výše, nepočítá se do tabulky.

| ID | Počet položek |
|----|----------------|
| A  | 1 |
| B  | 1 |
| C  | 1 |
| D  | 1 |
| E  | 2 |
| F  | 1 |
| G  | 3 |
| H  | 2 |
| I  | 2 |
| J  | 1 |
| K  | 1 |
| L  | 0–1 |

**Celkem (bez L):** 16 objektů v `rozhodnuti`.  
**S L:** 16–17.

**Zkrácení (produkce):** sloučit C+D → jedna položka (−1); sloučit H → jedna položka (−1) → **14** položek.

**Technika (hotovo v kódu):** V `data/knihovna.json` u položek `pribeh.rozhodnuti` lze použít:

- `minDay` (číslo) — položka se v Knihovně → Příběh zobrazí až od daného `currentDay`.
- `condition` — řetězec `klíč == hodnota`; uzlové klíče (`benes_pravda`, `haas_kontakt`, `osobni_cena`, `vlcek_vztah`) se čtou z `State.uzlove`, ostatní z `State.flags` (např. `flag_rodny_list_pouzit == true`, `karas_odmitl_odejit == true`).
- `exclusiveGroup` — stejný řetězec u více položek: zobrazí se jen **první** z nich, která projde `minDay` i `condition` (pořadí = pořadí v JSON).

Filtrování: `js/knihovna.js` → `vyfiltrujPribehRozhodnuti`, volá se z `ui.js` při vykreslení Příběhu.

---

## Odkazy

- `data/knihovna.json` — struktura v2, pole `pribeh.perex`, `pribeh.body`, `pribeh.rozhodnuti`
- `docs/InDubio_StoryBible_v2_Cursor.txt` — plný kanon (jména, fakta, tón)
- `docs/scenar/Mapa_15dni.csv` — dny a sloty
- `docs/scenar/FLAGS_VETVENI_KONCE.md` — VETVENÍ 1–4 a uzlové flagy
- `.cursor/rules/story.mdc` — ústřední otázka, akty D1–15, tři velké lži

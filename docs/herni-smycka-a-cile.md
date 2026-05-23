# Herní smyčka a cíle — IN DUBIO

Hráč je soudce Benedikt Vraný. Hra probíhá po **dnech** řízených `data/days.json` a stavem v `js/state.js`. Tento text shrnuje **postup hraní** a **jak může hra skončit** v kontextu aktuální implementace.

---

## 1. Start a rozhraní

1. Po načtení stránky proběhne **úvodní overlay** (kliknutím se spustí hudba a `Engine.inicializuj`).
2. Hra načte data (`DataLoader`), případně **obnoví uložený stav** (`State.nacti()`), jinak `State.reset()`.
3. Hlavní scéna je **stůl** (`Desk`): složky případů, předměty (noviny, dopisy, peněženka, notýsek…), fáze dne.

**Důležité:** stránku je třeba servírovat přes **HTTP** (např. `npx serve .`), ne `file://`, jinak fetch dat selže.

---

## 2. Struktura jednoho dne (engine)

`Engine.spustDen()` pro aktuální `currentDay` typicky provede:

### Ráno (`phase: morning`)

- U **neděle** (`den % 7 === 0`) se resetují **týdenní statistiky**.
- V **pondělí** podle nedělní volby může přibýt **inkoust** (průzkumné akce).
- Vyprší případné **ráno bonusy** (např. káva → +1 kapka).
- Po uplynutí platnosti se vymaže `flags.records_free_until_day`.
- Načtou se data dne, nastaví se **případy dne** (`Cases.nastavPripadyProDen`), aktualizují se **složky** na stole.
- **Ekonomika ráno:** lékařský buff, Karasův dluh, **nedělní výplata** (+80 Kčs v **1. a 2. neděli** = dny 7 a 14), varování při bankrotu, dluh > 100. Nabídka Haase (300 Kčs, matčina operace) je jen ve spisu **`tyc_haas_d11`** v den 15 — bez samostatného ráno modálu.
- **Ranní fragment** podle `days.json` (u testovacího režimu může být den 1 zjednodušen).
- **Revize spisů** — ve **15denní** verzi **vypnuty** (`MIGRACE_20-15.md`); data `review_card` v JSON se nečtou.
- **Dialogy postav** jako dopisy/fragmenty (den 1 může být v testu přeskočen).
- **Nedělní volba** (`nedelni_volba` v datech dne), pokud je v `days.json`.

### Dopoledne (`phase: forenoon`)

- Zobrazí se indikace **Vlčkova dopisu** / šuplíku, pokud den vyžaduje.
- Tlačítko **„Další den“** je skryté, dokud nejsou splněny podmínky (viz níže).

### Hraní „uvnitř dne“

- Hráč otevírá **složky případů** na stole → modál spisu (viz druhý dokument).
- Po vyřešení všech případů dne engine nastaví **večer** a po krátké zprávě zpřístupní **Další den**.

### Co se stane po stisku „Další den“

1. **Večerní volba** (`evening_choice` v `days.json`), pokud existuje.
2. **Večerní** a případně **noční fragment**.
3. **Sobota večer** (`den % 7 === 6`): modal **shrnutí týdne**, vyhodnocení tichých bonusů (v 15d jen **pečlivost** a **nezávislost** dle `MIGRACE_20-15.md`), aplikace efektů a související fragmenty.
4. Vizuální **přechod dne**, `State.dalsiDen()`, uložení, znovu `spustDen()`.

---

## 3. Konec dne vs. konec hry

### Konec pracovního dne

- `Engine.zkontrolujKonecDne()`: pokud nejsou žádné případy, nebo jsou **všechny** ID z `casesResolvedToday` vyřešené, fáze přejde na **evening** a objeví se **Další den**.
- Případy se považují za vyřešené po potvrzení rozsudku (archiv + uzavření spisu).

### Hard stop v kalendáři

- Pokud `currentDay > 19` (15 pracovních dní + 2 víkendy), engine zavolá **`Engine.spustKonec('preziti')`** — epilog. (Starší 20d build používal jiný strop — viz `MIGRACE_20-15.md`.)

### Předčasné konce z rozhodnutí a stavu

Po **rozsudku** (`Cases.zpracujRozsudek`) se může spustit konec hry:

1. **`Traits.zkontrolujKrajniHodnoty()`** — např. extrémní integrita může vést na typ konce `korupce` (návrat s `ending` v události).
2. **`Cases._zkontrolujSpeciálniKonce`** — podmíněné konce:
   - **`atentát`**: flag Haas odsouzen + nízká Moc + den ≥ 25  
   - **`odvolani`**: nízká Integrita + nízká Moudrost + den ≥ 20  
   - **`hrdina`**: den ≥ 30 + flagy Beneš pravda + Haas odsouzen  

Konce nastaví `gameOver`, `endingType`, uloží stav a hudbu epilogu. **Řádky epilogu** (postavy + Ben) sestaví `Engine._sestavEpilog(typ)` především z **`data/endings_epilog.json`** (`typy[endingType]`, načtení `DataLoader.ziskejEndingsEpilog()`; výběr větví např. Beneš / Horáková viz `_napojeni` v JSON a `Engine._epilogRadekZeSouboru`). Chybí-li soubor, typ v datech nebo konkrétní řetězec, použije se **záložní text** v `js/engine.js`.

**UI:** `Engine.spustKonec` volá **`UI.zobrazPredKoncemAKonecHry(typ, epilog)`** — modál **`#modal-konec-prelude`** z **`data/ending_prelude.json`**, po potvrzení **`UI.zobrazKonecHry`** (`#konec-hry-overlay`). Tlačítko „Přehled vyprávění“ spustí **`UI.spustKreditniSekvenci`** (zatmavení → IN DUBIO → logo studia v **`assets/branding/legio-ultima.png`**) a pak **`UI.zobrazSouhrnKampane`**. Chybí-li DOM předepilogu, data předepilogu nebo exportovaná funkce, jde se rovnou na **`zobrazKonecHry`**.

> **Poznámka:** V `story.mdc` je rozpracováno **osm naratálních konců** (Přežití, Korupce, Hrdina, Útěk, Smíření, Atentát, Kruh, Anna). V kódu jsou **vyvolané typy** konce vázané na `endingType`; texty epilogu pro daný typ jsou v **`endings_epilog.json`** (klíče musí odpovídat `endingType`). Plné mapování všech naratálních variant na podmínky ve hře je cíl designu; tento soubor popisuje **co dnes engine umí spustit** a obecný denní tok.

---

## 4. S čím hráč pracuje mimo spis

- **Archiv / postavy / fragmenty** — modály z UI, závislé na `State` a načtených datech.
- **Noviny** — aktualizace podle dne (`Narrative.aktualizujNoviny`).
- **Ekonomika** — bilance, výdaje, cíl operace matky, Haasova obálka, události z `js/finance.js` (detail v `economy.mdc`).
- **Rysy a frakce** — hvězdičky / tečky v UI, dopady na volby a reakce (`traits-factions.mdc`).
- **Uložení** — automatické a záložní sloty (nabízené na úvodní obrazovce).

---

## 5. Shrnutí toku pro hráče (zjednodušeně)

1. Ráno: přečíst krátké texty, případně volby (neděle, dopisy).  
2. Otevřít **oba případy** (nebo jeden, podle dne), prostudovat spis, volitelně **pátrat** a **zkoumat**.  
3. Před potvrzením vidět **předběžný dopad** (finance číslem v Kčs, ostatní osy bez čísel; frakce jedním řádkem), pak vynést **rozsudek** — nenávratně.  
4. Po vynesení dohledat přesná čísla v **readonly detailu spisu** i v šuplíku **Rozsudky** (rozbalení řádku; volitelně **filtr podle typu případu**), včetně agregovaného součtu využití neoficiálních zdrojů.  
5. Až je den uzavřený → **Další den** → večerní volba a noční texty → další kalendářní den.  
6. Hra končí po **19. kalendářním dni** (15 pracovních dnů) výchozím `preziti` epilogem, nebo dříve při splnění podmínek speciálního konce (větev variabilních konců od 11. pracovního dne — v implementaci dle `MIGRACE_20-15.md` / Fáze 3).

Pro detail **jednoho spisu** (průzkum, pátrání, rozsudek, neoficiální zdroj) viz `spis-patrani-pruzkum-rozsudek.md`.

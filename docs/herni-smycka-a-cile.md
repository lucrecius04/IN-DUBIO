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
- **Ekonomika ráno:** lékařský buff, Karasův dluh, **nedělní výplata** (+80 Kčs na vybraných dnech), varování při bankrotu, dluh > 100, speciální **den 23** (modal krize).
- **Ranní fragment** podle `days.json` (u testovacího režimu může být den 1 zjednodušen).
- **Revize spisů** naplánované na tento den (`State.vyzvedniRevizeProDen`) — krátká volba A/B v modálu. **Frekvenci a limity** drží scénář (`docs/scenar/Milniky-dynamika-akt1.md` §4, `InDubio_20dni_Mapa-scenar.md` §8): revize nesmí zahltit 3.–4. týden tak, že by ustoupily **nové** případy; při implementaci ověř strop (např. max počet revizí na průchod / na 7 dní).
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
3. **Sobota večer** (`den % 7 === 6`): modal **shrnutí týdne**, vyhodnocení tichých bonusů (pečlivost, nezávislost, odvaha, směr verdiktů, těžké rozsudky), aplikace efektů a související fragmenty.
4. Vizuální **přechod dne**, `State.dalsiDen()`, uložení, znovu `spustDen()`.

---

## 3. Konec dne vs. konec hry

### Konec pracovního dne

- `Engine.zkontrolujKonecDne()`: pokud nejsou žádné případy, nebo jsou **všechny** ID z `casesResolvedToday` vyřešené, fáze přejde na **evening** a objeví se **Další den**.
- Případy se považují za vyřešené po potvrzení rozsudku (archiv + uzavření spisu).

### Hard stop v kalendáři

- Pokud `currentDay > 30`, engine zavolá **`Engine.spustKonec('preziti')`** — hra přepne do epilogu (technicky typ konce `preziti`).

### Předčasné konce z rozhodnutí a stavu

Po **rozsudku** (`Cases.zpracujRozsudek`) se může spustit konec hry:

1. **`Traits.zkontrolujKrajniHodnoty()`** — např. extrémní integrita může vést na typ konce `korupce` (návrat s `ending` v události).
2. **`Cases._zkontrolujSpeciálniKonce`** — podmíněné konce:
   - **`atentát`**: flag Haas odsouzen + nízká Moc + den ≥ 25  
   - **`odvolani`**: nízká Integrita + nízká Moudrost + den ≥ 20  
   - **`hrdina`**: den ≥ 30 + flagy Beneš pravda + Haas odsouzen  

Konce nastaví `gameOver`, `endingType`, uloží stav a zobrazí **UI epilog** (`UI.zobrazKonecHry`).

> **Poznámka:** V `story.mdc` je rozpracováno **osm naratálních konců** (Přežití, Korupce, Hrdina, Útěk, Smíření, Atentát, Řád, Anna). V kódu jsou zatím **konkrétně vyvolané typy** epilogu vázané na `endingType` a epilogové řádky (např. v `engine.js` u postav). Plné mapování „8 konců = 8 větví v engine“ je cíl designu; tento soubor popisuje **co dnes engine umí spustit** a obecný denní tok.

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
6. Hra končí po **30 dnech** (výchozí `preziti` epilog) nebo dříve při splnění podmínek speciálního konce.

Pro detail **jednoho spisu** (průzkum, pátrání, rozsudek, neoficiální zdroj) viz `spis-patrani-pruzkum-rozsudek.md`.

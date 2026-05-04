# Prompt pro autora — epilogové konce (IN DUBIO)

Použij jako zadání pro AI nebo lidského autora. Pravidla obsahu: `.cursor/rules/story.mdc`, `economy.mdc`, `cases.mdc` — **nevymýšlej** pevná jména a vazby mimo schválená pravidla a data.

---

## Role

Autor závěrečných textů pro **noir soudní hru** (Praha, 1931). Hráč je **soudce JUDr. Benedikt Vraný** (Ben). Tón: středoevropská meziválka, úřední střídmost, bez hodnocení hráče.

---

## Vrstva A — předepilog (`data/ending_prelude.json`)

Obrazovka **před** stávajícím epilogem (`#konec-hry-overlay`):

1. Jasně: **konec příběhové kampaně** této relace.
2. **Příčina / tón** podle typu konce (`preziti`, `korupce`, …).
3. Most: **další obrazovka shrne postavy a Benda**.

Struktura JSON: `uvod_vzdy` (string), `typy.<klic>.nadpis`, `typy.<klic>.odstavce` (pole stringů). Klíče musí odpovídat `endingType` v kódu; chybí-li typ, použije se `typy.default`.

---

## Vrstva B — dlouhý epilog (rozšíření)

Zdroj textů: `data/endings_epilog.json` (načítá `DataLoader`, používá `Engine._epilogRadekZeSouboru`; při chybě souboru nebo chybějícím typu fallback na krátké řetězce v `js/engine.js`). Cíl:

- **3–8 vět na postavu** podle konce a stavu (flags, trust).
- **Ben 8–15 vět** s konkrétní obrazností.

**Důvěra Horáková:** ve `State.trust` je uložena jako **`zavadova`** (mapování `horakova → zavadova` v `characters.js` / `cases.js`). Epilog musí číst `trust.zavadova`, ne `trust.horakova`.

**Ben v datech:** vnitřní klíč v engine zůstává **`novak`** u `_epilogNovak` / řádek s `klic: true` v UI — v navrhovaném JSON lze použít `novak` bez změny kódu, nebo `ben` + mapování v loaderu.

**Karas:** epilogový řádek je v řetězci po Maškovi; jméno z `characters.json` (`id` karas).

Struktura JSON: viz `_struktura` / `_napojeni` v souboru; klíče `typy` musí odpovídat `endingType` ve hře.

---

## Prompt do chatu (zkopíruj)

```
Píšeš česky. Hra IN DUBIO: soudce JUDr. Benedikt Vraný, Praha 1931, noir.

Úkol: Uprav nebo přepiš obsah data/ending_prelude.json — pole uvod_vzdy a typy.* (nadpis + odstavce). Respektuj story bible (Anna vs matka, Síbr, Vlček–Haas); nehodnoť hráče; bez HTML.

Typ „preziti“ = neutrální uzávěr kalendáře/úřadu bez velké katastrofy, ale musí znít jako konec, ne odměna.
```

---

## Technická mapa

| Část | Soubor |
|------|--------|
| Data předepilogu | `data/ending_prelude.json` |
| Načtení | `js/data-loader.js` |
| Modál | `index.html`, `css/animations.css` |
| Zobrazení | `js/ui.js` — `zobrazPredKoncemAKonecHry` |
| Volání | `js/engine.js` — `spustKonec` |
| Výchozí konec kampaně | `_vyhodnotVariabilniKonec`: `preziti` od **dne 19** (soulad s kalendářem 1…19) |

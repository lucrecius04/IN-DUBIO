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

Dnes: `js/engine.js` — `_sestavEpilog`, `_epilogVlcek`, … Cíl:

- **3–8 vět na postavu** podle konce a stavu (flags, trust).
- **Ben 8–15 vět** s konkrétní obrazností.

Migrace: např. `data/endings_epilog.json` + načtení v engine, nebo rozšíření přímo `_epilog*`.

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

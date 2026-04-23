# Případy (autorův staging)

Složka pro **jednotlivé spisy** — každý soubor je **jeden kompletní herní objekt** ve stejné JSON struktuře jako jeden prvek pole `pool_cases_akt1` v `data/pool_cases_akt1.json`.

- **Není to jiný formát** než v poolu — je to **stejné schéma**, jen **rozdělené** kvůli přehledu v gitu, revizím a souběžné práci.
- Až je případ hotový a schválený, objekt se **vloží** do `pool_cases_akt1.json` (předepsaná položka v poli) a případně se doplní řádek v `docs/scenar/Pripady.csv` a přehled v `docs/pool_cases_akt1_prehled.md`.
- Pojmenování souborů: např. `pool_a1_XXX.json` (stejné `id` jako uvnitř) nebo dočasně `DRAFT-nazev.json` — ať k sobě `id` a soubor souvisí.

**Ukázka (kompletní spis k poslání autorům jako vzor):** [`pool_a1_tiskarna-vzor_Nocni-smena.json`](./pool_a1_tiskarna-vzor_Nocni-smena.json) — případ *Noční směna* (stejný obsah jako položka `pool_a1_tiskarna` v `pool_cases_akt1.json`). Děj se nekopíruje; jde o **strukturu** polí a styl textů.

Technická specifikace polí: **`.cursor/rules/cases.mdc`**, v kódu sestavení poolu: `js/data-loader.js` (soubor `data/pool_cases_akt1.json`).

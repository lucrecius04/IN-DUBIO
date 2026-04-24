# Scénář — vstupní brána (`docs/scenar/`)

Tato složka je **jedno místo** pro denní mapu, případy ve dnech, vlákna, dopisy a balanci. Lore a postavy zůstávají ve **Story Bible** — [`../InDubio_StoryBible_v2_Cursor.txt`](../InDubio_StoryBible_v2_Cursor.txt); technické mechaniky hry v **`.cursor/rules/`** a v [`../spis-patrani-pruzkum-rozsudek.md`](../spis-patrani-pruzkum-rozsudek.md).

---

## Kanon v kostce

| Co | Kde |
|----|-----|
| **Rámec 20 dní** (týdny, večery, matka, soudci) | [`InDubio_20dni_Mapa-scenar.md`](./InDubio_20dni_Mapa-scenar.md) — jen tento soubor; **nekopíruj** jeho text jinam. |
| **Milníky, limity revizí, dynamika 2. poloviny aktu** | [`Milniky-dynamika-akt1.md`](./Milniky-dynamika-akt1.md) |
| **Řádek za řádkem 20 herních dní** (sloty, typy, dopisy, večery v tabulce) | [`Mapa_20dni.csv`](./Mapa_20dni.csv) — sloupce *Modif_dne*, *Vecer_doplnek*, *Patrani_navrh* |
| **Případy podle slotu** (ID, typ, Haas, odložené důsledky…) | [`Pripady.csv`](./Pripady.csv) |
| **Ekonomika / bilance** | [`Balancing.csv`](./Balancing.csv) — sloupec *Scenar_modif_navrh* (návrhy k pozdějšímu ladění) |
| **Dopisy** | [`Dopisy.csv`](./Dopisy.csv) |
| **Vlákna** | [`Vlakna.csv`](./Vlakna.csv) |
| **Konce** | [`Konce.csv`](./Konce.csv) |
| **Statistiky** | [`Statistiky.csv`](./Statistiky.csv) |

**20 dní:** design a mapa počítají s **20 pracovními dny** kampaně v tomto smyslu (viz mapa + `cases.mdc`). Běžící kalendář ve hře je **`data/days.json`** — při vývoji se mění podle potřeby, až budete scénář plně nasazovat, sjednotíte ho s CSV.

**Případy v kódu:** obsah spisů je v **`data/pool_cases_akt1.json`** (pool); `days.json` u každého dne polem `cases` určuje, **která ID** se mají dnes objevit (můžou být pool i legacy, dokud migrujete).

**Excel:** `docs/InDubio_20dni_Mapa.xlsx` je volitelný autorův přehled; pravda pro AI a git je **CSV v této složce** + MD rámec výše.

**Formát CSV:** oddělovač **`;`**, soubory ukládejte jako **UTF-8**, aby držela čeština.

---

## Struktura repozitáře (dokumentace)

```text
docs/
  README.md                    ← odkazuje sem (scénář) + na mechaniky
  scenar/
    ReadMeScenar.md            ← tento soubor (vstupní brána)
    InDubio_20dni_Mapa-scenar.md   ← rámec: večery, matka, týdny, soudci
    Mapa_20dni.csv
    Milniky-dynamika-akt1.md
    Pripady.csv
    Balancing.csv
    Dopisy.csv
    Vlakna.csv
    Konce.csv
    Statistiky.csv
  InDubio_20dni_Mapa.xlsx      ← volitelný Excel
  InDubio_StoryBible_v2_Cursor.txt   ← lore, Story Bible v2.1 (mimo scenar/)
  herni-smycka-a-cile.md
  spis-patrani-pruzkum-rozsudek.md
  …

.cursor/rules/
  cases.mdc                    ← odkaz na docs/scenar/ (ReadMeScenar + Mapa-scenar)

data/
  days.json                    ← kalendář ve hře (vývoj = postupné změny)
  pool_cases_akt1.json
```

---

## Co je `InDubio_20dni_Mapa-scenar.md`?

**Krátký naratální a strukturální rámec** (ne tabulka): proč existují večery, jak funguje emoční linka s matkou, týdenní skelet Po–Ne, připomínka soudců z `cases.mdc`, co doplnit do mapy.  
**Není** duplikát řádků z `Mapa_20dni.csv` — doplňuje je významem.  
**Není** Story Bible — lore tam nepatří.

---

## Rychlý odkaz nahoru

- Celá dokumentace mechanik: [`../README.md`](../README.md)

# Scénář — vstupní brána (`docs/scenar/`)

Tato složka je **jedno místo** pro denní mapu, případy ve dnech, vlákna, dopisy a balanci. Lore a postavy zůstávají ve **Story Bible** (v3.0, 15 prac. dní) — [`../InDubio_StoryBible_v2_Cursor.txt`](../InDubio_StoryBible_v2_Cursor.txt); technické mechaniky hry v **`.cursor/rules/`** a v [`../spis-patrani-pruzkum-rozsudek.md`](../spis-patrani-pruzkum-rozsudek.md).

---

## Kanon v kostce (15 pracovních dní)

| Co | Kde |
|----|-----|
| **Denní mapa, sloty, večery, poznámky** | [`Mapa_15dni.csv`](./Mapa_15dni.csv) — **jediný** řádkový plán dní pro vývoj |
| **Případy ve dnech (ID, beat, vrstva)** | [`Pripady_15dni.csv`](./Pripady_15dni.csv) |
| **Vlákna / dopisy (15d)** | [`Vlakna_15dni.csv`](./Vlakna_15dni.csv), [`Dopisy_15dni.csv`](./Dopisy_15dni.csv) |
| **Milníky, limity revizí, dynamika aktu** | [`Milniky-dynamika-akt1.md`](./Milniky-dynamika-akt1.md) + [`Balancing.csv`](./Balancing.csv) |
| **Migrace a historie 20d → 15d** | [`MIGRACE_20-15.md`](./MIGRACE_20-15.md) |
| **20denní soubory (archiv, ne kanon)** | [`ARCHIV_20D_README.md`](./ARCHIV_20D_README.md) — `Mapa_20dni.csv`, starý `Pripady.csv` (ne `Pripady_15dni`), atd. **nepoužívat** pro nové úpravy |
| **Ekonomika / bilance** | [`Balancing.csv`](./Balancing.csv) — sloupec *Scenar_modif_navrh* (návrhy k pozdějšímu ladění) |
| **Dopisy** | [`Dopisy.csv`](./Dopisy.csv) |
| **Vlákna** | [`Vlakna.csv`](./Vlakna.csv) |
| **Konce** | [`Konce.csv`](./Konce.csv) |
| **Statistiky** | [`Statistiky.csv`](./Statistiky.csv) |

**Délka kampaně:** **15 pracovních dní**; kalendář a spisy v `data/days.json`. Archiv 20d viz [`ARCHIV_20D_README.md`](./ARCHIV_20D_README.md). Pravidla: `cases.mdc`.

**Případy v kódu:** obsah spisů je v **`data/pool_cases_akt1.json`** (pool); `days.json` u každého dne polem `cases` určuje, **která ID** se mají dnes objevit (můžou být pool i legacy, dokud migrujete).

**D10–D12 (osobní tyče):** ve hře je druhý slot **`tyc_zvraty_d10`**, **`tyc_haas_d11`**, **`tyc_zavadova_d12`**; první slot jsou fixní pool ID (viz `days.json`). Starší plán s Markovou 2 / Pospíšilem 3 / Hranicí 3 v těchto dnech už neplatí — přehled v [`Pripady_15dni.csv`](./Pripady_15dni.csv) musí kopírovat `days.json`.

**Excel:** `docs/InDubio_20dni_Mapa.xlsx` je volitelný autorův přehled; pravda pro AI a git je **CSV v této složce** + MD rámec výše.

**Formát CSV:** oddělovač **`;`**, soubory ukládejte jako **UTF-8**, aby držela čeština.

---

## Struktura repozitáře (dokumentace)

```text
docs/
  README.md                    ← odkazuje sem (scénář) + na mechaniky
  scenar/
    ReadMeScenar.md            ← tento soubor (vstupní brána)
    Mapa_15dni.csv
    Pripady_15dni.csv
    Milniky-dynamika-akt1.md
    ARCHIV_20D_README.md
    Balancing.csv
    Dopisy.csv
    Vlakna.csv
    Konce.csv
    Statistiky.csv
  InDubio_20dni_Mapa.xlsx      ← volitelný Excel
  InDubio_StoryBible_v2_Cursor.txt   ← lore, Story Bible v3.0 / 15d (mimo scenar/; název souboru historický)
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

## Rámec večerů a matky

Obecné principy (ne čísla dní) jsou v [`Milniky-dynamika-akt1.md`](./Milniky-dynamika-akt1.md) a v textu scénáře v `MIGRACE_20-15.md`. Soubor `InDubio_20dni_Mapa-scenar.md` je **archivovaný** (20d) — pro sloty a kalendář vždy [`Mapa_15dni.csv`](./Mapa_15dni.csv). **Není** Story Bible.

---

## Rychlý odkaz nahoru

- Celá dokumentace mechanik: [`../README.md`](../README.md)

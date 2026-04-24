# Dokumentace — IN DUBIO

Texty pro design, autorování a orientaci v kódu. Kanon detailů mechanik zůstává v **`.cursor/rules/`** (`core.mdc`, `story.mdc`, `cases.mdc`, `economy.mdc`, `traits-factions.mdc`).

## Scénář a 20 dní (jedno místo)

**Celá denní mapa, případy ve dnech, vlákna, dopisy a balanci ber z:**

**[`scenar/ReadMeScenar.md`](./scenar/ReadMeScenar.md)** — vstupní brána, přehled CSV a vztah k `days.json` / poolu.

- Rámec (večery, matka, týdny, soudci): [`scenar/InDubio_20dni_Mapa-scenar.md`](./scenar/InDubio_20dni_Mapa-scenar.md) — jen tam, bez kopírování do jiných souborů.
- Milníky, limity revizí, dynamika 2. poloviny aktu: [`scenar/Milniky-dynamika-akt1.md`](./scenar/Milniky-dynamika-akt1.md) + sloupce v [`scenar/Mapa_20dni.csv`](./scenar/Mapa_20dni.csv) / [`scenar/Balancing.csv`](./scenar/Balancing.csv).
- Lore a postavy: **Story Bible** — `InDubio_StoryBible_v2_Cursor.txt` v `docs/` (v2.1), není duplikována ve `scenar/`.

## Případy (JSON) a prompty

- Staging **jednoho spisu = jeden soubor** (stejné schéma jako položka v `pool_cases_akt1`): [`Pripady/README.md`](./Pripady/README.md).  
- **Celý prompt pro AI autora** (základ + zástupné `XXX`): [`promts/PROMPT-autor-pripadu.md`](./promts/PROMPT-autor-pripadu.md) — workflow: [`promts/README.md`](./promts/README.md). Už hotové pool případy doplňovat: [`promts/PROMPT-doplneni-stavajicich-pool-pripadu.md`](./promts/PROMPT-doplneni-stavajicich-pool-pripadu.md). World reálie: [`world-reference.md`](./world-reference.md).

---

## Mechaniky a spis (tabulka níže)

| Soubor | Obsah |
|--------|--------|
| [herni-smycka-a-cile.md](./herni-smycka-a-cile.md) | Jak hra ubíhá den za dnem, fáze, stůl, uložení, technické konce hry vs. naratální osm konců |
| [spis-patrani-pruzkum-rozsudek.md](./spis-patrani-pruzkum-rozsudek.md) | Jeden spis v modálu: text, pátrání (clues), průzkum, inkoust, neoficiální zdroj, rozsudek (včetně slabého podkladu jen v kroku 2), důsledky, archiv Rozsudků (filtr typu, `caseType`) |

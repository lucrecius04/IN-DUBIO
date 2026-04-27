# Dokumentace — IN DUBIO

Texty pro design, autorování a orientaci v kódu. Kanon detailů mechanik zůstává v **`.cursor/rules/`** (`core.mdc`, `story.mdc`, `cases.mdc`, `economy.mdc`, `traits-factions.mdc`).

## Scénář a 15 pracovních dní (jedno místo)

**Celá denní mapa, případy ve dnech, vlákna, dopisy a balanci ber z:**

**[`scenar/ReadMeScenar.md`](./scenar/ReadMeScenar.md)** — vstupní brána, přehled CSV a vztah k `days.json` / poolu.

- Denní mapa a sloty: [`scenar/Mapa_15dni.csv`](./scenar/Mapa_15dni.csv), případy: [`scenar/Pripady_15dni.csv`](./scenar/Pripady_15dni.csv). Archiv 20d: [`scenar/ARCHIV_20D_README.md`](./scenar/ARCHIV_20D_README.md) (nepoužívat pro vývoj).
- Milníky, limity revizí, dynamika aktu: [`scenar/Milniky-dynamika-akt1.md`](./scenar/Milniky-dynamika-akt1.md) + [`scenar/Balancing.csv`](./scenar/Balancing.csv).
- Lore a postavy: **Story Bible** — `InDubio_StoryBible_v2_Cursor.txt` v `docs/` (v3.0, 15 prac. dní; název souboru může stále obsahovat `v2` v cestě), není duplikována ve `scenar/`.

## Případy (JSON) a prompty

- Staging **jednoho spisu = jeden soubor** (stejné schéma jako položka v `pool_cases_akt1`): [`Pripady/README.md`](./Pripady/README.md).  
- **Celý prompt pro AI autora** (základ + zástupné `XXX`): [`promts/PROMPT-autor-pripadu.md`](./promts/PROMPT-autor-pripadu.md) — workflow: [`promts/README.md`](./promts/README.md). Už hotové pool případy doplňovat: [`promts/PROMPT-doplneni-stavajicich-pool-pripadu.md`](./promts/PROMPT-doplneni-stavajicich-pool-pripadu.md). World reálie: [`world-reference.md`](./world-reference.md). Jazyk soudní řeči (1925–1935): [`analyza_soudni_reci_1925-1935.md`](./analyza_soudni_reci_1925-1935.md); praktický postup: sekce *Kuchařka autora* v [`pool_cases_akt1_prehled.md`](./pool_cases_akt1_prehled.md).

---

## Mechaniky a spis (tabulka níže)

| Soubor | Obsah |
|--------|--------|
| [herni-smycka-a-cile.md](./herni-smycka-a-cile.md) | Jak hra ubíhá den za dnem, fáze, stůl, uložení, technické konce hry vs. naratální osm konců |
| [spis-patrani-pruzkum-rozsudek.md](./spis-patrani-pruzkum-rozsudek.md) | Jeden spis v modálu: text, pátrání (clues), průzkum, inkoust, neoficiální zdroj, rozsudek (včetně slabého podkladu jen v kroku 2), důsledky, archiv Rozsudků (filtr typu, `caseType`) |

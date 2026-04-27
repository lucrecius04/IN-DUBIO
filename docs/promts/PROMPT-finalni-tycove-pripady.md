# Prompt: finální tyčové (pillar) případy — Akt 1, 15 pracovních dní

Tento dokument je **zadání pro autora / generátor**, až tým začne psát **finálové** kauzy podle `Pripady_15dni.csv` (od cca **D8** výše: těžší beaty, VETVENÍ, metapříběh). Nezkoušej generovat obsah bez schváleného listu postav, sp. zn. a vazeb z **Story Bible** a bez řádku dne v **Mapa_15dni.csv**.

**Střední prompt** (pool, rutina): [`PROMPT-autor-pripadu.md`](./PROMPT-autor-pripadu.md).  
**Doplnění existujícího poolu:** [`PROMPT-doplneni-stavajicich-pool-pripadu.md`](./PROMPT-doplneni-stavajicich-pool-pripadu.md).  
**QA pool:** [`CHECKLIST-QA-pool-pripad.md`](./CHECKLIST-QA-pool-pripad.md).

---

## Proč je tento prompt jiný než pool

- Tyčové finále **vázané na scénář** (Božena 3, Hranice 2–3, Beneš, zvraty D10, Haas, Závadová, Karas, Marková 3, Velezrada) musí **sedět na den, slot, VETVENÍ** a na **odemykání konců** (`.cursor/rules/story.mdc`, osm konců).
- **Spisová zn.** nesmí kolidovat s jinou kauzou v `data/pool_cases_akt1.json` / přehledem.
- Texty musí **neprozrazovat** předčasně to, co má přijít o den později; křížové odkazy jen tam, kde to mapa a Bible dovolují.
- Mechanika zůstává **stejná JSON stavebnice** jako u poolu (`cases.mdc`, `normalizujPoolPripad`), ale **ambice narrativní** je vyšší — stále soudní protokol, ne cutscéna místo spisu (kromě schválených výjimek týmu).

---

## Povinné přílohy k zadání (žádná nejde vynechat u „full“ finále)

1. **Řádek dne** z [`../scenar/Pripady_15dni.csv`](../scenar/Pripady_15dni.csv) (ID, Den, Slot, Pozn).
2. **Řádek mapy** z [`../scenar/Mapa_15dni.csv`](../scenar/Mapa_15dni.csv) (dopisy, večery, noviny, poznámky k Vlčkovi / matce / Karasovi).
3. [`../InDubio_StoryBible_v2_Cursor.txt`](../InDubio_StoryBible_v2_Cursor.txt) (v3.0) — postavy, frakce, den odhalení.
4. [`.cursor/rules/cases.mdc`](../../.cursor/rules/cases.mdc) — two-click, dvojkrok rozsudku, limity průzkumu.
5. Dva **vzorové JSON** z repa: jeden **plný pool** (např. `docs/Pripady/pool_a1_tiskarna-vzor_Nocni-smena.json`) + jeden **tyč** již hotový (např. `tyc_pospisil_2.json` nebo jiný schválený), aby struktura seděla 1:1.
6. [`../scenar/Milniky-dynamika-akt1.md`](../scenar/Milniky-dynamika-akt1.md) — limity revizí, tón týdne, je-li den citlivý.

---

## Zástupné značky (vyplní tým před generováním)

| Značka | Význam |
|--------|--------|
| `XXX_DEN` | Pracovní den 1–15 (shoda s mapou) |
| `XXX_SLOT` | 1 / 2 / (3 jen pokud mapa a days.json dovolí) |
| `XXX_ID` | Trvalé `id` případu v JSON (unikátní) |
| `XXX_BEAT` | Např. Božena 3/3, Hranice 2/3, VETVENI 2, … |
| `XXX_SPOJENI` | Vlákna, která tento spis musí posunout (Pospíšil, Vlček, …) — věta od designéra |

---

## Instrukce pro model / autora

1. **Nepřidávej** postavy, fakta o minulosti Bena, Vlčka, Haase, Anny, Martina, Závadové, Karase **nad rámec** Bible a schváleného listu — žádné nové křestní jméno pro „tajného sponzora“ bez týmu.
2. **Verdikty a efekty** musí umět nastavit **VETVENÍ** a případné `flags` konzistentně s `docs/scenar/Balancing.csv` a `story.mdc` (důvěra, vina, finance). Pokud není tabulka hotová, napiš **placeholdery** a poznamenej *„ke schválení“* mimo JSON.
3. **D10 (zvraty)** a **D12 (Závadová)** jsou nejnáročnější na synchron s frakcemi — explicitně označ, které karty a průzkumy odkrývají **Wolfa**, **Haase**, **Annu**, **podvrh**, aby šly napojit na `morning_conditional` / následné dny.
4. **Beneš (D9)** a **Karas (D13)**: tón *osobní* může být delší v příslovích a replicích, ale spis stále obsahuje **obžalobu, důkazní listinu, řízené výpovědi** dle `cases.mdc` — pokud je tým chce čistě jako *modal příběh*, musí to výslovně napsat do zadání (a pak ověřit, že to engine podporuje).
5. **Velezrada (D15)**: epilog, jeden slot; musí být čitelné uzavření 3. zvratu a napojení na osm konců — ověř u řádku `d15s1_velez` a Bible sekci zvratů.
6. Po JSON splň [**CHECKLIST-QA-pool-pripad**](./CHECKLIST-QA-pool-pripad.md) a interní **review duplicit** s `docs/pool_cases_akt1_prehled.md`.

---

## Krátká kontrola před odevzdáním

- [ ] `id`, `case_number` unikátní v rámci aktu / přehledu.  
- [ ] `available_days` obsahuje **jen** `XXX_DEN` (nebo rozmezí, které tým schválil pro replay).  
- [ ] `case_track: "pillar"` (nebo ekvivalent dle vašeho názvosloví v datech) u tyče.  
- [ ] Odkazy na encyklopedii (`data/encyclopedia.json`) nevedou do prázdných hesel.  
- [ ] U VETVENÍ: v `verdicts` / `effects` jsou `flags` pojmenované **stejně** jako očekává `State` a `days.json` (`condition.flag`).  

---

*Finální tyčové případy = největší textová rizika v Aktu 1; vždy nechte projít druhým parťákem a schválenou číselníkovou vazbu na hru.*

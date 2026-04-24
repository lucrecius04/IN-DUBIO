# Prompty pro autory (IN DUBIO)

**Lore a 20denní rámec:** `docs/InDubio_StoryBible_v2_Cursor.txt` (v2.1). **Současnost děje hry** = březen 1931; spisy smějí v důkazech pracovat s dřívější minulostí. Reálie a ceny: [`../world-reference.md`](../world-reference.md). **Dynamika dne / milníky / limity revizí:** [`../scenar/Milniky-dynamika-akt1.md`](../scenar/Milniky-dynamika-akt1.md) + řádek dne v [`../scenar/Mapa_20dni.csv`](../scenar/Mapa_20dni.csv).

## Workflow

1. V chatu otevřete **kontext hry** (tento repozitář) a **zeptáte se**, který typ případu / období / slot zrovna potřebujete přidat.  
2. Dostanete odpověď ve znění: *co je potřeba* (téma, typ, odbočky) + případně stručný **doplněk k promptu** (cíl dne, NPC).  
3. Otevřete zdejší soubor [`PROMPT-autor-pripadu.md`](./PROMPT-autor-pripadu.md), doplňte místo **XXX** a případné doplňky, celý text pošlete AI nebo člověku, který generuje **jeden JSON objekt** spisu.  
4. Uložte výstup např. do `docs/Pripady/<id>.json`, pak **sloučení** do `data/pool_cases_akt1.json` (nebo v Agent módu ožádáte sloučení) + aktualizace přehledu.

**Úprava už hotových pool případů** (doplnění `narrative_lines`, lidštějších popisů verdiktů, `review_card`…): [`PROMPT-doplneni-stavajicich-pool-pripadu.md`](./PROMPT-doplneni-stavajicich-pool-pripadu.md) + do zadání **vložit celý JSON** daného případu.

**Pozn.:** Název složky zůstává `promts` (projektová volba), obsah můžete otevírat v libovolném editoru.

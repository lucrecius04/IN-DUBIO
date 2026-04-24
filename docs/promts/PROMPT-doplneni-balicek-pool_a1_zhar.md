# Balíček: doplnění pool případu `pool_a1_zhar` (Žhářství na Smíchově)

Tento soubor slouží k **jednorázovému zadání** pro AI: obsahuje **celý prompt** ve stejném znění jako `PROMPT-doplneni-stavajicich-pool-pripadu.md` a níže **vyplněné zadání týmu** pro případ *Žhářství na Smíchově*.

**K odeslání:** zkopíruj od sekce „Prompt: doplnění…“ až po konec včetně poznámky pod čarou, a **přilož** soubor `docs/Pripady/pool_a1_zhar-Zharstvi-na-Smichove.json` (nebo vlož jeho obsah pod zadání).

**Cíl úprav (důležité):** kauza `pool_a1_zhar` je v `docs/Pripady/...` a v `data/pool_cases_akt1.json` **již sloučena s mechanikou** (Two-Click, stopy, `narrative_lines`, rozsudky vč. inkoustu). Další běh AI: **dolaď texty a konzistenci** dle sekcí A–D níže, **neprohlubuj děj** bez týmu a **nemaž** číselné `effects` bez pokynu.

**Jádro děje (pro orientaci; neměň bez pokynu):** požár kovodílny 14. 2. 1931, ohnisko u **nářadí** vs tvrzení o **zkratu**; laboratoř a **benzín**; rozpor v **čase** (Houška *od půl desáté doma* vs soused **půl jedenácté na dvoře s mladším mužem**; hasič *ve 2:00*); dluh u **smíchovské záložny**, výběr **Zdeňkův den před**; po konfrontaci: **Zdeněk** jako žhář, otec kryje, přišel syna *rozmluvit* — pozdě. `encyclopedia_links`: `zharství`, `pojistovna_slavia`, `zalosna`, `smichov` — v textu mluvit o **záložně**; v odkazu zůstává id `zalosna` (enc. / plán). V `data/knihovna.json` je dnes **heslo** `smichov` (ostatní až `encyclopedia` / doplnění dle týmu). Nová `data-knihovna-id` **neinventuj** bez souhlasu.

**Vzor ke struktuře:** `docs/Pripady/pool_a1_tiskarna-vzor_Nocni-smena.json`, `docs/Pripady/pool_a1_nemocenska-Nemocensky-listek.json`, `docs/Pripady/pool_a1_vytrznost-Rozbite-vylohy.json`.

---

# Prompt: doplnění stávajících pool případů (IN DUBIO, Akt 1)

Tento prompt použij, když máš **hotový JSON jednoho případu** z `data/pool_cases_akt1.json` a chceš ho **doplnit o nové možnosti** (nepsat kauzu znovu od nuly). Výstup musí být **validní JSON** — celý objekt případu s **stejným `id`**, připravený **nahradit** původní položku v poli `pool_cases_akt1`.

**Spisy light** (`data/pool_cases_light_akt1.json`, pole `pool_cases_light_akt1`) se tímto promptem **nepředpokládají** — tam drž zkrácený rozsah dle `.cursor/rules/cases.mdc` (sekce *Spis light*). Pokud doplňuješ light kauzu, pracuj s celým objektem z light souboru a výstup vrať jako náhrada téže položky v `pool_cases_light_akt1`.

---

## Role

Jsi **editor / rozšiřovatel** obsahu pro soudní hru IN DUBIO (Československo, první republika, **březen 1931** jako současnost kauzy; texty důkazů smějí sahat do minulosti dle původní logiky). Respektuj **původní děj, jména a strukturu** případu. Neměň skutkovou podstatu, dokud tým explicitně neřekne jinak.

**Tvůrčí laťka (vedle mechaniky):** pracuj i jako **spolutvůrce** — posil **motivace postav** v textu, drž **krátkou zapletku** a **logickou důkazní osu** (vrstvy spisu na sebe musí rozumně navazovat). Nové stopy, úpravy výpovědí nebo `narrative_lines` mají dávat **dějový i rozumový** smysl, ne působit jako ozdoba. Tón zůstává **soudní a úřední** 30. let; **číselné `effects` a týmem nedotčené limity nemaž**, pokud tým neřekne jinak.

## Vstup (připoj k zadání)

1. **Celý JSON objekt** daného případu (jedna položka z poolu).  
2. Volitelně: krátké **lore upozornění** (`docs/InDubio_StoryBible_v2_Cursor.txt`, `world-reference.md`) — jen pokud tým doplňuje jména nebo místa.  
3. Seznam **co upřesnit** z níže (zaškrtni, co má AI udělat).  
4. U případu vázaného na **konkrétní den** zkontroluj `../scenar/Mapa_20dni.csv` a `../scenar/Milniky-dynamika-akt1.md`, aby tón a intenzita (Mor/Pol, *Patrani_navrh*) seděly k plánované dynamice 2. poloviny aktu — bez měnění čísel v efektech, pokud tým neřekne jinak.

## Co doplnit / zkontrolovat (mechanika a kvalita)

Dle projektových pravidel a mechanik ve hře prověř a **doplněk tam, kde chybí**:

### A) Pátrání (Two-Click) — `clue_system.rewards.on_confirm`

- Při **nových nebo upravených** stopách a párech: drž **`.cursor/rules/cases.mdc` — Two-Click, odstavec o exaktní realitě**: stopy a správné páry z **hmatatelných údajů** ve spise (čas, číslo, místo, záznam, částka, datum výběru…), ne z čistě emočních vět.  
- Pokud je `clue_system.enabled: true` a existuje `on_confirm` pro `weak` / `medium` / `strong` **s odměnami**, u každé **úrovně, která může nastat** doplni pole **`narrative_lines`**: obvykle **3 krátké věty** v tónu „záznam z pátrání“ — reagují na to, co hráč spojil, **neprozrazuj** přímo řešení, gradují od slabší jistoty po silnější.  
- **Neukládej** kód navíc — text musí být v rámci existujících odměn.  

### B) Lidský dopad u rozsudků

- U každé **viditelné varianty** ve `verdicts` (pool) přidej nebo zpřesni, aby rezonovaly **důsledky pro lidi** (obžalovaný, manželka, sousedé, pojišťovna, syn).  
- U odemykaných větví prefix v `label` jako `Alternativa: ...` tam, kde to tým chce.  
- Neměň `effects` bez pokynu týmu.  

### B2) Protokolární věta v předehře rozsudku (UI rámec)

- Před dopadovým textem běží v UI `Jménem republiky se vynáší tento rozsudek.` — `description` jako **navazující** věty.  
- Volitelně `effects.flags` / `bonus_inkoust_rano` u alternativ dle `cases.mdc`.  

### C) `review_card` (volitelně)

- Jen když to dává děj; limity: `../scenar/Milniky-dynamika-akt1.md` §4. Možnost **insufficient** s *vrátit k došetření* už v případu je — nespouštěj náhodnou revizi navíc bez důvodu.  

### D) Konzistence a drobné opravy

- Unikátní `data-clue-id`. `knihovna` / `data-knihovna-id` jen dle `data/knihovna.json`.  

### E) Nemanipuluj s tím, co není třeba

- Neměň `id`, `case_number` ani základní **flow** progresu, pokud tým nechce.  

## Výstup

- Jeden **kompletní** JSON objekt, **validní**, UTF-8, bez `//` komentářů.  

## Zadání týmu (doplň / zaškrtni) — **VYPLNĚNO pro `pool_a1_zhar`**

- **ID případu:** `pool_a1_zhar`  
- Přiložený JSON: *`docs/Pripady/pool_a1_zhar-Zharstvi-na-Smichove.json` (Sp. zn. 81/1931, *Žhářství na Smíchově*)*  
- Doplň: `[x]` sekce A – `clue_system` + stopy v textu + `narrative_lines` / `[x]` lidské dopady u verdictů (B, B2) / `[ ]` `review_card` / `[x]` soudní formulace u odsouzení apod. / `[x]` kontrola D  
- `world-reference.md` / Bible: *dle potřeby (Smíchov, pojišťovna, záložna).*  
- **Kontext slotu (bod 4):** `available_days` = **3–6**; generická pool kauza (krize, dluh, pojišťovna) — tón *úřední zpráva / sousedské vidění / laboratoř*; bez vynucených změn v `effects` bez týmu.

---

*Po další editaci: nahraď stejnou položkou v `data/pool_cases_akt1.json` (1:1 se stagingem), ověř načtení hrou.*

---

## Soubory, které budeš asi potřebovat

| Soubor | K čemu |
|--------|--------|
| **`docs/Pripady/pool_a1_zhar-Zharstvi-na-Smichove.json`** | Vstupní JSON. |
| **`data/pool_cases_akt1.json`** | Cíl po schválení. |
| **`data/knihovna.json`** | Při odkazech do Knihovny. |
| **`docs/Pripady/pool_a1_nemocenska-Nemocensky-listek.json`**, **`pool_a1_vytrznost-…`** | Vzory `clue_system`. |
| **`docs/scenar/Mapa_20dni.csv`**, **`Milniky-dynamika-akt1.md`** | Kontext dynamiky aktu (obecně). |
| **`.cursor/rules/cases.mdc`** | Kanon. |

---

## Rychlý bríf pro autora (1 odstavec)

Spis má hmatatelné stopy a vrstvy pátrání (**čas** ohně a výpovědí, **ohnisko vs. zkrat**, **benzín**, **záznamy u záložny / výběr**). Při dalším běhu jen **dolaď a zkontroluj** konzistenci; u rozsudků sleduj dopad na **rodinu Houškovu, sousedství, pojišťovnu a Zdeňka** — **nepřepisuj** konfrontaci ani odhalení u **syna**; cíl je sjednotit tón s ostatními doplňovanými kauzami.

# Balíček: doplnění pool případu `pool_a1_stavba` (Pád ze lešení)

Tento soubor slouží k **jednorázovému zadání** pro AI: obsahuje **celý prompt** ve stejném znění jako `PROMPT-doplneni-stavajicich-pool-pripadu.md` a níže **vyplněné zadání týmu** pro případ *Pád ze lešení*.

**K odeslání:** zkopíruj od sekce „Prompt: doplnění…“ až po konec včetně poznámky pod čarou, a **přilož** soubor `docs/Pripady/pool_a1_stavba-Pad-ze-leseni.json` (nebo vlož jeho obsah pod zadání).

**Cíl úprav (důležité):** položka v `pool_cases_akt1` u této kauzy **v současné verzi nemá** `clue_system`. Dotahujeme kauzu **na stejnou úroveň** jako ostatní doplněné pool kauzy — **Two-Click** (označené stopy v textu, `pairs`, `narrative_lines` u odměn, hmatatelné údaje ve spisu: **datum, podpis, promile, čep, termíny**), **lidské dopady u verdictů** (B, vč. B2, inkoust u větví dle vhodnosti a `cases.mdc`), soudní formulace v `description` (*Soud uznává obžalovaného vinným…* / *zprošťuje* — ne pasiv a ne **Ben** místo soudu u výroku), **beze změny záměru děje** a **bez** libovolného maření `effects`.

**Jádro děje (pro orientaci; neměň bez pokynu):** smrt **Františka Tučka** 17. 2. 1931, pád z lešení, **Mánesova / Vinohrady**; **1,1 ‰** vs očekávání u pijáka; obžalovaný **Ing. Miroslav Kolář**; **Sýkora** a chybějící **klin** na čepu, nahlášení **mistrovi**; **kontrolní list 14. 2.** s podpisem a poznámkou Koláře; **tlak investora** (penále, **JUDr. Ryba**), rozhodnutí „**jet dál**“; interview o **termínu vs. oprávce**; po konfrontaci: **vědomé odložení** opravy. Typ případu: **`moral_dilemma`**. `encyclopedia_links`: `stavebni_zakon`, `nedbalost_trestni`, `leseni_predpisy`, `vinohrady`, `pracovni_urazy` — ověř v `data/knihovna.json` / plán encyklopedie; nová `data-knihovna-id` **neinventuj** bez souhlasu.

**Poznámka k číslu spisu:** *Záložna* (`pool_a1_exekuce`) má *Sp. zn. 86/1931*, tento případ (*Pád ze lešení*) *85/1931*. Rozlišuj **`id` případu** i spisovou značku, ať je v UI jasné, o které věci jde.

**Vzor ke struktuře:** `docs/Pripady/pool_a1_tiskarna-vzor_Nocni-smena.json`, `docs/Pripady/pool_a1_nemocenska-Nemocensky-listek.json`, `docs/Pripady/pool_a1_zhar-Zharstvi-na-Smichove.json`.

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
4. U případu vázaného na **konkrétní den** zkontroluj `../scenar/Mapa_20dni.csv` a `../scenar/Milniky-dynamika-akt1.md` — tento spis spadá do druhé poloviny aktu (`available_days` **5–10**), tón *morální dilema / odpovědnost stavby*; bez měnění čísel v efektech bez týmu.

## Co doplnit / zkontrolovat (mechanika a kvalita)

Dle projektových pravidel a mechanik ve hře prověř a **doplněk tam, kde chybí**:

### A) Pátrání (Two-Click) — `clue_system.rewards.on_confirm`

- Při **nových nebo upravených** stopách a párech: drž **`.cursor/rules/cases.mdc` — Two-Click, odstavec o exaktní realitě**: stopy z **hmatatelných údajů** (datum listu, text poznámky, promile, časová osa nahlášení–pád, penále, Kčs…), ne z čiré emoce.  
- Pokud je `clue_system.enabled: true` a existuje `on_confirm` pro `weak` / `medium` / `strong` **s odměnami**, u každé **úrovně, která může nastat** doplni pole **`narrative_lines`**: obvykle **3 krátké věty** v tónu „záznam z pátrání“.  
- **Neukládej** kód navíc — text musí být v rámci existujících odměn.  

### B) Lidský dopad u rozsudků

- U každé **viditelné varianty** ve `verdicts` přidej nebo zpřesni **dopady pro lidi** (Kolář, rodina, **Tučkova pozůstalá na Žižkově**, dělníci, firma, investor).  
- U odemykaných větví prefix `Alternativa: ...` tam, kde to tým chce.  
- Neměň `effects` bez pokynu týmu.  

### B2) Protokolární věta v předehře rozsudku (UI rámec)

- Před dopadovým textem běží v UI `Jménem republiky se vynáší tento rozsudek.` — `description` jako **navazující** věty.  
- **Soud** vyslovuje výrok (ne *„Ben zprošťuje“* místo soudu). Komentář soudce může být v jiné větě, pokud to struktura JSON dovolí.  
- Volitelně `effects.flags` / `bonus_inkoust_rano` dle `cases.mdc`.  

### C) `review_card` (volitelně)

- Jen když to dává děj; limity: `../scenar/Milniky-dynamika-akt1.md` §4. Insufficient s **výslechem ředitele / investora** je už v případu.  

### D) Konzistence a drobné opravy

- Unikátní `data-clue-id`. `knihovna` / `data-knihovna-id` jen dle `data/knihovna.json`. Překlep **zprošťuje** vs. *zpřošťuje*.  

### E) Nemanipuluj s tím, co není třeba

- Neměň `id`, `case_number` ani základní **flow** progresu, pokud tým nechce.  

## Výstup

- Jeden **kompletní** JSON objekt, **validní**, UTF-8, bez `//` komentářů.  

## Zadání týmu (doplň / zaškrtni) — **VYPLNĚNO pro `pool_a1_stavba`**

- **ID případu:** `pool_a1_stavba`  
- Přiložený JSON: *`docs/Pripady/pool_a1_stavba-Pad-ze-leseni.json` (Sp. zn. 85/1931, *Pád ze lešení*)*  
- Doplň: `[x]` sekce A – `clue_system` + stopy v textu + `narrative_lines` / `[x]` lidské dopady u verdictů (B, B2) / `[ ]` `review_card` / `[x]` soudní formulace (vč. *kdo* vyslovuje výrok) / `[x]` kontrola D + rozlišení *85/1931* (tento případ) vs. *86/1931* u `pool_a1_exekuce` v interních poznámkách, ne v narativu, pokud tým nechce  
- `world-reference.md` / Bible: *dle potřeby (Vinohrady, stavebnictví, krize).*  
- **Kontext slotu (bod 4):** `available_days` = **5–10**; kauza **morální dilema** (osobní vina vs. systém).

---

*Po vygenerování: nahraď položku v `data/pool_cases_akt1.json` (1:1 se schváleným JSON), ověř načtení hrou.*

---

## Soubory, které budeš asi potřebovat

| Soubor | K čemu |
|--------|--------|
| **`docs/Pripady/pool_a1_stavba-Pad-ze-leseni.json`** | Vstupní JSON. |
| **`data/pool_cases_akt1.json`** | Cíl po schválení. |
| **`data/knihovna.json`** | Při odkazech do Knihovny. |
| **`docs/pool_cases_akt1_prehled.md`** (§ Případ 9) | Shrnutí děje a témat. |
| **`docs/Pripady/pool_a1_nemocenska-…`**, **`pool_a1_zhar-…`** | Vzory `clue_system`. |
| **`docs/scenar/Mapa_20dni.csv`**, **`Milniky-dynamika-akt1.md`** | Dny 5–10, dynamika aktu. |
| **`.cursor/rules/cases.mdc`** | Kanon. |

---

## Rychlý bríf pro autora (1 odstavec)

Doplň spis o hmatatelné stopy a tři síly pátrání, které propojí **lékařské promile a nejistotu**, **Sýkorovo svědectví o čepu a návštěvě u mistra**, a **kontrolní list s datem, podpisem a vlastní poznámkou** — bez přepsání konfrontace, kde Kolář přizná rozhodnutí *počkat* pod tlakem. Rozsudky ať dávají dopad **Kolářově domácnosti, rodině Tučkově, firmě a investorovi**; u morálního spisu drž **střet osobní odpovědnosti s tlakem systému** s úředním chladem, ne paušální obviňování.

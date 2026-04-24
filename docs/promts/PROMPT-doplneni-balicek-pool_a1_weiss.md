# Balíček: doplnění pool případu `pool_a1_weiss` (Herr Weiss)

Tento soubor slouží k **jednorázovému zadání** pro AI: obsahuje **celý prompt** ve stejném znění jako `PROMPT-doplneni-stavajicich-pool-pripadu.md` a níže **vyplněné zadání týmu** pro případ *Herr Weiss*.

**K odeslání:** zkopíruj od sekce „Prompt: doplnění…“ až po konec včetně poznámky pod čarou, a **přilož** soubor `docs/Pripady/pool_a1_weiss-Herr-Weiss.json` (nebo vlož jeho obsah pod zadání).

**Cíl úprav (důležité):** položka v `pool_cases_akt1` u této kauzy **v současné verzi nemá** `clue_system`. Dotahujeme kauzu **na stejnou úroveň** jako *Nemocenský lístek* / *Žhářství na Smíchově* — **Two-Click** (označené stopy v textu, `pairs`, `narrative_lines` u odměn, hmatatelné údaje ve spisu), **lidské dopady u verdictů** (B, vč. B2, inkoust u větví dle vhodnosti a `cases.mdc`), soudní / úřední formulace v `description` tam, kde dává smysl (*Soud uznává obžalovaného…* / *zprošťuje* apod.), **beze změny záměru děje** a **bez** libovolného maření `effects`.

**Jádro děje (pro orientaci; neměň bez pokynu):** zadržení 22. 2. 1931 na **Masarykově nádraží**; **padělaný pas** *Max Weiss* (Liberec) vs **pravý** doklad *Max Schwarz* (Berlín); oba v **aktovce**; inspektor **Novák**; obžalovaný útěk z **Německa** (výpověď, synagoga, prodej bytu); **Božena Hošinská** / penzion; záznamy **Berlín** + **židovská obec**; kontradikce **dva doklady** a **nervozita vs. odmítnutí prohlídky**; po konfrontaci: **Schwarz** chtěl zůstat sám sebou, pas jako „klíč“ přes hranici, kniha s věnováním. `encyclopedia_links`: `zakon_na_ochranu_republiky`, `nemecka_mensina`, `nsdap`, `uprchlici` — v `data/knihovna.json` tato hesla zatím typicky **nejsou** (až encyklopedie / tým). Nová `data-knihovna-id` **neinventuj** bez souhlasu. Téma je **citlivé**; tón soudní a faktický, bez zjednodušující propagandy.

**Vzor ke struktuře:** `docs/Pripady/pool_a1_tiskarna-vzor_Nocni-smena.json`, `docs/Pripady/pool_a1_nemocenska-Nemocensky-listek.json`, `docs/Pripady/pool_a1_zhar-Zharstvi-na-Smichove.json` (po sloučení mechaniky).

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
4. U případu vázaného na **konkrétní den** zkontroluj `../scenar/Mapa_20dni.csv` a `../scenar/Milniky-dynamika-akt1.md`, aby tón a intenzita (Mor/Pol, *Patrani_navrh*) seděly k plánované dynamice 2. poloviny aktu — bez měnění čísel v efektech, pokud tým neřekne jinak. (*Herr Weiss* dle přehledu: signál k příchodu z Německa / reakce politiky — bez měnění čísel v efektech bez týmu.)

## Co doplnit / zkontrolovat (mechanika a kvalita)

Dle projektových pravidel a mechanik ve hře prověř a **doplněk tam, kde chybí**:

### A) Pátrání (Two-Click) — `clue_system.rewards.on_confirm`

- Při **nových nebo upravených** stopách a párech: drž **`.cursor/rules/cases.mdc` — Two-Click, odstavec o exaktní realitě**: stopy a správné páry z **hmatatelných údajů** ve spise (data na dokladech, místo zadržení, jméno v rejstříku, text věnování, číslo paragrafu, datum…), ne z čistě emočních vět.  
- Pokud je `clue_system.enabled: true` a existuje `on_confirm` pro `weak` / `medium` / `strong` **s odměnami**, u každé **úrovně, která může nastat** doplni pole **`narrative_lines`**: obvykle **3 krátké věty** v tónu „záznam z pátrání“ — reagují na to, co hráč spojil, **neprozrazuj** přímo řešení, gradují od slabší jistoty po silnější.  
- **Neukládej** kód navíc — text musí být v rámci existujících odměn.  

### B) Lidský dopad u rozsudků

- U každé **viditelné varianty** ve `verdicts` (pool) přidej nebo zpřesni, aby rezonovaly **důsledky pro lidi** (obžalovaný, **Hošinská**, inspektor, případně odkaz na rodinu v zázemí / deportaci / azyl).  
- U odemykaných větví prefix v `label` jako `Alternativa: ...` tam, kde to tým chce.  
- Neměň `effects` bez pokynu týmu.  

### B2) Protokolární věta v předehře rozsudku (UI rámec)

- Před dopadovým textem běží v UI `Jménem republiky se vynáší tento rozsudek.` — `description` jako **navazující** věty.  
- Volitelně `effects.flags` / `bonus_inkoust_rano` u větví dle `cases.mdc`.  

### C) `review_card` (volitelně)

- Jen když to dává děj; limity: `../scenar/Milniky-dynamika-akt1.md` §4. Insufficient s **diplomatickou cestou** je už v případu.  

### D) Konzistence a drobné opravy

- Unikátní `data-clue-id`. `knihovna` / `data-knihovna-id` jen dle `data/knihovna.json`. Pozor na překlepy u **zprošťuje** (ne *zpřošťuje*).  

### E) Nemanipuluj s tím, co není třeba

- Neměň `id`, `case_number` ani základní **flow** progresu, pokud tým nechce.  

## Výstup

- Jeden **kompletní** JSON objekt, **validní**, UTF-8, bez `//` komentářů.  

## Zadání týmu (doplň / zaškrtni) — **VYPLNĚNO pro `pool_a1_weiss`**

- **ID případu:** `pool_a1_weiss`  
- Přiložený JSON: *`docs/Pripady/pool_a1_weiss-Herr-Weiss.json` (Sp. zn. 83/1931, *Herr Weiss*)*  
- Doplň: `[x]` sekce A – `clue_system` + stopy v textu + `narrative_lines` / `[x]` lidské dopady u verdictů (B, B2) / `[ ]` `review_card` / `[x]` soudní / úřední formulace u rozsudcích apod. / `[x]` kontrola D  
- `world-reference.md` / Bible: *dle potřeby (německá menšina, uprchlíci, ochrana republiky).*  
- **Kontext slotu (bod 4):** `available_days` = **2–5**; první signál *příchozích z Německa*; tón *cizinecké oddělení / nádraží / osud jednoho člověka v mezeře zákona*.

---

*Po vygenerování: nahraď položku v `data/pool_cases_akt1.json` (1:1 se schváleným JSON), ověř načtení hrou.*

---

## Soubory, které budeš asi potřebovat

| Soubor | K čemu |
|--------|--------|
| **`docs/Pripady/pool_a1_weiss-Herr-Weiss.json`** | Vstupní JSON. |
| **`data/pool_cases_akt1.json`** | Cíl po schválení. |
| **`data/knihovna.json`** | Při odkazech do Knihovny. |
| **`docs/Pripady/pool_a1_nemocenska-Nemocensky-listek.json`**, **`pool_a1_zhar-…json`** | Vzory `clue_system`. |
| **`docs/scenar/Mapa_20dni.csv`**, **`Milniky-dynamika-akt1.md`**, **`docs/pool_cases_akt1_prehled.md`** (§ případ 8) | Kontext aktu a návaznost na *Vlčkův dopis* u alternativy. |
| **`.cursor/rules/cases.mdc`** | Kanon. |

---

## Rychlý bríf pro autora (1 odstavec)

Doplň spis o hmatatelné stopy a tři síly pátrání, které propojí **data na dokladech**, **chování na nádraží a u prohlídky aktovky**, záznamy o **původu z Berlína** a **důkaz identity** (kniha, věnování) — bez převyprávění odhalení po konfrontaci. Rozsudky dotáhni k dopadu na **Schwarzovu budoucnost v ČSR**, **Hošinskou**, **stát a „pořádek“**; cíl je sjednotit tón a mechaniku s ostatními doplňovanými kauzami, citlivě k tématu uprchlíků a menšin.

# Balíček: doplnění pool případu `pool_a1_stara_rana` (Stará rána)

Tento soubor slouží k **jednorázovému zadání** pro AI: obsahuje **celý prompt** ve stejném znění jako `PROMPT-doplneni-stavajicich-pool-pripadu.md` a níže **vyplněné zadání týmu** pro případ *Stará rána*.

**K odeslání:** zkopíruj od sekce „Prompt: doplnění…“ až po konec včetně poznámky pod čarou, a **přilož** soubor `docs/Pripady/pool_a1_stara_rana-Stara-rana.json` (nebo vlož jeho obsah pod zadání).

**Cíl úprav (důležité):** položka v `pool_cases_akt1` u této kauzy **nemá v současné verzi** `clue_system`. Dotahujeme kauzu **na stejnou úroveň** jako *Nemocenský lístek* / *Rozbité výlohy* — **Two-Click** (`narrative_lines` u odměn, hmatatelné stopy v textu), **lidské dopady u verdiktů** (B, vč. B2, inkoust dle vhodnosti u morální kauzy), soudní formulace v **description** (aktiv soud, ne *„obžalovaná se uznává vinnou“* místo soudu), **beze změny záměru děje** a **bez** libovolného maření `effects`.

**Jádro děje (pro orientaci; neměň bez pokynu):** § 152, domácí násilí v rámu schodů — **Marie Hofrová**, manžel **Václav Hofr**, dcera **Jitka**; zlomenina předloktí, rozpor „strčila“ vs. pád; **prasknutí před pádem**; alkohol **2,6 ‰** vs. *dvě sklenky*; **staré zlomeniny** a **policejní výjezdy** 1928/1930; po konfrontaci fyzický konflikt / úchop zápěstí. `encyclopedia_links`: `zizkov`, `socialni_pece`, `postaveni_zen` — `data/knihovna.json` při nových odkazech.

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

- Při **nových nebo upravených** stopách a párech: drž **`.cursor/rules/cases.mdc` — Two-Click, odstavec o exaktní realitě**: stopy a správné páry z **hmatatelných údajů** ve spise (čas, číslo, místo, záznam…), ne z čistě emočních / neprokazatelných vět.  
- Pokud je `clue_system.enabled: true` a existuje `on_confirm` pro `weak` / `medium` / `strong` **s odměnami** (nebo očekáváme tři úrovně sily dle párů), u každé **úrovně, která může nastat** doplni pole **`narrative_lines`**: obvykle **3 krátké věty** v tónu „záznam z pátrání“ — reagují na to, co hráč spojil, **neprozrazuj** přímo řešení, gradují od slabší jistoty po silnější.  
- **Neukládej** kód navíc — text musí být v rámci existujících odměn. Pokud u některé sily pár není, danou větev nemusíš plnit.  

### B) Lidský dopad u rozsudků

- U každé **viditelné varianty** ve `verdicts` (pool: `label`, `description`, případně `consequence` tam kde je) přidej nebo zpřesni, aby u **hráče** rezonovalo **důsledky pro lidi** (obžalovaná, dcera, manžel) — ne jen suchý paragraf.  
- Pokud je varianta odemykaná, prefix v `label` jako `Alternativa: ...` (ne `Průzkum:` / `Doplnění:`), pokud to u této větve tým chce.  
- Neměň `effects` / číselné klíče bez pokynu týmu.  
- Text drž v **soudním, úředním tónu** 30. let.

### B2) Protokolární věta v předehře rozsudku (UI rámec)

- Před dopadovým textem běží v UI `Jménem republiky se vynáší tento rozsudek.` — piš `description` jako **navazující** konkrétní věty.  
- Volitelně `effects.flags` / `bonus_inkoust_rano` u alternativ, když to sedí; u této kauzy už u jedné větve může být `+2` u alternativy — srovnej s ostatními doplňky.

### C) `review_card` (volitelně)

- Jen když to dává děj nebo tým v zadání. Limity: `../scenar/Milniky-dynamika-akt1.md` §4.

### D) Konzistence a drobné opravy

- Unikátní `data-clue-id`. `knihovna` a `data-knihovna-id` dle `data/knihovna.json`.

### E) Nemanipuluj s tím, co není třeba

- Neměň `id`, `case_number` ani základní **flow** progresu, pokud tým nechce.

## Výstup

- Jeden **kompletní** JSON objekt, **validní**, UTF-8, bez `//` komentářů.  
- Mimo JSON volitelné **1–3 věty** shrnutí, pokud tým chce; jinak **pouze JSON**.

## Zadání týmu (doplň / zaškrtni) — **VYPLNĚNO pro `pool_a1_stara_rana`**

- **ID případu:** `pool_a1_stara_rana`  
- Přiložený JSON: *`docs/Pripady/pool_a1_stara_rana-Stara-rana.json` (Sp. zn. 79/1931, *Stará rána*)*  
- Doplň: `[x]` sekce A – `clue_system` + `narrative_lines` / `[x]` lidské dopady u verdictů (B, B2) / `[ ]` `review_card` / `[x]` soudní formulace u odsouzení (*Soud uznává obžalovanou…* apod., ne pasiv u obžalované jako soud) / `[x]` kontrola D  
- `world-reference.md` / Bible: *dle potřeby.*  
- **Kontext dne (bod 4):** `available_days` = **7–10**; v `data/days.json` 2. týden vedle ostatních pool kauz (např. *Nemocenský lístek*). V `Mapa_20dni.csv` **Den 9 (12. 3.)** – vedlejší slot *Pool: domácí násilí* (morální vrstva), *Patrani_navrh* = `stress_navaz_revize_limit_viz_MD`, tón domácnost / Žižkov / důvěryhodnost výpovědí, bez měnění `effects` bez týmu.

---

*Po vygenerování: nahraď položku v `data/pool_cases_akt1.json`, ověř načtení hrou.*

---

## Soubory, které budeš asi potřebovat

| Soubor | K čemu |
|--------|--------|
| **`docs/Pripady/pool_a1_stara_rana-Stara-rana.json`** | Vstupní JSON. |
| **`data/pool_cases_akt1.json`** | Cíl po schválení. |
| **`data/knihovna.json`** | Při odkazech do Knihovny. |
| **`docs/Pripady/pool_a1_nemocenska-Nemocensky-listek.json`**, **`pool_a1_vytrznost-…`** | Vzory `clue_system`. |
| **`docs/scenar/Mapa_20dni.csv`**, **`Milniky-dynamika-akt1.md`** | Den 9, stres, revize. |
| **`data/days.json`** | 2. týden pool. |
| **`.cursor/rules/cases.mdc`** | Kanon. |

---

## Rychlý bríf pro autora (1 odstavec)

Doplň spis o hmatatelné stopy a tři síly pátrání, které propojí **alkohol v krvi**, **policejní historii domu**, **prasknutí v čase před pádem** a **lékařský opis zranění**; rozsudky až k dopadu na **Marie, Jitku a Václava** a k otázce obrany vs. útoku; **nepřepisuj** konfrontaci a odhalení u Jitky — cíl je sjednotit text a mechaniku s ostatními doplňovanými kauzami, citlivě k tématu domácího násilí a úřednímu tónu.

# Balíček: doplnění pool případu `pool_a1_vytrznost` (Rozbité výlohy)

Tento soubor slouží k **jednorázovému zadání** pro AI: obsahuje **celý prompt** ve stejném znění jako `PROMPT-doplneni-stavajicich-pool-pripadu.md` a níže **vyplněné zadání týmu** pro případ *Rozbité výlohy*.

**K odeslání:** zkopíruj od sekce „Prompt: doplnění…“ až po konec včetně poznámky pod čarou, a **přilož** soubor `docs/Pripady/pool_a1_vytrznost-Rozbite-vylohy.json` (nebo vlož jeho obsah pod zadání).

**Cíl úprav (důležité):** položka v `pool_cases_akt1` u této kauzy **nemá v současné verzi** `clue_system`; texty u rozsudků jsou spíš věcné, ne protokolárně „navázané“ v plné šíři. Dotahujeme kauzu **na stejnou úroveň** jako u *Závadného plakátu* (po doplňku) / tiskárny / lékárny — tedy **Two-Click** (`narrative_lines` u odměn, exaktní stopy), **lidské dopady u verdiktů** (B, vč. B2) a odpovědné dávkování `bonus_inkoust_rano` dle děje, **beze změny záměru děje** a **bez** libovolného maření `effects` (číselné klíče drž tým, pokud neurčí jinak).

**Jádro děje (pro orientaci; neměň bez pokynu):** výtržnictví a poškození cizí věci (§ 314) — student Šimánek, výloha prodejny J. Meisela na Vodičkové, strážmistr Turek, dlažební kostka, střepy na klopě, rozpor s „kostkou sebral ze země“; evidenční kniha UK vs tvrzení o přednášce, schůzka v Kavárně Slavia s časem; (po konfrontaci) účast u výlohy, hod kostkou třetí osobou **Novotný (spolek)**, pouto k **Haně Meiselové**; pole `encyclopedia_links` na Knihovnu (zákon, spolky, antisemitismus) — při doplňování odkazů v textu křesť `data/knihovna.json`.

**Vzor ke struktuře:** `docs/Pripady/pool_a1_tiskarna-vzor_Nocni-smena.json`, `docs/Pripady/pool_a1_vyveseni-Zavadny-plakat.json`, plná kauza `pool_a1_lekarna-Redeni-leku.json` / `pool_a1_vyveseni`.

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

- Při **nových nebo upravených** stopách a párech: drž **`.cursor/rules/cases.mdc` — Two-Click, odstavec o exaktní realitě**: stopy a správné páry z **hmatatelných údajů** ve spise (čas, číslo, místo, záznam…), ne z čistě emočních / neprokazatelných vět. Viz příklady *dobře* vs *špatně* v pravidlech.  
- Pokud je `clue_system.enabled: true` a existuje `on_confirm` pro `weak` / `medium` / `strong` **s odměnami** (nebo očekáváme tři úrovně sily dle párů), u každé **úrovně, která může nastat** doplni pole **`narrative_lines`**: obvykle **3 krátké věty** v tónu „záznam z pátrání“ — reagují na to, co hráč spojil, **neprozrazuj** přímo řešení, gradují od slabší jistoty po silnější.  
- **Neukládej** kód navíc — text musí být v rámci existujících odměn. Pokud u některé sily pár není, danou větev nemusíš plnit.  
- Inspirace strukturou: případy, kde je to hotové (např. *lékárna* = tři síly; *tiskárna* = alespoň u `strong`).

### B) Lidský dopad u rozsudků

- U každé **viditelné varianty** ve `verdicts` (pool: `label`, `description`, případně `consequence` tam kde je) přidej nebo zpřesni, aby u **hráče** rezonovalo **důsledky pro lidi** (obžalovaný, rodina, poškození) — ne jen suchý paragraf nebo abstraktní čísla.  
- Pokud je varianta zamýšlená jako odemykaná (skrytá), drž prefix v `label` jako `Alternativa: ...` (ne `Průzkum:` ani `Doplnění:`).  
- U alternativních variant klidně drž nižší přímý finance efekt, ale posil dopad do rysů/frakcí/pověsti, aby byly herně atraktivní jinak než penězi.  
- Neměň `effects` / číselné klíče bez pokynu týmu.  
- Text drž v **soudním, úředním tónu** 30. let.

### B2) Protokolární věta v předehře rozsudku (UI rámec)

- Před dopadovým textem běží v UI generická věta `Jménem republiky se vynáší tento rozsudek.` — proto piš `consequence` / `description` jako **navazující případovou větu**, ne jako druhou generickou formuli.  
- Volitelně můžeš u alternativ přidat `effects.flags` s bonusem inkoustu na další ráno (`bonus_inkoust_rano`: 1, výjimečně 2), jen když to dává narativně smysl.  
- Pokud flag přidáš, ověř v textu varianty, že dává smysl i jako viditelný hint (`Inkoust: +1/+2 do dalšího pracovního dne`).  
- Při dávkové úpravě více případů drž orientačně cíl ~60 % alternativních větví s tímto bonusem (většina `+1`, menšina `+2`).

### C) `review_card` (volitelně)

- Pokud má případ v budoucnu **vrátit se k revizi** dle dějové linky, doplni vhodný blok `review_card` dle kuchařky (summary_short, option_a, option_b…). **Nepřidávej** náhodné revize, jen když to dává děj nebo tým v zadání. Celková **frekvence revizí** v kampani drž limity z `../scenar/Milniky-dynamika-akt1.md` §4 (aby revize nezahltily nové případy ve 2. polovině aktu).

### D) Konzistence a drobné opravy

- Ověř **unikátnost `data-clue-id`** v rámci případu.  
- Zkontroluj, že `knihovna-link` s `data-knihovna-id` odkazuje na hesla, která **existují** v `data/knihovna.json` (neinventuj nové ID bez týmu). Případ má kořenové **`encyclopedia_links`** — při rozšíření o odkazy v těle textu to sladit s těmito id nebo rozhodnout s týmem.  
- Sjednoť tón a čas u výpovědí, pokud tým požádal o **lehkou redakci** — bez změny faktického střetu.

### E) Nemanipuluj s tím, co není třeba

- Neměň `id`, `case_number` ani základní **flow** progresu, pokud to zadání nechce.  
- Nepřidávej druhou kopii stávajících vět — jen doplňky.

## Výstup

- Jeden **kompletní** JSON objekt (jako původní případ), s doplněnými poli.  
- **Validní JSON**, UTF-8, české znaky, žádné `//` komentáře.  
- Na začátku odpovědi (mimo JSON) může být **1–3 věty** shrnutí změn, pokud tým chtěl; pokud ne, vrať **pouze JSON**.

## Zadání týmu (doplň / zaškrtni) — **VYPLNĚNO pro `pool_a1_vytrznost`**

- **ID případu (nezamění):** `pool_a1_vytrznost`  
- Přiložený **zdrojový JSON** (celý objekt): *`docs/Pripady/pool_a1_vytrznost-Rozbite-vylohy.json` (Sp. zn. 67/1931, titulek *Rozbité výlohy*) — vlož celý obsah souboru nebo soubor přilož.*  
- Doplň: `[x]` sekce A — **`clue_system` (nově)** + `narrative_lines` u `on_confirm` (navrhni a doplníš; stopy v textech výpovědí / záznamů, `<span class="clue" …>`, unikátní `data-clue-id`: např. čas služby, čas ukončení v Slavii, vzdálenost střepů, neobsazenost přednášky 28. 2., střepy na klopě) / `[x]` lidské dopady u verdictů (B, vč. B2 a inkoust dle vhodnosti) / `[ ]` review_card (jen dle týmu) / `[ ]` lehká redakce textů bez změny děje (volitelně) / `[x]` jiné: kontrola D; **drž jména** (Turek, Meisel, Meiselová, Šimánek) a spolkovou rovinu s **Novotným** jen podle původních textů (včetně konfrontace)  
- Story Bible / `world-reference.md`: *dle potřeby; pro částky škody (120/80/30 Kč) a město drž reálie 1931.*  
- **Kontext dne (bod 4 u Vstupu):** kauza je v `data/days.json` ve **druhém týdnu** vedle jiných pool věcí; `available_days` = **3–6**. V `Mapa_20dni.csv` u **Dne 5 (6. 3.)** jde o **morální tón** a **první Mor** ve slotu, pozn. k Haasovi v záznamech; *Patrani_navrh* = `prvni_Mor_navaz_D6` — tón: napětí ve městě, spolky, student, poměr jednotlivec vs. organizace, bez měnění čísel v `effects` bez týmu.

---

*Po vygenerování: nahraď položku s daným `id` v `data/pool_cases_akt1.json`, ověř načtení hrou, aktualizuj `docs/pool_cases_akt1_prehled.md` jen při zásahu do dějového shrnutí.*

---

## Soubory, které budeš asi potřebovat

| Soubor | K čemu |
|--------|--------|
| **`docs/Pripady/pool_a1_vytrznost-Rozbite-vylohy.json`** | Vstupní JSON (příloha k promptu). |
| **`data/pool_cases_akt1.json`** | Cíl po schválení — nahradit stejnou položku. |
| **`data/knihovna.json`** | Při `encyclopedia_links` / `data-knihovna-id`. |
| **`docs/Pripady/pool_a1_tiskarna-vzor_Nocni-smena.json`**, **`docs/Pripady/pool_a1_vyveseni-Zavadny-plakat.json`**, **`docs/Pripady/pool_a1_lekarna-Redeni-leku.json`** | Vzory `clue_system` + `narrative_lines`. |
| **`docs/scenar/Mapa_20dni.csv`**, **`docs/scenar/Milniky-dynamika-akt1.md`** | Den 5 / morální vrstva (Vstup bod 4). |
| **`data/days.json`** | Zařazení pool kauz ve 2. týdnu. |
| **`docs/world-reference.md`** nebo **Story Bible** | Reálie a ceny, volitelně. |
| **`.cursor/rules/cases.mdc`** | Kanon polí; mimo Cursor tento text přilož. |

Ne nutné posílat celé do chatu, pokud máš **otevřený repozitář** v Cursoru; stačí napsat, že se má AI řídit těmito cestami.

---

## Rychlý bríf pro autora (1 odstavec)

Doplň tento spis o **důkazní hmatatelné** stopy a tři úrovně síly (weak/medium/strong), které vycházejí z fyzikálního rozpory střepů, časových a fakultních záznamů a ze sociálního tření kolem spolku a prodejny; rozsudky až do konkrétního dopadu na studenta, pekaře/rodinu, Hanu Meiselovou a veřejný mír — **nepřepisuj odhalení po konfrontaci a nevynechvej, že fyzika střepů a účast u skla jsou středem důkazů**; cíl je sjednotit tón a mechaniku s ostatními doplňovanými pool kauzami.

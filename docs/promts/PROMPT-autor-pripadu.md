# Prompt: autor jednoho pool případu (IN DUBIO, Akt 1)

Následující text zkopíruj celý, nahraď zástupné značky **XXX** a případné doplňky, které ti dá tým. Potom tento upravený text použij jako zadání pro generování **jednoho** JSON objektu případu.

**Doplňování starších pool případů** (stejné `id`, nové `narrative_lines`, lidštější rozsudky, …) — jiný prompt: [`PROMPT-doplneni-stavajicich-pool-pripadu.md`](./PROMPT-doplneni-stavajicich-pool-pripadu.md).

## Kontext, který model potřebuje mimo tento text

- Tento soubor dává **pravidla, strukturu, tón a očekávání výstupu**. Není v něm **svět, postavy ani ceny** — to přilož zvlášť.  
- **Doporučené přílohy** (nepovinně všechny, podle týmu): [`../world-reference.md`](../world-reference.md) (ceny, reálie 1931), [`../../data/knihovna.json`](../../data/knihovna.json) (hesla u odkazů), [`../../data/characters.json`](../../data/characters.json) (konkrétní NPC), řádek z [`../scenar/Mapa_20dni.csv`](../scenar/Mapa_20dni.csv) (včetně sloupců *Modif_dne*, *Vecer_doplnek*, *Patrani_navrh*) + [`../scenar/Pripady.csv`](../scenar/Pripady.csv) pro daný den, přehled [`../scenar/Milniky-dynamika-akt1.md`](../scenar/Milniky-dynamika-akt1.md), vzorový JSON [`../Pripady/pool_a1_tiskarna-vzor_Nocni-smena.json`](../Pripady/pool_a1_tiskarna-vzor_Nocni-smena.json).  
- **Story Bible (kanon lore):** soubor `docs/InDubio_StoryBible_v2_Cursor.txt` (v2.1). Přilož ho k zadání, pokud generuješ děj navázaný na postavy nebo metapříběh; u čistě „poolových“ kauz může stačit `world-reference.md` + tým. Pravidla mechanik spisu: **`.cursor/rules/cases.mdc`**.

## Třetí spis a spis light (plánovaný obsah Aktu 1)

- **Třetí spis** na stole až od **15. herního dne** (začátek 3. týdne). Kanonický popis: `.cursor/rules/cases.mdc` (sekce *Třetí spis na stole*, *Spis light*); v Knihovně jde o text v záložce **Pravidla** (bloky stejného jména), ne o slovníková hesla.
- Když tým zadává **třetí / dodatečnou kauzu**, piš ji do **`data/pool_cases_light_akt1.json`** (pole `pool_cases_light_akt1`), **ne** do hlavního `data/pool_cases_akt1.json`, pokud výslovně nejde o plný případ.
- V kořeni objektu případu vždy **`"case_profile": "light"`** a `id` s doporučeným prefixem **`pool_light_a1_`** (nesmí kolidovat s `pool_a1_*`).
- **Spis light:** kratší `description` (2–3 věty), **1–2** výpovědi, průzkum zjednodušit (často výslech + záznamy; konfrontace jen výjimečně), užší strom **`verdicts`** než u plné kauzy; `clue_system` volitelné, s méně falešnými stopami pokud zapnuto.
- Děj **nezávislý na hlavním příběhu** hry — žádné povinné plotové postavy z Bible jako nosič kauzy; atmosféra města a úřadu.
- V textu musí být **čitelný důvod**, proč úřad Benovi třetí věc přidělí (důvěra / delegace / naléhavost), ne „odměna za číslo“. Frakce (Moc/Lid/Kapital) mohou ovlivnit **nádech** věci; **primární** je důvěra instituce a reputace — viz pravidla.

---

Jsi **autor obsahu** pro soudní hru IN DUBIO (Československo, první republika, **březen 1931** = současnost děje hry). Důkazy, výpovědi, motivace a náhledy do kauzy smějí a mají pracovat s **minulostí** (kdekoli v 1. republice či dřív — roky, staré smlouvy, bývalé úřady) podle stavu spisu. Formální tón: **soudní protokol, úřední čeština**, nikoliv hovorová. Hráč není odměňován za to, že „odhalí všechna tajemství“ hned — tajemství sedí v **rozporech** mezi texty (srov. níže). Neprozrazuj v úvodu výsledek, nejmenuj otevřeně, kdo lže — hráč to dává dohromady z důkazů.

**Tvůrčí cíl:** kauza má působit jako **zkrácená soudní novela** — ne jako pouhý seznam faktů. Každá důležitá postava potřebuje **čitelnou motivaci** (i když tají nebo lže); důkazní a emoční kroky mají tvořit **logickou síť** a **zapletku** mezi vrstvami spisu. Kreativita slouží srozumitelnosti, morálnímu tření a napětí; v mezích úředního tónu a pravidel níže, ne dekoru bez obsahu.

**Pátrání (Two-Click):** pokud zapínáš `clue_system`, u každé stopy a každého páru v `pairs[]` se řiď **povahou exaktní reality** v `.cursor/rules/cases.mdc` (Two-Click — *Kvalita stop a párů*): stopy = konkrétní údaje ve spise, správný pár = rozpor nebo spoj dvou takových úlomků; ne párovat dva pocity nebo neprokazatelné dojmy.

## Úloha

Vytvoř **jeden** plný herní **objekt případu** (jedna položka v poli pool ve `pool_cases_akt1`) ve formátu **JSON** kompatibilním s tím, jak jsou napsané ostatní pool případy (oddělené klíče, UTF-8, lákopisné části s uvozovkami a českou diakritikou).

- **Název a identifikace (vyplní design):**  
  - vnitřní `id` případu: `XXX_id` (např. `pool_a1_…`, jedinečné v rámci aktu)  
  - `title` (nadpis u soudu): `XXX_title`  
  - `case_number`: `XXX_spis_zn` (např. `Sp. zn. XX/1931`, nesmí kolidovat s jinými v aktu)  
- **Kontext dne / slotu (doplň tým, nebo „pool“):** `XXX_kontext_dne` (např. *„den 4, slot 1, soudkyně Božena“* nebo *„pool, váhy dle stavu hry“*).

## Typ a barva (design určí)

- `type`: `XXX_typ` — v poolu se běžně používá `routine` nebo `moral_dilemma` (jiné hodnoty jen pokud v `data/pool_cases_akt1.json` už existují a `data-loader` je zná).  
- `color` / stínění: `XXX_color` (hex, např. rutinní `#C4A35A` — ověř u stejného typu v poolu).  
- `available_days` / `act` / `weight_conditions`: dle `XXX_metadata_dni` (pole čísel dní, číslo aktu, váhy). Chybí-li v zadání, doplň **rozumně** a konzistentně s dějem (žádné komentáře uvnitř JSON — neplatí `//` ani `/* */`).

## Obžaloba a fakt

- `defendant`: jméno, věk, profese, stručný `detail` — **XXX_obzalovany** nebo vymysle konzistentně.  
- `charge`: ustanovení a paragrafy fiktivně, ale důvěryhodně pro 30. léta.  
- `description`: 3–5 vět, **kdo co čelí**, nikoliv soudní rozsudek.  
- **Morální napětí:** napiš v jedné věti, co hraje proti komu **bez** jednoznačné odpovědi, kterou bys dal rovnou (hráč rozhodne rozsudkem).

## Svědectví

- 2–3 karty, každá 2–4+ věty, **různé barvy tónů** (svědek ≠ obhájce).  
- Minimálně **jeden skrytý rozpor** s jinou výpovědí (ne vysvětlovaný — hráč ho může najít pánem, dvojklikem na stopy, viz níže).  
- `data-clue-id` u `<span class="clue" …>`: **unikátní v rámci případu**, nikde duplicita stejného id na jiné věty (pravidlo z `cases.mdc`). Falešné stopy: rozumný počet.

## Pátrání (Two-Click) — volitelné, ale u pool případu typicky

- V mapě párů `clue_system`: `true_pair_id`, `pairs` (a_id, b_id, strength: weak|medium|strong), `decoys` (cizí stopy), případně `timed_hunt` a `rewards.on_confirm` vč. **volitelných** `narrative_lines` (3 krátké věty podle síly).  
- Pokud zadání **nechce** two-click, můžete `clue_system.enabled: false` — v tom případě odůvodni v písemném bríf, ne v JSON.  
- Technicky drž strukturu blíž příkladu v repu, např. kauza *pool_a1_tiskarna* (Noční směna) pro orchestraci — **nekopíruj její děj ani verdikty**, jen stavebnice polí.

## Průzkum a skrytá zjištění

- `hidden_info` jako u loaderu: výslech / záznamy / informátor / konfrontace s vhodnými `cost`, `id`, `reveal` texty; kde bývá, `dirty_unlock` a podobně.  
- Konzistence s tím, co má smysl odemknout po stopech (`unlock_actions`, `info_threshold`).

## Rozsudky (pool struktura: guilty / not_guilty / insufficient + varianty)

- Každá uvedená varianta má srozumitelné **popisy**; u variant přidej **krátkou větu lidského dopadu** (k čemu trest odsoudí obžalovaného / blízké) — není jen suchý paragraf.  
- U odemykaných variant používej prefix `Alternativa:` v `label` (nikdy `Průzkum:` / `Doplnění:`).  
- U „Alternativa“ variant může být záměrně nižší přímý finance efekt než u tradičního trestu, ale má mít výraznější dopad na rysy/frakce/pověst.  
- Nevkládej tři identické „šablony“ trestů; **ohledně citového i právního tónu** se může lišit u morálního a rutinního kádrů.  
- Srovnej `requires` (moudrost, odvaha) s designem, pokud jsou uvedeny v zadání `XXX_omezeni_rysy`.
- Předehra rozsudku má v UI generickou protokolární větu (`Jménem republiky se vynáší tento rozsudek.`); proto text varianty piš jako navazující konkrétní dopad (unikátní k případu).
- Volitelně může alternativa přidat bonus inkoustu na další ráno přes `effects.flags`, např. `{ "key": "bonus_inkoust_rano", "value": 1 }` nebo výjimečně `2`.
- Pokud použiješ `bonus_inkoust_rano`, počítej s tím, že se hráči ukáže přímo v hintu varianty jako `Inkoust: +1/+2 do dalšího pracovního dne`.
- V rámci celé sady pool případů mířit orientačně na ~60 % alternativních větví s inkoustovým bonusem; `+2` používej střídmě (silné nebo riskantní alternativy).

## Doplňovací rekvizity

- Noviny, dopisy, vlákno: **jen pokud** tým zadal `XXX_vedlejsi_arty` — jinak může být `narrative_link: null` / bez pole.  
- `bribe_amount` / `recurring` atd. jen dle bríf, ne vždy.

## Jazyk a faktory

- Čeština 30. let, nespoléhej na moderní žargon.  
- Frakce, rysy, finance v `consequences`/`effects` — čísla musí být **hmatatelná** a sladitelná s ekonomií hry (může být konzultováno, orientačně drž rozšířené ostatní případy v poolu).  
- **Nevytvářej** druhou kopii stejné kauzy „Noční směna / lékárna“ — **jiné jádro, jiné rozhodování, jiná rizika**.

## Výstup

- Vrať **pouze validní JSON**: jeden objekt `{ ... }` připravený být vložený jako další prvek v `"pool_cases_akt1": [ … ]` (bez ohraničujícího pole a bez textu mimo JSON).  
- Všechny vnořené stringy s českou diakritikou; žádné `//` komentáře.  
- Pokud něco v zadání chybí, doplň sjednoceně a **konzervativně** a v jedné věti mimo JSON (až tým nepoužije AI bez meta-výstupu) — **pokud výstup musí být jen JSON**, doplň bez vysvětlení, ale nespoléhej na to, že tým bude doplňky číst z konzole.

## Zadání týmu (doplň místo XXX, zbytek smaž/aktualizuj)

- **Povinné od designu:**  
  - `XXX_id` = …  
  - `XXX_spis_zn` = …  
  - `XXX_title` = …  
  - `XXX_typ` = …  
- **Dějová osa (3–5 vět):** …  
- **Kdo nesmí být 1:1 jako u případu Tiskárna / Lékárna:** (vyvarovat se) …  
- **Haas / politika / rodina:** (ano/ne, jak) …  
- **Two-clik ano/ne:** …  
- **Cíl obtížnosti (orientačně):** lehký / střední / těžký soud …  

---

*Konec kapitoly k kopírování. Po vygenerování ukládej do `docs/Pripady/<id>.json` a následně vlož do `data/pool_cases_akt1.json` a přehledu.*

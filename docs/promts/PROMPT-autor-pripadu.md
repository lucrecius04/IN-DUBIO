# Prompt: autor jednoho pool případu (IN DUBIO, Akt 1)

Následující text zkopíruj celý, nahraď zástupné značky **XXX** a případné doplňky, které ti dá tým. Potom tento upravený text použij jako zadání pro generování **jednoho** JSON objektu případu.

**Doplňování starších pool případů** (stejné `id`, nové `narrative_lines`, lidštější rozsudky, …) — jiný prompt: [`PROMPT-doplneni-stavajicich-pool-pripadu.md`](./PROMPT-doplneni-stavajicich-pool-pripadu.md).

## Kontext, který model potřebuje mimo tento text

- Tento soubor dává **pravidla, strukturu, tón a očekávání výstupu**. Není v něm **svět, postavy ani ceny** — to přilož zvlášť.  
- **Doporučené přílohy** (nepovinně všechny, podle týmu): [`../world-reference.md`](../world-reference.md) (ceny, reálie 1931), [`../analyza_soudni_reci_1925-1935.md`](../analyza_soudni_reci_1925-1935.md) (tón soudní řeči, obraty, čemu se vyhnout), [`../../data/knihovna.json`](../../data/knihovna.json) (hesla u odkazů), [`../../data/characters.json`](../../data/characters.json) (konkrétní NPC), řádek z [`../scenar/Mapa_15dni.csv`](../scenar/Mapa_15dni.csv) (datum, sloty, *Poznamky*) + [`../scenar/Pripady_15dni.csv`](../scenar/Pripady_15dni.csv) pro daný den, přehled [`../scenar/Milniky-dynamika-akt1.md`](../scenar/Milniky-dynamika-akt1.md), vzorový JSON [`../Pripady/pool_a1_tiskarna-vzor_Nocni-smena.json`](../Pripady/pool_a1_tiskarna-vzor_Nocni-smena.json).  
- **Povinná minimální příloha při generování:** vždy přilož alespoň jeden typizovaný vzorový případ (`pool_a1_tiskarna-vzor_Nocni-smena.json` nebo jiný schválený vzor z `docs/Pripady/`), aby autor držel kompatibilní strukturu JSON.
- **Story Bible (kanon lore):** soubor `docs/InDubio_StoryBible_v2_Cursor.txt` (v3.0, 15 prac. dní). Přilož ho k zadání, pokud generuješ děj navázaný na postavy nebo metapříběh; u čistě „poolových“ kauz může stačit `world-reference.md` + tým. Pravidla mechanik spisu: **`.cursor/rules/cases.mdc`**.

## Před startem generování (rychlá kontrola připravenosti)

Než model začne psát JSON, ověř 4 body:

1. **Mapa dne sedí na typ případu:** vybraný den v `Mapa_15dni.csv` odpovídá zamýšlenému typu (`routine` / `moral_dilemma` / případně později `political` / `personal`), a nepopírá milníky z `Milniky-dynamika-akt1.md`.
2. **Nejedeš duplicitu hotových kauz:** zkontroluj `docs/pool_cases_akt1_prehled.md` a vyhni se stejnému jádru (např. pojistka těsně před smrtí, exekutor s doručenkou, žhářství + syn na dvoře, padělané doklady na hranici).
3. **Mechanika je v kanonu:** two-click, soft-fail pravidlo a odemykání variant odpovídají `.cursor/rules/cases.mdc`.
4. **Příběh má vlastní stopu:** nový případ musí mít vlastní profesní prostředí, jiný typ důkazu a jinou osu morálního tření než poslední 2–3 hotové případy.
5. **Týden a tón trestu:** ověř v **`.cursor/rules/cases.mdc`** sekce *Pool — trestní náročnost vs. týden*, *Pool — rebus / nejasné kauzy (3. týden)* a případně *Pool — netradiční modely* — `available_days` a závažnost obžaloby mají sedět na zamýšlený herní týden (1. týden lehčí; 2.–3. týden smí občas přijít těžší násilí / smrt v obžalobě; rebus 1–2× ve 3. týdnu).  
   V 15denní kampani ber týdenní rámec explicitně: **1. týden = dny 1–5, 2. týden = dny 6–10, 3. týden = dny 11–15**.

## Nové pool kauzy — spolupráce s agentem

Když budete chtít **vygenerovat nebo rozplánovat nové případy**, napište v chatu stručně např.: *„Potřebujeme pool prompt podle `cases.mdc` — [téma / den / slot / rebus ano-ne]“*. Agent má v pravidlech rámec **týdnů, trestní náročnosti, rebusů a netradičních modelů** a naváže tento prompt + `CHECKLIST-QA-pool-pripad.md`.

## Třetí spis a spis light (aktuální obsah Aktu 1)

- **Třetí spis** na stole od **2. týdne kalendáře** (podmíněně; přesné chování řídí `days.json` + `cases_light` a implementace v `cases.js`/`engine.js`). Kanonický popis: `.cursor/rules/cases.mdc` (sekce *Třetí spis na stole*, *Spis light*); v Knihovně jde o text v záložce **Pravidla** (bloky stejného jména), ne o slovníková hesla.
- **Spis light = primárně zkrácená varianta** stejného druhu kauzy jako v hlavním poolu (`pool_a1_*`): kratší texty, 1–2 svědci, užší verdikty, bez vlečení pilířových postav z metapříběhu. Technicky může být v `pool_cases_akt1.json` s `case_profile: "light"` + odkaz v `days.json`, nebo ve sdíleném `pool_cases_light_akt1.json` — viz `cases.mdc`.
- Když tým zadává **třetí / dodatečnou kauzu**, ukládej ji dle pravidel výše; nasazení do runtime vždy slaď s `days.json` (`cases_light`) a loaderem.
- V kořeni objektu případu vždy **`"case_profile": "light"`** a `id` s doporučeným prefixem **`pool_light_a1_`** (nesmí kolidovat s `pool_a1_*`).
- **Spis light:** kratší `description` (2–3 věty), **1–2** výpovědi, průzkum zjednodušit (často výslech + záznamy; konfrontace jen výjimečně), užší strom **`verdicts`** než u plné kauzy; `clue_system` volitelné, s méně falešnými stopami pokud zapnuto.
- Děj **nezávislý na hlavním příběhu** hry — žádné povinné plotové postavy z Bible jako nosič kauzy; atmosféra města a úřadu.
- V textu musí být **čitelný důvod**, proč úřad Benovi třetí věc přidělí (důvěra / delegace / naléhavost), ne „odměna za číslo“. Frakce (Moc/Lid/Kapital) mohou ovlivnit **nádech** věci; **primární** je důvěra instituce a reputace — viz pravidla.

---

Jsi **autor obsahu** pro soudní hru IN DUBIO (Československo, první republika, **březen 1931** = současnost děje hry). Důkazy, výpovědi, motivace a náhledy do kauzy smějí a mají pracovat s **minulostí** (kdekoli v 1. republice či dřív — roky, staré smlouvy, bývalé úřady) podle stavu spisu. Formální tón: **soudní protokol, úřední čeština**, nikoliv hovorová — drž se konkrétního rámce v [`../analyza_soudni_reci_1925-1935.md`](../analyza_soudni_reci_1925-1935.md) (jako příloha k zadání). Hráč není odměňován za to, že „odhalí všechna tajemství“ hned — tajemství sedí v **rozporech** mezi texty (srov. níže). Neprozrazuj v úvodu výsledek, nejmenuj otevřeně, kdo lže — hráč to dává dohromady z důkazů.

**Tvůrčí cíl:** kauza má působit jako **zkrácená soudní novela** — ne jako pouhý seznam faktů. Každá důležitá postava potřebuje **čitelnou motivaci** (i když tají nebo lže); důkazní a emoční kroky mají tvořit **logickou síť** a **zapletku** mezi vrstvami spisu. Kreativita slouží srozumitelnosti, morálnímu tření a napětí; v mezích úředního tónu a pravidel níže, ne dekoru bez obsahu.

**Pátrání (Two-Click):** pokud zapínáš `clue_system`, u každé stopy a každého páru v `pairs[]` se řiď **povahou exaktní reality** v `.cursor/rules/cases.mdc` (Two-Click — *Kvalita stop a párů*): stopy = konkrétní údaje ve spise, správný pár = rozpor nebo spoj dvou takových úlomků; ne párovat dva pocity nebo neprokazatelné dojmy.
U silné dvojice vždy zajisti, aby šla přirozeně vysvětlit jednou větou („A odporuje/potvrzuje B“) a působila férově i pro hráče, který čte případ poprvé.

## Anti-repetice (povinné)

Aby nové případy nepůsobily jako variace existujících 10 kusů:

- Nerecykluj stejný **trigger incidentu** ve dvou po sobě jdoucích návrzích (např. zase požár, zase pojistný podvod, zase doručení/exekuce, zase padělaný doklad).
- Nerecykluj stejný **klíčový typ důkazu** (doručenka, laboratorní posudek, pojistná smlouva, záznam z knihy) více než 1x v balíčku nově generovaných případů, pokud to není výslovné zadání.
- Nepoužívej stejný **sociální profil obžalovaného** (vdova v nouzi, drobný živnostník pod tlakem dluhu, student v davu) v sousedních generacích.
- Každý nový případ musí přidat alespoň 1 novou doménu prostředí (např. doprava, školství, nemocnice, obecní správa, bydlení, tisk, zemědělství, armádní zakázky, cechy).
- Povinně napiš interně (pro sebe před JSON) jednu větu: **„V čem se tento případ liší od nejpodobnějšího hotového případu?“** a podle ní uprav koncept.

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
- `available_days` v 15denní kampani musí obsahovat pouze pracovní dny **1–15**. Dny 16+ v této verzi neexistují.
- `weight_conditions` nastav podle typu zadání:
  - **pool případ:** váhy dle dne/stavu hry (typicky bez `forced`, nebo `forced: false`),
  - **tyčový/pillar případ:** typicky `forced: true` + přesně daný den/slot dle scénáře.
- Pokud jde o tyčový případ, zachovej i interní označení tracku (`case_track: "pillar"`, případně `case_track_label: "tycove"`), pokud je tým v datech používá.
- Pokud je případ na hraně mezi `routine` a `moral_dilemma`, preferuj `moral_dilemma` tehdy, když jsou právně obhajitelné minimálně dvě protichůdné větve bez jednoho „správného“ výsledku.

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
- Jedna stopa (`data-clue-id`) může být záměrně součástí **více párů** s různou silou (`weak`/`medium`/`strong`). Je to validní designový nástroj; při kolizi vyhodnocení preferuj nejsilnější platný pár.
- Pokud je `timed_hunt` zapnutý, nech `timeout_downgrade: false` a drž férovou hustotu stop; bez timed režimu musí párování fungovat stejně čitelně.
- Pokud zadání **nechce** two-click, můžete `clue_system.enabled: false` — v tom případě odůvodni v písemném bríf, ne v JSON.  
- Technicky drž strukturu blíž příkladu v repu, např. kauza *pool_a1_tiskarna* (Noční směna) pro orchestraci — **nekopíruj její děj ani verdikty**, jen stavebnice polí.

## Průzkum a skrytá zjištění

- Piš zdrojově do `investigation` (ne do runtime `hidden_info`): `interview`, `records`, `informant`, `confrontation`. Loader to mapuje automaticky.  
- Pole drž přesně podle kanonu:
  - `interview.text`, `records.text`, `informant.variants`, `confrontation.prompt` + `confrontation.success.text`,
  - `cost` je číslo (`1` / `2`), ne objekt typu `{ "ink": 1 }`,
  - `informant.variants` je **objekt mapy** (např. `lid_high` / `kapital_high` / `default`), ne pole s `condition`,
  - pro odemykání přes informovanost použij `info_threshold_unlocks.actions/verdicts` ve tvaru `[{ "min": X, "ids": [...] }]`.
- U odměn z pátrání odemykej akce přes runtime ID (`pool_inv_interview`, `pool_inv_records`, `pool_inv_informant`, `pool_inv_confrontation`), ne přes vlastní názvy.

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

## Cílení na „příběhové“ případy (doporučení pro další várku)

Pokud tým chce další případy příběhovější, ale stále poolové:

- stav případ na **osobním rozhodnutí pod institucí** (ne na jediném technickém triku),
- klidně a pravidelně zařazuj i **firemní/korporátní kauzy** (tiskárna, záložna, pojišťovna, stavba, doprava, podnikové účetnictví, mzdové spory, dodavatelské tlaky), aby mix nebyl jen „domácí tragédie“,
- dej do středu jeden vztah (rodič–dítě, mistr–učeň, dlužník–ručitel, úředník–žadatel), který se láme důkazem,
- přidej jasný „co se stane po rozsudku za 3–7 dní“ (odložený konkrétní dopad),
- drž právní rovinu obhajitelnou a morální rovinu otevřenou: žádná varianta nemá být „karikatura zla“.

## Doplňovací rekvizity

- Noviny, dopisy, vlákno: **jen pokud** tým zadal `XXX_vedlejsi_arty` — jinak může být `narrative_link: null` / bez pole.  
- `bribe_amount` / `recurring` atd. jen dle bríf, ne vždy.
- `review_card` můžeš v datech vyplnit (pro budoucí použití / archivaci návrhu), ale v aktuální hře se zatím **runtime nepoužívá**; nespoléhej na něj jako na aktivní mechaniku.
- Volitelné pole pro atmosféru po potvrzení: `stamp_moment` = `{ "guilty": "...", "not_guilty": "...", "insufficient": "..." }` (1–2 věty na větev, bez hodnocení hráče).

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

Interní kontrola týmu před vložením do hry: `docs/promts/CHECKLIST-QA-pool-pripad.md`.

# Balíček: doplnění pool případu `pool_a1_exekuce` (Záložna)

Tento soubor slouží k **jednorázovému zadání** pro AI: obsahuje **celý prompt** ve stejném znění jako `PROMPT-doplneni-stavajicich-pool-pripadu.md` a níže **vyplněné zadání týmu** pro případ *Záložna*.

**K odeslání:** zkopíruj od sekce „Prompt: doplnění…“ až po konec včetně poznámky pod čarou, a **přilož** soubor `docs/Pripady/pool_a1_exekuce-Zalozna.json` (nebo vlož jeho obsah pod zadání).

**Cíl úprav (důležité):** položka v `pool_cases_akt1` u této kauzy **v současné verzi nemá** `clue_system`. Dotahujeme kauzu **na stejnou úroveň** jako ostatní doplněné pool kauzy — **Two-Click** (označené stopy, `pairs`, `narrative_lines`, hmatatelné údaje: **datum na doručence, částky, splátky, §, jména**), **lidské dopady u verdictů** (B, vč. B2, inkoust dle vhodnosti), soudní formulace v `description` (*Soud uznává…* / *zprošťuje* — ne **Ben** místo soudu u samotného výroku), **beze změny záměru děje** a **bez** maření `effects`.

**Jádro děje (pro orientaci; neměň bez pokynu):** **Anna Součková**, Ořech; úder exekutora **Ing. Štěpán** násadou; dluh u **Záložny sv. Václava** 180 → 340 Kčs, **18 %**; **doručenka 17. 2. 1931** = týž den jako exekuce; rozpor **oznámení** (§ / lhůta) a **přečetla vs. nečte bez brýlí**; syn **Josef** a matematika splátek; konfrontace **exekutor** (ne obžalovaná). Morální osa: *§81 vs. chudoba vdovy*. `encyclopedia_links`: `exekuce`, `zalozna`, `rolnicke_zadluzeni`, `hospodarska_krize` — ověř v `data/knihovna.json` / plán encyklopedie; u textu **záložna** vs. id `zalozna` sjednoť s týmem. Nová `data-knihovna-id` **neinventuj** bez souhlasu.

**Poznámka k číslu spisu:** **Sp. zn. 85/1931** je sdílené s kauzou **`pool_a1_stavba`** (*Pád ze lešení*). Ve hře a v úpravách vždy rozlišuj **`id` případu** a kontext (Kolář / Součková), ne jen číslo řízení.

**Vzor ke struktuře:** `docs/Pripady/pool_a1_tiskarna-vzor_Nocni-smena.json`, `docs/Pripady/pool_a1_stavba-Pad-ze-leseni.json` (po doplnění), `docs/Pripady/pool_a1_zhar-Zharstvi-na-Smichove.json`.

---

# Prompt: doplnění stávajících pool případů (IN DUBIO, Akt 1)

Tento prompt použij, když máš **hotový JSON jednoho případu** z `data/pool_cases_akt1.json` a chceš ho **doplnit o nové možnosti** (nepsat kauzu znovu od nuly). Výstup musí být **validní JSON** — celý objekt případu s **stejným `id`**, připravený **nahradit** původní položku v poli `pool_cases_akt1`.

**Spisy light** (`data/pool_cases_light_akt1.json`, pole `pool_cases_light_akt1`) se tímto promptem **nepředpokládají** — tam drž zkrácený rozsah dle `.cursor/rules/cases.mdc` (sekce *Spis light*). Pokud doplňuješ light kauzu, pracuj s celým objektem z light souboru a výstup vrať jako náhrada téže položky v `pool_cases_light_akt1`.

---

## Role

Jsi **editor / rozšiřovatel** obsahu pro soudní hru IN DUBIO (Československo, první republika, **březen 1931** jako současnost kauzy; texty důkazů smějí sahat do minulosti dle původní logiky). Respektuj **původní děj, jména a strukturu** případu. Neměň skutkovou podstatu, dokud tým explicitně neřekne jinak.

**Tvůrčí laťka (vedle mechaniky):** pracuj i jako **spolutvůrce** — posil **motivace postav** v textu, drž **logickou důkazní osu**. Nové stopy a `narrative_lines` mají dávat **dějový i rozumový** smysl. Tón **soudní a úřední** 30. let; **číselné `effects` nemaž** bez pokynu týmu.

## Vstup (připoj k zadání)

1. **Celý JSON objekt** daného případu (jedna položka z poolu).  
2. Volitelně: **lore** — jen pokud tým doplňuje jména nebo místa.  
3. Seznam **co upřesnit** z níže.  
4. U **konkrétního dne** zkontroluj `../scenar/Mapa_20dni.csv` a `../scenar/Milniky-dynamika-akt1.md` — tento spis: `available_days` **7–10**, závěr 1. aktu; tón *morální dilema, venkov, úvěr*.

## Co doplnit / zkontrolovat (mechanika a kvalita)

### A) Pátrání (Two-Click) — `clue_system.rewards.on_confirm`

- Dle **`.cursor/rules/cases.mdc` — exaktní realita** u stop a párů (datumy, Kčs, procenta, text doručenky…).  
- `narrative_lines` u `weak` / `medium` / `strong` tam, kde pár může nastat — obvykle **3 věty**, gradující.  
- **Neukládej** kód navíc.  

### B) Lidský dopad u rozsudků

- Dopady na **Součkovou, Josefa, exekutora, záložnu, venkov**; u odemykaných větví prefix `Alternativa: ...` dle záměru týmu.  
- Neměň `effects` bez pokynu.  

### B2) Protokolární věta (UI)

- `description` navazuje na `Jménem republiky se vynáší tento rozsudek.`  
- Výrok **soudu** (případně odůvodnění soudce), ne místo toho první osoba **Bena** u *vyslovení* zproštění/ odsouzení; komentář soudce může být strukturovaný zvlášť.  
- Volitelně `bonus_inkoust_rano` dle `cases.mdc`.  

### C) `review_card` (volitelně)

- Limity: `../scenar/Milniky-dynamika-akt1.md` §4. Insufficient s **dozetřením doručení** už v případu je.  

### D) Konzistence a drobné opravy

- Unikátní `data-clue-id`. **zprošťuje** ne *zpřošťuje*. Při redakci pozor na **překlepy** v mluvených textech (např. informant *osmáct* → *osmnáct*), jen se souhlasem týmu.  

### E) Nemanipuluj zbytečně

- Neměň `id`, `case_number` ani **flow** bez týmu.  

## Výstup

- Jeden **kompletní** JSON objekt, **validní**, UTF-8, bez `//` komentářů.  

## Zadání týmu (doplň / zaškrtni) — **VYPLNĚNO pro `pool_a1_exekuce`**

- **ID případu:** `pool_a1_exekuce`  
- Přiložený JSON: *`docs/Pripady/pool_a1_exekuce-Zalozna.json` (Sp. zn. 86/1931, *Záložna*)*  
- Doplň: `[x]` A – `clue_system` + stopy + `narrative_lines` / `[x]` B, B2 / `[ ]` `review_card` / `[x]` soudní formulace / `[x]` D (spis *86/1931* u *Záložny* vs. *85/1931* u `pool_a1_stavba`)  
- Bible / world: *dle potřeby (venkov, záložna, exekuce).*  
- **Kontext slotu:** `available_days` **7–10**; morální dilema; návaznost na **Eliška Závadová** u `guilty_alternative` (již v `delayed_consequences`).

---

*Po vygenerování: nahraď položku v `data/pool_cases_akt1.json` (1:1), ověř načtení hrou.*

---

## Soubory, které budeš asi potřebovat

| Soubor | K čemu |
|--------|--------|
| **`docs/Pripady/pool_a1_exekuce-Zalozna.json`** | Vstupní JSON. |
| **`data/pool_cases_akt1.json`** | Cíl po schválení. |
| **`data/knihovna.json`** | Při odkazech do Knihovny. |
| **`docs/pool_cases_akt1_prehled.md`** (§ Případ 10) | Shrnutí. |
| **`docs/Pripady/pool_a1_stavba-…`**, **`pool_a1_zhar-…`** | Vzory `clue_system`. |
| **`docs/scenar/Mapa_20dni.csv`**, **`Milniky-dynamika-akt1.md`** | Dny 7–10. |
| **`.cursor/rules/cases.mdc`** | Kanon. |

---

## Rychlý bríf pro autora (1 odstavec)

Doplň spis o hmatatelné stopy a vrstvy pátrání, které propojí **datum na doručence a týž den exekuce**, **matematiku splátek a úroku** (záznamy záložny) a **rozpor výpovědí** exekutor — vdova (přečetla / strach / bez brýlí); **nepřepisuj** odhalení po konfrontaci se **Štěpánem**. Rozsudky ať sjednotí dopad na **statku v Ořechu, Josefa, exekutora a reputaci záložny**; u alternativy s **přezkumem záložny** drž tón, který už naznačují *delayed_consequences* (Závadová, tisk).

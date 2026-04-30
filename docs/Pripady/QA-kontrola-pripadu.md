# QA kontrola případů — logika, osoby, čas, důkazy

**Účel:** Postupně projít každý případ ve hře a ověřit, že text drží pohromadě. Kanonický zdroj dat je **`data/pool_cases_akt1.json`** (stejné `id` jako v tomto seznamu). Autorské kopie v `docs/Pripady/*.json` držte s pool synchronní.

## Kdy případ označit ✅

Označ řádek **`OK`** a dopiš **datum**, až projdeš kontrolu v těchto bodech (stačí vlastní poznámka „v pořádku“ nebo vypsané výjimky):

1. **Časová souslednost** — měsíce, roky, pořadí událostí (popis ↔ svědectví ↔ průzkum ↔ konfrontace ↔ pátrání).
2. **Osoby a role** — kdo komu co nabízí, kdo mluví, nemíchají se podměty (kupující/prodávající, oběžník/navrhovatel).
3. **Jména** — stejná osoba stejně jmenovaná napříč sekcemi; žádné překlepy v klíčových faktech.
4. **Důkazy a stopy** — `data-clue-id` odpovídá `clue_system`, rozporům a odemčením průzkumu podle `cases.mdc` / dat.
5. **Průzkum a informátor** — varianty dávají smysl vůči frakcím; žádná věta proti zbytku spisu.

**Stav:** `—` = nezkontrolováno · `OK` = prošlo výše uvedenou kontrolou · `OPR` = po kontrole byly nutné úpravy (datum + stručně co).

---

Pořadí řádků = pořadí v `data/pool_cases_akt1.json` (snadné hledání v jednom souboru).

| Stav | Datum   | ID případu | Název (title) |
|------|---------|------------|---------------|
| OPR  | 2026-04-30 | `pool_a1_lekarna` | Ředění léků |
| OK   | 2026-04-30 | `pool_a1_vyveseni` | Závadný plakát |
| OK   | 2026-04-30 | `pool_a1_trafika` | Mrtvý trafikant |
| OPR  | 2026-04-30 | `pool_a1_vytrznost` | Rozbité výlohy |
| OK   | 2026-04-30 | `pool_a1_nemocenska` | Nemocenský lístek |
| OPR  | 2026-04-30 | `pool_a1_stara_rana` | Stará rána |
| OPR  | 2026-04-30 | `pool_a1_zhar` | Žhářství na Smíchově |
| OK   | 2026-04-30 | `pool_a1_weiss` | Herr Weiss |
| OPR  | 2026-04-30 | `pool_a1_stavba` | Pád ze lešení |
| OPR  | 2026-04-30 | `pool_a1_exekuce` | Záložna |
| OK   | 2026-04-30 | `pool_a1_tiskarna` | Noční směna |
| OPR  | 2026-04-30 | `pool_a1_spravce` | Zmizelý dopis |
| OPR  | 2026-04-30 | `pool_a1_bytova_komise` | Bytová komise |
| OPR  | 2026-04-30 | `pool_a1_revizor` | Revizor |
| OK   | 2026-04-30 | `pool_a1_druha_ruka` | Druhá ruka |
| OPR  | 2026-04-30 | `pool_a1_posledni_vule` | Poslední vůle |
| OPR  | 2026-04-30 | `pool_a1_druzstvo` | Zásoby |
| OPR  | 2026-04-30 | `pool_a1_kladivo` | Kladivo |
| OPR  | 2026-04-30 | `tyc_horak_d1` | Krádež chleba |
| OPR  | 2026-04-30 | `tyc_horac_d7` | Svědkyně |
| OPR  | 2026-04-30 | `pool_a1_posta` | Pošta |
| OPR  | 2026-04-30 | `pool_a1_lekar` | Lékař |
| OPR  | 2026-04-30 | `tyc_pospisil_2` | Hospodský a tichá hrozba |
| OPR  | 2026-04-30 | `pool_a1_draha` | Přestavená výhybka |
| OPR  | 2026-04-30 | `tyc_bozena_3` | Stavební zájem |
| OPR  | 2026-04-30 | `tyc_hranice_2` | Německý dopis |
| OK   | 2026-04-30 | `tyc_pospisil_3` | Co slyšel hostinský |
| OPR  | 2026-04-30 | `tyc_markova_2` | Záchrankyně |
| OPR  | 2026-04-30 | `tyc_markova_3` | Sešit jako důkaz |
| OPR  | 2026-04-30 | `tyc_hranice_3` | Metr a muž |
| OPR  | 2026-04-30 | `tyc_velezrada_d15` | Velezrada |
| OPR  | 2026-04-30 | `tyc_zvraty_d10` | Složka |
| OPR  | 2026-04-30 | `tyc_haas_d11` | Obálka |
| OPR  | 2026-04-30 | `tyc_zavadova_d12` | Víme vše |
| OPR  | 2026-04-30 | `pool_a1_bozena_slepice` | Slepice |
| OPR  | 2026-04-30 | `pool_a1_bozena_cest` | Čest obecního radního |
| OPR  | 2026-04-30 | `pool_a1_hranice_zed` | Třicet čtyři centimetrů |
| OK   | 2026-04-30 | `pool_a1_pospisil_vycep` | Výčepní právo |
| OK   | 2026-04-30 | `pool_a1_markova_svedkyne` | Podezřelá svědkyně |

**Počet řádků:** 39 (celý obsah `pool_cases_akt1` k 2026-04). `pool_cases_light_akt1.json` je prázdný; `cases-akt1.json`–`akt3.json` jsou prázdné pole — žádné další případy z nich se nenačítají.

---

## Log kontrol a oprav (2026-04-30)

### Tyčová linie Horák / Horáčková (den 1 → den 7)

- **`tyc_horak_d1`** (den 1): Tomáš Horák, čin **3. 3. 1931** — po 20 týdnech podpory končí výplata k **28. 2. 1931**, první den bez podpory a s nulovým příjmem k datu činu drží s evidencemi. `clue_system` (silný pár bez odporu + evidence práce) sedí.
- **`tyc_horac_d7`** (den 7): obžalovaný **Jiří Veselý**, svědkyně **Jana Horáčková** (MV) — **není** totéž jméno ani příběh jako u Tomáše Horáka; ID **`tyc_horac_d7`** zkracuje *Horáčková*, ne „Horák den 7“. Schůze **18. 2. 1931**, zpráva **19. 2. 1931** — pořadí OK. Motivická souvislost s d1: téma dohledu státu; **Petr Vlček** v pekárně ≠ ministr **Vlček** v politických textech (stejné příjmení, jiná postava).

### Tyčová linie Pospíšil (výčep → incident → Maňák)

- **`pool_a1_pospisil_vycep`** (den 3): Sp. zn. **94/1931**, kontrola **22. 2. 1931**; rozpor s Fišerem odemyká konfrontaci jen u **`neuceluje_ale_bere_hosty`** — u **`fyzicka_nemoznost_pred_22`** je **`unlocks_confrontation: null`** (druhý rozpor jen doplňuje důkaz z záznamů, ne druhou konfrontaci). Text a časová osa OK.
- **`tyc_pospisil_2`** (den 6): Sp. zn. **98/1931**, sobota **7. 3. 1931** (kalendářně sobota); navazuje na první spis přes **94/1931** (v `defendant.detail` opraveno z chybné **62/1931**). Výpověď hosta: ID **`barta_svedek`** (dříve překlep `barta_svedly`). Rozpory a konfrontace s Pospíšilem drží.
- **`tyc_pospisil_3`** (metadata `available_days: [11]`): Sp. zn. **114/1931**, hrozba **14. 2. 1931** (sobota), útok na Červenku **7. 3.**, odmítnutí výpovědi **18. 3. 1931** (+11 dní od útoku) — souvislost s předchozími díly OK. **Poznámka ke kalendáři:** v `data/days.json` den **11** zatím v `cases` neobsahuje `tyc_pospisil_3` (případ je v poolu připravený, ale není zařazený do denní nabídky — doplnění až na výslovný pokyn k rozšíření dnů).

### Tyčová linie Marková (svědkyně → záchrana Vávry → obžalovaná)

- **`pool_a1_markova_svedkyne`** (den **3**, `days.json`): Sp. zn. **95/1931**, krádež látky **5.–12. 2. 1931**, inventura **14. 2.**; rozpor **`cas_842_bez_podkladu`** odemyká konfrontaci s Markovou — u **`pristup_neni_vylucny`** je **`unlocks_confrontation: null`** (druhý rozpor podporuje zproštění Čermáka, ne druhou konfrontaci). Silný pár čas vs. kopie drží.
- **`tyc_markova_2`** (metadata `available_days: [10]`): Sp. zn. **112/1931**, čin **27. 2. 1931** (pátek); Marková jako zákaznice u Hartmann & Ries — časy 14:05–14:20 Krejsa vs. sešit a Hartmann sedí. Konfrontace jen s Krejsou (`krejsa_nebyl_na_porade`); u **`balicek_zabaleny`** je **`unlocks_confrontation: null`**. **Kalendář:** v `data/days.json` den **10** zatím **`tyc_markova_2` v `cases` nemá** (doplnění až na pokyn k rozšíření dnů).
- **`tyc_markova_3`** (den **18** v `days.json`): Sp. zn. **118/1931**; navazuje na **95/1931** a **112/1931** v `defendant.detail` a v textu výroku *formal*. Nemoc Markové ve výpovědi sjednocena s nemocenským záznamem (**12.–17. 1.**). Rozpor **`sesit_zachranil_nebo_obvinil`**: **`unlocks_confrontation: null`** (konfrontace jen s Benešem ml. z prvního rozporu). **`available_days`** v poolu změněno z **[14]** na **[18]** podle skutečného zařazení v `days.json`. Revizor × grafolog: jedna linie důkazu o **dvou rukách** (původní zápis vs. přepis).

### Pool: Pošta, Lékař, Přestavená výhybka

- **`pool_a1_posta`** (Sp. zn. **99/1931**): časová osa **23. 2.** (noční směna, depeše T-14–T-16) → komise **24. 2.** 15:30 → oznámení **26. 2.** = **dva dny** po komisi; rozpor **`dve_depele_nebo_tri`** už měl **`unlocks_confrontation: null`**. Oprava textu odměny (silný pár): „**tři** dny“ → „**dva** dny“ u Dvořáka. **Kalendář:** v aktuálním `data/days.json` tento ID v `cases` není — zařazení až podle zvoleného scénáře (`available_days` 6–9 v poolu).
- **`pool_a1_lekar`** (Sp. zn. **100/1931**): Bible **3. 3.** 19:40, injekce **4. 3.** 8:15, trestní **10. 3.**, notář závěť **9. 3.** — drží; druhý rozpor má **`unlocks_confrontation: null`**. Úpravy: **grafolog** (český pravopis) v konfrontaci a u přerušení; překlep **„otevíře“ → „otevře“** v popisu přerušení.
- **`pool_a1_draha`** (Sp. zn. **102/1931**): incident **15. 1. 1931**, hlášení duben–prosinec 1930 vs. revize **Q1/1931** / oprava **16. 1.** — sedí; konfrontace jen s **Hruškou** (`hruska_vedel`). U rozporu **`zaruka_nebyla`** je **`unlocks_confrontation: null`** (dříve chybně `douda`). Hruška: **„můj opomenu“ → „mé opomenutí“**; v `aftermath.guilty_alternative` opraven nesmysl **„senare“** a shoda **bylo / zpracováno** u „hlášení“. **Kalendář:** v aktuálním `days.json` případ není v `cases` (pool má dny 8–12).

### Tři poslední položky v `pool_cases_akt1.json` (hranice zed, výčep, Marková 1)

- **`pool_a1_hranice_zed`** (den **4**, Sp. zn. **93/1931**): rozpor **`omitka_vs_zed`** neměl v datech vazbu z průzkumu (žádný krok **`unlocks_contradiction`**); u rozhovoru s **brozek_syn** doplněno **`unlocks_contradiction: "omitka_vs_zed"`** pro shodu s `cases.mdc` a případné doplnění loaderu. **Pozn.:** aktuální klient v rozporovém boxu bere jen **`contradictions[0]`**; pole `unlocks_contradiction` v JSON se zatím v `data-loader.js` na `hidden_info` nepřenáší. Konfrontace jen s Horou; u **`omitka_vs_zed`** je **`unlocks_confrontation: null`**. Úprava v `data/pool_cases_akt1.json` a `docs/Pripady/tyc_hranice_1.json`.
- **`pool_a1_pospisil_vycep`** (den **3**, Sp. zn. **94/1931**): čas Waltrovka **22:08** + cesta **~25 min** vs. kontrola **23:15**; konfrontace jen s Fišerem; u **`fyzicka_nemoznost_pred_22`** je **`unlocks_confrontation: null`**. Silný/střední pár a stopy drží s texty — úpravy po této kontrole nebyly nutné.
- **`pool_a1_markova_svedkyne`** (den **3**, Sp. zn. **95/1931**): čas **8:42** vs. prázdná kolonka v příjemce; konfrontace s Markovou; druhý rozpor s **`null`** u konfrontace; inventura **14. 2.** v souladu s oknem krádeže **5.–12. 2.**; fragment o sešitu (**8:55**) konzistentní s odhalením. Úpravy nebyly nutné.

### Osobní tyč a finále (zbývající QA — den v `days.json` vs metadata)

- **`tyc_zvraty_d10`** (den **12** v `days.json`, interní spis): **`available_days`** **[10] → [12]** podle skutečného zařazení. Odložený fragment po **`pouzit_dokument`**: místo odkazu „Ráno D11“ **obecně „Další ráno“** (složka následuje den po rozhodnutí, ne pevné číslo dne). Informace o Wolfovi v pátek **20. 3.** sedí s **`tyc_velezrada_d15`** na dni **19** (páteční líčení). `clue_system` a jediný rozpor bez konfrontace drží.
- **`tyc_zavadova_d12`** (den **16** v `days.json`): **`available_days`** **[12] → [16]**. Opravy datové logiky: v rozporu **`zprava_je_padelek`** pole **`involves`** — **`zavadova_ví` → `zavadova_vi`** (shoda s `id` výpovědi). U záznamů **`unlocks_contradiction`**: **`zprava_je_padélek` → `zprava_je_padelek`** (jinak se rozpor po průzkumu neodemče). U rozporu **`haas_rad_spojeni`** je **`unlocks_confrontation: null`** (jediná konfrontace ve spisu je kvůli padělku z prvního rozporu); popis sekvence bez pevných čísel dnů D10/D11/D12. Texty sladěny s kalendářem (druhá sobota + následující dny v březnu 1931): návštěva **v úterý**, falešná zpráva **ze šestnáctého března — včera**, dopis **„V kontaktu od 17. března“**, informant **bez** tvrzení „tři dny v řadě“ mezi složkou a Haasem (v `days.json` mezera dní 12 vs 15). Úpravy v `data/pool_cases_akt1.json` a `docs/Pripady/tyc_zavadova_d12.json`.
- **`tyc_velezrada_d15`** (den **19** v `days.json`, Sp. zn. **124/1931**): **`available_days`** **[15] → [19]** podle kalendáře. U rozporu **`podpis_vs_transakce`** je **`unlocks_confrontation: null`** (konfrontace jen u **`odmitl_pred_propustenim`** s Dvořákem; druhý rozpor doplňuje grafolog × peníze, ne druhou konfrontaci). Úpravy v poolu a `docs/Pripady/tyc_velezrada_d15.json`.

### Tyčová linie Božena (slepice → čest → PRAGA) a Haas

- **`pool_a1_bozena_slepice`** (den **1**, Sp. zn. **91/1931**): nabídka a podnět musí sedět se zápisem rady **8. 12. 1930** — v textu **říjen/prosinec 1930** (dříve chybně říjen 1931). Konfrontace jen se Šebkem (`casova_souslednost`); u **`jednohlasnost_sporny`** je **`unlocks_confrontation: null`**.
- **`pool_a1_bozena_cest`** (den **4**, Sp. zn. **92/1931**): `defendant.detail` odkazuje na **91/1931** (místo chybné 59/1931). Ve spisu je jen konfrontace s **Knotem** (`realitni_advokat_na_urazku`); u **`provokace_pred_urazkout`** je **`unlocks_confrontation: null`**.
- **`tyc_bozena_3`** (den **10** v `days.json`, Sp. zn. **108/1931**): `defendant.detail` s **91/1931** a **92/1931** (místo 59/64). **`available_days`** **[10]** podle `days.json` (dříve [8]). Konfrontace jen se Slávikem (`souhlas_pred_pruzkumem`); u **`geodesia_dvojrole`** je **`unlocks_confrontation: null`**. Odměna (silný pár): roky u července/srpna/září **1930** v souladu se smlouvou a průzkumem.
- **`tyc_haas_d11`** (den **15** v `days.json`): **`available_days`** **[15]** (dříve [11]); rozpor **`bez_podminek_ale_s_odkazem`** už měl **`unlocks_confrontation: null`**. U záznamů byl **`unlocks_contradiction`** s překlepem v ID (**í** místo **i**) — sjednoceno na stejný řetězec jako u rozporu, jinak se rozpor po průzkumu neodemkl. ID případu zůstává `tyc_haas_d11` kvůli vazbám ve fragmentech.

### Tyčová linie Hranice (zeď → dopis → odvolání)

- **`pool_a1_hranice_zed`** (den **4** v `days.json`, Sp. zn. **93/1931**): první měření Hora **3. 3. 1931**; konfrontace jen se znalcem (`meri_od_pohybliveho_bodu` → `hora_znalec`); u rozporu **`omitka_vs_zed`** je **`unlocks_confrontation: null`** (druhý rozpor doplňuje záznamy, ne druhou konfrontaci).
- **`tyc_hranice_2`** (den **8** v `days.json`, Sp. zn. **109/1931**): navazuje na **93/1931** v `defendant.detail`; konfrontace s Křížem z prvního rozporu (`kriz_nevede_co`); u **`amt_neni_politicky`** je **`unlocks_confrontation: null`**.
- **`tyc_hranice_3`** (Sp. zn. **119/1931**, v poolu **`available_days: [12]`**): v aktuálním `data/days.json` **`tyc_hranice_3` v `cases` není** (stejný vzor jako u jiných tyčí připravených mimo kalendář). Odvolání v `charge` odkazuje na první civilní věc **93/1931** (místo chybné **66/1931**). Nové zaměření Hora **7. 4. 1931** (aby se nepletlo s prvním posudkem ze **3. 3.**). U rozporu **`34_nebo_19`** je **`unlocks_confrontation: null`**; konfrontace zůstává u **`princip_nebo_uznani`**. V `aftermath.posun` sjednoceno s verdiktem o posunu **19 cm** (dříve chybně „sedmnáct“).

**Tyče:** přesné doplnění do `days.json` a srovnání s `available_days` udělat v další větě **podle zvoleného scénáře** (`docs/scenar/`, např. `Pripady_15dni.csv` / `MIGRACE_20-15.md`) — tato kontrola nemění kalendář ani tyčové sloty.

### Kontrola koherence bez změny poolu

- **`pool_a1_nemocenska`** — OK: časová osa listopad 1930 / leden 1931, role lékař–zaměstnavatel–pošta; `clue_system` a rozpor s datem drží s výpověďmi a záznamy.
- **`pool_a1_tiskarna`** — OK: rozpor délky schůze (Mareš vs policejní protokol) a třetí klíč; u rozporu `meeting_interrupted` je v `involves` záměrně `records` (úřední záznam, ne svědek) — konzistentní s popisem.
- **`pool_a1_druha_ruka`** — OK: 8. / 12. února 1931, deník 15 min vs Kolářová, inkoust; silný/střední pár v `clue_system` odpovídá stopám v textech.
- **`pool_a1_posledni_vule`** — OK po opravách metadat: časová osa 10. / 18. / 20. 1. 1931, ústní vůle vs notářský zápis a deník; jediná konfrontace ve spisu je s Václavem (`denik_versus_syn`).
- **`pool_a1_druzstvo`** — OK po opravě metadat: leden 1931, Horákův náklad 14. vs Rejzek 16., Herejk; silný/střední pár odpovídá stopám; jediná konfrontace je s Herejkem.
- **`pool_a1_kladivo`** — OK po opravách: 6. 2. 1931 pátek, úterý–pátek hrozba; silný/střední/slabý pár ve spisu; jediná konfrontace je se znalcem (`afekt_vs_kontrola`).
- **`pool_a1_vyveseni`** — OK: data 26. 2. 1931 / zásilka 20. 2., Lipsko–Konrad–Berlin drží; `clue_system` (silný pár filozofická tvrzení vs. katalog + MV u nakladatele; střední doručení + odesílatel) odpovídá textům výpovědí a záznamů. Rozpor `book_existence` je záměrná nejistota obsahu knihy, ne chyba v číslech.
- **`pool_a1_trafika`** — OK: 3. a 18. 1. 1931, matrika 12. 7. 1930, Krejčí jako soused a agent; rozpor „nikdy u doktora“ vs. Havelka je věcí výpovědi, ne nesoulad metadat. Případ **nemá** `clue_system` — párování stop v datech není.
- **`pool_a1_weiss`** — OK (druhá sada QA): data zadržení 22. 2. / rejstřík / dvojí doklady; `clue_system` sedí s výpověďmi a záznamy. Úpravy v pool nebyly potřeba.

### Opravy zapsané do `pool_cases_akt1.json`

- **`pool_a1_lekarna`** — OPR: v metadatech rozporu `analysis_discrepancy` a v textu konfrontace sjednoceny **laboratorní procenta** s výpovědí inspektora (digitalis 70 % / 81 %; kodein 62 % zvlášť). Výpovědi postav beze změny.
- **`pool_a1_vytrznost`** — OPR: oprava pravopisu **strážmistr** v celém bloku případu; popis rozporu `strepy_na_klope`, konfrontační prompt a úspěšná odpověď už **nepřisuzují** obžalovanému citát „několik metrů stranou“ (nebyl ve výpovědi) — drží se záznamu vs. fyzika u výlohy.
- **`pool_a1_stara_rana`** — OPR (druhá sada): v lékařské zprávě v záznamech odstraněn **nesmyslný odhad „decilitry čistého lihu“** u 2,6 ‰ (nahrazeno srozumitelným srovnáním s výpovědí o dvou skleničkách); v odměně za stopy sjednoceno **2,6 ‰** (místo „dvě a půl“). Dříve: *stražmistr* → *strážmistr* v `aftermath`.
- **`pool_a1_zhar`** — OPR: **čas požáru** v popisu případu sladěn se svědky — formulace **„v noci ze 13. na 14. února 1931“** (záblesk před půlnocí; inspektor kolem 2:00 ranní 14. 2.), místo nepřesného „krátce po půlnoci“.
- **`pool_a1_stavba`** — OPR: v úspěšné konfrontaci **den v týdnu** u nehody 17. 2. 1931 opraven na **úterý** (místo „středa“); ID rozporu **`kolin_podpis` → `kolar_podpis`** (překlep jména v identifikátoru) v poolu i v `docs/Pripady/pool_a1_stavba-Pad-ze-leseni.json`.
- **`pool_a1_exekuce`** — OPR: popis rozporu `oznameni_exekuce` už **netvrdí**, že by exekutor vypovídal o předchozím doručení poštou (ve výpovědi to není); drží se **doručenky se stejným datem jako výkon** a rozporu s obhajobou.
- **`pool_a1_spravce`** — OPR: doplněna **`id`** u tří výpovědí (`taussig`, `kopecka`, `benes`); rozpor `dopis_doruceni` má v `involves` **`records`** místo neexistujícího svědka `posta`; opravy skloňování **Blechy / pana Blechu** v textech Taussiga a Kopecké. Úpravy v `data/pool_cases_akt1.json` a zrcadle `docs/Pripady/pool_a1_spravce.json`.
- **`pool_a1_bytova_komise`** — OPR: v `aftermath` opraven překlep **libeňském** (místo „libněvském“). Úprava v `data/pool_cases_akt1.json` a zrcadle `docs/Pripady/pool_a1_bytova_komise.json`.
- **`pool_a1_revizor`** — OPR: u rozporu `prosinec_pismo_dopis` je **`unlocks_confrontation`** nastaveno na **`null`** (jediná konfrontace ve spisu je s Hájkem kvůli trase v lednu; prosincový dopis se týká Kopeckého a záznamu). Úspěšná konfrontace s Hájkovým posunem na „konec února“ je záměrné rozpadnutí výpovědi vůči lednové obžalobě. Úprava v `data/pool_cases_akt1.json` a zrcadle `docs/Pripady/pool_a1_revizor.json`.
- **`pool_a1_posledni_vule`** — OPR: u rozporu `pisemna_versus_ustni` je **`unlocks_confrontation`** na **`null`** (ve spisu není konfrontace s Procházkovou, jen s Václavem kvůli deníku). V odměně za stopy (střední síla) opraven rozbitý text **„tvrdě až do posledního znaku“** (dříve „tvr do poslední písmeno“). Úpravy jen v `data/pool_cases_akt1.json` (zrcadlo v `docs/Pripady/` pro tento případ není).
- **`pool_a1_druzstvo`** — OPR: u rozporu `datum_dodavky` je **`unlocks_confrontation`** na **`null`** (konfrontace ve spisu jen s Herejkem). Úprava v `data/pool_cases_akt1.json` a `docs/Pripady/pool_a1_druzstvo.json`.
- **`pool_a1_kladivo`** — OPR: druhý pár ve `clue_system` má vlastní **`pair_id`** `horak_znalec_weak` (dříve duplicitně `dobiasova_metoda_medium` se slabým párem); u rozporu `dobiasova_hra` je **`unlocks_confrontation`** na **`null`** (konfrontace jen se znalcem). U výroků **guilty_minimum**, **guilty_alternative_provokace** a **not_guilty.afekt_pure** sjednocena délka nátlaku s výpovědí (úterý–pátek): **několikadenní** / **během několika dnů** místo „třítýdenní“ / „po dobu týdne“. Úpravy v `data/pool_cases_akt1.json` a `docs/Pripady/pool_a1_kladivo.json`.
- **`tyc_horak_d1`** — OPR: v popisu případu **den v týdnu** u činu 3. 3. 1931 opraven na **úterý** (dříve chybně „pondělí“). Úprava v `data/pool_cases_akt1.json` a `docs/Pripady/tyc_horak_d1.json`.
- **`tyc_horac_d7`** — OPR: ve výpovědi Dudy (průzkum) sjednoceno místo Horáčkové v sále s výpovědí Veselého — **druhá řada** (dříve „třetí řada“). Úprava v `data/pool_cases_akt1.json` a zrcadle `docs/Pripady/tyc_horac_d7.json`.
- **`pool_a1_pospisil_vycep`** — OPR: u rozporu **`fyzicka_nemoznost_pred_22`** je **`unlocks_confrontation`** nastaveno na **`null`** (stejný vzor jako u jiných případů: jediná konfrontace s Fišerem zůstává u prvního rozporu). Úprava v `data/pool_cases_akt1.json` a zrcadle `docs/Pripady/tyc_pospisil_1.json`.
- **`tyc_pospisil_2`** — OPR: v `defendant.detail` opraven odkaz na předchozí spis **94/1931** (místo chybné **62/1931**); ID výpovědi **`barta_svedly` → `barta_svedek`** v `testimonies` a `contradictions`. Úprava v `data/pool_cases_akt1.json` a `docs/Pripady/tyc_pospisil_2.json`.
- **`pool_a1_markova_svedkyne`** — OPR: u rozporu **`pristup_neni_vylucny`** je **`unlocks_confrontation`** na **`null`** (konfrontace jen s Markovou kvůli času 8:42). Úprava v `data/pool_cases_akt1.json` a `docs/Pripady/tyc_markova_1.json`.
- **`tyc_markova_2`** — OPR: u rozporu **`balicek_zabaleny`** je **`unlocks_confrontation`** na **`null`** (konfrontace jen s Krejsou z prvního rozporu). Úprava v `data/pool_cases_akt1.json` a `docs/Pripady/tyc_markova_2.json`.
- **`tyc_markova_3`** — OPR: **`available_days`** **[14] → [18]** podle `data/days.json`; v `defendant.detail` a ve výroku *formal* odkazy na předchozí spisy **95/1931** a **112/1931** (místo „Marková 1/2“); výpověď Markové — nemoc sjednocena s dokumentem (**pracovní neschopnost od 12. do 17. 1.**); u rozporu **`sesit_zachranil_nebo_obvinil`** je **`unlocks_confrontation`** na **`null`**; výpověď revizora a popis rozporu **`sesit_zachranil_nebo_obvinil`** sladěny s grafologem (**přepis jinou rukou**, ne „jedna ruka“ vs. dvě ruce). Úpravy v `data/pool_cases_akt1.json` a `docs/Pripady/tyc_markova_3.json`.
- **`pool_a1_posta`** — OPR: v odměně za silný pár opraveno **„tři dny po komisi“ → „dva dny po komisi“** (soulad s textem konfrontace 24. → 26. 2.). Úprava v `data/pool_cases_akt1.json` a `docs/Pripady/pool_a1_posta.json`.
- **`pool_a1_lekar`** — OPR: **grapholog** → **grafolog** v konfrontaci a u varianty přerušení; **„otevíře“ → „otevře“** v popisu přerušení. Úprava v `data/pool_cases_akt1.json` a `docs/Pripady/pool_a1_lekar.json`.
- **`pool_a1_draha`** — OPR: u rozporu **`zaruka_nebyla`** je **`unlocks_confrontation`** na **`null`** (jediná konfrontace je s Hruškou); výpověď Hrušky **„můj opomenu“ → „mé opomenutí“**; v `aftermath.guilty_alternative` **„senare“ → „později“** a sjednocení slovesa u „hlášení … bylo … zpracováno“. Úprava v `data/pool_cases_akt1.json` a `docs/Pripady/pool_a1_draha.json`.
- **`pool_a1_hranice_zed`** — OPR: u rozporu **`omitka_vs_zed`** je **`unlocks_confrontation`** na **`null`**. Úprava v `data/pool_cases_akt1.json` a `docs/Pripady/tyc_hranice_1.json`.
- **`tyc_hranice_2`** — OPR: v `defendant.detail` odkaz na **93/1931** místo „Hranice 1“; u rozporu **`amt_neni_politicky`** je **`unlocks_confrontation`** na **`null`**. Úprava v `data/pool_cases_akt1.json` a `docs/Pripady/tyc_hranice_2.json`.
- **`tyc_hranice_3`** — OPR: `charge` **66/1931 → 93/1931**; `defendant.detail` s **93/1931** a **109/1931**; nové zaměření Hora **3. 3. → 7. 4. 1931** ve výpovědi a v `records.source`; u **`34_nebo_19`** je **`unlocks_confrontation`** na **`null`**; `aftermath.posun` — **devatenáct centimetrů** a text o měření sladěný s verdiktem. Úprava v `data/pool_cases_akt1.json` a `docs/Pripady/tyc_hranice_3.json`.
- **`pool_a1_bozena_slepice`** — OPR: říjen/prosinec **1930** v popisu, výpovědi, průzkumu a konfrontaci (soulad se zápisem rady 8. 12. 1930); u **`jednohlasnost_sporny`** je **`unlocks_confrontation`** na **`null`**. Úprava v `data/pool_cases_akt1.json` a `docs/Pripady/tyc_bozena_1.json`.
- **`pool_a1_bozena_cest`** — OPR: `defendant.detail` **91/1931**; u **`provokace_pred_urazkout`** je **`unlocks_confrontation`** na **`null`** (konfrontace jen s Knotem). Úprava v `data/pool_cases_akt1.json` a `docs/Pripady/tyc_bozena_2.json`.
- **`tyc_bozena_3`** — OPR: `defendant.detail` **91/1931** a **92/1931**; **`available_days` [8] → [10]**; u **`geodesia_dvojrole`** je **`unlocks_confrontation`** na **`null`**; narativní řádek o červenci/srpnu/září doplněn o **1930**. Úprava v `data/pool_cases_akt1.json` a `docs/Pripady/tyc_bozena_3.json` (slot `pillar`).
- **`tyc_haas_d11`** — OPR: **`available_days` [11] → [15]** podle `data/days.json`; u záznamů **`unlocks_contradiction`** opraveno na **`bez_podminek_ale_s_odkazem`** (shoda s `id` rozporu). Úprava v `data/pool_cases_akt1.json` a `docs/Pripady/tyc_haas_d11.json`.
- **`tyc_zvraty_d10`** — OPR: **`available_days` [10] → [12]** podle `data/days.json`; odložený fragment po **`guilty_pouzit_dokument`**: **„Ráno D11“ → „Další ráno“** (bez nesouladu s reálným pořadím dnů). Úprava v `data/pool_cases_akt1.json` a `docs/Pripady/tyc_zvraty_d10.json`.
- **`tyc_zavadova_d12`** — OPR: **`available_days` [12] → [16]**; v rozporu **`zprava_je_padelek`** opraveno **`involves`** (**`zavadova_ví` → `zavadova_vi`**); u záznamů **`unlocks_contradiction`**: **`zprava_je_padélek` → `zprava_je_padelek`**; u **`haas_rad_spojeni`** je **`unlocks_confrontation: null`**; sladění textů s březnovým kalendářem (úterý, **16. 3.** jako „včera“, dopis **17. 3.**), informant a `stamp_moment` bez falešné souvislosti „tři dny v řadě“ oproti mezeře dní 12 vs 15 v `days.json`. Úprava v `data/pool_cases_akt1.json` a `docs/Pripady/tyc_zavadova_d12.json`.
- **`tyc_velezrada_d15`** — OPR: **`available_days` [15] → [19]** podle `data/days.json`; u rozporu **`podpis_vs_transakce`** je **`unlocks_confrontation: null`** (jedna konfrontace s Dvořákem z prvního rozporu). Úprava v `data/pool_cases_akt1.json` a `docs/Pripady/tyc_velezrada_d15.json`.
- **`pool_a1_hranice_zed`** — OPR (doplněk): u rozhovoru **brozek_syn** doplněno **`unlocks_contradiction: "omitka_vs_zed"`** (metadata v souladu s průzkumem; runtime přenos do UI zatím v loaderu není). Úprava v `data/pool_cases_akt1.json` a `docs/Pripady/tyc_hranice_1.json`.

Po znovuprojití celého checklistu výše můžeš u řádku **`OPR`** doplnit poznámku „kompletní OK“ nebo stav přepsat na **`OK`**, pokud už nic nezbývá.

---

## Jak řádek uzavřít

1. Otevři případ v `data/pool_cases_akt1.json` (případně zrcadlo v `docs/Pripady/`).
2. Projdi checklist výše; opravy commitni do pool (+ docs kopie, pokud ji držíš).
3. V tabulce změň **`—`** na **`OK`** (nebo **`OPR`**, pokud šlo o opravu po částečné kontrole), dopiš **`Datum`** ve formátu `YYYY-MM-DD`.
4. Volitelně krátká poznámka mimo tabulku pod ID, pokud má případ trvalou výjimku („schválně nejednoznačné“).

---

*Soubor slouží jen jako řízení QA; herní logika zůstává v JSON a v `.cursor/rules/cases.mdc`.*

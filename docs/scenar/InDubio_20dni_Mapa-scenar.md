# IN DUBIO — 20denní mapa scénáře (Akt 1) — **ARCHIV**

> **Tento soubor není zdroj pravdy.** Kanon dní, slotů a poolu: [`Mapa_15dni.csv`](./Mapa_15dni.csv), `data/days.json`, [`Pripady_15dni.csv`](./Pripady_15dni.csv). Viz [`ARCHIV_20D_README.md`](./ARCHIV_20D_README.md).  
> Text níže může sloužit jako **přehled obecných principů** (večery, tón); **čísla a řazení dní neodpovídají** běžné 15denní kampani.

Tento soubor popisoval starší **20denní** rozvrh dní, večerů a emoční linky. Leží ve složce `docs/scenar/` vedle tabulkových exportů (CSV). Volitelný přehled v Excelu: `docs/InDubio_20dni_Mapa.xlsx` (listy `sheet1`–`sheet7`).

Vstupní přehled celé složky: [`ReadMeScenar.md`](./ReadMeScenar.md) — vždycky otevírej 15denní mapu.

---

## 1. Týdenní skelet

| Den v týdnu | Dopoledne | Odpoledne / večer | Poznámka |
|-------------|-----------|-------------------|----------|
| Po–Pá | Ranní fragment (stůl / dopis / krátká scéna) | **Dva sloty případů** (sdílený inkoust), poté **večerní volba** | Jádro herní smyčky. |
| Sobota | Shrnutí týdne, bonusy | Volitelné krátké scény / odpočinek | Bez nových případů dle `cases.mdc`. |
| Neděle | Volný den (procházka, matka, dopisy…) | **Žádné případy** | Emoční a ekonomické důsledky větví. |

---

## 2. Večerní příběhy a volby (struktura výprávění)

**Slot:** ihned po uzavření obou případů dne (nebo po jednom, pokud testuješ tři ID — před releasem zpět na dva). Po **dvou vynesených rozsudcích** musí jít den ukončit i s případným třetím spisem nedotčeným (`cases.mdc`).

**Funkce večera:**

- oddech od „úřední“ řeči spisu,
- zarovnání s **rysy** (Naděje, Vina, Integrita…),
- krátké **epizodní** linky (NPC, matka, finance, politika),
- příprava na zítřejší tlak (inkoust, fragment, dopis).

**Forma:** 1–3 obrazovky max.; žádné dlouhé expo. Preferuj **jednu volbu** s 2–4 variantami nebo krátký dialog + jedna volba.

**Od cca 10. dne (druhá polovina aktu):** večery mohou nést **druhou vrstvu** — odložený dopad včerejšího dne, ostřejší reakci NPC na verdikt, nebo krátký „dohled“ bez nové mechaniky. V `Mapa_15dni.csv` je to sloupec **Vecer_doplnek** (návrhy pro `Vlakna.csv` / `Dopisy.csv` / `evening_choice`).

**Propojení s tabulkami:** v `Mapa_15dni.csv` má každý pracovní den sloupce pro večer, poznámky a dále **Modif_dne**, **Vecer_doplnek**, **Patrani_navrh**; v `Balancing.csv` sloupec **Scenar_modif_navrh**. V `days.json` se obsah napojí až bude scénář nasazen do hry. Přehled milníků: [`Milniky-dynamika-akt1.md`](./Milniky-dynamika-akt1.md).

---

## 3. Emoční linka — matka a rodina

**Cíl:** vrstvit mezi týdny pocit, že Benedikt není jen soudcem za stolem, ale má **závazky mimo úřad**.

| Fáze | Kdy (orientačně) | Co se děje (scénář) |
|------|------------------|---------------------|
| Zavedení | 1. týden | Krátká zmínka / telefonát / nedělní volba „zavolat matce“. |
| Napětí | 2. týden | Zhoršení zdraví nebo finanční stres rodiny — ne jako trest za hraní, ale jako **časovaný kontext** k večerním volbám. |
| Rozhodnutí | 3. týden | Hráč volí, zda investuje čas / peníze / Naději; dopad na ranní texty nebo kapky. |
| Vyústění (Akt 1) | před koncem 20 dní | Jedna silnější scéna (návštěva, dopis, hádkа), která se promítne do **stav ducha** nebo archivu fragmentů — bez nutnosti nové mechaniky. |

**Kde to zapsat:** sloupec / poznámka v `Mapa_15dni.csv` a související řádky v dalších CSV (`Dopisy`, `Vlakna`…); v `days.json` později `evening_choice` / příznaky dle implementace.

---

## 4. Denní harmonogram soudců (připomínka)

Z `cases.mdc` (pro napojení případů na NPC / politiku):

- Božena: D1, 4, 8, 13, 18 (slot 1)
- Pospíšil: D3, 7, 14, 16 (slot 2)
- Hranice: D5, 10, 17 (slot 2)
- Marková: D3, 12, 19 (slot 2)

---

## 5. Co držet v mapě (CSV / Excel), pokud to chybí

1. **Večer** u každého pracovního dne 1–20.  
2. Sloupec nebo poznámka **emoce / rodina** (matka, dopis, návštěva).  
3. **Týdenní milníky** (konec týdne 7, 14, 20) — krátká věta „co hráč cítí jinak než včera“.  
4. Odkaz na **konkrétní případ** ve slotu (ID z `data/pool_cases_akt1.json` / případně `pool_cases_light_akt1.json`), až je rozvržení fixní.  
5. Sloupce **Modif_dne**, **Vecer_doplnek**, **Patrani_navrh** v `Mapa_15dni.csv` a **Scenar_modif_navrh** v `Balancing.csv` — orientační návrhy pro pozdější balance (bez závazných čísel).

---

## 6. Morální a politický tlak v čase

První týden je záměrně **rutinnější**; od **D5–D7** mapa přidává **Mor** a **Pol** (viz `Mapa_15dni.csv` / `Pripady.csv`). Druhá polovina aktu zvyšuje podíl náročnějších typů a **větvení** (VETVENI v poznámkách) — cílem je, aby hráč cítil **zhoršující se klima** města a úřadu, ne jen víc textu. Přesné váhy poolu se doladí v kódu a `days.json` podle hratelnosti.

**Doplněk k obsahu pool kauz:** v **2. a 3. týdnu** smí občas přijít i **těžší trestní kvalifikace** (násilí, smrt v obžalobě); ve **3. týdnu** cíleně **1–2 rebusové / nejednoznačné** kauzy (např. tři podezřelí, rozhodnutí „nejspíš kdo“). Detail a **netradiční modely** jsou v `.cursor/rules/cases.mdc` (sekce *Pool — trestní náročnost…*, *Rebus…*, *Netradiční modely*).

---

## 7. Modifikátory dne (ekonomika / inkoust) — návrh bez čísel

- Občas změnit **rozpočet dne** (sdílený inkoust, výdaje, jednorázový bonus) s **důvodem v ranním fragmentu nebo dopise**.  
- Plán: sloupec **Modif_dne** + **Scenar_modif_navrh** v CSV; konkrétní čísla až v `Balancing.csv` po playtestu.  
- Nesmí to přerůst v mikromanagement — max. několik „zvláštních“ dní na akt (už teď např. countdown k D16, Haas, zvraty).

---

## 8. Revize / odvolání — limity (aby nevyřadily nové kauzy)

- **Strop (návrh Akt 1):** nejvýše **2** krátké **revizní karty** na celý 20denní průchod **nebo** nejvýše **1** revize na **7 po sobě jdoucích herních dní** s případy — platí přísnější z obou limitů.  
- Revize je **krátká karta** (A/B), nikdy celý den místo nových spisů.  
- Časté vrácení věci **snižuje důvěru instituce** a šanci na třetí spis (`cases.mdc`) — tlak narativní, ne spam odvolání.

---

## 9. Pátrání a průzkum — náladové dny

- Sloupec **Patrani_navrh**: `std` = bez zvláštní úpravy; `stress` = kratší čas / vyšší stres v textu (naváže na Vina/Naděje v UI); `klid` = zdůrazněná rutina.  
- Mapa už označuje návrhy u D9, D12, D14, D18 — doladit při implementaci timed hunt a textů.

---

## 10. Shrnutí

- **Večery** = strukturovaný slot po případech, epizodní výprávění, ne druhý spis; od poloviny aktu mohou nést **druhou vrstvu** (*Vecer_doplnek*).  
- **Matka / rodina** = mezitýdenní emoční oblouk, vázaný na neděle a večerní volby.  
- **CSV** = řádky a čísla pro autory a balanci (včetně sloupců dynamiky); **tento MD** = význam a pořadí rámce; **[`Milniky-dynamika-akt1.md`](./Milniky-dynamika-akt1.md)** = milníky, limity revizí a odkazy; **`days.json`** = co zrovna běží ve hře.

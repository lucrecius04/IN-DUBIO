# Akt 1 — milníky a dynamika (20 dní)

Jednostránkový přehled pro autory, scénáristy a napojení na `data/days.json` / kód. **Čísla ekonomiky a přesné flagy** se doplní až po hratelném průchodu — zde jsou **vazby a limity**, ne finální balance.

Související: [`Mapa_20dni.csv`](./Mapa_20dni.csv) (nové sloupce *Modif_dne*, *Vecer_doplnek*, *Patrani_navrh*), [`InDubio_20dni_Mapa-scenar.md`](./InDubio_20dni_Mapa-scenar.md) (rámec), [`Balancing.csv`](./Balancing.csv) (sloupec *Scenar_modif_navrh*), [`.cursor/rules/cases.mdc`](../../.cursor/rules/cases.mdc).

---

## 1) Přehled milníků (děj + systém)

| Den | Milník / zátěž | Poznámka |
|-----|----------------|----------|
| 5 | První výrazně **morální** den v mapě | Navazuje rutina → morálka. |
| 6 | **Countdown** (dopis doktora / finance) | Časovaný kontext k večerům. |
| 7 | První silnější **politický** slot | Horáčková linie. |
| 8 | **VETVENÍ 1** (Vlček, očekávání) | Od D8 čitelnější politický tlak. |
| 10 | **Haasova vizitka**, národnostní tón (Hranice) | Tlak instituce / města. |
| 11 | **Vlček explicitní** | Eskalace mimo spis. |
| 13 | **Beneš**, **VETVENÍ 2** | Osobní + veřejná vrstva. |
| 14–15 | Mrtvý svědek, **dvojí zvrat**, ministerstvo | Špičková intenzita před závěrem. |
| 16 | **Haas osobně**, **VETVENÍ 3** | Ekonomický a morální uzel. |
| 18 | **Karas varuje**, **VETVENÍ 4** | Osobní cena rozhodnutí. |
| 19–20 | Předposlední den, **finále** (1 slot D20) | Epilog. |

Neděle a soboty: emoční / ekonomické **mezihry** (viz mapa-scenář §1 a §3).

---

## 2) Morální a politický podíl (tlak v čase)

V **`Mapa_20dni.csv`** už typy **Mor** / **Pol** přibývají od D5–D7 a dál. Tento soubor **neřeší váhy** — jen připomíná: druhá polovina aktu má **víc politických a morálních rozhodnutí** než úvod; nové případy nesmí ustoupit jen „papírování odvolání“ (viz §4).

### 2b) Pool v mapě — typ slotu vs. výjimky (netradiční, rebus)

- **Scénář už říká *kdy* jaký druh slotu:** ve **`Pripady.csv`** a **`Mapa_20dni.csv`** je u řádku dne sloupec **Typ** (`Rut` / `Mor` / `Pol`) a **Vrstva** (`Tyč` / `Pool` / `Var`) — to je přehled *morálka a politika v čase* oproti tyčím (Božena, Pospíšil, Hranice…).
- **Kódové váhy herního typu případu** (kolik % rutinní / morální / politický / osobní v náhodném výběru poolu): **`.cursor/rules/cases.mdc`** → sekce *VÁHOVÁNÍ PŘÍPADŮ (20 dní)* + *Pool — trestní náročnost vs. týden* (1. týden lehčí trestní tón; 2.–3. týden smí občas těžší obžaloba; výjimečně i **jasný záporák** — spor spíš o **přísnost trestu** než o zproštění).
- **Netradiční pool kauza (1–2 na Akt 1):** v CSV / poznámce označ např. **`Netradiční pool`** u vybraného **Pool** řádku; konkrétní modely (formální věc, řetěz příkazu, …) jsou v `cases.mdc` → *Pool — netradiční modely*.
- **Rebus / nejednoznačná odpovědnost (cca 1–2× ve 3. týdnu, orientačně D11–16):** v poznámce např. **`Rebus pool`** (sloupec *Pozn* v `Pripady.csv` nebo poznámka u dne v mapě); pravidla a omezení JSON v `cases.mdc` → *Pool — rebus / nejasné kauzy*.

---

## 3) Modifikátory dne (ekonomika / inkoust — návrh)

- **Cíl:** občas změnit **rozpočet dne** (± kapka, zvláštní výdaj, bonus z úřadu) s **narativním důvodem** v ranním fragmentu / dopise.
- **Kde plánovat:** sloupce *Modif_dne* a *Scenar_modif_navrh* v CSV; detaily v `Balancing.csv` až po číslech.
- **Od D10 orientačně:** dny s větším tlakem úřadu (D10, D11, D15–D16) jsou v mapě označeny krátkou značkou — engine později přiřadí konkrétní efekt.

---

## 4) Revize spisu / odvolání — **limity** (aby nežrala hru)

- **Tvrdý strop (návrh Akt 1):** nejvýše **2** krátké **revizní karty** (`review_card`) na **celý 20denní průchod**, nebo nejvýše **1** revize na **7 po sobě jdoucích herních dní** s případy — platí přísnější z obou, což dřív vyjde.
- Revize **nesmí** vyplnit celý pracovní den místo nových kauz: vždy krátká karta (A/B), pak **návrat k aktuálním spisům** téhož nebo následujícího dne.
- Časté revize **snižují důvěru instituce** a šanci na **třetí spis** (viz `cases.mdc`); to je záměr — tlak jinde než v počtu odvolání.

---

## 5) Večer — **druhá vrstva** (od cca D10)

- Kromě sloupce *Vecerni volba* použij *Vecer_doplnek*: odložený dopad, reakce NPC na včerejší verdikt, „druhá myšlenka“ před spaním.
- Propoj s **`Vlakna.csv`** / **`Dopisy.csv`**; forma stále 1–3 obrazovky (viz `InDubio_20dni_Mapa-scenar.md` §2).

---

## 6) Pátrání a průzkum — **náladové dny**

- Sloupec *Patrani_navrh*: `std` = bez zvláštní úpravy; `stress` = kratší čas / vyšší stres v textu (naváže na Vina/Naděje v kódu); `klid` = rutinní den bez timed hunt nebo zdůrazněná lehkost.
- Konkrétní dny v mapě: D12, D15, D18 mají návrh odlišení — doladit při implementaci.

---

## 7) Třetí spis (od D15)

Oddělený pool `data/pool_cases_light_akt1.json`, pravidla v `cases.mdc`. Tento přehled **nepřidává** třetí řádek do tabulky milníků — jen upozorňuje na synchronizaci s mapou od 15. dne.

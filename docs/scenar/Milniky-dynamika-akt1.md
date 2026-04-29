# Akt 1 — milníky a dynamika (15 pracovních dní)

Jednostránkový přehled pro autory, scénáristy a napojení na `data/days.json` / kód. **Čísla ekonomiky a přesné flagy** se doladí v `Balancing.csv` — zde jsou **vazby a limity**, ne finální balance.

Související: [`Mapa_15dni.csv`](./Mapa_15dni.csv), [`Pripady_15dni.csv`](./Pripady_15dni.csv), [`Balancing.csv`](./Balancing.csv), [`.cursor/rules/cases.mdc`](../../.cursor/rules/cases.mdc). Finální tyčové kauzy (D8+): [`../promts/PROMPT-finalni-tycove-pripady.md`](../promts/PROMPT-finalni-tycove-pripady.md). **Archiv 20d:** [`ARCHIV_20D_README.md`](./ARCHIV_20D_README.md) — `Mapa_20dni.csv` nebrat jako kanon běžného vývoje.

---

## 1) Přehled milníků (děj + systém)

| Prac. den (15d) | Milník / zátěž | Poznámka |
|-----|----------------|----------|
| 4 | **Countdown** (dopis doktora / finance) | Termín operace, tlak z domova. |
| 5 | První silnější **morální** pool v mapě | Přechod z rutiny. |
| 6 | **Pospíšil 2 (strach)**, Haasova vizitka | Osobní soudce vs. Hostinec. |
| 7 | **Horáčková**, politický pool, **VETVENÍ 1** | První silně politický den. |
| 8 | **Božena 3**, Hranice 2, třetí spis (light) | Tlak vrcholí u tyčí. |
| 9 | **Beneš**, **VETVENÍ 2** | Osobní pravda, účet za uhlí. |
| 10 | **Zvraty** (`tyc_zvraty_d10`, slot 2), rutinní pool (slot 1), light (slot 3) | Rodný list / Anna / Haas — osobní tyč místo klasického spisu. |
| 11 | **Haas osobně** (`tyc_haas_d11`, slot 2), rutinní pool (slot 1), light (slot 3) | **VETVENÍ 3**, obálka 300 Kčs; echo `flag_pospisil_dluzi` zůstává v ranním fragmentu. |
| 12 | **Závadová** (`tyc_zavadova_d12`, slot 2), morální pool (slot 1), light (slot 3) | Podvrh, Kruh svědomí; uzavření osobní trilogie D10–D12. |
| 13 | **Karas**, **VETVENÍ 4** | Osobní cena. |
| 14 | Marková obžalovaná, poslední pool | Předposlední pracovní den. |
| 15 | **Velezrada** (1 slot) | Epilog aktu. |

Neděle a soboty: emoční / ekonomické **mezihry** (viz mapa-scenář §1 a §3).

---

## 2) Morální a politický podíl (tlak v čase)

V **`Mapa_15dni.csv`** typy **Mor** / **Pol** přibývají od 2. týdne. Tento soubor **neřeší váhy** — jen připomíná: druhá polovina má **víc politických a morálních rozhodnutí** než úvod; nové případy nesmí ustoupit jen „papírování odvolání“ (viz §4).

### 2b) Pool v mapě — typ slotu vs. výjimky (netradiční, rebus)

- **Scénář už říká *kdy* jaký druh slotu:** ve **`Pripady_15dni.csv`** a **`Mapa_15dni.csv`** (sloupce *Typ S1* / *Typ S2*, *Vrstva*).
- **Kódové váhy herního typu případu** (rutinní / morální / politický / osobní v náhodném výběru poolu): **`.cursor/rules/cases.mdc`** → *VÁHOVÁNÍ PŘÍPADŮ* + *Pool — trestní náročnost vs. týden*.
- **Netradiční / rebus pool:** v poznámkách u dne v `Mapa_15dni` nebo v `cases.mdc` → *Pool — rebus* / *netradiční modely*.

---

## 3) Modifikátory dne (ekonomika / inkoust — návrh)

- **Cíl:** občas změnit **rozpočet dne** (± kapka, zvláštní výdaj, bonus z úřadu) s **narativním důvodem** v ranním fragmentu / dopise.
- **Kde plánovat:** sloupce *Modif_dne* a *Scenar_modif_navrh* v CSV; detaily v `Balancing.csv` až po číslech.
- **Od D10 orientačně:** dny s větším tlakem úřadu (D10, D11, D14–D15) jsou v mapě označeny krátkou značkou — engine později přiřadí konkrétní efekt.

---

## 4) Revize spisu / odvolání — **limity** (aby nežrala hru)

- **Tvrdý strop (návrh Akt 1):** nejvýše **2** krátké **revizní karty** (`review_card`) na **celou 15denní kampaň**, nebo nejvýše **1** revize na **7 po sobě jdoucích herních dní** s případy — platí přísnější z obou, což dřív vyjde.
- Revize **nesmí** vyplnit celý pracovní den místo nových kauz: vždy krátká karta (A/B), pak **návrat k aktuálním spisům** téhož nebo následujícího dne.
- Časté revize **snižují důvěru instituce** a šanci na **třetí spis** (viz `cases.mdc`); to je záměr — tlak jinde než v počtu odvolání.

---

## 5) Večer — **druhá vrstva** (od cca D10)

- Kromě sloupce *Vecerni volba* použij *Vecer_doplnek*: odložený dopad, reakce NPC na včerejší verdikt, „druhá myšlenka“ před spaním.
- Propoj s **`Vlakna_15dni.csv`** / **`Dopisy_15dni.csv`**; forma stále 1–3 obrazovky.

---

## 6) Pátrání a průzkum — **náladové dny**

- V **`Mapa_15dni.csv`** drž tón a stres dne v *Poznamkách*; starý sloupec *Patrani_navrh* existoval jen u archivní **Mapa_20dni** — v 15d ho nekopíruj.
- Konkrétní odlišení dle týdne a milníků doplň v `Balancing.csv` / `days.json` při implementaci.

---

## 7) Třetí spis (od D8)

Od druhého týdne kalendáře (`day >= 8`) může být na stole třetí spis v režimu light (viz `days.json` + `cases_light`). Pravidla drž v `cases.mdc`; tento přehled jen hlídá synchronizaci mapy a denních dat.

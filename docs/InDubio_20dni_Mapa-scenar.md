# IN DUBIO — 20denní mapa scénáře (Akt 1, rámec)

Tento dokument je **kanonický textový plán** pro rozvržení dní, večerů a emoční linky vedle tabulky `docs/InDubio_20dni_Mapa.xlsx` (listy `sheet1`–`sheet7`). Při rozporu mezi tabulkou a tímto textem upřednostni tento soubor pro vývoj příběhu a UI; čísla a přiřazení soudců drž v souladu s `data/days.json` a `.cursor/rules/cases.mdc`.

---

## 1. Týdenní skelet

| Den v týdnu | Dopoledne | Odpoledne / večer | Poznámka |
|-------------|-----------|-------------------|----------|
| Po–Pá | Ranní fragment (stůl / dopis / krátká scéna) | **Dva sloty případů** (sdílený inkoust), poté **večerní volba** | Jádro herní smyčky. |
| Sobota | Shrnutí týdne, bonusy | Volitelné krátké scény / odpočinek | Bez nových případů dle `cases.mdc`. |
| Neděle | Volný den (procházka, matka, dopisy…) | **Žádné případy** | Emoční a ekonomické důsledky větví. |

---

## 2. Večerní příběhy a volby (struktura výprávění)

**Slot:** ihned po uzavření obou případů dne (nebo po jednom, pokud testuješ tři ID — před releasem zpět na dva).

**Funkce večera:**

- oddech od „úřední“ řeči spisu,
- zarovnání s **rysy** (Naděje, Vina, Integrita…),
- krátké **epizodní** linky (NPC, matka, finance, politika),
- příprava na zítřejší tlak (inkoust, fragment, dopis).

**Forma:** 1–3 obrazovky max.; žádné dlouhé expo. Preferuj **jednu volbu** s 2–4 variantami nebo krátký dialog + jedna volba.

**Propojení s XLSX:** v mapě 20 dní vyhraď na každý pracovní den řádek nebo buňku „**Večer**“ s kódem scény (např. `EV-03-karas`) a odkazem na text v `docs/` nebo v `days.json`, až bude napojeno.

---

## 3. Emoční linka — matka a rodina

**Cíl:** vrstvit mezi týdny pocit, že Benedikt není jen soudcem za stolem, ale má **závazky mimo úřad**.

| Fáze | Kdy (orientačně) | Co se děje (scénář) |
|------|------------------|---------------------|
| Zavedení | 1. týden | Krátká zmínka / telefonát / nedělní volba „zavolat matce“. |
| Napětí | 2. týden | Zhoršení zdraví nebo finanční stres rodiny — ne jako trest za hraní, ale jako **časovaný kontext** k večerním volbám. |
| Rozhodnutí | 3. týden | Hráč volí, zda investuje čas / peníze / Naději; dopad na ranní texty nebo kapky. |
| Vyústění (Akt 1) | před koncem 20 dní | Jedna silnější scéna (návštěva, dopis, hádkа), která se promítne do **stav ducha** nebo archivu fragmentů — bez nutnosti nové mechaniky. |

**Kde to zapsat v produkci:** stejný list jako večery v `InDubio_20dni_Mapa.xlsx` — sloupec „**Emoce / matka**“ nebo poznámka u konkrétního dne; v `days.json` později `evening_scene_id` / `flags` dle implementace.

---

## 4. Denní harmonogram soudců (připomínka)

Z `cases.mdc` (pro napojení případů na NPC / politiku):

- Božena: D1, 4, 8, 13, 18 (slot 1)
- Pospíšil: D3, 7, 14, 16 (slot 2)
- Hranice: D5, 10, 17 (slot 2)
- Marková: D3, 12, 19 (slot 2)

---

## 5. Co doplnit do Excel mapy, pokud tam chybí

1. Řádek **Večer** u každého pracovního dne 1–20.  
2. Sloupec **Emoční / rodina** (matka, dopis, návštěva).  
3. **Týdenní milníky** (konec týdne 7, 14, 20) — krátká věta „co hráč cítí jinak než včera“.  
4. Odkaz na **konkrétní případ** ve slotu (ID z `pool_cases_akt1.json`), až je rozvržení fixní.

---

## 6. Shrnutí

- **Večery** = strukturovaný slot po případech, epizodní výprávění, ne druhý spis.  
- **Matka / rodina** = mezitýdenní emoční oblouk, vázaný na neděle a večerní volby.  
- **XLSX** = přehledová mřížka; **tento MD** = význam a pořadí pro autory a programátory.

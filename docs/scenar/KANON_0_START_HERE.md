# KANON 0 — START HERE (scénář, narace, audit)

Tento soubor je **primární vstupní bod** pro člověka i AI.
Nejprve čti tento dokument, až potom další zdroje.

---

## 1) Hierarchie pravdy (závazné pořadí)

1. **Runtime pravda (co hráč opravdu uvidí):**
   - `data/days.json`
   - `data/fragments.json`
   - `data/letters.json`
   - `data/pool_cases_akt1.json`
   - `data/ending_prelude.json`
   - `data/endings_epilog.json`
   - `data/knihovna.json`

2. **Autorský kanon (co má být):**
   - `docs/InDubio_StoryBible_v2_Cursor.txt`
   - `.cursor/rules/story.mdc`
   - `docs/scenar/Mapa_15dni.csv`
   - `docs/scenar/Pripady_15dni.csv`
   - `docs/scenar/Vlakna_15dni.csv`
   - `docs/scenar/Dopisy_15dni.csv`

3. **Pravidla a tón:**
   - `.cursor/rules/core.mdc`
   - `.cursor/rules/cases.mdc`
   - `.cursor/rules/economy.mdc`
   - `.cursor/rules/traits-factions.mdc`
   - `docs/world-reference.md`
   - `docs/analyza_soudni_reci_1925-1935.md`

Pokud jsou zdroje ve sporu:
- Pro **to, co hráč skutečně čte ve hře**, rozhoduje runtime vrstva.
- Pro **nové psaní a revize**, rozhoduje autorský kanon + stylová pravidla níže.

---

## 2) Legendy dnů (kritické)

- `currentDay` v runtime: **kalendářní dny** (včetně víkendů).
- `D1-D15` v CSV/rules: **pracovní dny kampaně**.
- Pro dokumentaci a audit je primarni identifikator dne **datum** (`YYYY-MM-DD`).

Tyto dvě osy se nesmí míchat bez explicitního přepočtu.
Definitivni prevodnik je v `docs/scenar/KALENDAR_1931_MAPA_DNU.md`.

---

## 3) Stav souborů (ACTIVE / LEGACY / UNCERTAIN)

Definitivní registr je v:
- `docs/scenar/SOUBORY_STATUS.json`

Pravidlo:
- `ACTIVE` = zdroj pro vývoj a audit.
- `LEGACY` = neměnit, jen kvůli historii.
- `UNCERTAIN` = pomocný/staging zdroj, vyžaduje ověření před použitím.

---

## 4) Audit packet pro externího auditora

### Minimum (poslat vždy)

- `docs/InDubio_StoryBible_v2_Cursor.txt`
- `.cursor/rules/story.mdc`
- `docs/scenar/Mapa_15dni.csv`
- `docs/scenar/Pripady_15dni.csv`
- `docs/scenar/Vlakna_15dni.csv`
- `docs/scenar/Dopisy_15dni.csv`
- `data/days.json`
- `data/fragments.json`
- `data/letters.json`
- `data/pool_cases_akt1.json`
- `data/ending_prelude.json`
- `data/endings_epilog.json`

### Extended (hlubší audit)

- `docs/scenar/Milniky-dynamika-akt1.md`
- `docs/scenar/Balancing.csv`
- `docs/pool_cases_akt1_prehled.md`
- `docs/world-reference.md`
- `docs/analyza_soudni_reci_1925-1935.md`
- `data/knihovna.json`
- `data/postavy_okoli.json`

---

## 5) Žánry textu a stylové režimy

Detailní pravidla:
- `docs/scenar/AUDIT_Styl_a_Zanry.md`

Rychlá orientace:
- **Ráno (fragment):** obraz, předtucha, klidný tlak.
- **Večer/noc:** důsledek dne, osobní tón, menší horizont.
- **Dopis:** jasný autor hlasu, přesný účel, bez výplně.
- **Setkání (visit/adventure):** konflikt zájmů, podtext, rozhodovací tlak.
- **Soudní text:** strohost, procedura, dobová terminologie.

---

## 6) Priorita před literárním auditem: prohloubení postav

První krok před stylistickým broušením je doplnit **vnitřní motivace, rozpory a osobní cenu rozhodnutí** u všech hlavních postav.
Pred timto krokem je povinny audit dramaturgie: co kdy kde se stane, proc se to stane a jaky to ma dopad.

Detailní plán:
- `docs/scenar/AUDIT_Postavy_1931_Plan.md`
- `docs/scenar/AUDIT_Styl_a_Zanry.md`
- `docs/scenar/AUDIT_Dramaturgie_Template.md`
- `docs/scenar/AUDIT_Drobnokresba_Postav_a_Sveta.md`

Zásady:
- Bez změny kanonických fakt.
- Vše ukotvit do ČSR 1931 (soud, úřady, tisk, krize, jazyk).
- Každé prohloubení musí mít konkrétní nosič v datech (fragment/dopis/dialog/scéna).

---

## 7) Zakázané zkraty

- Neopírat nové psaní o 20denní archiv.
- Nebrat `LEGACY` soubory jako zdroj pravdy.
- Nevytvářet nové „paralelní kanony“ mimo tento dokument.


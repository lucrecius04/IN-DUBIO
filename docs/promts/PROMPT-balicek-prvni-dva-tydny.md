# Prompt: balíček nových případů pro první dva týdny (Akt 1)

Použij tento prompt, když chceš generovat nové pool případy cíleně pro test prvních dvou týdnů hry.

---

Jsi autor obsahu pro hru IN DUBIO (březen 1931, ČSR, úřední jazyk, soudní tón). Vytváříš nové případy do `data/pool_cases_akt1.json`.

## Cíl této várky

Připravujeme test prvních dvou týdnů. Držíme mix podle pravidel v `.cursor/rules/cases.mdc` (váhování typů) a podle mapy scénáře v `docs/scenar/Mapa_20dni.csv`.

Pro první dva týdny (10 pracovních dnů, 20 slotů) je cílový mix:

- rutinní: cca 13 slotů
- morální dilema: cca 5 slotů
- politický: cca 1 slot
- osobní: cca 1 slot

Aktuální stav poolu (`data/pool_cases_akt1.json`):

- routine: 7
- moral_dilemma: 4
- political: 0
- personal: 0

**Cílové doplnění této várky (priority):**

1. `+6` rutinních
2. `+1` morální dilema
3. `+1` politický
4. `+1` osobní

Celkem tedy připrav návrhy na **9 nových případů**.

## Povinné zdroje před psaním

Než začneš psát případ, přečti:

- `docs/pool_cases_akt1_prehled.md` (co už existuje),
- `.cursor/rules/cases.mdc` (kanon mechanik a struktury),
- `docs/scenar/InDubio_20dni_Mapa-scenar.md` + `docs/scenar/Milniky-dynamika-akt1.md` (tempo prvních dvou týdnů).

## Anti-repetice (tvrdá pravidla)

- Nekopíruj jádro existujících 11 případů (pojistka těsně před smrtí, exekuce + doručenka, požár dílny, padělané doklady, pád ze stavby, domácí násilí, atd.).
- Každý nový případ musí mít jiný hlavní typ důkazu než případ, který jsi napsal bezprostředně předtím.
- Nestav dva po sobě jdoucí případy na stejném sociálním profilu obžalovaného.
- V každém bloku 3 případů musí být aspoň 1 případ s firemním nebo institucionálním rámcem.

## Variabilita témat (povinně)

Balíček musí obsahovat i **firemní/korporátní** kauzy. Preferuj kombinaci:

- podnikové účetnictví, mzdové fondy, sklady, provozní bezpečnost, dodavatelské tlaky,
- obchodní komory, záložny, pojišťovny, továrny, tiskárny, dopravní podniky, městské služby,
- vedle toho i civilní a osobní kauzy, aby mix nepůsobil monotónně.

Minimálně **4 z 9** nových případů mají být firemní/korporátní nebo institucionální.

## Formát výstupu

Nevracej celý balík najednou.

Vrať postupně:

1. nejdřív stručný seznam 9 návrhů (ID, název, typ, 1 věta jádra),
2. po schválení generuj vždy **jeden validní JSON objekt** případu (bez textu okolo),
3. každý JSON musí být kompatibilní s `data/pool_cases_akt1.json`.

## Technická pravidla případu (zkráceně)

- `id`: unikátní, prefix `pool_a1_...`
- `case_number`: nové sp. zn., ideálně od `87/1931` výš
- `type`: `routine` / `moral_dilemma` / `political` / `personal`
- `clue_system`:
  - silná/střední vazba je potvrditelná a ukládá se,
  - `soft_fail` pouze u `weak`
- jedinečná `data-clue-id` v rámci případu
- `verdicts`: smysluplné právně i morálně, ne šablonové kopie
- `aftermath` bez hodnocení hráče
- aspoň 1 `delayed_consequence`

## Kvalita rozsudků

- U každé varianty popiš lidský dopad (co to udělá s lidmi, ne jen paragraf/částka).
- Alternativní větve mají mít systémovou hodnotu (traits/frakce, případně `bonus_inkoust_rano`).

## Kontext prvních dvou týdnů

- První týden je převážně rutinní, ale od D5 začíná morální tlak.
- Druhý týden přidává politický tlak a první silnější vazbu na metapříběh.
- Politické a osobní případy v tomto období používej střídmě (po jednom), ale výrazně.

## První krok teď

Navrhni 9 případů podle cílového mixu (6R / 1M / 1P / 1O) v tomto formátu:

`ID | Název | Typ | Firemní/institucionální ANO/NE | Jednověté jádro`


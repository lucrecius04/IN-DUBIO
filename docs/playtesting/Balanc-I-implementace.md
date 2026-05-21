# Vlna I — hratelnost a statistiky (2026-05-20)

Doplněk k [H++](./Analyza-matice-konce-2026-05-20.md) a [G](./Balanc-G-navrh-velicin.md).

## Rysy

| Rys | Mechanika |
|-----|-----------|
| **Naděje** | Pomalý růst nad 55/70/85 (`state.js`); NG z verdiktů ×0,58; guilty −Naděj ×1,12 |
| **Moudrost** | Pomalý růst nad 76/88 |
| **Integrita** | (H++) strop růstu + NG ×0,48 + start 68 |

## Úplatek — příběhově rozložený

1. Den přijetí: **−12 INT, −5 Naděje, +3 Vina** (+ hotovost)
2. Dva následující rána: **−3 INT, −2 Naděje** (`flags.uplatek_tihy_zbyva`)

Dříve: `Finance.prijmoutUplatek` dával −15 INT navíc mimo verdikt.

## Konce

| Konec | Upřesnění |
|-------|-----------|
| **Hrdina** | Odvaha ≥ **88** (dříve 78) |
| **Přežití** | Naděje **28–72** (ne euforie na 99) |

Fallback D19 → přežití beze změny.

## Frakce

- Jedna změna max **±8** (dříve ±12) — večerní volby i verdikty.

## Kampanové statistiky (`kampan_statistiky`)

Po každém spisu: `verdikty_guilty`, `verdikty_ng`, `verdikty_insufficient`, `verdikty_tvrdy`, `uplatky_prijaty`.

## Epilog (`stats-summary.js`)

- **Cena spravedlnosti** = (balance − 20) / (100 − Vina)
- Krátký řádek + % průzkumu a počet tvrdých verdiktů

## Neděle — „klidová vina“

Pokud **Vina ≤ 15** a **Naděje ≥ 78** v neděli → `pondeli_vina_emotivni` (pondělní morální spis citlivější).

## Vlna L1 — Vina (2026-05-19)

| Změna | Soubor |
|-------|--------|
| Guilty Vina **×0,45** (dříve 0,6) | `cases.js` |
| Guilty při Vina ≥70: max **+2**/verdikt | `cases.js` |
| Kampaní strop **92** (výjimka: úplatek, `bezKampanStropu`) | `state.js`, `cases.js` |
| NG záporná Vina **×1,15** | `cases.js` |
| Zápisník Vina ≥85: doplněk textu | `traits.js` |

Cíl playtestu: tvrdé persony **Vina 85–92** (ne 97–100), stále **8/8** konců.

## Ověření

```powershell
npm run playtest:konce
```

Sledovat: INT/NAD měkkých person, korupce stále ≤55 s úplatkem, 8/8 konců, Vina tvrdých 85–92.

---

## Vlna K — kruh před korupcí + smíření + UX (2026-05-21)

| Změna | Soubor |
|-------|--------|
| **Kruh před korupcí** na D16+ (Zavadová) | `engine.js` |
| Korupce s úplatkem: **INT ≤ 45** (dříve 50) | `engine.js` |
| Smíření: **Vina ≤35** nebo **operace + Vina ≤45**; bohaté smíření průzkum &lt;65 % | `engine.js` |
| Vina růst: brzdění nad 85 / 90 | `state.js` |
| Sobotní věty z týdne (`N× tvrdý trest`, průzkum, úplatek) | `engine.js` |
| Spis při **Vina &gt; 80** (≥70 mírnější prefix) | `ui.js` |
| Bonus B: +INT jen při **Integrita &lt; 80** | `engine.js` |

---

## Vlna J — kolize konců + Vina (2026-05-20)

| Změna | Soubor |
|-------|--------|
| Korupce s úplatkem: **INT ≤ 50** (kruh 51–58 → rad) | `engine.js` |
| Anna chudoba: průzkum ≥50 % + bal &lt;170; moudrost ≥58 + bal &lt;175 | `engine.js` |
| Smíření bohaté: bal ≥140 jen při průzkum **&lt;55 %** | `engine.js` |
| Vina guilty: **×0,6**; trestní navíc **×0,75** | `cases.js` |
| Vina strop růstu: 72+ / 88+ diminishing | `state.js` |
| `uplatky_prijaty` i z Haase (flags / finance) | `cases.js`, `finance.js` |

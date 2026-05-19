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

## Ověření

```powershell
npm run playtest:konce
```

Sledovat: INT/NAD měkkých person, korupce stále ≤55 s úplatkem, 8/8 konců.

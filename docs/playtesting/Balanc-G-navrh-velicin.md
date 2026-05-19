# Vlna G — pestřejší rysy a frakce (implementováno 2026-05-19)

## Cíl

- Různé styly hry → **různé trajektorie** Integrita / Vina / Odvaha (ne INT 100 u všech).
- **8 konců** zůstávají dosažitelné (kalendář F1 + oprava smíření vs. Anna).

## Kde se mění

| Soubor | Změna |
|--------|--------|
| `js/cases.js` | `BALANC` G konstanty, škálování trait delt, cap ±3/verdikt, typové doplňky, meta bez +INT u vyváženého |
| `js/state.js` | Diminishing returns v `upravRys` |
| `js/engine.js` | `profilBlokujeSmireni` jen při annin chudé větvi |

## Konstanty (`BALANC`)

| Konstanta | Hodnota | Účinek |
|-----------|--------|--------|
| `TRAIT_DELTA_SCALE_NG` | 0.55 | ODV z not_guilty |
| `TRAIT_DELTA_SCALE_NG_INT` | 0.48 | Integrita z not_guilty (H++) |
| `TRAIT_DELTA_SCALE_NG_MOU` | 0.75 | Moudrost z NG |
| `TRAIT_DELTA_SCALE_INSUFFICIENT` | 0.85 | insufficient_* |
| `TRAIT_DELTA_SCALE_GUILTY_POS_INT_ODV` | 0.35 | kladná INT/ODV u guilty |
| `TRAIT_DELTA_CAP_PER_VERDIKT` | 3 | max \|Δ\| rysu na jeden rozsudek |
| `TYP_POLITICKY_INT_SWING` | 3 | dříve ±8 |
| `TYP_OSOBNI_FAIR_INT/ODV` | 2 / 1 | dříve 5 / 3 |
| `TYP_OSOBNI_BIAS_VINA` | 4 | dříve 8 |

## Meta-vrstva

- Proces **vysoký**: +Moudrost, −Vina (bez +Integrita).
- **Vyvážený** normativní směr: **bez** automatického +Integrita.

## Ověření

```powershell
node scripts/playtest-run.js milosrny 7
node scripts/playtest-run.js stredni_cesta 7
node scripts/playtest-run.js smireni_mekky 19
npm run playtest:konce
```

Cíl po G: INT na D7 u měkké ~75–88, u střední ~55–70; matice 8/8.

## Další fáze (volitelně)

- Hromadný přepis `effects` v `pool_cases_akt1.json` (nižší základní delty).
- Večerní volby: cap frakčních skoků ±4.

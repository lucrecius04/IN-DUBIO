# Rozložení tří složek na ilustrovaném stole (záloha)

Tento soubor archivuje **výchozí trojici pozic** pro `#slozka-1` … `#slozka-3` na scéně `#stul.desk-scene-root #plocha-stred` (inline styly v `index.html`).  
Aktivace v běhu: třída `slozky-wrapper--tri-sloty` na `#slozky-wrapper` (nastavuje `UI.aktualizujSlozky` při **≥ 3** aktivních spisech nebo při prázdném dni se třemi „čekajícími“ sloty).

## Souřadnice (trojice — produkční vzhled)

Selektor | `left` | `top` | `z-index` | `transform`
---|---|---|---|---
`#slozka-1` | `18.65%` | `calc(40.25% + 40px)` | `5` | `rotate(-3deg) scale(1.07)`
`#slozka-2` | `39.75%` | `calc(38.25% + 40px)` | `6` | `rotate(1deg) scale(1.07)`
`#slozka-3` | `60.25%` | `calc(38.25% + 40px)` | `7` | `rotate(3deg) scale(1.07)`

Hover (ne-`ceka`): slot 1 `rotate(-4.5deg) scale(1.1) translateY(-11px)`, slot 2 `rotate(2.5deg) scale(1.1) translateY(-11px)`, slot 3 `rotate(4.5deg) scale(1.1) translateY(-11px)`.

## Režimy ovládané z kódu

| Třída na `#slozky-wrapper` | Kdy |
|-----|-----|
| `slozky-wrapper--tri-sloty` | Tři aktivní spisy, nebo den bez spisů (tři sloty v režimu čekání). |
| `slozky-wrapper--dva-sloty` | Právě dva aktivní spisy (třetí slot v DOM skrytý). |
| `slozky-wrapper--jedna-slozka` | Jeden aktivní spis (např. finální den). |

Logika: `js/ui.js` → `aktualizujSlozky`.

Při přidání nového layoutu **vždy** držet slotové `id` (`slozka-1` … `slozka-3`) a indexy v `Cases.otevriPripad(i)` — mění se jen CSS, ne pořadí v poli případů.

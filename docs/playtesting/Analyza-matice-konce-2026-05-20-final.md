# Finální analýza matice konců — 8/8 (vlna K)

**Datum běhu:** 2026-05-20  
**Příkaz:** `npm run playtest:konce` (8×19 dní)  
**Stav:** 8/8 dokončeno, žádný `ABORTED`  
**Zásah cíle:** **8/8**  
**Kalendář dnů (`Konce_15dni.csv`):** **8/8**

---

## Souhrnná tabulka (referenční běh)

| Persona | Cíl | Výsledek | Den | INT | VIN | NAD | Fin | Úplatek |
|---------|-----|----------|-----|-----|-----|-----|-----|---------|
| `stredni_cesta` | přežití | **preziti** ✓ | 19 | 83 | 86 | 83 | 244 | ne |
| `korupcni` | korupce | **korupce** ✓ | 15 | 28 | 100 | 30 | 814 | ano |
| `hrdina_cisty` | hrdina | **hrdina** ✓ | 19 | 100 | 77 | 83 | 236 | ne |
| `zbohaceny_utek` | útěk | **utek** ✓ | 17 | 75 | 100 | 16 | 620 | ne |
| `smireni_mekky` | smíření | **smireni** ✓ | 16 | 87 | 33 | 83 | 334 | ne |
| `atentat_moc` | atentát | **atentát** ✓ | 17 | 84 | 97 | 14 | 557 | ne |
| `kruh_temny` | kruh | **rad** ✓ | 16 | 49 | 100 | 13 | 847 | ano |
| `anna_pravda` | Anna | **anna** ✓ | 18 | 97 | 19 | 87 | 158 | ne |

**Reporty:** `a43fa683…`, `c8012997…`, `84d74837…`, `117e4d12…`, `32f6bb08…`, `4df4e6f3…`, `031845eb…`, `8a44f315…`

---

## Vývoj matice (celá kampaň balancu)

| Fáze | Zásah | Co se změnilo |
|------|-------|----------------|
| Počátek | 3/8 | rad dominuje |
| Vlna E | 7/8 | kalendář, atentát/útěk |
| Vlna I–J | 6/8 | rysy, kolize kruh/anna/smíření |
| **Vlna K** | **8/8** | kruh před korupcí, smíření + Vina, UX týden/spis |

**Závěr pro „všechny konce dohratelné“:** u cílených person v automatické matici **splněno**. Hra je v režimu **vyladění zážitku a pohybů veličin**, ne „dostavět konce“.

---

## Co je hotové (neměnit bezdůvodně)

### 1. Logika osmi konců
- Pořadí vyhodnocení (kruh D16+ před korupcí, Anna před smířením).
- Prahy: korupce INT ≤45 + úplatek; smíření Vina ≤35 nebo operace + Vina ≤45.
- Fallback D19 přežití / hrdina podle Vlčka a ODV.

### 2. Rysy — smysluplný rozptyl (kromě Viny)
| Rys | Stav |
|-----|------|
| **Naděje** | Bipolární (měkké ~83, temné ~13–30) — **hotovo** |
| **Integrita** | Korupce nízko, kruh ~49, měkké vysoko — **pro konce OK** |
| **Moudrost** | Hrdina ~67, Anna 100 — přijatelné |
| **Finance + frakce** | Větve ekonomicky oddělené — **OK** |

### 3. UX (implementováno, ověřit ručně F6)
- Sobotní věty: „Tento týden N× tvrdý trest“, průzkum, úplatek.
- Spis při **Vina > 80** (≥70 mírnější prefix) — text v situaci.

---

## Co NENÍ hotové — Vina (kriticky)

### Problém
U **tvrdých person** (korupce, útěk, kruh) je **Vina skoro vždy 100**. U atentátu **97**. To je **mechanicky konzistentní** (25+ guilty spisů), ale **hráčsky slabé**:

- Zápisník ukáže ★★★★★ Vina celou druhou polovinu kampaně.
- Sobotní věta „4× tvrdý trest“ **nekoresponduje** s tím, že číslo už nemůže růst.
- Design v `traits-factions.mdc`: ★★★★★ = „zmizí maximum trest“ — u Viny 100 hráč **nemá kam klesat** během tvrdé cesty.
- **Smíření / Anna** (Vina 19–33) vs **korupce** (100) — kontrast je správný, ale střední cesta **Vina 86** je pořád „velmi vinný Ben“, ne „klidný soudce“.

### Odkud to jde (řetězec)

| Vrstva | Efekt |
|--------|--------|
| **Pool** `pool_cases_akt1.json` | guilty `vina` typicky **+1 až +3**, někde až **+12**; 25 guilty person ≈ **+25–40** surově |
| **`cases.js`** | guilty ×0,6, trestní ×0,75, cap **±4**/verdikt |
| **`state.js`** | brzdění růstu nad 72 / 85 / 90 |
| **Průzkum dirty** | +1 Vina na slot |
| **Meta / typové** | +Vina u nízké procesní kvality |

I po vlnách J/K: **25 guilty od startu ~60 → 85–100** je matematicky normální.

### Co znamená „odpovídající realitě“

Ben po tvrdém týdnu nemusí být na **100/100 vina** — spíš:

| Styl hry | Cílové pásmo Viny na konci |
|----------|----------------------------|
| Tvrdý / korupční | **75–92** (těžké svědomí, ještě prostor pro epilog) |
| Střední / přežití | **55–75** (unavený, ne zničený) |
| Měkký / Anna / smíření | **10–35** |
| Atentát | **65–85** (vina z tvrdosti, ne strop) |

---

## Doporučené úpravy Viny (vlna L) — bez rozbití 8/8

### L1 — kód (rychlé, doporučeno před G2)

| Úprava | Kde | Efekt |
|--------|-----|--------|
| `VINA_GUILTY_POS_SCALE` **0,6 → 0,45** | `cases.js` | guilty +3 → často +1 efektivně |
| **Cap Vina +2** na jeden rozsudek (guilty) když Vina ≥ 70 | `cases.js` | strop už „blízko“ |
| **Kampan strop** `Vina` max **92** z běžných rozsudků; nad 92 jen výjimky (úplatek +3, příběhové) | `state.js` | zabrání 100 u všech tvrdých |
| Silnější **NG −Vina** (×1,15) | `cases.js` | měkké větve lépe klesají |

Odhad: korupce/kruh/útěk **88–94**, atentát **82–90**, střední **70–80**.

### L2 — pool G2 (střední práce, nejvíc „realistické“)

Hromadně v `pool_cases_akt1.json`:

- `guilty` / `maximum` / `standard`: **`vina` −1** (min. 0 kde je 0).
- Extrémy **`vina` ≥ 8** → max **5**.
- `not_guilty` / `alternative`: mírně **více −Vina** u měkkých variant.

Nebo jeden loader multiplikátor: `poolVinaScale: 0.85` v `cases.js` při načtení effects.

### L3 — hratelnost (bez čísel)

- Při **Vina ≥ 85**: v zápisníku text pásmo „Těžké svědomí — další tvrdý trest už vás tolik nezmění“ (ne nutně měnit číslo).
- Fragment při prvním dosažení **90+** Viny (jednou za kampaň).

---

## Jsme „hotovi“ s balancováním pohybů?

| Oblast | Stav | Poznámka |
|--------|------|----------|
| **8 konců dosažitelných** | ✅ Hotovo | matice 8/8 |
| **Kalendář dnů** | ✅ Hotovo | |
| **Naděje, frakce, finance** | ✅ Z velké části | |
| **Integrita (konce)** | ✅ | měkké pořád vysoko — kosmetika |
| **Vina (pohyby)** | ⚠️ **Ne hotovo** | strop 100 u tvrdých |
| **Moudrost / Odvaha** | ✅ Přijatelné | |
| **Ruční F6** | ❓ Nevykonáno | nutné před „release balanc“ |
| **G2 pool JSON** | ❓ Volitelné | největší realistický skok pro Vinu |

### Verdikt jednou větou

**Konce a logika větví jsou hotové; balanc pohybů veličin je z ~85 % hotový — chybí hlavně realistická Vina u tvrdých guilty cest (kód L1 + volitelně G2), ne další přepisování `engine.js` konců.**

---

## Doporučené pořadí dál

1. **F6** — 30 min ručně: sobota (týdenní věty), spis při Vina>80, jedna tvrdá + jedna měkká cesta.
2. **Vlna L1** v kódu — cap 92 + guilty scale 0,45 → `npm run playtest:konce` (ověřit 8/8).
3. **Vlna L2** pool nebo loader — cíl Vina tvrdé **85–92**.
4. **Zmrazit** prahy konců v `engine.js`.
5. Obsah / encyklopedie / rozšíření dnů — až po L1+L2.

---

## Srovnání běhů (Vina)

| Persona | Po J (6/8) | Po K (8/8) |
|---------|------------|------------|
| střední | 86 | 86 |
| korupce | 100 | 100 |
| hrdina | 77 | 77 |
| smíření | 36 → preziti ✗ | **33** ✓ |
| kruh | 100, korupce ✗ | 100, **rad** ✓ |
| anna | smíření ✗ | **19** ✓ |
| atentát | 97 | 97 |

Vlna K **opravila konce**, ne **Vinu na stropu**.

---

## Související dokumenty

- [`Balanc-I-implementace.md`](./Balanc-I-implementace.md) — vlny I–K
- [`Analyza-os-hrani.md`](./Analyza-os-hrani.md) — pool, archetypy, finance
- [`Plan-balancing-F-hratelnost.md`](./Plan-balancing-F-hratelnost.md) — F6 checklist
- [`Jizdni-rad-balancingu.md`](./Jizdni-rad-balancingu.md) — kde co v kódu leží

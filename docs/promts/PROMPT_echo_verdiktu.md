# PROMPT: Echo verdiktů — svět reaguje na Benova rozhodnutí

## Co chci

Ranní fragmenty, noviny a svědectví v pozdějších dnech **občas zmíní výsledek dřívějšího případu**. Ne jako mechaniku — jako jednu větu v textu, podmíněnou flagem z minulého rozsudku. Hráč cítí, že jeho rozhodnutí žijí ve světě, aniž by hra říkala „udělal jsi X".

## Princip

V `days.json` mohou ranní fragmenty, novinové texty a svědectví pool případů obsahovat **podmíněné varianty** — jednu větu navíc nebo alternativní formulaci podle toho, jak hráč rozhodl v minulém případu.

## Implementace

### 1. Flagy z rozsudků

Po každém rozsudku `Cases.zpracujRozsudek` už ukládá verdikt do `State`. Potřebujeme, aby engine při ukládání nastavil i čitelný flag. Například po případu `pool_a1_lekarna`:

```javascript
// V Cases.zpracujRozsudek nebo v aftermath logice:
State.flags[`verdict_${caseId}`] = verdictGroup; 
// verdictGroup = 'guilty' | 'not_guilty' | 'insufficient' | 'alternative'

// Příklad výsledku v State.flags:
// verdict_pool_a1_lekarna: 'alternative'
// verdict_pool_a1_trafika: 'not_guilty'
// verdict_pool_a1_weiss: 'guilty'
```

### 2. Podmíněné texty v `days.json`

Ranní fragment a noviny mohou mít pole `conditional_lines` — pole objektů s podmínkou a textem. Engine projde pole, najde první splněnou podmínku a **připojí** větu k základnímu textu. Pokud žádná podmínka nesedí, nic se nepřidá.

```json
{
  "day": 6,
  "morning_fragment": "Plakát na zdi: POCHOD HLADU.",
  "morning_conditional_lines": [
    {
      "condition": { "flag": "verdict_pool_a1_lekarna", "value": "alternative" },
      "text": "Na Národní třídě lékárna U Sv. Anny stále otevřená. Dozorčí režim. Malina stojí za pultem."
    },
    {
      "condition": { "flag": "verdict_pool_a1_lekarna", "value": "guilty" },
      "text": "Lékárna U Sv. Anny zavřená. Na dveřích cedule: K PRONÁJMU. Někdo pod ni napsal tužkou cenu."
    }
  ]
}
```

### 3. Logika vyhodnocení (engine)

```javascript
function vyhodnotPodmineneRadky(conditionalLines) {
  if (!conditionalLines || !conditionalLines.length) return '';
  for (const line of conditionalLines) {
    const flagValue = State.flags[line.condition.flag];
    if (flagValue === line.condition.value) {
      return ' ' + line.text; // připojit za základní fragment
    }
  }
  return ''; // žádná podmínka nesplněna
}

// Použití:
const ranniText = den.morning_fragment 
  + vyhodnotPodmineneRadky(den.morning_conditional_lines);
```

### 4. Kde nepoužívat

- **Nikdy v samotném spisu** jiného případu (to by narušilo právní neutralitu)
- **Nikdy jako mechanický dopad** (žádné „protože jsi odsoudil X, teď máš -5")
- **Nikdy jako hodnocení** („to jsi neměl dělat")
- Jen v: ranní fragmenty, noviny, svědectví NPC (chodba), večerní scény

### 5. Konkrétní příklady ech pro 15denní mapu

Tyto podmíněné řádky vlož do příslušných dní v `days.json`:

**Den 6 — ráno (echo Lékárny z D2):**
```json
"morning_conditional_lines": [
  {
    "condition": { "flag": "verdict_pool_a1_lekarna", "value": "alternative" },
    "text": "Na Národní lékárna stále otevřená. V okně nový nápis: Dozorčí režim. Pod ním stojí fronta."
  },
  {
    "condition": { "flag": "verdict_pool_a1_lekarna", "value": "guilty" },
    "text": "Lékárna na Národní zavřená. Cedule K PRONÁJMU. Někdo pod ni napsal tužkou číslo."
  },
  {
    "condition": { "flag": "verdict_pool_a1_lekarna", "value": "not_guilty" },
    "text": "U lékárny na Národní postává inspektor. Malina za pultem předstírá, že ho nevidí."
  }
]
```

**Den 7 — noviny (echo Weisse z D2):**
```json
"newspaper_conditional_lines": [
  {
    "condition": { "flag": "verdict_pool_a1_weiss", "value": "alternative" },
    "text": "Krátká zpráva na třetí straně: Berlínský občan požádal o azyl v ČSR. Ministerstvo bez komentáře."
  },
  {
    "condition": { "flag": "verdict_pool_a1_weiss", "value": "guilty" },
    "text": "Pod čarou: Cizinec s padělanými doklady odsouzen. Deportace do Německa v řízení."
  }
]
```

**Den 8 — ráno (echo Nemocenské z D5):**
```json
"morning_conditional_lines": [
  {
    "condition": { "flag": "verdict_pool_a1_nemocenska", "value": "alternative" },
    "text": "Svejda při kávě: 'Slyšel jsem, že inspekce prověřuje závodního lékaře ve Smíchově. Váš případ, ne?'"
  },
  {
    "condition": { "flag": "verdict_pool_a1_nemocenska", "value": "guilty" },
    "text": "Svejda při kávě: 'Ten tkadlec ze Smíchova. Vrátil se do práce. Kašle, ale je tam.'"
  }
]
```

**Den 9 — ráno (echo Staré rány z D6):**
```json
"morning_conditional_lines": [
  {
    "condition": { "flag": "verdict_pool_a1_stara_rana", "value": "alternative" },
    "text": "Na chodbě mladá dívka. Ptala se vrátného, kde jsou sociální služby. Ben ji poznal — Jitka Hofrová."
  },
  {
    "condition": { "flag": "verdict_pool_a1_stara_rana", "value": "guilty" },
    "text": "Na chodbě ticho. Ben si vzpomněl na Hofrovou. Nevzpomněl si proč."
  }
]
```

**Den 10 — noviny (echo Výlohy z D5):**
```json
"newspaper_conditional_lines": [
  {
    "condition": { "flag": "verdict_pool_a1_vytrznost", "value": "alternative" },
    "text": "Sloupek: Akademický národní spolek pod dohledem policie. Zdroj z vedení spolku popřel souvislost."
  },
  {
    "condition": { "flag": "verdict_pool_a1_vytrznost", "value": "not_guilty" },
    "text": "Na Vodičkově nová výloha. Sklo lesklé. Meisel napsal stížnost na policii — marně."
  }
]
```

**Den 12 — ráno (echo Záložny z D6):**
```json
"morning_conditional_lines": [
  {
    "condition": { "flag": "verdict_pool_a1_exekuce", "value": "alternative" },
    "text": "Ve Svobodném obzoru krátký sloupek. Bez podpisu. O exekucích na venkově. Ben věděl, kdo ho napsal."
  },
  {
    "condition": { "flag": "verdict_pool_a1_exekuce", "value": "guilty" },
    "text": "Součková zaplatila pokutu. Syn Josef prodal hodinky. Hospodářství stálo dál. Lopata taky."
  }
]
```

**Den 14 — ráno (echo Trafiky z D2/D5):**
```json
"morning_conditional_lines": [
  {
    "condition": { "flag": "verdict_pool_a1_trafika", "value": "not_guilty" },
    "text": "Na Žižkově nová trafika. Dvě děti sedí za pultem a kreslí. Bartošová počítá drobné."
  },
  {
    "condition": { "flag": "verdict_pool_a1_trafika", "value": "guilty" },
    "text": "Na Žižkově prázdný krám. Výloha zaprášená. Někdo tam nechal dětskou kresbu."
  }
]
```

### 6. Pravidla pro autory ech

- **Max 1 echo na den.** Nevrstvit — jeden den, jeden odkaz na minulost.
- **Echo přijde 3–7 dní po rozsudku.** Dřív je moc brzy, později hráč zapomněl.
- **Echo nikdy nehodnotí.** Jen popisuje stav světa. „Lékárna zavřená" — ne „kvůli tvému rozhodnutí."
- **Echo je jedna věta.** Max dvě. Žádný odstavec.
- **Echo neovlivňuje stats.** Čistě textové, žádné effects.
- **Podmínka je vždy na konkrétní verdikt.** Ne na staty — na flag z rozsudku.
- **Pokud pool případ nebyl přiřazen k tomu dni** (náhodný výběr ho přeskočil), podmínka prostě nesedí a nic se nezobrazí. Žádný fallback potřeba.

### 7. Co nedělat

- Neodkazovat na případ, který hráč ještě neměl (ověřit den případu < den echa)
- Nedávat echo do svědectví jiného případu (narušuje právní neutralitu spisu)
- Nedávat echo do večerních voleb (ty mají vlastní logiku)
- Nepoužívat echo k vysvětlení mechanik („protože jsi zvolil X, teď...")

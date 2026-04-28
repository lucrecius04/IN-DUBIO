# PATCH CHECKLIST — tyc_velezrada_d15 + days.json

Proveď přesně tyto změny v projektu. Žádný překlad, žádné přepisování textu.

---

## 1. data/days.json — den 15, přidat případ

V poli `cases` dne 15 nahraď stávající pool případy takto:

```json
"cases": ["tyc_velezrada_d15"]
```

A přidej podmíněný ranní fragment:

```json
"morning_conditional_lines": [
  {
    "condition": { "flag": "benes_pravda_prijata", "value": true },
    "text": "V zásuvce pod nálezy leží obálka. Ben ví, čí podpis je na tom dokumentu."
  }
]
```

---

## 2. docs/Pripady/tyc_velezrada_d15.json — flag typo (2× výskyt)

Najdi a nahraď VŠECHNY výskyty:

```
"flag_wolf_zprostren"  →  "flag_wolf_zprosten"
```

Jsou dva výskyty — v `not_guilty.formal.effects.flags` a v `not_guilty.with_comment.effects.flags`.

---

## 3. docs/Pripady/tyc_velezrada_d15.json — clue ID překlep

Najdi a nahraď VŠECHNY výskyty:

```
clue_dvarak_evidence  →  clue_dvorak_evidence
```

Výskyty jsou v: `testimonies[1].text`, `contradictions`, `clue_system.pairs`, `investigation.records.text`.

---

## 4. docs/Pripady/tyc_velezrada_d15.json — pair_id diakriktika

V `clue_system.pairs`, druhý pár — nahraď `pair_id`:

```
"podpis_vs_peníze_medium"  →  "podpis_vs_penize_medium"
```

---

## 5. docs/Pripady/tyc_velezrada_d15.json — informant variants

V `investigation.informant.variants` odstraň klíč `benes_prijal`
a jeho obsah přidej jako první odstavec do klíče `default`:

```json
"default": "[obsah benes_prijal]\n\n[původní obsah default]"
```

Konkrétně — klíč `default` má nově znít:

```
"Pokud Ben přijal Benešův dokument v D9: Z obálky, kterou Ben stále má nebo měl, 
plyne, že sporný dokument ze září 1928 byl podepsán jiným člověkem — někým z ministerstva, 
jehož jméno Ben zná. Wolf byl nastražen. Transakce s Haasem jsou reálné — ale šlo 
o legální poradenství, ne o státní tajemství. Obžaloba stojí na padělaném klíčovém důkazu.\n\n
Wolf byl propuštěn den před datem na dokumentu, který ho obviňuje. Buď grafolog lže, 
nebo dokument lže, nebo Wolf lže. Jeden z nich lže — a Ben nemá dost informací, 
aby věděl který."
```

A klíč `benes_prijal` smaž.

---

## Ověření po patchování

```javascript
// V konzoli prohlížeče:
// 1. Ověř den 15:
console.log(days.find(d => d.day === 15).cases);
// Očekáváno: ["tyc_velezrada_d15"]

// 2. Ověř clue IDs:
// Otevři případ a zkontroluj, že párovací mechanika funguje
```

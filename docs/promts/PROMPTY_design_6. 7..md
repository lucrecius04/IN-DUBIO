

# PROMPT 2: Jeden nemožný případ

## Co chci

Jeden pool případ v celé hře, kde **neexistuje správná odpověď**. Ne morální dilema (tam je správná odpověď, jen je bolestivá). Tohle je případ, kde každý verdikt někoho zničí a hra to hráči nikdy neřekne. Aftermath je neutrální. Stats jsou vyvážené. Žádná varianta není „ta lepší".

## Zadání pro autora případu

Napiš nový pool případ podle kuchařky v `pool_cases_akt1_prehled.md` a pravidel v `.cursor/rules/cases.mdc`. Specifika:

### Premisa

**Případ: Poslední vůle** (`pool_a1_posledni_vule` | Morální dilema | Dny 9–14)

Starý učitel Alois Krejsa (72) zemřel v lednu. V závěti odkázal dům ve Vršovicích synu Václavovi (38, nezaměstnaný, tři děti). Ale tři dny před smrtí **ústně** řekl sousedce Haně Procházkové, že chce dům přepsat na městskou školu — „ať z toho mají děti, co nemají kam jít."

Václav napadl závěť. Procházková svědčí o ústní vůli. Notář potvrzuje platnost **písemné** závěti. Ale: v Krejsově deníku je zápis z 18. ledna — „Václav nepřišel na Vánoce. Ani na Nový rok. Třetí rok."

### Proč je to nemožné

- **Platit závěť** (syn dědí) → Václav, který otce opustil, dostane dům. Prodá ho. Děti ze školy nemají kam jít. Ale zákon je jasný.
- **Uznat ústní vůli** (škola dědí) → Tři Václavovy děti přijdou o střechu. Precedent: ústní vůle bez dvou svědků je v ČSR 1931 právně pochybná. Ale lidsky pochopitelná.
- **Nedostatek důkazů** → Případ se vrátí k civilnímu senátu. Dům zatím chátrá. Nikdo nemá nic.
- **Alternativní** (po průzkumu) → Rozdělení: přízemí škole, patro synovi. Kompromis, který si nikdo nepřál. Krejsa chtěl celý dům dětem. Václav chtěl celý dům sobě.

### Klíčový designový princip

- Všechny verdikty mají **vyrovnané effects** — žádný není numericky výhodnější
- Aftermath texty jsou **neutrální** — popisují důsledky bez hodnocení
- `stamp_moment` je u všech variant **stejně tichý**
- Žádný verdikt neodemyká bonus nebo speciální fragment
- **Žádná volba není „alternativní" ve smyslu lepší** — alternativa je jen jiný druh špatného

### Effects (vyrovnané)

```json
"guilty": {
  "sentences": {
    "standard": {
      "label": "Závěť platí — dům synovi",
      "effects": { "integrita": 3, "vina": 3, "nadeje": -2, "lid": -3, "finance": 10 }
    }
  }
},
"not_guilty": {
  "approaches": {
    "with_comment": {
      "label": "Ústní vůle — dům škole",
      "effects": { "integrita": -2, "vina": 2, "nadeje": 2, "lid": 3, "finance": 10 }
    }
  }
},
"insufficient_evidence": {
  "options": {
    "return": {
      "label": "Vrátit civilnímu senátu",
      "effects": { "integrita": 1, "vina": 2, "moudrost": 2, "finance": 10 }
    }
  }
},
"alternative": {
  "label": "Rozdělit dům — přízemí škole, patro synovi",
  "effects": { "integrita": 1, "vina": 2, "nadeje": -1, "lid": 1, "finance": 10 }
}
```

### stamp_moment

```json
"stamp_moment": {
  "guilty": "Václav se díval na Procházkovou. Procházková se dívala na podlahu.",
  "not_guilty": "Procházková přikývla. Václav se posadil. Tři děti na chodbě si hrály s knoflíkem.",
  "insufficient": "Nikdo nevstal. Nikdo nevěděl, kdo vyhrál."
}
```

### Aftermath (neutrální)

- `guilty`: „Dům ve Vršovicích prodán v březnu. Nový majitel otevřel trafiku. Škola hledá prostory."
- `not_guilty`: „Škola se nastěhovala v dubnu. Václav podal odvolání. Děti chodí do školy. Jeho děti taky."
- `insufficient`: „Dům stojí prázdný. Na fasádě někdo napsal křídou: KOMU."
- `alternative`: „V přízemí se učí. V patře Václav kouří u okna a dívá se na školní dvůr."

### Proč zrovna tenhle případ

- Echo Benova vlastního otce (zmíněn ve Story Bible?)
- Echo rozhodnutí o matce (finance na operaci vs. jiné použití)
- Zákon vs. vůle vs. potřeba — tři osy, žádná vítězná
- V kontextu 1931: domy jsou jedinou jistotou v krizi. Ztratit dům = ztratit všechno.

### Technické

- `available_days`: [9, 10, 11, 12, 13, 14] — druhá polovina hry, když hráč už ví, že nic není jednoduché
- Typ: `moral_dilemma`
- 2 rozpory, 1 silný pár, 2 decoys
- Konfrontace: Procházková vs. Václav tváří v tvář — ani jeden necouvne

---

# PROMPT 3: Tichý den

## Co chci

Jeden konkrétní den v `data/days.json`, kde se **nic zvláštního nestane**. Žádný dopis, žádný zvrat, žádná večerní volba. Jen dva rutinní pool případy, krátký ranní fragment a ticho. Účel: kontrast k eskalaci kolem — hráč čeká ránu, která nepřijde, a příští den je o to tvrdší.

## Který den

**Den 5** (pátek prvního týdne). Důvod: D4 přinesl countdown (dopis doktora, 400 Kč), Vlčkovu pochvalu a napětí. D6 přinese Haasovu vizitku a morální pool. Mezi tím — ticho. Hráč zpracovává D4 a netuší, co přijde v pondělí.

## Implementace v `data/days.json`

Den 5 má tuto strukturu:

```json
{
  "day": 5,
  "weekday": "patek",
  "phase": "morning",
  "cases": ["pool", "pool"],
  "cases_type_weights": { "rutinni": 80, "moralni": 20 },
  "morning_fragment": "Slunce. Poprvé tento měsíc. Na chodbě voní káva — někdo ji vařil na kanceláři naproti. Ben otevřel okno. Vzduch byl jiný.",
  "evening_choice": null,
  "evening_fragment": null,
  "night_fragment": "Ben usnul brzy. Poprvé za týden se mu nic nezdálo.",
  "letters": [],
  "events": [],
  "newspaper": null,
  "notes": "TICHY DEN. Zadny dopis, zadny zvrat, zadna vecerni volba."
}
```

## Co se NESMÍ stát v tichém dni

- Žádný dopis (pole `letters` prázdné)
- Žádná událost (pole `events` prázdné)
- Žádná večerní volba (`evening_choice: null`)
- Žádné noviny s dramatickým nadpisem (`newspaper: null` nebo neutrální)
- Žádná zmínka o Haasovi, Vlčkovi, matce, Martinovi, Karasovi
- Žádný NPC na chodbě (ranní fragment jen počasí/atmosféra)

## Co se MÁ stát

- Dva **rutinní** pool případy (žádný morální, žádný politický)
- Krátký ranní fragment — **max 2 věty**, jen smyslový vjem (světlo, vzduch, zvuk)
- Krátký noční fragment — **1 věta**, klidná
- **Tlačítko „Další den"** se objeví hned po vyřešení obou případů, bez čekání

## Jak to pozná hráč

Nepozná to vědomě. Prostě ten den projde rychleji, cítí úlevu, a druhý den (D6: vizitka, pochod hladu, morální pool) ho zasáhne o to víc. Hra to nikdy nekomentuje. Ticho mluví samo.

## Volitelný detail

Pokud chceš ticho ještě podtrhnout: ranní fragment dne 6 může začínat kontrastem.

```
D5 ráno: "Slunce. Poprvé tento měsíc."
D6 ráno: "Plakát na zdi u soudu: POCHOD HLADU. Někdo přelepil včerejší slunce."
```

Jedna věta zpětně promění tichý den v klidný nádech před úderem.

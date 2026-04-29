# PROMPT: Ranní / večerní / víkendové fragmenty (IN DUBIO)

Tento prompt použij, když chceš dopsat nebo přepsat texty v `data/days.json` pro:

- `morning_fragment` (+ `morning_conditional_lines`)
- `evening_choice` (text + volby + případný fragment po volbě)
- `nedelni_volba` / víkendové přechody (`evening_fragment`, `night_fragment`)

---

## Co má vzniknout

Vytvoř obsah pro konkrétní den (nebo balík dnů) tak, aby seděl na mapu dne, dějové milníky a aktuální stav hry.

**Cíl:** krátké, atmosférické, funkční texty, které:

- drží noir tón a dobový jazyk 30. let,
- navazují na případy dne a dopisy,
- nehodnotí hráče,
- přirozeně vedou do další fáze dne.

---

## Vstupy, které dostaneš

Pracuj s těmito podklady (vždy je vyžaduj, pokud chybí):

1. `data/days.json` (aktuální stav dne)
2. `docs/scenar/Mapa_15dni.csv` (nálada dne, poznámky, rytmus)
3. `docs/scenar/Pripady_15dni.csv` (sloty případů)
4. `docs/scenar/Dopisy_15dni.csv` + `data/letters.json` (dopisové beaty)
5. `docs/InDubio_StoryBible_v2_Cursor.txt` (kanon postav a oblouk)
6. `docs/analyza_soudni_reci_1925-1935.md` (dobový jazyk)

---

## Tvůj úkol

### A) Ráno (`morning_fragment`)

- Napiš 2–4 věty.
- Jedna věta má být obraz (ulice, světlo, ruce, papír, zvuk chodby).
- Jedna věta má nést tlak dne (finance, politické napětí, vina, očekávání).
- Pokud je den navázán na zásadní událost (Beneš, Haas, Závadová, Karas), naznač to, ale nevyspoileruj.

### B) Echo (`morning_conditional_lines`)

- Přidej max 1 echo na den.
- Echo navazuje na starší verdikt/flag (3–7 dní zpět ideálně).
- Echo je 1 věta (max 2), bez hodnocení hráče.
- Echo jen ukazuje důsledek ve světě, ne mechaniku.

### C) Večer (`evening_choice`)

- Napiš úvodní text večera (1–3 věty, komorní tón).
- Navrhni 2 volby (výjimečně 3), každá:
  - má jasné gesto (co Ben dělá),
  - má jinou emoční stopu,
  - sedí na rytmus dne (ne náhodná minihra).
- Volby nepiš moderním jazykem, ne psychologický esej.

### D) Víkend (`nedelni_volba`, `evening_fragment`, `night_fragment`)

- Sobota: krátké shrnutí únavy týdne, ne nový velký twist.
- Neděle: klidnější tón, ale se stínem následků.
- Víkendové texty mají připravit pondělí, ne uzavřít celý příběh.

---

## Tón a nálada podle fáze kampaně

### D1–D5 (falešná normalita)
- tón: střízlivý, civilní, s prvními prasklinami
- nálada: rutina + nenápadný tlak

### D6–D10 (praskliny a tlak)
- tón: sevřenější, ostřejší podtext, méně jistoty
- nálada: finance, politika, svědomí

### D11–D15 (osobní kolize a závěr)
- tón: úsporný, těžký, přesné obrazy
- nálada: nevratnost, únava, rozhodnutí

---

## Pravidla (povinné)

- Nehodnoť hráče (žádné „udělal jsi správně/špatně“).
- Nepiš mechanické tooltipy v narativu.
- Žádné anachronismy (moderní slang, současné obraty).
- Drž stručnost: fragmenty jsou rytmus, ne povídka.
- Každý text musí být použitelný rovnou do `days.json`.

---

## Výstupní formát

Vrať jen JSON úsek(y) pro konkrétní den/dny, které se mají vložit do `days.json`.

Používej tento tvar:

```json
{
  "day": X,
  "morning_fragment": "…",
  "morning_conditional_lines": [
    {
      "condition": { "flag": "verdict_pool_a1_xxx", "value": "guilty" },
      "text": "…"
    }
  ],
  "evening_choice": {
    "text": "…",
    "options": [
      { "text": "…", "effects": { "Moudrost": 2 } },
      { "text": "…", "effects": { "Nadeje": 1, "Vina": 1 } }
    ]
  },
  "evening_fragment": "…",
  "night_fragment": "…"
}
```

Pokud některé pole pro den nemá existovat, vrať explicitně `null` nebo ho vynech dle zadání.

---

## Rychlá QA kontrola před odevzdáním

- Sedí text na denní milník v `Mapa_15dni.csv`?
- Je v textu konkrétní obraz (ne jen abstrakce)?
- Je tón dobový a střídmý?
- Není tam spoiler zvratu před jeho dnem?
- Je echo jen důsledek, ne komentář?
- Jsou volby večera odlišné a obě uvěřitelné?


# QA Gate — nový pool případ (před vložením do systému)

Použij tento checklist pokaždé, když autor vrátí nový JSON případ.

## 1) Rychlý tok práce

1. Autor vrátí **jeden validní JSON objekt** případu.
2. Zkontroluj tento checklist.
3. Pokud projde: vlož do `data/pool_cases_akt1.json`.
4. Doplň řádek do `docs/pool_cases_akt1_prehled.md`.
5. Otestuj ve hře (otevření spisu, klikací stopy, průzkum, rozsudky).

---

## 2) PASS/FAIL checklist (8 bodů)

### A. Identita a metadata

- [ ] `id` je unikátní (`pool_a1_*`) a není už použité.
- [ ] `case_number` nekoliduje s existující sp. zn.
- [ ] `type` je jedna z podporovaných hodnot (`routine`, `moral_dilemma`, `political`, `personal`).
- [ ] `slot: "pool"`, `act`, `available_days` dávají smysl pro cílený denní rámec.

### B. Struktura kompatibilní s loaderem

- [ ] `defendant.occupation` existuje (ne `profession`).
- [ ] `testimonies[].speaker` existuje (ne `witness`).
- [ ] `investigation.*.cost` je číslo (`1` nebo `2`), ne objekt.
- [ ] `confrontation` používá `prompt` + `success.text` (ne jen `reveal`).

### C. Two-Click a odemykání

- [ ] `soft_fail` je pouze u `weak` páru.
- [ ] `true_pair_id` existuje v `pairs`.
- [ ] Všechny `a_id`/`b_id`/`decoys` odkazují na existující `data-clue-id` v textech.
- [ ] `info_threshold_unlocks` je ve tvaru `[{ "min": X, "ids": [...] }]`.
- [ ] `unlock_actions` používá runtime ID: `pool_inv_interview`, `pool_inv_records`, `pool_inv_informant`, `pool_inv_confrontation`.

### D. Verdikty a efekty

- [ ] `verdicts` má konzistentně `guilty` + `not_guilty` (+ ideálně `insufficient_evidence`).
- [ ] Efekty používají standardní klíče (`integrita`, `odvaha`, `moudrost`, `vina`, `nadeje`, `lid`, `moc`, `kapital`, `finance`).
- [ ] U odemykaných větví jsou použita existující verdict ID.

### E. Narativní kvalita

- [ ] `aftermath` je přítomné a nehodnotí hráče.
- [ ] Je alespoň jedna `delayed_consequence`.
- [ ] Případ není 1:1 variace existujícího jádra z `docs/pool_cases_akt1_prehled.md`.

---

## 3) Minimální technický smoke test ve hře

- [ ] Spis jde otevřít bez chyb UI.
- [ ] Klikací stopy reagují; správný pár se dá potvrdit.
- [ ] Průzkum odemyká záznamy/varianty podle očekávání.
- [ ] Rozsudek jde potvrdit a případ se uloží do archivu.

---

## 4) Fairness Gate (herní srozumitelnost, povinné)

- [ ] Strong dvojice je opřená o **dva konkrétní faktické údaje** (čas/datum/číslo/záznam/podpis), ne o atmosféru.
- [ ] Každá dvojice (`strong`/`medium`/`weak`) jde vysvětlit jednou větou „A odporuje/potvrzuje B“.
- [ ] Potřebné informace pro odvození jsou přímo ve spise (hráč nemusí hádat autorův záměr).
- [ ] Decoy stopy mají narativní smysl a nejsou náhodná slova bez vazby.
- [ ] Po odhalení strong páru má hráč získat pocit „to sedí“, ne „to nešlo odvodit“.
- [ ] Časovač a hustota stop odpovídají čitelnosti (nejde o mechanické „spoj dvě slova do minuty“).

---

## 5) Status výsledek

- **PASS**: projde technický checklist **i** Fairness Gate; případ jde do `data/pool_cases_akt1.json` + do přehledu.
- **FIX-NOW**: strukturální chyba (loader/ID/unlock/schema), vrátit autorovi.
- **NICE-TO-HAVE**: jen drobné textové ladění bez dopadu na férovost párování.


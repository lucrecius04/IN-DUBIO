# IN DUBIO — Kanonický systém flagů (Akt 1, 15 dní)

> **Poslední sync s runtime:** 29. 5. 2026
> **Zdroje:** `js/state.js` `vypoctiUzloveFlagy()`, `js/engine.js` `_vyhodnotVariabilniKonec()`
>
> Tento dokument popisuje runtime implementaci. Při jakémkoli rozporu
> mezi tímto souborem a běžícím kódem platí kód.

Flagy jsou uloženy v `State.flags` (pomocné) a `State.uzlove` (uzlové).
Nastavují je: verdikty případů, adventure scény (Beneš den 11, Karas den 17),
večerní volby, dopisy, ekonomické milníky.

---

## 4 uzlové flagy

### 1. `vlcek_vztah`
**Co měří:** Jak Ben reagoval na Vlčkův tlak v průběhu celé hry.

| Hodnota | Kdy se nastaví (runtime) | Narativní identita |
|---------|--------------------------|-------------------|
| `neutral` | Výchozí. Žádná z podmínek kompromitace/vzdoru není splněna. | Lavírování. |
| `kompromitovan` | `uplatek_prijat == true` NEBO (`flag_vlcek_upozorneni == true` A `Integrita ≤ 35`) | Vlček to zaregistroval. Cesta ke KORUPCI. |
| `vzdor` | `uplatek_prijat != true` A NOT kompromitován A `trust.vlcek ≤ 1` A `Odvaha ≥ 65` | Vlček ho píše do jiného sloupce. Cesta k ATENTÁTU nebo HRDINOVI. |

**Runtime kód** (`state.js` `vypoctiUzloveFlagy`):
```javascript
const vlcekKompromis = f.uplatek_prijat === true
  || (f.flag_vlcek_upozorneni === true && Number(t.Integrita) <= 35);
const vlcekVzdor = f.uplatek_prijat !== true
  && !vlcekKompromis
  && (Number.isFinite(Number(tr.vlcek)) ? Number(tr.vlcek) <= 1 : false)
  && Number(t.Odvaha) >= 65;
u.vlcek_vztah = vlcekKompromis ? 'kompromitovan' : (vlcekVzdor ? 'vzdor' : 'neutral');
```

---

### 2. `haas_kontakt`
**Co měří:** Jak hluboko Ben zašel v kontaktu s Haasem.

| Hodnota | Kdy se nastaví (runtime) | Narativní identita |
|---------|--------------------------|-------------------|
| `odmitnut` | Výchozí. Žádná z podmínek otevření/závazku není splněna. | Čistý. |
| `otevren` | `benes_identified == true` NEBO `haas_envelope_opened == true` NEBO `flag_rodny_list_pouzit == true` (bez úplatku) | Ambivalentní. |
| `zavazany` | `uplatek_prijat == true` | Kompromitovaný. |

**Runtime kód:**
```javascript
const haasZavazany = f.uplatek_prijat === true;
const haasOtevren = !haasZavazany && (
  f.benes_identified === true
  || f.haas_envelope_opened === true
  || f.flag_rodny_list_pouzit === true
);
u.haas_kontakt = haasZavazany ? 'zavazany' : (haasOtevren ? 'otevren' : 'odmitnut');
```

---

### 3. `benes_pravda`
**Co měří:** Zda Ben přijal Benešovo svědectví jako pravdu.

| Hodnota | Kdy se nastaví (runtime) | Narativní identita |
|---------|--------------------------|-------------------|
| `nezna` | Výchozí. | Ignoroval signály. |
| `prijal` | Adventure scéna Beneš (den 11): `sets_uzlovy.benes_pravda = 'prijal'`. Nebo `benes_identified == true` (ze spisu). | Ví víc než ostatní. |
| `odmitl` | Adventure scéna Beneš (den 11): `sets_uzlovy.benes_pravda = 'odmitl'`. | Zůstává v instituci. |

**Runtime kód:**
```javascript
if (u.benes_pravda === 'nezna' && f.benes_identified === true) {
  u.benes_pravda = 'prijal';
} else if (!['nezna', 'prijal', 'odmitl'].includes(String(u.benes_pravda))) {
  u.benes_pravda = 'nezna';
}
```

---

### 4. `osobni_cena`
**Co měří:** Co Ben udělal s operací matky (400 Kčs, deadline den 16 = úterý 17. 3.).

| Hodnota | Kdy se nastaví (runtime) | Narativní identita |
|---------|--------------------------|-------------------|
| `zaplatil` | `operace_zaplacena == true` (bez úplatku) | Zachoval integritu. |
| `haasem` | `operace_zaplacena == true` A `uplatek_prijat == true` | Kompromis přes peníze. |
| `odmitl` | `operace_odlozena == true` | Matka čeká. |
| `nerozhodl` | Výchozí; explicitní fallback od `currentDay >= 16` (= `Finance.OPERACE_DEADLINE_DEN`). | Tichá tragédie. |

**Klíčové milníky:**
- `Finance.zkontrolujCilOperace()`: nastaví `operace_zaplacena = true` pokud `balance >= 400` a `den >= 16` a `!operace_odlozena`.
- `Engine._vyhodnotMatcinuOperaciRano(16)`: pokud `!operace_zaplacena` → `operace_odlozena = true` + Vina +10. **Point of no return.**
- Po dni 16 nelze operaci „odomknout" — `zkontrolujCilOperace()` vrací `return` při `operace_odlozena == true`.

**Runtime kód:**
```javascript
if (f.operace_zaplacena === true && f.uplatek_prijat === true) {
  u.osobni_cena = 'haasem';
} else if (f.operace_zaplacena === true) {
  u.osobni_cena = 'zaplatil';
} else if (f.operace_odlozena === true) {
  u.osobni_cena = 'odmitl';
} else if (Number.isFinite(den) && den >= 16) {
  // Sjednoceno s Finance.OPERACE_DEADLINE_DEN (16).
  u.osobni_cena = 'nerozhodl';
}
```

---

## 8 konců — podmínky (runtime pořadí)

Engine kontroluje konce v `_vyhodnotVariabilniKonec()` po uzavření posledního spisu dne,
od `currentDay >= 11`. Pořadí je prioritní — první splněný konec vyhrává.

| # | Konec | minDay | Primární podmínky (uzlové flagy) | Stat / trust / flags podmínky | Finance |
|---|-------|--------|----------------------------------|-------------------------------|---------|
| 1 | **KRUH** | 16 | `vlcek ≠ vzdor` + `haas = zavazany` + `benes ≠ prijal` | `masek_document_signed` NEBO `trust.zavadova ≥ 3` | — |
| 2 | **KORUPCE** | 15 | `vlcek = kompromitovan` + `haas = zavazany` | INT ≤ 20 NEBO (úplatek + INT ≤ 45) | — |
| 3 | **ANNA** | 18 | `benes = prijal` + `haas ≠ zavazany` + `osobni_cena ∈ {nerozhodl, odmitl}` | VIN ≤ 28 + (průzkum ≥ 72 % NEBO moudr ≥ 58) + NOT operPl + NOT rodný_list | bal < 130–175 |
| 4 | **SMÍŘENÍ** | 16 | `benes = prijal` + `haas ≠ zavazany` | INT ≥ 52 + VIN ≤ 35 (s operací ≤ 45) + MOUDR ≥ 48 + NOT profilAtentat | operPl NEBO zaplatil NEBO bal ≥ 140 |
| 5 | **ATENTÁT** | 17 | `vlcek = vzdor` + `haas ≠ zavazany` + `benes = prijal` | ODV ≥ 72 + VIN ≥ 22 + NOT úplatek + NOT operPl + osobni_cena ∉ {zaplatil, haasem} | — |
| 6 | **ÚTĚK** | 17 | `haas ≠ zavazany` | `karas_poslechl_odejit` + `trust.karas ≥ 2` + NOT profilAtentat | bal > 260 |
| 7 | **HRDINA** | 19 | `vlcek = vzdor` + `haas ≠ zavazany` + `benes ≠ prijal` | ODV ≥ 88 + (INT ≥ 78 NEBO VIN ≤ 55) + NOT úplatek + NOT rodný_list | — |
| 8 | **PŘEŽITÍ** | 19 | `vlcek = neutral` + `haas ≠ zavazany` | ≥ 3/5 rysů v pásmu 25–75, INT 28–78, VIN 25–75, NAD 28–72 | — |
| 9 | **PŘEŽITÍ** (fallback) | 19 | *(žádné jiné podmínky nesplněny)* | — | — |

**Poznámky:**
- HRDINA vyžaduje `benes_pravda ≠ prijal` — hrdina jedná z principu, ne z vědomí konkrétní viny.
- ÚTĚK závisí na `flags.karas_poslechl_odejit` (Karasova adventure scéna den 17), ne na `osobni_cena`.
- ANNA: finance threshold má varianty podle průzkumu (viz `annaChudy` v engine.js).

---

## Pomocné flagy (runtime)

| Flag | Typ | Kdy se nastaví | Využití |
|------|-----|----------------|---------|
| `uplatek_prijat` | bool | Přijetí úplatku (Finance.prijmoutUplatek) | `vlcek_vztah`, `haas_kontakt`, `osobni_cena`, konce |
| `operace_zaplacena` | bool | Finance.zkontrolujCilOperace() při bal ≥ 400 a den ≥ 16 | `osobni_cena` |
| `operace_odlozena` | bool | Engine._vyhodnotMatcinuOperaciRano(16) při !zaplacena | `osobni_cena` |
| `benes_identified` | bool | Ze spisu / adventure scény | `haas_kontakt`, `benes_pravda` |
| `haas_envelope_opened` | bool | Otevření Haasovy obálky | `haas_kontakt` |
| `flag_rodny_list_pouzit` | bool | Použití dokumentu Wolf+Anna (D10) | `haas_kontakt`, konce ANNA, HRDINA |
| `flag_vlcek_upozorneni` | bool | D7 — soud konstatoval infiltraci | `vlcek_vztah` |
| `masek_document_signed` | bool | Podpis Maškova dokumentu | Konec KRUH |
| `karas_poslechl_odejit` | bool | Karas D13 adventure — volba „Odejdu" | Konec ÚTĚK |
| `karas_odmitl_odejit` | bool | Karas D13 adventure — volba „Nepůjdu" | Narativní |
| `karas_chce_info` | bool | Karas D13 adventure — volba „Řekněte víc" | Narativní |
| `karas_nabidl_odchod` | bool | Karas D13 adventure — pod-volba obálka (obě větve) | Narativní |
| `flag_pospisil_dluzi` | bool | D6 verdikt Pospíšil 2 | Narativní (D11 beat) |
| `flag_markova_zpochybnena` | bool | D3 verdikt Marková 1 | Narativní (D14) |

---

## Adventure scény — technická specifikace

Formát je stejný pro obě scény (Beneš den 11, Karas den 17):

```json
{
  "type": "adventure_scene",
  "portrait": "cesta/k/obrazku.png",
  "trigger": "morning_after_fragment",
  "screens": [
    { "id": "s1", "speaker": "narrator", "text": "...", "choices": null, "next": "s2" },
    { "id": "s2", "speaker": "Beneš/Karas", "text": "...",
      "choices": [
        { "label": "...", "sets_flag": "nazev_flagu", "sets_uzlovy": { "benes_pravda": "prijal" }, "effects": { "Vina": 3 }, "next": "s3" }
      ]
    }
  ]
}
```

**UI:** Portrét vlevo, text uprostřed, volby dole. Bez časového limitu.

**Napojení na engine:** `_aplikujVysledekAdventure` → `sets_flag` + `sets_uzlovy` + `effects` → `vypoctiUzloveFlagy()` → `uloz()`.

---

## Co tento dokument NEŘEŠÍ

- Přesné číselné efekty (rysy, finance, frakce) — to je `Balancing.csv`
- Epilogové texty — to je `story.mdc` a separátní soubory
- Přesné formulace dialogů — to jsou autorské texty
- Legacy ending system (`_vyhodnotVariabilniKonecLegacy`) — fallback pro staré save soubory

# IN DUBIO — Kanonický systém flagů (Akt 1, 15 dní)

Tento dokument je **jediný zdroj pravdy** pro flagy, VĚTVENÍ a podmínky konců.
Při jakémkoli rozporu mezi tímto souborem a jiným dokumentem platí tento.

Flagy jsou uloženy v `State.flags`. Nastavují je: verdikty případů, adventure scény (Beneš D9, Karas D13), večerní volby, dopisy.

---

## 4 uzlové flagy

### 1. `vlcek_vztah`
**Co měří:** Jak Ben reagoval na Vlčkův tlak v průběhu celé hry.

| Hodnota | Kdy se nastaví | Narativní identita |
|---------|---------------|-------------------|
| `neutral` | Výchozí. Ben lavíroval — ani vzdor ani kapitulace. | Nejnebezpečnější pro atentát. |
| `kompromitovan` | Ben ustoupil Vlčkovu naznačení alespoň 1× na D7 (VĚTVENÍ 1) A přijal nátlak na D8. | Vlček to zaregistroval. Cesta ke KORUPCI. |
| `vzdor` | Ben odmítl explicitně na D7 + D11 (obě VĚTVENÍ). | Vlček ho píše do jiného sloupce. Cesta k ATENTÁTU nebo HRDINOVI. |

**Kde se nastavuje:**
- `D7` (VĚTVENÍ 1): Horáčkový rozsudek + večerní volba „Vlčkův dopis — odpovědět jak?"
- `D8`: Rozsudek Božena 3 — pokud Ben odsoudil podle Vlčkova naznačení → `kompromitovan`
- `D11` (VĚTVENÍ 3): Haas osobně — pokud Ben odmítl Haase + Vlčkovu hrozbu → `vzdor`

---

### 2. `haas_kontakt`
**Co měří:** Jak hluboko Ben zašel v kontaktu s Haasem.

| Hodnota | Kdy se nastaví | Narativní identita |
|---------|---------------|-------------------|
| `odmitnut` | Ben odmítl vizitku (D6), nepoužil rodný list (D10), odmítl obálku (D11). | Čistý. Cesta k ATENTÁTU nebo HRDINOVI. |
| `otevren` | Ben přijal informaci (rodný list D10 nebo Benešovu pravdu D9) ale ne peníze. | Ambivalentní — záleží na ostatním. |
| `zavazany` | Ben přijal obálku 300 Kčs na D11 NEBO použil rodný list jako páku. | Kompromitovaný. Cesta ke KORUPCI nebo ŘÁDU. |

**Kde se nastavuje:**
- `D6`: Haasova vizitka — přijmout nebo odložit (efekt jen na `otevren`)
- `D10`: ZVRATY — co Ben udělá s rodným listem Wolf + Anna → `otevren` nebo `odmitnut`
- `D11` (VĚTVENÍ 3): Haas osobně — obálka 300 Kčs → `zavazany` nebo `odmitnut`

---

### 3. `benes_pravda`
**Co měří:** Zda Ben přijal Benešovo svědectví jako pravdu.

| Hodnota | Kdy se nastaví | Narativní identita |
|---------|---------------|-------------------|
| `nezna` | Výchozí. Beneš nepřišel nebo Ben scénu odmítl. | Jen pokud hráč zcela ignoroval signály. |
| `prijal` | Ben v adventure scéně D9 zvolil: věřím ti / vezmu dokument. | Ví víc než ostatní. Cesta ke SMÍŘENÍ nebo ATENTÁTU. |
| `odmitl` | Ben dokument odmítl nebo Benešovi nevěřil. | Zůstává v instituci. Cesta k PŘEŽITÍ nebo ŘÁDU. |

**Kde se nastavuje:**
- `D9`: Adventure scéna Beneš — jediné rozhodnutí, nastavuje flag okamžitě.

---

### 4. `osobni_cena`
**Co měří:** Co Ben udělal s operací matky (deadline D12, 400 Kčs).

| Hodnota | Kdy se nastaví | Narativní identita |
|---------|---------------|-------------------|
| `zaplatil` | Ben sehnal 400 Kčs legitimní cestou (spoření, půjčka od Karase D13). | Zachoval integritu. Cesta k ANNĚ nebo HRDINOVI. |
| `haasem` | Ben použil Haasovu obálku (300 Kčs) na operaci. | Kompromis přes peníze. Cesta ke KORUPCI nebo ÚTĚKU. |
| `nerozhodl` | Deadline D12 přišel a Ben nic neudělal — nebo matka operaci odmítla. | Tichá tragédie. Cesta k ANNĚ nebo SMÍŘENÍ. |
| `odmitl` | Ben vědomě rozhodl peníze nedát — jiné priority. | Nejtvrdší cesta. |

**Kde se nastavuje:**
- `D4`: Dopis doktora — spustí countdown
- `D11–D12`: Finance pod 400 Kčs → varování
- `D12` (deadline): Engine zkontroluje `Finance >= 400` → `zaplatil` nebo `nerozhodl`
- `D11` (VĚTVENÍ 3): Přijetí Haasovy obálky + deadline → `haasem`
- `D13`: Karas nabídne půjčku → pokud Ben přijme + má dost → `zaplatil`

---

## 8 konců — podmínky

Každý konec potřebuje **max 2 uzlové flagy** + případně 1 pomocný flag. Engine kontroluje od D11, v pořadí priority.

| # | Konec | Nejdříve | Primární podmínky | Pomocné |
|---|-------|----------|-------------------|---------|
| 2 | **KORUPCE** | D11 | `vlcek_vztah == kompromitovan` + `haas_kontakt == zavazany` | INT ≤ 20 |
| 5 | **SMÍŘENÍ** | D12 | `benes_pravda == prijal` + `osobni_cena != haasem` | INT ≥ 60, VIN ≤ 20 |
| 4 | **ÚTĚK** | D13 | `haas_kontakt != zavazany` + `osobni_cena == zaplatil` + Karas D13 nabídl odchod | Finance > 300 |
| 6 | **ATENTÁT** | D13 | `vlcek_vztah == vzdor` + `haas_kontakt == odmitnut` + `benes_pravda == prijal` | ODV ≥ 80, MOC ≤ 20 |
| 7 | **ŘÁD** | D14 | `vlcek_vztah != vzdor` + `haas_kontakt == zavazany` + `benes_pravda == odmitl` | Zavadová ≥ 3 |
| 8 | **ANNA** | D14 | `benes_pravda == prijal` + `haas_kontakt == odmitnut` + `osobni_cena == nerozhodl` | Finance < 100, průzkum ≥ 80 % |
| 3 | **HRDINA** | D15 | `vlcek_vztah == vzdor` + `haas_kontakt == odmitnut` | INT ≥ 80, ODV ≥ 80 |
| 1 | **PŘEŽITÍ** | D15 | Výchozí — žádné jiné podmínky nesplněny | — |

---

## Pomocné flagy (atomické, nastavují uzlové)

Tyto flagy nastavují verdikty a scény — uzlové flagy z nich vycházejí.

| Flag | Typ | Kdy | Nastavuje |
|------|-----|-----|-----------|
| `flag_vlcek_d7_ustoupil` | bool | D7 verdikt Horáčková — odsouzení dle naznačení | `vlcek_vztah → kompromitovan` (podmíněně) |
| `flag_vlcek_d8_splnil` | bool | D8 verdikt Božena 3 — podle Vlčkova zadání | `vlcek_vztah → kompromitovan` (potvrzení) |
| `flag_vlcek_d11_odmitl` | bool | D11 VĚTVENÍ 3 — Ben explicitně odmítl Vlčka | `vlcek_vztah → vzdor` (podmíněně) |
| `flag_rodny_list_pouzit` | bool | D10 — Ben použil dokument Wolf+Anna | `haas_kontakt → otevren` |
| `flag_haas_obalka` | bool | D11 — Ben přijal 300 Kčs | `haas_kontakt → zavazany` + `osobni_cena → haasem` |
| `flag_benes_scena_prijal` | bool | D9 adventure scéna | `benes_pravda → prijal` |
| `flag_karas_pujcka` | bool | D13 adventure scéna | `osobni_cena → zaplatil` (pokud finance ≥ 400) |
| `flag_vlcek_upozorneni` | bool | D7 — soud konstatoval infiltraci | Narativní, ovlivňuje Vlčkovy dopisy |
| `flag_pospisil_dluzi` | bool | D6 verdikt Pospíšil 2 | Narativní, ovlivňuje D11 beat |
| `flag_markova_zpochybnena` | bool | D3 verdikt Marková 1 | Narativní, ovlivňuje D14 |

---

## Uzlové flagy — logika výpočtu

Engine přepočítá uzlové flagy po každém dni (ne po každém verdiktu):

```javascript
// vlcek_vztah
if (flags.flag_vlcek_d8_splnil && flags.flag_vlcek_d7_ustoupil) {
  flags.vlcek_vztah = 'kompromitovan';
} else if (flags.flag_vlcek_d11_odmitl && !flags.flag_vlcek_d8_splnil) {
  flags.vlcek_vztah = 'vzdor';
} else {
  flags.vlcek_vztah = 'neutral';
}

// haas_kontakt
if (flags.flag_haas_obalka) {
  flags.haas_kontakt = 'zavazany';
} else if (flags.flag_rodny_list_pouzit || flags.flag_benes_scena_prijal) {
  flags.haas_kontakt = 'otevren';
} else {
  flags.haas_kontakt = 'odmitnut';
}

// benes_pravda — nastavena přímo v D9 scéně, nemění se

// osobni_cena
if (flags.flag_haas_obalka && State.finance >= 400) {
  flags.osobni_cena = 'haasem';
} else if (flags.flag_karas_pujcka && State.finance >= 400) {
  flags.osobni_cena = 'zaplatil';
} else if (State.currentDay >= 12 && State.finance < 400) {
  flags.osobni_cena = 'nerozhodl';
}
```

---

## Adventure scény — technická specifikace

### Formát (stejný pro D9 i D13)

```json
{
  "type": "adventure_scene",
  "portrait": "benes",
  "screens": [
    {
      "text": "Text dialogu nebo narativu. Max 4 věty.",
      "speaker": "Beneš / Karas / Ben / narrator",
      "choices": null
    },
    {
      "text": "...",
      "speaker": "Beneš",
      "choices": [
        { "label": "Věřím vám.", "flag": "flag_benes_scena_prijal", "value": true, "next": 3 },
        { "label": "Nevěřím.", "flag": "flag_benes_scena_prijal", "value": false, "next": 4 },
        { "label": "Vezmu dokument, ale nic neslibuji.", "flag": "flag_benes_scena_prijal", "value": true, "next": 5 }
      ]
    }
  ]
}
```

**UI:** Portrét vlevo (statický obrázek nebo inicialový placeholder), text uprostřed, volby dole jako tlačítka. Bez časového limitu. Bez pátrání, bez průzkumu, bez rozsudku.

**Napojení na engine:** Adventure scéna se spustí místo slotu 1 daného dne. Po scéně engine nastaví flagy a pokračuje normálně (slot 2 případu zůstává).

---

## Co tento dokument NEŘEŠÍ

- Přesné číselné efekty (rysy, finance, frakce) — to je `Balancing.csv`, ladí se po průchodu
- Epilogové texty každého konce — to je `story.mdc` a separátní soubory
- Přesné formulace dialogů Beneše a Karase — to jsou autorské texty, ne flagy

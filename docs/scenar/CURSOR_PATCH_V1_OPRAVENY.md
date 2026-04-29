# PATCH: Uzlové flagy a podmínky konců (v1 — bez adventure scén)
# Cursor: implementuj přesně dle tohoto dokumentu, v tomto pořadí.

---

## PATCH 1 — js/state.js

### 1a) Přidat `uzlove` do výchozího stavu

Do `State.reset()` přidat:

```javascript
uzlove: {
  vlcek_vztah: 'neutral',    // 'neutral' | 'kompromitovan' | 'vzdor'
  haas_kontakt: 'odmitnut',  // 'odmitnut' | 'otevren' | 'zavazany'
  benes_pravda: 'nezna',     // 'nezna' | 'prijal' | 'odmitl'
  osobni_cena: 'nerozhodl'   // 'nerozhodl' | 'zaplatil' | 'haasem' | 'odmitl'
}
```

### 1b) Normalizace starých uložených stavů

V `_normalizujState()` (nebo ekvivalentu při načítání):

```javascript
if (!state.uzlove) {
  state.uzlove = {
    vlcek_vztah: 'neutral',
    haas_kontakt: 'odmitnut',
    benes_pravda: 'nezna',
    osobni_cena: 'nerozhodl'
  };
}
// Doplnit případně chybějící klíče
const defaults = { vlcek_vztah:'neutral', haas_kontakt:'odmitnut',
                   benes_pravda:'nezna', osobni_cena:'nerozhodl' };
state.uzlove = Object.assign({}, defaults, state.uzlove);
```

### 1c) Přidat metodu `State.vypoctiUzloveFlagy()`

```javascript
State.vypoctiUzloveFlagy = function() {
  const f = State.data.flags;          // atomické flagy
  const t = State.data.traits;         // rysy (Integrita, Odvaha, Vina…)
  const tr = State.data.trust;         // důvěra (vlcek, zavadova, karas…)
  const balance = State.data.finance.balance;
  const den = State.data.currentDay;
  const u = State.data.uzlove;

  // --- vlcek_vztah ---
  // kompromitovan: přijal úplatek NEBO varování + nízká integrita
  const vlcekKompromis = f.uplatek_prijat === true
    || (f.flag_vlcek_upozorneni === true && t.Integrita <= 35);
  // vzdor: žádný úplatek + důvěra Vlčka na dně + vysoká odvaha
  const vlcekVzdor = f.uplatek_prijat !== true
    && (tr.vlcek !== undefined ? tr.vlcek <= 0 : false)
    && t.Odvaha >= 65;

  u.vlcek_vztah = vlcekKompromis ? 'kompromitovan'
    : vlcekVzdor ? 'vzdor'
    : 'neutral';

  // --- haas_kontakt ---
  const haasZavazany = f.uplatek_prijat === true;
  const haasOtevren  = !haasZavazany
    && (f.benes_identified === true || f.haas_envelope_opened === true);

  u.haas_kontakt = haasZavazany ? 'zavazany'
    : haasOtevren ? 'otevren'
    : 'odmitnut';

  // --- benes_pravda ---
  // v1: bez adventure scény; nastavuje se z benes_identified
  // Pokud adventure scéna D9 nastaví benes_pravda přímo, nepřepisuj.
  if (u.benes_pravda === 'nezna') {
    if (f.benes_identified === true) {
      u.benes_pravda = 'prijal';
    }
    // 'odmitl' zatím nelze spolehlivě určit bez adventure scény — zůstane 'nezna'
  }

  // --- osobni_cena ---
  if (f.operace_zaplacena === true && f.uplatek_prijat === true) {
    u.osobni_cena = 'haasem';
  } else if (f.operace_zaplacena === true) {
    u.osobni_cena = 'zaplatil';
  } else if (f.operace_odlozena === true) {
    u.osobni_cena = 'odmitl';
  } else if (den >= 12) {
    u.osobni_cena = 'nerozhodl';
  }
  // Pokud den < 12 a nic není zaplaceno, nechej 'nerozhodl' (výchozí)

  State.uloz(); // persistovat uzlové flagy
};
```

**Poznámka:** `State.data.*` — použij skutečný přístupový vzor ze stávajícího kódu
(může být `State.get('flags.xyz')` nebo přímý přístup). Přizpůsob podle konvence v projektu.

---

## PATCH 2 — js/engine.js

### 2a) Volání přepočtu před kontrolou konců

V `Engine.zkontrolujKonecDne(allowVariabilni)`, těsně před voláním
`_vyhodnotVariabilniKonec()`:

```javascript
if (allowVariabilni) {
  State.vypoctiUzloveFlagy(); // přepočítat uzlové flagy
}
```

### 2b) Přepsat `_vyhodnotVariabilniKonec()`

```javascript
Engine._vyhodnotVariabilniKonec = function() {
  const u = State.data.uzlove;
  const t = State.data.traits;
  const tr = State.data.trust;
  const f = State.data.flags;
  const balance = State.data.finance.balance;
  const den = State.data.currentDay;

  // Fallback: pokud uzlove chybí (stará uložená hra), použij původní logiku
  if (!u) {
    return Engine._vyhodnotVariabilniKonecLegacy();
  }

  // Pořadí = priorita. První splněná podmínka vyhraje.

  // 2. KORUPCE (nejdříve D11)
  if (den >= 11
    && u.vlcek_vztah === 'kompromitovan'
    && u.haas_kontakt === 'zavazany'
    && t.Integrita <= 20) {
    return Engine.spustKonec('korupce');
  }

  // 5. SMÍŘENÍ (nejdříve D12)
  if (den >= 12
    && u.benes_pravda === 'prijal'
    && u.haas_kontakt !== 'zavazany'
    && t.Integrita >= 60
    && t.Vina <= 20) {
    return Engine.spustKonec('smireni');
  }

  // 4. ÚTĚK (nejdříve D13)
  // Karas nabídl odchod = trust.karas >= 2 a finance stačí
  if (den >= 13
    && u.haas_kontakt !== 'zavazany'
    && u.osobni_cena === 'zaplatil'
    && (tr.karas !== undefined ? tr.karas >= 2 : false)
    && balance > 300) {
    return Engine.spustKonec('utek');
  }

  // 6. ATENTÁT (nejdříve D13)
  // Moc je frakce — použij State.data.frakce.Moc nebo ekvivalent
  const mocHodnota = State.data.frakce
    ? (State.data.frakce['Moc'] || 0)
    : (State.data.traits['Moc'] || 50); // fallback pokud je trait
  if (den >= 13
    && u.vlcek_vztah === 'vzdor'
    && u.haas_kontakt === 'odmitnut'
    && u.benes_pravda === 'prijal'
    && t.Odvaha >= 80
    && mocHodnota <= 20) {
    return Engine.spustKonec('atentat');
  }

  // 7. KRUH (nejdříve D14)
  if (den >= 14
    && u.vlcek_vztah !== 'vzdor'
    && u.haas_kontakt === 'zavazany'
    && u.benes_pravda !== 'prijal'
    && (f.masek_document_signed === true
        || (tr.zavadova !== undefined ? tr.zavadova >= 3 : false))) {
    return Engine.spustKonec('rad');
  }

  // 8. ANNA (nejdříve D14)
  // pruzkumProcent: použij dostupnou metriku nebo aproximaci
  // Fallback: Moudrost >= 60 jako proxy za "hodně pátral"
  const pruzkumSplnen = typeof State.pruzkumProcent === 'function'
    ? State.pruzkumProcent() >= 80
    : t.Moudrost >= 60; // proxy dokud není kontrakt
  if (den >= 14
    && u.benes_pravda === 'prijal'
    && u.haas_kontakt === 'odmitnut'
    && u.osobni_cena === 'nerozhodl'
    && balance < 100
    && pruzkumSplnen) {
    return Engine.spustKonec('anna');
  }

  // 3. HRDINA (nejdříve D15)
  if (den >= 15
    && u.vlcek_vztah === 'vzdor'
    && u.haas_kontakt === 'odmitnut'
    && t.Integrita >= 80
    && t.Odvaha >= 80) {
    return Engine.spustKonec('hrdina');
  }

  // 1. PŘEŽITÍ (výchozí D15)
  if (den >= 15) {
    return Engine.spustKonec('preziti');
  }

  // Ještě není čas na konec
  return null;
};
```

### 2c) Legacy fallback

Přejmenovat původní `_vyhodnotVariabilniKonec()` na
`_vyhodnotVariabilniKonecLegacy()` — nemazat, jen přejmenovat.
Nová verze ji volá jako fallback pro staré uložené hry bez `uzlove`.

---

## PATCH 3 — js/cases.js

**Bez zásahu.** Stávající `State.set('flags.' + flag.key, flag.value)` funguje
a atomické flagy zůstávají. Uzlové flagy se přepočítávají v engine, ne tady.

Volitelně (není nutné pro v1): po `zpracujRozsudek()` přidat
`State.vypoctiUzloveFlagy()` pro okamžitý přepočet — ale denní přepočet v engine stačí.

---

## PATCH 4 — js/finance.js

**Bez zásahu.** `uplatek_prijat`, `operace_zaplacena`, `operace_odlozena`
zůstávají primárními flagy. `haas_obalka_prijata` alias není nutný pro v1.

---

## PATCH 5 — data/days.json

**Bez zásahu pro v1.** Podmínky na `flag_pospisil_dluzi` a `verdict_*` zůstávají.

---

## Co se NEdělá v tomto patchi

- Adventure scény (D9 Beneš, D13 Karas) — vlna 2
- Nové atomické flagy `vlcek_splnil_d7`, `vlcek_odmitl_d11` — nastaví se
  automaticky z nových případů a dat, ne z tohoto patche
- Žádná změna UI
- Žádná změna struktury finance

---

## Debug kontrola po implementaci

```javascript
// Spustit v konzoli libovolný den >= 12:
State.vypoctiUzloveFlagy();
console.table(State.data.uzlove);
// Očekávaný výstup při čistém průchodu (žádné úplatky):
// vlcek_vztah:  'neutral'
// haas_kontakt: 'odmitnut'
// benes_pravda: 'nezna'  (nebo 'prijal' pokud benes_identified)
// osobni_cena:  'nerozhodl' (nebo 'zaplatil' pokud operace_zaplacena)
```

---

## Poznámka k Moc (frakce vs. trait)

Cursor: v podmínce ATENTÁT `mocHodnota` čte z `State.data.frakce['Moc']`.
Pokud je `frakce` uloženo jinak (např. jako objekt s klíčem `id`), přizpůsob
čtení podle skutečné struktury v kódu. Neměň hodnotu prahu (20).

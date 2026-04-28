# MIGRACE: Uzlové flagy a podmínky konců
# Prompt pro Cursor — implementace v jednom kroku

## Kontext pro Cursor

Hra IN DUBIO má 8 narativních konců. Jejich podmínky jsou momentálně roztroušené
v `js/engine.js` jako mix atomických flagů, číselných prahů rysů a ad-hoc podmínek.
Cílem je přidat **tenkou sémantickou vrstvu** — čtyři uzlové flagy — která:

1. Nepřepisuje stávající atomické flagy (ty zůstávají pro vše ostatní)
2. Přidává funkci `State.vypoctiUzloveFlagy()` volanou jednou denně
3. Přepisuje podmínky konců na uzlové flagy místo atomických

Tato vrstva nemění herní logiku — mění **čitelnost** pro autory i engine.

---

## KROK 1: Přidat uzlové flagy do State

V `js/state.js`, do výchozího stavu (`State.reset()`), přidat:

```javascript
// Uzlové flagy — přepočítávány denně, nikdy ručně
uzlove: {
  vlcek_vztah: 'neutral',      // 'neutral' | 'kompromitovan' | 'vzdor'
  haas_kontakt: 'odmitnut',    // 'odmitnut' | 'otevren' | 'zavazany'
  benes_pravda: 'nezna',       // 'nezna' | 'prijal' | 'odmitl'
  osobni_cena: 'nerozhodl'     // 'nerozhodl' | 'zaplatil' | 'haasem' | 'odmitl'
}
```

Při `State.nacti()`: pokud uložený stav nemá `uzlove`, doplnit výchozí hodnoty
(`_normalizujState` nebo podobná funkce).

---

## KROK 2: Mapovací tabulka — stávající flagy → uzlové

Toto je přepočet. Cursor: projdi stávající flagy v `State.flags` a `State.traits`
a podle tabulky níže nastav `State.uzlove`.

### vlcek_vztah

```
VSTUP (stávající flagy / stav):                    → VÝSTUP
flags.vlcek_splnil_d7 == true
  AND flags.vlcek_splnil_d8 == true                → 'kompromitovan'

flags.vlcek_odmitl_d11 == true
  AND flags.vlcek_splnil_d8 != true                → 'vzdor'

traits.Integrita <= 25
  AND flags.uplatek_prijat == true                 → 'kompromitovan'  (override)

jinak                                               → 'neutral'
```

**Poznámka Cursor:** Pokud stávající kód používá jiné názvy flagů pro
„Vlček — splnil požadavek" a „Vlček — odmítl", najdi je podle kontextu
v `engine.js` nebo `days.json` a použij je. Neměň jejich názvy.

### haas_kontakt

```
VSTUP:                                             → VÝSTUP
flags.uplatek_prijat == true
  OR flags.haas_obalka_prijata == true             → 'zavazany'

flags.rodny_list_pouzit == true
  OR flags.benes_identified == true                → 'otevren'  (pokud ne zavazany)

jinak                                               → 'odmitnut'
```

### benes_pravda

```
VSTUP:                                             → VÝSTUP
flags.benes_pravda_prijata == true                 → 'prijal'
flags.benes_pravda_odmitnuta == true               → 'odmitl'
jinak                                               → 'nezna'
```

**Poznámka:** `benes_pravda` se nastavuje z adventure scény D9.
Pokud scéna ještě není implementována, flag zůstane `nezna`.

### osobni_cena

```
VSTUP:                                             → VÝSTUP
flags.operace_zaplacena == true
  AND flags.haas_obalka_prijata == true            → 'haasem'

flags.operace_zaplacena == true
  AND flags.haas_obalka_prijata != true            → 'zaplatil'

currentDay >= 12
  AND flags.operace_zaplacena != true
  AND flags.operace_odlozena != true               → 'nerozhodl'

flags.operace_odlozena == true                     → 'odmitl'

jinak                                               → 'nerozhodl'
```

---

## KROK 3: Funkce `State.vypoctiUzloveFlagy()`

Přidat do `js/state.js`:

```javascript
State.vypoctiUzloveFlagy = function() {
  const f = State.flags;
  const t = State.traits;
  const d = State.currentDay;

  // vlcek_vztah
  const vlcekKompromis = (f.vlcek_splnil_d7 && f.vlcek_splnil_d8)
    || (t.Integrita <= 25 && f.uplatek_prijat);
  const vlcekVzdor = f.vlcek_odmitl_d11 && !f.vlcek_splnil_d8;
  State.uzlove.vlcek_vztah = vlcekKompromis ? 'kompromitovan'
    : vlcekVzdor ? 'vzdor'
    : 'neutral';

  // haas_kontakt
  const haasZavazany = f.uplatek_prijat || f.haas_obalka_prijata;
  const haasOtevren  = !haasZavazany && (f.rodny_list_pouzit || f.benes_identified);
  State.uzlove.haas_kontakt = haasZavazany ? 'zavazany'
    : haasOtevren ? 'otevren'
    : 'odmitnut';

  // benes_pravda — nastavena přímo ze scény, jen normalizuj
  if (!['nezna','prijal','odmitl'].includes(State.uzlove.benes_pravda)) {
    State.uzlove.benes_pravda = 'nezna';
  }

  // osobni_cena
  if (f.operace_zaplacena && f.haas_obalka_prijata) {
    State.uzlove.osobni_cena = 'haasem';
  } else if (f.operace_zaplacena) {
    State.uzlove.osobni_cena = 'zaplatil';
  } else if (f.operace_odlozena) {
    State.uzlove.osobni_cena = 'odmitl';
  } else if (d >= 12) {
    State.uzlove.osobni_cena = 'nerozhodl';
  }
};
```

**Kdy volat:** Na konci `Engine.zkontrolujKonecDne()`, před kontrolou konců.
Tedy: rozsudky → `State.vypoctiUzloveFlagy()` → `_zkontrolujSpecialniKonce()`.

---

## KROK 4: Přepsat podmínky konců

V `js/engine.js`, funkce `Engine._zkontrolujSpecialniKonce` (nebo ekvivalent):

```javascript
Engine._zkontrolujSpecialniKonce = function() {
  const u = State.uzlove;
  const t = State.traits;
  const f = State.flags;
  const d = State.currentDay;

  // Pořadí = priorita. První splněná podmínka vyhraje.

  // 2. KORUPCE (nejdříve D11)
  if (d >= 11
    && u.vlcek_vztah === 'kompromitovan'
    && u.haas_kontakt === 'zavazany'
    && t.Integrita <= 20) {
    return Engine.spustKonec('korupce');
  }

  // 5. SMÍŘENÍ (nejdříve D12)
  if (d >= 12
    && u.benes_pravda === 'prijal'
    && u.haas_kontakt !== 'zavazany'
    && t.Integrita >= 60
    && t.Vina <= 20) {
    return Engine.spustKonec('smireni');
  }

  // 4. ÚTĚK (nejdříve D13)
  if (d >= 13
    && u.haas_kontakt !== 'zavazany'
    && u.osobni_cena === 'zaplatil'
    && f.karas_nabidl_odchod
    && State.finance > 300) {
    return Engine.spustKonec('utek');
  }

  // 6. ATENTÁT (nejdříve D13)
  if (d >= 13
    && u.vlcek_vztah === 'vzdor'
    && u.haas_kontakt === 'odmitnut'
    && u.benes_pravda === 'prijal'
    && t.Odvaha >= 80
    && t.Moc <= 20) {
    return Engine.spustKonec('atentat');
  }

  // 7. ŘÁD (nejdříve D14)
  if (d >= 14
    && u.vlcek_vztah !== 'vzdor'
    && u.haas_kontakt === 'zavazany'
    && u.benes_pravda === 'odmitl'
    && (f.zavadova_kontakt >= 3 || f.masek_document_signed)) {
    return Engine.spustKonec('rad');
  }

  // 8. ANNA (nejdříve D14)
  if (d >= 14
    && u.benes_pravda === 'prijal'
    && u.haas_kontakt === 'odmitnut'
    && u.osobni_cena === 'nerozhodl'
    && State.finance < 100
    && State.pruzkumProcent >= 80) {
    return Engine.spustKonec('anna');
  }

  // 3. HRDINA (nejdříve D15)
  if (d >= 15
    && u.vlcek_vztah === 'vzdor'
    && u.haas_kontakt === 'odmitnut'
    && t.Integrita >= 80
    && t.Odvaha >= 80) {
    return Engine.spustKonec('hrdina');
  }

  // 1. PŘEŽITÍ (výchozí D15)
  if (d >= 15) {
    return Engine.spustKonec('preziti');
  }
};
```

**Poznámka:** `State.pruzkumProcent` — pokud neexistuje, doplň výpočet:
`(počet použitých průzkumových akcí / celkový počet dostupných) * 100`.
Pro konec ANNA stačí aproximace z `State.celkemPruzkumu`.

---

## KROK 5: Adventure scény (D9 Beneš, D13 Karas)

### Nový typ v days.json

```json
{
  "day": 9,
  "adventure_scene": {
    "portrait": "benes",
    "portrait_label": "Viktor Beneš",
    "screens": [
      {
        "id": "s1",
        "speaker": "narrator",
        "text": "Viktor Beneš přišel bez ohlášení. Svejda ho zastavil — ale Beneš mu dal vizitku a Svejda přišel za Benem. 'Chce mluvit. Říká, že je to důležité.'",
        "choices": null,
        "next": "s2"
      },
      {
        "id": "s2",
        "speaker": "Beneš",
        "text": "Pane doktore, přišel jsem, protože nemám komu jinému. Vím o Wolfovi. Vím o Haasovi. A vím, kdo podepsal ten dokument v roce osmadvacátém.",
        "choices": null,
        "next": "s3"
      },
      {
        "id": "s3",
        "speaker": "Beneš",
        "text": "Mám kopii. Chci vám ji dát. Ne proto, abych vás kompromitoval — ale proto, že vy jste jediný, kdo ji může použít správně. Nebo ji spálit. To je na vás.",
        "choices": [
          {
            "label": "Věřím vám. Vezmu ji.",
            "sets_flag": "benes_pravda_prijata",
            "sets_uzlovy": { "benes_pravda": "prijal" },
            "next": "s4a"
          },
          {
            "label": "Nevěřím. Odejděte.",
            "sets_flag": "benes_pravda_odmitnuta",
            "sets_uzlovy": { "benes_pravda": "odmitl" },
            "next": "s4b"
          },
          {
            "label": "Vezmu ji — ale nic neslibuji.",
            "sets_flag": "benes_pravda_prijata",
            "sets_uzlovy": { "benes_pravda": "prijal" },
            "effects": { "Vina": 2 },
            "next": "s4c"
          }
        ]
      },
      {
        "id": "s4a",
        "speaker": "Beneš",
        "text": "Beneš přikývl. Podal obálku — tenkou, bez adresy. 'Přijdou se vás na ni ptát. Možná dřív, než čekáte.' Vstal a odešel. Na stole ležela obálka a ticho.",
        "choices": null,
        "next": null
      },
      {
        "id": "s4b",
        "speaker": "narrator",
        "text": "Beneš vstal. Nedíval se na Bena — díval se na okno. 'Rozumím.' Vzal obálku zpátky a odešel. Dveře se zavřely tiše. Jako by tu nikdy nebyl.",
        "choices": null,
        "next": null
      },
      {
        "id": "s4c",
        "speaker": "Beneš",
        "text": "Beneš se pousmál. Poprvé. 'To je jediná poctivá odpověď, jakou jsem mohl čekat.' Obálka zůstala na stole. Ben na ni celý večer nekoukal — ale věděl, kde je.",
        "choices": null,
        "next": null
      }
    ]
  }
}
```

### Engine — spuštění adventure scény

V `Engine.spustDen()`, po ranním fragmentu, před načtením případů:

```javascript
if (denData.adventure_scene) {
  UI.zobrazAdventureScenu(denData.adventure_scene, function(vysledek) {
    // vysledek obsahuje sets_flag a sets_uzlovy z volby
    if (vysledek.sets_flag) {
      State.flags[vysledek.sets_flag] = true;
    }
    if (vysledek.sets_uzlovy) {
      Object.assign(State.uzlove, vysledek.sets_uzlovy);
    }
    if (vysledek.effects) {
      Traits.aplikujEfekty(vysledek.effects);
    }
    State.uloz();
    Engine.pokracujSpustDen(); // pokračuj s případy
  });
  return; // počkej na callback
}
```

### UI — `UI.zobrazAdventureScenu()`

Přidat do `js/ui.js`:

```javascript
UI.zobrazAdventureScenu = function(scena, callback) {
  // Zobrazit modal s:
  // - portrétem vlevo (img src z assets/portraits/{scena.portrait}.png
  //   nebo placeholder s iniciálou)
  // - textem uprostřed (speaker + text)
  // - volbami dole jako tlačítka (pokud screen.choices != null)
  // - tlačítko "Pokračovat" pokud choices == null
  //
  // Po průchodu všemi screeny: zavolat callback(zvolenaVolba)
  // zvolenaVolba = objekt volby který hráč kliknul (nebo {} pokud žádná volba)
};
```

Implementuj jako sekvenční průchod `screens[]` podle `next` odkazů.
Bez časového limitu. Bez pátrání. Bez rozsudku.

---

## Co Cursor NEMÁ měnit

- Stávající atomické flagy a jejich názvy
- Logiku pátrání (two-click, pokusy)
- Systém průzkumu (kapky, hidden_info)
- Ekonomiku (Finance, výplaty)
- Uložení a načtení (State.nacti/uloz) — jen přidat `uzlove` do normalizace

---

## Kontrola po implementaci

```javascript
// Spustit v konzoli po dni 11 pro debug:
console.log('Uzlové flagy:', State.uzlove);
console.log('Atomické flagy:', State.flags);
// Uzlové musí být konzistentní s atomickými.
```

Pokud jméno existujícího flagu v kódu neodpovídá mapovací tabulce výše,
Cursor: použij skutečný název z kódu a zapiš do komentáře co jsi použil.

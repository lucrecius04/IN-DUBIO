/**
 * engine.js — Herní smyčka. Řídí tok dní a fází.
 * Spouští den, přechází fázemi, kontroluje konce hry.
 */

const Engine = (() => {

  let _denData = null;

  // --- INICIALIZACE ---

  async function inicializuj() {
    // Načti data
    await DataLoader.nactiVse();

    // Inicializuj moduly
    Traits.inicializuj();
    Factions.inicializuj();
    Characters.inicializuj();

    // Načti uloženou hru nebo začni novou
    const ulozeno = State.nacti();
    if (!ulozeno) {
      State.reset();
    }

    // Nastav UI listenery
    UI.inicializuj();
    Desk.inicializujTooltipyRysu();

    // Tlačítko Další den
    document.getElementById('btn-dalsi-den')?.addEventListener('click', () => {
      _dalsiDen();
    });

    // Složky — click handlers
    for (let i = 0; i < 3; i++) {
      const slozka = document.getElementById('slozka-' + (i + 1));
      slozka?.addEventListener('click', () => Cases.otevriPripad(i));
    }

    // Spusť aktuální den
    await spustDen();
  }

  // --- DEN ---

  async function spustDen() {
    const den = State.get('currentDay');

    // Konec hry po 30 dnech
    if (den > 30) {
      spustKonec('preziti');
      return;
    }

    // Načti denní data
    _denData = DataLoader.ziskejDen(den);

    // Aktualizuj vizuál stolu
    State.set('phase', 'morning');
    Desk.aktualizujVse();
    Music.aktualizujStopu();

    // Aktualizuj noviny
    if (_denData) Narrative.aktualizujNoviny(_denData);

    // Nastav případy dne PŘED dialogy — složky musí být aktivní hned po zavření overlaye
    const pripadyIds = _denData?.cases || [];
    Cases.nastavPripadyDne(pripadyIds);
    const pripady = Cases.getPripady();
    UI.aktualizujSlozky(pripady, State.get('casesResolvedToday'));
    Desk.nastavAktivniSpis(null);

    // Ranní fragment (overlay blokuje UI, ale složky jsou už načteny)
    if (_denData?.morning_fragment) {
      await _cekejNaFragment(_denData.morning_fragment);
    }

    // Dialogy postav pro tento den
    await _zpracujDialogyDne(den);

    State.set('phase', 'forenoon');
    Desk.aktualizujVse();

    // Vlčkův dopis
    if (_denData?.vlcek_letter) {
      Desk.zobrazVlcekDopis(true);
      Desk.zobrazSuplikIndikator(true);
    } else {
      Desk.zobrazVlcekDopis(false);
    }

    // Zobraz tlačítko Další den (hráč vyřeší případy sám)
    UI.zobrazBtnDalsiDen(false);
  }

  function zkontrolujKonecDne() {
    const vyresene    = State.get('casesResolvedToday');
    const vsechnyIds  = _denData?.cases || [];

    // Žádné případy → umožni přejít hned
    if (vsechnyIds.length === 0) {
      State.set('phase', 'evening');
      Desk.aktualizujVse();
      UI.zobrazBtnDalsiDen(true);
      return;
    }

    // Všechny případy vyřešeny → zobraz tlačítko Další den
    const vsechnyVyreseny = vsechnyIds.every(id => vyresene.includes(id));
    if (vsechnyVyreseny) {
      State.set('phase', 'evening');
      Desk.aktualizujVse();
      UI.zobrazStavovouZpravu('Dnešní případy jsou uzavřeny.');
      setTimeout(() => UI.zobrazBtnDalsiDen(true), 800);
    }
  }

  async function _dalsiDen() {
    UI.zobrazBtnDalsiDen(false);

    // Večerní volba
    if (_denData?.evening_choice) {
      await _cekejNaVecerniVolbu(_denData);
    }

    // Noční fragment
    if (_denData?.night_fragment) {
      State.set('phase', 'night');
      Desk.aktualizujVse();
      Music.aktualizujStopu();
      await _cekejNaFragment(_denData.night_fragment);
    }

    // Přechod dne — vizuální stmívání
    const stul = document.getElementById('stul');
    stul?.classList.add('prechod-dne');
    await _cekej(1600);
    stul?.classList.remove('prechod-dne');

    // Posun na další den
    State.dalsiDen();
    State.uloz();

    await spustDen();
  }

  // --- DIALOGY POSTAV ---

  async function _zpracujDialogyDne(den) {
    const dialogy = Characters.getDialogyDen(den);
    for (const { id, dialog } of dialogy) {
      State.oznacPostavuPotkanu(id);
      // Dialogy se zobrazí jako fragmenty
      await _cekejNaFragment(null, {
        type:  dialog.type === 'letter' ? 'letter' : 'letter',
        title: Characters.getNazev(id),
        text:  dialog.text
      });
    }
  }

  // --- HAASOVA OBÁLKA ---

  function otevriHaasovuObalku() {
    if (State.get('flags.haas_envelope_opened')) return;

    const den = State.get('currentDay');
    if (den < 8) {
      UI.zobrazStavovouZpravu('Obálka přišla den 8.');
      return;
    }

    State.set('flags.haas_envelope_opened', true);
    State.upravRys('Vina', +5);

    // Najdi fragment obálky
    const fragment = DataLoader.ziskejFragment('haas_obalka');
    if (fragment) {
      UI.zobrazFragment(fragment, () => {});
    } else {
      UI.zobrazFragment({
        type:  'letter',
        title: 'Obálka od Haasova advokáta',
        text:  'Vážený pane doktore,\n\nDovolujeme si Vás informovat, že náš klient pan průmyslník Haas přiložil k tomuto dopisu výraz své úcty ve výši 800 Kč.\n\nVěříme, že budete jeho záležitostem věnovat patřičnou pozornost.\n\nS uctivým pozdravem,\nJUDr. Haas & synové, advokátní kancelář'
      }, () => {});
    }

    State.uloz();
    UI.zavriModal('modal-archiv');
  }

  // --- VLČKŮV DOPIS ---

  function otevriVlcekuvDopis() {
    if (!_denData?.vlcek_letter) return;

    const fragment = DataLoader.ziskejFragment(_denData.vlcek_letter);
    const obsah = fragment || {
      type:  'letter',
      title: 'Dopis od ministra Vlčka',
      text:  _denData.vlcek_letter_text || '„Věřím, že jste muž který rozumí nutnosti kompromisů, pane doktore."'
    };

    UI.zobrazFragment(obsah, () => {
      Desk.zobrazVlcekDopis(false);
      Desk.zobrazSuplikIndikator(false);
    });

    // Zmačkání → Maska -3
    State.upravRys('Maska', -3);
    State.uloz();
  }

  // --- KONEC HRY ---

  function spustKonec(typ) {
    State.set('gameOver', true);
    State.set('endingType', typ);
    State.uloz();
    Music.nastavStopu('epilog');

    const epilog = _sestavEpilog(typ);
    UI.zobrazKonecHry(typ, epilog);
  }

  function _sestavEpilog(typ) {
    const stav = State.get();
    const radky = [];

    // Radky pro každou postavu — ze State a flags
    const postavyEpilog = {
      vlcek:     _epilogVlcek(typ, stav),
      horakova:  _epilogHorakova(typ, stav),
      masek:     _epilogMasek(typ, stav),
      benes:     _epilogBenes(typ, stav),
      novak:     _epilogNovak(typ, stav)
    };

    for (const [id, text] of Object.entries(postavyEpilog)) {
      if (text) {
        radky.push({
          postava: id === 'novak' ? null : Characters.getNazev(id),
          text,
          klic: id === 'novak'
        });
      }
    }

    return radky;
  }

  function _epilogVlcek(typ, stav) {
    if (typ === 'hrdina') return 'Byl odvolán z funkce. Řízení bylo zastaveno po dvou týdnech.';
    if (typ === 'korupce') return 'Nadále slouží republice. Novákův případ nikdy nezmínil.';
    return 'Zůstal na místě. Jako vždy.';
  }

  function _epilogHorakova(typ, stav) {
    const trust = stav.trust.horakova;
    if (typ === 'hrdina')        return 'Vydala sérii článků. Tři novináři přišli o práci kvůli ní. Pokračovala.';
    if (trust >= 2)              return 'Napsala o Novákovi. Ne o případu — o člověku.';
    return 'Sledovala případ z dálky. Psala o jiných věcech.';
  }

  function _epilogMasek(typ, stav) {
    if (typ === 'korupce') return 'Přivítal Nováka mezi svými. Nikdy o tom nemluvili.';
    return 'Odešel do penze o rok dříve. Bez rozloučení.';
  }

  function _epilogBenes(typ, stav) {
    const identified = stav.flags.benes_identified;
    if (identified && typ === 'hrdina') return 'Přišel na pohřeb. Nestál blízko. Ale byl tam.';
    if (identified) return 'Odešel tiše. Nikdo nevěděl, kdo byl.';
    return 'Starý muž. Novák nikdy nezjistil, kdo byl.';
  }

  function _epilogNovak(typ, stav) {
    const endingTexty = {
      odvolani: 'Dr. Karel Novák byl odvolán z funkce. Kariéra skončila. Přestěhoval se na venkov.',
      korupce:  'Dr. Karel Novák se stal součástí systému. Přesně tak, jak se bál.',
      atentát:  'Dr. Karel Novák zemřel 28. března 1931. Příčina nebyla nikdy plně objasněna.',
      preziti:  'Dr. Karel Novák přežil třicet dní. Věděl, co za to zaplatil.',
      hrdina:   'Dr. Karel Novák přežil. A věděl — napravit minulost správnými rozhodnutími nejde. Ale žít s ní — to ano.'
    };
    return endingTexty[typ] || 'Dr. Karel Novák. 1931.';
  }

  // --- HELPERS ---

  function _cekejNaFragment(id, inlineFragment) {
    return new Promise(resolve => {
      if (inlineFragment) {
        UI.zobrazFragment(inlineFragment, resolve);
      } else if (id) {
        Narrative.zobrazFragment(id, resolve);
      } else {
        resolve();
      }
    });
  }

  function _cekejNaVecerniVolbu(denData) {
    return new Promise(resolve => {
      UI.zobrazVecerniVolbu(denData, (moznost) => {
        if (moznost?.effects) {
          for (const [rys, delta] of Object.entries(moznost.effects)) {
            State.upravRys(rys, delta);
          }
        }
        Desk.aktualizujVse();
        resolve();
      });
    });
  }

  function _cekej(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // --- SPUŠTĚNÍ ---

  document.addEventListener('DOMContentLoaded', () => {
    _inicializujUvod();
  });

  function _inicializujUvod() {
    const overlay = document.getElementById('uvod-overlay');
    if (!overlay) { inicializuj(); return; }

    // Zkontroluj uloženou hru
    const ulozeno = localStorage.getItem('indubio_save');
    const zpravaEl = document.getElementById('uvod-ulozena-zprava');
    if (ulozeno && zpravaEl) {
      try {
        const stavData = JSON.parse(ulozeno);
        zpravaEl.textContent = `Uložená hra — Den ${stavData.currentDay} z 30`;
      } catch (_) {}
    }

    overlay.addEventListener('click', () => {
      Music.spustPoInterakci();
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.style.display = 'none';
        inicializuj();
      }, 1500);
    });
  }

  return {
    spustDen,
    zkontrolujKonecDne,
    spustKonec,
    otevriHaasovuObalku,
    otevriVlcekuvDopis
  };

})();

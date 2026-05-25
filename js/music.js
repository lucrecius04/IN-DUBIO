/**
 * music.js — Hudební systém.
 * Dva přehrávače, crossfade na přirozeném konci stopy (3s před end),
 * výběr stopy podle stavu hry, ovládání hlasitosti.
 */

const Music = (() => {

  const STOPY = {
    theme:        'assets/sounds/music/In Dubio - Theme.mp3',
    ordinary_day: 'assets/sounds/music/In Dubio - Ordinary day.mp3',
    tension:      'assets/sounds/music/In Dubio - Tension.mp3',
    weight:       'assets/sounds/music/In Dubio - Weight.mp3',
    danger:       'assets/sounds/music/In Dubio - Danger.mp3',
    epilog:       'assets/sounds/music/In Dubio - Epilog.mp3'
  };
  /** Začátek 3. týdne kampaně (kalendářní den). Od tohoto dne běží pouze Danger. */
  const TRETI_TYDEN_OD_DNE = 15;

  const CROSSFADE_SEKUND = 3;
  const VYCHOZI_HLASITOST = 0.4;
  const MENU_PRECHOD_STLUM_MS = 700;
  const MENU_PRECHOD_TICHO_MS = 2000;
  const MENU_PRECHOD_NABEH_MS = 2200;

  /** Během verdiktního zvuku: násobek hlasitosti hudby (0–1). */
  const DUCK_VERDIKT_HLASITOST_MULT = 0.28;

  /** Před verdiktem: krátký pokles hlasitosti (dlouhá rampa působila jako zpoždění oproti SFX). */
  const VERDIKT_RAMPA_DOLU_MS = 140;

  /** Po skončení ducku: délka náběhu zpět na plnou hlasitost ze slideru. */
  const VERDIKT_RAMPA_ZPATKY_MS = 2600;

  let _hlasitost   = VYCHOZI_HLASITOST;
  let _zapnuto     = true;
  let _poInterakci = false;  // browser policy — zvuk povolí až po první interakci

  // Dva přehrávače se střídají (A/B)
  let _prehravacA  = null;
  let _prehravacB  = null;
  let _aktivni     = 'a';   // 'a' | 'b'

  // Stopy
  let _aktualniNazev = null;   // název právě hrající stopy
  let _cilovaNazev   = null;   // název, na který se přepneme
  let _kontext       = 'neutral'; // 'neutral' | 'tension' | 'weight'
  /** Tension smí hrát pouze během aktivního pátrání. */
  let _patraniAktivni = false;
  /** Další stopa pro běžný režim stolu (střídání ordinary/weight). */
  let _deskPristiStopa = 'ordinary_day';

  // Stráž: crossfade nespustit dvakrát
  let _crossfadeProbiha = false;

  /** Dočasné ztlumení hudby při vynesení rozsudku (SFX). */
  let _verdiktDucking = false;
  let _verdiktDuckTimer = null;
  /** setInterval při plynulém náběhu hlasitosti po verdiktu. */
  let _verdiktRampaId = null;
  /** setInterval při plynulém poklesu před verdiktem. */
  let _verdiktRampaDoluId = null;
  /** Časovače pro „zklidněný“ přechod přes ticho (menu). */
  let _menuPrechodTimer = null;
  let _menuPrechodFadeInId = null;
  let _menuPrechodFadeOutId = null;

  function _zrusMenuPrechod() {
    if (_menuPrechodTimer != null) {
      clearTimeout(_menuPrechodTimer);
      _menuPrechodTimer = null;
    }
    if (_menuPrechodFadeInId != null) {
      clearInterval(_menuPrechodFadeInId);
      _menuPrechodFadeInId = null;
    }
    if (_menuPrechodFadeOutId != null) {
      clearInterval(_menuPrechodFadeOutId);
      _menuPrechodFadeOutId = null;
    }
  }

  function _spustLinearnyFade(prehravac, fromVol, toVol, trvaniMs, saveTo, onDone) {
    const dur = Math.max(0, Number(trvaniMs) || 0);
    const from = Math.max(0, Math.min(1, Number(fromVol) || 0));
    const to = Math.max(0, Math.min(1, Number(toVol) || 0));
    if (!prehravac || dur <= 0) {
      if (prehravac) prehravac.volume = to;
      if (typeof onDone === 'function') onDone();
      return;
    }
    const kroky = Math.max(1, Math.round(dur / 50));
    const delta = (to - from) / kroky;
    let k = 0;
    prehravac.volume = from;
    const id = setInterval(() => {
      k++;
      if (!prehravac.src) {
        clearInterval(id);
        if (saveTo === 'in') _menuPrechodFadeInId = null;
        if (saveTo === 'out') _menuPrechodFadeOutId = null;
        return;
      }
      const v = Math.max(0, Math.min(1, from + delta * k));
      prehravac.volume = v;
      if (k >= kroky) {
        clearInterval(id);
        prehravac.volume = to;
        if (saveTo === 'in') _menuPrechodFadeInId = null;
        if (saveTo === 'out') _menuPrechodFadeOutId = null;
        if (typeof onDone === 'function') onDone();
      }
    }, 50);
    if (saveTo === 'in') _menuPrechodFadeInId = id;
    if (saveTo === 'out') _menuPrechodFadeOutId = id;
  }

  function _prechodPresTicho(nazev) {
    if (!STOPY[nazev]) return;
    if (!_poInterakci) { _cilovaNazev = nazev; return; }
    if (!_zapnuto) { _aktualniNazev = nazev; _cilovaNazev = nazev; return; }
    _zrusVerdiktRampu();
    _zrusMenuPrechod();
    _crossfadeProbiha = false;
    const aktivni = _getAktivniPrehravac();
    const maAktivni = !!(aktivni && aktivni.src && !aktivni.paused);
    const startVol = maAktivni ? aktivni.volume : 0;
    const poStlumu = () => {
      if (_prehravacA) { _prehravacA.pause(); _prehravacA.src = ''; }
      if (_prehravacB) { _prehravacB.pause(); _prehravacB.src = ''; }
      _menuPrechodTimer = setTimeout(() => {
        _menuPrechodTimer = null;
        _spustStopu(nazev);
        const p = _getAktivniPrehravac();
        if (!p) return;
        const cil = _hlasitostKPrehrani();
        p.volume = 0;
        _spustLinearnyFade(p, 0, cil, MENU_PRECHOD_NABEH_MS, 'in');
      }, MENU_PRECHOD_TICHO_MS);
    };
    if (maAktivni) {
      _spustLinearnyFade(aktivni, startVol, 0, MENU_PRECHOD_STLUM_MS, 'out', poStlumu);
    } else {
      poStlumu();
    }
  }

  function _zrusVerdiktRampu() {
    if (_verdiktRampaId != null) {
      clearInterval(_verdiktRampaId);
      _verdiktRampaId = null;
    }
    if (_verdiktRampaDoluId != null) {
      clearInterval(_verdiktRampaDoluId);
      _verdiktRampaDoluId = null;
    }
  }

  /** Po skončení ducku: lineární náběh z aktuální hlasitosti na `_hlasitost`. */
  function _spustRampuHlasitostiPoVerdiktu() {
    if (!_poInterakci || !_zapnuto) return;
    if (_crossfadeProbiha) {
      _aplikujHlasitostAktivnihoPrehravace();
      return;
    }
    _zrusVerdiktRampu();
    const p = _getAktivniPrehravac();
    if (!p || !p.src || p.paused) return;
    const cil = Math.min(1, _hlasitost);
    const zac = p.volume;
    if (zac >= cil - 0.002) {
      p.volume = cil;
      return;
    }
    const kroky = Math.max(1, Math.round(VERDIKT_RAMPA_ZPATKY_MS / 50));
    const delta = (cil - zac) / kroky;
    let k = 0;
    _verdiktRampaId = setInterval(() => {
      k++;
      if (p.paused || !p.src) {
        _zrusVerdiktRampu();
        return;
      }
      const v = Math.min(cil, zac + delta * k);
      p.volume = v;
      if (k >= kroky || v >= cil - 0.0001) {
        p.volume = cil;
        _zrusVerdiktRampu();
      }
    }, 50);
  }

  function _hlasitostKPrehrani() {
    const m = _verdiktDucking ? DUCK_VERDIKT_HLASITOST_MULT : 1;
    return Math.min(1, _hlasitost * m);
  }

  /** Po změně duck / slideru — jen když neprobíhá crossfade. */
  function _aplikujHlasitostAktivnihoPrehravace() {
    if (!_poInterakci || !_zapnuto) return;
    if (_crossfadeProbiha) return;
    if (_verdiktRampaId != null) return;
    if (_verdiktRampaDoluId != null) return;
    const p = _getAktivniPrehravac();
    if (p && p.src && !p.paused) p.volume = _hlasitostKPrehrani();
  }

  /** Před verdiktem: plynulý pokles z aktuální hlasitosti na úroveň ducku. */
  function _spustRampuHlasitostiPredVerdiktem(onKomplet) {
    if (!_poInterakci || !_zapnuto) {
      if (typeof onKomplet === 'function') onKomplet();
      return;
    }
    if (_crossfadeProbiha) {
      if (typeof onKomplet === 'function') onKomplet();
      return;
    }
    const p = _getAktivniPrehravac();
    if (!p || !p.src || p.paused) {
      if (typeof onKomplet === 'function') onKomplet();
      return;
    }
    const cil = Math.min(1, _hlasitost * DUCK_VERDIKT_HLASITOST_MULT);
    const zac = p.volume;
    if (zac <= cil + 0.002) {
      p.volume = cil;
      if (typeof onKomplet === 'function') onKomplet();
      return;
    }
    const kroky = Math.max(1, Math.round(VERDIKT_RAMPA_DOLU_MS / 50));
    const delta = (cil - zac) / kroky;
    let k = 0;
    _verdiktRampaDoluId = setInterval(() => {
      k++;
      if (p.paused || !p.src) {
        if (_verdiktRampaDoluId != null) {
          clearInterval(_verdiktRampaDoluId);
          _verdiktRampaDoluId = null;
        }
        return;
      }
      const v = Math.max(cil, zac + delta * k);
      p.volume = v;
      if (k >= kroky || v <= cil + 0.0001) {
        p.volume = cil;
        if (_verdiktRampaDoluId != null) {
          clearInterval(_verdiktRampaDoluId);
          _verdiktRampaDoluId = null;
        }
        if (typeof onKomplet === 'function') onKomplet();
      }
    }, 50);
  }

  /**
   * Na danou dobu ztlumí hudbu (pro slyšitelnost verdiktního zvuku).
   * @param {number} ms
   */
  function duckBehemVerdiktu(ms) {
    if (!_poInterakci || !_zapnuto) return;
    const trv = Math.max(0, Number(ms) || 0);
    if (trv <= 0) return;
    _zrusVerdiktRampu();
    if (_verdiktDuckTimer) {
      clearTimeout(_verdiktDuckTimer);
      _verdiktDuckTimer = null;
    }
    _verdiktDucking = false;
    _spustRampuHlasitostiPredVerdiktem(() => {
      _verdiktDucking = true;
    });
    _verdiktDuckTimer = setTimeout(() => {
      _verdiktDuckTimer = null;
      _verdiktDucking = false;
      _spustRampuHlasitostiPoVerdiktu();
    }, trv);
  }

  // --- INIT ---

  function _inicializuj() {
    _prehravacA = new Audio();
    _prehravacB = new Audio();
    _prehravacA.preload = 'auto';
    _prehravacB.preload = 'auto';

    _prehravacA.addEventListener('timeupdate', () => _sledujKonec(_prehravacA));
    _prehravacB.addEventListener('timeupdate', () => _sledujKonec(_prehravacB));

    // Pokud se přehrávač samovolně zastaví (ended bez crossfade — krátká stopa)
    _prehravacA.addEventListener('ended', () => { if (_aktivni === 'a') _poPrehrani(); });
    _prehravacB.addEventListener('ended', () => { if (_aktivni === 'b') _poPrehrani(); });

    _nastavUIListenery();
  }

  // --- VEŘEJNÉ API ---

  /**
   * Volat při první interakci uživatele.
   * Odblokuje audio, spustí Theme (nebo stopu podle stavu hry pokud hra běží).
   */
  function spustPoInterakci() {
    if (_poInterakci) return;
    _poInterakci = true;

    // Zjisti startovní stopu — pokud State ještě nemá data, hraj Theme
    let startNazev = 'theme';
    try {
      if (typeof State !== 'undefined' && State.get('currentDay')) {
        startNazev = _urcStopu();
      }
    } catch (_) {}

    _spustStopu(startNazev);
  }

  /**
   * Přečte stav hry a zařadí správnou stopu jako cílovou.
   * Pokud se liší od aktuální, přepne se na přirozeném konci.
   */
  function aktualizujStopu() {
    if (!_poInterakci) return;
    const nazev = _urcStopu();
    _nastavCilovou(nazev);
  }

  /**
   * Vynutí konkrétní stopu (bez čekání na konec aktuální).
   * Používat jen pro dramatické přechody — epilog, konec hry.
   */
  function nastavStopu(nazev) {
    if (!_poInterakci) { _cilovaNazev = nazev; return; }
    if (nazev === _aktualniNazev) return;
    _crossfadeProbiha = false; // reset — dovolíme přerušení
    _crossfadeTo(nazev);
  }

  /**
   * Nastaví kontextový příznak a přepočítá cílovou stopu.
   * @param {string} kontext — 'tension' | 'weight' | 'neutral'
   */
  function nastavKontext(kontext) {
    _kontext = kontext;
    aktualizujStopu();
  }

  /**
   * Přepíná hudební režim pátrání.
   * Když je aktivní, vždy se cíluje stopa Tension; mimo pátrání nikdy.
   * @param {boolean} aktivni
   */
  function nastavPatraniAktivni(aktivni) {
    const novy = aktivni === true;
    if (_patraniAktivni === novy) return;
    _patraniAktivni = novy;
    if (_patraniAktivni) {
      // Při startu pátrání přepni okamžitě na Tension (nečekat na konec stopy).
      nastavStopu('tension');
    } else {
      // Po ukončení pátrání vrať hudbu okamžitě dle běžného stavu hry.
      nastavStopu(_urcStopu());
    }
  }

  /**
   * Návrat z menu do hry:
   * Theme plynule zhasne crossfadem a naváže cílová stopa dle aktuálního stavu.
   */
  function navratZMenu() {
    if (!_poInterakci) return;
    let cil = _urcStopu();
    // Bezpečnost: po menu nechceme zůstávat na Theme.
    if (cil === 'theme') cil = _deskPristiStopa || 'ordinary_day';
    _prechodPresTicho(cil);
  }

  /** Přechod do menu (Theme) přes krátké zklidnění. */
  function prechodDoMenu() {
    _prechodPresTicho('theme');
  }

  // --- VÝBĚR STOPY ---

  function _urcStopu() {
    try {
      const stav = State.get();
      if (!stav) return 'ordinary_day';

      const den   = stav.currentDay  || 1;
      const phase = stav.phase       || 'morning';
      const vina  = stav.traits?.Vina ?? 50;

      if (stav.gameOver)             return 'epilog';
      if (den >= TRETI_TYDEN_OD_DNE) return 'danger';
      if (_patraniAktivni)           return 'tension';
      // Běžný provoz stolu: na přeskáčku Ordinary <-> Weight.
      return _deskPristiStopa;
    } catch (_) {
      return 'ordinary_day';
    }
  }

  function _jeDeskStopa(nazev) {
    return nazev === 'ordinary_day' || nazev === 'weight';
  }

  function _opacnaDeskStopa(nazev) {
    return nazev === 'ordinary_day' ? 'weight' : 'ordinary_day';
  }

  function _aktualizujDeskSekvenciPoPrepnuti(nazev) {
    if (_jeDeskStopa(nazev)) {
      _deskPristiStopa = _opacnaDeskStopa(nazev);
    }
  }

  function _nastavCilovou(nazev) {
    _cilovaNazev = nazev;
    // Pokud nic nehraje, spusť hned
    const aktivniPrehravac = _getAktivniPrehravac();
    if (!aktivniPrehravac || aktivniPrehravac.paused) {
      _spustStopu(nazev);
    }
    // Jinak se přepne na konci aktuální stopy (viz _sledujKonec)
  }

  // --- PŘEHRÁVÁNÍ ---

  function _spustStopu(nazev) {
    if (!STOPY[nazev]) return;
    if (!_zapnuto) { _aktualniNazev = nazev; _cilovaNazev = nazev; return; }

    _zrusVerdiktRampu();

    const src = STOPY[nazev];
    const aktivniPrehravac = _getAktivniPrehravac();

    // Nastav nový přehrávač
    aktivniPrehravac.src    = src;
    aktivniPrehravac.volume = _hlasitostKPrehrani();
    aktivniPrehravac.currentTime = 0;

    _aktualniNazev = nazev;
    _cilovaNazev   = nazev;
    _crossfadeProbiha = false;
    _aktualizujDeskSekvenciPoPrepnuti(nazev);

    aktivniPrehravac.play().catch(() => {});
  }

  function _sledujKonec(prehravac) {
    // Pouze aktivní přehrávač sledujeme
    if (prehravac !== _getAktivniPrehravac()) return;
    if (_crossfadeProbiha) return;
    if (!prehravac.duration || isNaN(prehravac.duration)) return;

    const zbyvaCas = prehravac.duration - prehravac.currentTime;
    if (zbyvaCas <= CROSSFADE_SEKUND && zbyvaCas > 0) {
      // Zjistíme cílovou stopu — v desk režimu střídáme Ordinary <-> Weight.
      const navrh = _urcStopu();
      const cil = (_jeDeskStopa(_aktualniNazev) && _jeDeskStopa(navrh))
        ? _opacnaDeskStopa(_aktualniNazev)
        : (_cilovaNazev || navrh || _aktualniNazev);
      _crossfadeProbiha = true;
      _crossfadeTo(cil);
    }
  }

  function _poPrehrani() {
    // Stopa skončila bez crossfade (krátký soubor nebo crossfade propásl)
    _crossfadeProbiha = false;
    const cil = _cilovaNazev || _aktualniNazev;
    _prepniPrehravac();
    _spustStopu(cil);
  }

  function _crossfadeTo(novaNazev) {
    if (!STOPY[novaNazev]) return;
    if (!_zapnuto) { _aktualniNazev = novaNazev; _cilovaNazev = novaNazev; return; }

    _zrusVerdiktRampu();

    const staryPrehravac = _getAktivniPrehravac();
    _prepniPrehravac();
    const novyPrehravac = _getAktivniPrehravac();

    // Připrav nový přehrávač
    novyPrehravac.src    = STOPY[novaNazev];
    novyPrehravac.volume = 0;
    novyPrehravac.currentTime = 0;
    novyPrehravac.play().catch(() => {});

    _aktualniNazev = novaNazev;
    _cilovaNazev   = novaNazev;
    _aktualizujDeskSekvenciPoPrepnuti(novaNazev);

    // Animace přechodu (cílová hlasitost respektuje duck u verdiktu)
    const kroky  = (CROSSFADE_SEKUND * 1000) / 50;
    let   provedeno = 0;

    const interval = setInterval(() => {
      provedeno++;
      const cil = _hlasitostKPrehrani();
      const krokVol = cil / kroky;
      const novyVol  = Math.min(cil, novyPrehravac.volume + krokVol);
      const staryVol = Math.max(0,          staryPrehravac.volume - krokVol);

      novyPrehravac.volume  = novyVol;
      staryPrehravac.volume = staryVol;

      if (provedeno >= kroky) {
        clearInterval(interval);
        staryPrehravac.pause();
        staryPrehravac.src = '';
        novyPrehravac.volume = _hlasitostKPrehrani();
        _crossfadeProbiha  = false;
      }
    }, 50);
  }

  // --- PŘEHRÁVAČ HELPERS ---

  function _getAktivniPrehravac() {
    return _aktivni === 'a' ? _prehravacA : _prehravacB;
  }

  function _prepniPrehravac() {
    _aktivni = _aktivni === 'a' ? 'b' : 'a';
  }

  // --- UI LISTENERY ---

  function _nastavUIListenery() {
    // Tlačítko zapnutí/vypnutí
    const toggle = document.getElementById('hudba-toggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        _zapnuto = !_zapnuto;
        toggle.textContent = _zapnuto ? '🔊' : '🔇';
        toggle.title = _zapnuto ? 'Ztlumit hudbu' : 'Zapnout hudbu';

        if (_zapnuto) {
          // Obnoví přehrávání
          if (_aktualniNazev) _spustStopu(_aktualniNazev);
        } else {
          // Vypne oba přehrávače
          _prehravacA.pause();
          _prehravacB.pause();
        }
      });
    }

    // Slider hlasitosti
    const slider = document.getElementById('hudba-hlasitost');
    if (slider) {
      slider.addEventListener('input', () => {
        _hlasitost = parseInt(slider.value) / 100;
        _zrusVerdiktRampu();
        const aktivniPrehravac = _getAktivniPrehravac();
        if (!_crossfadeProbiha) {
          aktivniPrehravac.volume = _hlasitostKPrehrani();
        }
      });
    }
  }

  // --- START ---

  document.addEventListener('DOMContentLoaded', _inicializuj);

  return {
    spustPoInterakci,
    aktualizujStopu,
    nastavStopu,
    nastavKontext,
    nastavPatraniAktivni,
    prechodDoMenu,
    navratZMenu,
    duckBehemVerdiktu
  };

})();

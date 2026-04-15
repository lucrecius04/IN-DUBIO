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

  const CROSSFADE_SEKUND = 3;
  const VYCHOZI_HLASITOST = 0.4;

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

  // Stráž: crossfade nespustit dvakrát
  let _crossfadeProbiha = false;

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

  // --- VÝBĚR STOPY ---

  function _urcStopu() {
    try {
      const stav = State.get();
      if (!stav) return 'ordinary_day';

      const den   = stav.currentDay  || 1;
      const phase = stav.phase       || 'morning';
      const vina  = stav.traits?.Vina ?? 50;

      if (stav.gameOver)             return 'epilog';
      if (den >= 21)                 return 'danger';

      if (_kontext === 'tension')    return 'tension';
      if (phase === 'night')         return 'weight';
      if (vina > 70)                 return 'weight';
      if (_kontext === 'weight')     return 'weight';

      return 'ordinary_day';
    } catch (_) {
      return 'ordinary_day';
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

    const src = STOPY[nazev];
    const aktivniPrehravac = _getAktivniPrehravac();

    // Nastav nový přehrávač
    aktivniPrehravac.src    = src;
    aktivniPrehravac.volume = _hlasitost;
    aktivniPrehravac.currentTime = 0;

    _aktualniNazev = nazev;
    _cilovaNazev   = nazev;
    _crossfadeProbiha = false;

    aktivniPrehravac.play().catch(() => {});
  }

  function _sledujKonec(prehravac) {
    // Pouze aktivní přehrávač sledujeme
    if (prehravac !== _getAktivniPrehravac()) return;
    if (_crossfadeProbiha) return;
    if (!prehravac.duration || isNaN(prehravac.duration)) return;

    const zbyvaCas = prehravac.duration - prehravac.currentTime;
    if (zbyvaCas <= CROSSFADE_SEKUND && zbyvaCas > 0) {
      // Zjistíme cílovou stopu — buď změněná, nebo stejná (smyčka)
      const cil = _cilovaNazev || _aktualniNazev;
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

    // Animace přechodu
    const kroky  = (CROSSFADE_SEKUND * 1000) / 50;
    const krokVol = _hlasitost / kroky;
    let   provedeno = 0;

    const interval = setInterval(() => {
      provedeno++;
      const novyVol  = Math.min(_hlasitost, novyPrehravac.volume + krokVol);
      const staryVol = Math.max(0,          staryPrehravac.volume - krokVol);

      novyPrehravac.volume  = novyVol;
      staryPrehravac.volume = staryVol;

      if (provedeno >= kroky) {
        clearInterval(interval);
        staryPrehravac.pause();
        staryPrehravac.src = '';
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
        const aktivniPrehravac = _getAktivniPrehravac();
        if (!_crossfadeProbiha) {
          aktivniPrehravac.volume = _hlasitost;
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
    nastavKontext
  };

})();

/**
 * sfx.js — Jednorázové efekty, ambientní smyčka, náhodné kroky.
 * Spuštění ambientu a časovačů až po odemčení (autoplay policy).
 */

const SFX = (() => {
  const BASE = 'assets/sounds/sfx/';
  const SOUBORY = {
    stamp: 'stamp.wav',
    paper: 'paper.mp3',
    clock: 'single_clock.mp3',
    newday: 'newday.mp3',
    verdikt: 'verdikt.wav',
    whisper: 'whisper.wav',
    pruzkum_mimo_zaznam: 'pruzkum_mimo_zaznam.mp3',
    campfire: 'campfire.wav',
    steps1: 'steps1.wav',
    steps2: 'steps2.flac',
    pen_writing: 'pen_writing.mp3',
    /** Pátrání (osa stop): potvrzení / neúspěch — `assets/sounds/sfx/`. */
    patrani_success: 'success.wav',
    patrani_notsuccess: 'notsuccess.mp3'
  };

  const VOL_PATRANI_USPECH = 0.88;
  /** Neúspěch pátrání (notsuccess) — mírně tišeji. */
  const VOL_PATRANI_NEUSPECH = 0.66;

  /** Max. délka přehrání verdiktní stopy (soubor může být delší). */
  const ROZSUDEK_VERDIKT_MAX_S = 10;

  /** Stejná doba jako výše: hudba se ztlumí na tuto délku. */
  const ROZSUDEK_DUCK_HUDBA_MS = ROZSUDEK_VERDIKT_MAX_S * 1000;

  /** Úspěch pátrání (piano): stejná rampa jako u verdiktu — 5 s ztlumení podkladu. */
  const PATRANI_USPECH_DUCK_HUDBA_MS = 5000;

  /** Zesílení gongu/verdiktu oproti `audio.volume = 1` (Web Audio GainNode). Nižší = tišší. */
  const VERDIKT_GAIN = 1.05;

  /** Zesílení zvuku „další den“ (newday). */
  const NEWDAY_GAIN = 1.28;

  /** Neoficiální průzkum (mimo záznam) — krátký táhlý zvuk, soubor může být delší. */
  const PRUZKUM_MIMO_ZAZNAM_MAX_S = 3;

  const VOL_PEN_WRITING = 0.3;

  const VOL_AMBIENT = 0.90;
  const VOL_KROKY = 1.30;

  let _odemceno = false;
  let _ambient = null;
  let _kroky1Id = null;
  let _kroky2Id = null;
  let _patraniHbCtx = null;
  let _patraniHbLast = 0;
  let _ctxSfxMedia = null;

  /** Jeden přednačtený přehrávač verdiktního zvonu — opakované `new Audio()` způsobovalo zpoždění při dekódování. */
  let _verdiktAudio = null;
  let _verdiktMaxTid = null;

  function _cesta(klic) {
    const j = SOUBORY[klic];
    return j ? BASE + j : '';
  }

  function _prehrajJednorazove(klic, hlasitost) {
    if (!_odemceno) return;
    const src = _cesta(klic);
    if (!src) return;
    const a = new Audio(src);
    a.volume = Math.max(0, Math.min(1, Number(hlasitost) || 1));
    a.play().catch(() => {});
  }

  function _zastavAmbient() {
    if (_ambient) {
      try {
        _ambient.pause();
      } catch (_e) {}
      try {
        _ambient.src = '';
      } catch (_e2) {}
      _ambient = null;
    }
  }

  function _spustAmbient() {
    _zastavAmbient();
    const a = new Audio(_cesta('campfire'));
    a.loop = true;
    a.volume = VOL_AMBIENT;
    _ambient = a;
    a.play().catch(() => {});
  }

  /**
   * Druhá sobota (den 13): v naraci jsou kamna vychladlá — bez praskání.
   * Jinak obnoví smyčku, pokud uživatel odemkl zvuk a ambient neběží.
   */
  function synchronizujAmbientPodleDne(den) {
    if (!_odemceno) return;
    const d = Number(den);
    const bezKamna = Number.isFinite(d) && d === 13;
    if (bezKamna) {
      _zastavAmbient();
      return;
    }
    if (!_ambient) {
      _spustAmbient();
    }
  }

  function _cyklusKroku(klic, intervalMs, ref) {
    const tick = () => {
      _prehrajJednorazove(klic, VOL_KROKY);
      if (ref === 1) _kroky1Id = setTimeout(tick, intervalMs);
      else _kroky2Id = setTimeout(tick, intervalMs);
    };
    if (ref === 1) _kroky1Id = setTimeout(tick, intervalMs);
    else _kroky2Id = setTimeout(tick, intervalMs);
  }

  function _zastavKroky() {
    if (_kroky1Id) {
      clearTimeout(_kroky1Id);
      _kroky1Id = null;
    }
    if (_kroky2Id) {
      clearTimeout(_kroky2Id);
      _kroky2Id = null;
    }
  }

  /** Připraví trvalý prvek pro verdikt (volá se po první interakci — začne stahovat buffer). */
  function _inicializujTrvalyVerdikt() {
    if (_verdiktAudio) return;
    const url = _cesta('verdikt');
    if (!url) return;
    const a = new Audio();
    a.preload = 'auto';
    a.src = url;
    a.volume = 1;
    _verdiktAudio = a;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) {
      try {
        if (!_ctxSfxMedia || _ctxSfxMedia.state === 'closed') _ctxSfxMedia = new AC();
        const src = _ctxSfxMedia.createMediaElementSource(a);
        const g = _ctxSfxMedia.createGain();
        g.gain.value = VERDIKT_GAIN;
        src.connect(g).connect(_ctxSfxMedia.destination);
      } catch (_e) {
        /* přehrávání bez WAA zesílení */
      }
    }
    try {
      a.load();
    } catch (_e) {
      /* ignore */
    }
  }

  /**
   * Volat spolu s Music.spustPoInterakci() po první interakci uživatele.
   * Spustí ambient, kroky; přednačte verdiktní zvuk kvůli latenci při potvrzení rozsudku.
   */
  function spustPoInterakci() {
    if (_odemceno) return;
    _odemceno = true;
    _inicializujTrvalyVerdikt();
    if (_ctxSfxMedia && _ctxSfxMedia.state === 'suspended') {
      _ctxSfxMedia.resume().catch(() => {});
    }
    synchronizujAmbientPodleDne(
      typeof State !== 'undefined' && State.get ? Number(State.get('currentDay')) || 1 : 1
    );
    _zastavKroky();
    _cyklusKroku('steps1', 1.5 * 60 * 1000, 1);
    _cyklusKroku('steps2', 2 * 60 * 1000, 2);
  }

  function rozsudekStamp() {
    _prehrajJednorazove('stamp', 1);
  }

  function slozkaPaper() {
    _prehrajJednorazove('paper', 0.75);
  }

  function prechodNaDalsiDen() {
    if (!_odemceno) return;
    const url = _cesta('newday');
    if (!url) return;
    const a = new Audio(url);
    a.volume = 1;

    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) {
      try {
        if (!_ctxSfxMedia || _ctxSfxMedia.state === 'closed') _ctxSfxMedia = new AC();
        _ctxSfxMedia.resume().catch(() => {});
        const src = _ctxSfxMedia.createMediaElementSource(a);
        const g = _ctxSfxMedia.createGain();
        g.gain.value = NEWDAY_GAIN;
        src.connect(g).connect(_ctxSfxMedia.destination);
        a.addEventListener(
          'ended',
          () => {
            try {
              src.disconnect();
              g.disconnect();
            } catch (_e) {}
          },
          { once: true }
        );
      } catch (_e) {
        /* fallback: bez zesílení */
      }
    }

    a.play().catch(() => {});
  }

  /** Vynesení rozsudku po potvrzení; mírně zesíleno přes GainNode, max. délka viz `ROZSUDEK_VERDIKT_MAX_S`. */
  function rozsudekVerdikt() {
    if (!_odemceno) return;
    _inicializujTrvalyVerdikt();
    const maxMs = ROZSUDEK_VERDIKT_MAX_S * 1000;
    const a = _verdiktAudio;
    if (a && a.src) {
      if (_verdiktMaxTid) {
        clearTimeout(_verdiktMaxTid);
        _verdiktMaxTid = null;
      }
      const vycistiTimer = () => {
        if (_verdiktMaxTid) {
          clearTimeout(_verdiktMaxTid);
          _verdiktMaxTid = null;
        }
      };
      const onEnded = () => vycistiTimer();
      a.removeEventListener('ended', onEnded);
      a.addEventListener('ended', onEnded, { once: true });
      _verdiktMaxTid = setTimeout(() => {
        try {
          a.pause();
        } catch (_e) {}
        vycistiTimer();
      }, maxMs);
      try {
        a.pause();
        a.currentTime = 0;
      } catch (_e) {}
      if (typeof Music !== 'undefined' && Music.duckBehemVerdiktu) {
        Music.duckBehemVerdiktu(ROZSUDEK_DUCK_HUDBA_MS);
      }
      if (_ctxSfxMedia) {
        _ctxSfxMedia.resume().catch(() => {});
      }
      a.play().catch(() => {
        vycistiTimer();
      });
      return;
    }
    /* Záloha: chybí soubor nebo inicializace */
    if (typeof Music !== 'undefined' && Music.duckBehemVerdiktu) {
      Music.duckBehemVerdiktu(ROZSUDEK_DUCK_HUDBA_MS);
    }
    const url = _cesta('verdikt');
    if (!url) return;
    const a2 = new Audio(url);
    a2.volume = 1;
    const tid = setTimeout(() => {
      try {
        a2.pause();
      } catch (_e) {}
    }, maxMs);
    const vycisti = () => clearTimeout(tid);
    a2.addEventListener('ended', vycisti, { once: true });
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) {
      try {
        if (!_ctxSfxMedia || _ctxSfxMedia.state === 'closed') _ctxSfxMedia = new AC();
        _ctxSfxMedia.resume().catch(() => {});
        const src = _ctxSfxMedia.createMediaElementSource(a2);
        const g = _ctxSfxMedia.createGain();
        g.gain.value = VERDIKT_GAIN;
        src.connect(g).connect(_ctxSfxMedia.destination);
        a2.addEventListener(
          'ended',
          () => {
            try {
              src.disconnect();
              g.disconnect();
            } catch (_e) {}
          },
          { once: true }
        );
      } catch (_e) {
        /* bez zesílení */
      }
    }
    a2.play()
      .then(() => {})
      .catch(() => {
        vycisti();
      });
  }

  function uplatekWhisper(hlasitost) {
    const v =
      hlasitost !== undefined && hlasitost !== null ? Number(hlasitost) : 0.88;
    _prehrajJednorazove('whisper', Number.isFinite(v) ? v : 0.88);
  }

  /** Odhalení zjištění cestou mimo spis (`path: unofficial`). */
  function pruzkumMimoZaznam() {
    if (!_odemceno) return;
    const url = _cesta('pruzkum_mimo_zaznam');
    if (!url) return;
    const a = new Audio(url);
    a.volume = 0.82;
    const maxMs = PRUZKUM_MIMO_ZAZNAM_MAX_S * 1000;
    const tid = setTimeout(() => {
      try {
        a.pause();
      } catch (_e) {}
    }, maxMs);
    const vycisti = () => clearTimeout(tid);
    a.addEventListener('ended', vycisti, { once: true });
    a.play()
      .then(() => {})
      .catch(() => {
        vycisti();
      });
  }

  function penWriting() {
    _prehrajJednorazove('pen_writing', VOL_PEN_WRITING);
  }

  /** Potvrzená osa stop po pátrání (čas i pokusy). */
  function patraniUspech() {
    if (typeof Music !== 'undefined' && Music.duckBehemVerdiktu) {
      Music.duckBehemVerdiktu(PATRANI_USPECH_DUCK_HUDBA_MS);
    }
    _prehrajJednorazove('patrani_success', VOL_PATRANI_USPECH);
  }

  /** Špatná dvojice, vypršení času, ukončení bez vazby apod. */
  function patraniNeuspech() {
    _prehrajJednorazove('patrani_notsuccess', VOL_PATRANI_NEUSPECH);
  }

  /** urgency 0 = začátek lovu, 1 = konec — zrychluje interval a sílu úderu */
  function patraniHeartbeatTick(urgency01) {
    if (!_odemceno) return;
    const u = Math.max(0, Math.min(1, Number(urgency01) || 0));
    if (u < 0.38) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const minGap = Math.max(220, 780 - Math.floor(560 * u));
    if (now - _patraniHbLast < minGap) return;
    _patraniHbLast = now;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      if (!_patraniHbCtx || _patraniHbCtx.state === 'closed') _patraniHbCtx = new AC();
      const ctx = _patraniHbCtx;
      ctx.resume().catch(() => {});
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 52 + u * 18;
      const vol = 0.06 + u * 0.14;
      g.gain.value = 0;
      o.connect(g).connect(ctx.destination);
      o.start();
      g.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0008, ctx.currentTime + 0.11 + u * 0.05);
      o.stop(ctx.currentTime + 0.18);
    } catch (_e) { /* ignore */ }
  }

  function zastavPatraniHeartbeat() {
    _patraniHbLast = 0;
  }

  return {
    spustPoInterakci,
    synchronizujAmbientPodleDne,
    rozsudekStamp,
    rozsudekVerdikt,
    uplatekWhisper,
    pruzkumMimoZaznam,
    slozkaPaper,
    prechodNaDalsiDen,
    penWriting,
    patraniUspech,
    patraniNeuspech,
    patraniHeartbeatTick,
    zastavPatraniHeartbeat
  };
})();

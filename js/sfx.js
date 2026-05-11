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
    pen_writing: 'pen_writing.mp3'
  };

  /** Max. délka přehrání verdiktní stopy (soubor může být delší). */
  const ROZSUDEK_VERDIKT_MAX_S = 10;

  /** Stejná doba jako výše: hudba se ztlumí na tuto délku. */
  const ROZSUDEK_DUCK_HUDBA_MS = ROZSUDEK_VERDIKT_MAX_S * 1000;

  /** Zesílení gongu/verdiktu oproti `audio.volume = 1` (Web Audio GainNode). */
  const VERDIKT_GAIN = 1.32;

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

  function _spustAmbient() {
    if (_ambient) {
      _ambient.pause();
      _ambient.src = '';
      _ambient = null;
    }
    const a = new Audio(_cesta('campfire'));
    a.loop = true;
    a.volume = VOL_AMBIENT;
    _ambient = a;
    a.play().catch(() => {});
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

  /**
   * Volat spolu s Music.spustPoInterakci() po první interakci uživatele.
   */
  function spustPoInterakci() {
    if (_odemceno) return;
    _odemceno = true;
    _spustAmbient();
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
    if (typeof Music !== 'undefined' && Music.duckBehemVerdiktu) {
      Music.duckBehemVerdiktu(ROZSUDEK_DUCK_HUDBA_MS);
    }
    const url = _cesta('verdikt');
    if (!url) return;
    const a = new Audio(url);
    a.volume = 1;
    const maxMs = ROZSUDEK_VERDIKT_MAX_S * 1000;
    const tid = setTimeout(() => {
      try {
        a.pause();
      } catch (_e) {}
    }, maxMs);
    const vycisti = () => clearTimeout(tid);
    a.addEventListener('ended', vycisti, { once: true });

    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) {
      try {
        if (!_ctxSfxMedia || _ctxSfxMedia.state === 'closed') _ctxSfxMedia = new AC();
        _ctxSfxMedia.resume().catch(() => {});
        const src = _ctxSfxMedia.createMediaElementSource(a);
        const g = _ctxSfxMedia.createGain();
        g.gain.value = VERDIKT_GAIN;
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
        /* bez zesílení */
      }
    }

    a.play()
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
    rozsudekStamp,
    rozsudekVerdikt,
    uplatekWhisper,
    pruzkumMimoZaznam,
    slozkaPaper,
    prechodNaDalsiDen,
    penWriting,
    patraniHeartbeatTick,
    zastavPatraniHeartbeat
  };
})();

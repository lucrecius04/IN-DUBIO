/**
 * ui.js — DOM interakce, modaly, archiv, stavové zprávy.
 * Zobrazuje data, neobsahuje herní logiku.
 */

const UI = (() => {

  // --- Modaly ---

  function _otevriModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('aktivni');
    // Animace panelu
    const panel = el.querySelector('.panel-papir');
    if (panel) {
      panel.classList.remove('panel-papir--nastup');
      void panel.offsetWidth;
      panel.classList.add('panel-papir--nastup');
    }
  }

  function _zavriModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('aktivni');
  }

  function zavriVsechnyModaly() {
    document.querySelectorAll('.overlay.aktivni').forEach(m => m.classList.remove('aktivni'));
  }

  // --- HELPERS ---

  /** Běží po kliknutí na rozsudek — overlay s consequence; zrušení při zavření modalu. */
  let _predohraConsequenceCtx = null;

  /** Modál případu (wireframe): jednou vykreslené rozsudky pro aktuální otevření. */
  let _wfVerdictRenderedForCaseId = null;
  let _wfRozsudekVyber = null;
  let _wfPripadCallback = null;
  let _wfClueAktivniPripad = null;
  let _wfClueAktivniOnRozsudek = null;
  let _wfCluePrvniVolba = null;
  let _wfClueKandidat = null;
  let _wfCluePatrani = {
    active: false,
    endsAt: 0,
    timerId: null,
    durationSec: 0,
    origDurationSec: 0,
    config: null,
    best: null,
    hasRun: false,
    lastHeartbeatAt: 0,
    /** Po odemčení soustředění za Moudrost: −15 s na další běh (kumulativně, max ~ základ). */
    extraDurationCut: 0,
    /** Po odemknutí za inkoust: zobrazit znovu „Zahájit“ i když už jedno pátrání proběhlo. */
    zahajitPovolenoPoInkoustu: false
  };

  function _wfClueTimedCfg(pripad) {
    const cs = pripad && pripad.clue_system && typeof pripad.clue_system === 'object'
      ? pripad.clue_system
      : null;
    const th = cs && cs.timed_hunt && typeof cs.timed_hunt === 'object'
      ? cs.timed_hunt
      : null;
    if (!th || th.enabled !== true) return null;
    const durationSec = Math.max(15, Math.min(180, Number(th.duration_sec) || 60));
    const speedUpgradeSec = Math.max(0, Number(th.speed_upgrade_sec) || 20);
    return {
      durationSec,
      speedUpgradeSec,
      autoConfirmBestOnTimeout: th.auto_confirm_best_on_timeout !== false,
      timeoutDowngrade: th.timeout_downgrade === true
    };
  }

  /** Timed hunt + zkrácení času podle Naděje / Viny (viz designový dodatek). */
  function _wfCluePatraniRuntimeCfg(pripad) {
    const base = _wfClueTimedCfg(pripad);
    if (!base) return null;
    let dur = base.durationSec;
    const stressReasons = [];
    const nd = Number(State.get('traits.Nadeje')) || 0;
    const vn = Number(State.get('traits.Vina')) || 0;
    if (nd <= 25) {
      dur -= 15;
      stressReasons.push({ sec: 15, text: 'Kriticky nízká Naděje' });
    } else if (nd <= 40) {
      dur -= 8;
      stressReasons.push({ sec: 8, text: 'Nízká Naděje' });
    }
    if (vn >= 75) {
      dur -= 12;
      stressReasons.push({ sec: 12, text: 'Vysoká Vina' });
    } else if (vn >= 60) {
      dur -= 6;
      stressReasons.push({ sec: 6, text: 'Vysoká Vina' });
    }
    dur = Math.max(20, Math.min(180, Math.round(dur)));
    const cut = Number(_wfCluePatrani.extraDurationCut) || 0;
    if (cut > 0) {
      dur = Math.max(25, dur - cut);
    }
    return { ...base, durationSec: dur, stressReasons };
  }

  function _wfClueFocusMax(pripad) {
    if (typeof Cases !== 'undefined' && Cases.ziskejClueFocusMax) {
      return Number(Cases.ziskejClueFocusMax(pripad)) || 0;
    }
    return 0;
  }

  function _wfMoznostMaDostatekZdroju(moznost) {
    if (!moznost || typeof moznost !== 'object') return true;
    const finBal = Number(State.get('finance.balance')) || 0;
    const fc = Number(moznost.finance);
    if (Number.isFinite(fc) && fc < 0 && finBal < -fc) return false;
    const req = moznost.requires;
    if (req && typeof req === 'object' && req.trait_max && typeof req.trait_max === 'object') {
      for (const [trait, maxVal] of Object.entries(req.trait_max)) {
        const lim = Number(maxVal);
        const v = Number(State.get('traits.' + trait));
        if (Number.isFinite(lim) && Number.isFinite(v) && v > lim) return false;
      }
    }
    return true;
  }

  function _wfCluePatraniZastavTimer() {
    if (_wfCluePatrani.timerId) clearInterval(_wfCluePatrani.timerId);
    _wfCluePatrani.timerId = null;
  }

  /** Po neúspěšném běhu (čas, zavření spisu) — persist, aby po znovuotevření nebylo znovu „Zahájit“ zdarma. */
  function _wfCluePatraniUlozKonecNeuspech(pripad) {
    if (!pripad || typeof State === 'undefined' || !_wfClueTimedCfg(pripad)) return;
    if (typeof Cases !== 'undefined' && Cases.maPotvrzenouClueVazbu && Cases.maPotvrzenouClueVazbu(pripad)) {
      if (State.vymazCluePatraniSession) State.vymazCluePatraniSession(pripad.id);
      State.uloz();
      return;
    }
    if (State.ulozCluePatraniSession) {
      State.ulozCluePatraniSession(pripad.id, {
        hasRun: true,
        needsPaidRetry: true,
        extraDurationCut: Number(_wfCluePatrani.extraDurationCut) || 0
      });
    }
    State.uloz();
  }

  function _wfCluePatraniNactiZeStavu(pripad) {
    if (!pripad || typeof State === 'undefined' || !State.nactiCluePatraniSession || !_wfClueTimedCfg(pripad)) {
      return;
    }
    const s = State.nactiCluePatraniSession(pripad.id);
    if (!s) return;
    if (s.hasRun) _wfCluePatrani.hasRun = true;
    if (Number.isFinite(Number(s.extraDurationCut)) && Number(s.extraDurationCut) > 0) {
      _wfCluePatrani.extraDurationCut = Number(s.extraDurationCut);
    }
  }

  function _wfCluePatraniReset(keepRun = false) {
    _wfCluePatraniZastavTimer();
    _wfCluePatrani.active = false;
    _wfCluePatrani.endsAt = 0;
    _wfCluePatrani.durationSec = 0;
    _wfCluePatrani.origDurationSec = 0;
    _wfCluePatrani.config = null;
    _wfCluePatrani.lastHeartbeatAt = 0;
    if (!keepRun) {
      _wfCluePatrani.best = null;
      _wfCluePatrani.hasRun = false;
      _wfCluePatrani.extraDurationCut = 0;
      _wfCluePatrani.zahajitPovolenoPoInkoustu = false;
    }
    const mod = document.getElementById('modal-pripad');
    if (mod) {
      mod.classList.remove('case-wf-hunt-stress--mid', 'case-wf-hunt-stress--high');
      mod.style.removeProperty('--case-wf-hunt-vignette');
    }
    if (typeof SFX !== 'undefined' && SFX.zastavPatraniHeartbeat) SFX.zastavPatraniHeartbeat();
    _wfCluePatraniHudUpdate();
  }

  function _wfCluePatraniZbyvaSec() {
    if (!_wfCluePatrani.active) return 0;
    return Math.max(0, Math.ceil((_wfCluePatrani.endsAt - Date.now()) / 1000));
  }

  function _wfCluePatraniSkoreStrength(strength) {
    if (strength === 'strong') return 3;
    if (strength === 'medium') return 2;
    return 1;
  }

  function _wfCluePatraniStrengthDleSkore(score) {
    if (score >= 3) return 'strong';
    if (score >= 2) return 'medium';
    return 'weak';
  }

  function _wfCluePatraniStrengthProPotvrzeni(strength, opts = {}) {
    const cfg = _wfCluePatrani.config;
    if (!cfg) return strength;
    let score = _wfCluePatraniSkoreStrength(strength);
    const timeout = opts.timeout === true;
    const zbyvaSec = Number(opts.zbyvaSec);
    if (!timeout && Number.isFinite(zbyvaSec) && zbyvaSec >= cfg.speedUpgradeSec) {
      score = Math.min(3, score + 1);
    }
    if (timeout && cfg.timeoutDowngrade) {
      score = Math.max(1, score - 1);
    }
    return _wfCluePatraniStrengthDleSkore(score);
  }

  function _wfCluePatraniUlozKandidata(vys) {
    if (!_wfCluePatrani.active || !vys || !vys.ok) return { improved: false, best: _wfCluePatrani.best };
    const strengthScore = _wfCluePatraniSkoreStrength(vys.strength);
    const zbyva = _wfCluePatraniZbyvaSec();
    const score = strengthScore * 100 + zbyva;
    const best = _wfCluePatrani.best;
    if (!best || score > Number(best.score || 0)) {
      _wfCluePatrani.best = {
        pairId: vys.pairId,
        strength: vys.strength,
        label: vys.label,
        aId: vys.aId,
        bId: vys.bId,
        score
      };
      return { improved: true, best: _wfCluePatrani.best };
    }
    return { improved: false, best: _wfCluePatrani.best };
  }

  function _wfClueSoudniTextSily(strength) {
    if (strength === 'strong') return 'průkazná';
    if (strength === 'medium') return 'dobře podložená';
    return 'slabší, zatím nepřesvědčivá';
  }

  function _wfClueSoudniVetaSily(strength) {
    if (strength === 'strong') return 'Průkazná vazba.';
    if (strength === 'medium') return 'Dobře podložená vazba.';
    return 'Slušná vazba, ale zatím nepřesvědčivá.';
  }

  function _wfCluePatraniBestText() {
    if (!_wfCluePatrani.best) return 'Nejlepší nalezená vazba: zatím žádná.';
    return `Nejlepší nalezená vazba: ${_wfClueSoudniTextSily(_wfCluePatrani.best.strength)}.`;
  }

  /** Po skončení časovaného pátrání — bez „nejlepší průběžné“, jen výsledek. */
  function _wfCluePatraniVysledekBestText() {
    if (!_wfCluePatrani.best) return 'Objevená vazba: žádná.';
    return `Objevená vazba: ${_wfClueSoudniTextSily(_wfCluePatrani.best.strength)}.`;
  }

  function _wfZahlaviPlainText(text) {
    let s = String(text == null ? '' : text);
    s = s.replace(/<[^>]+>/g, ' ');
    s = s.replace(/\s+/g, ' ').trim();
    return s;
  }

  /** Jeden řádek pod obviněním — pouze stručná pole z dat; bez celého spisu (lékárník, důkazy…). */
  function _wfZahlaviKratkyPopis(pripad) {
    if (!pripad) return '';
    const raw = pripad.short_lead || pripad.short_description || '';
    let plain = _wfZahlaviPlainText(raw);
    const defName = _wfZahlaviPlainText(pripad.defendant?.name || '');
    if (defName.length >= 2) {
      const low = plain.toLowerCase();
      const dLow = defName.toLowerCase();
      if (low.startsWith(dLow)) {
        plain = plain.slice(defName.length).replace(/^[\s,;.:\u2013\u2014-]+/, '').trim();
      }
    }
    if (!plain) return '';
    const max = 72;
    if (plain.length <= max) return plain;
    return plain.slice(0, max - 1).trimEnd() + '…';
  }

  function _wfAktualizujHeaderAkciPripadu() {
    const el = document.getElementById('case-wf-header-akce');
    if (!el) return;
    const mod = document.getElementById('modal-pripad');
    if (mod && mod.dataset.verdictMode === 'readonly') {
      el.textContent = '';
      return;
    }
    const z = Number(State.get('investigationActionsLeft')) || 0;
    el.textContent = `Akce průzkumu: ${z}`;
  }

  function _wfCluePatraniHudEnsure() {
    const legacy = document.getElementById('case-wf-clue-hud');
    if (legacy && legacy.querySelector('#case-wf-clue-hud-time')) legacy.remove();

    const slot = document.getElementById('case-wf-clue-hud-slot');
    if (!slot) return null;

    const migrateFrom = document.getElementById('case-wf-clue-status-slot');
    let detail = document.getElementById('case-wf-clue-hud-detail');
    if (detail && migrateFrom && detail.parentElement === migrateFrom) {
      slot.insertBefore(detail, slot.firstChild);
    }

    if (!detail) {
      detail = document.createElement('div');
      detail.id = 'case-wf-clue-hud-detail';
      detail.className = 'case-wf-clue-hud case-wf-clue-hud--detail skryto';
      detail.innerHTML =
        `<div class="case-wf-clue-hud-line" id="case-wf-clue-hud-time">Probíhá vyšetřování: 0 s</div>` +
        `<div class="case-wf-clue-hud-line case-wf-clue-hud-line--best" id="case-wf-clue-hud-best">Nejlepší nalezená vazba: zatím žádná.</div>` +
        `<div class="case-wf-clue-hud-line skryto" id="case-wf-clue-hud-focus"></div>` +
        `<div class="case-wf-clue-focus-lock skryto" id="case-wf-clue-focus-lock">` +
        `<div class="case-wf-clue-focus-lock-actions case-wf-clue-focus-lock-actions--dual">` +
        `<button type="button" class="case-wf-clue-hud-btn" id="case-wf-clue-unlock-ink">Obnovit (−1 inkoust)</button>` +
        `<button type="button" class="case-wf-clue-hud-btn" id="case-wf-clue-unlock-wis">−2 Moudrosti</button>` +
        `</div></div>` +
        `<div class="case-wf-clue-hud-actions case-wf-clue-hud-actions--detail">` +
        `<button type="button" class="case-wf-clue-hud-btn skryto" id="case-wf-clue-hud-confirm">Potvrdit vazbu</button>` +
        `</div>`;
      slot.insertBefore(detail, slot.firstChild);
    } else if (detail.parentElement !== slot) {
      slot.insertBefore(detail, slot.firstChild);
    }

    let headerWrap = document.getElementById('case-wf-clue-hud-header-wrap');
    if (!headerWrap) {
      headerWrap = document.createElement('div');
      headerWrap.id = 'case-wf-clue-hud-header-wrap';
      headerWrap.className = 'case-wf-clue-hud-header-wrap';
      headerWrap.innerHTML =
        `<button type="button" class="case-wf-clue-hud-btn case-wf-clue-hud-btn--start" id="case-wf-clue-hud-action">Zahájit pátrání</button>`;
      slot.appendChild(headerWrap);
    } else if (headerWrap.parentElement !== slot) {
      slot.appendChild(headerWrap);
    }
    if (detail && headerWrap && detail.nextElementSibling !== headerWrap) {
      slot.insertBefore(detail, headerWrap);
    }

    const lockAct = detail?.querySelector('.case-wf-clue-focus-lock-actions');
    if (lockAct && !document.getElementById('case-wf-clue-unlock-ink')) {
      const ink = document.createElement('button');
      ink.type = 'button';
      ink.id = 'case-wf-clue-unlock-ink';
      ink.className = 'case-wf-clue-hud-btn';
      ink.textContent = 'Obnovit (−1 inkoust)';
      lockAct.insertBefore(ink, lockAct.firstChild);
    }

    return document.getElementById('case-wf-clue-hud-detail');
  }

  function _wfCluePatraniHudUpdate(pripad = _wfClueAktivniPripad, onRozsudek = _wfClueAktivniOnRozsudek) {
    const detail = _wfCluePatraniHudEnsure();
    const headerWrap = document.getElementById('case-wf-clue-hud-header-wrap');
    const timed = !!_wfClueTimedCfg(pripad);
    const runCfg = timed ? _wfCluePatraniRuntimeCfg(pripad) : null;
    const maxF = _wfClueFocusMax(pripad);
    if (!pripad || (!timed && maxF <= 0)) {
      detail?.classList.add('skryto');
      headerWrap?.classList.add('skryto');
      _wfAktualizujHeaderAkciPripadu();
      return;
    }

    const aktivni = !!_wfCluePatrani.active;
    const timeEl = document.getElementById('case-wf-clue-hud-time');
    const bestEl = document.getElementById('case-wf-clue-hud-best');
    const focusEl = document.getElementById('case-wf-clue-hud-focus');
    const lockWrap = document.getElementById('case-wf-clue-focus-lock');
    const actionBtn = document.getElementById('case-wf-clue-hud-action');
    const confirmBtn = document.getElementById('case-wf-clue-hud-confirm');
    const unlockInk = document.getElementById('case-wf-clue-unlock-ink');
    const unlockWis = document.getElementById('case-wf-clue-unlock-wis');

    const matched = typeof Cases !== 'undefined' && Cases.maPotvrzenouClueVazbu && Cases.maPotvrzenouClueVazbu(pripad);
    const locked = maxF > 0 && typeof State !== 'undefined' && State.jeClueFocusZamceno && State.jeClueFocusZamceno(pripad.id);
    const huntSess = typeof State !== 'undefined' && State.nactiCluePatraniSession
      ? State.nactiCluePatraniSession(pripad.id)
      : null;
    const needPaidHunt = !!(huntSess && huntSess.needsPaidRetry);
    const fz = maxF > 0 && State.ziskejClueFocusZbyva ? State.ziskejClueFocusZbyva(pripad.id) : null;

    if (focusEl) {
      if (timed && aktivni && maxF > 0 && !matched) {
        focusEl.classList.remove('skryto');
        if (locked) {
          focusEl.textContent = 'Soustředění: vyčerpáno (stopy zamčeny).';
        } else if (fz) {
          focusEl.textContent = `Soustředění: zbývá ${fz.remaining} z ${maxF} pokusů na špatné spojení.`;
        } else {
          focusEl.textContent = `Soustředění: ${maxF} pokusů na špatné spojení.`;
        }
      } else {
        focusEl.classList.add('skryto');
        focusEl.textContent = '';
      }
    }
    if (lockWrap) {
      if (matched) {
        lockWrap.classList.add('skryto');
      } else if (maxF > 0 && locked) {
        lockWrap.classList.remove('skryto');
      } else if (timed && needPaidHunt) {
        lockWrap.classList.remove('skryto');
      } else {
        lockWrap.classList.add('skryto');
      }
    }

    const zbyvaAkci = Number(State.get('investigationActionsLeft')) || 0;
    if (unlockInk) {
      unlockInk.disabled = zbyvaAkci < 1;
      unlockInk.title =
        zbyvaAkci < 1
          ? 'Nemáte volnou sdílenou akci průzkumu (kapku inkoustu).'
          : 'Odemkne stopy za jednu akci a ihned spustí nové pátrání; čas se oproti normě zkrátí o 15 s (kumulativně s dalšími obnovami).';
      unlockInk.onclick = () => {
        if (!pripad || !State.odemkniClueHuntDalsiBeh) return;
        const ok = State.odemkniClueHuntDalsiBeh(pripad.id, maxF, 'ink');
        if (!ok) {
          zobrazStavovouZpravu(
            'Nelze zaplatit další běh — nemáte volnou akci průzkumu, nebo není co odemykat.'
          );
          return;
        }
        _wfCluePatrani.extraDurationCut = (Number(_wfCluePatrani.extraDurationCut) || 0) + 15;
        State.uloz();
        _wfClueAplikujUzamceni(pripad);
        _wfCluePatraniSpust(pripad, onRozsudek);
        zobrazStavovouZpravu('Obětovali jste jednu akci průzkumu — stopy jsou odemčeny, pátrání běží znovu (kratší limit).');
        Desk.aktualizujVse();
      };
    }
    if (unlockWis) {
      const moudrost = Number(State.get('traits.Moudrost')) || 0;
      unlockWis.disabled = moudrost < 2;
      unlockWis.title = moudrost < 2 ? 'Potřebujete alespoň 2 body Moudrosti.' : 'Odemkne stopy, −2 Moudrosti, a ihned spustí pátrání se zkráceným časem.';
      unlockWis.onclick = () => {
        if (!pripad || !State.odemkniClueHuntDalsiBeh) return;
        const ok = State.odemkniClueHuntDalsiBeh(pripad.id, maxF, 'moudrost');
        if (!ok) return;
        _wfCluePatrani.extraDurationCut = (Number(_wfCluePatrani.extraDurationCut) || 0) + 15;
        State.uloz();
        _wfClueAplikujUzamceni(pripad);
        _wfCluePatraniSpust(pripad, onRozsudek);
      };
    }

    if (timed && aktivni) {
      if (timeEl) {
        timeEl.classList.remove('skryto');
        timeEl.textContent = `Probíhá vyšetřování: ${_wfCluePatraniZbyvaSec()} s`;
      }
      if (bestEl) {
        bestEl.classList.remove('skryto');
        bestEl.textContent = _wfCluePatraniBestText();
      }
      if (confirmBtn) {
        const muze = !!_wfClueKandidat;
        confirmBtn.classList.remove('skryto');
        confirmBtn.disabled = !muze;
        confirmBtn.title = muze
          ? 'Potvrdit aktuálně nalezenou vazbu.'
          : 'Zatím nebyla nalezena žádná vazba.';
      }
    } else if (timed && _wfCluePatrani.hasRun) {
      if (timeEl) {
        timeEl.classList.remove('skryto');
        timeEl.textContent = 'Pátrání proběhlo.';
      }
      if (bestEl) {
        bestEl.classList.remove('skryto');
        bestEl.textContent = _wfCluePatraniVysledekBestText();
      }
      if (confirmBtn) {
        confirmBtn.classList.add('skryto');
        confirmBtn.disabled = true;
        confirmBtn.title = '';
      }
    } else {
      if (timeEl) timeEl.classList.add('skryto');
      if (bestEl) bestEl.classList.add('skryto');
      if (confirmBtn) {
        confirmBtn.classList.add('skryto');
        confirmBtn.disabled = true;
        confirmBtn.title = '';
      }
      if (actionBtn) {
        if (timed && runCfg) {
          actionBtn.textContent = `Zahájit pátrání (${runCfg.durationSec}s)`;
          actionBtn.title = '';
          actionBtn.disabled = !!(maxF > 0 && locked && !matched);
        }
      }
    }
    if (actionBtn) {
      actionBtn.onclick = () => {
        if (_wfCluePatrani.active) return;
        if (!_wfClueTimedCfg(pripad)) return;
        if (maxF > 0 && State.jeClueFocusZamceno && State.jeClueFocusZamceno(pripad.id)) return;
        _wfCluePatraniSpust(pripad, onRozsudek);
      };
    }
    if (confirmBtn) {
      confirmBtn.onclick = () => {
        const kandidat = _wfCluePatrani.active && _wfCluePatrani.best
          ? { ..._wfCluePatrani.best }
          : (_wfClueKandidat
              ? { ..._wfClueKandidat }
              : (_wfCluePatrani.best ? { ..._wfCluePatrani.best } : null));
        if (!kandidat) {
          zobrazStavovouZpravu('Zatím není co potvrdit — nejprve propojte dvě stopy.');
          return;
        }
        _wfCluePotvrdKandidata(pripad, onRozsudek, kandidat, {
          timeout: false,
          zbyvaSec: _wfCluePatraniZbyvaSec()
        });
      };
    }

    const showHeaderStart = !!(
      timed &&
      runCfg &&
      !aktivni &&
      !locked &&
      !matched &&
      (!_wfCluePatrani.hasRun || _wfCluePatrani.zahajitPovolenoPoInkoustu)
    );
    if (headerWrap) headerWrap.classList.toggle('skryto', !showHeaderStart);

    const showDetail = !!(
      timed &&
      !matched &&
      (aktivni || _wfCluePatrani.hasRun || (maxF > 0 && locked) || needPaidHunt)
    );
    if (detail) detail.classList.toggle('skryto', !showDetail);

    _wfAktualizujHeaderAkciPripadu();
  }

  function _wfCluePatraniAktualizujUi() {
    const timeEl = document.getElementById('case-wf-clue-hunt-time');
    if (timeEl) timeEl.textContent = String(_wfCluePatraniZbyvaSec());
    const bestEl = document.getElementById('case-wf-clue-hunt-best');
    if (bestEl) bestEl.textContent = _wfCluePatraniBestText();
    _wfCluePatraniHudUpdate();
  }

  function _wfRichTextHtml(text) {
    return String(text == null ? '' : text).replace(/\r\n/g, '\n').replace(/\n/g, '<br>');
  }

  function _wfNastavRichText(el, text) {
    if (!el) return;
    el.innerHTML = _wfRichTextHtml(text);
  }

  function _wfClueResetVolby() {
    const m = document.getElementById('modal-pripad');
    if (m) {
      m.querySelectorAll('.clue.clue--selected, .clue.clue--miss, .clue.clue--match').forEach(el => {
        el.classList.remove('clue--selected', 'clue--miss', 'clue--match');
      });
    }
    _wfCluePrvniVolba = null;
  }

  function _wfClueResetKandidata() {
    const m = document.getElementById('modal-pripad');
    if (m) {
      m.querySelectorAll('.clue--candidate-weak, .clue--candidate-medium, .clue--candidate-strong').forEach(el => {
        el.classList.remove('clue--candidate-weak', 'clue--candidate-medium', 'clue--candidate-strong');
      });
    }
    document.getElementById('case-wf-clue-confirm-wrap')?.remove();
    _wfClueKandidat = null;
  }

  function _wfClueNajdiPrvniElDleId(clueId) {
    const modal = document.getElementById('modal-pripad');
    if (!modal) return null;
    const id = String(clueId || '').trim();
    if (!id) return null;
    return modal.querySelector(`.clue[data-clue-id="${id}"]`);
  }

  function _wfClueAplikujKandidatVizual() {
    if (!_wfClueKandidat) return;
    const cls = _wfClueKandidat.strength === 'strong'
      ? 'clue--candidate-strong'
      : _wfClueKandidat.strength === 'medium'
        ? 'clue--candidate-medium'
        : 'clue--candidate-weak';
    const aEl = _wfClueNajdiPrvniElDleId(_wfClueKandidat.aId);
    const bEl = _wfClueNajdiPrvniElDleId(_wfClueKandidat.bId);
    if (aEl) aEl.classList.add(cls);
    if (bEl) bEl.classList.add(cls);
  }

  function _wfClueTextSily(strength) {
    return _wfClueSoudniTextSily(strength);
  }

  function _wfCluePatraniSpust(pripad, onRozsudek) {
    const cfg = _wfCluePatraniRuntimeCfg(pripad);
    if (!cfg) return;
    _wfCluePatrani.zahajitPovolenoPoInkoustu = false;
    _wfCluePatraniZastavTimer();
    _wfCluePatrani.active = true;
    _wfCluePatrani.hasRun = true;
    _wfCluePatrani.durationSec = cfg.durationSec;
    _wfCluePatrani.origDurationSec = cfg.durationSec;
    _wfCluePatrani.config = cfg;
    _wfCluePatrani.best = null;
    _wfCluePatrani.lastHeartbeatAt = 0;
    _wfCluePatrani.endsAt = Date.now() + (cfg.durationSec * 1000);
    _wfClueResetVolby();
    _wfClueResetKandidata();
    _wfClueAplikujUzamceni(pripad);
    _wfClueVykresliPotvrzeni(pripad, onRozsudek);
    _wfCluePatraniAktualizujUi();
    _wfCluePatraniHudUpdate(pripad, onRozsudek);
    const baseSec = (() => {
      const b = _wfClueTimedCfg(pripad);
      return b ? b.durationSec : cfg.durationSec;
    })();
    zobrazStavovouZpravu(`Pátrání spuštěno: základ ${baseSec} s → váš čas ${cfg.durationSec} s.`);
    if (Array.isArray(cfg.stressReasons) && cfg.stressReasons.length) {
      cfg.stressReasons.forEach((r, i) => {
        if (!r || !r.text) return;
        setTimeout(() => zobrazStavovouZpravu(`−${r.sec}s (${r.text})`), 140 + i * 400);
      });
    }
    _wfCluePatrani.timerId = setInterval(() => {
      const zbyva = _wfCluePatraniZbyvaSec();
      const total = Number(_wfCluePatrani.origDurationSec) || cfg.durationSec || 1;
      /** Mlžení / vigneta / tep až v posledních 15 s (u kratšího limitu celý zbytek času). */
      const cutoff = Math.min(15, Math.max(1, total));
      const mod = document.getElementById('modal-pripad');
      if (mod) {
        if (zbyva > cutoff) {
          mod.classList.remove('case-wf-hunt-stress--mid', 'case-wf-hunt-stress--high');
          mod.style.setProperty('--case-wf-hunt-vignette', '0');
        } else {
          const r = cutoff > 0 ? zbyva / cutoff : 0;
          mod.classList.toggle('case-wf-hunt-stress--mid', r < 0.55 && r > 0.2);
          mod.classList.toggle('case-wf-hunt-stress--high', r <= 0.2 && zbyva > 0);
          const vig = 1 - r;
          mod.style.setProperty('--case-wf-hunt-vignette', String(Math.max(0, Math.min(1, vig * 0.9))));
        }
      }
      if (typeof SFX !== 'undefined' && SFX.patraniHeartbeatTick) {
        const urgency =
          zbyva > cutoff ? 0 : Math.max(0, Math.min(1, 1 - zbyva / cutoff));
        SFX.patraniHeartbeatTick(urgency);
      }
      _wfCluePatraniAktualizujUi();
      if (zbyva > 0) return;
      if (
        _wfCluePatraniAutoPotvrdNejlepsi(pripad, onRozsudek, { timeout: true, zbyvaSec: 0 })
      ) {
        return;
      }
      _wfCluePatraniReset(true);
      _wfCluePatraniUlozKonecNeuspech(pripad);
      _wfClueResetVolby();
      _wfClueResetKandidata();
      _wfClueAplikujUzamceni(pripad);
      _wfClueVykresliPotvrzeni(pripad, onRozsudek);
      zobrazStavovouZpravu('Pátrání skončilo. Nenašli jste potvrzenou osu stop.');
    }, 250);
  }

  function _wfCluePotvrdKandidata(pripad, onRozsudek, kandidat, opts = {}) {
    if (!pripad || !kandidat || typeof Cases === 'undefined' || !Cases.potvrdTwoClickRozpor) return false;
    const final = { ...kandidat };
    if (_wfCluePatrani.active || opts.timeout === true) {
      final.strength = _wfCluePatraniStrengthProPotvrzeni(final.strength, {
        timeout: opts.timeout === true,
        zbyvaSec: Number(opts.zbyvaSec)
      });
    }
    const res = Cases.potvrdTwoClickRozpor(pripad, final);
    if (!res || !res.ok) return false;
    if (pripad && typeof State !== 'undefined' && State.vymazCluePatraniSession) {
      State.vymazCluePatraniSession(pripad.id);
    }
    _wfCluePatraniReset(true);
    _wfClueResetVolby();
    _wfClueResetKandidata();
    _wfClueAplikujUzamceni(pripad);
    _wfAktualizujRozporBox(pripad);
    _aktualizujPruzkumPanel(pripad, onRozsudek);
    _wfClueAplikujUzamceni(pripad);
    _wfPoPrvniAkciPruzkumu(pripad, onRozsudek);
    Desk.aktualizujVse();
    State.uloz();
    const extra = opts.timeout === true
      ? ' Čas vypršel, potvrzena byla nejlepší nalezená vazba.'
      : '';
    const veta = _wfClueSoudniVetaSily(res.strength);
    zobrazStavovouZpravu(`Potvrzena osa stop. ${veta}${extra} Další kombinace už bonus nepřinesou.`);
    return true;
  }

  /**
   * Po skončení běhu časovaného pátrání: nejvyšší nalezenou vazbu hned zapsat do stavu
   * (Výsledek pátrání se pak čte z potvrzení ve spisu — bez dalšího tlačítka).
   */
  function _wfCluePatraniAutoPotvrdNejlepsi(pripad, onRozsudek, opts) {
    if (!pripad) return false;
    if (typeof Cases !== 'undefined' && Cases.maPotvrzenouClueVazbu && Cases.maPotvrzenouClueVazbu(pripad)) {
      return true;
    }
    const b = _wfCluePatrani.best;
    if (!b || !String(b.aId || '').trim() || !String(b.bId || '').trim()) return false;
    return _wfCluePotvrdKandidata(pripad, onRozsudek, { ...b }, opts);
  }

  function _wfClueVykresliPotvrzeni(pripad, onRozsudek) {
    const host = document.getElementById('case-wf-findings');
    if (!host || !pripad) return;
    const old = document.getElementById('case-wf-clue-confirm-wrap');
    if (old) old.remove();
    const timedCfg = _wfClueTimedCfg(pripad);
    const confirmed = (typeof Cases !== 'undefined' && Cases.ziskejPotvrzenouClueVazbu)
      ? Cases.ziskejPotvrzenouClueVazbu(pripad)
      : null;
    const infoPct = (typeof Cases !== 'undefined' && Cases.vypoctiInformovanostPripadu)
      ? Number((Cases.vypoctiInformovanostPripadu(pripad) || {}).pct)
      : NaN;
    const maPlnouInformovanost = Number.isFinite(infoPct) && infoPct >= 100;
    const _textProClueId = (cid) => {
      const id = String(cid || '').trim();
      if (!id) return '—';
      const el = _wfClueNajdiPrvniElDleId(id);
      if (!el) return id;
      const t = String(el.textContent || '').replace(/\s+/g, ' ').trim();
      return t || id;
    };
    if (confirmed) {
      const box = document.createElement('div');
      box.id = 'case-wf-clue-confirm-wrap';
      box.className = 'case-wf-clue-confirm-wrap';
      const title = timedCfg ? 'Výsledek pátrání' : 'Potvrzená osa stop';
      box.innerHTML =
        `<div class="case-wf-clue-confirm-title">${title}</div>` +
        `<div class="case-wf-clue-confirm-sub">Vazba: ${_wfClueSoudniTextSily(confirmed.strength)}. Další kombinace už v tomto spisu nepřinesou nový bonus.</div>`;
      const row = document.createElement('div');
      row.className = 'case-wf-clue-confirm-pair';
      const a = document.createElement('div');
      a.className = 'case-wf-clue-confirm-item';
      a.textContent = _textProClueId(confirmed.aId);
      const b = document.createElement('div');
      b.className = 'case-wf-clue-confirm-item';
      b.textContent = _textProClueId(confirmed.bId);
      row.appendChild(a);
      row.appendChild(b);
      box.appendChild(row);
      host.appendChild(box);
      // Po potvrzené vazbě (vč. auto z timeoutu) sjednotit se záhlavím: skrýt Obnovit, nelze se vrátit k pátrání
      _wfCluePatraniHudUpdate(pripad, onRozsudek);
      return;
    }
    _wfCluePatraniHudUpdate(pripad, onRozsudek);
    if (timedCfg) {
      const result = document.createElement('div');
      result.id = 'case-wf-clue-confirm-wrap';
      result.className = 'case-wf-clue-confirm-wrap';
      result.innerHTML = `<div class="case-wf-clue-confirm-title">Výsledek pátrání</div>`;
      const sub = document.createElement('div');
      sub.className = 'case-wf-clue-confirm-sub';
      if (!confirmed && _wfCluePatrani.active && !_wfClueKandidat) {
        sub.textContent = 'Pátrání běží. Označte ve spise dvě stopy pro průběžné vyhodnocení.';
        result.appendChild(sub);
        host.appendChild(result);
        return;
      }
      if (!confirmed && _wfCluePatrani.active && _wfClueKandidat) {
        sub.textContent = `Aktuální kandidát: ${_wfClueSoudniTextSily(_wfClueKandidat.strength)} vazba.`;
        result.appendChild(sub);
        host.appendChild(result);
        return;
      }
      if (!confirmed && !_wfCluePatrani.active && !_wfCluePatrani.hasRun) {
        sub.textContent = 'Pátrání zatím neproběhlo.';
        result.appendChild(sub);
        host.appendChild(result);
        return;
      }
      if (!confirmed && !_wfCluePatrani.active && _wfCluePatrani.hasRun) {
        // Běh už skončil: buď je výsledek ve stavu (výše se vykreslí v confirmed), nebo nic
        return;
      }
    }
    if (maPlnouInformovanost && !_wfClueKandidat && !(timedCfg && _wfCluePatrani.active)) {
      const infoBox = document.createElement('div');
      infoBox.id = 'case-wf-clue-confirm-wrap';
      infoBox.className = 'case-wf-clue-confirm-wrap';
      infoBox.innerHTML =
        `<div class="case-wf-clue-confirm-title">Informovanost je plná</div>` +
        `<div class="case-wf-clue-confirm-sub">Stopy zůstávají aktivní. Můžete ještě potvrdit osu stop, nebo případ rovnou uzavřít rozsudkem.</div>`;
      host.appendChild(infoBox);
      return;
    }
    if (!_wfClueKandidat && !(_wfCluePatrani.active && timedCfg)) return;
    const wrap = document.createElement('div');
    wrap.id = 'case-wf-clue-confirm-wrap';
    wrap.className = 'case-wf-clue-confirm-wrap';
    if (_wfCluePatrani.active && timedCfg) {
      const meta = document.createElement('div');
      meta.className = 'case-wf-clue-hunt-meta';
      meta.innerHTML =
        `Čas: <strong id="case-wf-clue-hunt-time">${_wfCluePatraniZbyvaSec()}</strong>s`;
      const best = document.createElement('div');
      best.id = 'case-wf-clue-hunt-best';
      best.className = 'case-wf-clue-hunt-best';
      best.textContent = _wfCluePatraniBestText();
      wrap.appendChild(meta);
      wrap.appendChild(best);
    }
    if (!_wfClueKandidat) {
      const idleSub = document.createElement('div');
      idleSub.className = 'case-wf-clue-confirm-sub';
      idleSub.textContent = 'Klikněte na dvě stopy ve spise a vytvořte osu.';
      wrap.appendChild(idleSub);
      host.appendChild(wrap);
      return;
    }
    const title = document.createElement('div');
    title.className = 'case-wf-clue-confirm-title';
    title.textContent = `Vybraná dvojice stop (${_wfClueTextSily(_wfClueKandidat.strength)} vazba)`;
    const sub = document.createElement('div');
    sub.className = 'case-wf-clue-confirm-sub';
    sub.textContent = 'Můžete hledat jinou kombinaci, nebo potvrdit tuto osu.';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'case-wf-clue-confirm-btn';
    btn.textContent = 'Potvrdit osu stop';
    const kandidat = { ..._wfClueKandidat };
    btn.addEventListener('click', () => {
      _wfCluePotvrdKandidata(pripad, onRozsudek, kandidat, {
        timeout: false,
        zbyvaSec: _wfCluePatraniZbyvaSec()
      });
    });
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'case-wf-clue-confirm-btn';
    cancelBtn.textContent = 'Zrušit výběr';
    cancelBtn.addEventListener('click', () => {
      _wfClueResetVolby();
      _wfClueResetKandidata();
      _wfClueAplikujUzamceni(pripad);
      _wfClueVykresliPotvrzeni(pripad, onRozsudek);
      zobrazStavovouZpravu('Výběr dvojice stop byl zrušen.');
    });
    wrap.appendChild(title);
    wrap.appendChild(sub);
    wrap.appendChild(btn);
    wrap.appendChild(cancelBtn);
    host.appendChild(wrap);
    wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function _wfClueTruePairIds(pripad) {
    const cs = pripad && pripad.clue_system && typeof pripad.clue_system === 'object'
      ? pripad.clue_system
      : null;
    if (!cs) return [];
    const truePair = String(cs.true_pair_id || '').trim();
    if (!truePair || !Array.isArray(cs.pairs)) return [];
    const p = cs.pairs.find(x => x && String(x.pair_id || '').trim() === truePair);
    if (!p) return [];
    const a = String(p.a_id || '').trim();
    const b = String(p.b_id || '').trim();
    return [a, b].filter(Boolean);
  }

  function _wfClueAplikujUzamceni(pripad) {
    const modal = document.getElementById('modal-pripad');
    if (!modal || !pripad) return;
    const clues = Array.from(modal.querySelectorAll('.clue[data-clue-id]'));
    if (!clues.length) return;
    const matched = typeof Cases !== 'undefined' && Cases.maPotvrzenouClueVazbu
      ? Cases.maPotvrzenouClueVazbu(pripad)
      : false;
    const confirmed = (typeof Cases !== 'undefined' && Cases.ziskejPotvrzenouClueVazbu)
      ? Cases.ziskejPotvrzenouClueVazbu(pripad)
      : null;
    const matchCls = confirmed
      ? (confirmed.strength === 'strong'
          ? 'clue--match-persist-strong'
          : confirmed.strength === 'medium'
            ? 'clue--match-persist-medium'
            : 'clue--match-persist-weak')
      : null;
    const pairIds = new Set(confirmed ? [confirmed.aId, confirmed.bId] : []);
    const timedCfg = _wfClueTimedCfg(pripad);
    const maxF = _wfClueFocusMax(pripad);
    const focusLocked = maxF > 0 && typeof State !== 'undefined' && State.jeClueFocusZamceno
      ? State.jeClueFocusZamceno(pripad.id)
      : false;
    modal.classList.toggle('case-wf-clue-timed', !!timedCfg);
    modal.classList.toggle('case-wf-clue-hunt-active', !!timedCfg && !!_wfCluePatrani.active && !focusLocked);
    for (const el of clues) {
      el.classList.remove(
        'clue--match-persist',
        'clue--match-persist-weak',
        'clue--match-persist-medium',
        'clue--match-persist-strong',
        'clue--locked',
        'clue--hunt-active',
        'clue--focus-locked'
      );
    }
    if (matched) {
      for (const el of clues) {
        const id = String(el.dataset.clueId || '').trim();
        el.classList.add('clue--locked');
        if (pairIds.has(id)) {
          el.classList.add('clue--match-persist');
          if (matchCls) el.classList.add(matchCls);
        }
      }
    } else if (focusLocked) {
      clues.forEach(el => el.classList.add('clue--focus-locked'));
    } else if (timedCfg && _wfCluePatrani.active) {
      clues.forEach(el => el.classList.add('clue--hunt-active'));
    }
    // Při časovaném pátrání: barevné zvýraznění kandidáta jen během běhu, ne po skončení (vč. spotřebovaného soustředění)
    if (!matched && !focusLocked && (!timedCfg || _wfCluePatrani.active)) {
      _wfClueAplikujKandidatVizual();
    }
  }

  function _wfJeVysokaMoudrostProRozpor(pripad) {
    const c0 = pripad && pripad.contradictions && pripad.contradictions[0];
    const lim = Number(c0 && c0.highlight_at_wisdom);
    const threshold = Number.isFinite(lim) && lim > 0 ? lim : 81;
    const m = Number(State.get('traits.Moudrost')) || 0;
    return m >= threshold;
  }

  function _wfAktualizujRozporBox(pripad) {
    const conEl = document.getElementById('case-wf-contradiction');
    const c0 = pripad && pripad.contradictions && pripad.contradictions[0];
    if (!conEl || !c0 || !c0.description) return;
    const matched = typeof Cases !== 'undefined' && Cases.maPotvrzenouClueVazbu
      ? Cases.maPotvrzenouClueVazbu(pripad)
      : false;
    const show = matched || _wfJeVysokaMoudrostProRozpor(pripad);
    conEl.textContent = c0.description;
    conEl.classList.toggle('skryto', !show);
  }

  function _wfClueZpracujKlik(clueEl) {
    if (!clueEl) return;
    const pripad = _wfClueAktivniPripad;
    if (!pripad || typeof Cases === 'undefined' || !Cases.vyhodnotTwoClickRozpor) return;
    const clueId = String(clueEl.dataset.clueId || '').trim();
    if (!clueId) return;
    if (typeof Cases !== 'undefined' && Cases.maPotvrzenouClueVazbu && Cases.maPotvrzenouClueVazbu(pripad)) return;
    const maxF0 = _wfClueFocusMax(pripad);
    if (maxF0 > 0 && typeof State !== 'undefined' && State.jeClueFocusZamceno && State.jeClueFocusZamceno(pripad.id)) {
      zobrazStavovouZpravu('Stopy jsou zamčeny — odemkněte je v panelu soustředění výše.');
      return;
    }
    const timedCfg = _wfClueTimedCfg(pripad);
    if (timedCfg && !_wfCluePatrani.active) {
      zobrazStavovouZpravu('Nejdřív spusťte pátrání. Pak můžete označovat stopy.');
      return;
    }

    if (_wfClueKandidat) {
      _wfClueResetKandidata();
      _wfClueResetVolby();
    }

    if (!_wfCluePrvniVolba) {
      _wfCluePrvniVolba = { id: clueId, el: clueEl };
      clueEl.classList.add('clue--selected');
      return;
    }

    const prvni = _wfCluePrvniVolba;
    if (prvni.el === clueEl || prvni.id === clueId) {
      _wfClueResetVolby();
      return;
    }

    const vys = Cases.vyhodnotTwoClickRozpor(pripad, prvni.id, clueId);
    if (!vys || !vys.ok) {
      prvni.el.classList.add('clue--miss');
      clueEl.classList.add('clue--miss');
      if (typeof SFX !== 'undefined' && SFX.slozkaPaper) SFX.slozkaPaper();
      const maxF2 = _wfClueFocusMax(pripad);
      if (maxF2 > 0 && typeof State !== 'undefined' && State.spotrebujClueFocusTvrdyPokus) {
        const st = State.spotrebujClueFocusTvrdyPokus(pripad.id, maxF2);
        State.uloz();
        if (st.locked && _wfCluePatrani.active) {
          _wfCluePatraniZastavTimer();
          _wfCluePatraniReset(true);
          _wfClueResetKandidata();
        }
        if (st.locked) {
          if (
            _wfCluePatraniAutoPotvrdNejlepsi(pripad, _wfClueAktivniOnRozsudek, { timeout: false, zbyvaSec: 0 })
          ) {
            setTimeout(() => _wfClueResetVolby(), 260);
            return;
          }
        }
        _wfCluePatraniHudUpdate(pripad, _wfClueAktivniOnRozsudek);
        _wfClueAplikujUzamceni(pripad);
        _wfClueVykresliPotvrzeni(pripad, _wfClueAktivniOnRozsudek);
        zobrazStavovouZpravu(
          st.locked
            ? 'Tohle nesedí — soustředění vyčerpáno, stopy se uzamkly.'
            : `Tohle nesedí — zbývá ${st.remaining} pokusů na špatné spojení.`
        );
      } else {
        zobrazStavovouZpravu('Tohle nesedí — zkuste jinou dvojici stop.');
      }
      setTimeout(() => _wfClueResetVolby(), 260);
      return;
    }

    if (vys.softFail === true) {
      prvni.el.classList.remove('clue--selected');
      clueEl.classList.remove('clue--selected');
      zobrazStavovouZpravu(vys.softMessage || 'Tyto informace spolu souvisí, ale neprokazují lživou výpověď.');
      setTimeout(() => _wfClueResetVolby(), 120);
      return;
    }

    prvni.el.classList.remove('clue--selected');
    clueEl.classList.remove('clue--selected');
    if (typeof SFX !== 'undefined' && SFX.penWriting) SFX.penWriting();
    _wfClueKandidat = {
      pairId: vys.pairId,
      strength: vys.strength,
      label: vys.label,
      aId: vys.aId,
      bId: vys.bId
    };
    const huntRes = _wfCluePatraniUlozKandidata(vys);
    _wfClueResetVolby();
    _wfClueAplikujUzamceni(pripad);
    _wfClueVykresliPotvrzeni(pripad, _wfClueAktivniOnRozsudek);
    const zbyvaTxt = _wfCluePatrani.active ? ` Zbývá ${_wfCluePatraniZbyvaSec()} s.` : '';
    const curText = _wfClueSoudniTextSily(vys.strength);
    if (_wfCluePatrani.active) {
      if (huntRes && huntRes.improved) {
        zobrazStavovouZpravu(`Nalezena ${curText} vazba — nové maximum.${zbyvaTxt}`);
      } else {
        const bestS = huntRes && huntRes.best ? _wfClueSoudniTextSily(huntRes.best.strength) : curText;
        zobrazStavovouZpravu(`Nalezena ${curText} vazba. Nejlepší zatím zůstává ${bestS}.${zbyvaTxt}`);
      }
      return;
    }
    zobrazStavovouZpravu(`Vybraná dvojice: ${curText}. Můžete potvrdit, nebo hledat dál.${zbyvaTxt}`);
  }

  /** Krok 2 verdiktu: vlastní grafika místo kurzoru (viz #case-wf-verdict-cursor, src/verdict-stamp.png). */
  let _wfVerdictStampMoveBound = false;

  function _wfVerdictStampTeardown() {
    if (_wfVerdictStampMoveBound) {
      window.removeEventListener('pointermove', _wfVerdictStampPointerMove, true);
      _wfVerdictStampMoveBound = false;
    }
    const cur = document.getElementById('case-wf-verdict-cursor');
    if (cur) cur.classList.add('skryto');
    const mod = document.getElementById('modal-pripad');
    if (mod) mod.style.cursor = '';
  }

  function _wfVerdictStampHideGraphics() {
    const cur = document.getElementById('case-wf-verdict-cursor');
    const mod = document.getElementById('modal-pripad');
    if (cur) cur.classList.add('skryto');
    if (mod) mod.style.cursor = '';
  }

  function _wfVerdictStampPointerMove(e) {
    const modal = document.getElementById('modal-pripad');
    const step2w = document.getElementById('case-wf-step2-wrap');
    const cur = document.getElementById('case-wf-verdict-cursor');
    if (!modal || !modal.classList.contains('aktivni') || !step2w || !cur) return;
    if (step2w.classList.contains('skryto')) {
      _wfVerdictStampHideGraphics();
      return;
    }
    const x = e.clientX;
    const y = e.clientY;
    const conf = document.getElementById('case-wf-confirm-rozsudek');
    let overConfirm = false;
    if (conf && !conf.classList.contains('skryto') && !conf.disabled) {
      const r2 = conf.getBoundingClientRect();
      overConfirm = x >= r2.left && x <= r2.right && y >= r2.top && y <= r2.bottom;
    }
    if (!overConfirm) {
      _wfVerdictStampHideGraphics();
      return;
    }
    const w = cur.offsetWidth || 140;
    const h = cur.offsetHeight || 180;
    const px1cm = Math.round(96 / 2.54);
    cur.classList.remove('skryto');
    cur.style.left = `${Math.round(x - w * 0.5 + px1cm)}px`;
    cur.style.top = `${Math.round(y - h * 0.41)}px`;
  }

  function _wfVerdictStampBindMove() {
    if (_wfVerdictStampMoveBound) return;
    _wfVerdictStampMoveBound = true;
    window.addEventListener('pointermove', _wfVerdictStampPointerMove, { capture: true, passive: true });
  }

  function _wfVerdictStampShake(heavy) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const panel = document.querySelector('#modal-pripad .pripad-panel--wireframe');
    if (!panel) return;
    panel.classList.remove('case-wf-panel--shake', 'case-wf-panel--shake-light');
    void panel.offsetWidth;
    panel.classList.add(heavy ? 'case-wf-panel--shake' : 'case-wf-panel--shake-light');
    window.setTimeout(() => {
      panel.classList.remove('case-wf-panel--shake', 'case-wf-panel--shake-light');
    }, heavy ? 280 : 200);
  }

  function _zrusPredohruConsequencePosluchace(ctx) {
    if (!ctx) return;
    if (ctx.timerId) clearTimeout(ctx.timerId);
    if (ctx.prelude && ctx.onClickPrelude) {
      ctx.prelude.removeEventListener('click', ctx.onClickPrelude);
    }
    if (ctx.preludeBtn && ctx.onPreludeBtn) {
      ctx.preludeBtn.removeEventListener('click', ctx.onPreludeBtn);
    }
    if (ctx.aftermath && ctx.onAftermathClick) {
      ctx.aftermath.removeEventListener('click', ctx.onAftermathClick);
    }
  }

  function _anulujPredohruConsequence() {
    const ctx = _predohraConsequenceCtx;
    if (!ctx) return;
    _predohraConsequenceCtx = null;
    _zrusPredohruConsequencePosluchace(ctx);
    const el = document.getElementById('pripad-consequence-prelude');
    if (el) {
      el.querySelector('.pripad-consequence-prelude-inner')
        ?.classList.remove('pripad-consequence-prelude-inner--aftermath');
      el.classList.add('skryto');
      el.setAttribute('aria-hidden', 'true');
    }
    const af = document.getElementById('case-wf-aftermath');
    const nar = document.getElementById('case-wf-aftermath-narr');
    if (af) af.classList.remove('case-wf-aftermath--visible');
    if (nar) nar.textContent = '';
  }

  function _zavriPripadModal() {
    const pZav = _wfClueAktivniPripad;
    const onZav = _wfClueAktivniOnRozsudek;
    if (pZav && _wfCluePatrani.active && _wfClueTimedCfg(pZav)) {
      const zbyvaZav = _wfCluePatraniZbyvaSec();
      const bestZav = _wfCluePatrani.best ? { ..._wfCluePatrani.best } : null;
      if (bestZav) {
        const potvrzeno = _wfCluePotvrdKandidata(pZav, onZav, bestZav, {
          timeout: false,
          zbyvaSec: zbyvaZav
        });
        if (!potvrzeno) {
          _wfCluePatraniZastavTimer();
          _wfCluePatraniReset(true);
          _wfCluePatraniUlozKonecNeuspech(pZav);
          _wfClueResetVolby();
          _wfClueResetKandidata();
          _wfClueAplikujUzamceni(pZav);
        }
      } else {
        _wfCluePatraniZastavTimer();
        _wfCluePatraniReset(true);
        _wfCluePatraniUlozKonecNeuspech(pZav);
        _wfClueResetVolby();
        _wfClueResetKandidata();
        _wfClueAplikujUzamceni(pZav);
        zobrazStavovouZpravu('Pátrání ukončeno zavřením spisu. Nenašli jste v čase potvrzenou osu stop.');
      }
    } else {
      _wfCluePatraniReset();
    }
    _wfClueResetVolby();
    _wfClueResetKandidata();
    document.getElementById('case-wf-clue-confirm-wrap')?.remove();
    _wfClueAktivniPripad = null;
    _wfClueAktivniOnRozsudek = null;
    const ctxZ = _predohraConsequenceCtx;
    if (ctxZ && ctxZ.stage === 'aftermath' && ctxZ.pripad && ctxZ.rozsudek) {
      _dokoncitRozsudekPoAftermath(ctxZ.pripad, ctxZ.rozsudek);
      return;
    }
    _wfResetVerdictUi();
    const modP = document.getElementById('modal-pripad');
    if (modP) {
      delete modP.dataset.verdictMode;
      modP.querySelector('.pripad-panel--wireframe')?.classList.remove('pripad-panel--pripad-readonly');
    }
    _anulujPredohruConsequence();
    _zavriModal('modal-pripad');
    Desk.nastavAktivniSpis(null);
  }

  function _formatujDatumSpisu(den) {
    const d = Number(den);
    if (!Number.isFinite(d) || d < 1) return '—';
    const zacatek = new Date(1931, 2, 2);
    const datum = new Date(zacatek);
    datum.setDate(datum.getDate() + d - 1);
    const mesice = [
      'ledna', 'února', 'března', 'dubna', 'května', 'června',
      'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'
    ];
    return `${datum.getDate()}. ${mesice[datum.getMonth()]} ${datum.getFullYear()}`;
  }

  function _dveVetyShrnutiRozsudku(pripad) {
    const sit = pripad && pripad.situation ? String(pripad.situation) : '';
    const blob0 = sit.replace(/\r\n/g, '\n').split(/\n\n+/).map(s => s.trim()).filter(Boolean)[0] || '';
    const blob = blob0.replace(/\n+/g, ' ').trim();
    const charge = (pripad && pripad.charge) ? String(pripad.charge).trim() : '';
    if (!blob) {
      return [charge || '—', charge ? '' : ''];
    }
    const cut = blob.search(/[.!?]\s+/);
    if (cut >= 0) {
      const v1 = blob.slice(0, cut + 1).trim();
      let v2 = blob.slice(cut + 1).trim();
      const cut2 = v2.search(/[.!?]\s+/);
      if (cut2 >= 0) v2 = v2.slice(0, cut2 + 1).trim();
      if (!v2) v2 = charge ? `Obžaloba: ${charge}` : v1;
      return [v1, v2];
    }
    return [blob, charge ? `Obžaloba: ${charge}` : blob];
  }

  function _vyplnShrnutiRozsudku(pripad) {
    const wrap = document.getElementById('rozsudky-shrnuti');
    if (!wrap) return;
    wrap.classList.remove('skryto');
    wrap.innerHTML = '';
    const [a, b] = _dveVetyShrnutiRozsudku(pripad);
    const p1 = document.createElement('p');
    p1.className = 'rozsudky-shrnuti-radek';
    p1.textContent = a || '—';
    wrap.appendChild(p1);
    if (b) {
      const p2 = document.createElement('p');
      p2.className = 'rozsudky-shrnuti-radek';
      p2.textContent = b;
      wrap.appendChild(p2);
    }
  }

  function _skryjShrnutiRozsudku() {
    const wrap = document.getElementById('rozsudky-shrnuti');
    if (!wrap) return;
    wrap.innerHTML = '';
    wrap.classList.add('skryto');
  }

  /**
   * Během předehry / aftermath zůstává krok 1/2 v DOM pod overlay — po zavření tmavé vrstvy
   * by byl znovu vidět a klikatelný. Schováme ho a zablokujeme volby.
   */
  function _wfZamkniInteraktivniVerdiktProPredohruDopad() {
    const modal = document.getElementById('modal-pripad');
    if (modal) modal.classList.add('case-wf-in-consequence-flow');
    document.getElementById('case-wf-step1-wrap')?.classList.add('skryto');
    document.getElementById('case-wf-step2-wrap')?.classList.add('skryto');
    document.getElementById('case-wf-verdict-legacy')?.classList.add('skryto');
    const c = document.getElementById('case-wf-confirm-rozsudek');
    if (c) {
      c.classList.add('skryto');
      c.disabled = true;
      c.onclick = null;
    }
    document.querySelectorAll('#modal-pripad .case-wf-verdict-opt').forEach(btn => {
      btn.disabled = true;
    });
  }

  function _textAftermath(pripad, rozsudek) {
    const af = (pripad && pripad.aftermath && typeof pripad.aftermath === 'object') ? pripad.aftermath : null;
    const id = String((rozsudek && rozsudek.id) || '');
    if (af) {
      if (af[id]) return String(af[id]);
      if (id.startsWith('not_guilty_') && af.not_guilty) return String(af.not_guilty);
      if (id.startsWith('guilty_') && af.guilty) return String(af.guilty);
      if (id.startsWith('insufficient_') && af.insufficient) return String(af.insufficient);
    }
    return String((rozsudek && rozsudek.consequence) || (rozsudek && rozsudek.text) || '—');
  }

  function _dokoncitRozsudekPoAftermath(pripad, rozsudek) {
    if (!_predohraConsequenceCtx) return;
    const ctx = _predohraConsequenceCtx;
    _predohraConsequenceCtx = null;
    _zrusPredohruConsequencePosluchace(ctx);
    const prelude = document.getElementById('pripad-consequence-prelude');
    if (prelude) {
      prelude.classList.add('skryto');
      prelude.setAttribute('aria-hidden', 'true');
    }
    const af = document.getElementById('case-wf-aftermath');
    if (af) af.classList.remove('case-wf-aftermath--visible');

    if (typeof Desk !== 'undefined' && Desk.animujRazitko && typeof Cases !== 'undefined') {
      Desk.animujRazitko(Cases.typRazitkaProVerdikt(rozsudek.id));
    }
    // Nejdřív zpracuj rozsudek (stav + případné UI.zobrazPripadReadonly při otevřeném modálu),
    // pak vždy zavři modál — dříve se zavíralo před zpracujRozsudek, takže #modal-pripad už
    // nemělo .aktivni a synchronizace uzavřeného spisu v cases.js se nespustila.
    try {
      if (typeof Cases !== 'undefined' && Cases.zpracujRozsudek) {
        Cases.zpracujRozsudek(pripad, rozsudek, { preskocRazitko: true });
      }
    } finally {
      _zavriPripadModal();
    }
  }

  function _dokonciPredohruConsequence(pripad, rozsudek) {
    if (!_predohraConsequenceCtx) return;
    const ctx = _predohraConsequenceCtx;
    if (ctx.stage === 'aftermath') {
      _dokoncitRozsudekPoAftermath(pripad, rozsudek);
      return;
    }

    _wfZamkniInteraktivniVerdiktProPredohruDopad();

    if (ctx.aftermath && ctx.onAftermathClick) {
      ctx.aftermath.removeEventListener('click', ctx.onAftermathClick);
      ctx.aftermath = null;
      ctx.onAftermathClick = null;
    }
    const af = document.getElementById('case-wf-aftermath');
    const nar = document.getElementById('case-wf-aftermath-narr');
    if (af) af.classList.remove('case-wf-aftermath--visible');
    if (nar) nar.textContent = '';

    const prelude = document.getElementById('pripad-consequence-prelude');
    const txtEl = document.getElementById('pripad-consequence-prelude-text');
    const inner = prelude?.querySelector('.pripad-consequence-prelude-inner');
    const hintEl = prelude?.querySelector('.pripad-consequence-prelude-hint');
    if (prelude && txtEl) {
      txtEl.textContent = _textAftermath(pripad, rozsudek);
      if (hintEl) {
        hintEl.textContent =
          'Stiskni Enter nebo pokračuj tlačítkem — spis se zavře a vrátíš se na stůl.';
      }
      inner?.classList.add('pripad-consequence-prelude-inner--aftermath');
      prelude.classList.remove('skryto');
      prelude.setAttribute('aria-hidden', 'false');
    }

    document.getElementById('pripad-consequence-prelude-btn')?.focus();

    ctx.stage = 'aftermath';
  }

  function _zobrazPredohruConsequenceAKlik(pripad, rozsudek, onRozsudek) {
    const prelude = document.getElementById('pripad-consequence-prelude');
    const txtEl = document.getElementById('pripad-consequence-prelude-text');
    if (!prelude || !txtEl) {
      _zavriPripadModal();
      if (onRozsudek) onRozsudek(pripad, rozsudek);
      return;
    }
    if (!onRozsudek) {
      _zavriPripadModal();
      return;
    }

    const raw = (rozsudek.consequence && String(rozsudek.consequence).trim())
      || (rozsudek.text && String(rozsudek.text).trim())
      || '—';
    txtEl.textContent = raw;
    prelude.querySelector('.pripad-consequence-prelude-inner')
      ?.classList.remove('pripad-consequence-prelude-inner--aftermath');
    const hint0 = prelude.querySelector('.pripad-consequence-prelude-hint');
    if (hint0) hint0.textContent = 'Stiskni Enter nebo pokračuj tlačítkem.';

    _anulujPredohruConsequence();
    _wfZamkniInteraktivniVerdiktProPredohruDopad();

    const dokonci = () => _dokonciPredohruConsequence(pripad, rozsudek);

    const preludeBtn = document.getElementById('pripad-consequence-prelude-btn');
    const onPreludeBtn = () => dokonci();
    if (preludeBtn) preludeBtn.addEventListener('click', onPreludeBtn);

    prelude.classList.remove('skryto');
    prelude.setAttribute('aria-hidden', 'false');
    if (preludeBtn) preludeBtn.focus();

    _predohraConsequenceCtx = {
      timerId: null,
      onClickPrelude: null,
      prelude,
      preludeBtn,
      onPreludeBtn,
      dokonci,
      stage: 'prelude',
      aftermath: null,
      onAftermathClick: null,
      pripad,
      rozsudek
    };
  }

  // --- Modal důsledků rozsudku (stav animací) ---
  let _dusledkyCtx = null;

  const _NPC_TRUST_LABEL = {
    vlcek: 'Vlček',
    zavadova: 'Závadová',
    karas: 'Karas',
    horakova: 'Horáková',
    masek: 'Mašek',
    benes: 'Beneš',
    haas: 'Haas'
  };

  /** Zobrazení názvu frakce v UI (klíč ve stavu zůstává anglický). */
  const _FAKCNI_NAZEV_ZOBRAZENI = {
    Moc: 'Moc',
    Kapital: 'Kapitál',
    Lid: 'Lid'
  };

  /** Archivní / staré JSON mohou mít Stat, Obchodnici. */
  function _mapLegacyFactionKlic(klic) {
    if (klic === 'Stat') return 'Moc';
    if (klic === 'Obchodnici') return 'Kapital';
    return klic;
  }

  function _dusledkyIkonaRadku(r) {
    if (r.typ === 'trait') {
      const M = {
        Integrita: '⚖️',
        Odvaha: '🦁',
        Moudrost: '🧠',
        Vina: '💔',
        Nadeje: '🕯️'
      };
      return M[r.klic] || '·';
    }
    if (r.typ === 'faction') {
      const M = { Moc: '🏛️', Kapital: '💰', Lid: '✊' };
      return M[r.klic] || '·';
    }
    if (r.typ === 'trust') {
      const M = { vlcek: '🕴️', zavadova: '📰', karas: '⚖️' };
      return M[r.klic] || '🤝';
    }
    if (r.typ === 'finance') return '💰';
    return '·';
  }

  function _dusledkyKratkyNazev(r) {
    if (r.typ === 'trust') return 'Důvěra: ' + (_NPC_TRUST_LABEL[r.klic] || r.klic);
    return r.label;
  }

  function _dusledkySimulujTrait(nazev, aktualni, delta) {
    let nova = Math.max(0, Math.min(100, aktualni + delta));
    if (nazev === 'Vina') nova = Math.max(1, Math.min(100, nova));
    return nova;
  }

  function _dusledkySimulujFrakci(aktualni, delta) {
    return Math.max(0, Math.min(100, aktualni + delta));
  }

  function _dusledkySimulujTrust(aktualni, delta) {
    return Math.max(0, Math.min(3, aktualni + delta));
  }

  function _dusledkyZrusCasovace() {
    if (!_dusledkyCtx) return;
    for (const t of _dusledkyCtx.timers) clearTimeout(t);
    _dusledkyCtx.timers = [];
  }

  function _dusledkyPreskocAnimace() {
    if (!_dusledkyCtx || _dusledkyCtx.hotovo) return;
    _dusledkyCtx.skipped = true;
    _dusledkyZrusCasovace();
    const modal = document.getElementById('modal-dusledky');
    modal?.querySelectorAll('.dusledky-bar-track').forEach(track => {
      track.classList.add('dusledky-bar-track--okamzite');
      const tm = track.querySelector('.dusledky-bar-tmavy');
      const sv = track.querySelector('.dusledky-bar-svetly');
      if (tm && tm.dataset.cilSpodek != null) tm.style.width = tm.dataset.cilSpodek + '%';
      if (sv) {
        if (sv.dataset.cilLeft != null) sv.style.left = sv.dataset.cilLeft + '%';
        if (sv.dataset.cilW != null) sv.style.width = sv.dataset.cilW + '%';
        if (sv.dataset.cilOpacity != null) sv.style.opacity = sv.dataset.cilOpacity;
        else sv.style.opacity = '';
      }
    });
    modal?.querySelectorAll('.dusledky-radek').forEach(r => r.classList.add('dusledky-radek--viditelny'));
    const btn = document.getElementById('dusledky-pokracovat');
    if (btn) btn.disabled = false;
    _dusledkyCtx.hotovo = true;
  }

  function _dusledkyDokonciAnimace() {
    if (!_dusledkyCtx || _dusledkyCtx.hotovo) return;
    _dusledkyCtx.hotovo = true;
    _dusledkyZrusCasovace();
    const btn = document.getElementById('dusledky-pokracovat');
    if (btn) btn.disabled = false;
  }

  function _dusledkySestavRadky(consequences) {
    const c = consequences || {};
    const financeRadky = [];
    const ostatniRadky = [];

    const fin = c.finance;
    const finDelta = Number(fin);
    if (Number.isFinite(finDelta) && finDelta !== 0) {
      const pred = Math.round(Number(State.get('finance.balance') ?? 0));
      const po = Math.round(pred + finDelta);
      const vlastniLab = c._ui_finance_label;
      financeRadky.push({
        typ: 'finance',
        klic: 'balance',
        label: vlastniLab || 'Finance (zůstatek)',
        pred,
        po,
        delta: finDelta,
        skala: null
      });
    }

    for (const [nazev, delta] of Object.entries(c.traits || {})) {
      const d = Number(delta);
      if (!Number.isFinite(d) || d === 0) continue;
      const pred = Number(State.get('traits.' + nazev) ?? 50);
      const po = _dusledkySimulujTrait(nazev, pred, d);
      ostatniRadky.push({
        typ: 'trait',
        klic: nazev,
        label: nazev,
        pred,
        po,
        delta: d,
        skala: 100
      });
    }

    const frakAgregat = {};
    for (const [rawKlic, delta] of Object.entries(c.factions || {})) {
      const d = Number(delta);
      if (!Number.isFinite(d) || d === 0) continue;
      const klic = _mapLegacyFactionKlic(rawKlic);
      if (!klic) continue;
      frakAgregat[klic] = (frakAgregat[klic] || 0) + d;
    }
    for (const [nazev, d] of Object.entries(frakAgregat)) {
      if (!Number.isFinite(d) || d === 0) continue;
      const pred = Number(State.get('factions.' + nazev) ?? 50);
      const po = _dusledkySimulujFrakci(pred, d);
      ostatniRadky.push({
        typ: 'faction',
        klic: nazev,
        label: _FAKCNI_NAZEV_ZOBRAZENI[nazev] || nazev,
        pred,
        po,
        delta: d,
        skala: 100
      });
    }

    for (const [npcId, delta] of Object.entries(c.trust || {})) {
      const d = Number(delta);
      if (!Number.isFinite(d) || d === 0) continue;
      const pred = Number(State.get('trust.' + npcId) ?? 0);
      const po = _dusledkySimulujTrust(pred, d);
      const label = _NPC_TRUST_LABEL[npcId] || npcId;
      ostatniRadky.push({
        typ: 'trust',
        klic: npcId,
        label: 'Důvěra: ' + label,
        pred,
        po,
        delta: d,
        skala: 3
      });
    }

    return financeRadky.concat(ostatniRadky);
  }

  /**
   * Jedna řádka důsledků (stejný vzhled jako v modalu).
   * @param {boolean} okamzite — true = viditelná + animované bary hned (archiv / statický náhled)
   */
  function _dusledkyVytvorElementRadku(r, okamzite) {
    const predPct = _dusledkyProcentoBaru(r.typ, r.pred, r.skala);
    const poPct = _dusledkyProcentoBaru(r.typ, r.po, r.skala);
    const r2 = n => Math.round(Number(n) * 100) / 100;
    const lo = r2(Math.min(predPct, poPct));
    const hi = r2(Math.max(predPct, poPct));
    let deltaW = r2(hi - lo);
    if (deltaW < 0.15) deltaW = 0.15;
    const plus = r.delta > 0;
    let znam = plus ? '+' : '';
    const pp = r2(predPct);
    const pk = r2(poPct);
    let ztrataW = r2(Math.max(0, pp - pk));
    if (r.delta < 0 && ztrataW < 0.15) ztrataW = 0.15;
    const ik = _dusledkyIkonaRadku(r);
    const nazev = _dusledkyKratkyNazev(r);
    const deltaText = r.typ === 'finance' ? `${znam}${r.delta} Kč` : `${znam}${r.delta}`;
    const novaText = r.typ === 'finance' ? `${r.po} Kč` : String(r.po);

    const barPlus = `
      <div class="dusledky-bar-track dusledky-bar-track--plus">
        <div class="dusledky-bar-layers">
          <div class="dusledky-bar-track-bg" aria-hidden="true"></div>
          <div class="dusledky-bar-tmavy dusledky-bar-tmavy--plus" style="width:0%" data-cil-spodek="${pp}"></div>
          <div class="dusledky-bar-svetly dusledky-bar-svetly--plus" style="left:${pp}%;width:0%"
            data-cil-left="${pp}" data-cil-w="${deltaW}"></div>
        </div>
      </div>`;
    const barMinus = `
      <div class="dusledky-bar-track dusledky-bar-track--minus">
        <div class="dusledky-bar-layers">
          <div class="dusledky-bar-track-bg" aria-hidden="true"></div>
          <div class="dusledky-bar-tmavy dusledky-bar-tmavy--minus" style="width:0%" data-cil-spodek="${pk}"></div>
          <div class="dusledky-bar-svetly dusledky-bar-svetly--minus" style="left:${pk}%;width:0%"
            data-cil-left="${pk}" data-cil-w="${ztrataW}"></div>
        </div>
      </div>`;

    const row = document.createElement('div');
    row.className = 'dusledky-radek' + (okamzite ? ' dusledky-radek--viditelny' : '');
    row.innerHTML = `
      <div class="dusledky-radek-head">
        <span class="dusledky-radek-ikona" aria-hidden="true">${ik}</span>
        <span class="dusledky-radek-label">${nazev}</span>
        <span class="dusledky-radek-delta ${plus ? 'dusledky-radek-delta--plus' : 'dusledky-radek-delta--minus'}">${deltaText}</span>
      </div>
      ${plus ? barPlus : barMinus}
      <details class="dusledky-radek-nova-det">
        <summary class="dusledky-radek-nova-sum" title="Zobrazit cílovou hodnotu">⋯</summary>
        <p class="dusledky-radek-nova-t">nová hodnota: ${novaText}</p>
      </details>
    `;

    if (okamzite) {
      row.querySelectorAll('.dusledky-bar-track').forEach(track => {
        track.classList.add('dusledky-bar-track--okamzite');
        const tm = track.querySelector('.dusledky-bar-tmavy');
        const sv = track.querySelector('.dusledky-bar-svetly');
        if (tm && tm.dataset.cilSpodek != null) tm.style.width = tm.dataset.cilSpodek + '%';
        if (sv) {
          if (track.classList.contains('dusledky-bar-track--minus')) {
            if (sv.dataset.cilLeft != null) sv.style.left = sv.dataset.cilLeft + '%';
            if (sv.dataset.cilW != null) sv.style.width = sv.dataset.cilW + '%';
          } else {
            if (sv.dataset.cilLeft != null) sv.style.left = sv.dataset.cilLeft + '%';
            if (sv.dataset.cilW != null) sv.style.width = sv.dataset.cilW + '%';
          }
        }
      });
    }
    return row;
  }

  function vypoctiDusledkyRadky(consequences) {
    return _dusledkySestavRadky(consequences);
  }

  /** Jen ikona + název + delta (+5 / −3), bez grafů — záložka Rozsudek u vyřešeného případu. */
  function _dusledkyVytvorKompaktEfekty(radky) {
    const box = document.createElement('div');
    box.className = 'rozsudek-efekty-cisla';
    if (!radky || !radky.length) return box;
    for (const r of radky) {
      const plus = r.delta > 0;
      const znam = plus ? '+' : (r.delta < 0 ? '' : '');
      const delStr = r.typ === 'finance' ? znam + r.delta + ' Kč' : znam + r.delta;
      const row = document.createElement('div');
      row.className = 'rozsudek-efekt-radek';
      const ik = document.createElement('span');
      ik.className = 'rozsudek-efekt-ikona';
      ik.setAttribute('aria-hidden', 'true');
      ik.textContent = _dusledkyIkonaRadku(r);
      const lab = document.createElement('span');
      lab.className = 'rozsudek-efekt-label';
      lab.textContent = _dusledkyKratkyNazev(r);
      const del = document.createElement('span');
      del.className = 'rozsudek-efekt-delta ' + (plus ? 'rozsudek-efekt-delta--plus' : 'rozsudek-efekt-delta--minus');
      del.textContent = delStr;
      row.appendChild(ik);
      row.appendChild(lab);
      row.appendChild(del);
      box.appendChild(row);
    }
    return box;
  }

  function _dusledkyProcentoBaru(typ, hodnota, skala) {
    if (typ === 'finance') {
      const x = Math.max(0, hodnota);
      return Math.min(100, (x / 500) * 100);
    }
    if (skala === 3) return (hodnota / 3) * 100;
    return Math.max(0, Math.min(100, hodnota));
  }

  function _dusledkyTextReakce(radky) {
    if (!radky.length) {
      return 'Verdikt zaznamenán bez okamžité změny čísel stavu.';
    }

    const kandidati = [];
    const pridat = (priorita, text) => kandidati.push({ priorita, text });

    for (const r of radky) {
      const d = r.delta;
      if (r.typ === 'trust' && r.klic === 'vlcek' && d >= 1) {
        pridat(100 + Math.abs(d), 'Ministr Vlček si to zapíše.');
      }
      if (r.typ === 'trust' && r.klic === 'zavadova' && d >= 1) {
        pridat(95 + Math.abs(d), 'Závadová to zaznamenala do sešitu.');
      }
      if (r.typ === 'faction' && r.klic === 'Lid' && d >= 10) {
        pridat(80 + Math.abs(d), 'Z tržiště se šíří zpráva o rozsudku.');
      }
      if (r.typ === 'faction' && r.klic === 'Moc' && d >= 10) {
        pridat(80 + Math.abs(d), 'Na ministerstvu si to poznamenali.');
      }
      if (r.typ === 'trait' && r.klic === 'Integrita' && d <= -10) {
        pridat(75 + Math.abs(d), 'Něco v tobě se posunulo. Nevíš přesně kam.');
      }
      if (r.typ === 'trait' && r.klic === 'Vina' && d >= 5) {
        pridat(70 + Math.abs(d), 'Stará rána se připomněla.');
      }
      if (r.typ === 'trait' && r.klic === 'Nadeje' && d <= -5) {
        pridat(70 + Math.abs(d), 'Den skončil těžší než začal.');
      }
    }

    if (kandidati.length) {
      kandidati.sort((a, b) => b.priorita - a.priorita);
      return kandidati[0].text;
    }

    let nejsilnejsi = null;
    for (const r of radky) {
      if (r.typ !== 'faction') continue;
      const a = Math.abs(r.delta);
      if (!nejsilnejsi || a > Math.abs(nejsilnejsi.delta)) nejsilnejsi = r;
    }
    if (nejsilnejsi && Math.abs(nejsilnejsi.delta) >= 8) {
      if (nejsilnejsi.delta > 0) {
        return `Zákulisí frakce „${nejsilnejsi.label}“ si oddechlo.`;
      }
      return `Frakce „${nejsilnejsi.label}“ z toho není nadšená.`;
    }
    if (radky.some(r => r.typ === 'trait' && Math.abs(r.delta) >= 5)) {
      return 'Rozhodnutí se promítne do tvého nitra i do šeptaných řečí.';
    }
    return 'Město vaše slovo zapisuje do své nepsané kroniky.';
  }

  /** Modal „Důsledky rozsudku“ se v běžné hře nepoužívá — okamžitě zavolá pokračování (úplatek apod.). */
  function zobrazDusledkyRozsudku(pripad, rozsudek, onPokracovat) {
    _dusledkyZrusCasovace();
    _dusledkyCtx = null;
    _zavriModal('modal-dusledky');
    if (typeof onPokracovat === 'function') onPokracovat();
  }

  // --- PŘÍPAD ---

  const _TYPY_PRIPADU = ['rutinni', 'moralni', 'politicky', 'osobni'];

  /** PNG složky na stole — barva podle typu případu (slot I–III se nemění pevně zlato/modrá/červeně). */
  function _srcSlozkyImgProTyp(typ) {
    const t = String(typ || 'rutinni');
    if (t === 'moralni') return 'src/folder-blue.png';
    if (t === 'politicky') return 'src/folder-red.png';
    if (t === 'osobni') return 'src/folder-green.png';
    return 'src/folder-gold.png';
  }

  function _typPripaduProVizual(p) {
    return Cases.typProZobrazeni(p);
  }

  function _odstranTridyTypuPripadu(kontejner) {
    if (!kontejner) return;
    for (const t of _TYPY_PRIPADU) kontejner.classList.remove('pripad-typ--' + t);
    delete kontejner.dataset.pripadTyp;
  }

  function _odstranTypSlozky(el) {
    if (!el) return;
    for (const t of _TYPY_PRIPADU) el.classList.remove('slozka--typ-' + t);
    delete el.dataset.pripadTyp;
  }

  function _nastavVizualSlozkyFolder(el, typ) {
    const folder = el && el.querySelector('.folder');
    if (!folder) return;
    const path = _srcSlozkyImgProTyp(typ);
    folder.dataset.art = path;
    folder.style.setProperty('--folder-art', 'url("' + path + '")');
  }

  function _nastavTypSlozky(el, pripad) {
    _odstranTypSlozky(el);
    if (!pripad) return;
    const typ = _typPripaduProVizual(pripad);
    el.classList.add('slozka--typ-' + typ);
    el.dataset.pripadTyp = typ;
    _nastavVizualSlozkyFolder(el, typ);
  }

  function _nastavTypPripaduVModalu(pripad) {
    const typ = _typPripaduProVizual(pripad);
    const zahlavi = document.querySelector('.pripad-zahlavi');
    const katEl = document.getElementById('pripad-kategorie-text');
    if (zahlavi) {
      _odstranTridyTypuPripadu(zahlavi);
      zahlavi.classList.add('pripad-typ--' + typ);
      zahlavi.dataset.pripadTyp = typ;
    }
    if (katEl) {
      _odstranTridyTypuPripadu(katEl);
      katEl.classList.add('pripad-typ--' + typ);
      katEl.dataset.pripadTyp = typ;
    }
  }

  function _caseWfSetDots(activeIdx, doneBefore) {
    document.querySelectorAll('#case-wf-dots .case-wf-dot').forEach((d, i) => {
      d.classList.remove('active', 'done');
      if (i < doneBefore) d.classList.add('done');
      if (i === activeIdx) d.classList.add('active');
    });
  }

  function _wfNavHint(text) {
    const el = document.getElementById('case-wf-nav-hint');
    if (el) el.textContent = text;
  }

  /** Lišta informovanosti v modálu — podle počtu odhalených kroků průzkumu u tohoto případu. */
  function _wfAktualizujInformovanost(pripad) {
    const wrap = document.getElementById('case-wf-inform-wrap');
    const fill = document.getElementById('case-wf-inform-fill');
    const track = document.getElementById('case-wf-inform-track');
    const note = document.getElementById('case-wf-inform-note');
    if (!wrap || !fill || !note) return;
    const list = Array.isArray(pripad && pripad.hidden_info) ? pripad.hidden_info : [];
    if (!list.length) {
      wrap.classList.add('skryto');
      return;
    }
    wrap.classList.remove('skryto');
    let pct = 15;
    let label = 'Naslepo';
    let tone = 'case-wf-inform-fill--blind';
    if (typeof Cases !== 'undefined' && Cases.vypoctiInformovanostPripadu) {
      const info = Cases.vypoctiInformovanostPripadu(pripad) || {};
      const pctNum = Number(info.pct);
      if (Number.isFinite(pctNum)) pct = Math.max(0, Math.min(100, pctNum));
      if (info.label) label = String(info.label);
      if (info.tone) tone = String(info.tone);
    }
    fill.className = 'case-wf-inform-fill ' + tone;
    fill.style.width = pct + '%';
    note.textContent = label;
    if (track) track.setAttribute('aria-valuenow', String(pct));
  }

  /** Rysy (Odvaha / Moudrost / Vina) — pro zobrazení všech karet, blokace až dál. */
  function _wfVerdiktyPouzeRysy(pripad) {
    if (!pripad || !pripad.verdicts) return [];
    const odvaha = Number(State.get('traits.Odvaha')) || 0;
    const moudrost = Number(State.get('traits.Moudrost')) || 0;
    const vina = Number(State.get('traits.Vina')) || 0;
    return pripad.verdicts.filter(v => {
      if (v.requires_odvaha_min != null && odvaha < Number(v.requires_odvaha_min)) return false;
      if (v.requires_moudrost_min != null && moudrost < Number(v.requires_moudrost_min)) return false;
      if (v.available_unless_vina_above != null && vina > Number(v.available_unless_vina_above)) return false;
      return true;
    });
  }

  function _wfFiltrovatVerdikty(pripad) {
    return _wfVerdiktyPouzeRysy(pripad).filter(v => {
      if (typeof Cases !== 'undefined' && Cases.jeVerdiktOdemcenPoClue) {
        if (!Cases.jeVerdiktOdemcenPoClue(pripad, v.id)) return false;
      }
      return true;
    });
  }

  const _WF_VERDIKT_BLOK_TITUL = 'Tento rozsudek nelze uplatnit.';

  function _wfPocetOdhalenychPruzkumu(pripad) {
    if (!pripad || !Array.isArray(pripad.hidden_info)) return 0;
    return pripad.hidden_info.filter(i => State.jeInfoOdhaleno(pripad.id, i.id)).length;
  }

  function _wfMaOdhalenouKonfrontaci(pripad) {
    return (pripad.hidden_info || []).some(
      i =>
        State.jeInfoOdhaleno(pripad.id, i.id) &&
        (i.action === 'confrontation' || i.id === 'pool_inv_confrontation')
    );
  }

  /** Pool: podle cases.mdc — 0 odhalení jen základní vina + formální zproštění; průzkum postupně odemyká zbytek. */
  function _wfFiltrovatVerdiktyPodlePruzkumu(pripad, verdikty) {
    const arr = verdikty || [];
    if (!pripad || pripad._fromPool !== true) return arr;
    if (!Array.isArray(pripad.hidden_info) || !pripad.hidden_info.length) return arr;
    if (typeof Cases !== 'undefined' && Cases.maInformacniPrahyVerdiktu && Cases.maInformacniPrahyVerdiktu(pripad)) {
      return arr;
    }

    const n = _wfPocetOdhalenychPruzkumu(pripad);
    const maKonf = _wfMaOdhalenouKonfrontaci(pripad);

    return arr.filter(v => {
      const id = String(v.id || '');

      if (n === 0) {
        return id === 'guilty_maximum' || id === 'guilty_standard' || id === 'not_guilty_formal';
      }
      if (n === 1) {
        if (id.startsWith('insufficient_')) return false;
        if (id === 'guilty_alternative' || id === 'guilty_special') return false;
        return (
          id === 'guilty_maximum' ||
          id === 'guilty_standard' ||
          id === 'guilty_lenient' ||
          id === 'not_guilty_formal' ||
          id === 'not_guilty_comment' ||
          id === 'not_guilty_with_comment'
        );
      }
      if (id === 'guilty_special') return maKonf;
      if (id === 'guilty_alternative') return maKonf || n >= 3;
      return true;
    });
  }

  function _wfJeZakladniPoolVerdiktId(verdictId) {
    const id = String(verdictId || '').trim();
    return id === 'guilty_maximum' || id === 'guilty_standard' || id === 'not_guilty_formal';
  }

  function _wfJeNovyVerdikt(propad, verdictId) {
    const pripad = propad;
    if (!pripad) return false;
    const id = String(verdictId || '').trim();
    if (!id) return false;
    if (pripad._fromPool === true) return !_wfJeZakladniPoolVerdiktId(id);
    return false;
  }

  /**
   * Rádek pod „Vinen“: jen když už je aspoň jeden „nový“ (pool) rozsudek reálně dostupný
   * po průzkumu — ne jen naskriptovaný ve skupině.
   */
  function _wfPruzkumTextProSkupinu(items, pripad, dostupneIdSet) {
    const set = dostupneIdSet instanceof Set ? dostupneIdSet : null;
    const nove = (items || []).filter(v => {
      if (!_wfJeNovyVerdikt(pripad, v && v.id)) return false;
      const id = String((v && v.id) || '').trim();
      if (!id) return false;
      if (set && !set.has(id)) return false;
      return true;
    }).length;
    if (!nove) return null;
    if (nove === 1) return 'Průzkum: +1 nový rozsudek';
    if (nove >= 2 && nove <= 4) return `Průzkum: +${nove} nové rozsudky`;
    return `Průzkum: +${nove} nových rozsudků`;
  }

  /** Titulek karty trestu; u pool „nových“ po průzkumu jednou „Průzkum:“ (bez zdvojení z JSON). */
  function _wfVerdiktTitulekProZobrazeni(pripad, r) {
    const raw = String((r && r.text) || '—').trim();
    if (_wfJeNovyVerdikt(pripad, r && r.id)) {
      if (/^průzkum\s*:/i.test(raw)) return raw;
      return 'Průzkum: ' + raw;
    }
    return raw;
  }

  function _wfVerdiktyDoSkupin(verdicts) {
    const g = { guilty: [], not_guilty: [], insufficient: [], other: [] };
    for (const v of verdicts || []) {
      const id = String(v.id || '');
      if (id.startsWith('guilty_')) g.guilty.push(v);
      else if (id.startsWith('not_guilty_')) g.not_guilty.push(v);
      else if (id.startsWith('insufficient_')) g.insufficient.push(v);
      else g.other.push(v);
    }
    return g;
  }

  /** Běží předehra nebo dopad — nesmí se znovu vykreslovat wireframe (jinak se znovu objeví Potvrdit). */
  function _wfJeAktivniDopadovaVrstvaPripadu() {
    const pr = document.getElementById('pripad-consequence-prelude');
    if (pr && !pr.classList.contains('skryto')) return true;
    const af = document.getElementById('case-wf-aftermath');
    return !!(af && af.classList.contains('case-wf-aftermath--visible'));
  }

  function _wfPruzkumPopisek(info) {
    const a = info.action;
    if (a === 'witness') return 'Vyslechnout svědka';
    if (a === 'records') return 'Zkontrolovat záznamy';
    if (a === 'informant') return 'Kontaktovat informátora';
    if (a === 'confrontation') return 'Konfrontace (2 akce)';
    if (a === 'fast') return 'Rozhodnout rychle';
    return a || 'Průzkum';
  }

  function _wfResetVerdictUi() {
    _wfVerdictStampTeardown();
    _wfRozsudekVyber = null;
    document.getElementById('modal-pripad')?.classList.remove('case-wf-in-consequence-flow');
    const s1 = document.getElementById('case-wf-verdict-step1');
    const s2 = document.getElementById('case-wf-verdict-step2');
    const s2w = document.getElementById('case-wf-step2-wrap');
    const leg = document.getElementById('case-wf-verdict-legacy');
    const c = document.getElementById('case-wf-confirm-rozsudek');
    if (s1) s1.innerHTML = '';
    if (s2) s2.innerHTML = '';
    if (s2w) s2w.classList.add('skryto');
    if (leg) {
      leg.innerHTML = '';
      leg.classList.add('skryto');
    }
    if (c) {
      c.classList.add('skryto');
      c.disabled = true;
      c.onclick = null;
      delete c.dataset.wfVerdictCommitted;
    }
  }

  /** Schová krok 1/2 a Potvrdit, pokud je modál v režimu rekapitulace (ochrana před pozdním wireframe). */
  function _wfZamkniInteraktivniVerdiktReadonlyDom() {
    const m = document.getElementById('modal-pripad');
    if (!m || m.dataset.verdictMode !== 'readonly') return;
    document.getElementById('case-wf-step1-wrap')?.classList.add('skryto');
    document.getElementById('case-wf-step2-wrap')?.classList.add('skryto');
    document.getElementById('case-wf-verdict-legacy')?.classList.add('skryto');
    const c = document.getElementById('case-wf-confirm-rozsudek');
    if (c) {
      c.classList.add('skryto');
      c.disabled = true;
    }
    _wfVerdictStampTeardown();
  }

  function _wfVyplnStep2(grp, polozky, pripad, onRozsudek, dostupneIdSet) {
    const modWf = document.getElementById('modal-pripad');
    if (modWf && modWf.dataset.verdictMode === 'readonly') return;
    if (typeof State !== 'undefined' && pripad && State.jePripadUzavren && State.jePripadUzavren(pripad.id)) return;
    const step2 = document.getElementById('case-wf-verdict-step2');
    const step2w = document.getElementById('case-wf-step2-wrap');
    const lbl = document.getElementById('case-wf-step2-label');
    if (!step2 || !step2w) return;
    step2.innerHTML = '';
    if (lbl) {
      if (grp === 'guilty') lbl.textContent = 'Krok 2 — Trest / přístup';
      else if (grp === 'not_guilty') lbl.textContent = 'Krok 2 — Zdůvodnění';
      else if (grp === 'insufficient') lbl.textContent = 'Krok 2 — Postup';
      else lbl.textContent = 'Krok 2 — Volba';
    }
    step2w.classList.remove('skryto');
    const confirmBtn = document.getElementById('case-wf-confirm-rozsudek');
    for (const r of polozky) {
      const b = document.createElement('button');
      b.type = 'button';
      const klic = String(r.id || '');
      const lzeZvolit = !dostupneIdSet || dostupneIdSet.has(klic);
      b.disabled = !lzeZvolit;
      const unlocked = lzeZvolit && _wfJeNovyVerdikt(pripad, r.id);
      b.className = (
        'case-wf-verdict-opt' +
        (unlocked ? ' case-wf-verdict-opt--unlocked' : '') +
        (!lzeZvolit ? ' case-wf-verdict-opt--locked' : '')
      ).trim();
      if (!lzeZvolit) b.title = _WF_VERDIKT_BLOK_TITUL;
      if (!lzeZvolit) {
        b.innerHTML = `<div class="case-wf-v-blocked case-wf-v-blocked--tease">${_WF_VERDIKT_BLOK_TITUL}</div>`;
      } else {
        b.innerHTML =
          `<div class="case-wf-v-title">${_wfVerdiktTitulekProZobrazeni(pripad, r)}</div>` +
          (r.consequence ? `<div class="case-wf-v-desc">${r.consequence}</div>` : '');
      }
      b.addEventListener('click', () => {
        if (b.disabled) return;
        step2.querySelectorAll('.case-wf-verdict-opt').forEach(x => x.classList.remove('case-wf-verdict-opt--selected'));
        b.classList.add('case-wf-verdict-opt--selected');
        _wfRozsudekVyber = { rozsudek: r };
        if (confirmBtn) {
          confirmBtn.classList.remove('skryto');
          confirmBtn.disabled = false;
        }
      });
      step2.appendChild(b);
    }
    if (confirmBtn) {
      confirmBtn.classList.add('skryto');
      confirmBtn.disabled = true;
    }
    _wfVerdictStampBindMove();
    _caseWfSetDots(3, 3);
    _wfNavHint('Vyberte konkrétní znění a potvrďte rozsudek.');
  }

  function _zobrazRozsudkyWireframe(pripad, onRozsudek) {
    const modW = document.getElementById('modal-pripad');
    if (modW && modW.dataset.verdictMode === 'readonly') {
      if (pripad) zobrazPripadReadonly(pripad);
      return;
    }
    if (pripad && typeof State !== 'undefined' && State.jePripadUzavren && State.jePripadUzavren(pripad.id)) {
      zobrazPripadReadonly(pripad);
      return;
    }
    if (_wfJeAktivniDopadovaVrstvaPripadu()) return;
    _wfResetVerdictUi();
    _wfPripadCallback = onRozsudek;
    const dostupne = _wfFiltrovatVerdiktyPodlePruzkumu(pripad, _wfFiltrovatVerdikty(pripad));
    const dostupneId = new Set(dostupne.map(v => String(v.id || '')));
    const vsechny =
      pripad && Array.isArray(pripad.verdicts) && pripad.verdicts.length ? pripad.verdicts : dostupne;
    const step1 = document.getElementById('case-wf-verdict-step1');
    const step1Wrap = document.getElementById('case-wf-step1-wrap');
    const confirmBtn = document.getElementById('case-wf-confirm-rozsudek');
    if (!step1 || !confirmBtn) return;
    if (step1Wrap) step1Wrap.classList.remove('skryto');

    const g = _wfVerdiktyDoSkupin(vsechny);
    const skupiny = [];
    if (g.guilty.length) {
      skupiny.push({
        key: 'guilty',
        tit: 'Vinen',
        desc: 'Obžalovaný spáchal skutek v podobě popsané obžalobou.',
        items: g.guilty
      });
    }
    if (g.not_guilty.length) {
      skupiny.push({
        key: 'not_guilty',
        tit: 'Zproštění / nevinen',
        desc: 'Obžaloba neobstojí nebo nejde o trestný čin v této podobě.',
        items: g.not_guilty
      });
    }
    if (g.insufficient.length) {
      skupiny.push({
        key: 'insufficient',
        tit: 'Nedostatek důkazů',
        desc: 'Nelze bezpečně rozhodnout — vrátit k došetření nebo uzavřít.',
        items: g.insufficient
      });
    }

    const pouzitPoolSkupiny = g.other.length === 0 && skupiny.length > 0;

    if (pouzitPoolSkupiny && skupiny.length === 1) {
      if (step1Wrap) step1Wrap.classList.add('skryto');
      _wfVyplnStep2(skupiny[0].key, skupiny[0].items, pripad, onRozsudek, dostupneId);
      _wfRozsudekVyber = { mode: 'twostep', grp: skupiny[0].key };
    } else if (pouzitPoolSkupiny) {
      for (const s of skupiny) {
        const b = document.createElement('button');
        b.type = 'button';
        const unlockLine = _wfPruzkumTextProSkupinu(s.items, pripad, dostupneId);
        const maBytUnlockedSkupina = !!unlockLine && s.key === 'insufficient';
        b.className = 'case-wf-verdict-opt' + (maBytUnlockedSkupina ? ' case-wf-verdict-opt--unlocked' : '');
        b.innerHTML =
          `<div class="case-wf-v-title">${s.tit}</div>` +
          (unlockLine ? `<div class="case-wf-v-unlock">${unlockLine}</div>` : '') +
          `<div class="case-wf-v-desc">${s.desc}</div>`;
        b.addEventListener('click', () => {
          step1.querySelectorAll('.case-wf-verdict-opt').forEach(x => x.classList.remove('case-wf-verdict-opt--selected'));
          b.classList.add('case-wf-verdict-opt--selected');
          _wfVyplnStep2(s.key, s.items, pripad, onRozsudek, dostupneId);
        });
        step1.appendChild(b);
      }
      _wfRozsudekVyber = { mode: 'twostep', grp: null };
    } else {
      if (step1Wrap) step1Wrap.classList.add('skryto');
      const leg = document.getElementById('case-wf-verdict-legacy');
      if (leg) leg.classList.remove('skryto');
      for (const rozsudek of vsechny.length ? vsechny : []) {
        const btn = document.createElement('button');
        btn.type = 'button';
        const kid = String(rozsudek.id || '');
        const lzeZvolit = dostupneId.has(kid);
        btn.disabled = !lzeZvolit;
        if (!lzeZvolit) btn.title = _WF_VERDIKT_BLOK_TITUL;
        const unlocked = lzeZvolit && _wfJeNovyVerdikt(pripad, rozsudek.id);
        btn.className = (
          'case-wf-verdict-opt ' + _rozsudekTrida(rozsudek.id) + (unlocked ? ' case-wf-verdict-opt--unlocked' : '') + (!lzeZvolit ? ' case-wf-verdict-opt--locked' : '')
        ).trim();
        if (!lzeZvolit) {
          btn.innerHTML = `<div class="case-wf-v-blocked case-wf-v-blocked--tease">${_WF_VERDIKT_BLOK_TITUL}</div>`;
        } else {
          btn.innerHTML =
            `<div class="case-wf-v-title">${_wfVerdiktTitulekProZobrazeni(pripad, rozsudek)}</div>` +
            (rozsudek.consequence ? `<div class="case-wf-v-desc">${rozsudek.consequence}</div>` : '');
        }
        btn.addEventListener('click', () => {
          if (btn.disabled) return;
          leg.querySelectorAll('.case-wf-verdict-opt').forEach(x => x.classList.remove('case-wf-verdict-opt--selected'));
          btn.classList.add('case-wf-verdict-opt--selected');
          _wfRozsudekVyber = { mode: 'single', rozsudek };
          confirmBtn.classList.remove('skryto');
          confirmBtn.disabled = false;
        });
        leg.appendChild(btn);
      }
    }

    const uplatek = Number(pripad.bribe_amount);
    if (Number.isFinite(uplatek) && uplatek > 0 && !State.get('flags.uplatek_prijat')) {
      const secVer = document.getElementById('case-wf-sec-verdict');
      const btnU = document.createElement('button');
      btnU.type = 'button';
      btnU.className = 'case-wf-verdict-opt';
      btnU.innerHTML =
        `<div class="case-wf-v-title">Přijmout úplatek (${uplatek} Kč)</div>` +
        '<div class="case-wf-v-desc">Integrita utrpí — obálka je však na stole.</div>';
      btnU.addEventListener('click', () => {
        if (typeof SFX !== 'undefined') SFX.rozsudekStamp();
        _zavriPripadModal();
        const uR = {
          id: 'uplatek',
          text: 'Přijmout úplatek',
          consequence: `Nabídka zní na ${uplatek} Kč.`,
          consequences: {
            traits: { Integrita: -15 },
            factions: {},
            trust: {},
            finance: uplatek,
            flags: []
          }
        };
        Cases.zpracujPrijetiUplatekPoModalu(pripad);
      });
      if (secVer && confirmBtn) secVer.insertBefore(btnU, confirmBtn);
    }

    confirmBtn.onclick = () => {
      const modPh = document.getElementById('modal-pripad');
      if (modPh && modPh.dataset.verdictMode === 'readonly') {
        confirmBtn.disabled = true;
        confirmBtn.classList.add('skryto');
        confirmBtn.onclick = null;
        return;
      }
      if (typeof State !== 'undefined' && State.jePripadUzavren && State.jePripadUzavren(pripad.id)) {
        confirmBtn.disabled = true;
        confirmBtn.classList.add('skryto');
        confirmBtn.onclick = null;
        _wfVerdictStampTeardown();
        return;
      }
      if (_wfJeAktivniDopadovaVrstvaPripadu()) return;
      if (confirmBtn.dataset.wfVerdictCommitted === '1') return;
      const r = _wfRozsudekVyber && _wfRozsudekVyber.rozsudek;
      if (!r || !onRozsudek) return;

      confirmBtn.dataset.wfVerdictCommitted = '1';
      confirmBtn.disabled = true;
      confirmBtn.classList.add('skryto');
      confirmBtn.onclick = null;

      _wfVerdictStampTeardown();
      if (typeof SFX !== 'undefined') SFX.rozsudekStamp();
      _wfVerdictStampShake(true);
      _zobrazPredohruConsequenceAKlik(pripad, r, onRozsudek);
    };
  }

  function _wfPoPrvniAkciPruzkumu(pripad, onRozsudek) {
    const modPp = document.getElementById('modal-pripad');
    if (modPp && modPp.dataset.verdictMode === 'readonly') return;
    if (typeof State !== 'undefined' && State.jePripadUzavren && State.jePripadUzavren(pripad.id)) return;
    if (_wfJeAktivniDopadovaVrstvaPripadu()) return;
    const secV = document.getElementById('case-wf-sec-verdict');
    secV?.classList.remove('skryto');
    _skryjShrnutiRozsudku();
    _wfVerdictRenderedForCaseId = pripad.id;
    _zobrazRozsudkyWireframe(pripad, onRozsudek);
    _caseWfSetDots(3, 3);
    _wfNavHint('Vyberte verdikt a potvrďte rozsudek.');
    _wfAktualizujRozporBox(pripad);
    const conEl = document.getElementById('case-wf-contradiction');
    if (conEl && !conEl.classList.contains('skryto')) {
      _caseWfSetDots(2, 2);
    }
    _wfAktualizujInformovanost(pripad);
  }

  function zobrazPripad(pripad, onRozsudek) {
    if (!pripad) return;

    _prepniTabPripadu('pripad');
    _wfVerdictRenderedForCaseId = null;
    _wfClueAktivniPripad = pripad;
    _wfClueAktivniOnRozsudek = onRozsudek;
    _wfCluePatraniReset();
    _wfCluePatraniNactiZeStavu(pripad);
    _wfCluePatraniHudUpdate(pripad, onRozsudek);
    _wfClueResetVolby();
    _wfClueResetKandidata();
    document.getElementById('case-wf-clue-confirm-wrap')?.remove();

    const modP = document.getElementById('modal-pripad');
    if (modP) {
      modP.dataset.verdictMode = 'active';
      modP.querySelector('.pripad-panel--wireframe')?.classList.remove('pripad-panel--pripad-readonly');
    }

    if (typeof State !== 'undefined' && State.jePripadUzavren && State.jePripadUzavren(pripad.id)) {
      zobrazPripadReadonly(pripad);
      return;
    }

    const aftermath = document.getElementById('case-wf-aftermath');
    if (aftermath) {
      aftermath.classList.remove('case-wf-aftermath--visible');
      const nar = document.getElementById('case-wf-aftermath-narr');
      if (nar) nar.textContent = '';
    }

    const zahlavi0 = document.querySelector('.pripad-zahlavi');
    zahlavi0?.classList.remove('zahlavi--vyreseno');
    _odstranTridyTypuPripadu(zahlavi0);
    _odstranTridyTypuPripadu(document.getElementById('pripad-kategorie-text'));

    document.getElementById('pripad-kategorie-text').textContent = _stitulekTypuPripadu(pripad);
    document.getElementById('pripad-nazev-text').textContent = pripad.title;
    document.getElementById('pripad-obvineni-text').textContent =
      `${pripad.defendant?.name || '—'}, ${pripad.charge || '—'}`;
    const leadHdr = document.getElementById('pripad-zahlavi-lead');
    if (leadHdr) leadHdr.textContent = _wfZahlaviKratkyPopis(pripad);
    document.getElementById('case-wf-clue-hud-slot')?.classList.remove('skryto');

    const spZn = document.getElementById('pripad-spis-zn');
    if (spZn) spZn.textContent = (pripad.case_number || '—').trim();

    const spDatum = document.getElementById('pripad-spis-datum');
    if (spDatum) spDatum.textContent = _formatujDatumSpisu(State.get('currentDay'));

    let situace = pripad.situation || '';
    const denP = Number(State.get('currentDay'));
    if (Number.isFinite(denP) && denP % 7 === 1 && State.get('pondeli_moudrost_extra')) {
      situace = 'Odpočinutá neděle ti ještě rezonuje v hlavě — první řádky čteš jinak než obvykle.\n\n' + situace;
      State.set('pondeli_moudrost_extra', false);
    }
    if (_wfClueTimedCfg(pripad)) {
      const ndS = Number(State.get('traits.Nadeje')) || 0;
      const vnS = Number(State.get('traits.Vina')) || 0;
      if (ndS <= 25 || vnS >= 70) {
        situace =
          'Třesou se ti ruce; dnes bude těžké udržet pozornost u detailů.\n\n' + situace;
      }
    }
    if (typeof Cases !== 'undefined' && Cases.ziskejClueFocusMax && State.inicializujClueFocusPokudTreba) {
      State.inicializujClueFocusPokudTreba(pripad.id, Cases.ziskejClueFocusMax(pripad));
    }
    _wfNastavRichText(document.getElementById('pripad-situace-text'), situace);

    const svedkySekce = document.getElementById('pripad-svedectvi');
    svedkySekce.innerHTML = '';
    if (pripad.testimony) {
      for (const sv of pripad.testimony) {
        const item = document.createElement('div');
        item.className = 'case-wf-testimony';
        item.innerHTML =
          `<div class="case-wf-speaker">${sv.label || sv.source || '—'}</div>` +
          `<div class="case-wf-quote">${sv.text || ''}</div>`;
        svedkySekce.appendChild(item);
      }
    }

    const conEl = document.getElementById('case-wf-contradiction');
    if (conEl) {
      conEl.classList.add('skryto');
      conEl.textContent = '';
    }

    const odhaleneEl = document.getElementById('pripad-odhalene-info');
    odhaleneEl.innerHTML = '';
    const jizOdhalene = pripad.hidden_info?.filter(info =>
      State.jeInfoOdhaleno(pripad.id, info.id)
    ) || [];
    jizOdhalene.forEach(info => _zobrazOdhalenoInfo(odhaleneEl, info));

    const secV = document.getElementById('case-wf-sec-verdict');
    const secP = document.getElementById('case-wf-sec-pruzkum');
    const maSkryte = Array.isArray(pripad.hidden_info) && pripad.hidden_info.length > 0;
    const zbyvaAkci = Number(State.get('investigationActionsLeft')) || 0;
    if (secV) {
      secV.classList.remove('skryto');
      _skryjShrnutiRozsudku();
      _wfVerdictRenderedForCaseId = pripad.id;
      _zobrazRozsudkyWireframe(pripad, onRozsudek);
    }
    if (secP) secP.classList.toggle('skryto', !maSkryte);

    document.getElementById('case-wf-verdict-readonly')?.classList.add('skryto');

    _aktualizujPruzkumPanel(pripad, onRozsudek);
    _wfAktualizujInformovanost(pripad);
    _wfAktualizujRozporBox(pripad);
    _wfClueAplikujUzamceni(pripad);

    _nastavTypPripaduVModalu(pripad);

    _caseWfSetDots(0, 0);
    setTimeout(() => _caseWfSetDots(1, 1), 400);
    _wfNavHint(
      maSkryte
        ? zbyvaAkci <= 0 && jizOdhalene.length === 0
          ? 'Dnešní sdílené akce průzkumu už došly — základní rozsudek (naslepo) je k dispozici; další možnosti by odemkl průzkum.'
          : 'Základní verdikty máte hned; průzkum (sdílené akce za den) rozšíří tresty a zdůvodnění.'
        : 'Vyberte rozsudek a potvrďte.'
    );

    Desk.nastavAktivniSpis(pripad);

    if (typeof SFX !== 'undefined') SFX.slozkaPaper();
    _otevriModal('modal-pripad');
    Desk.animujPrichodSpisu();
  }

  function zobrazPripadReadonly(pripad) {
    if (!pripad) return;

    _prepniTabPripadu('pripad');
    _wfVerdictRenderedForCaseId = null;
    _wfCluePatraniReset();
    _wfClueResetVolby();
    _wfClueResetKandidata();
    document.getElementById('case-wf-clue-confirm-wrap')?.remove();
    _wfClueAktivniPripad = null;
    _wfClueAktivniOnRozsudek = null;
    _wfResetVerdictUi();

    const modPR = document.getElementById('modal-pripad');
    if (modPR) modPR.dataset.verdictMode = 'readonly';
    document.querySelector('#modal-pripad .pripad-panel--wireframe')?.classList.add('pripad-panel--pripad-readonly');

    const zahlavi0 = document.querySelector('.pripad-zahlavi');
    _odstranTridyTypuPripadu(zahlavi0);
    _odstranTridyTypuPripadu(document.getElementById('pripad-kategorie-text'));

    document.getElementById('pripad-kategorie-text').textContent = _stitulekTypuPripadu(pripad);
    document.getElementById('pripad-nazev-text').textContent = pripad.title;
    document.getElementById('pripad-obvineni-text').textContent =
      `${pripad.defendant?.name || '—'}, ${pripad.charge || '—'}`;
    const leadHdrR = document.getElementById('pripad-zahlavi-lead');
    if (leadHdrR) leadHdrR.textContent = _wfZahlaviKratkyPopis(pripad);
    document.getElementById('case-wf-clue-hud-slot')?.classList.add('skryto');
    _wfAktualizujHeaderAkciPripadu();

    const spZnR = document.getElementById('pripad-spis-zn');
    if (spZnR) spZnR.textContent = (pripad.case_number || '—').trim();

    const spDatumR = document.getElementById('pripad-spis-datum');
    if (spDatumR) spDatumR.textContent = _formatujDatumSpisu(State.get('currentDay'));

    _wfNastavRichText(document.getElementById('pripad-situace-text'), pripad.situation || '');

    const svedkySekce = document.getElementById('pripad-svedectvi');
    svedkySekce.innerHTML = '';
    if (pripad.testimony) {
      for (const sv of pripad.testimony) {
        const item = document.createElement('div');
        item.className = 'case-wf-testimony';
        item.innerHTML =
          `<div class="case-wf-speaker">${sv.label || sv.source || '—'}</div>` +
          `<div class="case-wf-quote">${sv.text || ''}</div>`;
        svedkySekce.appendChild(item);
      }
    }

    const odhaleneEl = document.getElementById('pripad-odhalene-info');
    odhaleneEl.innerHTML = '';
    const jizOdhalene = pripad.hidden_info?.filter(info =>
      State.jeInfoOdhaleno(pripad.id, info.id)
    ) || [];
    jizOdhalene.forEach(info => _zobrazOdhalenoInfo(odhaleneEl, info));

    document.getElementById('case-wf-sec-pruzkum')?.classList.add('skryto');
    document.getElementById('case-wf-inform-wrap')?.classList.add('skryto');
    document.getElementById('case-wf-verdict-readonly')?.classList.remove('skryto');
    document.getElementById('case-wf-step1-wrap')?.classList.add('skryto');
    document.getElementById('case-wf-step2-wrap')?.classList.add('skryto');
    document.getElementById('case-wf-verdict-legacy')?.classList.add('skryto');
    const confR = document.getElementById('case-wf-confirm-rozsudek');
    if (confR) {
      confR.classList.add('skryto');
      confR.disabled = true;
    }

    const secV = document.getElementById('case-wf-sec-verdict');
    secV?.classList.remove('skryto');

    const archivRozsudky = State.get('archive.verdicts') || [];
    const pid = String(pripad.id || '');
    const zaznam = archivRozsudky.find(
      v => v && String(v.caseId ?? v.case_id ?? '') === pid
    );
    _skryjShrnutiRozsudku();
    _zobrazRozsudkyReadonly(pripad, zaznam);

    const zahlaviR = document.querySelector('.pripad-zahlavi');
    zahlaviR?.classList.add('zahlavi--vyreseno');
    _nastavTypPripaduVModalu(pripad);

    _wfNavHint('Spis je uzavřen — pouze ke čtení.');
    _wfZamkniInteraktivniVerdiktReadonlyDom();
    _caseWfSetDots(4, 5);

    Desk.nastavAktivniSpis(pripad);
    if (typeof SFX !== 'undefined') SFX.slozkaPaper();
    _otevriModal('modal-pripad');
    Desk.animujPrichodSpisu();
  }

  function _aktualizujPruzkumPanel(pripad, onRozsudek) {
    const wfAkce = document.getElementById('case-wf-pruzkum-akce');
    const wfFind = document.getElementById('case-wf-findings');
    const tlacitka = document.getElementById('prukzum-tlacitka');
    const akceInfo = document.getElementById('prukzum-akce-info');

    const zbyvaji = State.get('investigationActionsLeft');
    if (akceInfo) akceInfo.textContent = `${zbyvaji} ${zbyvaji === 1 ? 'akce' : 'akcí'}`;

    if (wfAkce) wfAkce.innerHTML = '';
    if (tlacitka) tlacitka.innerHTML = '';
    if (wfFind) wfFind.innerHTML = '';

    if (!pripad.hidden_info || pripad.hidden_info.length === 0) {
      document.getElementById('prukzum-panel')?.classList.add('skryto');
      document.getElementById('case-wf-inform-wrap')?.classList.add('skryto');
      _wfAktualizujHeaderAkciPripadu();
      return;
    }
    document.getElementById('prukzum-panel')?.classList.add('skryto');

    for (const info of pripad.hidden_info) {
      if (typeof Cases !== 'undefined' && Cases.jePruzkumAkceOdemcenaPoClue) {
        if (!Cases.jePruzkumAkceOdemcenaPoClue(pripad, info.id)) continue;
      }
      const fid = 'case-wf-find-' + info.id;
      if (wfFind) {
        const uzJe = State.jeInfoOdhaleno(pripad.id, info.id);
        const box = document.createElement('div');
        box.id = fid;
        box.className = 'case-wf-finding' + (uzJe ? '' : ' skryto');
        const src = document.createElement('div');
        src.className = 'case-wf-finding-src';
        src.textContent = _wfPruzkumPopisek(info);
        const ftx = document.createElement('div');
        ftx.className = 'case-wf-finding-text';
        if (uzJe) _wfNastavRichText(ftx, info.reveal || '');
        box.appendChild(src);
        box.appendChild(ftx);
        wfFind.appendChild(box);
      }

      const jizOdhaleno = State.jeInfoOdhaleno(pripad.id, info.id);
      const denAkce = Number(State.get('currentDay')) || 0;
      const recDo = State.get('flags.records_free_until_day');
      const recFree =
        info.action === 'records' &&
        recDo != null &&
        Number.isFinite(Number(recDo)) &&
        denAkce > 0 &&
        denAkce <= Number(recDo);
      let cena = Number(info.cost) > 0 ? Number(info.cost) : 1;
      if (recFree) cena = 0;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'case-wf-action-btn' + (jizOdhaleno ? ' case-wf-action-btn--used' : '');
      btn.textContent = _wfPruzkumPopisek(info);
      btn.disabled = jizOdhaleno || zbyvaji < cena;

      if (!jizOdhaleno) {
        btn.addEventListener('click', () => {
          const zbyvaji2 = State.get('investigationActionsLeft');
          const denK = Number(State.get('currentDay')) || 0;
          const recDoK = State.get('flags.records_free_until_day');
          const recFreeK =
            info.action === 'records' &&
            recDoK != null &&
            Number.isFinite(Number(recDoK)) &&
            denK > 0 &&
            denK <= Number(recDoK);
          let cenaKlik = Number(info.cost) > 0 ? Number(info.cost) : 1;
          if (recFreeK) cenaKlik = 0;
          if (zbyvaji2 < cenaKlik) return;

          State.set('investigationActionsLeft', zbyvaji2 - cenaKlik);
          State.odhalInfoPripadu(pripad.id, info.id);

          const odhaleneEl = document.getElementById('pripad-odhalene-info');
          _zobrazOdhalenoInfo(odhaleneEl, info);

          const fb = document.getElementById('case-wf-find-' + info.id);
          if (fb) {
            const tx = fb.querySelector('.case-wf-finding-text');
            _wfNastavRichText(tx, info.reveal || '');
            fb.classList.remove('skryto');
          }

          _aktualizujPruzkumPanel(pripad, onRozsudek);
          _wfPoPrvniAkciPruzkumu(pripad, onRozsudek);
          Desk.aktualizujVse();
          State.upravRys('Moudrost', Traits.aplikovatNasobekMoudrostiZaAkci(3));
          State.uloz();
        });
      }

      wfAkce?.appendChild(btn);
    }
    _wfClueVykresliPotvrzeni(pripad, onRozsudek);
    _wfAktualizujHeaderAkciPripadu();
  }

  function _zobrazOdhalenoInfo(kontejner, info) {
    const el = document.createElement('div');
    el.className = 'odhalene-info case-wf-odhalene-block';
    el.innerHTML = `
      <div class="odhalene-info-label">ZJIŠTĚNO</div>
      <div class="odhalene-info-text">${_wfRichTextHtml(info.reveal || '')}</div>
    `;
    kontejner.appendChild(el);
  }

  function _zobrazRozsudky(pripad, onRozsudek) {
    const seznam = document.getElementById('rozsudky-seznam');
    if (seznam) seznam.innerHTML = '';
    _zobrazRozsudkyWireframe(pripad, onRozsudek);
  }

  function _rozsudekTrida(id) {
    const s = String(id || '');
    if (s.startsWith('guilty_')) return 'btn-rozsudek--vinen';
    if (s.startsWith('not_guilty_')) return 'btn-rozsudek--zprosit';
    if (s.startsWith('insufficient_')) return '';
    if (s.includes('prison') || s === 'maximum' || s === 'guilty') return 'btn-rozsudek--vinen';
    if (s === 'acquit' || s === 'zprostit') return 'btn-rozsudek--zprosit';
    return '';
  }

  /** Všechny verdikty ze spisu; zvolený zlatě + VYŘEŠENO, ostatní šedě bez kliknutí. */
  function _zobrazRozsudkyReadonly(pripad, zaznam) {
    const seznam =
      document.getElementById('case-wf-verdict-readonly') ||
      document.getElementById('rozsudky-seznam');
    if (!seznam) return;
    seznam.innerHTML = '';

    const vsechny = pripad.verdicts || [];
    if (!vsechny.length) {
      const el = document.createElement('div');
      el.className = 'rozsudek-readonly-prazdne';
      el.textContent = 'Žádné možnosti rozsudku ve spisu.';
      seznam.appendChild(el);
      return;
    }

    const typ = _typPripaduProVizual(pripad);
    const zId = zaznam && zaznam.verdictId ? String(zaznam.verdictId) : null;
    const zText = zaznam && zaznam.verdict ? String(zaznam.verdict) : null;

    let nejakaVybrana = false;
    for (const rozsudek of vsechny) {
      const vybrany = (zId && String(rozsudek.id) === zId) || (!zId && zText && rozsudek.text === zText);
      if (vybrany) nejakaVybrana = true;
      const trida = _rozsudekTrida(rozsudek.id);

      const karta = document.createElement('div');
      karta.className = vybrany
        ? `rozsudek-karta rozsudek-karta--vyreseno pripad-typ--${typ} ${trida}`.trim()
        : `rozsudek-karta rozsudek-karta--nezvoleno ${trida}`.trim();
      karta.setAttribute('role', 'group');
      karta.setAttribute('aria-disabled', vybrany ? 'false' : 'true');

      const inner = document.createElement('div');
      inner.className = vybrany ? 'rozsudek-karta-inner' : 'rozsudek-karta-inner rozsudek-karta-inner--nezvoleno';
      if (vybrany) {
        const raz = document.createElement('span');
        raz.className = 'rozsudek-razitko-vyreseno pripad-typ--' + typ;
        raz.setAttribute('aria-hidden', 'true');
        raz.textContent = 'VYŘEŠENO';
        inner.appendChild(raz);
      }
      const textWrap = document.createElement('div');
      textWrap.className = 'rozsudek-karta-text';
      const radek = document.createElement('div');
      radek.className = 'rozsudek-radek-hlavni';
      const nazev = document.createElement('span');
      nazev.className = 'rozsudek-nazev';
      nazev.textContent = rozsudek.text || '—';
      radek.appendChild(nazev);
      textWrap.appendChild(radek);
      if (rozsudek.consequence) {
        const cons = document.createElement('div');
        cons.className = 'rozsudek-consequence';
        cons.textContent = rozsudek.consequence;
        textWrap.appendChild(cons);
      }
      if (vybrany) {
        const radkyEf =
          (zaznam && zaznam.dusledkyRadky && zaznam.dusledkyRadky.length)
            ? zaznam.dusledkyRadky
            : vypoctiDusledkyRadky(
              (zaznam && zaznam.consequences) || rozsudek.consequences || {}
            );
        const komp = _dusledkyVytvorKompaktEfekty(radkyEf);
        if (komp.childElementCount) textWrap.appendChild(komp);
      }
      inner.appendChild(textWrap);
      karta.appendChild(inner);
      seznam.appendChild(karta);
    }

    if ((zId || zText) && !nejakaVybrana) {
      const el = document.createElement('div');
      el.className = 'rozsudek-readonly-prazdne';
      el.textContent = 'Uložený rozsudek neodpovídá žádné variantě ve spisu (změna dat?).';
      seznam.appendChild(el);
    } else if (!zId && !zText) {
      const el = document.createElement('div');
      el.className = 'rozsudek-readonly-prazdne';
      el.textContent = 'V archivu chybí záznam rozsudku — zobrazeny jsou jen možnosti ze spisu.';
      seznam.appendChild(el);
    }

    _wfZamkniInteraktivniVerdiktReadonlyDom();
  }

  /** Štítek v záhlaví případu — výhradně z herního `type` (po normalizaci v Cases). */
  function _stitulekTypuPripadu(pripad) {
    const typ = Cases.typProZobrazeni(pripad);
    if (!_TYPY_PRIPADU.includes(typ)) return 'PŘÍPAD';
    const NAZVY = {
      rutinni: 'RUTINNÍ PŘÍPAD',
      moralni: 'MORÁLNÍ PŘÍPAD',
      politicky: 'POLITICKÝ PŘÍPAD',
      osobni: 'OSOBNÍ PŘÍPAD'
    };
    return NAZVY[typ] || 'PŘÍPAD';
  }

  // --- VEČERNÍ / NEDĚLNÍ VOLBA — jednotná aplikace efektů ---

  /**
   * Aplikuje finance, rysy, frakce, důvěru a flags z jedné možnosti (večer i neděle).
   */
  function aplikujVecerniNeboNedelniMoznost(moznost) {
    if (!moznost || typeof moznost !== 'object') return;
    const fin = Number(moznost.finance);
    if (Number.isFinite(fin) && fin !== 0) {
      State.upravFinance(fin);
    }
    if (moznost.effects && typeof moznost.effects === 'object') {
      const frakceKlice = { Moc: true, Kapital: true, Lid: true };
      for (const [klic, delta] of Object.entries(moznost.effects)) {
        if (klic === 'flags' || klic === 'trust') continue;
        const d = Number(delta);
        if (!Number.isFinite(d)) continue;
        if (frakceKlice[klic]) State.upravFrakci(klic, d);
        else State.upravRys(klic, d);
      }
    }
    if (moznost.trust && typeof moznost.trust === 'object') {
      for (const [npcId, delta] of Object.entries(moznost.trust)) {
        State.upravDuveru(npcId, delta);
      }
    }
    if (moznost.effects?.flags && Array.isArray(moznost.effects.flags)) {
      for (const flag of moznost.effects.flags) {
        if (flag && flag.key) State.set('flags.' + flag.key, flag.value);
      }
    }
    if (typeof Finance !== 'undefined' && Finance.zkontrolujCilOperace) {
      Finance.zkontrolujCilOperace();
    }
  }

  /** Ranní modal 23. března — nabídka Haase / Karas / odložení, nebo volitelná nabídka při dostatečných úsporách. */
  function zobrazModalDen23Krize(callback) {
    const wrap = document.getElementById('modal-den23-krize');
    const textEl = document.getElementById('den23-krize-text');
    const volby = document.getElementById('den23-krize-volby');
    if (!wrap || !textEl || !volby) {
      if (callback) callback();
      return;
    }

    const bal = Number(State.get('finance.balance')) || 0;
    const den = Number(State.get('currentDay')) || 23;
    volby.innerHTML = '';

    const hotovo = () => {
      State.set('flags.haas_nabidka_den23_vyresena', true);
      _zavriModal('modal-den23-krize');
      if (typeof Finance !== 'undefined' && Finance.zkontrolujCilOperace) {
        Finance.zkontrolujCilOperace();
      }
      State.uloz();
      if (callback) callback();
    };

    if (bal < 400) {
      textEl.textContent =
        'Do uzávěrky zbývá málo času a na stole není dost na operaci. ' +
        'Advokát Haas přichází s obálkou. Lichvář Karas čeká v předsíni. Nebo můžete riskovat odklad — a doufat.';
      const varianty = [
        {
          text: 'Přijmout 300 Kč od Haase (Integrita −15)',
          run() {
            State.upravFinance(300);
            State.upravRys('Integrita', -15);
          }
        },
        {
          text: 'Půjčit si 150 Kč u Karase (splátka do týdne)',
          run() {
            State.upravFinance(150);
            State.upravDuveru('karas', 1);
            State.set('flags.karas_dluh_do_dne', den + 7);
          }
        },
        {
          text: 'Odložit operaci — snášet tíhu doma (Naděje −10, Vina +8)',
          run() {
            State.upravRys('Nadeje', -10);
            State.upravRys('Vina', 8);
            State.set('flags.operace_odlozena', true);
          }
        }
      ];
      for (const v of varianty) {
        const btn = document.createElement('button');
        btn.className = 'btn-vecer';
        btn.type = 'button';
        btn.textContent = v.text;
        btn.addEventListener('click', () => {
          v.run();
          hotovo();
        });
        volby.appendChild(btn);
      }
    } else {
      textEl.textContent =
        'Úspory na operaci stačí — ale Haas přichází s obchodem: 300 Kč za přízeň v příštím spisu. ' +
        'Můžete odmítnout bez následků.';
      const prijm = document.createElement('button');
      prijm.className = 'btn-vecer';
      prijm.type = 'button';
      prijm.textContent = 'Přijmout 300 Kč od Haase (Integrita −15)';
      prijm.addEventListener('click', () => {
        State.upravFinance(300);
        State.upravRys('Integrita', -15);
        hotovo();
      });
      const odmit = document.createElement('button');
      odmit.className = 'btn-vecer';
      odmit.type = 'button';
      odmit.textContent = 'Odmítnout nabídku';
      odmit.addEventListener('click', () => {
        hotovo();
      });
      volby.appendChild(prijm);
      volby.appendChild(odmit);
    }

    _otevriModal('modal-den23-krize');
  }

  // --- VEČERNÍ VOLBA ---

  function zobrazVecerniVolbu(denDat, callback) {
    const volba = denDat?.evening_choice;
    if (!volba) {
      if (callback) callback(null);
      return;
    }

    const casVecer = document.querySelector('#modal-vecer .vecer-cas');
    if (casVecer) casVecer.textContent = 'VEČER';

    document.getElementById('vecer-text').textContent = volba.text;

    const volbyEl = document.getElementById('vecer-volby');
    volbyEl.innerHTML = '';

    for (const moznost of volba.options) {
      const btn = document.createElement('button');
      btn.className = 'btn-vecer';
      btn.textContent = moznost.text;
      const ok = _wfMoznostMaDostatekZdroju(moznost);
      btn.disabled = !ok;
      if (!ok && Number(moznost.finance) < 0) {
        btn.title = 'Nedostatek financí.';
      } else if (!ok) {
        btn.title = 'Tato volba teď není k dispozici.';
      }
      btn.addEventListener('click', () => {
        if (!_wfMoznostMaDostatekZdroju(moznost)) return;
        _zavriModal('modal-vecer');
        if (callback) callback(moznost);
      });
      volbyEl.appendChild(btn);
    }

    _otevriModal('modal-vecer');
  }

  /** Nedělní volba A–E — stejný modal jako večer, jiný nadpis. */
  function zobrazNedelniVolbu(denDat, callback) {
    const nv = denDat?.nedelni_volba;
    if (!nv || !Array.isArray(nv.options) || nv.options.length === 0) {
      if (callback) callback(null);
      return;
    }

    const casEl = document.querySelector('#modal-vecer .vecer-cas');
    if (casEl) casEl.textContent = 'NEDĚLE';

    document.getElementById('vecer-text').textContent = nv.text || 'Jak strávíš neděli?';

    const volbyEl = document.getElementById('vecer-volby');
    volbyEl.innerHTML = '';

    for (const moznost of nv.options) {
      const btn = document.createElement('button');
      btn.className = 'btn-vecer';
      btn.textContent = moznost.text;
      const okN = _wfMoznostMaDostatekZdroju(moznost);
      btn.disabled = !okN;
      if (!okN && Number(moznost.finance) < 0) btn.title = 'Nedostatek financí.';
      else if (!okN) btn.title = 'Tato volba teď není k dispozici.';
      btn.addEventListener('click', () => {
        if (!_wfMoznostMaDostatekZdroju(moznost)) return;
        _zavriModal('modal-vecer');
        const id = moznost.id;
        if (['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].includes(id)) {
          State.set('nedele_volba', id);
        }
        if (id === 'C') State.set('pondeli_moudrost_extra', true);
        if (id === 'E') State.set('pondeli_vina_emotivni', true);
        aplikujVecerniNeboNedelniMoznost(moznost);
        const denN = Number(State.get('currentDay')) || 0;
        if (id === 'F' && denN > 0) {
          State.set('flags.records_free_until_day', denN + 5);
        }
        const ft = moznost.fragment_text;
        if (ft && String(ft).trim()) {
          zobrazFragment({
            type:  'letter',
            title: moznost.fragment_title || 'Chvíle',
            text:  String(ft)
          }, () => {
            if (casEl) casEl.textContent = 'VEČER';
            if (callback) callback(moznost);
          });
        } else {
          if (casEl) casEl.textContent = 'VEČER';
          if (callback) callback(moznost);
        }
      });
      volbyEl.appendChild(btn);
    }

    _otevriModal('modal-vecer');
  }

  /** Sobotní shrnutí týdne — po zavření volá callback (Engine tam aplikuje bonusy). */
  function zobrazTydenniShrnuti(payload, callback) {
    const tit = document.getElementById('tyden-shrnuti-titulek');
    const hlavni = document.getElementById('tyden-shrnuti-hlavni');
    const jemne = document.getElementById('tyden-shrnuti-jemne');
    const btn = document.getElementById('tyden-shrnuti-pokracovat');
    if (!tit || !hlavni || !jemne || !btn) {
      if (callback) callback();
      return;
    }

    tit.textContent = payload?.titulek || 'Konec pracovního týdne';
    hlavni.textContent = payload?.hlavni || '';
    jemne.innerHTML = (payload?.jemneRadky || [])
      .map(r => '<p class="tyden-shrnuti-jemne-radek">' + String(r) + '</p>')
      .join('');

    const novyBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(novyBtn, btn);
    novyBtn.addEventListener('click', () => {
      _zavriModal('modal-tyden-shrnuti');
      if (callback) callback();
    });

    _otevriModal('modal-tyden-shrnuti');
  }

  // --- FRAGMENT ---

  function zobrazFragment(fragment, callback) {
    const panel = document.getElementById('fragment-panel');
    const nadpis = document.getElementById('fragment-nadpis');
    const text = document.getElementById('fragment-text');

    if (!panel || !fragment) {
      if (callback) callback();
      return;
    }

    // Typ panelu
    panel.className = 'panel-papir fragment-panel panel-papir--nastup';
    const typTrida = Narrative.getTYP_PANEL()[fragment.type];
    if (typTrida) panel.classList.add(typTrida);

    const typNadpis = Narrative.getTYP_NADPIS()[fragment.type] || 'Záznam';
    nadpis.textContent = fragment.title || typNadpis;
    text.innerHTML = (fragment.text || '').replace(/\n/g, '<br>');

    const zavritBtn = document.getElementById('fragment-zavrit');
    const novyZavrit = zavritBtn.cloneNode(true);
    novyZavrit.textContent = 'Pokračovat →';
    zavritBtn.parentNode.replaceChild(novyZavrit, zavritBtn);
    novyZavrit.addEventListener('click', () => {
      _zavriModal('modal-fragment');
      if (callback) callback();
    });

    _otevriModal('modal-fragment');
  }

  // --- ARCHIV (ŠUPLÍK) ---

  function _prepniArchivTab(tab) {
    document.querySelectorAll('.archiv-tab').forEach(t => {
      t.classList.toggle('archiv-tab--aktivni', t.dataset.tab === tab);
    });
    _vyplnArchivTab(tab);
  }

  /**
   * @param {string} [tab='rozsudky'] — např. 'finance' po kliknutí na panel financí na stole.
   */
  function zobrazArchiv(tab) {
    const t = tab && typeof tab === 'string' ? tab : 'rozsudky';
    _prepniArchivTab(t);
    _otevriModal('modal-archiv');
  }

  function _vyplnArchivTab(tab) {
    const obsah = document.getElementById('archiv-obsah');
    if (!obsah) return;

    if (tab === 'stav-duse') {
      obsah.innerHTML = '';
      const wrap = document.createElement('div');
      const rysyArchiv = ['Integrita', 'Odvaha', 'Moudrost', 'Vina', 'Nadeje'];
      for (const nazev of rysyArchiv) {
        const vRaw = State.get('traits.' + nazev);
        const v = Number.isFinite(Number(vRaw)) ? Number(vRaw) : 50;
        let nb = '—';
        if (typeof Traits !== 'undefined' && Traits.getTraitText) {
          nb = Traits.getTraitText(nazev, v).notebook || '—';
        }
        const entry = document.createElement('div');
        entry.style.marginBottom = '1.15rem';
        const title = document.createElement('div');
        title.className = 'archiv-rozsudek-den';
        title.style.display = 'block';
        title.style.minWidth = '0';
        title.style.marginBottom = '5px';
        title.style.letterSpacing = '0.18em';
        title.textContent = `${nazev.toUpperCase()} (${Math.round(v)})`;
        const body = document.createElement('div');
        body.className = 'archiv-rozsudek-nazev';
        body.style.display = 'block';
        body.style.flex = 'none';
        body.style.width = '100%';
        body.innerHTML = _escapeHtmlProfil(nb).replace(/\n/g, '<br>');
        entry.appendChild(title);
        entry.appendChild(body);
        wrap.appendChild(entry);
      }
      obsah.appendChild(wrap);

    } else if (tab === 'finance') {
      const p = Finance.getPrehled();
      const krize = p.zustatek < 50
        ? '<p class="finance-krize">Méně než 50 Kč — každá koruna bolí.</p>'
        : '';
      obsah.innerHTML = `
        <div class="finance-widget">
          <div class="finance-radek">
            <span>Měsíční plat</span>
            <span class="finance-castka finance-castka--plus">+${p.plat} Kč</span>
          </div>
          <div class="finance-radek">
            <span>Týdenní výdaje</span>
            <span class="finance-castka finance-castka--minus">-${p.vydaje} Kč</span>
          </div>
          <div class="finance-radek">
            <span>Plat za</span>
            <span class="finance-castka">${p.dniDoPlatby} dní</span>
          </div>
          <div class="finance-radek">
            <span>Zůstatek</span>
            <span class="finance-castka">${p.zustatek} Kč</span>
          </div>
          ${krize}
        </div>
      `;

    } else if (tab === 'postavy') {
      obsah.innerHTML = '';
      const frakceWrap = document.createElement('div');
      frakceWrap.className = 'archiv-rozsudek-item';
      frakceWrap.style.display = 'block';
      frakceWrap.style.marginBottom = '14px';
      frakceWrap.style.cursor = 'default';
      const moc = Number(State.get('factions.Moc') ?? 50);
      const kapital = Number(State.get('factions.Kapital') ?? 50);
      const lid = Number(State.get('factions.Lid') ?? 50);
      frakceWrap.innerHTML =
        '<span class="archiv-rozsudek-den">FRAKCE (TEST)</span>' +
        '<span class="archiv-rozsudek-nazev">Moc: ' + Math.round(moc) +
        ' | Kapitál: ' + Math.round(kapital) +
        ' | Lid: ' + Math.round(lid) + '</span>';
      obsah.appendChild(frakceWrap);
      const grid = document.createElement('div');
      grid.className = 'postavy-mrizka';
      for (const v of Characters.getSeznamVizitek()) {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'postava-vizitka';
        card.dataset.npcId = v.id;
        const duvera = Characters.getDuveraVizitka(v.id);
        card.innerHTML =
          '<div class="postava-vizitka__radek">' +
            '<div class="postava-vizitka__left">' +
              '<div class="postava-vizitka-jmeno">' + v.jmeno + '</div>' +
              '<div class="postava-vizitka-role">' + v.role + '</div>' +
            '</div>' +
            '<div class="postava-duvera" data-npc-id="' + v.id + '">' + duvera + '</div>' +
          '</div>';
        card.addEventListener('click', () => {
          _otevriProfilPostavy(v.id);
        });
        grid.appendChild(card);
      }
      obsah.appendChild(grid);

    } else if (tab === 'rozsudky') {
      const rozsudky = State.get('archive.verdicts') || [];
      if (!rozsudky.length) {
        obsah.innerHTML = '<p style="color: var(--barva-text-slaby); font-style: italic; text-align: center;">Zatím žádné vyřešené případy.</p>';
        return;
      }
      obsah.innerHTML = '';
      rozsudky.forEach(r => {
        const item = document.createElement('div');
        item.className = 'archiv-rozsudek-item';
        item.innerHTML = `
          <span class="archiv-rozsudek-den">Den ${r.day}</span>
          <span class="archiv-rozsudek-nazev">${r.caseTitle}</span>
          <span class="archiv-rozsudek-verdict">${r.verdict}</span>
        `;
        item.addEventListener('click', () => {
          const pripad = DataLoader.ziskejPripad(r.caseId);
          if (pripad) {
            _zavriModal('modal-archiv');
            zobrazPripadReadonly(pripad);
          }
        });
        obsah.appendChild(item);
      });

    } else if (tab === 'fragmenty') {
      const fragmenty = State.get('archive.fragments') || [];
      if (!fragmenty.length) {
        obsah.innerHTML = '<p style="color: var(--barva-text-slaby); font-style: italic; text-align: center;">Zatím žádné přečtené záznamy.</p>';
        return;
      }
      obsah.innerHTML = fragmenty.map(id => {
        const f = DataLoader.ziskejFragment(id);
        if (!f) return '';
        return `
          <div class="archiv-rozsudek-item" style="cursor:pointer;" onclick="Narrative.zobrazFragment('${id}')">
            <span class="archiv-rozsudek-den">${Narrative.getTYP_NADPIS()[f.type] || '—'}</span>
            <span class="archiv-rozsudek-nazev">${f.title || id}</span>
          </div>
        `;
      }).join('');
    }
  }

  function _escapeHtmlProfil(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function _otevriHistorieDetailModal(zaznam) {
    const nadpis = document.getElementById('postava-historie-detail-nadpis');
    const telo = document.getElementById('postava-historie-detail-text');
    if (!nadpis || !telo) return;
    const radek = 'Den ' + Number(zaznam.day) + ' — ' + (zaznam.summary || 'Setkání');
    nadpis.textContent = radek;
    const plny = (zaznam.fullText || '').trim();
    if (plny) {
      telo.innerHTML = _escapeHtmlProfil(plny).replace(/\n/g, '<br>');
    } else {
      telo.innerHTML = '<p class="postava-historie-detail-prazdne">Úplný text není k dispozici.</p>';
    }
    _otevriModal('modal-postava-historie-detail');
  }

  function _otevriProfilPostavy(npcId) {
    const v = Characters.getSeznamVizitek().find(x => x.id === npcId);
    if (!v) return;
    const jmeno = document.getElementById('postava-profil-jmeno');
    const role = document.getElementById('postava-profil-role');
    const duveraEl = document.getElementById('postava-profil-duvera');
    const popis = document.getElementById('postava-profil-popis');
    const vliv = document.getElementById('postava-profil-vliv');
    const historie = document.getElementById('postava-profil-historie');
    if (!jmeno || !role || !duveraEl || !popis || !vliv || !historie) return;
    jmeno.textContent = v.jmeno;
    role.textContent = v.role;
    duveraEl.dataset.npcId = v.id;
    duveraEl.textContent = Characters.getDuveraVizitka(v.id);
    popis.innerHTML = v.popis.split('\n').join('<br>');

    const vlivText = Characters.getVlivNaHrace(npcId);
    vliv.innerHTML = vlivText
      ? vlivText.split('\n').map(radek =>
          '<p class="postava-profil-vliv-radek">' + _escapeHtmlProfil(radek) + '</p>'
        ).join('')
      : '<p class="postava-profil-vliv-radek">—</p>';

    const zaznamy = Characters.getHistorieSetkani(npcId);
    historie.innerHTML = '';
    if (zaznamy.length === 0) {
      const p = document.createElement('p');
      p.className = 'postava-profil-historie-prazdne';
      p.textContent = 'Zatím jste se nesetkali.';
      historie.appendChild(p);
    } else {
      const wrap = document.createElement('div');
      wrap.className = 'postava-historie-radky';
      for (let i = 0; i < zaznamy.length; i++) {
        const z = zaznamy[i];
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'postava-historie-radek';
        const txt = 'Den ' + Number(z.day) + ' — ' + (z.summary || 'Setkání');
        btn.innerHTML =
          '<span class="postava-historie-radek-text">' + _escapeHtmlProfil(txt) + '</span>' +
          '<span class="postava-historie-radek-sipka" aria-hidden="true">›</span>';
        btn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          _otevriHistorieDetailModal(z);
        });
        wrap.appendChild(btn);
      }
      historie.appendChild(wrap);
    }

    _otevriModal('modal-postava-profil');
  }

  function syncPostavyDuvera() {
    const archiv = document.getElementById('modal-archiv');
    if (archiv && archiv.classList.contains('aktivni')) {
      const tabAktivni = document.querySelector('.archiv-tab--aktivni');
      if (tabAktivni && tabAktivni.dataset.tab === 'postavy') {
        _vyplnArchivTab('postavy');
      }
      if (tabAktivni && tabAktivni.dataset.tab === 'stav-duse') {
        _vyplnArchivTab('stav-duse');
      }
    }
    const profil = document.getElementById('modal-postava-profil');
    if (profil && profil.classList.contains('aktivni')) {
      const el = document.getElementById('postava-profil-duvera');
      const id = el && el.dataset.npcId;
      if (id) el.textContent = Characters.getDuveraVizitka(id);
    }
  }

  // --- STAVOVÁ ZPRÁVA ---

  let _zpravaCasovac = null;

  function zobrazStavovouZpravu(text, trvani = 6200) {
    const el = document.getElementById('stavova-zprava');
    if (!el) return;
    el.textContent = text;
    el.classList.add('viditelna');

    if (_zpravaCasovac) clearTimeout(_zpravaCasovac);
    _zpravaCasovac = setTimeout(() => {
      el.classList.remove('viditelna');
    }, trvani);
  }

  // --- ZÁLOŽKY PŘÍPADU ---

  function _prepniTabPripadu(tabId) {
    const tabs = document.querySelectorAll('.pripad-tab');
    if (!tabs.length) return;
    tabs.forEach(t => {
      t.classList.toggle('pripad-tab--aktivni', t.dataset.tab === tabId);
    });
    document.querySelectorAll('.pripad-tab-obsah').forEach(obsah => {
      obsah.classList.toggle('aktivni', obsah.dataset.tab === tabId);
    });
  }

  // --- MENU ---

  function _textProSlotUlozeni(pozice) {
    const p = State.peekUlozene(pozice);
    if (p) return 'Uloženo: den ' + p.currentDay;
    return 'Prázdná záloha';
  }

  function _aktualizujTextyMenuSlotu() {
    const autoBtn = document.getElementById('menu-nacist-auto');
    if (autoBtn) {
      const a = State.peekAutosave();
      if (a) {
        autoBtn.textContent = 'Načíst automatické uložení — den ' + a.currentDay;
        autoBtn.disabled = false;
        autoBtn.title = 'Načíst poslední automatické uložení (během hry se přepisuje)';
      } else {
        autoBtn.textContent = 'Žádné automatické uložení';
        autoBtn.disabled = true;
        autoBtn.title = 'Automatické uložení vznikne po chvíli hraní';
      }
    }
    for (const poz of [1, 2]) {
      const txt = _textProSlotUlozeni(poz);
      const maUlozku = !!State.peekUlozene(poz);
      const ulozBtn = document.getElementById('menu-ulozit-' + poz);
      const nacistBtn = document.getElementById('menu-nacist-' + poz);
      if (ulozBtn) {
        ulozBtn.textContent = txt;
        ulozBtn.disabled = false;
        ulozBtn.title = maUlozku
          ? 'Přepsat tuto ruční zálohu aktuální hrou'
          : 'Uložit aktuální postup do této prázdné zálohy';
      }
      if (nacistBtn) {
        nacistBtn.textContent = txt;
        nacistBtn.disabled = !maUlozku;
        nacistBtn.title = maUlozku
          ? 'Načíst ruční zálohu z této pozice'
          : 'V této záloze není uložená hra';
      }
    }
  }

  function _otevriMenu() {
    const modal = document.getElementById('modal-menu');
    if (!modal) return;
    _aktualizujTextyMenuSlotu();
    modal.classList.remove('skryto');
    modal.classList.add('aktivni');
  }

  function _zavriMenu() {
    const modal = document.getElementById('modal-menu');
    if (!modal) return;
    modal.classList.remove('aktivni');
    modal.classList.add('skryto');
  }

  function _zobrazOHre() {
    const text =
      'IN DUBIO\n\n' +
      'Textová soudní hra zasazená do středoevropského státu roku 1931.\n\n' +
      'Hráč hraje roli soudce Dr. Benedikta Vraného s temnou minulostí. ' +
      'Každý rozsudek má cenu.\n\n' +
      'Uložení je v tomto prohlížeči (localStorage): automatické uložení během hry ' +
      'a dvě nezávislé ruční zálohy. ' +
      'Na jiném zařízení nebo v jiném prohlížeči uložená pozice není; ' +
      'po vymazání dat stránky nebo v soukromém okně může zmizet.\n\n' +
      'Verze: 0.1 (vývoj)';
    alert(text);
  }

  // --- INICIALIZACE LISTENERY ---

  function inicializuj() {
    // Zápisník na stole — archiv (záložka Rozsudky)
    document.getElementById('desk-notebook')?.addEventListener('click', () => {
      if (typeof SFX !== 'undefined') SFX.penWriting();
      zobrazArchiv('rozsudky');
    });

    // Panel financí na stole → totéž okno archivu, záložka Finance (bez linky operace / Haas v obsahu)
    document.querySelector('.pravy-panel-finance-wrap')?.addEventListener('click', () => {
      zobrazArchiv('finance');
    });

    // Zavřít případ tlačítkem X
    document.getElementById('pripad-zavrit-x')?.addEventListener('click', () => {
      _zavriPripadModal();
    });

    // Escape zavírá modaly
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const modalPripad = document.getElementById('modal-pripad');
        const prelude = document.getElementById('pripad-consequence-prelude');
        const af = document.getElementById('case-wf-aftermath');
        const tag = (e.target && e.target.tagName) || '';
        if (
          modalPripad &&
          modalPripad.classList.contains('aktivni') &&
          ((prelude && !prelude.classList.contains('skryto')) ||
           (af && af.classList.contains('case-wf-aftermath--visible'))) &&
          _predohraConsequenceCtx &&
          typeof _predohraConsequenceCtx.dokonci === 'function' &&
          tag !== 'INPUT' &&
          tag !== 'TEXTAREA'
        ) {
          e.preventDefault();
          _predohraConsequenceCtx.dokonci();
          return;
        }
      }
      if (e.key === 'Escape') {
        const menu = document.getElementById('modal-menu');
        if (menu && !menu.classList.contains('skryto')) {
          _zavriMenu();
          return;
        }
        const historieDetail = document.getElementById('modal-postava-historie-detail');
        if (historieDetail && historieDetail.classList.contains('aktivni')) {
          _zavriModal('modal-postava-historie-detail');
          return;
        }
        const profilPostavy = document.getElementById('modal-postava-profil');
        if (profilPostavy && profilPostavy.classList.contains('aktivni')) {
          _zavriModal('modal-postava-profil');
          return;
        }
        const modalDusledky = document.getElementById('modal-dusledky');
        if (modalDusledky && modalDusledky.classList.contains('aktivni')) {
          _dusledkyPreskocAnimace();
          return;
        }
        const modalPripad = document.getElementById('modal-pripad');
        const prelude = document.getElementById('pripad-consequence-prelude');
        const af = document.getElementById('case-wf-aftermath');
        if (modalPripad && modalPripad.classList.contains('aktivni') &&
            ((prelude && !prelude.classList.contains('skryto')) ||
             (af && af.classList.contains('case-wf-aftermath--visible'))) &&
            _predohraConsequenceCtx && typeof _predohraConsequenceCtx.dokonci === 'function') {
          _predohraConsequenceCtx.dokonci();
          return;
        }
        _zavriPripadModal();
        _zavriModal('modal-archiv');
      }
    });

    // Zavřít archiv
    document.getElementById('archiv-zavrit')?.addEventListener('click', () => {
      _zavriModal('modal-archiv');
    });

    document.getElementById('postava-profil-zavrit')?.addEventListener('click', () => {
      _zavriModal('modal-postava-profil');
    });

    document.getElementById('postava-historie-detail-zavrit')?.addEventListener('click', () => {
      _zavriModal('modal-postava-historie-detail');
    });

    // Taby archivu
    document.querySelectorAll('.archiv-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        _prepniArchivTab(tab.dataset.tab);
      });
    });

    // Zavřít modaly kliknutím na overlay
    document.querySelectorAll('.overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay && overlay.id !== 'modal-fragment') {
          // Případ a archiv lze zavřít kliknutím vedle
          // Fragment vyžaduje explicitní akci
          if (overlay.id === 'modal-archiv' ||
              overlay.id === 'modal-postava-historie-detail' ||
              overlay.id === 'modal-postava-profil') {
            _zavriModal(overlay.id);
          }
          if (overlay.id === 'modal-dusledky') {
            _dusledkyPreskocAnimace();
          }
        }
      });
    });

    // Vlčkův dopis
    document.getElementById('vlcek-dopis')?.addEventListener('click', () => {
      Engine.otevriVlcekuvDopis();
    });

    // Záložky případu — delegace na kontejner
    document.getElementById('pripad-tabs')?.addEventListener('click', (e) => {
      const tab = e.target.closest('.pripad-tab');
      if (tab) _prepniTabPripadu(tab.dataset.tab);
    }); /* pripad-tabs odstraněny — listener se neregistruje */

    document.getElementById('modal-pripad')?.addEventListener('click', (e) => {
      const clueEl = e.target && e.target.closest ? e.target.closest('.clue[data-clue-id]') : null;
      if (!clueEl) return;
      const modalPripad = document.getElementById('modal-pripad');
      if (!modalPripad || !modalPripad.classList.contains('aktivni')) return;
      if (modalPripad.dataset.verdictMode === 'readonly') return;
      if (_wfJeAktivniDopadovaVrstvaPripadu()) return;
      if (clueEl.classList.contains('clue--locked')) {
        zobrazStavovouZpravu('Osa stop je potvrzená. Další kombinace jsou v tomto spisu uzamčené.');
        return;
      }
      e.preventDefault();
      _wfClueZpracujKlik(clueEl);
    });

    // Hamburger menu
    document.getElementById('btn-menu')?.addEventListener('click', () => {
      _otevriMenu();
    });

    document.getElementById('menu-zavrit')?.addEventListener('click', () => {
      _zavriMenu();
    });

    document.getElementById('menu-nova-hra')?.addEventListener('click', () => {
      _zavriMenu();
      if (confirm('Opravdu začít novou hru? Neuložený postup bude ztracen.')) {
        State.reset();
        location.reload();
      }
    });

    function _handlerUlozPozici(pozice) {
      const denAktualni = Number(State.get('currentDay'));
      const stara = State.peekUlozene(pozice);
      let ok;
      if (stara) {
        ok = window.confirm(
          'Opravdu přepsat ruční zálohu?\n\n' +
          'V této záloze je uložen den ' + stara.currentDay + '.\n' +
          'Aktuální běžící hra je den ' + denAktualni + ' — po uložení zde zůstane jen tento stav.\n\n' +
          'Pokračovat a přepsat?'
        );
      } else {
        ok = window.confirm(
          'Uložit aktuální postup (den ' + denAktualni + ') do této prázdné zálohy?\n\n' +
          'Později můžete načíst jinou zálohu; neuložené změny v jiném slotu ztratíte, pokud je nepřepíšete úmyslně.'
        );
      }
      if (!ok) return;
      if (!State.uloz(pozice)) {
        zobrazStavovouZpravu(
          'Uložení se nepodařilo (prohlížeč blokuje úložiště, soukromé okno nebo zaplněný disk).'
        );
        return;
      }
      _aktualizujTextyMenuSlotu();
      _zavriMenu();
      zobrazStavovouZpravu(
        stara
          ? 'Uloženo — záloha přepsána (den ' + denAktualni + ').'
          : 'Hra uložena do zálohy (den ' + denAktualni + ').'
      );
    }

    document.getElementById('menu-ulozit-1')?.addEventListener('click', () => _handlerUlozPozici(1));
    document.getElementById('menu-ulozit-2')?.addEventListener('click', () => _handlerUlozPozici(2));

    function _handlerNactiAutosave() {
      const ulozene = State.peekAutosave();
      if (!ulozene) {
        zobrazStavovouZpravu('Automatické uložení zatím neexistuje.');
        return;
      }
      const denAktualni = Number(State.get('currentDay'));
      const ok = window.confirm(
        'Opravdu načíst automatické uložení?\n\n' +
        'V automatickém uložení je den ' + ulozene.currentDay + '.\n' +
        'Aktuálně hrajete den ' + denAktualni + ' — po načtení tento postup nahradí uložený stav.\n\n' +
        '(Ruční zálohy 1 a 2 zůstanou beze změny.)\n\n' +
        'Načíst?'
      );
      if (!ok) return;
      const nacten = State.nactiJenAutosave();
      if (!nacten) {
        zobrazStavovouZpravu('Automatické uložení se nepodařilo načíst.');
        return;
      }
      Engine.syncFromSavedState();
      _aktualizujTextyMenuSlotu();
      _zavriMenu();
      zobrazStavovouZpravu('Automatické uložení načteno — den ' + ulozene.currentDay + '.');
    }

    document.getElementById('menu-nacist-auto')?.addEventListener('click', () => _handlerNactiAutosave());

    function _handlerNactiPozici(pozice) {
      const ulozene = State.peekUlozene(pozice);
      if (!ulozene) {
        zobrazStavovouZpravu('Tato záloha je prázdná — není co načíst.');
        return;
      }
      const denAktualni = Number(State.get('currentDay'));
      const ok = window.confirm(
        'Opravdu načíst ruční zálohu?\n\n' +
        'V záloze je uložen den ' + ulozene.currentDay + '.\n' +
        'Aktuálně hrajete den ' + denAktualni + ' — po načtení tento postup nahradí uložený stav.\n\n' +
        '(Nejprve si můžete běžící hru uložit do druhé zálohy.)\n\n' +
        'Načíst?'
      );
      if (!ok) return;
      const nacten = State.nacti(pozice);
      if (!nacten) {
        zobrazStavovouZpravu('Uloženou hru se nepodařilo načíst.');
        return;
      }
      Engine.syncFromSavedState();
      _aktualizujTextyMenuSlotu();
      _zavriMenu();
      zobrazStavovouZpravu('Hra načtena — den ' + ulozene.currentDay + '.');
    }

    document.getElementById('menu-nacist-1')?.addEventListener('click', () => _handlerNactiPozici(1));
    document.getElementById('menu-nacist-2')?.addEventListener('click', () => _handlerNactiPozici(2));

    document.getElementById('menu-o-hre')?.addEventListener('click', () => {
      _zobrazOHre();
    });

    document.getElementById('modal-menu')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) _zavriMenu();
    });
  }

  function zobrazKonecHry(typ, epilogRadky) {
    const overlay = document.getElementById('konec-hry-overlay');
    const titulek = document.getElementById('konec-titulek');
    const typEl   = document.getElementById('konec-typ');
    const epilogEl = document.getElementById('konec-epilog');

    const TYPY_NAZVY = {
      odvolani: 'Odvolání',
      korupce:  'Korupce',
      atentát:  'Atentát',
      preziti:  'Přežití',
      hrdina:   'Hrdina'
    };

    titulek.textContent = 'IN DUBIO';
    typEl.textContent   = TYPY_NAZVY[typ] || typ;

    epilogEl.innerHTML = epilogRadky.map((radek, i) => `
      <div class="epilog-radek ${radek.klic ? 'epilog-radek--novak' : ''}"
           style="animation-delay: ${1.5 + i * 0.3}s">
        ${radek.postava ? '<strong>' + radek.postava + '.</strong> ' : ''}${radek.text}
      </div>
    `).join('');

    overlay.classList.remove('skryto');

    document.getElementById('konec-restart')?.addEventListener('click', () => {
      State.reset();
      location.reload();
    });
  }

  // Tlačítko Další den
  function zobrazBtnDalsiDen(show) {
    const btn = document.getElementById('btn-dalsi-den');
    if (!btn) return;
    if (show) btn.classList.add('viditelny');
    else      btn.classList.remove('viditelny');
  }

  // Aktualizuj složky případů
  function _vyplnFolderLabelBlok(slozka, pripad, slotIndex) {
    const root = slozka.querySelector('.folder-label');
    if (!root) return;
    const spz = root.querySelector('.folder-spz');
    const tit = root.querySelector('.folder-title');
    const obz = root.querySelector('.folder-defendant');
    if (!pripad) {
      if (spz) spz.textContent = '';
      if (tit) tit.textContent = '';
      if (obz) obz.textContent = '';
      return;
    }
    const cisloSpisu = 47 + slotIndex;
    if (spz) spz.textContent = `Sp. zn. ${cisloSpisu}/1931`;
    const rawTit = ((pripad.title || '').trim() || 'Bez názvu');
    if (tit) tit.textContent = rawTit.toLocaleUpperCase('cs-CZ');
    if (obz) obz.textContent = (pripad.defendant && pripad.defendant.name) ? String(pripad.defendant.name) : '—';
  }

  function _odstranRazitekImg(folder) {
    if (!folder) return;
    const img = folder.querySelector('img.razitko');
    if (img) img.remove();
  }

  function _pridejRazitekImg(folder) {
    if (!folder) return;
    let img = folder.querySelector('img.razitko');
    if (!img) {
      img = document.createElement('img');
      img.className = 'razitko';
      img.alt = '';
      img.decoding = 'async';
      folder.appendChild(img);
    }
    img.src = 'src/razitko.png';
  }

  function aktualizujSlozky(pripady, vyresene) {
    const slotNazvy = ['Složka 1', 'Složka 2', 'Složka 3'];
    for (let i = 0; i < 3; i++) {
      const slozka = document.getElementById('slozka-' + (i + 1));
      if (!slozka) continue;
      const folder = slozka.querySelector('.folder');

      const pripad = pripady[i];

      function _slozkaMeta(label, titulek) {
        slozka.setAttribute('aria-label', label);
        if (titulek) slozka.setAttribute('title', titulek);
        else slozka.removeAttribute('title');
      }

      if (!pripad) {
        _odstranRazitekImg(folder);
        _odstranTypSlozky(slozka);
        slozka.classList.add('slozka--ceka');
        slozka.classList.remove('slozka--aktivni', 'slozka--vyresena');
        slozka.style.opacity = '';
        slozka.style.cursor  = '';
        _nastavVizualSlozkyFolder(slozka, 'rutinni');
        _vyplnFolderLabelBlok(slozka, null, i);
        _slozkaMeta(slotNazvy[i] + ' — načítání', '');
        continue;
      }

      _nastavTypSlozky(slozka, pripad);
      slozka.classList.remove('slozka--ceka');
      slozka.style.opacity = '1';
      slozka.style.cursor  = 'pointer';

      const nazev = (pripad.title || '').trim() || 'Bez názvu';
      _vyplnFolderLabelBlok(slozka, pripad, i);

      if (typeof State !== 'undefined' && State.jePripadUzavren && State.jePripadUzavren(pripad.id)) {
        slozka.classList.add('slozka--vyresena');
        slozka.classList.remove('slozka--aktivni');
        slozka.style.cursor = 'pointer';
        _pridejRazitekImg(folder);
        _slozkaMeta(slotNazvy[i] + ' — ' + nazev + ' (vyřešeno)', nazev + ' — vyřešeno');
      } else {
        slozka.classList.remove('slozka--vyresena');
        slozka.classList.add('slozka--aktivni');
        _odstranRazitekImg(folder);
        _slozkaMeta(slotNazvy[i] + ' — ' + nazev, nazev);
      }
    }
  }

  return {
    otevriModal:      _otevriModal,
    zavriModal:       _zavriModal,
    zavriPripadModal: _zavriPripadModal,
    zavriVsechnyModaly,
    zobrazPripad,
    zobrazPripadReadonly,
    zobrazDusledkyRozsudku,
    vypoctiDusledkyRadky,
    aplikujVecerniNeboNedelniMoznost,
    zobrazVecerniVolbu,
    zobrazNedelniVolbu,
    zobrazModalDen23Krize,
    zobrazTydenniShrnuti,
    zobrazFragment,
    zobrazArchiv,
    syncPostavyDuvera,
    zobrazStavovouZpravu,
    zobrazKonecHry,
    zobrazBtnDalsiDen,
    aktualizujSlozky,
    inicializuj
  };

})();

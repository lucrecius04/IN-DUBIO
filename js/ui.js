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
    // Animace panelu (některé nové modaly už nejsou papírové panely).
    const panel =
      el.querySelector('.narativ-shell') ||
      el.querySelector('.panel-papir') ||
      (el.id === 'modal-archiv' ? el.querySelector('.archiv-panel') : null);
    if (panel) {
      panel.classList.remove('panel-papir--nastup');
      void panel.offsetWidth;
      panel.classList.add('panel-papir--nastup');
    }
  }

  function _zavriModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === 'modal-pripad' && typeof Tutorial !== 'undefined' && Tutorial.zavriVeSpisu) {
      Tutorial.zavriVeSpisu();
    }
    el.classList.remove('aktivni');
  }

  /**
   * Jednotný tmavý dialog pro menu (místo alert/confirm).
   * @returns {Promise<boolean>} true = potvrzeno, false = zrušeno/zavřeno
   */
  function _zobrazMenuDialog(opts) {
    const o = opts && typeof opts === 'object' ? opts : {};
    const modal = document.getElementById('modal-menu-dialog');
    const kicker = document.getElementById('menu-dialog-kicker');
    const nadpis = document.getElementById('menu-dialog-nadpis');
    const text = document.getElementById('menu-dialog-text');
    const confirmBtn = document.getElementById('menu-dialog-confirm');
    const cancelBtn = document.getElementById('menu-dialog-cancel');
    const closeBtn = document.getElementById('menu-dialog-zavrit');
    if (!modal || !nadpis || !text || !confirmBtn || !cancelBtn || !closeBtn) {
      return Promise.resolve(window.confirm(String(o.text || o.title || 'Pokračovat?')));
    }

    kicker.textContent = String(o.kicker || 'Menu').trim() || 'Menu';
    nadpis.textContent = String(o.title || 'Potvrzení').trim() || 'Potvrzení';
    const rawText = String(o.text || '').trim();
    const escapedText = _escapeHtmlProfil(rawText).replace(/\n/g, '<br>');
    if (o.showStudioLogo === true) {
      text.classList.add('menu-dialog-text--with-studio');
      text.innerHTML =
        '<div class="menu-dialog-studio-wrap">' +
          '<img class="menu-dialog-studio-img" src="assets/branding/legio-ultima.png" alt="Legio Ultima" decoding="async">' +
        '</div>' +
        '<div class="menu-dialog-copy">' + escapedText + '</div>';
    } else {
      text.classList.remove('menu-dialog-text--with-studio');
      text.innerHTML = escapedText;
    }
    confirmBtn.textContent = String(o.confirmText || 'Pokračovat').trim() || 'Pokračovat';
    cancelBtn.textContent = String(o.cancelText || 'Zrušit').trim() || 'Zrušit';
    cancelBtn.classList.toggle('skryto', o.cancelHidden === true);

    return new Promise(resolve => {
      let hotovo = false;
      const done = (ok) => {
        if (hotovo) return;
        hotovo = true;
        _zavriModal('modal-menu-dialog');
        modal.removeEventListener('click', onBackdrop);
        confirmBtn.removeEventListener('click', onConfirm);
        cancelBtn.removeEventListener('click', onCancel);
        closeBtn.removeEventListener('click', onCancel);
        resolve(ok);
      };
      const onConfirm = () => done(true);
      const onCancel = () => done(false);
      const onBackdrop = (e) => {
        if (e.target === modal) done(false);
      };

      confirmBtn.addEventListener('click', onConfirm);
      cancelBtn.addEventListener('click', onCancel);
      closeBtn.addEventListener('click', onCancel);
      modal.addEventListener('click', onBackdrop);
      _otevriModal('modal-menu-dialog');
      if (o.cancelHidden === true) confirmBtn.focus();
      else cancelBtn.focus();
    });
  }

  function zavriVsechnyModaly() {
    document.querySelectorAll('.overlay.aktivni').forEach(m => m.classList.remove('aktivni'));
  }

  /**
   * Po načtení zálohy / autosave z menu: zavře herní overlaye (včetně otevřeného spisu), stolní modály
   * novin a dopisu, zastaví případný heartbeat pátrání a přepíše automatické uložení (F5 = načtený stav).
   */
  function obnovUIDataPoNacteniSlotu() {
    zavriVsechnyModaly();
    const mNov = document.getElementById('modal-desk-noviny');
    const mDop = document.getElementById('modal-desk-dopis');
    if (mNov) {
      mNov.classList.remove('aktivni');
      mNov.classList.add('skryto');
    }
    if (mDop) {
      mDop.classList.remove('aktivni');
      mDop.classList.add('skryto');
    }
    if (typeof SFX !== 'undefined' && SFX.zastavPatraniHeartbeat) {
      SFX.zastavPatraniHeartbeat();
    }
    if (typeof State !== 'undefined' && State.uloz) {
      State.uloz();
    }
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
    startedAt: 0,
    timerId: null,
    durationSec: 0,
    origDurationSec: 0,
    config: null,
    best: null,
    hasRun: false,
    lastHeartbeatAt: 0,
    /** Dvojice v časovaném pátrání (stejný formát jako _wfCluePokusy.triedPairs) — vykreslení v „Propojené stopy“. */
    triedPairs: [],
    /** Po odemčení soustředění za Moudrost: −15 s na další běh (kumulativně, max ~ základ). */
    extraDurationCut: 0,
    /** Po odemknutí za inkoust: zobrazit znovu „Zahájit“ i když už jedno pátrání proběhlo. */
    zahajitPovolenoPoInkoustu: false
  };

  const _NARATIV_OBRAZKY = {
    fallback:  'src/skici/skica_slozky.png',
    morning:   'src/skici/skica_slozky.png',
    fragment:  'src/skici/skica_slozky.png',
    clipping:  'src/skici/skica_mesto.png',
    letter:    'src/skici/skica_dopis.png',
    dream:     'src/skici/skica_sen.jpg',
    evening:   'src/skici/skica_domov.png',
    sunday:    'src/skici/skica_domov.png',
    aftermath: 'src/skici/skica_stul.png',
    epilog:    'src/skici/epilog.png',
    verdict:   'src/skici/skica_slozky.png',
    pressure:  'src/skici/skica_dvere.png',
    corridor:  'src/skici/skica_prazdna_chodba.png',
    finance:   'src/skici/skica_rozlity_inkoust.png',
    crisis:    'src/skici/skica_rozlity_inkoust.png',
    city:      'src/skici/skica_mesto.png',
    escape:    'src/skici/skica_vlak.png',
    court:     'src/skici/skica_soudni_lavice.png'
  };

  function _narativKlicProFragment(fragment) {
    const explicit = String(
      (fragment && (fragment.narrative_image || fragment.image || fragment.illustration)) || ''
    ).trim();
    if (explicit) return explicit;
    const typ = String(fragment && fragment.type || '').trim().toLowerCase();
    const hay = [
      fragment && fragment.id,
      fragment && fragment.title,
      fragment && fragment.text
    ].map(s => String(s || '').toLowerCase()).join(' ');
    if (typ === 'dream') return 'dream';
    if (typ === 'letter') return 'letter';
    if (typ === 'visit') return 'pressure';
    if (hay.includes('vlak') || hay.includes('útěk') || hay.includes('odjížd')) return 'escape';
    if (hay.includes('měst') || hay.includes('ulic') || hay.includes('tramvaj') || hay.includes('trh')) return 'city';
    if (hay.includes('finance') || hay.includes('korun') || hay.includes('dluh') || hay.includes('operac')) return 'finance';
    if (typ === 'clipping') return 'morning';
    if (hay.includes('karas') || hay.includes('vlček') || hay.includes('hrozb') || hay.includes('dveř')) return 'pressure';
    if (hay.includes('večer') || hay.includes('neděl')) return 'evening';
    return 'fragment';
  }

  function _narativKickerProFragment(fragment, fallback) {
    const typ = String(fragment && fragment.type || '').trim().toLowerCase();
    const title = String(fragment && fragment.title || '').toLowerCase();
    if (typ === 'dream') return 'NOC';
    if (typ === 'letter') return 'DOPIS';
    if (typ === 'visit') return 'NÁVŠTĚVA';
    if (title.includes('večer')) return 'VEČER';
    if (title.includes('neděle')) return 'NEDĚLE';
    if (title.includes('ráno') || title.includes('ranní')) return 'RÁNO';
    return fallback || 'ZÁZNAM';
  }

  function _narativRozdelTitulekFragmentu(fragment, fallback) {
    const rawTitle = String(fragment && fragment.title || fallback || '').trim();
    const parts = rawTitle.split(/\s+[—-]\s+/);
    if (parts.length < 2) return { nadpis: rawTitle, detail: '' };

    return {
      nadpis: parts[0].trim() || rawTitle,
      detail: parts.slice(1).join(' — ').trim()
    };
  }

  function _narativFormatDatumFragmentu(fragment, fallbackText) {
    const mesice = {
      'ledna': 0,
      'února': 1,
      'brezna': 2,
      'března': 2,
      'dubna': 3,
      'května': 4,
      'kvetna': 4,
      'června': 5,
      'cervna': 5,
      'července': 6,
      'cervence': 6,
      'srpna': 7,
      'září': 8,
      'zari': 8,
      'října': 9,
      'rijna': 9,
      'listopadu': 10,
      'prosince': 11
    };
    const dny = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];
    const format = (date, den, mesicText, rok) =>
      `${dny[date.getDay()]}, ${den}. ${mesicText} ${rok}`;

    const text = String(fallbackText || fragment?.title || '').trim();
    const m = text.match(/(\d{1,2})\.\s*([A-Za-zÁ-žěščřžýáíéúůóďťňĚŠČŘŽÝÁÍÉÚŮÓĎŤŇ]+)\s+(\d{4})/);
    if (m) {
      const den = Number(m[1]);
      const mesicText = m[2].toLowerCase();
      const rok = Number(m[3]);
      const mesic = mesice[mesicText];
      if (Number.isFinite(den) && Number.isFinite(rok) && mesic != null) {
        return format(new Date(rok, mesic, den), den, mesicText, rok);
      }
    }

    const explicitDay = Number(fragment?.day);
    const id = String(fragment?.id || fragment?.fragmentId || '');
    const dm = id.match(/(?:^|_)d(\d+)(?:_|$)/i);
    const kampanDen =
      Number.isFinite(explicitDay) && explicitDay > 0
        ? explicitDay
        : (dm ? Number(dm[1]) : NaN);
    if (Number.isFinite(kampanDen) && kampanDen > 0) {
      const date = new Date(1931, 2, 2);
      date.setDate(date.getDate() + kampanDen - 1);
      return format(date, date.getDate(), 'března', date.getFullYear());
    }
    return '';
  }

  function _narativDetailKickeruFragmentu(fragment, titulek) {
    const typ = String(fragment && fragment.type || '').trim().toLowerCase();
    if (typ === 'dream') return '';
    if (typ === 'visit') {
      const datum = _narativFormatDatumFragmentu(fragment, '');
      const jmeno = String(titulek.detail || '').trim();
      if (datum && jmeno) return `${datum} · ${jmeno}`;
      return datum || jmeno || '';
    }
    if (typ === 'clipping' || _narativKickerProFragment(fragment, '') === 'RÁNO') {
      return _narativFormatDatumFragmentu(fragment, titulek.detail) || titulek.detail || '';
    }
    return titulek.detail || '';
  }

  function _narativRozdelDopisNaStranky(text) {
    const blocks = String(text || '').trim().split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
    const maxChars = 650;
    const pages = [];
    let current = [];
    let currentLen = 0;

    const flush = () => {
      if (!current.length) return;
      pages.push(current.join('\n\n'));
      current = [];
      currentLen = 0;
    };

    const splitLongBlock = (block) => {
      const words = String(block || '').split(/\s+/).filter(Boolean);
      const chunks = [];
      let chunk = '';
      for (const word of words) {
        const next = chunk ? `${chunk} ${word}` : word;
        if (next.length > maxChars && chunk) {
          chunks.push(chunk);
          chunk = word;
        } else {
          chunk = next;
        }
      }
      if (chunk) chunks.push(chunk);
      return chunks;
    };

    for (const block of blocks.length ? blocks : [String(text || '').trim()]) {
      const chunks = block.length > maxChars ? splitLongBlock(block) : [block];
      for (const chunk of chunks) {
        const extra = chunk.length + (current.length ? 2 : 0);
        if (current.length && currentLen + extra > maxChars) flush();
        current.push(chunk);
        currentLen += extra;
      }
    }
    flush();
    return pages.length ? pages : [''];
  }

  function _narativVytvorDopisStranky(rawText) {
    const wrap = document.createElement('div');
    wrap.className = 'narativ-dopis-text';

    const obsah = document.createElement('div');
    obsah.className = 'narativ-dopis-page-text';
    wrap.appendChild(obsah);

    const pages = _narativRozdelDopisNaStranky(rawText);
    let index = 0;

    const controls = document.createElement('div');
    controls.className = 'narativ-dopis-page-controls';
    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'narativ-dopis-page-btn';
    prev.textContent = 'Zpět';
    const status = document.createElement('span');
    status.className = 'narativ-dopis-page-status';
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'narativ-dopis-page-btn';
    next.textContent = 'Otočit stránku';
    controls.appendChild(prev);
    controls.appendChild(status);
    controls.appendChild(next);
    if (pages.length > 1) wrap.appendChild(controls);

    const render = () => {
      obsah.innerHTML = _escapeHtmlProfil(pages[index]).replace(/\n/g, '<br>');
      status.textContent = `${index + 1}/${pages.length}`;
      prev.disabled = index <= 0;
      next.disabled = index >= pages.length - 1;
      prev.classList.toggle('skryto', index <= 0);
      next.classList.toggle('skryto', index >= pages.length - 1);
    };

    prev.addEventListener('click', () => {
      if (index <= 0) return;
      index -= 1;
      render();
    });
    next.addEventListener('click', () => {
      if (index >= pages.length - 1) return;
      index += 1;
      render();
    });
    render();
    return wrap;
  }

  function _narativArchivujInlineDopis(fragment) {
    const typ = String(fragment && fragment.type || '').trim().toLowerCase();
    const text = String(fragment && fragment.text || '').trim();
    if (typ !== 'letter' || !text) return;
    const explicitId = String(fragment.id || fragment.fragmentId || '').trim();
    if (explicitId && DataLoader.ziskejFragment(explicitId)) return;
    const title = String(fragment.title || 'Dopis').trim();
    const den = Number(State.get('currentDay')) || 0;
    const hash = Array.from(`${title}\n${text}`).reduce(
      (acc, ch) => ((acc * 31) + ch.charCodeAt(0)) >>> 0,
      0
    ).toString(36);
    State.oznacFragment({
      id: explicitId || `inline_letter_${den}_${hash}`,
      type: 'letter',
      title,
      text,
      day: den,
      inline: true
    });
    State.uloz();
  }

  function _narativKlicProVecer(casLabel) {
    const label = String(casLabel || '').toLowerCase();
    if (label.includes('neděl')) return 'sunday';
    if (label.includes('ráno')) return 'morning';
    if (label.includes('kriz') || label.includes('23.')) return 'pressure';
    return 'evening';
  }

  function _narativCestaObrazku(klic) {
    const raw = String(klic || '').trim();
    if (!raw) return _NARATIV_OBRAZKY.fallback;
    if (/\.(png|jpe?g|webp|gif)$/i.test(raw) || raw.includes('/')) return raw;
    if (raw.startsWith('skica_')) return `src/skici/${raw}.png`;
    return _NARATIV_OBRAZKY[raw] || _NARATIV_OBRAZKY.fallback;
  }

  function _narativNastavObraz(imgEl, klic) {
    if (!imgEl) return;
    const wrap = imgEl.closest('.narativ-ilustrace');
    if (wrap) wrap.classList.remove('narativ-ilustrace--fallback');
    imgEl.hidden = false;
    imgEl.onerror = () => {
      imgEl.hidden = true;
      imgEl.removeAttribute('src');
      if (wrap) wrap.classList.add('narativ-ilustrace--fallback');
    };
    imgEl.onload = () => {
      imgEl.hidden = false;
      if (wrap) wrap.classList.remove('narativ-ilustrace--fallback');
    };
    imgEl.src = _narativCestaObrazku(klic);
  }

  const PATRANI_CONFIG = {
    max_attempts: 5,
    moudrost_bonus: 1,
    moudrost_bonus_prah: 81,
    close_on_any_pair: false
  };

  let _wfCluePokusy = {
    active: false,
    attemptsLeft: 0,
    maxAttempts: 0,
    closed: false,
    hasRun: false,
    triedPairs: [],
    logOpen: true
  };

  /**
   * Konfigurace časového pásu v datech (timed_hunt), bez ohledu na nastavení hry.
   * Pro hráčskou volbu (pokusy vs čas) viz _wfCluePouzivaTimedHunt.
   */
  function _wfClueTimedHuntZJsonu(pripad) {
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

  /** Hráč zapnul v menu režim „Pátrání na čas“ a případ má v datech enabled timed_hunt. */
  function _wfCluePouzivaTimedHunt(pripad) {
    if (typeof Tutorial !== 'undefined' && Tutorial.vynucBezCasovehoPatrani && Tutorial.vynucBezCasovehoPatrani(pripad)) {
      return false;
    }
    if (!_wfClueTimedHuntZJsonu(pripad)) return false;
    if (typeof State === 'undefined' || !State.get) return false;
    return State.get('settings.patraniNaCas') === true;
  }

  /** Při zapnuté osě stop, výchozí: omezené pokusy; čas místo tohoto přes _wfCluePouzivaTimedHunt. */
  function _wfClueMaPokusovyRezim(pripad) {
    const cs = pripad && pripad.clue_system && typeof pripad.clue_system === 'object'
      ? pripad.clue_system
      : null;
    if (!cs || cs.enabled !== true) return false;
    return !_wfCluePouzivaTimedHunt(pripad);
  }

  function _wfClueMaxPokusyHry() {
    let n = Math.max(1, Math.min(9, Math.round(PATRANI_CONFIG.max_attempts) || 5));
    if (typeof State === 'undefined' || !State.get) return n;
    const m = Number(State.get('traits.Moudrost')) || 0;
    if (m >= (Number(PATRANI_CONFIG.moudrost_bonus_prah) || 81)) n += (Number(PATRANI_CONFIG.moudrost_bonus) || 0);
    return n;
  }

  function _wfCluePokusyPrazdnyStav() {
    return {
      active: false,
      attemptsLeft: 0,
      maxAttempts: 0,
      closed: false,
      hasRun: false,
      triedPairs: [],
      logOpen: true
    };
  }

  function _wfCluePokusyNactiDoPameti(pripad) {
    const blank = _wfCluePokusyPrazdnyStav();
    if (!pripad || _wfCluePouzivaTimedHunt(pripad) || !_wfClueMaPokusovyRezim(pripad)) {
      _wfCluePokusy = { ...blank };
      return;
    }
    if (typeof State === 'undefined' || !State.nactiCluePatraniSession) {
      _wfCluePokusy = { ...blank };
      return;
    }
    const s = State.nactiCluePatraniSession(pripad.id);
    if (s && s.mode === 'attempts') {
      const maxA = Math.max(1, Number(s.maxAttempts) || _wfClueMaxPokusyHry());
      const al = s.attemptsLeft;
      const attemptsLeft = Number.isFinite(Number(al)) ? Math.max(0, Math.min(maxA, Math.round(al))) : maxA;
      const closed = !!s.closed;
      const hasRun = !!s.hasRun;
      const matched =
        typeof Cases !== 'undefined' && Cases.maPotvrzenouClueVazbu && Cases.maPotvrzenouClueVazbu(pripad);
      const resume = false;
      _wfCluePokusy = {
        ...blank,
        hasRun,
        active: resume,
        closed,
        maxAttempts: maxA,
        attemptsLeft,
        triedPairs: Array.isArray(s.triedPairs) ? s.triedPairs.slice(0, 24) : [],
        logOpen: s.logOpen !== false
      };
    } else {
      _wfCluePokusy = { ...blank };
    }
  }

  function _wfCluePokusyUlozSession(pripad) {
    if (!pripad || _wfCluePouzivaTimedHunt(pripad) || !_wfClueMaPokusovyRezim(pripad) || !State?.ulozCluePatraniSession) {
      return;
    }
    State.ulozCluePatraniSession(pripad.id, {
      mode: 'attempts',
      hasRun: _wfCluePokusy.hasRun,
      maxAttempts: _wfCluePokusy.maxAttempts,
      attemptsLeft: _wfCluePokusy.attemptsLeft,
      closed: _wfCluePokusy.closed,
      triedPairs: Array.isArray(_wfCluePokusy.triedPairs) ? _wfCluePokusy.triedPairs.slice(0, 24) : [],
      logOpen: _wfCluePokusy.logOpen !== false
    });
  }

  function _wfCluePokusyKonecUspech(pripad) {
    if (!pripad) return;
    const keptPairs = Array.isArray(_wfCluePokusy.triedPairs)
      ? _wfCluePokusy.triedPairs.slice(-24)
      : [];
    const keepOpen = _wfCluePokusy.logOpen !== false;
    if (State?.vymazCluePatraniSession) State.vymazCluePatraniSession(pripad.id);
    _wfCluePokusy = {
      ..._wfCluePokusyPrazdnyStav(),
      hasRun: true,
      closed: true,
      triedPairs: keptPairs,
      logOpen: keepOpen
    };
  }

  function _wfCluePokusyKonecNeuspech(pripad) {
    if (!pripad) return;
    if (_wfCluePouzivaTimedHunt(pripad) || !_wfClueMaPokusovyRezim(pripad)) return;
    _wfCluePokusy.active = false;
    _wfCluePokusy.closed = true;
    _wfCluePokusy.hasRun = true;
    if (_wfCluePokusy.maxAttempts > 0) _wfCluePokusy.attemptsLeft = 0;
    _wfCluePokusyUlozSession(pripad);
    if (State?.uloz) State.uloz();
  }

  function _wfCluePokusyReset(keepRun = false) {
    if (!keepRun) {
      _wfCluePokusy = _wfCluePokusyPrazdnyStav();
    } else {
      _wfCluePokusy.active = false;
    }
  }

  function _wfCluePokusyPokusyRadek() {
    const m = _wfCluePokusy.maxAttempts;
    const z = _wfCluePokusy.attemptsLeft;
    if (m <= 0) return 'Pátrání: —';
    let t = 'Pátrání: ';
    for (let i = 0; i < m; i++) t += (i < z) ? '●' : '○';
    t += ` (${z}/${m} pokusů)`;
    return t;
  }

  function _wfCluePokusySpust(pripad, onRozsudek) {
    if (!pripad || _wfCluePouzivaTimedHunt(pripad) || !_wfClueMaPokusovyRezim(pripad)) return;
    if (pripad._lightMode === true) return;
    const navazani =
      _wfCluePokusy.hasRun &&
      !_wfCluePokusy.closed &&
      (Number(_wfCluePokusy.attemptsLeft) || 0) > 0 &&
      !(
        typeof Cases !== 'undefined' &&
        Cases.maPotvrzenouClueVazbu &&
        Cases.maPotvrzenouClueVazbu(pripad)
      );
    const maxA = navazani ? (Number(_wfCluePokusy.maxAttempts) || _wfClueMaxPokusyHry()) : _wfClueMaxPokusyHry();
    const attempts = navazani ? (Number(_wfCluePokusy.attemptsLeft) || maxA) : maxA;
    _wfCluePokusy.active = true;
    _wfCluePokusy.closed = false;
    _wfCluePokusy.hasRun = true;
    _wfCluePokusy.maxAttempts = maxA;
    _wfCluePokusy.attemptsLeft = attempts;
    if (!navazani) _wfCluePokusy.triedPairs = [];
    _wfClueZastavHuntVizuályModalu();
    _wfClueResetVolby();
    _wfClueResetKandidata();
    _wfClueAplikujUzamceni(pripad);
    _wfCluePokusyUlozSession(pripad);
    _wfClueVykresliPotvrzeni(pripad, onRozsudek);
    _wfCluePatraniHudUpdate(pripad, onRozsudek);
    if (State?.uloz) State.uloz();
    if (navazani) {
      zobrazStavovouZpravu(`Pátrání navázáno: zbývá ${attempts} z ${maxA} pokusů.`);
    } else {
      zobrazStavovouZpravu(`Pátrání: máte ${maxA} pokusů (špatné dvojice stojí jeden pokus).`);
    }
  }

  function _wfCluePokusyPozastav(pripad) {
    if (!pripad || !_wfClueMaPokusovyRezim(pripad) || !_wfCluePokusy.active) return;
    _wfCluePokusy.active = false;
    _wfCluePokusy.closed = false;
    _wfCluePokusy.hasRun = true;
    _wfCluePokusyUlozSession(pripad);
    if (State?.uloz) State.uloz();
  }

  function _wfCluePokusyZalogujDvojici(aId, bId, result) {
    if (!_wfCluePokusy || !Array.isArray(_wfCluePokusy.triedPairs)) return;
    const a = String(aId || '').trim();
    const b = String(bId || '').trim();
    if (!a || !b) return;
    _wfCluePokusy.triedPairs.push({
      aId: a,
      bId: b,
      result: String(result || 'miss').trim()
    });
    if (_wfCluePokusy.triedPairs.length > 24) {
      _wfCluePokusy.triedPairs = _wfCluePokusy.triedPairs.slice(-24);
    }
  }

  function _wfCluePatraniZalogujDvojici(aId, bId, result) {
    const a = String(aId || '').trim();
    const b = String(bId || '').trim();
    if (!a || !b) return;
    if (!Array.isArray(_wfCluePatrani.triedPairs)) _wfCluePatrani.triedPairs = [];
    _wfCluePatrani.triedPairs.push({
      aId: a,
      bId: b,
      result: String(result || 'miss').trim()
    });
    if (_wfCluePatrani.triedPairs.length > 24) {
      _wfCluePatrani.triedPairs = _wfCluePatrani.triedPairs.slice(-24);
    }
  }

  /** Propojené stopy: data z pokusového režimu nebo z časovaného; prázdný výpis = panel skrytý. */
  function _wfCluePokusyVykresliZaznam(hostEl, pripad) {
    if (!hostEl) return;
    const esc = (t) =>
      String(t == null ? '' : t)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    const clueText = (id) => {
      const clueId = String(id || '').trim();
      if (!clueId) return '—';
      const el = _wfClueNajdiPrvniElDleId(clueId);
      if (!el) return clueId.replace(/_/g, ' ');
      const txt = String(el.textContent || '').replace(/\s+/g, ' ').trim();
      return txt || clueId.replace(/_/g, ' ');
    };
    const pokRez = !!(pripad && _wfClueMaPokusovyRezim(pripad));
    const timed = !!(pripad && _wfCluePouzivaTimedHunt(pripad));
    const data = pokRez
      ? (Array.isArray(_wfCluePokusy.triedPairs) ? _wfCluePokusy.triedPairs : [])
      : timed
        ? (Array.isArray(_wfCluePatrani.triedPairs) ? _wfCluePatrani.triedPairs : [])
        : [];
    const head =
      `<div class="case-wf-clue-log-head">` +
      `<div class="case-wf-clue-log-title">Propojené stopy</div>` +
      `</div>`;
    if (!data.length) {
      hostEl.classList.add('skryto');
      hostEl.innerHTML = '';
      return;
    }
    /* Celý zápis pokusů (ve stavu max 24); zkracovat jen ukládání, ne výpis — scroll má #case-wf-clue-hud-log. */
    const rows = data.map((x, idx) => {
      const n = idx + 1;
      const res = String(x.result || 'miss');
      const klass =
        res === 'strong' ? 'case-wf-clue-log-item--strong'
          : res === 'medium' ? 'case-wf-clue-log-item--medium'
            : res === 'weak' ? 'case-wf-clue-log-item--weak'
              : 'case-wf-clue-log-item--miss';
      const label =
        res === 'strong' ? 'Průkazná vazba'
          : res === 'medium' ? 'Střední vazba'
            : res === 'weak' ? 'Slabá vazba'
              : 'Neshoda';
      const aText = clueText(x.aId);
      const bText = clueText(x.bId);
      return `<li class="case-wf-clue-log-item ${klass}"><span class="case-wf-clue-log-n">${n}.</span> <span class="case-wf-clue-log-pair">${esc(aText)} + ${esc(bText)}</span> <span class="case-wf-clue-log-res">${label}</span></li>`;
    });
    hostEl.classList.remove('skryto');
    hostEl.innerHTML =
      head +
      `<ul class="case-wf-clue-log-list">${rows.join('')}</ul>`;
  }

  function _wfCluePokusyUkonciBezVysledku(pripad, onRozsudek) {
    if (!pripad || !_wfClueMaPokusovyRezim(pripad) || !_wfCluePokusy.active) return;
    /* Ruční ukončení — bez zvuku neúspěchu (ten zůstává u vyčerpání pokusů / miny). */
    _wfCluePokusyKonecNeuspech(pripad);
    _wfClueResetVolby();
    _wfClueResetKandidata();
    _wfClueAplikujUzamceni(pripad);
    _wfClueVykresliPotvrzeni(pripad, onRozsudek);
    _wfCluePatraniHudUpdate(pripad, onRozsudek);
    if (typeof Desk !== 'undefined' && Desk.aktualizujVse) Desk.aktualizujVse();
    zobrazStavovouZpravu('Pátrání ukončeno. Rozhodněte v rozsudku s tím, co ve spisu máte.');
  }

  /** Společné odstranění stresu časomíry (modal). */
  function _wfClueZastavHuntVizuályModalu() {
    const mod = document.getElementById('modal-pripad');
    if (mod) {
      mod.classList.remove('case-wf-hunt-stress--mid', 'case-wf-hunt-stress--high');
      mod.style.removeProperty('--case-wf-hunt-vignette');
    }
    if (typeof SFX !== 'undefined' && SFX.zastavPatraniHeartbeat) SFX.zastavPatraniHeartbeat();
  }

  /** Timed hunt + zkrácení času podle Naděje / Viny (viz designový dodatek). */
  function _wfCluePatraniRuntimeCfg(pripad) {
    const base = _wfClueTimedHuntZJsonu(pripad);
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
    if (!pripad || typeof State === 'undefined' || !_wfCluePouzivaTimedHunt(pripad)) return;
    if (typeof Cases !== 'undefined' && Cases.maPotvrzenouClueVazbu && Cases.maPotvrzenouClueVazbu(pripad)) {
      if (State.vymazCluePatraniSession) State.vymazCluePatraniSession(pripad.id);
      State.uloz();
      return;
    }
    if (State.ulozCluePatraniSession) {
      State.ulozCluePatraniSession(pripad.id, {
        mode: 'timed',
        hasRun: true,
        needsPaidRetry: true,
        extraDurationCut: Number(_wfCluePatrani.extraDurationCut) || 0
      });
    }
    State.uloz();
  }

  function _wfCluePatraniNactiZeStavu(pripad) {
    if (!pripad || typeof State === 'undefined' || !State.nactiCluePatraniSession || !_wfCluePouzivaTimedHunt(pripad)) {
      return;
    }
    const s = State.nactiCluePatraniSession(pripad.id);
    if (!s) return;
    if (s.mode === 'attempts') return;
    if (s.hasRun) _wfCluePatrani.hasRun = true;
    if (Number.isFinite(Number(s.extraDurationCut)) && Number(s.extraDurationCut) > 0) {
      _wfCluePatrani.extraDurationCut = Number(s.extraDurationCut);
    }
  }

  /**
   * Ruční ukončení časovaného pátrání — bez uložení vazby; pokus propadne jako u vypršení času.
   * Další běh: odemknutí přes inkoust nebo Moudrost (stejně jako po needsPaidRetry).
   */
  function _wfCluePatraniUkonciBezVysledku(pripad, onRozsudek) {
    if (!pripad || !_wfCluePouzivaTimedHunt(pripad) || !_wfCluePatrani.active) return;
    _wfCluePatraniZastavTimer();
    _wfCluePatrani.active = false;
    _wfCluePatrani.best = null;
    _wfCluePatrani.hasRun = true;
    const mod = document.getElementById('modal-pripad');
    if (mod) {
      mod.classList.remove('case-wf-hunt-stress--mid', 'case-wf-hunt-stress--high');
      mod.style.removeProperty('--case-wf-hunt-vignette');
    }
    if (typeof SFX !== 'undefined' && SFX.zastavPatraniHeartbeat) SFX.zastavPatraniHeartbeat();
    /* Ruční ukončení — bez zvuku neúspěchu (u vypršení času zůstává `patraniNeuspech` v timeru). */
    _wfCluePatraniUlozKonecNeuspech(pripad);
    _wfClueResetVolby();
    _wfClueResetKandidata();
    _wfClueAplikujUzamceni(pripad);
    _wfClueVykresliPotvrzeni(pripad, onRozsudek);
    _wfCluePatraniHudUpdate(pripad, onRozsudek);
    if (typeof State !== 'undefined' && State.uloz) State.uloz();
    zobrazStavovouZpravu(
      'Pátrání jste ukončili bez potvrzení vazby — nález se neuložil a tento pokus propadl. Další běh spustíte jednou akcí průzkumu (−1 inkoust) nebo za −2 Moudrosti.'
    );
    if (typeof Desk !== 'undefined' && Desk.aktualizujVse) Desk.aktualizujVse();
  }

  function _wfCluePatraniReset(keepRun = false) {
    _wfCluePatraniZastavTimer();
    _wfCluePatrani.active = false;
    _wfCluePatrani.endsAt = 0;
    _wfCluePatrani.startedAt = 0;
    _wfCluePatrani.durationSec = 0;
    _wfCluePatrani.origDurationSec = 0;
    _wfCluePatrani.config = null;
    _wfCluePatrani.lastHeartbeatAt = 0;
    if (!keepRun) {
      _wfCluePatrani.best = null;
      _wfCluePatrani.hasRun = false;
      _wfCluePatrani.extraDurationCut = 0;
      _wfCluePatrani.zahajitPovolenoPoInkoustu = false;
      _wfCluePatrani.triedPairs = [];
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
    const elapsedMs = Date.now() - (Number(_wfCluePatrani.startedAt) || 0);
    if (elapsedMs >= 0 && elapsedMs < 1000) {
      const startSec = Math.round(Number(_wfCluePatrani.durationSec) || 0);
      return Math.max(60, Math.max(0, startSec));
    }
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
    if (strength === 'medium') return 'věrohodná';
    return 'slabší, zatím nepřesvědčivá';
  }

  /** Jednořádek záhlaví — krátká přídavná jména k „Pevnost nalezené stopy“. */
  function _wfCluePevnostStopyKratce(strength) {
    if (strength === 'strong') return 'průkazná';
    if (strength === 'medium') return 'věrohodná';
    return 'slabá';
  }

  function _wfClueSoudniVetaSily(strength) {
    if (strength === 'strong') return 'Průkazná vazba.';
    if (strength === 'medium') return 'Věrohodná vazba.';
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

  /** Jednořádek do záhlaví spisu místo tlačítka po ukončení pátrání. */
  function _wfClueHeaderVysledekText(pripad, matched, pokusyRezim, pokClosed, pokHasRun, timed, hasRunPatrani) {
    if (matched && typeof Cases !== 'undefined' && Cases.ziskejPotvrzenouClueVazbu) {
      const v = Cases.ziskejPotvrzenouClueVazbu(pripad);
      if (v && v.strength) {
        return `Pevnost nalezené stopy: ${_wfCluePevnostStopyKratce(v.strength)}.`;
      }
      return 'Vazba ve spisu potvrzena.';
    }
    if (pokusyRezim && pokHasRun && pokClosed && !matched) return 'Pátrání nebylo úspěšné.';
    if (timed && hasRunPatrani && !matched) return 'Pátrání nebylo úspěšné.';
    return '';
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

  function _wfSestavObvineniText(pripad) {
    const defRaw = _wfZahlaviPlainText(pripad?.defendant?.name || '');
    const chargeRaw = _wfZahlaviPlainText(pripad?.charge || '');
    const def = (defRaw && defRaw !== '—') ? defRaw : '';
    const charge = (chargeRaw && chargeRaw !== '—') ? chargeRaw : '';
    if (def && charge) return `${def}, ${charge}`;
    if (charge) return charge;
    if (def) return def;
    return '—';
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
    el.textContent = `Akce průzkumu (inkoustové kapky): ${z}`;
  }

  /** Výchozí pokuta v Kčs podle „ceny“ akce v kapkách (1 → −12, 2+ → −20). */
  function _wfDefaultDirtyFinanceDelta(costKapky) {
    const c = Math.max(1, Number(costKapky) || 1);
    return c >= 2 ? -20 : -12;
  }

  /**
   * Náklady pro tlačítko „Neoficiální zdroj“; null = vypnuto (`dirty_unlock: false`) nebo konfrontace.
   */
  function _wfEffectiveDirtyUnlock(info) {
    if (!info || info.dirty_unlock === false) return null;
    if (info.action === 'confrontation') return null;
    const rawCost = Number(info.cost) > 0 ? Number(info.cost) : 1;
    const spec = {
      finance: _wfDefaultDirtyFinanceDelta(rawCost),
      traits: { Integrita: -2, Vina: 1 },
      factions: {},
      trust: {}
    };
    const o = info.dirty_unlock;
    if (o && typeof o === 'object') {
      if ('finance' in o && o.finance != null) spec.finance = Number(o.finance);
      if (o.traits && typeof o.traits === 'object') {
        for (const [k, v] of Object.entries(o.traits)) {
          if (v != null) spec.traits[k] = Number(v);
        }
      }
      if (o.factions && typeof o.factions === 'object') {
        for (const [k, v] of Object.entries(o.factions)) {
          if (v != null) spec.factions[k] = Number(v);
        }
      }
      if (o.trust && typeof o.trust === 'object') {
        for (const [k, v] of Object.entries(o.trust)) {
          if (v != null) spec.trust[k] = Number(v);
        }
      }
    }
    return spec;
  }

  function _wfLzePlatitNečisty(spec) {
    if (!spec) return false;
    const f = Number(spec.finance) || 0;
    if (f < 0 && typeof Finance !== 'undefined' && Finance.jeDostupne) {
      return Finance.jeDostupne(Math.abs(f));
    }
    return true;
  }

  /** Kolik sdílených akcí (kapky) — text do závorky u tlačítek průzkumu. */
  function _wfKapkyVZavorkach(cena) {
    const n = Math.max(0, Math.round(Number(cena) || 0));
    if (n === 0) return ' (0 akcí)';
    if (n === 1) return ' (1 akce)';
    if (n >= 2 && n <= 4) return ` (${n} akce)`;
    return ` (${n} akcí)`;
  }

  /**
   * Neoficiální cesta: stupeň závažnosti + dopady bez čísel v panelu; přesné hodnoty v `shrnutiCisel` / `titulek` pro tooltip.
   * @returns {{ stupenNadpis: string, stupenPopis: string, dopady: string[], titulek: string, shrnutiCisel: string }}
   */
  function _wfNeoficialniPanelText(spec) {
    if (!spec) {
      return {
        stupenNadpis: '',
        stupenPopis: '',
        dopady: [],
        titulek: '',
        shrnutiCisel: ''
      };
    }
    const f = Number(spec.finance) || 0;
    const traits = spec.traits && typeof spec.traits === 'object' ? spec.traits : {};
    const factions = spec.factions && typeof spec.factions === 'object' ? spec.factions : {};
    const trust = spec.trust && typeof spec.trust === 'object' ? spec.trust : {};

    let score = 0;
    if (f < 0) {
      const kc = Math.abs(Math.round(f));
      score += kc >= 20 ? 2 : 1;
    } else if (f > 0) {
      score += 1;
    }
    let traitBurden = 0;
    for (const d of Object.values(traits)) traitBurden += Math.abs(Number(d) || 0);
    score += Math.min(2, Math.floor(traitBurden / 2));
    if (Object.keys(factions).some(k => Number(factions[k]))) score += 1;
    if (Object.keys(trust).some(k => Number(trust[k]))) score += 1;

    const stupen = score <= 1 ? 'lehka' : score <= 3 ? 'stredni' : 'vazna';
    const meta = {
      lehka: {
        nadpis: 'Lehká závažnost',
        popis: 'Lehký zásah do aktuálního rozpoložení Bena a dopad na pověst.'
      },
      stredni: {
        nadpis: 'Střední závažnost',
        popis: 'Zásah do aktuálního rozpoložení Bena a dopad na pověst.'
      },
      vazna: {
        nadpis: 'Vážné — okraj zákona',
        popis: 'Silný zásah do aktuálního rozpoložení Bena a dopad na pověst.'
      }
    }[stupen];

    const dopady = [];
    if (f < 0) {
      dopady.push(`Finance: -${Math.abs(Math.round(f))} Kčs`);
    } else if (f > 0) {
      dopady.push(`Finance: +${Math.round(f)} Kčs`);
    }
    for (const [jmeno, delta] of Object.entries(traits)) {
      const d = Number(delta);
      if (!d) continue;
      dopady.push(`${String(jmeno)}: ${_statSipkyZmeny(d, 100)}`);
    }
    if (Object.keys(factions).some(k => Number(factions[k]))) {
      dopady.push('Frakce: změna postoje');
    }
    if (Object.keys(trust).some(k => Number(trust[k]))) {
      dopady.push('Důvěra osob: změna');
    }

    const shrnutiCisel = [];
    if (f < 0) shrnutiCisel.push(`${Math.abs(Math.round(f))} Kčs`);
    else if (f > 0) shrnutiCisel.push(`+${Math.round(f)} Kčs`);
    for (const [jmeno, delta] of Object.entries(traits)) {
      const d = Number(delta);
      if (!d) continue;
      shrnutiCisel.push(`${jmeno} ${_statSipkyZmeny(d, 100)}`);
    }
    for (const [fid, delta] of Object.entries(factions)) {
      const d = Number(delta);
      if (!d) continue;
      shrnutiCisel.push(`${fid} ${_statSipkyZmeny(d, 100)}`);
    }
    for (const [npcId, delta] of Object.entries(trust)) {
      const d = Number(delta);
      if (!d) continue;
      shrnutiCisel.push(`důvěra ${npcId} ${_statSipkyZmeny(d, 3)}`);
    }
    const sc = shrnutiCisel.join(' · ');
    const titulek =
      (sc ? `Přesně: ${sc}. ` : '') +
      `${meta.nadpis} — ${meta.popis} ` +
      (dopady.length ? dopady.join(' ') : 'Platba mimo sdílený inkoust průzkumu.');
    return {
      stupenNadpis: meta.nadpis,
      stupenPopis: meta.popis,
      dopady,
      titulek,
      shrnutiCisel: sc
    };
  }

  function _wfAplikujNečistyCosts(spec) {
    if (!spec) return;
    if (spec.finance) State.upravFinance(spec.finance);
    if (spec.traits) {
      for (const [k, d] of Object.entries(spec.traits)) {
        if (d) State.upravRys(k, d);
      }
    }
    if (spec.factions) {
      for (const [k, d] of Object.entries(spec.factions)) {
        if (d) State.upravFrakci(k, d);
      }
    }
    if (spec.trust) {
      for (const [npcId, d] of Object.entries(spec.trust)) {
        if (d) State.upravDuveru(npcId, d);
      }
    }
  }

  function _wfDokonciOdhaleniPruzkumu(pripad, info, onRozsudek, options = {}) {
    const dirty = !!options.dirty;
    const predchoziVerdikty = _wfDostupneVerdiktIdSet(pripad);
    const predPocetOdhaleni = _wfPocetOdhalenychPruzkumu(pripad);
    State.odhalInfoPripadu(pripad.id, info.id, { path: dirty ? 'unofficial' : 'official' });
    if (dirty && typeof SFX !== 'undefined' && SFX.pruzkumMimoZaznam) {
      SFX.pruzkumMimoZaznam();
    }

    const odhaleneEl = document.getElementById('pripad-odhalene-info');
    _zobrazOdhalenoInfo(odhaleneEl, info);

    const fb = document.getElementById('case-wf-find-' + info.id);
    if (fb) {
      _wfVlozRadekRečníkaZjištění(fb, info);
      _wfVlozMetaCestyZjištění(fb, pripad, info);
      _wfVykresliTextZjištění(fb, info);
      fb.classList.remove('skryto');
    }

    _aktualizujPruzkumPanel(pripad, onRozsudek);
    if (
      predPocetOdhaleni === 0 &&
      _wfPocetOdhalenychPruzkumu(pripad) > 0 &&
      typeof Tutorial !== 'undefined' &&
      Tutorial.priPrvnimOdhaleniStopy
    ) {
      Tutorial.priPrvnimOdhaleniStopy(pripad);
    }
    _wfPoPrvniAkciPruzkumu(pripad, onRozsudek, {
      predchoziVerdikty,
      bezRazitkaPriOdemceniVerdiktu: dirty
    });
    Desk.aktualizujVse();

    const md = dirty ? 2 : 3;
    State.upravRys('Moudrost', Traits.aplikovatNasobekMoudrostiZaAkci(md));

    if (typeof Finance !== 'undefined' && Finance.zkontrolujCilOperace) {
      Finance.zkontrolujCilOperace();
    }
    State.uloz();
    if (dirty) {
      zobrazStavovouZpravu('Informace z neoficiálního zdroje — náklady a stopy navíc.');
    }
  }

  function _wfCluePatraniHudEnsure() {
    const legacy = document.getElementById('case-wf-clue-hud');
    if (legacy && legacy.querySelector('#case-wf-clue-hud-time')) legacy.remove();

    const slot = document.getElementById('case-wf-clue-hud-slot');
    if (!slot) return null;

    const headerAnchor = document.getElementById('case-wf-clue-hud-header-anchor');

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
        `<button type="button" class="case-wf-clue-hud-btn skryto case-wf-clue-hud-btn--abort" id="case-wf-clue-hud-abort">Ukončit pátrání</button>` +
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
        `<button type="button" class="case-wf-clue-hud-btn case-wf-clue-hud-btn--start" id="case-wf-clue-hud-action" aria-label="Pátrání" title="Zahájit pátrání"></button>`;
      (headerAnchor || slot).appendChild(headerWrap);
    } else if (headerAnchor && headerWrap.parentElement !== headerAnchor) {
      headerAnchor.appendChild(headerWrap);
    } else if (!headerAnchor && headerWrap.parentElement !== slot) {
      slot.appendChild(headerWrap);
    }

    let headerVys = document.getElementById('case-wf-clue-hud-header-vysledek');
    if (!headerVys && headerAnchor) {
      headerVys = document.createElement('div');
      headerVys.id = 'case-wf-clue-hud-header-vysledek';
      headerVys.className = 'case-wf-clue-hud-header-vysledek skryto';
      headerVys.setAttribute('aria-live', 'polite');
      headerAnchor.appendChild(headerVys);
    } else if (headerVys && headerAnchor && headerVys.parentElement !== headerAnchor) {
      headerAnchor.appendChild(headerVys);
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

    const actRow = detail?.querySelector('.case-wf-clue-hud-actions--detail');
    if (actRow && !document.getElementById('case-wf-clue-hud-abort')) {
      const ab = document.createElement('button');
      ab.type = 'button';
      ab.id = 'case-wf-clue-hud-abort';
      ab.className = 'case-wf-clue-hud-btn skryto case-wf-clue-hud-btn--abort';
      ab.textContent = 'Ukončit pátrání';
      actRow.appendChild(ab);
    }

    return document.getElementById('case-wf-clue-hud-detail');
  }

  function _wfCluePatraniHudUpdate(pripad = _wfClueAktivniPripad, onRozsudek = _wfClueAktivniOnRozsudek) {
    const detail = _wfCluePatraniHudEnsure();
    const headerWrap = document.getElementById('case-wf-clue-hud-header-wrap');
    const timed = !!_wfCluePouzivaTimedHunt(pripad);
    const pokusyRezim = !!_wfClueMaPokusovyRezim(pripad);
    const runCfg = timed ? _wfCluePatraniRuntimeCfg(pripad) : null;
    const maxF = _wfClueFocusMax(pripad);
    /* Light (osekaný) spis: bez pátrání — lupa nefunguje, schovat. */
    if (
      !pripad ||
      pripad._lightMode === true ||
      (!timed && !pokusyRezim && maxF <= 0)
    ) {
      detail?.classList.add('skryto');
      headerWrap?.classList.add('skryto');
      document.getElementById('case-wf-clue-hud-header-vysledek')?.classList.add('skryto');
      document.getElementById('case-wf-clue-hud-log')?.classList.add('skryto');
      document.getElementById('case-wf-clue-hud-slot')?.classList.add('skryto');
      _wfAktualizujHeaderAkciPripadu();
      return;
    }

    document.getElementById('case-wf-clue-hud-slot')?.classList.remove('skryto');

    const aktivni = !!_wfCluePatrani.active;
    const pokActive = !!_wfCluePokusy.active;
    const pokClosed = !!_wfCluePokusy.closed;
    const pokHasRun = !!_wfCluePokusy.hasRun;
    const timeEl = document.getElementById('case-wf-clue-hud-time');
    const bestEl = document.getElementById('case-wf-clue-hud-best');
    const focusEl = document.getElementById('case-wf-clue-hud-focus');
    const modalPripad = document.getElementById('modal-pripad');
    let logEl = document.getElementById('case-wf-clue-hud-log');
    if (!logEl) {
      logEl = document.createElement('div');
      logEl.id = 'case-wf-clue-hud-log';
      /* Bez --floating: globální .case-wf-clue-hud-log--floating používá position:fixed a může skončit pod/vně modálu. */
      logEl.className = 'case-wf-clue-hud-log skryto';
      const rail = document.getElementById('pripad-patrani-rail');
      (rail || document.body).appendChild(logEl);
    } else if (logEl.parentElement && logEl.parentElement.id !== 'pripad-patrani-rail') {
      const rail = document.getElementById('pripad-patrani-rail');
      if (rail) rail.appendChild(logEl);
    }
    const lockWrap = document.getElementById('case-wf-clue-focus-lock');
    const actionBtn = document.getElementById('case-wf-clue-hud-action');
    const confirmBtn = document.getElementById('case-wf-clue-hud-confirm');
    const abortBtn = document.getElementById('case-wf-clue-hud-abort');
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
      if (pokusyRezim && !timed) {
        focusEl.classList.add('skryto');
        focusEl.textContent = '';
      } else if (timed && aktivni && maxF > 0 && !matched) {
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
      if (abortBtn) {
        abortBtn.classList.remove('skryto');
        abortBtn.disabled = false;
        abortBtn.title =
          'Okamžitě ukončí pátrání. Potvrzená vazba se neuloží; pokus propadne — další běh za inkoust nebo Moudrost.';
        abortBtn.onclick = () => {
          if (!_wfCluePatrani.active) return;
          if (
            !window.confirm(
              'Opravdu ukončit pátrání? Potvrzená vazba se neuloží a ztratíte tento pokus. Další běh lze spustit jednou akcí průzkumu (−1 inkoust) nebo za −2 Moudrosti.'
            )
          ) {
            return;
          }
          _wfCluePatraniUkonciBezVysledku(pripad, onRozsudek);
        };
      }
    } else if (pokusyRezim && pokActive && !pokClosed) {
      if (timeEl) {
        timeEl.classList.remove('skryto');
        timeEl.textContent = _wfCluePokusyPokusyRadek();
      }
      if (bestEl) {
        bestEl.classList.remove('skryto');
        bestEl.textContent = _wfClueKandidat
          ? `Aktuální vazba: ${_wfClueSoudniTextSily(_wfClueKandidat.strength)}.`
          : 'Propojte dvě stopy ve spise (špatná dvojice stojí jeden pokus).';
      }
      if (confirmBtn) {
        const muzeP = !!_wfClueKandidat;
        confirmBtn.classList.remove('skryto');
        confirmBtn.disabled = !muzeP;
        confirmBtn.title = muzeP
          ? 'Zapíše aktuální osu do spisu a ukončí pátrání.'
          : 'Nejprve najděte dvojici stop.';
      }
      if (abortBtn) {
        abortBtn.classList.remove('skryto');
        abortBtn.disabled = false;
        abortBtn.title = 'Ukončí pátrání bez uložení vazby; stopy se uzamknou.';
        abortBtn.onclick = () => {
          if (!pokActive) return;
          if (!window.confirm('Opravdu ukončit pátrání bez uložení vazby?')) return;
          _wfCluePokusyUkonciBezVysledku(pripad, onRozsudek);
        };
      }
    } else if (pokusyRezim && pokHasRun && pokClosed) {
      if (timeEl) {
        timeEl.classList.remove('skryto');
        timeEl.textContent = matched ? 'Pátrání uzavřeno.' : 'Pátrání uzavřeno — rozhodněte podle spisu.';
      }
      if (bestEl) {
        bestEl.classList.remove('skryto');
        bestEl.textContent = matched
          ? 'Vazba zapsána do spisu.'
          : 'Nebyla potvrzena žádná osa stop.';
      }
      if (confirmBtn) {
        confirmBtn.classList.add('skryto');
        confirmBtn.disabled = true;
        confirmBtn.title = '';
      }
      if (abortBtn) {
        abortBtn.classList.add('skryto');
        abortBtn.disabled = true;
        abortBtn.title = '';
        abortBtn.onclick = null;
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
      if (abortBtn) {
        abortBtn.classList.add('skryto');
        abortBtn.disabled = true;
        abortBtn.title = '';
        abortBtn.onclick = null;
      }
    } else {
      if (timeEl) timeEl.classList.add('skryto');
      if (bestEl) bestEl.classList.add('skryto');
      if (confirmBtn) {
        confirmBtn.classList.add('skryto');
        confirmBtn.disabled = true;
        confirmBtn.title = '';
      }
      if (abortBtn) {
        abortBtn.classList.add('skryto');
        abortBtn.disabled = true;
        abortBtn.title = '';
        abortBtn.onclick = null;
      }
      if (actionBtn) {
        if (timed && runCfg) {
          const startLabelSec = Math.max(60, Number(runCfg.durationSec) || 0);
          actionBtn.textContent = '';
          actionBtn.setAttribute('aria-label', `Pátrání (${startLabelSec}s)`);
          actionBtn.title = 'Zahájit pátrání';
          actionBtn.disabled = !!(maxF > 0 && locked && !matched);
        } else if (pokusyRezim) {
          actionBtn.textContent = '';
          actionBtn.setAttribute('aria-label', 'Pátrání');
          actionBtn.title = 'Zahájit pátrání';
          actionBtn.disabled = !!(pokClosed || (maxF > 0 && locked && !matched));
        }
      }
    }
    if (actionBtn) {
      actionBtn.onclick = () => {
        if (_wfCluePatrani.active) return;
        if (maxF > 0 && State.jeClueFocusZamceno && State.jeClueFocusZamceno(pripad.id)) return;
        if (timed) {
          if (!_wfCluePouzivaTimedHunt(pripad)) return;
          _wfCluePatraniSpust(pripad, onRozsudek);
        } else if (pokusyRezim) {
          _wfCluePokusySpust(pripad, onRozsudek);
        }
      };
    }
    if (confirmBtn) {
      confirmBtn.onclick = () => {
        const kandidat = (timed && _wfCluePatrani.active && _wfCluePatrani.best)
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
      (timed &&
        runCfg &&
        !aktivni &&
        !locked &&
        !matched &&
        (!_wfCluePatrani.hasRun || _wfCluePatrani.zahajitPovolenoPoInkoustu)) ||
      (pokusyRezim && !pokActive && !pokClosed && !matched)
    );
    if (headerWrap) headerWrap.classList.toggle('skryto', !showHeaderStart);

    const headerVys = document.getElementById('case-wf-clue-hud-header-vysledek');
    const huntUkonceno =
      matched ||
      (pokusyRezim && pokHasRun && pokClosed) ||
      (timed && _wfCluePatrani.hasRun);
    const showHeaderVysledek =
      !!huntUkonceno &&
      !showHeaderStart &&
      !(timed && needPaidHunt && !matched);
    if (headerVys) {
      if (!showHeaderVysledek) {
        headerVys.classList.add('skryto');
        headerVys.textContent = '';
        headerVys.classList.remove('case-wf-clue-hud-header-vysledek--neuspech');
      } else {
        const txt = _wfClueHeaderVysledekText(
          pripad,
          matched,
          pokusyRezim,
          pokClosed,
          pokHasRun,
          timed,
          !!_wfCluePatrani.hasRun
        );
        if (txt) {
          headerVys.textContent = txt;
          headerVys.classList.remove('skryto');
          headerVys.classList.toggle('case-wf-clue-hud-header-vysledek--neuspech', !matched);
        } else {
          headerVys.classList.add('skryto');
          headerVys.textContent = '';
          headerVys.classList.remove('case-wf-clue-hud-header-vysledek--neuspech');
        }
      }
    }

    const showDetail = !!(
      (timed &&
        !matched &&
        (aktivni || _wfCluePatrani.hasRun || (maxF > 0 && locked) || needPaidHunt)) ||
      (pokusyRezim &&
        !matched &&
        (pokActive || pokHasRun || (maxF > 0 && locked)))
    );
    if (detail) detail.classList.toggle('skryto', !showDetail);
    if (pokusyRezim || timed) {
      if (logEl) {
        logEl.style.right = '';
        logEl.style.left = '';
        logEl.style.top = '';
        logEl.style.bottom = '';
      }
      _wfCluePokusyVykresliZaznam(logEl, pripad);
    } else if (logEl) {
      logEl.classList.add('skryto');
      logEl.innerHTML = '';
    }

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

  /** Odstraní existující tlačítka slovníku (data mohou mít prokliky z pool JSON). */
  function _wfOdstranProklikySlovnikuZHtml(html) {
    const s = String(html || '');
    if (!s || typeof document === 'undefined') return s;
    const wrap = document.createElement('div');
    wrap.innerHTML = s;
    wrap.querySelectorAll('button.knihovna-link').forEach(btn => {
      btn.replaceWith(document.createTextNode(btn.textContent || ''));
    });
    return wrap.innerHTML;
  }

  /**
   * @param {{ bezSlovniku?: boolean }} [opts] — bez prokliků do knihovny (např. předehra Rozsudek / Dohra).
   */
  function _wfNastavRichText(el, text, opts) {
    if (!el) return;
    const bezSlovniku = !!(opts && opts.bezSlovniku);
    let html = _wfRichTextHtml(text);
    if (bezSlovniku) {
      html = _wfOdstranProklikySlovnikuZHtml(html);
      el.innerHTML = html;
      return;
    }
    el.innerHTML = html;
    if (typeof Knihovna !== 'undefined' && Knihovna.obalSlovnikemVElementu) {
      Knihovna.obalSlovnikemVElementu(el);
    }
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
    if (!pripad || pripad._lightMode === true) return;
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
    _wfCluePatrani.triedPairs = [];
    _wfCluePatrani.lastHeartbeatAt = 0;
    _wfCluePatrani.startedAt = Date.now();
    _wfCluePatrani.endsAt = Date.now() + (cfg.durationSec * 1000);
    _wfClueResetVolby();
    _wfClueResetKandidata();
    _wfClueAplikujUzamceni(pripad);
    _wfClueVykresliPotvrzeni(pripad, onRozsudek);
    _wfCluePatraniAktualizujUi();
    _wfCluePatraniHudUpdate(pripad, onRozsudek);
    const baseSec = (() => {
      const b = _wfClueTimedHuntZJsonu(pripad);
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
      if (typeof SFX !== 'undefined' && SFX.patraniNeuspech) SFX.patraniNeuspech();
      _wfClueResetVolby();
      _wfClueResetKandidata();
      _wfClueAplikujUzamceni(pripad);
      _wfClueVykresliPotvrzeni(pripad, onRozsudek);
      zobrazStavovouZpravu('Pátrání skončilo. Nenašli jste potvrzenou osu stop.');
    }, 250);
  }

  function _wfClueMaNarativVOdmene(rew) {
    if (!rew || typeof rew !== 'object') return false;
    if (Array.isArray(rew.narrative_lines) && rew.narrative_lines.some(s => String(s || '').trim())) return true;
    if (String(rew.narrative || '').trim()) return true;
    return false;
  }

  function _wfClueNarativalniOverlayOdstran() {
    document.getElementById('case-wf-clue-narrative-overlay')?.remove();
  }

  /**
   * Po potvrzené ose stop: krátký narativ z dat (3 věty / odstavce), OK → dokončí vykreslení potvrzení ve spisu.
   */
  function _wfClueZobrazNarativPoPotvrzeni(pripad, onRozsudek, rewards) {
    const mod = document.getElementById('modal-pripad');
    if (!mod || !pripad || !rewards || !_wfClueMaNarativVOdmene(rewards)) return;
    _wfClueNarativalniOverlayOdstran();
    const lines = Array.isArray(rewards.narrative_lines)
      ? rewards.narrative_lines.map(s => String(s || '').trim()).filter(Boolean)
      : [];
    const paras = lines.length
      ? lines
      : String(rewards.narrative || '')
          .split(/\n\s*\n/)
          .map(s => s.trim())
          .filter(Boolean);
    if (!paras.length) return;

    let onEscape = null;
    const zavrit = () => {
      if (onEscape) document.removeEventListener('keydown', onEscape, true);
      onEscape = null;
      _wfClueNarativalniOverlayOdstran();
      _wfClueVykresliPotvrzeni(pripad, onRozsudek);
    };

    const wrap = document.createElement('div');
    wrap.id = 'case-wf-clue-narrative-overlay';
    wrap.className = 'case-wf-clue-narrative-overlay';
    wrap.tabIndex = -1;
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');

    const inner = document.createElement('div');
    inner.className = 'case-wf-clue-narrative-inner narativ-shell fragment-panel panel-papir--nastup';

    const scena = document.createElement('div');
    scena.className = 'narativ-scena narativ-scena--patrani-zapis';

    const panel = document.createElement('section');
    panel.className = 'narativ-panel';

    const kicker = document.createElement('div');
    kicker.className = 'narativ-kicker';
    const kMain = document.createElement('span');
    kMain.className = 'narativ-kicker-main';
    kMain.textContent = 'Pátrání';
    const kDet = document.createElement('span');
    kDet.className = 'narativ-kicker-detail';
    kDet.textContent = 'Zápis';
    kicker.appendChild(kMain);
    kicker.appendChild(kDet);

    const nadpis = document.createElement('div');
    nadpis.className = 'narativ-nadpis case-wf-clue-narrative-nadpis';
    nadpis.textContent = 'Záznam z pátrání';

    const body = document.createElement('div');
    body.className = 'narativ-body fragment-text case-wf-clue-narrative-body';
    for (const p of paras) {
      const para = document.createElement('p');
      para.className = 'case-wf-clue-narr-p';
      para.textContent = p.replace(/\s+/g, ' ').trim();
      body.appendChild(para);
    }

    const actions = document.createElement('div');
    actions.className = 'narativ-actions';
    const ok = document.createElement('button');
    ok.type = 'button';
    ok.className = 'fragment-zavrit';
    ok.textContent = 'Rozumím';
    ok.addEventListener('click', () => zavrit());
    actions.appendChild(ok);

    panel.appendChild(kicker);
    panel.appendChild(nadpis);
    panel.appendChild(body);
    panel.appendChild(actions);

    scena.appendChild(panel);
    inner.appendChild(scena);
    wrap.appendChild(inner);

    onEscape = e => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      zavrit();
    };
    document.addEventListener('keydown', onEscape, true);

    /* document.body: nad #modal-pripad (z-index 200) a nad vnitřním stacking contextem panelu (transform spisu). */
    document.body.appendChild(wrap);
    requestAnimationFrame(() => {
      inner.classList.remove('panel-papir--nastup');
      void inner.offsetWidth;
      inner.classList.add('panel-papir--nastup');
    });
    ok.focus();
  }

  function _wfCluePotvrdKandidata(pripad, onRozsudek, kandidat, opts = {}) {
    if (!pripad || !kandidat || typeof Cases === 'undefined' || !Cases.potvrdTwoClickRozpor) return false;
    const predchoziVerdikty = _wfDostupneVerdiktIdSet(pripad);
    const final = { ...kandidat };
    if (_wfCluePatrani.active || opts.timeout === true) {
      final.strength = _wfCluePatraniStrengthProPotvrzeni(final.strength, {
        timeout: opts.timeout === true,
        zbyvaSec: Number(opts.zbyvaSec)
      });
    }
    const res = Cases.potvrdTwoClickRozpor(pripad, final);
    if (!res || !res.ok) return false;
    if (_wfClueMaPokusovyRezim(pripad)) {
      _wfCluePokusyKonecUspech(pripad);
    } else if (pripad && typeof State !== 'undefined' && State.vymazCluePatraniSession) {
      State.vymazCluePatraniSession(pripad.id);
    }
    _wfCluePatraniReset(true);
    if (typeof SFX !== 'undefined' && SFX.patraniUspech) SFX.patraniUspech();
    _wfClueResetVolby();
    _wfClueResetKandidata();
    _wfClueAplikujUzamceni(pripad);
    _wfAktualizujRozporBox(pripad);
    const narr = res.rewards && _wfClueMaNarativVOdmene(res.rewards);
    _aktualizujPruzkumPanel(pripad, onRozsudek, narr ? { skipClueConfirm: true } : undefined);
    if (narr) {
      _wfClueZobrazNarativPoPotvrzeni(pripad, onRozsudek, res.rewards);
    }
    _wfClueAplikujUzamceni(pripad);
    _wfPoPrvniAkciPruzkumu(pripad, onRozsudek, {
      predchoziVerdikty,
      bezRazitkaPriOdemceniVerdiktu: true,
      poPotvrzeniOsyPatrani: true
    });
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
    const timedCfg = _wfCluePouzivaTimedHunt(pripad);
    const pokusyCfg = _wfClueMaPokusovyRezim(pripad);
    const huntPanel = timedCfg || pokusyCfg;
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
      const title = huntPanel ? 'Výsledek pátrání' : 'Potvrzená osa stop';
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
    if (huntPanel) {
      const result = document.createElement('div');
      result.id = 'case-wf-clue-confirm-wrap';
      result.className = 'case-wf-clue-confirm-wrap';
      result.innerHTML = `<div class="case-wf-clue-confirm-title">Výsledek pátrání</div>`;
      const sub = document.createElement('div');
      sub.className = 'case-wf-clue-confirm-sub';
      if (!confirmed && timedCfg && _wfCluePatrani.active && !_wfClueKandidat) {
        sub.textContent = 'Pátrání běží. Označte ve spise dvě stopy pro průběžné vyhodnocení.';
        result.appendChild(sub);
        host.appendChild(result);
        return;
      }
      if (!confirmed && pokusyCfg && _wfCluePokusy.active && !_wfClueKandidat) {
        sub.textContent = 'Pátrání běží. ' + _wfCluePokusyPokusyRadek();
        result.appendChild(sub);
        host.appendChild(result);
        return;
      }
      if (!confirmed && timedCfg && _wfCluePatrani.active && _wfClueKandidat) {
        sub.textContent = `Aktuální kandidát: ${_wfClueSoudniTextSily(_wfClueKandidat.strength)} vazba.`;
        result.appendChild(sub);
        host.appendChild(result);
        return;
      }
      if (!confirmed && pokusyCfg && _wfCluePokusy.active && _wfClueKandidat) {
        sub.textContent = `Aktuální kandidát: ${_wfClueSoudniTextSily(_wfClueKandidat.strength)} vazba.`;
        result.appendChild(sub);
        host.appendChild(result);
        return;
      }
      if (!confirmed && timedCfg && !_wfCluePatrani.active && !_wfCluePatrani.hasRun) {
        sub.textContent = 'Pátrání zatím neproběhlo.';
        result.appendChild(sub);
        host.appendChild(result);
        return;
      }
      if (!confirmed && pokusyCfg && !_wfCluePokusy.active && !_wfCluePokusy.hasRun) {
        sub.textContent = 'Pátrání zatím neproběhlo.';
        result.appendChild(sub);
        host.appendChild(result);
        return;
      }
      if (!confirmed && timedCfg && !_wfCluePatrani.active && _wfCluePatrani.hasRun) {
        // Běh už skončil: buď je výsledek ve stavu (výše se vykreslí v confirmed), nebo nic
        return;
      }
      if (!confirmed && pokusyCfg && _wfCluePokusy.hasRun && _wfCluePokusy.closed) {
        return;
      }
    }
    if (maPlnouInformovanost && !_wfClueKandidat && !((timedCfg && _wfCluePatrani.active) || (pokusyCfg && _wfCluePokusy.active))) {
      const infoBox = document.createElement('div');
      infoBox.id = 'case-wf-clue-confirm-wrap';
      infoBox.className = 'case-wf-clue-confirm-wrap';
      infoBox.innerHTML =
        `<div class="case-wf-clue-confirm-title">Informovanost je plná</div>` +
        `<div class="case-wf-clue-confirm-sub">Stopy zůstávají aktivní. Můžete ještě potvrdit osu stop, nebo případ rovnou uzavřít rozsudkem.</div>`;
      host.appendChild(infoBox);
      return;
    }
    if (!_wfClueKandidat && !(_wfCluePatrani.active && timedCfg) && !(_wfCluePokusy.active && pokusyCfg)) {
      return;
    }
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
    } else if (_wfCluePokusy.active && pokusyCfg) {
      const meta = document.createElement('div');
      meta.className = 'case-wf-clue-hunt-meta';
      meta.textContent = _wfCluePokusyPokusyRadek();
      wrap.appendChild(meta);
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
    if (!modal) return;
    if (!pripad) {
      modal.classList.remove('case-wf-clue-patrani-ui');
      return;
    }
    const clues = Array.from(modal.querySelectorAll('.clue[data-clue-id]'));
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
    const timedCfg = _wfCluePouzivaTimedHunt(pripad);
    const pokusyCfg = _wfClueMaPokusovyRezim(pripad);
    const maxF = _wfClueFocusMax(pripad);
    const focusLocked = maxF > 0 && typeof State !== 'undefined' && State.jeClueFocusZamceno
      ? State.jeClueFocusZamceno(pripad.id)
      : false;
    const huntActive =
      (timedCfg && _wfCluePatrani.active) ||
      (pokusyCfg && _wfCluePokusy.active && !_wfCluePokusy.closed);
    const huntClosedFail = pokusyCfg && _wfCluePokusy.closed && !matched;
    modal.classList.toggle('case-wf-clue-timed', !!timedCfg);
    modal.classList.toggle('case-wf-clue-hunt-active', !!huntActive && !focusLocked);
    const encyklopedieSkryt =
      (!!timedCfg && !matched && (!!_wfCluePatrani.active || focusLocked)) ||
      (!!pokusyCfg && !matched && !!_wfCluePokusy.active);
    modal.classList.toggle('case-wf-clue-patrani-ui', encyklopedieSkryt);
    if (!clues.length) return;
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
    } else if (pokusyCfg && _wfCluePokusy.active) {
      clues.forEach(el => el.classList.add('clue--hunt-active'));
    } else if (huntClosedFail) {
      clues.forEach(el => el.classList.add('clue--locked'));
    }
    // Při časovaném / pokusovém pátrání: kandidát jen během aktivní fáze
    if (!matched && !focusLocked) {
      const tOk = !timedCfg || _wfCluePatrani.active;
      const pOk = !pokusyCfg || (_wfCluePokusy.active && !_wfCluePokusy.closed);
      if (tOk && pOk) {
        _wfClueAplikujKandidatVizual();
      }
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
    const conBody = document.getElementById('case-wf-contradiction-body');
    const c0 = pripad && pripad.contradictions && pripad.contradictions[0];
    if (!conEl || !c0 || !c0.description) return;
    const matched = typeof Cases !== 'undefined' && Cases.maPotvrzenouClueVazbu
      ? Cases.maPotvrzenouClueVazbu(pripad)
      : false;
    const show = matched || _wfJeVysokaMoudrostProRozpor(pripad);
    const telo = conBody || conEl;
    _wfNastavRichText(telo, c0.description);
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
    const pokusyCfg = _wfClueMaPokusovyRezim(pripad);
    if (pokusyCfg) {
      if (_wfCluePokusy.closed) {
        zobrazStavovouZpravu('Pátrání v tomto spise je uzavřené.');
        return;
      }
      if (!_wfCluePokusy.active) {
        zobrazStavovouZpravu('Nejdřív spusťte pátrání tlačítkem v panelu.');
        return;
      }
    }
    const timedCfg = _wfCluePouzivaTimedHunt(pripad);
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
      const huntAktivni =
        (pokusyCfg && _wfCluePokusy.active) || (timedCfg && _wfCluePatrani.active);
      if (huntAktivni) {
        if (typeof SFX !== 'undefined' && SFX.patraniNeuspech) SFX.patraniNeuspech();
      } else if (typeof SFX !== 'undefined' && SFX.slozkaPaper) SFX.slozkaPaper();
      if (pokusyCfg && _wfCluePokusy.active) {
        _wfCluePokusyZalogujDvojici(prvni.id, clueId, 'miss');
      } else if (timedCfg && _wfCluePatrani.active) {
        _wfCluePatraniZalogujDvojici(prvni.id, clueId, 'miss');
      }
      prvni.el.classList.add('clue--miss');
      clueEl.classList.add('clue--miss');
      if (pokusyCfg && _wfCluePokusy.active) {
        const zust = Math.max(0, (Number(_wfCluePokusy.attemptsLeft) || 0) - 1);
        _wfCluePokusy.attemptsLeft = zust;
        _wfCluePokusyUlozSession(pripad);
        if (State?.uloz) State.uloz();
        if (zust <= 0) {
          _wfCluePokusyKonecNeuspech(pripad);
          zobrazStavovouZpravu('Pátrání uzavřeno. Rozhodněte podle toho, co ve spisu máte.');
        } else {
          zobrazStavovouZpravu(`Tohle nesedí. Zbývá vám ${zust} z ${_wfCluePokusy.maxAttempts} pokusů.`);
        }
        setTimeout(() => _wfClueResetVolby(), 260);
        _wfCluePatraniHudUpdate(pripad, _wfClueAktivniOnRozsudek);
        _wfClueAplikujUzamceni(pripad);
        _wfClueVykresliPotvrzeni(pripad, _wfClueAktivniOnRozsudek);
        if (typeof Desk !== 'undefined' && Desk.aktualizujVse) Desk.aktualizujVse();
        return;
      }
      const maxF2 = _wfClueFocusMax(pripad);
      if (maxF2 > 0 && !pokusyCfg && typeof State !== 'undefined' && State.spotrebujClueFocusTvrdyPokus) {
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
        if (timedCfg && _wfCluePatrani.active) {
          _wfCluePatraniHudUpdate(pripad, _wfClueAktivniOnRozsudek);
        }
      }
      setTimeout(() => _wfClueResetVolby(), 260);
      return;
    }

    if (vys.softFail === true) {
      if (pokusyCfg && _wfCluePokusy.active) {
        _wfCluePokusyZalogujDvojici(prvni.id, clueId, 'miss');
      } else if (timedCfg && _wfCluePatrani.active) {
        _wfCluePatraniZalogujDvojici(prvni.id, clueId, 'miss');
      }
      if (pokusyCfg && _wfCluePokusy.active) {
        _wfCluePokusyUlozSession(pripad);
        if (State?.uloz) State.uloz();
      }
      if ((pokusyCfg && _wfCluePokusy.active) || (timedCfg && _wfCluePatrani.active)) {
        _wfCluePatraniHudUpdate(pripad, _wfClueAktivniOnRozsudek);
      }
      prvni.el.classList.remove('clue--selected');
      clueEl.classList.remove('clue--selected');
      zobrazStavovouZpravu(vys.softMessage || 'Tyto informace spolu souvisí, ale neprokazují lživou výpověď.');
      setTimeout(() => _wfClueResetVolby(), 120);
      return;
    }

    prvni.el.classList.remove('clue--selected');
    clueEl.classList.remove('clue--selected');
    /* Během pátrání zní jen piano při finálním potvrzení (`patraniUspech`) — ne pera vedle něj. */
    const tichoPeraPriPatrani =
      (pokusyCfg && _wfCluePokusy.active) || (timedCfg && _wfCluePatrani.active);
    if (!tichoPeraPriPatrani && typeof SFX !== 'undefined' && SFX.penWriting) SFX.penWriting();
    _wfClueKandidat = {
      pairId: vys.pairId,
      strength: vys.strength,
      label: vys.label,
      aId: vys.aId,
      bId: vys.bId
    };
    if (pokusyCfg && _wfCluePokusy.active) {
      _wfCluePokusyZalogujDvojici(vys.aId, vys.bId, String(vys.strength || 'weak'));
      const s = String(vys.strength || '');
      if (PATRANI_CONFIG.close_on_any_pair || s === 'strong') {
        const k0 = { ..._wfClueKandidat };
        _wfClueResetVolby();
        _wfCluePotvrdKandidata(pripad, _wfClueAktivniOnRozsudek, k0, { timeout: false, zbyvaSec: 0 });
        return;
      }
      _wfClueResetVolby();
      _wfClueAplikujUzamceni(pripad);
      _wfClueVykresliPotvrzeni(pripad, _wfClueAktivniOnRozsudek);
      _wfCluePatraniHudUpdate(pripad, _wfClueAktivniOnRozsudek);
      _wfCluePokusyUlozSession(pripad);
      if (State?.uloz) State.uloz();
      const curP = _wfClueSoudniTextSily(vys.strength);
      zobrazStavovouZpravu(
        s === 'weak' || s === 'medium'
          ? `Něco jste našli — ${curP} vazba. Je to dost, nebo hledáte dál?`
          : `Nalezena ${curP} vazba. Můžete potvrdit, nebo hledat dál.`
      );
      return;
    }
    const huntRes = _wfCluePatraniUlozKandidata(vys);
    if (timedCfg && _wfCluePatrani.active) {
      _wfCluePatraniZalogujDvojici(vys.aId, vys.bId, String(vys.strength || 'weak'));
    }
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
      _wfCluePatraniHudUpdate(pripad, _wfClueAktivniOnRozsudek);
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

  function _pripravPredohruConsequenceOverlay() {
    const prelude = document.getElementById('pripad-consequence-prelude');
    if (prelude && prelude.parentElement !== document.body) {
      document.body.appendChild(prelude);
    }
    return prelude;
  }

  function _zavriPripadModal() {
    const pZav = _wfClueAktivniPripad;
    const onZav = _wfClueAktivniOnRozsudek;
    if (pZav && _wfCluePatrani.active && _wfCluePouzivaTimedHunt(pZav)) {
      const zbyvaZav = _wfCluePatraniZbyvaSec();
      const bestZav = _wfCluePatrani.best ? { ..._wfCluePatrani.best } : null;
      if (bestZav) {
        const potvrzeno = _wfCluePotvrdKandidata(pZav, onZav, bestZav, {
          timeout: false,
          zbyvaSec: zbyvaZav
        });
        if (!potvrzeno) {
          if (typeof SFX !== 'undefined' && SFX.patraniNeuspech) SFX.patraniNeuspech();
          _wfCluePatraniZastavTimer();
          _wfCluePatraniReset(true);
          _wfCluePatraniUlozKonecNeuspech(pZav);
          _wfClueResetVolby();
          _wfClueResetKandidata();
          _wfClueAplikujUzamceni(pZav);
        }
      } else {
        if (typeof SFX !== 'undefined' && SFX.patraniNeuspech) SFX.patraniNeuspech();
        _wfCluePatraniZastavTimer();
        _wfCluePatraniReset(true);
        _wfCluePatraniUlozKonecNeuspech(pZav);
        _wfClueResetVolby();
        _wfClueResetKandidata();
        _wfClueAplikujUzamceni(pZav);
        zobrazStavovouZpravu('Pátrání ukončeno zavřením spisu. Nenašli jste v čase potvrzenou osu stop.');
      }
    } else if (pZav && _wfClueMaPokusovyRezim(pZav) && _wfCluePokusy.active) {
      _wfCluePokusyPozastav(pZav);
      _wfClueAplikujUzamceni(pZav);
      _wfClueVykresliPotvrzeni(pZav, onZav);
      _wfCluePatraniHudUpdate(pZav, onZav);
      zobrazStavovouZpravu('Pátrání pozastaveno. Po znovuotevření spisu můžete pokračovat se zbývajícími pokusy.');
    } else {
      _wfCluePatraniReset();
      _wfCluePokusyReset();
    }
    _wfClueResetVolby();
    _wfClueResetKandidata();
    _wfClueNarativalniOverlayOdstran();
    document.getElementById('case-wf-clue-confirm-wrap')?.remove();
    const floatingLog = document.getElementById('case-wf-clue-hud-log');
    if (floatingLog) {
      floatingLog.classList.add('skryto');
      floatingLog.innerHTML = '';
    }
    const headerVysZav = document.getElementById('case-wf-clue-hud-header-vysledek');
    if (headerVysZav) {
      headerVysZav.classList.add('skryto');
      headerVysZav.textContent = '';
      headerVysZav.classList.remove('case-wf-clue-hud-header-vysledek--neuspech');
    }
    _wfClueAktivniPripad = null;
    _wfClueAktivniOnRozsudek = null;
    const ctxZ = _predohraConsequenceCtx;
    if (ctxZ && ctxZ.stage === 'aftermath' && ctxZ.pripad && ctxZ.rozsudek) {
      _archivPoZavreniReadonlyTab = null;
      _dokoncitRozsudekPoAftermath(ctxZ.pripad, ctxZ.rozsudek);
      return;
    }
    _wfResetVerdictUi();
    const modP = document.getElementById('modal-pripad');
    const bylReadonly = !!(modP && modP.dataset.verdictMode === 'readonly');
    const archivPoZavreni = _archivPoZavreniReadonlyTab;
    if (modP) {
      delete modP.dataset.verdictMode;
      modP.querySelector('.pripad-panel--wireframe')?.classList.remove('pripad-panel--pripad-readonly');
      modP.classList.remove('case-wf-clue-patrani-ui');
    }
    _anulujPredohruConsequence();
    _archivNavZpetTab = null;
    _archivPoZavreniReadonlyTab = null;
    document.getElementById('pripad-zpet-do-archivu')?.classList.add('skryto');
    _zavriModal('modal-pripad');
    Desk.nastavAktivniSpis(null);
    if (bylReadonly && archivPoZavreni) {
      zobrazArchiv(archivPoZavreni);
    }
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
    _wfNastavRichText(p1, a || '—');
    wrap.appendChild(p1);
    if (b) {
      const p2 = document.createElement('p');
      p2.className = 'rozsudky-shrnuti-radek';
      _wfNastavRichText(p2, b);
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
    const prelude = _pripravPredohruConsequenceOverlay();
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

    const prelude = _pripravPredohruConsequenceOverlay();
    const txtEl = document.getElementById('pripad-consequence-prelude-text');
    const inner = prelude?.querySelector('.pripad-consequence-prelude-inner');
    const hintEl = prelude?.querySelector('.pripad-consequence-prelude-hint');
    if (prelude && txtEl) {
      const scena = document.getElementById('pripad-consequence-narativ-scena');
      if (scena) scena.className = 'narativ-scena narativ-scena--rozsudek narativ-scena--aftermath';
      const kicker = document.getElementById('pripad-consequence-prelude-kicker');
      if (kicker) kicker.textContent = 'PO ROZSUDKU';
      const panelKicker = document.querySelector('#pripad-consequence-prelude .pripad-consequence-panel-kicker');
      if (panelKicker) panelKicker.textContent = 'PO ROZSUDKU';
      const nadpis = document.getElementById('pripad-consequence-prelude-nadpis');
      if (nadpis) nadpis.textContent = 'Dohra';
      const panelNadpis = document.querySelector('#pripad-consequence-prelude .pripad-consequence-panel-nadpis');
      if (panelNadpis) panelNadpis.textContent = 'Dohra';
      _narativNastavObraz(
        document.getElementById('pripad-consequence-narativ-obraz'),
        'court'
      );
      _wfNastavRichText(txtEl, _textAftermath(pripad, rozsudek), { bezSlovniku: true });
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
    const prelude = _pripravPredohruConsequenceOverlay();
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

    /** Haas + Závadová (tyč): předehra bez slovníku soudu / rozsudku. */
    const jeOsobniBezRozsudecniPrelude = _wfMaOsobniVerdiktBezTrestnihoRz(pripad);
    const protoVeta = jeOsobniBezRozsudecniPrelude
      ? ''
      : 'Jménem republiky se vynáší tento rozsudek.';
    const raw = (rozsudek.consequence && String(rozsudek.consequence).trim())
      || (rozsudek.text && String(rozsudek.text).trim())
      || '—';
    const scena = document.getElementById('pripad-consequence-narativ-scena');
    if (scena) scena.className = 'narativ-scena narativ-scena--rozsudek narativ-scena--verdict';
    const kicker = document.getElementById('pripad-consequence-prelude-kicker');
    const panelKicker = document.querySelector('#pripad-consequence-prelude .pripad-consequence-panel-kicker');
    const nadpis = document.getElementById('pripad-consequence-prelude-nadpis');
    const panelNadpis = document.querySelector('#pripad-consequence-prelude .pripad-consequence-panel-nadpis');
    if (jeOsobniBezRozsudecniPrelude) {
      if (kicker) kicker.textContent = '';
      if (panelKicker) panelKicker.textContent = '';
      if (nadpis) nadpis.textContent = 'Rozhodnutí';
      if (panelNadpis) panelNadpis.textContent = 'Rozhodnutí';
    } else {
      if (kicker) kicker.textContent = 'ROZSUDEK';
      if (panelKicker) panelKicker.textContent = 'ROZSUDEK';
      if (nadpis) nadpis.textContent = 'Vynesení rozsudku';
      if (panelNadpis) panelNadpis.textContent = 'Vynesení rozsudku';
    }
    _narativNastavObraz(
      document.getElementById('pripad-consequence-narativ-obraz'),
      'verdict'
    );
    const teloPredohry = jeOsobniBezRozsudecniPrelude
      ? raw
      : (protoVeta ? `${protoVeta} ${raw}` : raw);
    _wfNastavRichText(txtEl, teloPredohry, { bezSlovniku: true });
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

  /** Šipka zpět v záhlaví spisu: záložka zápisníku po kliknutí (legacy / jiné toky). */
  let _archivNavZpetTab = null;
  /**
   * Readonly otevřený z Rozsudků (Detail): po zavření spisu (✕ / Esc) znovu otevřít zápisník na této záložce.
   * Nezobrazuje šipku — návrat jen zavřením modalu případu.
   */
  let _archivPoZavreniReadonlyTab = null;

  /** Podzáložka Knihovny: pribeh | pravidla | slovnik */
  let _knihovnaPodpanel = 'pribeh';
  /** Podzáložka Pověsti v zápisníku: lide | frakce */
  let _povestArchivPodtab = 'lide';
  /** Po otevření slovníku: scroll na heslo (id z JSON). */
  let _knihovnaAnchorId = null;
  /** Po otevření zápisníku na Pověst: scroll na záznam postavy (id z postavy_okoli.json). */
  let _povestZapisnikAnchorId = null;
  /** Filtr záložky Rozsudky: všechny typy nebo jeden z rutinní | morální | politický | osobní. */
  let _archivRozsudkyFiltrTyp = 'vse';
  /** Filtr záložky Záznamy: nové narativní typy. */
  let _archivFragmentyFiltrTyp = 'vse';

  const _STATS_MODES = ['intuitive', 'hybrid', 'spreadsheet'];

  function _getStatsDisplayMode() {
    let m = String(State.get('statsDisplayMode') || 'hybrid').trim();
    if (!_STATS_MODES.includes(m)) m = 'hybrid';
    return m;
  }

  /** Pásmo 0–100 → index 0…4 (po 20 bodech). */
  function _statPasmoIndex100(v) {
    const x = Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
    return Math.min(4, Math.floor(x / 20));
  }

  /** Slovník pásem duše (krátké popisky). */
  const _STAT_PASMA_TRAIT = {
    Integrita: ['zlomená', 'narušená', 'vyrovnaná', 'pevná', 'celistvá'],
    Odvaha: ['ochromená', 'váhající', 'opatrná', 'rozhodná', 'nezlomná'],
    Moudrost: ['slepá', 'tápající', 'střízlivá', 'bystrá', 'hluboká'],
    Vina: ['nepřítomná', 'tlumená', 'živá', 'tíživá', 'drtivá'],
    Nadeje: ['vyhaslá', 'mdlá', 'přítomná', 'silná', 'zářivá']
  };

  /** Společná škála postoje města k frakci (0–100). */
  const _STAT_PASMA_FRAKCE = ['nenáviděn', 'v nemilosti', 'neutrální', 'oblíben', 'milován'];

  const _STAT_PASMA_TRUST = ['chladná', 'rezervovaná', 'vřelá', 'oddaná'];

  function _statPasmoTextTrait(klic, hodnotaPo) {
    const arr = _STAT_PASMA_TRAIT[klic];
    if (!arr) return '';
    return arr[_statPasmoIndex100(hodnotaPo)] || '';
  }

  function _statPasmoTextFrakce(hodnotaPo) {
    return _STAT_PASMA_FRAKCE[_statPasmoIndex100(hodnotaPo)] || '';
  }

  function _statPasmoTextTrust(hvezdy0_3) {
    const h = Math.max(0, Math.min(3, Math.round(Number(hvezdy0_3) || 0)));
    return _STAT_PASMA_TRUST[h] || '';
  }

  /** 1–3 šipky podle síly změny (trait/frakce 0–100 nebo důvěra 0–3). */
  function _statSipkyZmeny(delta, skala) {
    const d = Number(delta) || 0;
    const a = Math.abs(Math.round(d));
    if (!a) return '·';
    let n = 1;
    if (skala === 3) {
      n = Math.min(3, a);
    } else {
      if (a >= 12) n = 3;
      else if (a >= 5) n = 2;
      else n = 1;
    }
    const ch = d > 0 ? '▲' : '▼';
    return ch.repeat(n);
  }

  /** Barevné šipky (HTML) — tučné jen samotné ▲▼, ne popisek veličiny. */
  function _statSipkyZmenyHtml(delta, skala) {
    const d = Number(delta) || 0;
    const a = Math.abs(Math.round(d));
    if (!a) {
      return '<span class="wf-delta-sipky wf-delta-sipky--neutral" aria-hidden="true">·</span>';
    }
    let n = 1;
    if (skala === 3) {
      n = Math.min(3, a);
    } else {
      if (a >= 12) n = 3;
      else if (a >= 5) n = 2;
      else n = 1;
    }
    const ch = d > 0 ? '▲' : '▼';
    const sm = d > 0 ? 'up' : 'down';
    return (
      `<span class="wf-delta-sipky wf-delta-sipky--${sm} wf-delta-sipky--tier${n}" aria-hidden="true">` +
      `${ch.repeat(n)}</span>`
    );
  }

  function _statSilaSlovo(delta, skala) {
    const a = Math.abs(Number(delta) || 0);
    if (skala === 3) {
      if (a <= 0) return '';
      if (a === 1) return 'jemně';
      if (a === 2) return 'znatelně';
      return 'silně';
    }
    if (a <= 3) return 'slabě';
    if (a <= 8) return 'středně';
    if (a <= 15) return 'silně';
    return 'hluboce';
  }

  /**
   * Text pravého sloupce u dopadu (finance vždy přesně v Kčs).
   * @param {{ typ: string, delta: number, skala?: number|null, po?: number, klic?: string }} r
   * @param {{ jenZmena?: boolean }} [opts] — archiv / readonly: bez popisu cílového pásma, jen změna (šipky; tabulkově čísla).
   */
  function _dusledkyFormatDeltaText(r, mode, opts) {
    const jenZmena = !!(opts && opts.jenZmena);
    if (r.typ === 'finance') {
      const z = r.delta > 0 ? '+' : '';
      return `${z}${r.delta} Kčs`;
    }
    const m = mode || _getStatsDisplayMode();
    const sipky = _statSipkyZmeny(r.delta, r.skala);
    if (m === 'spreadsheet') {
      return sipky;
    }
    if (m === 'intuitive' || (m === 'hybrid' && jenZmena)) {
      return sipky;
    }
    /* hybrid — plný popis včetně pásma (modál důsledků) */
    let pasmo = '';
    if (r.typ === 'trait' && r.klic) {
      pasmo = _statPasmoTextTrait(r.klic, r.po);
    } else if (r.typ === 'faction' && r.klic) {
      pasmo = _statPasmoTextFrakce(r.po);
    } else if (r.typ === 'trust') {
      pasmo = _statPasmoTextTrust(r.po);
    }
    return pasmo ? `${sipky} · ${pasmo}` : sipky;
  }

  /** HTML varianta dopadu — šipky barevně, finance číslem. */
  function _dusledkyFormatDeltaHtml(r, mode, opts) {
    const jenZmena = !!(opts && opts.jenZmena);
    if (r.typ === 'finance') {
      const z = r.delta > 0 ? '+' : '';
      return `${z}${r.delta} Kčs`;
    }
    const m = mode || _getStatsDisplayMode();
    const sipkyHtml = _statSipkyZmenyHtml(r.delta, r.skala);
    if (m === 'spreadsheet' || m === 'intuitive' || (m === 'hybrid' && jenZmena)) {
      return sipkyHtml;
    }
    let pasmo = '';
    if (r.typ === 'trait' && r.klic) {
      pasmo = _statPasmoTextTrait(r.klic, r.po);
    } else if (r.typ === 'faction' && r.klic) {
      pasmo = _statPasmoTextFrakce(r.po);
    } else if (r.typ === 'trust') {
      pasmo = _statPasmoTextTrust(r.po);
    }
    return pasmo
      ? `${sipkyHtml}<span class="wf-delta-pasmo"> · ${_escVelicinaHtml(pasmo)}</span>`
      : sipkyHtml;
  }

  function _dusledkyFormatNovaHodnotaText(r, mode) {
    if (r.typ === 'finance') {
      return `${r.po} Kčs`;
    }
    const m = mode || _getStatsDisplayMode();
    if (m === 'spreadsheet') {
      return String(r.po);
    }
    if (r.typ === 'trait' && r.klic) {
      return _statPasmoTextTrait(r.klic, r.po) || String(r.po);
    }
    if (r.typ === 'faction' && r.klic) {
      return _statPasmoTextFrakce(r.po) || String(r.po);
    }
    if (r.typ === 'trust') {
      return _statPasmoTextTrust(r.po) || String(r.po);
    }
    return String(r.po);
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

  function _dusledkyIkonaAssetu(r) {
    if (r.typ === 'finance') return 'src/effect-finance.png';
    if (r.typ === 'trait') {
      const M = {
        Integrita: 'src/effect-integrita.png',
        Odvaha: 'src/effect-odvaha.png',
        Moudrost: 'src/effect-moudrost.png',
        Vina: 'src/effect-vina.png',
        Nadeje: 'src/effect-nadeje.png'
      };
      return M[r.klic] || '';
    }
    if (r.typ === 'faction') {
      const M = {
        Moc: 'src/effect-moc.png',
        Kapital: 'src/effect-korporat.png',
        Lid: 'src/effect-lid.png'
      };
      return M[r.klic] || '';
    }
    return '';
  }

  function _dusledkyIkonaAssetKlic(r) {
    if (r.typ === 'finance') return 'finance';
    if (r.typ === 'trait') {
      const M = {
        Integrita: 'integrita',
        Odvaha: 'odvaha',
        Moudrost: 'moudrost',
        Vina: 'vina',
        Nadeje: 'nadeje'
      };
      return M[r.klic] || '';
    }
    if (r.typ === 'faction') {
      const M = {
        Moc: 'moc',
        Kapital: 'korporat',
        Lid: 'lid'
      };
      return M[r.klic] || '';
    }
    return '';
  }

  function _dusledkyKratkyNazev(r) {
    if (r.typ === 'trust') return 'Důvěra: ' + (_NPC_TRUST_LABEL[r.klic] || r.klic);
    const puvodni = String(r.label || '');
    if (r.typ === 'finance') {
      if (!puvodni || puvodni === 'Finance (zůstatek)') return 'Finance';
      return puvodni;
    }
    if (r.typ === 'trait') {
      if (r.klic === 'Nadeje') return 'Naděje';
      if (puvodni) return puvodni.replace(/Nadeje/g, 'Naděje');
    }
    return puvodni;
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
        label: vlastniLab || 'Finance',
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
        label:
          typeof Traits !== 'undefined' && typeof Traits.getNazevRysuProUi === 'function'
            ? Traits.getNazevRysuProUi(nazev)
            : nazev,
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
    const pp = r2(predPct);
    const pk = r2(poPct);
    let ztrataW = r2(Math.max(0, pp - pk));
    if (r.delta < 0 && ztrataW < 0.15) ztrataW = 0.15;
    const ik = _dusledkyIkonaRadku(r);
    const nazev = _dusledkyKratkyNazev(r);
    const modeD = _getStatsDisplayMode();
    const deltaText = _dusledkyFormatDeltaText(r, modeD);
    const novaText = _dusledkyFormatNovaHodnotaText(r, modeD);

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

  /**
   * Jen ikona + název + delta — podle statsDisplayMode (finance vždy přesně Kčs).
   * @param {{ jenZmena?: boolean }} [opts] — true: kompaktní řádek jen zisk/ztráta (bez pásma u hybridu).
   */
  function _dusledkyVytvorKompaktEfekty(radky, opts) {
    const box = document.createElement('div');
    box.className = 'rozsudek-efekty-cisla';
    if (!radky || !radky.length) return box;
    const mode = _getStatsDisplayMode();
    for (const r of radky) {
      const plus = r.delta > 0;
      const delStr = _dusledkyFormatDeltaText(r, mode, opts);
      const row = document.createElement('div');
      row.className = 'rozsudek-efekt-radek';
      const ik = document.createElement('span');
      ik.className = 'rozsudek-efekt-ikona';
      ik.setAttribute('aria-hidden', 'true');
      const iconAsset = _dusledkyIkonaAssetu(r);
      if (iconAsset) {
        ik.classList.add('rozsudek-efekt-ikona--asset');
        const iconKey = _dusledkyIkonaAssetKlic(r);
        if (iconKey) ik.classList.add(`rozsudek-efekt-ikona--${iconKey}`);
        ik.style.setProperty('--effect-icon-url', `url("${iconAsset}")`);
        const img = document.createElement('img');
        img.src = iconAsset;
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.onerror = () => {
          ik.classList.remove('rozsudek-efekt-ikona--asset');
          ik.style.removeProperty('--effect-icon-url');
          ik.textContent = _dusledkyIkonaRadku(r);
        };
        ik.appendChild(img);
      } else {
        ik.textContent = _dusledkyIkonaRadku(r);
      }
      const lab = document.createElement('span');
      lab.className = 'rozsudek-efekt-label';
      lab.textContent = _dusledkyKratkyNazev(r);
      const del = document.createElement('span');
      del.className = 'rozsudek-efekt-delta';
      if (r.typ === 'finance') {
        del.classList.add(plus ? 'rozsudek-efekt-delta--plus' : 'rozsudek-efekt-delta--minus');
        del.textContent = delStr;
      } else {
        del.innerHTML = _dusledkyFormatDeltaHtml(r, mode, opts);
      }
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

  const _ARCHIV_ROZ_TYP_FILTRY = [
    { id: 'vse', lab: 'Všechny' },
    { id: 'rutinni', lab: 'Rutinní' },
    { id: 'moralni', lab: 'Morální' },
    { id: 'politicky', lab: 'Politický' },
    { id: 'osobni', lab: 'Osobní' }
  ];

  const _ARCHIV_FRAGMENT_TYP_FILTRY = [
    { id: 'vse', lab: 'Všechny' },
    { id: 'dopis', lab: 'Dopisy' },
    { id: 'denni', lab: 'Denní fragmenty' },
    { id: 'sen', lab: 'Sny' }
  ];

  function _archivFragmentObjekt(zaznam) {
    const isInline = zaznam && typeof zaznam === 'object';
    const idRaw = isInline ? (zaznam.id || zaznam.archiveId) : zaznam;
    const id = String(idRaw == null ? '' : idRaw).trim();
    if (!id) return null;
    const base =
      typeof DataLoader !== 'undefined' && DataLoader.ziskejFragment
        ? DataLoader.ziskejFragment(id)
        : null;
    if (isInline) {
      const f = Object.assign({}, base || {}, zaznam);
      if (!base && !(f.title || f.text)) return null;
      return { isInline: true, id, f };
    }
    if (!base) return null;
    return { isInline: false, id, f: base };
  }

  function _archivFragmentKategorie(f) {
    const typ = String(f && f.type || '').trim().toLowerCase();
    if (typ === 'letter') return 'dopis';
    if (typ === 'dream') return 'sen';
    if (typ === 'clipping' || typ === 'fragment' || typ === 'morning' || typ === 'evening') return 'denni';
    /* Bez filtru „Ostatní“: neznámý typ se řadí mezi denní, ať není mimo všechny podzáložky. */
    return 'denni';
  }

  function _archivFragmentKategorieLabel(kat) {
    if (kat === 'dopis') return 'DOPIS';
    if (kat === 'sen') return 'SEN';
    if (kat === 'denni') return 'FRAGMENT';
    return 'ZÁZNAM';
  }

  function _archivFragmentDen(zaznam) {
    const f = zaznam && zaznam.f;
    const direct = Number(f && f.day);
    if (Number.isFinite(direct) && direct > 0) return Math.round(direct);
    const rawId = String((f && (f.id || f.archiveId)) || (zaznam && zaznam.id) || '');
    const m = rawId.match(/(?:^|_)d(\d+)(?:_|$)/i);
    if (m) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n > 0) return Math.round(n);
    }
    return null;
  }

  function _archivFragmentDatumText(den) {
    const n = Number(den);
    if (!Number.isFinite(n) || n <= 0) return 'Datum —';
    const date = new Date(1931, 2, 2);
    date.setDate(date.getDate() + Math.round(n) - 1);
    const dny = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];
    const mesice = [
      'ledna',
      'února',
      'března',
      'dubna',
      'května',
      'června',
      'července',
      'srpna',
      'září',
      'října',
      'listopadu',
      'prosince'
    ];
    return `${dny[date.getDay()]}, ${date.getDate()}. ${mesice[date.getMonth()]} ${date.getFullYear()}`;
  }

  function _archivNazevTypuChip(typ) {
    const t = String(typ || 'rutinni');
    if (t === 'moralni') return 'MORÁLNÍ';
    if (t === 'politicky') return 'POLITICKÝ';
    if (t === 'osobni') return 'OSOBNÍ';
    return 'RUTINNÍ';
  }

  /** Typ případu pro archivní záznam (`caseType` nebo dopočet ze spisu). */
  function _archivRozsudekTypZaznamu(r) {
    const raw = r && r.caseType != null ? String(r.caseType).trim().toLowerCase() : '';
    if (raw && _TYPY_PRIPADU.includes(raw)) return raw;
    const cid = r && r.caseId != null ? String(r.caseId).trim() : '';
    const p = cid && typeof DataLoader !== 'undefined' && DataLoader.ziskejPripad ? DataLoader.ziskejPripad(cid) : null;
    if (p && typeof Cases !== 'undefined' && Cases.typProZobrazeni) {
      const t2 = String(Cases.typProZobrazeni(p) || '').trim().toLowerCase();
      if (t2 && _TYPY_PRIPADU.includes(t2)) return t2;
    }
    return 'rutinni';
  }

  function _archivJeOsobniZaznam(r) {
    return _archivRozsudekTypZaznamu(r) === 'osobni';
  }

  /** Kotva v Knihovně → Pravidla (slug z názvu bloku). */
  function _knihovnaPravidloSlug(title) {
    return String(title || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  const _ARCHIV_PRAVIDLA_KOTVA = 'archiv-rozsudku';

  function _otevriPravidlaArchivRozsudku() {
    zobrazArchiv('knihovna', {
      knihovna: { panel: 'pravidla', anchorId: _ARCHIV_PRAVIDLA_KOTVA }
    });
  }

  function _archivProcesniStopaLabel(k) {
    const key = String(k || '').trim();
    if (key === 'vysoka') return 'pečlivé';
    if (key === 'stredni') return 'přijatelné';
    if (key === 'nizka') return 'slabší';
    return '—';
  }

  function _archivNormativniSmerLabel(k) {
    const key = String(k || '').trim();
    if (key === 'legalistni') return 'přísnější k zákonu';
    if (key === 'socialni') return 'sociálnější';
    if (key === 'vyvazeny') return 'vyvážené';
    return '—';
  }

  function _archivTextPruzkumnychCest(delta) {
    const d = Number(delta) || 0;
    if (d > 0) return `spíš posílil důkazy (+${d})`;
    if (d < 0) return `spíš oslabil důkazy (${d})`;
    return 'bez změny síly důkazů (0)';
  }

  /** Text výroku v seznamu archivu (běžný spis vs. zelená osobní linie). */
  function _archivTextVyroku(zaznam) {
    const r = zaznam;
    if (_archivJeOsobniZaznam(r)) {
      const id = String(r && r.verdictId || '').toLowerCase();
      if (id.startsWith('not_guilty')) return 'Odmítnuto';
      if (id.startsWith('guilty')) return 'Přijato';
      if (id.startsWith('insufficient')) return 'Odloženo';
    }
    const kat = _readonlyTextKategorieRozsudku(r && r.verdictId);
    if (kat && kat !== '—') return kat;
    const lab = r && r.verdict ? String(r.verdict).trim() : '';
    return lab || 'Rozhodnutí';
  }

  /** Skupina verdiktu pro přehled trendů v archivu (bez „správnosti“). */
  function _archivTrendVerdiktSkupina(r) {
    const id = String(r && r.verdictId || '').toLowerCase();
    if (id === 'uplatek') return 'uplatek';
    if (_archivJeOsobniZaznam(r)) {
      if (id.startsWith('insufficient')) return 'nedostatek';
      if (id.startsWith('not_guilty')) return 'odmitnuto';
      if (id.startsWith('guilty')) return 'prijato';
      return 'osobni_jine';
    }
    if (id.startsWith('insufficient')) return 'nedostatek';
    if (id.startsWith('not_guilty')) return 'zprosteni';
    if (id.startsWith('guilty')) return 'vinen';
    return 'ostatni';
  }

  function _archivTrendyPridatRadek(box, text, opts) {
    const o = opts && typeof opts === 'object' ? opts : {};
    const t = document.createElement('div');
    t.className =
      'archiv-rozsudky-trendy-line' +
      (o.hlavni ? ' archiv-rozsudky-trendy-line--hlavni' : '');
    t.textContent = text;
    box.appendChild(t);
    if (o.hint) {
      const h = document.createElement('div');
      h.className = 'archiv-rozsudky-trendy-line archiv-rozsudky-trendy-line--hint';
      h.textContent = o.hint;
      box.appendChild(h);
    }
  }

  function _archivVytvorTrendyPanel(rozsudky) {
    const n = rozsudky.length;
    if (!n) return null;
    const v = {
      vinen: 0,
      zprosteni: 0,
      nedostatek: 0,
      uplatek: 0,
      prijato: 0,
      odmitnuto: 0,
      osobni_jine: 0,
      ostatni: 0
    };
    const proc = { nizka: 0, stredni: 0, vysoka: 0 };
    const norm = { legalistni: 0, socialni: 0, vyvazeny: 0 };
    const path = { plus: 0, minus: 0, neutral: 0, soucet: 0 };
    let procN = 0;
    let normN = 0;
    let pathN = 0;
    for (const r of rozsudky) {
      const g = _archivTrendVerdiktSkupina(r);
      if (g === 'vinen') v.vinen++;
      else if (g === 'zprosteni') v.zprosteni++;
      else if (g === 'nedostatek') v.nedostatek++;
      else if (g === 'uplatek') v.uplatek++;
      else if (g === 'prijato') v.prijato++;
      else if (g === 'odmitnuto') v.odmitnuto++;
      else if (g === 'osobni_jine') v.osobni_jine++;
      else v.ostatni++;
      const pk = r && r.procesniKvalita != null ? String(r.procesniKvalita).trim() : '';
      if (pk === 'nizka' || pk === 'stredni' || pk === 'vysoka') {
        proc[pk]++;
        procN++;
      }
      const nk = r && r.normativniSmer != null ? String(r.normativniSmer).trim() : '';
      if (nk === 'legalistni' || nk === 'socialni' || nk === 'vyvazeny') {
        norm[nk]++;
        normN++;
      }
      const pd = Number(r && r.pathEvidenceDelta);
      if (Number.isFinite(pd)) {
        pathN++;
        path.soucet += pd;
        if (pd > 0) path.plus++;
        else if (pd < 0) path.minus++;
        else path.neutral++;
      }
    }
    const pct = x => (n ? Math.round((x / n) * 100) : 0);
    const casti = [];
    if (v.vinen) casti.push(`vina / trest ${v.vinen}× (${pct(v.vinen)} %)`);
    if (v.zprosteni) casti.push(`zproštění ${v.zprosteni}× (${pct(v.zprosteni)} %)`);
    if (v.nedostatek) casti.push(`nedostatek důkazů ${v.nedostatek}× (${pct(v.nedostatek)} %)`);
    if (v.prijato) casti.push(`přijato / ponecháno ${v.prijato}× (${pct(v.prijato)} %)`);
    if (v.odmitnuto) casti.push(`odmítnuto ${v.odmitnuto}× (${pct(v.odmitnuto)} %)`);
    if (v.uplatek) casti.push(`úplatek ${v.uplatek}×`);
    if (v.osobni_jine) casti.push(`osobní volba ${v.osobni_jine}×`);
    if (v.ostatni) casti.push(`jiný výrok ${v.ostatni}×`);

    const box = document.createElement('div');
    box.className = 'archiv-rozsudky-trendy';
    _archivTrendyPridatRadek(
      box,
      casti.length > 0
        ? `Směr rozhodnutí (${n} výroků): ${casti.join(' · ')}.`
        : `Počet výroků v tomto výběru: ${n}.`,
      {
        hlavni: true,
        hint:
          'U běžných spisů trest, zproštění nebo nedostatek důkazů. U zelených osobních věcí přijetí nebo odmítnutí (obálka, složka, podpis).'
      }
    );

    if (procN > 0) {
      const bits = [];
      if (proc.nizka) bits.push(`slabší ${proc.nizka}×`);
      if (proc.stredni) bits.push(`přijatelné ${proc.stredni}×`);
      if (proc.vysoka) bits.push(`pečlivé ${proc.vysoka}×`);
      _archivTrendyPridatRadek(
        box,
        `Procesní stopa (${procN} záznamů): ${bits.join(', ')}.`,
        {
          hint:
            'Jak důkladně byl spis veden před výrokem — průzkum, informovanost, pevnost spárovaných stop. Nesouvisí s tím, zda obviněný vyhrál nebo prohrál.'
        }
      );
    }
    if (normN > 0) {
      const bitsN = [];
      if (norm.legalistni) bitsN.push(`přísnější k zákonu ${norm.legalistni}×`);
      if (norm.socialni) bitsN.push(`sociálnější ${norm.socialni}×`);
      if (norm.vyvazeny) bitsN.push(`vyvážené ${norm.vyvazeny}×`);
      _archivTrendyPridatRadek(
        box,
        `Normativní odstín (${normN} záznamů): ${bitsN.join(', ')}.`,
        {
          hint:
            'Zda výrok tíhl k tvrdému výkladu zákona, k osvobození vůči obviněným, nebo byl mezi tím.'
        }
      );
    }
    if (pathN > 0) {
      const avg = Math.round((path.soucet / pathN) * 10) / 10;
      _archivTrendyPridatRadek(
        box,
        `Průzkumné cesty (${pathN} záznamů): posílily důkazy ${path.plus}×, oslabily ${path.minus}×, neutrálně ${path.neutral}× · průměr ${avg > 0 ? '+' : ''}${avg}.`,
        {
          hint:
            'Úřední výslech a záznamy obvykle posílí (+), neoficiální zdroj oslabí (−). Souvisí s tím, jak se stopy zjišťovali, ne s barvou složky.'
        }
      );
    }
    return box;
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

  let _wfSekceNavHook = false;

  /** Klepnutí na štítek sekce (Spis, Svědectví, Průzkum, Rozsudek) — scroll + tutorial u Rozsudku. */
  function _wfPripadSekceNavInicializuj() {
    if (_wfSekceNavHook) return;
    const mod = document.getElementById('modal-pripad');
    if (!mod) return;
    _wfSekceNavHook = true;
    mod.addEventListener('click', e => {
      const lab = e.target.closest('.case-wf-section-label');
      if (!lab) return;
      const sec = lab.closest('.case-wf-section');
      if (!sec || !sec.id) return;
      const body = document.getElementById('case-wf-body');
      const cekaTutVerdikt =
        sec.id === 'case-wf-sec-verdict' &&
        typeof Tutorial !== 'undefined' &&
        Tutorial.cekaVerdictTutorial &&
        Tutorial.cekaVerdictTutorial();
      if (body && !cekaTutVerdikt) {
        const r = sec.getBoundingClientRect();
        const br = body.getBoundingClientRect();
        body.scrollTop += r.top - br.top - 10;
      }
      if (sec.id === 'case-wf-sec-verdict') {
        const p = _wfClueAktivniPripad;
        if (p && typeof Tutorial !== 'undefined' && Tutorial.priKlikNaRozsudek) {
          Tutorial.priKlikNaRozsudek(p);
        }
      }
    }, true);
  }

  function _wfNavHint(text) {
    const el = document.getElementById('case-wf-nav-hint');
    if (el) el.textContent = text;
  }

  /** Hint ve spisu — tutorial má přednost před výchozím textem. */
  function _wfNavHintTutorial(pripad, phase, fallback, extraCtx) {
    let text = fallback;
    if (typeof Tutorial !== 'undefined' && Tutorial.navHintProPripad && pripad) {
      const ctx = Object.assign({ phase: phase || 'open' }, extraCtx || {});
      const t = Tutorial.navHintProPripad(pripad, ctx);
      if (t) text = t;
    }
    _wfNavHint(text);
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
    const hint =
      'Ukazatel slouží i po uzavření případu: ovlivňuje procesní kvalitu rozhodnutí a dopady v metavrstvě (soulad s fakty, odstín trestu). ' +
      'Část možností rozsudku se odemyká podle informovanosti nebo podle potvrzené osy stop z pátrání.';
    wrap.title = hint;
    const tit = document.querySelector('#case-wf-inform-wrap .case-wf-inform-title');
    if (tit) tit.title = hint;
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
  let _wfUnlockPulseTimer = null;

  /** Platná nabídka úplatku u případu — šeptání u každé volby (včetně řádného verdiktu). */
  function _wfJeOtevrenaNabidkaUplateku(pripad) {
    if (!pripad) return false;
    const u = Number(pripad.bribe_amount);
    if (!Number.isFinite(u) || u <= 0) return false;
    return typeof State !== 'undefined' && !State.get('flags.uplatek_prijat');
  }

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
    if (String(pripad.type || '').toLowerCase() === 'osobni') return arr;
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
    if (nove === 1) return 'Alternativa: +1 nový rozsudek';
    if (nove >= 2 && nove <= 4) return `Alternativa: +${nove} nové rozsudky`;
    return `Alternativa: +${nove} nových rozsudků`;
  }

  /** Titulek karty trestu; u pool „nových“ jednou „Alternativa:“ (bez zdvojení z JSON). */
  function _wfVerdiktTitulekProZobrazeni(pripad, r) {
    const raw = String((r && r.text) || '—').trim();
    return raw.replace(/^(alternativa|doplnění|průzkum)\s*:\s*/i, '').trim() || '—';
  }

  function _wfDostupneVerdiktIdSet(pripad) {
    const dostupne = _wfFiltrovatVerdiktyPodlePruzkumu(pripad, _wfFiltrovatVerdikty(pripad));
    return new Set((dostupne || []).map(v => String(v && v.id || '').trim()).filter(Boolean));
  }

  function _wfSpoctiNoveVerdiktyPoOdemceni(prevSet, nextSet) {
    if (!(prevSet instanceof Set) || !(nextSet instanceof Set)) return 0;
    let n = 0;
    nextSet.forEach(id => {
      if (!prevSet.has(id)) n++;
    });
    return n;
  }

  function _wfSpustUnlockCeremonii(noveVerdikty, bezZvukuRazitka) {
    const modal = document.getElementById('modal-pripad');
    const sec = document.getElementById('case-wf-sec-verdict');
    if (!modal || !sec || !noveVerdikty) return;
    modal.classList.add('case-wf-unlock-pulse');
    sec.classList.add('case-wf-unlock-pulse');
    if (!bezZvukuRazitka && typeof SFX !== 'undefined' && SFX.rozsudekStamp) {
      SFX.rozsudekStamp();
    }
    if (_wfUnlockPulseTimer) clearTimeout(_wfUnlockPulseTimer);
    _wfUnlockPulseTimer = setTimeout(() => {
      modal.classList.remove('case-wf-unlock-pulse');
      sec.classList.remove('case-wf-unlock-pulse');
      _wfUnlockPulseTimer = null;
    }, 650);
  }

  function _wfTextProcesnihoPodkladu(delta) {
    const d = Number(delta) || 0;
    if (d > 0) return `+${d}`;
    return `${d}`;
  }

  function _wfNeoficialniSouhrnBezCisel(sum) {
    const s = sum && typeof sum === 'object' ? sum : null;
    if (!s) return '';
    const count = Math.max(0, Math.round(Number(s.count) || 0));
    if (count <= 0) return '';
    const casti = [];
    const f = Number(s.finance) || 0;
    if (f) casti.push(`Finance ${f > 0 ? '+' : ''}${Math.round(f)} Kčs`);
    for (const [k, dRaw] of Object.entries(s.traits || {})) {
      const d = Number(dRaw) || 0;
      if (!d) continue;
      casti.push(`${k} ${_statSipkyZmeny(d, 100)}`);
    }
    for (const [kRaw, dRaw] of Object.entries(s.factions || {})) {
      const d = Number(dRaw) || 0;
      if (!d) continue;
      const mk = _mapLegacyFactionKlic(kRaw) || String(kRaw);
      const nazev = _FAKCNI_NAZEV_ZOBRAZENI[mk] || mk;
      casti.push(`Frakce ${nazev} ${_statSipkyZmeny(d, 100)}`);
    }
    for (const [npcId, dRaw] of Object.entries(s.trust || {})) {
      const d = Number(dRaw) || 0;
      if (!d) continue;
      casti.push(`Důvěra ${_NPC_TRUST_LABEL[npcId] || npcId} ${_statSipkyZmeny(d, 3)}`);
    }
    return `Mimo spis: ${count}×` + (casti.length ? ` · ${casti.join(' · ')}` : '');
  }

  function _wfZiskejProcesniPodkladZCest(pripad) {
    if (!pripad || typeof Cases === 'undefined' || !Cases.vypoctiProcesniPodkladZCest) {
      return { clamped: 0, official: 0, unofficial: 0, confrontation: 0, revealed: 0 };
    }
    const out = Cases.vypoctiProcesniPodkladZCest(pripad);
    if (!out || typeof out !== 'object') {
      return { clamped: 0, official: 0, unofficial: 0, confrontation: 0, revealed: 0 };
    }
    return out;
  }

  function _wfPodkladSpisuBox(pripad) {
    if (!pripad || typeof Cases === 'undefined' || !Cases.vypoctiInformovanostPripadu) return '';
    const info = Cases.vypoctiInformovanostPripadu(pripad) || {};
    const pct = Number(info.pct);
    const clue = (Cases.ziskejPotvrzenouClueVazbu && Cases.ziskejPotvrzenouClueVazbu(pripad)) || null;

    let podklad = 'střední';
    if (Number.isFinite(pct) && pct < 45) podklad = 'nízký';
    else if (Number.isFinite(pct) && pct >= 75) podklad = 'silný';

    let stopa = 'nepotvrzená';
    if (clue && clue.strength === 'weak') stopa = 'slabá';
    else if (clue && clue.strength === 'medium') stopa = 'střední';
    else if (clue && clue.strength === 'strong') stopa = 'silná';
    const path = _wfZiskejProcesniPodkladZCest(pripad);
    const pathTxt = _wfTextProcesnihoPodkladu(path.clamped);

    return (
      `<div class="case-wf-step2-context">` +
      `<span><strong>Podklad spisu:</strong> ${podklad}</span>` +
      `<span aria-hidden="true"> · </span>` +
      `<span><strong>Koherence stop:</strong> ${stopa}</span>` +
      `<span aria-hidden="true"> · </span>` +
      `<span><strong>Procesní podklad:</strong> ${pathTxt}</span>` +
      `</div>`
    );
  }

  function _wfMaSmyslZobrazitPopisVerdiktu(pripad, rozsudek) {
    if (!rozsudek || !rozsudek.consequence) return false;
    const titul = _wfVerdiktTitulekProZobrazeni(pripad, rozsudek);
    const norm = s => String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\([^)]*\)/g, ' ')
      .replace(/^alternativa\s*:\s*/i, '')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const a = norm(titul);
    const b = norm(rozsudek.consequence);
    if (!a || !b) return false;
    if (a === b) return false;
    if (a.includes(b) || b.includes(a)) return false;
    return true;
  }

  /** Závadová (tyč) — na stole jako „spis“, ale jde o soukromé rozhodnutí, ne o vinu podle trestního řádu. */
  function _wfJeZavadovaTyčOsobni(pripad) {
    return !!(pripad && String(pripad.id || '').trim() === 'tyc_zavadova_d12');
  }

  /** Haasova obálka — nabídka peněz, ne trestní výrok. */
  function _wfJeHaasObalkaOsobni(pripad) {
    return !!(pripad && String(pripad.id || '').trim() === 'tyc_haas_d11');
  }

  /** Osobní složka (13. března) — rozhodnutí o dokumentech, ne trestní výrok. */
  function _wfJeZvratySlozkaOsobni(pripad) {
    return !!(pripad && String(pripad.id || '').trim() === 'tyc_zvraty_d10');
  }

  /** UI bez slovníku „vinen / zprostit“ — osobní volba mimo obžalobu. */
  function _wfMaOsobniVerdiktBezTrestnihoRz(pripad) {
    return (
      _wfJeZavadovaTyčOsobni(pripad) ||
      _wfJeHaasObalkaOsobni(pripad) ||
      _wfJeZvratySlozkaOsobni(pripad)
    );
  }

  function _wfTitulSkupinyVerdiktu(pripad, grp) {
    if (_wfJeZvratySlozkaOsobni(pripad)) {
      if (grp === 'guilty') return 'Ponechat složku';
      if (grp === 'not_guilty') return 'Předat nebo zničit';
    }
    if (_wfJeHaasObalkaOsobni(pripad)) {
      if (grp === 'guilty') return 'Přijmout';
      if (grp === 'not_guilty') return 'Odmítnout';
    }
    if (_wfJeZavadovaTyčOsobni(pripad)) {
      if (grp === 'guilty') return 'Přijmout';
      if (grp === 'not_guilty') return 'Odmítnout';
    }
    if (grp === 'guilty') return 'Vinen';
    if (grp === 'not_guilty') return 'Zproštění / nevinen';
    if (grp === 'insufficient') return 'Nedostatek důkazů';
    return '—';
  }

  function _wfPopisSkupinyVerdiktu(pripad, grp) {
    if (_wfJeZvratySlozkaOsobni(pripad)) {
      if (grp === 'guilty') {
        return 'Nechat dokumenty u sebe a pracovat s tím, co v nich je.';
      }
      if (grp === 'not_guilty') {
        return 'Odevzdat je státnímu zástupci, nebo je zničit.';
      }
    }
    if (_wfJeHaasObalkaOsobni(pripad)) {
      if (grp === 'guilty') {
        return 'Vzít hotovost v obálce — přijmout Haasův návrh.';
      }
      if (grp === 'not_guilty') {
        return 'Odmítnout peníze i nepojmenovaný závazek.';
      }
    }
    if (_wfJeZavadovaTyčOsobni(pripad)) {
      if (grp === 'guilty') {
        return 'Podepsat prohlášení o kontaktu s právní sekcí — výměnou za stažení zprávy z ministerstva.';
      }
      if (grp === 'not_guilty') {
        return 'Odmítnout nabídku. Dostupné varianty závisejí na průzkumu (formální odmítnutí / konfrontace s padělkem).';
      }
    }
    if (grp === 'guilty') return 'Obžalovaný spáchal skutek v podobě popsané obžalobou.';
    if (grp === 'not_guilty') return 'Obžaloba neobstojí nebo nejde o trestný čin v této podobě.';
    if (grp === 'insufficient') return 'Nelze bezpečně rozhodnout — vrátit k došetření nebo uzavřít.';
    return '';
  }

  function _wfNadpisRozhodnutiVRozsudku(pripad) {
    return _wfMaOsobniVerdiktBezTrestnihoRz(pripad) ? 'Rozhodnutí' : 'Rozsudek';
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

  function _escVelicinaHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Hint u karty rozsudku — finance přesně Kčs, ostatní veličiny barevnými šipkami. */
  function _wfFormatDeltaHint(label, delta, skala) {
    const n = Math.round(Number(delta));
    if (!Number.isFinite(n) || n === 0) return '';
    const sk = skala === 3 ? 3 : 100;
    return `${_escVelicinaHtml(label)}: ${_statSipkyZmenyHtml(n, sk)}`;
  }

  /**
   * Předběžný hint pro kartu rozsudku — finance v Kčs, rysy/frakce/důvěra šipkami.
   * Sloučené důsledky včetně balanc úprav z Cases.pripravSlouceneDusledky.
   */
  function _wfVerdiktDopadovyHint(pripad, rozsudek) {
    if (!pripad || !rozsudek) return '';
    const merged = (() => {
      if (typeof Cases !== 'undefined' && Cases.pripravSlouceneDusledky) {
        const out = Cases.pripravSlouceneDusledky(pripad, rozsudek);
        if (out && out.merged && typeof out.merged === 'object') return out.merged;
      }
      return (rozsudek && rozsudek.consequences && typeof rozsudek.consequences === 'object')
        ? rozsudek.consequences
        : {};
    })();
    const casti = [];
    const f = Number(merged.finance);
    if (Number.isFinite(f) && f !== 0) {
      casti.push(`Finance: ${f > 0 ? '+' : ''}${Math.round(f)} Kčs`);
    }

    for (const [k, d] of Object.entries(merged.traits || {})) {
      const nz =
        typeof Traits !== 'undefined' && typeof Traits.getNazevRysuProUi === 'function'
          ? Traits.getNazevRysuProUi(k)
          : String(k);
      const radek = _wfFormatDeltaHint(nz, d, 100);
      if (radek) casti.push(radek);
    }

    for (const [rawK, d] of Object.entries(merged.factions || {})) {
      const mk = _mapLegacyFactionKlic(rawK);
      if (!mk) continue;
      const jm = _FAKCNI_NAZEV_ZOBRAZENI[mk] || mk;
      const radek = _wfFormatDeltaHint(jm, d, 100);
      if (radek) casti.push(radek);
    }

    for (const [npcId, d] of Object.entries(merged.trust || {})) {
      const radek = _wfFormatDeltaHint(_NPC_TRUST_LABEL[npcId] || npcId, d, 3);
      if (radek) casti.push(radek);
    }
    const bonusInkoust = Array.isArray(merged.flags)
      ? merged.flags.reduce((sum, fl) => {
        if (!fl || typeof fl !== 'object') return sum;
        if (String(fl.key || '').trim() !== 'bonus_inkoust_rano') return sum;
        const v = Number(fl.value);
        if (!Number.isFinite(v) || v <= 0) return sum;
        return sum + Math.max(1, Math.min(2, Math.round(v)));
      }, 0)
      : 0;
    if (bonusInkoust > 0) {
      casti.push(`Inkoust: +${bonusInkoust} do dalšího pracovního dne`);
    }
    return casti.join(' · ');
  }

  /** Běží předehra nebo dopad — nesmí se znovu vykreslovat wireframe (jinak se znovu objeví Potvrdit). */
  function _wfJeAktivniDopadovaVrstvaPripadu() {
    const pr = document.getElementById('pripad-consequence-prelude');
    if (pr && !pr.classList.contains('skryto')) return true;
    const af = document.getElementById('case-wf-aftermath');
    return !!(af && af.classList.contains('case-wf-aftermath--visible'));
  }

  /** Krátký název akce bez ceny v závorce — cenu přidává `_wfPruzkumTlacitkoLabel`. */
  function _wfPruzkumPopisek(info) {
    const a = info.action;
    if (a === 'witness') return 'Vyslechnout svědka';
    if (a === 'records') return 'Zkontrolovat záznamy';
    if (a === 'informant') return 'Kontaktovat informátora';
    if (a === 'confrontation') return 'Konfrontace';
    if (a === 'fast') return 'Rozhodnout rychle';
    return a || 'Průzkum';
  }

  function _wfPruzkumTlacitkoLabel(info, cena) {
    const popis = _wfPruzkumPopisek(info) + _wfKapkyVZavorkach(cena);
    if (info && info.action !== 'confrontation') return `${popis} • čistý postup`;
    return popis;
  }

  /** Smaže karty průzkumu a panel pátrání v #case-wf-findings; rozpor (#case-wf-contradiction) ponechá. */
  function _wfVyprazdniFindingsKromRozporu(wfFind) {
    if (!wfFind) return;
    wfFind.querySelectorAll('.case-wf-finding').forEach(n => n.remove());
    document.getElementById('case-wf-clue-confirm-wrap')?.remove();
  }

  /** Rozpor (čárkovaný odstavec) těsně nad „Výsledek pátrání“, pod kartami zjištění. */
  function _wfUmistiRozporVRozmerFindings(wfFind) {
    const conEl = document.getElementById('case-wf-contradiction');
    const clue = document.getElementById('case-wf-clue-confirm-wrap');
    if (!conEl || !wfFind) return;
    if (clue && clue.parentNode === wfFind) wfFind.insertBefore(conEl, clue);
    else wfFind.appendChild(conEl);
  }

  /** Krátký typ zjištění — pro štítek karty, ne pro tlačítko akce. */
  function _wfTypZjištěníKrátce(info) {
    const a = info && info.action;
    if (a === 'witness') return 'Výslech';
    if (a === 'records') return 'Záznamy';
    if (a === 'informant') return 'Informátor';
    if (a === 'confrontation') return 'Konfrontace';
    return 'Průzkum';
  }

  /** Štítek karty zjištění: typ + (průzkum) / (neoficiální zdroj), bez slova „Zjištění“. */
  function _wfNadpisZjištěníPrůzkumu(pripad, info) {
    const typ = _wfTypZjištěníKrátce(info);
    const unofficial = _wfJeNeoficialniOdhaleni(pripad, info);
    if (unofficial) return `${typ} (neoficiální zdroj)`;
    return `${typ} (oficiální zdroj)`;
  }

  function _wfJeNeoficialniOdhaleni(pripad, info) {
    const cid = String(pripad && pripad.id != null ? pripad.id : '').trim();
    return !!(
      typeof State !== 'undefined' &&
      State.zpusobOdhaleniInfo &&
      cid &&
      info &&
      State.zpusobOdhaleniInfo(cid, info.id) === 'unofficial'
    );
  }

  function _wfCestaPrůzkumuMeta(pripad, info) {
    if (_wfJeNeoficialniOdhaleni(pripad, info)) {
      return {
        zdroj: 'Zdroj: neoficiální kanál',
        opora: 'Procesní opora: střední (vyšší riziko pochybností)'
      };
    }
    return {
      zdroj: 'Zdroj: úřední protokol',
      opora: 'Procesní opora: vysoká (čistý postup)'
    };
  }

  function _wfVlozMetaCestyZjištění(box, pripad, info) {
    if (!box || !info) return;
    const meta = _wfCestaPrůzkumuMeta(pripad, info);
    let src = box.querySelector('.case-wf-finding-path');
    if (!src) {
      src = document.createElement('div');
      src.className = 'case-wf-finding-path';
      const txt = box.querySelector('.case-wf-finding-text');
      if (txt && txt.parentNode === box) box.insertBefore(src, txt);
      else box.appendChild(src);
    }
    src.textContent = meta.zdroj;

    let op = box.querySelector('.case-wf-finding-weight');
    if (!op) {
      op = document.createElement('div');
      op.className = 'case-wf-finding-weight';
      const txt = box.querySelector('.case-wf-finding-text');
      if (txt && txt.parentNode === box) box.insertBefore(op, txt);
      else box.appendChild(op);
    }
    op.textContent = meta.opora;
  }

  function _wfRozdelZaznamovyZdroj(info) {
    if (!info || String(info.action || '') !== 'records') return null;
    const raw = String(info.reveal || '');
    const m = raw.match(/^\s*\(([^)]+)\)\s*\n+/);
    if (!m) return null;
    return {
      source: String(m[1] || '').trim(),
      body: raw.slice(m[0].length).trimStart()
    };
  }

  function _wfVykresliTextZjištění(box, info) {
    if (!box || !info) return;
    const tx = box.querySelector('.case-wf-finding-text');
    if (!tx) return;
    box.querySelector('.case-wf-finding-record-source')?.remove();
    const rec = _wfRozdelZaznamovyZdroj(info);
    if (!rec) {
      _wfNastavRichText(tx, info.reveal || '');
      return;
    }
    const src = document.createElement('div');
    src.className = 'case-wf-finding-record-source';
    src.textContent = rec.source;
    if (tx.parentNode === box) box.insertBefore(src, tx);
    else box.appendChild(src);
    _wfNastavRichText(tx, rec.body || '');
  }

  /** Řádek pod nadpisem karty zjištění — kdo mluví / s kým je konfrontace (z `hidden_info.speaker`). */
  function _wfRečníkRadekProZjištění(info) {
    const lab = String(info && info.speaker || '').trim();
    if (!lab) return '';
    const a = info && info.action;
    const prefix =
      a === 'witness' ? 'Kdo mluví'
        : a === 'confrontation' ? 'Konfrontace s'
          : a === 'informant' ? 'Zdroj'
            : a === 'records' ? 'Dokumentace'
              : 'Zdroj';
    return `${prefix}: ${lab}`;
  }

  function _wfVlozRadekRečníkaZjištění(box, info) {
    if (!box || !info) return;
    const text = _wfRečníkRadekProZjištění(info);
    let sp = box.querySelector('.case-wf-finding-speaker');
    if (!text) {
      if (sp) sp.remove();
      return;
    }
    if (!sp) {
      sp = document.createElement('div');
      sp.className = 'case-wf-finding-speaker';
      const ftx = box.querySelector('.case-wf-finding-text');
      if (ftx && ftx.parentNode === box) box.insertBefore(sp, ftx);
      else box.appendChild(sp);
    }
    sp.textContent = text;
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
    if (s2w) {
      const sr = s2w.querySelector('.case-wf-summary-row');
      if (sr && c && sr.contains(c)) s2w.appendChild(c);
      if (sr) sr.remove();
      s2w.classList.add('skryto');
    }
    document.getElementById('case-wf-sec-verdict')?.classList.remove('case-wf-sec-verdict--osobni-volba');
    if (leg) {
      leg.innerHTML = '';
      leg.classList.add('skryto');
    }
    if (c) {
      c.classList.remove('skryto');
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
    if (modWf) {
      /* Interaktivní krok verdiktu: nesmí zůstat ve skrytém/readonly módu. */
      delete modWf.dataset.verdictMode;
      modWf.classList.remove('case-wf-in-consequence-flow');
      const panelWf = modWf.querySelector('.pripad-panel--wireframe');
      panelWf?.classList.remove('pripad-panel--pripad-readonly');
    }
    const kontextPodkladu = _wfPodkladSpisuBox(pripad);
    const step2 = document.getElementById('case-wf-verdict-step2');
    const step2w = document.getElementById('case-wf-step2-wrap');
    const lbl = document.getElementById('case-wf-step2-label');
    const confirmBtn = document.getElementById('case-wf-confirm-rozsudek');
    if (!step2 || !step2w) return;
    const oldSummaryRow = step2w.querySelector('.case-wf-summary-row');
    if (oldSummaryRow && confirmBtn && oldSummaryRow.contains(confirmBtn)) {
      step2w.appendChild(confirmBtn);
    }
    if (oldSummaryRow) oldSummaryRow.remove();
    const staryDetail = step2w.querySelector('.case-wf-step2-detail--host');
    if (staryDetail) staryDetail.remove();
    step2.innerHTML = kontextPodkladu;
    const detail = document.createElement('div');
    detail.className = 'case-wf-step2-detail case-wf-step2-detail--host';
    const effectsPanel = document.createElement('div');
    effectsPanel.className = 'case-wf-step2-effects-panel';
    const grpLabel = _wfTitulSkupinyVerdiktu(pripad, grp);
    const rozhNadp = _wfNadpisRozhodnutiVRozsudku(pripad);
    const osobniVw = _wfMaOsobniVerdiktBezTrestnihoRz(pripad);
    const slovoVolbaVerdikt = osobniVw ? 'Volba' : 'Verdikt';
    detail.innerHTML =
      `<div class="case-wf-step2-detail-line"><strong>${rozhNadp}:</strong> ${grpLabel}</div>` +
      `<div class="case-wf-step2-detail-line"><strong>${slovoVolbaVerdikt}:</strong> —</div>` +
      `<div class="case-wf-step2-detail-line case-wf-step2-detail-line--reason"><strong>Odůvodnění:</strong> ` +
      `<span class="case-wf-step2-detail-text">${
        osobniVw ? 'Vyberte konkrétní možnost.' : 'Vyberte variantu verdiktu.'
      }</span></div>`;
    effectsPanel.innerHTML =
      `<div class="case-wf-step2-effects-title"><strong>Efekty:</strong></div>` +
      `<div class="case-wf-step2-detail-effects">—</div>`;
    if (lbl) lbl.textContent = osobniVw ? 'VOLBA' : 'VERDIKT';
    step2w.classList.remove('skryto');
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
      if (!lzeZvolit) {
        b.title =
          typeof Cases !== 'undefined' && Cases.popisNepristupnostiVerdiktu && pripad
            ? Cases.popisNepristupnostiVerdiktu(pripad, klic)
            : _WF_VERDIKT_BLOK_TITUL;
      } else {
        b.title =
          typeof Cases !== 'undefined' && Cases.popisDuvoduVerdiktu && pripad
            ? Cases.popisDuvoduVerdiktu(pripad, klic)
            : '';
      }
      if (!lzeZvolit) {
        b.innerHTML = `<div class="case-wf-v-blocked case-wf-v-blocked--tease">${_WF_VERDIKT_BLOK_TITUL}</div>`;
      } else {
        const badge = unlocked ? '<div class="case-wf-v-badge">Alternativa</div>' : '';
        const popis = _wfMaSmyslZobrazitPopisVerdiktu(pripad, r) ? String(r.consequence || '').trim() : '';
        const hintDopad = _wfVerdiktDopadovyHint(pripad, r);
        const hintHtml = hintDopad
          ? `<div class="case-wf-v-impact case-wf-v-impact--preview">${hintDopad}</div>`
          : '';
        b.innerHTML =
          badge +
          `<div class="case-wf-v-title">${_wfVerdiktTitulekProZobrazeni(pripad, r)}</div>` +
          hintHtml;
        b.dataset.detailTitle = _wfVerdiktTitulekProZobrazeni(pripad, r);
        b.dataset.detailDesc = popis;
        b.dataset.detailImpact = hintDopad || '';
      }
      b.addEventListener('click', () => {
        if (b.disabled) return;
        step2.querySelectorAll('.case-wf-verdict-opt').forEach(x => x.classList.remove('case-wf-verdict-opt--selected'));
        b.classList.add('case-wf-verdict-opt--selected');
        _wfRozsudekVyber = { rozsudek: r };
        if (detail) {
          const tit = String(b.dataset.detailTitle || '—').trim() || '—';
          const popis = String(b.dataset.detailDesc || '').trim();
          const dopad = String(b.dataset.detailImpact || '').trim();
          const dopadyList = dopad
            ? dopad.split('·').map(x => String(x || '').trim()).filter(Boolean)
            : [];
          const efektyHtml = dopadyList.length
            ? `<ul class="case-wf-step2-effects-list">` +
              dopadyList.flatMap(it => {
                const text = String(it).replace(/\.\s*$/, '').trim();
                const idx = text.indexOf('Frakce:');
                if (idx === -1) {
                  const cisty = text.replace(/,\s*$/, '').trim();
                  return cisty ? [`<li>${cisty}</li>`] : [];
                }
                const pred = text.slice(0, idx).replace(/,\s*$/, '').trim();
                const fr = text.slice(idx).replace(/,\s*$/, '').trim();
                const out = [];
                if (pred) out.push(`<li>${pred}</li>`);
                if (fr) out.push(`<li>${fr}</li>`);
                return out;
              }).join('') +
              `</ul>`
            : '—';
          detail.innerHTML =
            `<div class="case-wf-step2-detail-line"><strong>${rozhNadp}:</strong> ${grpLabel}</div>` +
            `<div class="case-wf-step2-detail-line"><strong>${slovoVolbaVerdikt}:</strong> ${tit}</div>` +
            `<div class="case-wf-step2-detail-line case-wf-step2-detail-line--reason"><strong>Odůvodnění:</strong> ` +
            `<span class="case-wf-step2-detail-text">${popis || 'Bez doplňujícího odůvodnění.'}</span></div>`;
          effectsPanel.innerHTML =
            `<div class="case-wf-step2-effects-title"><strong>Efekty:</strong></div>` +
            `<div class="case-wf-step2-detail-effects">${efektyHtml}</div>`;
        }
        if (confirmBtn) {
          /* Pojistka: tlačítko musí zůstat viditelné přímo v souhrnném boxu i po překreslení detailu. */
          if (confirmBtn.parentElement !== summaryRow) summaryRow.appendChild(confirmBtn);
          confirmBtn.classList.remove('skryto');
          confirmBtn.hidden = false;
          confirmBtn.style.setProperty('display', 'inline-flex', 'important');
          confirmBtn.style.setProperty('visibility', 'visible', 'important');
          confirmBtn.style.setProperty('opacity', '1', 'important');
          confirmBtn.disabled = false;
        }
      });
      step2.appendChild(b);
    }
    const summaryRow = document.createElement('div');
    summaryRow.className = 'case-wf-summary-row';
    summaryRow.appendChild(detail);
    summaryRow.appendChild(effectsPanel);
    if (confirmBtn) {
      summaryRow.appendChild(confirmBtn);
      if (confirmBtn.parentElement !== summaryRow) summaryRow.appendChild(confirmBtn);
    }
    step2w.appendChild(summaryRow);
    if (typeof Knihovna !== 'undefined' && Knihovna.obalSlovnikemVElementu) {
      Knihovna.obalSlovnikemVElementu(step2);
    }
    if (confirmBtn) {
      confirmBtn.classList.remove('skryto');
      confirmBtn.hidden = false;
      confirmBtn.style.setProperty('display', 'inline-flex', 'important');
      confirmBtn.style.setProperty('visibility', 'visible', 'important');
      confirmBtn.style.setProperty('opacity', '1', 'important');
      confirmBtn.style.setProperty('pointer-events', 'auto', 'important');
      confirmBtn.style.position = 'static';
      confirmBtn.disabled = true;
    }
    _wfVerdictStampBindMove();
    _caseWfSetDots(3, 3);
    _wfNavHintTutorial(
      pripad,
      'verdict_step2',
      osobniVw
        ? 'Vyberte konkrétní znění a potvrďte rozhodnutí.'
        : 'Vyberte konkrétní znění a potvrďte rozsudek.'
    );
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
    if (modW) {
      /* Stabilizace: interaktivní verdikt nesmí zůstat ve stavu, který schovává celý blok. */
      delete modW.dataset.verdictMode;
      modW.classList.remove('case-wf-in-consequence-flow');
    }
    if (_wfJeAktivniDopadovaVrstvaPripadu()) return;
    _wfResetVerdictUi();
    document
      .getElementById('case-wf-sec-verdict')
      ?.classList.toggle('case-wf-sec-verdict--osobni-volba', !!(pripad && _wfMaOsobniVerdiktBezTrestnihoRz(pripad)));
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
        tit: _wfTitulSkupinyVerdiktu(pripad, 'guilty'),
        desc: _wfPopisSkupinyVerdiktu(pripad, 'guilty'),
        items: g.guilty
      });
    }
    if (g.not_guilty.length) {
      skupiny.push({
        key: 'not_guilty',
        tit: _wfTitulSkupinyVerdiktu(pripad, 'not_guilty'),
        desc: _wfPopisSkupinyVerdiktu(pripad, 'not_guilty'),
        items: g.not_guilty
      });
    }
    if (g.insufficient.length) {
      skupiny.push({
        key: 'insufficient',
        tit: _wfTitulSkupinyVerdiktu(pripad, 'insufficient'),
        desc: _wfPopisSkupinyVerdiktu(pripad, 'insufficient'),
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
        const pocetNovychAlternativ = s.items.filter(v => _wfJeNovyVerdikt(pripad, v && v.id) && dostupneId.has(String(v.id || ''))).length;
        const maBytUnlockedSkupina = pocetNovychAlternativ > 0;
        b.className = (
          'case-wf-verdict-opt case-wf-verdict-opt--grp-' + s.key +
          (maBytUnlockedSkupina ? ' case-wf-verdict-opt--unlocked' : '')
        ).trim();
        b.removeAttribute('title');
        b.innerHTML =
          `<div class="case-wf-v-title">${s.tit}</div>` +
          `<div class="case-wf-v-desc">${s.desc}</div>` +
          (pocetNovychAlternativ > 0
            ? `<div class="case-wf-v-unlock">+${pocetNovychAlternativ} ${pocetNovychAlternativ === 1 ? 'alternativa' : 'alternativy'}</div>`
            : '');
        b.addEventListener('click', () => {
          step1.querySelectorAll('.case-wf-verdict-opt').forEach(x => x.classList.remove('case-wf-verdict-opt--selected'));
          b.classList.add('case-wf-verdict-opt--selected');
          _wfVyplnStep2(s.key, s.items, pripad, onRozsudek, dostupneId);
          requestAnimationFrame(() => {
            document.getElementById('case-wf-sec-verdict')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        });
        step1.appendChild(b);
      }
      _wfRozsudekVyber = { mode: 'twostep', grp: null };
      _wfNavHintTutorial(
        pripad,
        'verdict_step1',
        'Nejdřív zvolte směr rozhodnutí, potom konkrétní znění.'
      );
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
        if (!lzeZvolit) btn.title = 'Ben tento rozsudek zatím nemůže uplatnit.';
        const unlocked = lzeZvolit && _wfJeNovyVerdikt(pripad, rozsudek.id);
        btn.className = (
          'case-wf-verdict-opt ' + _rozsudekTrida(rozsudek.id) + (unlocked ? ' case-wf-verdict-opt--unlocked' : '') + (!lzeZvolit ? ' case-wf-verdict-opt--locked' : '')
        ).trim();
        if (!lzeZvolit) {
          btn.innerHTML = `<div class="case-wf-v-blocked case-wf-v-blocked--tease">${_WF_VERDIKT_BLOK_TITUL}</div>`;
        } else {
          const hintDopad = _wfVerdiktDopadovyHint(pripad, rozsudek);
          const badge = unlocked ? '<div class="case-wf-v-badge">Alternativa</div>' : '';
          const popis = _wfMaSmyslZobrazitPopisVerdiktu(pripad, rozsudek)
            ? `<div class="case-wf-v-desc">${rozsudek.consequence}</div>`
            : '';
          btn.innerHTML =
            badge +
            `<div class="case-wf-v-title">${_wfVerdiktTitulekProZobrazeni(pripad, rozsudek)}</div>` +
            popis +
            (hintDopad ? `<div class="case-wf-v-impact case-wf-v-impact--preview">${hintDopad}</div>` : '');
        }
        btn.addEventListener('click', () => {
          if (btn.disabled) return;
          leg.querySelectorAll('.case-wf-verdict-opt').forEach(x => x.classList.remove('case-wf-verdict-opt--selected'));
          btn.classList.add('case-wf-verdict-opt--selected');
          _wfRozsudekVyber = { mode: 'single', rozsudek };
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
        `<div class="case-wf-v-title">Přijmout úplatek (${uplatek} Kčs)</div>` +
        '<div class="case-wf-v-desc">Integrita utrpí — obálka je však na stole.</div>';
      btnU.addEventListener('click', () => {
        if (typeof SFX !== 'undefined' && SFX.uplatekWhisper) SFX.uplatekWhisper();
        _zavriPripadModal();
        const uR = {
          id: 'uplatek',
          text: 'Přijmout úplatek',
          consequence: `Nabídka zní na ${uplatek} Kčs.`,
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
      if (secVer) {
        const anchor = document.getElementById('case-wf-step2-wrap');
        if (anchor && anchor.parentElement === secVer) secVer.insertBefore(btnU, anchor);
        else secVer.appendChild(btnU);
      }
    }

    confirmBtn.onclick = () => {
      const modPh = document.getElementById('modal-pripad');
      if (modPh && modPh.dataset.verdictMode === 'readonly') {
        confirmBtn.disabled = true;
        confirmBtn.onclick = null;
        return;
      }
      if (typeof State !== 'undefined' && State.jePripadUzavren && State.jePripadUzavren(pripad.id)) {
        confirmBtn.disabled = true;
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
      confirmBtn.onclick = null;

      /* Zvuk verdiktu hned v tom samém handleru (uživatelský gest) — před DOM úklidem kvůli latenci. */
      if (typeof SFX !== 'undefined') {
        if (SFX.rozsudekVerdikt) SFX.rozsudekVerdikt();
        if (_wfJeOtevrenaNabidkaUplateku(pripad) && SFX.uplatekWhisper) SFX.uplatekWhisper();
      }
      _wfVerdictStampTeardown();
      _wfVerdictStampShake(true);
      _zobrazPredohruConsequenceAKlik(pripad, r, onRozsudek);
    };
  }

  function _wfPoPrvniAkciPruzkumu(pripad, onRozsudek, opts = {}) {
    const modPp = document.getElementById('modal-pripad');
    if (modPp && modPp.dataset.verdictMode === 'readonly') return;
    if (typeof State !== 'undefined' && State.jePripadUzavren && State.jePripadUzavren(pripad.id)) return;
    if (_wfJeAktivniDopadovaVrstvaPripadu()) return;
    const secV = document.getElementById('case-wf-sec-verdict');
    secV?.classList.remove('skryto');
    _skryjShrnutiRozsudku();
    _wfVerdictRenderedForCaseId = pripad.id;
    _zobrazRozsudkyWireframe(pripad, onRozsudek);
    const pred = opts && opts.predchoziVerdikty instanceof Set ? opts.predchoziVerdikty : null;
    const po = _wfDostupneVerdiktIdSet(pripad);
    const nove = _wfSpoctiNoveVerdiktyPoOdemceni(pred, po);
    const bezRazitkaOdemceni =
      !!(opts && opts.bezRazitkaPriOdemceniVerdiktu) || !!(opts && opts.poPotvrzeniOsyPatrani);
    if (nove > 0) {
      _wfSpustUnlockCeremonii(nove, bezRazitkaOdemceni);
      zobrazStavovouZpravu(`Alternativa odemčena: ${nove} ${nove === 1 ? 'nová možnost rozsudku' : 'nové možnosti rozsudku'}.`);
    } else if (!bezRazitkaOdemceni && typeof SFX !== 'undefined' && SFX.rozsudekStamp) {
      /* Úřední cesta: razítko i když žádný nový verdikt (např. poslední krok průzkumu). Neoficiální má pruzkumMimoZaznam. */
      SFX.rozsudekStamp();
    }
    _caseWfSetDots(3, 3);
    _wfNavHintTutorial(
      pripad,
      'verdict',
      _wfMaOsobniVerdiktBezTrestnihoRz(pripad)
        ? 'Vyberte rozhodnutí a potvrďte.'
        : 'Vyberte verdikt a potvrďte rozsudek.'
    );
    _wfAktualizujRozporBox(pripad);
    const conEl = document.getElementById('case-wf-contradiction');
    if (conEl && !conEl.classList.contains('skryto')) {
      _caseWfSetDots(2, 2);
    }
    _wfAktualizujInformovanost(pripad);
  }

  function zobrazPripad(pripad, onRozsudek) {
    if (!pripad) return;

    if (typeof Tutorial !== 'undefined' && Tutorial.zavriVeSpisu) Tutorial.zavriVeSpisu();

    if (pripad.id) odemkniPovestPodleUdalosti('pripad', String(pripad.id));

    const modLight = document.getElementById('modal-pripad');
    if (modLight) modLight.classList.toggle('pripad--light-rezim', !!pripad._lightMode);

    _prepniTabPripadu('pripad');
    _wfVerdictRenderedForCaseId = null;
    _wfClueAktivniPripad = pripad;
    _wfClueAktivniOnRozsudek = onRozsudek;
    _wfCluePatraniReset();
    _wfCluePatraniNactiZeStavu(pripad);
    _wfCluePokusyNactiDoPameti(pripad);
    _wfClueResetVolby();
    _wfClueResetKandidata();
    document.getElementById('case-wf-clue-confirm-wrap')?.remove();

    _archivNavZpetTab = null;
    _archivPoZavreniReadonlyTab = null;
    document.getElementById('pripad-zpet-do-archivu')?.classList.add('skryto');

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
    _nastavRazitkoUzavrenehoSpisu(null);
    _odstranTridyTypuPripadu(zahlavi0);
    _odstranTridyTypuPripadu(document.getElementById('pripad-kategorie-text'));

    document.getElementById('pripad-kategorie-text').textContent = _stitulekTypuPripadu(pripad);
    document.getElementById('pripad-nazev-text').textContent = pripad.title;
    document.getElementById('pripad-obvineni-text').textContent = _wfSestavObvineniText(pripad);
    const leadHdr = document.getElementById('pripad-zahlavi-lead');
    if (leadHdr) leadHdr.textContent = _wfZahlaviKratkyPopis(pripad);

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
    if (_wfCluePouzivaTimedHunt(pripad)) {
      const ndS = Number(State.get('traits.Nadeje')) || 0;
      const vnS = Number(State.get('traits.Vina')) || 0;
      if (ndS <= 25 || vnS >= 70) {
        situace =
          'Třesou se ti ruce; dnes bude těžké udržet pozornost u detailů.\n\n' + situace;
      }
    }
    const vinaSpis = Number(State.get('traits.Vina')) || 0;
    if (vinaSpis > 80) {
      situace =
        'Včerejší rozsudky vás ještě dohání. Dnes čtete spis ostřeji — s pocitem, že na každém řádku něco zůstalo viset.\n\n' +
        situace;
    } else if (vinaSpis >= 70) {
      situace =
        'Těžší výroky z posledních dnů vám ještě leží v hlavě.\n\n' + situace;
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
      if (typeof Knihovna !== 'undefined' && Knihovna.obalSlovnikemVElementu) {
        Knihovna.obalSlovnikemVElementu(svedkySekce);
      }
    }

    const conEl = document.getElementById('case-wf-contradiction');
    const conBody = document.getElementById('case-wf-contradiction-body');
    if (conEl) {
      conEl.classList.add('skryto');
      if (conBody) conBody.textContent = '';
      else conEl.textContent = '';
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
    document.querySelector('#case-wf-sec-pruzkum .case-wf-pruzkum-row')?.classList.remove('skryto');

    document.getElementById('case-wf-verdict-readonly')?.classList.add('skryto');

    _aktualizujPruzkumPanel(pripad, onRozsudek);
    _wfAktualizujInformovanost(pripad);
    _wfAktualizujRozporBox(pripad);
    _wfClueAplikujUzamceni(pripad);

    _nastavTypPripaduVModalu(pripad);

    _caseWfSetDots(0, 0);
    setTimeout(() => _caseWfSetDots(1, 1), 400);
    _wfNavHintTutorial(
      pripad,
      'open',
      maSkryte
        ? zbyvaAkci <= 0 && jizOdhalene.length === 0
          ? 'Dnešní sdílené akce průzkumu už došly — základní rozsudek (naslepo) je k dispozici; další možnosti by odemkl průzkum.'
          : 'Základní verdikty máte hned; průzkum (sdílené akce za den) rozšíří tresty a zdůvodnění.'
        : 'Vyberte rozsudek a potvrďte.',
      { maSkryte, zbyvaAkci, jizOdhalene: jizOdhalene.length }
    );

    Desk.nastavAktivniSpis(pripad);

    if (typeof SFX !== 'undefined') SFX.slozkaPaper();
    _wfCluePatraniHudUpdate(pripad, onRozsudek);
    _wfPripadSekceNavInicializuj();
    _otevriModal('modal-pripad');
    Desk.animujPrichodSpisu();
  }

  function zobrazPripadReadonly(pripad, opts) {
    if (!pripad) return;

    if (pripad.id) odemkniPovestPodleUdalosti('pripad', String(pripad.id));

    _archivNavZpetTab =
      opts && opts.zpetDoArchivuTab ? String(opts.zpetDoArchivuTab) : null;
    const archivZalozky = ['rozsudky', 'stav-duse', 'postavy', 'fragmenty', 'knihovna'];
    const poZ = opts && opts.poZavreniArchivTab != null ? String(opts.poZavreniArchivTab).trim() : '';
    _archivPoZavreniReadonlyTab = poZ && archivZalozky.includes(poZ) ? poZ : null;

    _prepniTabPripadu('pripad');
    _wfVerdictRenderedForCaseId = null;
    _wfCluePatraniReset();
    _wfCluePokusyReset();
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
    document.getElementById('pripad-obvineni-text').textContent = _wfSestavObvineniText(pripad);
    const leadHdrR = document.getElementById('pripad-zahlavi-lead');
    if (leadHdrR) leadHdrR.textContent = _wfZahlaviKratkyPopis(pripad);
    document.getElementById('case-wf-clue-hud-slot')?.classList.add('skryto');
    _wfAktualizujHeaderAkciPripadu();

    const spZnR = document.getElementById('pripad-spis-zn');
    if (spZnR) spZnR.textContent = (pripad.case_number || '—').trim();

    const archivRozsudkyPre = State.get('archive.verdicts') || [];
    const pidPre = String(pripad.id || '');
    const zaznamPre = archivRozsudkyPre.find(
      v => v && String(v.caseId ?? v.case_id ?? '') === pidPre
    );
    const denSpisu = zaznamPre && Number.isFinite(Number(zaznamPre.day))
      ? Number(zaznamPre.day)
      : State.get('currentDay');
    const spDatumR = document.getElementById('pripad-spis-datum');
    if (spDatumR) spDatumR.textContent = _formatujDatumSpisu(denSpisu);

    const situaceRo = document.getElementById('pripad-situace-text');
    if (situaceRo) _wfNastavRichText(situaceRo, pripad.situation || '');

    const svedkySekce = document.getElementById('pripad-svedectvi');
    svedkySekce.innerHTML = '';
    if (pripad.testimony) {
      for (const sv of pripad.testimony) {
        const item = document.createElement('div');
        item.className = 'case-wf-testimony';
        const sp = document.createElement('div');
        sp.className = 'case-wf-speaker';
        sp.textContent = _wfZahlaviPlainText(sv.label || sv.source || '—');
        const qt = document.createElement('div');
        qt.className = 'case-wf-quote';
        _wfNastavRichText(qt, sv.text || '');
        item.appendChild(sp);
        item.appendChild(qt);
        svedkySekce.appendChild(item);
      }
    }

    const odhaleneEl = document.getElementById('pripad-odhalene-info');
    odhaleneEl.innerHTML = '';
    const jizOdhalene = pripad.hidden_info?.filter(info =>
      State.jeInfoOdhaleno(pripad.id, info.id)
    ) || [];
    jizOdhalene.forEach(info => _zobrazOdhalenoInfo(odhaleneEl, info));

    const secP = document.getElementById('case-wf-sec-pruzkum');
    secP?.classList.remove('skryto');
    document.querySelector('#case-wf-sec-pruzkum .case-wf-pruzkum-row')?.classList.add('skryto');
    _wfAktualizujInformovanost(pripad);
    const akceInfoRo = document.getElementById('prukzum-akce-info');
    if (akceInfoRo) akceInfoRo.textContent = `Odhaleno: ${jizOdhalene.length}`;
    const wfFindRo = document.getElementById('case-wf-findings');
    if (wfFindRo) {
      _wfVyprazdniFindingsKromRozporu(wfFindRo);
      for (const info of jizOdhalene) {
        const box = document.createElement('div');
        box.className = 'case-wf-finding';
        const src = document.createElement('div');
        src.className = 'case-wf-finding-src';
        src.textContent = _wfNadpisZjištěníPrůzkumu(pripad, info);
        const txt = document.createElement('div');
        txt.className = 'case-wf-finding-text';
        box.appendChild(src);
        box.appendChild(txt);
        _wfVlozRadekRečníkaZjištění(box, info);
        _wfVlozMetaCestyZjištění(box, pripad, info);
        _wfVykresliTextZjištění(box, info);
        wfFindRo.appendChild(box);
      }
      if (!jizOdhalene.length) {
        const praz = document.createElement('div');
        praz.className = 'case-wf-finding';
        praz.innerHTML =
          '<div class="case-wf-finding-src">Průzkum</div>' +
          '<div class="case-wf-finding-text">V tomto spisu nebyla odhalena žádná průzkumná zjištění.</div>';
        wfFindRo.appendChild(praz);
      }
      _wfUmistiRozporVRozmerFindings(wfFindRo);
    }
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
    secV?.classList.toggle('case-wf-sec-verdict--osobni-volba', !!_wfMaOsobniVerdiktBezTrestnihoRz(pripad));

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

    const zpetBtn = document.getElementById('pripad-zpet-do-archivu');
    if (zpetBtn) {
      zpetBtn.classList.toggle('skryto', !_archivNavZpetTab);
    }
  }

  function _aktualizujPruzkumPanel(pripad, onRozsudek, prOpts) {
    const wfAkce = document.getElementById('case-wf-pruzkum-akce');
    const wfFind = document.getElementById('case-wf-findings');
    const tlacitka = document.getElementById('prukzum-tlacitka');
    const akceInfo = document.getElementById('prukzum-akce-info');

    const zbyvaji = State.get('investigationActionsLeft');
    if (akceInfo) akceInfo.textContent = `${zbyvaji} ${zbyvaji === 1 ? 'akce' : 'akcí'}`;

    if (wfAkce) wfAkce.innerHTML = '';
    if (tlacitka) tlacitka.innerHTML = '';
    _wfVyprazdniFindingsKromRozporu(wfFind);

    const path = _wfZiskejProcesniPodkladZCest(pripad);
    if (wfAkce) {
      const pod = document.createElement('div');
      pod.className = 'case-wf-process-path';
      const podTxt = _wfTextProcesnihoPodkladu(path.clamped);
      pod.textContent =
        `Procesní podklad (cesty): ${podTxt} · řádně ${path.official}× · mimo spis ${path.unofficial}×` +
        (path.confrontation ? ` · konfrontace ${path.confrontation}×` : '');
      wfAkce.appendChild(pod);
    }

    if (!pripad.hidden_info || pripad.hidden_info.length === 0) {
      document.getElementById('prukzum-panel')?.classList.add('skryto');
      document.getElementById('case-wf-inform-wrap')?.classList.add('skryto');
      _wfUmistiRozporVRozmerFindings(wfFind);
      _wfAktualizujHeaderAkciPripadu();
      return;
    }
    document.getElementById('prukzum-panel')?.classList.add('skryto');

    for (const info of pripad.hidden_info) {
      if (typeof Cases !== 'undefined' && Cases.jePruzkumAkceOdemcenaPoClue) {
        if (!Cases.jePruzkumAkceOdemcenaPoClue(pripad, info.id)) continue;
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

      const fid = 'case-wf-find-' + info.id;
      if (wfFind) {
        const box = document.createElement('div');
        box.id = fid;
        box.className = 'case-wf-finding' + (jizOdhaleno ? '' : ' skryto');
        const src = document.createElement('div');
        src.className = 'case-wf-finding-src';
        src.textContent = jizOdhaleno
          ? _wfNadpisZjištěníPrůzkumu(pripad, info)
          : _wfPruzkumTlacitkoLabel(info, cena);
        const ftx = document.createElement('div');
        ftx.className = 'case-wf-finding-text';
        box.appendChild(src);
        box.appendChild(ftx);
        if (jizOdhaleno) {
          _wfVlozRadekRečníkaZjištění(box, info);
          _wfVykresliTextZjištění(box, info);
        }
        wfFind.appendChild(box);
      }

      const mod = document.getElementById('modal-pripad');
      const readOnly = mod && mod.dataset.verdictMode === 'readonly';
      const odhalenoNeoficialne =
        !!(jizOdhaleno && State.zpusobOdhaleniInfo && State.zpusobOdhaleniInfo(pripad.id, info.id) === 'unofficial');
      const dirtySpec =
        !jizOdhaleno && !recFree && !readOnly && info.action !== 'confrontation'
          ? _wfEffectiveDirtyUnlock(info)
          : null;

      const row = document.createElement('div');
      row.className = 'case-wf-pruzkum-row case-wf-pruzkum-row--decision';

      const head = document.createElement('div');
      head.className = 'case-wf-pruzkum-head';
      const title = document.createElement('div');
      title.className = 'case-wf-pruzkum-title';
      title.textContent = _wfPruzkumPopisek(info);
      head.appendChild(title);

      const actionsWrap = document.createElement('div');
      actionsWrap.className = 'case-wf-pruzkum-actions-inline';

      const btnOff = document.createElement('button');
      btnOff.type = 'button';
      btnOff.className = 'case-wf-action-btn';
      btnOff.innerHTML =
        `<span class="case-wf-btn-line-1">Řádně</span>` +
        `<span class="case-wf-btn-line-2">(Průzkum: ${cena > 0 ? `-${cena}` : '0'})</span>`;
      btnOff.disabled = jizOdhaleno || zbyvaji < cena;
      if (!jizOdhaleno) {
        btnOff.addEventListener('click', () => {
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
          _wfDokonciOdhaleniPruzkumu(pripad, info, onRozsudek, { dirty: false });
        });
      }
      actionsWrap.appendChild(btnOff);

      if (dirtySpec && !odhalenoNeoficialne) {
        actionsWrap.classList.add('case-wf-pruzkum-actions-inline--dual');
        const btnUno = document.createElement('button');
        btnUno.type = 'button';
        btnUno.className = 'case-wf-action-btn case-wf-action-btn--unofficial-choice';
        btnUno.innerHTML =
          `<span class="case-wf-btn-line-1">Neoficiálně</span>` +
          `<span class="case-wf-btn-line-2">(Průzkum: 0)</span>`;
        const muze = _wfLzePlatitNečisty(dirtySpec);
        btnUno.disabled = !muze || jizOdhaleno;
        const nf = Number(dirtySpec.finance) || 0;
        const penizeBrani =
          !muze &&
          !jizOdhaleno &&
          nf < 0 &&
          typeof Finance !== 'undefined' &&
          typeof Finance.jeDostupne === 'function' &&
          !Finance.jeDostupne(Math.abs(nf));
        if (penizeBrani) {
          btnUno.title = 'Neoficiální cesta vyžaduje hotovost, kterou teď nemáš.';
          const blok = document.createElement('div');
          blok.className = 'case-wf-neoficial-blocked-note';
          blok.textContent = 'Neoficiální cesta zde není k dispozici — nedostatek peněz.';
          actionsWrap.appendChild(blok);
        } else if (!muze && !jizOdhaleno) {
          btnUno.title = 'Tuto variantu průzkumu teď nelze použít.';
        }
        btnUno.addEventListener('click', () => {
          if (State.jeInfoOdhaleno(pripad.id, info.id)) return;
          const spec = _wfEffectiveDirtyUnlock(info);
          if (!spec || !_wfLzePlatitNečisty(spec)) return;
          _wfAplikujNečistyCosts(spec);
          _wfDokonciOdhaleniPruzkumu(pripad, info, onRozsudek, { dirty: true });
        });
        actionsWrap.appendChild(btnUno);

        const infoBtn = document.createElement('button');
        infoBtn.type = 'button';
        infoBtn.className = 'case-wf-info-btn';
        infoBtn.setAttribute('aria-expanded', 'false');
        infoBtn.title = 'Detaily postupu mimo spis';
        infoBtn.textContent = 'i';
        infoBtn.classList.add('case-wf-info-btn--corner');
        head.appendChild(infoBtn);

        const narr = _wfNeoficialniPanelText(dirtySpec);
        const hint = document.createElement('div');
        hint.className = 'case-wf-dirty-cost-hint skryto';
        const intro = document.createElement('div');
        intro.className = 'case-wf-dirty-intro';
        intro.textContent = 'Průzkum lze vést i mimo běžné úřední postupy, ale nese to s sebou dodatečné náklady.';
        hint.appendChild(intro);
        const sev = document.createElement('div');
        sev.className = 'case-wf-dirty-severity';
        const sevT = document.createElement('div');
        sevT.className = 'case-wf-dirty-severity-title';
        sevT.textContent = narr.stupenNadpis;
        const sevP = document.createElement('div');
        sevP.className = 'case-wf-dirty-severity-desc';
        sevP.textContent = narr.stupenPopis;
        sev.appendChild(sevT);
        sev.appendChild(sevP);
        hint.appendChild(sev);
        for (const line of narr.dopady) {
          const ln = document.createElement('div');
          ln.className = 'case-wf-dirty-cost-line';
          ln.textContent = line;
          hint.appendChild(ln);
        }
        infoBtn.addEventListener('click', () => {
          const otevreno = !hint.classList.contains('skryto');
          hint.classList.toggle('skryto', otevreno);
          infoBtn.setAttribute('aria-expanded', otevreno ? 'false' : 'true');
        });
        row.appendChild(head);
        row.appendChild(actionsWrap);
        row.appendChild(hint);
      } else {
        if (odhalenoNeoficialne || jizOdhaleno) {
          actionsWrap.classList.add('case-wf-pruzkum-actions-inline--resolved');
          btnOff.classList.add('case-wf-action-btn--used');
          if (odhalenoNeoficialne) {
            btnOff.classList.add('case-wf-action-btn--unofficial-choice');
            btnOff.innerHTML =
              `<span class="case-wf-btn-line-1">Neoficiálně</span>` +
              `<span class="case-wf-btn-line-2">(Průzkum: 0)</span>`;
          }
          const note = document.createElement('div');
          note.className = 'case-wf-action-note case-wf-action-note--side';
          note.textContent = odhalenoNeoficialne
            ? 'Zjištěno mimo spis.\nDopady byly uplatněny.'
            : 'Zjištěno řádnou cestou.';
          actionsWrap.appendChild(note);
        }
        row.appendChild(head);
        row.appendChild(actionsWrap);
      }
      wfAkce?.appendChild(row);
    }
    if (!prOpts || !prOpts.skipClueConfirm) {
      _wfClueVykresliPotvrzeni(pripad, onRozsudek);
    }
    _wfUmistiRozporVRozmerFindings(wfFind);
    _wfAktualizujHeaderAkciPripadu();
  }

  function _zobrazOdhalenoInfo(kontejner, info) {
    const el = document.createElement('div');
    el.className = 'odhalene-info case-wf-odhalene-block';
    const lab = document.createElement('div');
    lab.className = 'odhalene-info-label';
    lab.textContent = 'ZJIŠTĚNO';
    el.appendChild(lab);
    const whoTxt = _wfRečníkRadekProZjištění(info);
    if (whoTxt) {
      const who = document.createElement('div');
      who.className = 'odhalene-info-who';
      who.textContent = whoTxt;
      el.appendChild(who);
    }
    const tx = document.createElement('div');
    tx.className = 'odhalene-info-text';
    _wfNastavRichText(tx, info.reveal || '');
    el.appendChild(tx);
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

  /** Zkrácená kategorie výroku pro uzavřený spis (readonly). */
  function _readonlyTextKategorieRozsudku(verdictId) {
    const id = String(verdictId || '').trim().toLowerCase();
    if (id.startsWith('guilty_')) return 'Vinen';
    if (id.startsWith('not_guilty_')) return 'Nevinen';
    if (id.startsWith('insufficient_')) return 'Odloženo';
    if (id === 'acquit' || id === 'zprostit') return 'Nevinen';
    if (id === 'guilty' || id === 'maximum' || id === 'prison') return 'Vinen';
    return '—';
  }

  function _readonlyKlicKategorieRozsudku(verdictId) {
    const id = String(verdictId || '').trim().toLowerCase();
    if (id.startsWith('guilty_')) return 'vinen';
    if (id.startsWith('not_guilty_')) return 'nevinen';
    if (id.startsWith('insufficient_')) return 'odlozeno';
    if (id === 'acquit' || id === 'zprostit') return 'nevinen';
    if (id === 'guilty' || id === 'maximum' || id === 'prison') return 'vinen';
    return '';
  }

  function _nastavRazitkoUzavrenehoSpisu(verdictId) {
    const stamp = document.querySelector('.pripad-zahlavi-uzavreno-razitko-text');
    if (!stamp) return;
    const klic = _readonlyKlicKategorieRozsudku(verdictId);
    const text = klic ? _readonlyTextKategorieRozsudku(verdictId) : 'Uzavřeno';
    stamp.textContent = text.toLocaleUpperCase('cs-CZ');
    stamp.classList.remove(
      'pripad-zahlavi-uzavreno-razitko-text--vinen',
      'pripad-zahlavi-uzavreno-razitko-text--nevinen',
      'pripad-zahlavi-uzavreno-razitko-text--odlozeno'
    );
    if (klic) stamp.classList.add(`pripad-zahlavi-uzavreno-razitko-text--${klic}`);
  }

  /** Readonly: jen uložený rozsudek + dopady (pouze změna, bez pásma v hybridu). */
  function _zobrazRozsudkyReadonly(pripad, zaznam) {
    const seznam =
      document.getElementById('case-wf-verdict-readonly') ||
      document.getElementById('rozsudky-seznam');
    if (!seznam) return;
    seznam.innerHTML = '';
    _nastavRazitkoUzavrenehoSpisu(null);

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

    if (!zId && !zText) {
      const el = document.createElement('div');
      el.className = 'rozsudek-readonly-prazdne';
      el.textContent = 'V archivu chybí záznam rozsudku — nelze zobrazit výsledek.';
      seznam.appendChild(el);
      _wfZamkniInteraktivniVerdiktReadonlyDom();
      return;
    }

    const rozsudek = vsechny.find(
      v => (zId && String(v.id) === zId) || (!zId && zText && v.text === zText)
    );

    if (!rozsudek) {
      const el = document.createElement('div');
      el.className = 'rozsudek-readonly-prazdne';
      el.textContent = 'Uložený rozsudek neodpovídá žádné variantě ve spisu (změna dat?).';
      seznam.appendChild(el);
      _wfZamkniInteraktivniVerdiktReadonlyDom();
      return;
    }

    _nastavRazitkoUzavrenehoSpisu(rozsudek.id);

    const cid = String(pripad && pripad.id || '').trim();
    const odhalenoCount = (() => {
      if (!cid || !Array.isArray(pripad && pripad.hidden_info)) return 0;
      return pripad.hidden_info.filter(info => State.jeInfoOdhaleno(cid, info.id)).length;
    })();
    const info = (typeof Cases !== 'undefined' && Cases.vypoctiInformovanostPripadu)
      ? (Cases.vypoctiInformovanostPripadu(pripad) || {})
      : {};
    const infoPct = Number(info.pct);
    const podklad = (() => {
      if (!Number.isFinite(infoPct)) return 'střední';
      if (infoPct < 45) return 'nízký';
      if (infoPct >= 75) return 'silný';
      return 'střední';
    })();
    const vazba = (typeof Cases !== 'undefined' && Cases.ziskejPotvrzenouClueVazbu)
      ? Cases.ziskejPotvrzenouClueVazbu(pripad)
      : null;
    const koherence = (() => {
      if (!vazba || !vazba.strength) return 'nepotvrzená';
      if (vazba.strength === 'weak') return 'slabá';
      if (vazba.strength === 'medium') return 'střední';
      if (vazba.strength === 'strong') return 'silná';
      return 'nepotvrzená';
    })();
    const vazbaText = vazba
      ? `Potvrzená (${koherence})`
      : 'Nenalezena';

    const meta = document.createElement('div');
    meta.className = 'case-wf-readonly-meta';

    const metaHead = document.createElement('div');
    metaHead.className = 'case-wf-readonly-meta-head';
    const metaLab = document.createElement('span');
    metaLab.className = 'case-wf-readonly-meta-label';
    metaLab.textContent = 'ZÁZNAM PODKLADŮ';
    const metaHelp = document.createElement('button');
    metaHelp.type = 'button';
    metaHelp.className = 'case-wf-readonly-meta-help';
    metaHelp.setAttribute('aria-label', 'Vysvětlení v Pravidlech — Archiv rozsudků');
    metaHelp.title = 'Vysvětlení v Pravidlech';
    metaHelp.textContent = '?';
    metaHelp.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      _otevriPravidlaArchivRozsudku();
    });
    metaHead.appendChild(metaLab);
    metaHead.appendChild(metaHelp);
    meta.appendChild(metaHead);

    const denRoz = zaznam && Number.isFinite(Number(zaznam.day)) ? Number(zaznam.day) : null;
    const denTxt = denRoz != null ? _archivFragmentDatumText(denRoz) : '—';
    const procKey = String(zaznam && zaznam.procesniKvalita || '').trim();
    const normKey = String(zaznam && zaznam.normativniSmer || '').trim();
    const pathDelta = Number.isFinite(Number(zaznam && zaznam.pathEvidenceDelta))
      ? Math.round(Number(zaznam.pathEvidenceDelta))
      : Number(_wfZiskejProcesniPodkladZCest(pripad).clamped) || 0;
    const neoficialTxt = _wfNeoficialniSouhrnBezCisel(zaznam && zaznam.unofficialSummary);

    const radky = [
      ['Den rozsudku', denTxt],
      ['Odhalený průzkum', `${odhalenoCount} kroků`],
      [
        'Informovanost',
        `${Number.isFinite(infoPct) ? Math.round(infoPct) : '—'} % — podklad ${podklad}`
      ],
      ['Nalezená vazba', vazbaText],
      ['Koherence stop', koherence],
      procKey ? ['Procesní stopa', _archivProcesniStopaLabel(procKey)] : null,
      normKey ? ['Normativní odstín', _archivNormativniSmerLabel(normKey)] : null,
      ['Průzkumné cesty', _archivTextPruzkumnychCest(pathDelta)],
      neoficialTxt ? ['Průzkum mimo spis', neoficialTxt.replace(/^Mimo spis:\s*/i, '')] : null
    ].filter(Boolean);

    for (const [lab, val] of radky) {
      const row = document.createElement('div');
      row.className = 'case-wf-readonly-meta-row';
      row.innerHTML = `<strong>${lab}:</strong> ${val}`;
      meta.appendChild(row);
    }

    seznam.appendChild(meta);
    if (typeof Knihovna !== 'undefined' && Knihovna.obalSlovnikemVElementu) {
      Knihovna.obalSlovnikemVElementu(meta);
    }

    const trida = _rozsudekTrida(rozsudek.id);
    const karta = document.createElement('div');
    karta.className = `rozsudek-karta rozsudek-karta--vyreseno pripad-typ--${typ} ${trida}`.trim();
    karta.setAttribute('role', 'group');

    const inner = document.createElement('div');
    inner.className = 'rozsudek-karta-inner';

    const textWrap = document.createElement('div');
    textWrap.className = 'rozsudek-karta-text rozsudek-readonly-layout';

    const verdictPanel = document.createElement('div');
    verdictPanel.className = 'rozsudek-readonly-panel rozsudek-readonly-panel--verdikt';

    const shrnuti = document.createElement('div');
    shrnuti.className = 'rozsudek-readonly-rozsudek-shrnuti';
    const shrLab = document.createElement('span');
    shrLab.className = 'rozsudek-readonly-sekce-nadpis';
    shrLab.textContent = 'Rozsudek:';
    shrnuti.appendChild(shrLab);
    shrnuti.appendChild(
      document.createTextNode(' ' + _archivTextVyroku(zaznam || { verdictId: rozsudek.id }))
    );
    verdictPanel.appendChild(shrnuti);

    const radek = document.createElement('div');
    radek.className = 'rozsudek-radek-hlavni';
    const nazev = document.createElement('span');
    nazev.className = 'rozsudek-nazev';
    _wfNastavRichText(nazev, rozsudek.text || '—');
    radek.appendChild(nazev);
    verdictPanel.appendChild(radek);

    const duvodSrc = String(rozsudek.consequence || '').trim();
    const odiv = document.createElement('div');
    odiv.className = 'rozsudek-readonly-oduvodneni';
    const oNad = document.createElement('div');
    oNad.className = 'rozsudek-readonly-oduvodneni-nadpis';
    const oLab = document.createElement('span');
    oLab.className = 'rozsudek-readonly-sekce-nadpis';
    oLab.textContent = 'Odůvodnění:';
    oNad.appendChild(oLab);
    odiv.appendChild(oNad);
    const oText = document.createElement('div');
    oText.className = 'rozsudek-readonly-oduvodneni-text';
    if (duvodSrc) {
      _wfNastavRichText(oText, duvodSrc);
    } else {
      oText.classList.add('rozsudek-readonly-oduvodneni-text--prazdne');
      oText.textContent =
        'U této varianty ve spisu není uveden samostatný text odůvodnění.';
    }
    odiv.appendChild(oText);
    verdictPanel.appendChild(odiv);

    textWrap.appendChild(verdictPanel);

    const radkyEf =
      (zaznam && zaznam.dusledkyRadky && zaznam.dusledkyRadky.length)
        ? zaznam.dusledkyRadky
        : vypoctiDusledkyRadky(
          (zaznam && zaznam.consequences) || rozsudek.consequences || {}
        );
    const komp = _dusledkyVytvorKompaktEfekty(radkyEf, { jenZmena: true });
    const effectsPanel = document.createElement('div');
    effectsPanel.className = 'rozsudek-readonly-panel rozsudek-readonly-panel--efekty';
    const effectsTitle = document.createElement('div');
    effectsTitle.className = 'rozsudek-readonly-panel-title';
    const efLab = document.createElement('span');
    efLab.className = 'rozsudek-readonly-sekce-nadpis';
    efLab.textContent = 'Dopady rozsudku:';
    effectsTitle.appendChild(efLab);
    effectsPanel.appendChild(effectsTitle);
    if (komp.childElementCount) {
      effectsPanel.appendChild(komp);
    } else {
      const prazdneEfekty = document.createElement('div');
      prazdneEfekty.className = 'rozsudek-readonly-empty-effects';
      prazdneEfekty.textContent = 'Bez zaznamenané změny.';
      effectsPanel.appendChild(prazdneEfekty);
    }
    textWrap.appendChild(effectsPanel);

    inner.appendChild(textWrap);
    karta.appendChild(inner);
    seznam.appendChild(karta);
    if (typeof Knihovna !== 'undefined' && Knihovna.obalSlovnikemVElementu) {
      Knihovna.obalSlovnikemVElementu(karta);
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

  // --- VEČERNÍ VOLBA ---

  function zobrazVecerniVolbu(denDat, callback) {
    const volba = denDat?.evening_choice;
    if (!volba) {
      if (callback) callback(null);
      return;
    }

    const casVecer =
      document.getElementById('vecer-cas-label') ||
      document.querySelector('#modal-vecer .vecer-cas');
    const casNadpis =
      (volba && volba.cas_label) || (denDat && denDat.cas_label) || 'VEČER';
    if (casVecer) casVecer.textContent = String(casNadpis).trim() || 'VEČER';
    const vecerNadpis = document.getElementById('vecer-nadpis');
    if (vecerNadpis) {
      const n = String(casNadpis).trim();
      vecerNadpis.textContent = n.toUpperCase() === 'VEČER' ? 'Večerní chvíle' : (n || 'Večerní chvíle');
    }
    const vecerScena = document.getElementById('vecer-narativ-scena');
    if (vecerScena) {
      vecerScena.className = 'narativ-scena narativ-scena--vecer';
    }
    _narativNastavObraz(
      document.getElementById('vecer-narativ-obraz'),
      (volba && (volba.narrative_image || volba.image || volba.illustration)) ||
        _narativKlicProVecer(casNadpis)
    );

    const vecerTxt = document.getElementById('vecer-text');
    const uvodniText = volba && (volba.text != null && String(volba.text).trim() !== '')
      ? volba.text
      : (volba && volba.prompt != null ? volba.prompt : '');
    if (vecerTxt) _wfNastavRichText(vecerTxt, uvodniText);

    if (typeof Tutorial !== 'undefined' && Tutorial.nastavVecerHintD1) {
      Tutorial.nastavVecerHintD1();
    }

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
        if (typeof Tutorial !== 'undefined' && Tutorial.priVeceruDokoncen) {
          Tutorial.priVeceruDokoncen();
        }
        if (callback) callback(moznost);
      });
      volbyEl.appendChild(btn);
    }

    _otevriModal('modal-vecer');
    if (typeof Tutorial !== 'undefined' && Tutorial.priVecerniVolbe) {
      Tutorial.priVecerniVolbe();
    }
  }

  /** Nedělní volba A–E — stejný modal jako večer, jiný nadpis. */
  function zobrazNedelniVolbu(denDat, callback) {
    const nv = denDat?.nedelni_volba;
    if (!nv || !Array.isArray(nv.options) || nv.options.length === 0) {
      if (callback) callback(null);
      return;
    }

    const casEl =
      document.getElementById('vecer-cas-label') ||
      document.querySelector('#modal-vecer .vecer-cas');
    if (casEl) casEl.textContent = 'NEDĚLE';
    const vecerNadpisN = document.getElementById('vecer-nadpis');
    if (vecerNadpisN) vecerNadpisN.textContent = 'Nedělní chvíle';
    const vecerScenaN = document.getElementById('vecer-narativ-scena');
    if (vecerScenaN) {
      vecerScenaN.className = 'narativ-scena narativ-scena--vecer narativ-scena--nedele';
    }
    _narativNastavObraz(
      document.getElementById('vecer-narativ-obraz'),
      (nv && (nv.narrative_image || nv.image || nv.illustration)) || 'sunday'
    );

    const vecerTxtN = document.getElementById('vecer-text');
    if (vecerTxtN) _wfNastavRichText(vecerTxtN, nv.text || 'Jak strávíš neděli?');

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
            type:  'fragment',
            title: moznost.fragment_title || 'Neděle',
            text:  String(ft),
            day:   denN,
            narrative_image: moznost.narrative_image || moznost.image || moznost.illustration || 'sunday'
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

  function zobrazReviziPripadu(revize, callback) {
    const box = revize && typeof revize === 'object' ? revize : {};
    const titleEl = document.getElementById('revize-pripadu-title');
    const metaEl = document.getElementById('revize-pripadu-meta');
    const sumEl = document.getElementById('revize-pripadu-summary');
    const openBtn = document.getElementById('revize-pripadu-open-case');
    const aBtn = document.getElementById('revize-pripadu-volba-a');
    const bBtn = document.getElementById('revize-pripadu-volba-b');
    if (!titleEl || !metaEl || !sumEl || !openBtn || !aBtn || !bBtn) {
      if (callback) callback('A');
      return;
    }

    const denPuv = Number(box.originalDay);
    const evidence = Number(box.evidenceScore);
    const coherence = Number(box.coherenceScore);
    const caseTitle = box.caseTitle || 'Neznámý spis';
    titleEl.textContent = `Revize spisu: ${caseTitle}`;
    _wfNastavRichText(
      metaEl,
      `Původní den: ${Number.isFinite(denPuv) ? denPuv : '—'} · Verdikt: ${box.verdictText || '—'} · ` +
        `fakta ${Number.isFinite(evidence) ? evidence : '—'} / koherence ${Number.isFinite(coherence) ? coherence : '—'}`
    );
    _wfNastavRichText(
      sumEl,
      box.summaryShort ||
        'Spis se vrací k revizi. Rozhodněte, zda původní rozsudek podržíte, nebo ho zmírníte.'
    );

    openBtn.onclick = () => {
      if (!box.pripad) {
        zobrazStavovouZpravu('Archivní spis se nepodařilo načíst.');
        return;
      }
      if (typeof SFX !== 'undefined' && SFX.slozkaPaper) SFX.slozkaPaper();
      zobrazPripadReadonly(box.pripad);
    };

    aBtn.textContent = box.optionAText || 'A) Podržet původní rozsudek';
    bBtn.textContent = box.optionBText || 'B) Zmírnit rozsudek';
    aBtn.onclick = () => {
      _zavriModal('modal-revize-pripadu');
      if (callback) callback('A');
    };
    bBtn.onclick = () => {
      _zavriModal('modal-revize-pripadu');
      if (callback) callback('B');
    };

    _otevriModal('modal-revize-pripadu');
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
    _wfNastavRichText(hlavni, payload?.hlavni || '');
    jemne.innerHTML = (payload?.jemneRadky || [])
      .map(
        r =>
          '<p class="tyden-shrnuti-jemne-radek">' +
          _escapeHtmlProfil(String(r)).replace(/\n/g, '<br>') +
          '</p>'
      )
      .join('');
    if (typeof Knihovna !== 'undefined' && Knihovna.obalSlovnikemVElementu) {
      Knihovna.obalSlovnikemVElementu(jemne);
    }

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
    skryjStulBlokaciDoModaluFragmentu();

    const panel = document.getElementById('fragment-panel');
    const nadpis = document.getElementById('fragment-nadpis');
    const kicker = document.getElementById('fragment-kicker');
    const text = document.getElementById('fragment-text');
    const scena = document.getElementById('fragment-narativ-scena');
    const obraz = document.getElementById('fragment-narativ-obraz');

    if (!panel || !fragment) {
      if (callback) callback();
      return;
    }

    // Typ panelu
    panel.className = 'fragment-panel narativ-shell panel-papir--nastup';
    const typTrida = Narrative.getTYP_PANEL()[fragment.type];
    if (typTrida) panel.classList.add(typTrida);

    const typNadpis = Narrative.getTYP_NADPIS()[fragment.type] || 'Záznam';
    const titulek = _narativRozdelTitulekFragmentu(fragment, typNadpis);
    if (kicker) {
      const zaklad = _narativKickerProFragment(fragment, typNadpis);
      kicker.textContent = '';
      const hlavni = document.createElement('span');
      hlavni.className = 'narativ-kicker-main';
      hlavni.textContent = zaklad;
      kicker.appendChild(hlavni);
      const detailText = _narativDetailKickeruFragmentu(fragment, titulek);
      if (detailText) {
        const detail = document.createElement('span');
        detail.className = 'narativ-kicker-detail';
        detail.textContent = detailText;
        kicker.appendChild(detail);
      }
    }
    nadpis.textContent = titulek.nadpis || typNadpis;
    const textHtml = (fragment.text || '').replace(/\n/g, '<br>');
    text.innerHTML = textHtml;
    if (scena) {
      scena.className = 'narativ-scena narativ-scena--fragment';
      const typ = String(fragment.type || '').trim().toLowerCase();
      if (typ) scena.classList.add(`narativ-scena--${typ}`);
      scena.querySelector('.narativ-dopis-text')?.remove();
      if (typ === 'letter') {
        const ilustrace = scena.querySelector('.narativ-ilustrace');
        if (ilustrace) {
          ilustrace.appendChild(_narativVytvorDopisStranky(fragment.text || ''));
        }
      }
    }
    _narativNastavObraz(obraz, _narativKlicProFragment(fragment));
    /* Slovník jen ve spisu (`_wfNastavRichText` v modal-pripad), ne v ranních/nočních fragmentech. */

    const zavritBtn = document.getElementById('fragment-zavrit');
    const novyZavrit = zavritBtn.cloneNode(true);
    novyZavrit.textContent = 'Pokračovat →';
    zavritBtn.parentNode.replaceChild(novyZavrit, zavritBtn);
    novyZavrit.addEventListener('click', () => {
      _narativArchivujInlineDopis(fragment);
      const fid = fragment && (fragment.id || fragment.fragmentId)
        ? String(fragment.id || fragment.fragmentId).trim()
        : '';
      if (fid) odemkniPovestPodleUdalosti('fragment', fid);
      _zavriModal('modal-fragment');
      if (callback) callback();
    });

    _otevriModal('modal-fragment');
  }

  /** Tři odpovědi Aloise Beneše (`days.json` obrazovka d1dev_s4) — jen na ně velmi tichý šept. */
  const _ADVENTURE_ALOIS_BENES_TRI_VOLEB = new Set([
    'Poslouchám Vás. Řekněte mi, co víte.',
    'Případ byl pravomocně uzavřen. Nemohu ho znovu otevírat.',
    'Vezmu to na vědomí. Ale nic Vám nemohu slíbit.'
  ]);
  const _VOL_WHISPER_ALOIS_BENES_VOLBA = 0.15;

  function zobrazAdventureScenu(scena, callback) {
    const screens = Array.isArray(scena && scena.screens) ? scena.screens : [];
    if (!screens.length) {
      if (callback) callback({});
      return;
    }

    const screenMap = {};
    for (const s of screens) {
      if (!s || !s.id) continue;
      screenMap[s.id] = s;
    }

    const portraitEl = document.getElementById('adventure-portrait');
    const speakerEl = document.getElementById('adventure-speaker');
    const textEl = document.getElementById('adventure-text');
    const choicesEl = document.getElementById('adventure-choices');
    const nadpisEl = document.getElementById('adventure-nadpis');
    const kickerDetailEl = document.getElementById('adventure-kicker-detail');
    if (!portraitEl || !speakerEl || !textEl || !choicesEl) {
      if (callback) callback({});
      return;
    }

    const fallbackPortrait = 'src/photo.png';
    const portraitBase = String((scena && scena.portrait) || '').trim();
    const portraitLabel = String((scena && scena.portrait_label) || '').trim();
    const portraitAlt = String((scena && scena.portrait_alt) || '').trim();

    if (kickerDetailEl) {
      kickerDetailEl.textContent = portraitLabel || '—';
    }
    if (nadpisEl) {
      const popis = String((scena && scena.portrait_description) || '').trim();
      nadpisEl.textContent = popis;
      nadpisEl.style.display = popis ? '' : 'none';
    }
    let posledniVolba = {};
    let zavreno = false;

    const adventureIdRaw = String((scena && scena.id) || '').trim();

    function zavritASkoncit() {
      if (zavreno) return;
      zavreno = true;
      _zavriModal('modal-adventure');
      if (callback) callback(posledniVolba || {});
    }

    function zobrazScreen(screenId) {
      const s = screenMap[screenId];
      if (!s) {
        zavritASkoncit();
        return;
      }

      portraitEl.alt = portraitAlt || portraitLabel || 'Portrét';
      portraitEl.onerror = () => {
        portraitEl.onerror = null;
        portraitEl.src = fallbackPortrait;
      };
      const maPriponuNeboCestu = /[/.\\]/.test(portraitBase);
      portraitEl.src = portraitBase
        ? (maPriponuNeboCestu ? portraitBase : ('assets/portraits/' + portraitBase + '.png'))
        : fallbackPortrait;

      const speaker = String(s.speaker || '').trim();
      speakerEl.textContent = speaker && speaker !== 'narrator' ? speaker : '';
      textEl.innerHTML = String(s.text || '').replace(/\n/g, '<br>');
      if (typeof Knihovna !== 'undefined' && Knihovna.obalSlovnikemVElementu) {
        Knihovna.obalSlovnikemVElementu(textEl);
      }
      choicesEl.innerHTML = '';

      const volby = Array.isArray(s.choices) ? s.choices : [];
      if (volby.length) {
        for (const choice of volby) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'btn-vecer';
          btn.textContent = String(choice && choice.label ? choice.label : 'Pokračovat');
          btn.onclick = function() {
            const lbl = String(choice && choice.label ? choice.label : '').trim();
            if (
              _ADVENTURE_ALOIS_BENES_TRI_VOLEB.has(lbl) &&
              typeof SFX !== 'undefined' &&
              SFX.uplatekWhisper
            ) {
              SFX.uplatekWhisper(_VOL_WHISPER_ALOIS_BENES_VOLBA);
            }
            posledniVolba = {
              sets_flag: choice && choice.sets_flag ? choice.sets_flag : null,
              sets_flag_extra: choice && choice.sets_flag_extra ? choice.sets_flag_extra : null,
              sets_uzlovy: choice && choice.sets_uzlovy ? choice.sets_uzlovy : null,
              effects: choice && choice.effects ? choice.effects : null,
              morning_fragment_append: null
            };
            zobrazScreen(choice && choice.next ? choice.next : null);
          };
          choicesEl.appendChild(btn);
        }
      } else {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'fragment-zavrit';
        btn.textContent = 'Pokračovat →';
        btn.onclick = function() {
          if (s.morning_fragment_append) {
            posledniVolba.morning_fragment_append = s.morning_fragment_append;
          }
          if (s.next) {
            zobrazScreen(s.next);
          } else {
            zavritASkoncit();
          }
        };
        choicesEl.appendChild(btn);
      }

      _otevriModal('modal-adventure');
    }

    zobrazScreen(screens[0].id);
    if (adventureIdRaw) odemkniPovestPodleUdalosti('adventure', adventureIdRaw);
  }

  // --- ARCHIV (ŠUPLÍK) ---

  function _prepniArchivTab(tab) {
    document.querySelectorAll('.archiv-tab').forEach(t => {
      const sel = t.dataset.tab === tab;
      t.classList.toggle('archiv-tab--aktivni', sel);
      if (t.getAttribute('role') === 'tab') {
        t.setAttribute('aria-selected', sel ? 'true' : 'false');
        t.setAttribute('tabindex', sel ? '0' : '-1');
      }
    });
    _vyplnArchivTab(tab);
  }

  /**
   * @param {string} [tab='rozsudky'] — např. 'stav-duse' po kliknutí na panel financí na stole (obživa v záložce Stav).
   * @param {{ knihovna?: { panel?: 'pribeh'|'pravidla'|'slovnik', anchorId?: string }, povest?: { anchorId?: string } }} [opts] — podzáložka / kotva slovníku nebo záznam v Pověsti.
   */
  function zobrazArchiv(tab, opts) {
    const t = tab && typeof tab === 'string' ? tab : 'rozsudky';
    if (t !== 'knihovna') {
      _knihovnaAnchorId = null;
    } else if (opts && opts.knihovna && typeof opts.knihovna === 'object') {
      const k = opts.knihovna;
      if (k.panel && ['pribeh', 'pravidla', 'slovnik'].includes(k.panel)) {
        _knihovnaPodpanel = k.panel;
      }
      if (k.anchorId) {
        _knihovnaAnchorId = String(k.anchorId).trim().replace(/[^a-zA-Z0-9-]/g, '-');
      }
    } else if (t === 'knihovna') {
      _knihovnaAnchorId = null;
    }

    if (t === 'postavy') {
      if (opts && opts.povest && typeof opts.povest === 'object' && opts.povest.anchorId) {
        _povestZapisnikAnchorId = String(opts.povest.anchorId).trim().replace(/[^a-zA-Z0-9_-]/g, '');
        _povestArchivPodtab = 'lide';
      } else {
        _povestZapisnikAnchorId = null;
      }
    } else {
      _povestZapisnikAnchorId = null;
    }

    _prepniArchivTab(t);
    _otevriModal('modal-archiv');
  }

  function _archivTitulekTraitStavDuse(nazev, vCislo, mode) {
    const m = mode || _getStatsDisplayMode();
    const nazZ =
      typeof Traits !== 'undefined' && typeof Traits.getNazevRysuProUi === 'function'
        ? Traits.getNazevRysuProUi(nazev)
        : String(nazev || '');
    const naz = nazZ.toLocaleUpperCase('cs-CZ');
    if (m === 'spreadsheet') {
      return `${naz} (${Math.round(vCislo)})`;
    }
    const p = _statPasmoTextTrait(nazev, vCislo);
    if (m === 'hybrid' && p) {
      return `${naz} · ${p}`;
    }
    return naz;
  }

  /** Jedna položka součtu neoficiálních zdrojů podle režimu (finance vždy číslo). */
  function _archivNeoficialniSoucetUsek(mode, typ, klic, delta) {
    const d = Number(delta) || 0;
    if (!d) return '';
    if (typ === 'finance') {
      return `Finance ${d > 0 ? '+' : ''}${Math.round(d)} Kčs`;
    }
    const skala = typ === 'trust' ? 3 : 100;
    const sipky = _statSipkyZmeny(d, skala);
    if (mode === 'spreadsheet') {
      if (typ === 'trait') {
        const nz =
          typeof Traits !== 'undefined' && typeof Traits.getNazevRysuProUi === 'function'
            ? Traits.getNazevRysuProUi(klic)
            : String(klic);
        return `${nz} ${d > 0 ? '+' : '−'}${Math.abs(Math.round(d))}`;
      }
      if (typ === 'faction') {
        const mk = _mapLegacyFactionKlic(klic) || String(klic);
        const nazev = _FAKCNI_NAZEV_ZOBRAZENI[mk] || mk;
        return `Frakce ${nazev} ${d > 0 ? '+' : '−'}${Math.abs(Math.round(d))}`;
      }
      if (typ === 'trust') {
        return `Důvěra ${_NPC_TRUST_LABEL[klic] || klic} ${d > 0 ? '+' : '−'}${Math.abs(Math.round(d))}`;
      }
    }
    if (mode === 'intuitive') {
      if (typ === 'trait') {
        const nz =
          typeof Traits !== 'undefined' && typeof Traits.getNazevRysuProUi === 'function'
            ? Traits.getNazevRysuProUi(klic)
            : String(klic);
        return `${nz} ${sipky}`;
      }
      if (typ === 'faction') {
        const mk = _mapLegacyFactionKlic(klic) || String(klic);
        const nazev = _FAKCNI_NAZEV_ZOBRAZENI[mk] || mk;
        return `Frakce ${nazev} ${sipky}`;
      }
      if (typ === 'trust') {
        return `Důvěra ${_NPC_TRUST_LABEL[klic] || klic} ${sipky}`;
      }
    }
    /* hybrid */
    const slovo = _statSilaSlovo(d, skala);
    if (typ === 'trait') {
      const nz =
        typeof Traits !== 'undefined' && typeof Traits.getNazevRysuProUi === 'function'
          ? Traits.getNazevRysuProUi(klic)
          : String(klic);
      return `${nz} ${sipky} (${slovo})`;
    }
    if (typ === 'faction') {
      const mk = _mapLegacyFactionKlic(klic) || String(klic);
      const nazev = _FAKCNI_NAZEV_ZOBRAZENI[mk] || mk;
      return `Frakce ${nazev} ${sipky} (${slovo})`;
    }
    if (typ === 'trust') {
      return `Důvěra ${_NPC_TRUST_LABEL[klic] || klic} ${sipky} (${slovo})`;
    }
    return '';
  }

  function _knihovnaBodyDoRodice(rodic, text) {
    const t = String(text || '').trim();
    if (!t) return;
    const bloky = t.split(/\n\s*\n+/);
    for (const blok of bloky) {
      const p = document.createElement('p');
      p.className = 'knihovna-odstavec';
      p.innerHTML = _escapeHtmlProfil(blok.trim()).replace(/\n/g, '<br>');
      rodic.appendChild(p);
    }
  }

  function _vyplnKnihovnaObsah(obsah) {
    const data = typeof Knihovna !== 'undefined' ? Knihovna.getData() : null;
    obsah.innerHTML = '';
    if (!data) {
      obsah.innerHTML = '<p class="knihovna-chyba">Knihovna není načtená.</p>';
      return;
    }

    const root = document.createElement('div');
    root.className = 'knihovna-wrap knihovna-wrap--v2';

    const nav = document.createElement('div');
    nav.className = 'knihovna-podtabs';
    nav.setAttribute('role', 'tablist');
    const panely = [
      { id: 'pribeh', label: 'Příběh' },
      { id: 'pravidla', label: 'Pravidla' },
      { id: 'slovnik', label: 'Slovník' }
    ];
    for (const { id, label } of panely) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'knihovna-podtab' + (_knihovnaPodpanel === id ? ' knihovna-podtab--aktivni' : '');
      b.dataset.knihovnaPanel = id;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', _knihovnaPodpanel === id ? 'true' : 'false');
      b.textContent = label;
      b.addEventListener('click', () => {
        _knihovnaPodpanel = id;
        if (typeof Knihovna !== 'undefined' && Knihovna.getData()) {
          _vyplnKnihovnaObsah(obsah);
        }
      });
      nav.appendChild(b);
    }
    root.appendChild(nav);

    const inner = document.createElement('div');
    inner.className = 'knihovna-panel';
    inner.setAttribute('role', 'tabpanel');

    if (_knihovnaPodpanel === 'pribeh') {
      const pb = data.pribeh || {};
      const ilustrace = document.createElement('figure');
      ilustrace.className = 'knihovna-pribeh-ilustrace';
      const img = document.createElement('img');
      img.src = 'src/skici/skica_mesto.png';
      img.alt = 'Město s tramvají v dešti';
      img.decoding = 'async';
      ilustrace.appendChild(img);
      inner.appendChild(ilustrace);
      if (pb.perex) {
        const per = document.createElement('p');
        per.className = 'knihovna-perex';
        per.textContent = pb.perex;
        inner.appendChild(per);
      }
      _knihovnaBodyDoRodice(inner, pb.body);
      const rozhZdroj = pb.rozhodnuti || [];
      const rozh =
        typeof Knihovna !== 'undefined' && typeof Knihovna.vyfiltrujPribehRozhodnuti === 'function'
          ? Knihovna.vyfiltrujPribehRozhodnuti(rozhZdroj)
          : rozhZdroj;
      if (rozh.length) {
        const rozhSerazene = rozh
          .map((r, i) => ({ r, i }))
          .sort((a, b) => {
            const ma =
              a.r && a.r.minDay != null && Number.isFinite(Number(a.r.minDay))
                ? Number(a.r.minDay)
                : 9999;
            const mb =
              b.r && b.r.minDay != null && Number.isFinite(Number(b.r.minDay))
                ? Number(b.r.minDay)
                : 9999;
            if (ma !== mb) return ma - mb;
            return a.i - b.i;
          })
          .map(x => x.r);
        const kron = document.createElement('div');
        kron.className = 'knihovna-pribeh-kronika';
        const hn = document.createElement('div');
        hn.className = 'knihovna-sekce-nadpis';
        hn.textContent = 'Kronika';
        kron.appendChild(hn);
        for (const r of rozhSerazene) {
          const tx = r && r.text ? String(r.text).trim() : '';
          if (!tx) continue;
          const p = document.createElement('p');
          p.className = 'knihovna-pribeh-denik-radek';
          const minD =
            r && r.minDay != null && Number.isFinite(Number(r.minDay)) ? Number(r.minDay) : null;
          const datTxt = minD != null ? _formatujDatumSpisu(minD) : '';
          if (datTxt && datTxt !== '—') {
            const dEl = document.createElement('span');
            dEl.className = 'knihovna-pribeh-denik-datum';
            dEl.textContent = datTxt + ' ';
            p.appendChild(dEl);
          }
          const telo = document.createElement('span');
          telo.className = 'knihovna-pribeh-denik-text';
          telo.innerHTML = _escapeHtmlProfil(tx).replace(/\n/g, '<br>');
          p.appendChild(telo);
          kron.appendChild(p);
        }
        if (kron.querySelector('.knihovna-pribeh-denik-radek')) {
          inner.appendChild(kron);
        }
      }
    } else if (_knihovnaPodpanel === 'pravidla') {
      const pr = data.pravidla || {};
      if (pr.perex) {
        const per = document.createElement('p');
        per.className = 'knihovna-perex';
        per.textContent = pr.perex;
        inner.appendChild(per);
      }
      _knihovnaBodyDoRodice(inner, pr.body);
      for (const bl of pr.bloky || []) {
        if (!bl || typeof bl !== 'object') continue;
        const det = document.createElement('details');
        det.className = 'knihovna-polozka knihovna-polozka--komorni';
        const slug = _knihovnaPravidloSlug(bl.title);
        if (slug) det.id = 'knihovna-pravidlo-' + slug;
        const sum = document.createElement('summary');
        sum.textContent = String(bl.title || '—').trim();
        const telo = document.createElement('div');
        telo.className = 'knihovna-telo';
        const bx = String(bl.body || '').trim();
        telo.innerHTML = bx
          ? _escapeHtmlProfil(bx).replace(/\n/g, '<br>')
          : '<p class="knihovna-telo-prazdne">—</p>';
        det.appendChild(sum);
        det.appendChild(telo);
        inner.appendChild(det);
      }
    } else {
      const sl = data.slovnik || {};
      if (sl.perex) {
        const per = document.createElement('p');
        per.className = 'knihovna-perex';
        per.textContent = sl.perex;
        inner.appendChild(per);
      }
      _knihovnaBodyDoRodice(inner, sl.body || '');
      for (const h of sl.hesla || []) {
        if (!h || typeof h !== 'object') continue;
        const hidRaw = h.id != null && String(h.id).trim() ? String(h.id).trim() : '';
        const hid = hidRaw.replace(/[^a-zA-Z0-9-]/g, '-');
        const det = document.createElement('details');
        det.className = 'knihovna-polozka';
        if (hid) det.id = 'knihovna-heslo-' + hid;
        const sum = document.createElement('summary');
        sum.textContent = String(h.title || hidRaw || '—').trim();
        const telo = document.createElement('div');
        telo.className = 'knihovna-telo';
        const bx = String(h.body || '').trim();
        telo.innerHTML = bx
          ? _escapeHtmlProfil(bx).replace(/\n/g, '<br>')
          : '<p class="knihovna-telo-prazdne">—</p>';
        det.appendChild(sum);
        det.appendChild(telo);
        inner.appendChild(det);
      }
    }

    root.appendChild(inner);
    obsah.appendChild(root);

    if (_knihovnaAnchorId) {
      const aid = _knihovnaAnchorId;
      requestAnimationFrame(() => {
        let el = null;
        if (_knihovnaPodpanel === 'slovnik') {
          el = document.getElementById('knihovna-heslo-' + aid);
        } else if (_knihovnaPodpanel === 'pravidla') {
          el = document.getElementById('knihovna-pravidlo-' + aid);
        }
        if (el) {
          el.open = true;
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
      _knihovnaAnchorId = null;
    }
  }

  function _vyplnArchivTab(tab) {
    const obsah = document.getElementById('archiv-obsah');
    if (!obsah) return;
    obsah.classList.toggle('archiv-obsah--knihovna', tab === 'knihovna' || tab === 'postavy');
    obsah.classList.toggle('archiv-obsah--split-scroll', tab === 'rozsudky' || tab === 'fragmenty');

    if (tab === 'stav-duse') {
      obsah.innerHTML = '';
      const layout = document.createElement('div');
      layout.className = 'archiv-stav-duse-layout';

      const levy = document.createElement('div');
      levy.className = 'archiv-stav-duse-levy';

      const nadpisRysy = document.createElement('div');
      nadpisRysy.className = 'postavy-frakce-nadpis';
      nadpisRysy.textContent = 'SOUČASNÉ ROZPOLOŽENÍ';
      levy.appendChild(nadpisRysy);

      const modeSD = _getStatsDisplayMode();
      const rysyArchiv = ['Integrita', 'Odvaha', 'Moudrost', 'Vina', 'Nadeje'];
      for (const nazev of rysyArchiv) {
        const vRaw = State.get('traits.' + nazev);
        const v = Number.isFinite(Number(vRaw)) ? Number(vRaw) : 50;
        let nb = '—';
        if (typeof Traits !== 'undefined' && Traits.getTraitText) {
          nb = Traits.getTraitText(nazev, v).notebook || '—';
        }
        const entry = document.createElement('div');
        entry.className = 'archiv-stav-duse-zaznam';
        const head = document.createElement('div');
        head.className = 'archiv-stav-duse-zaznam-head';
        const iconAsset = _dusledkyIkonaAssetu({ typ: 'trait', klic: nazev });
        const icon = document.createElement('span');
        icon.className = 'archiv-stav-duse-ikona';
        icon.setAttribute('aria-hidden', 'true');
        if (iconAsset) {
          const iconKey = _dusledkyIkonaAssetKlic({ typ: 'trait', klic: nazev });
          if (iconKey) icon.classList.add(`archiv-stav-duse-ikona--${iconKey}`);
          const img = document.createElement('img');
          img.src = iconAsset;
          img.alt = '';
          img.loading = 'lazy';
          img.decoding = 'async';
          icon.appendChild(img);
        } else {
          icon.classList.add('archiv-stav-duse-ikona--prazdna');
        }
        const title = document.createElement('div');
        title.className = 'archiv-rozsudek-den';
        title.textContent = _archivTitulekTraitStavDuse(nazev, v, modeSD);
        const body = document.createElement('div');
        body.className = 'archiv-rozsudek-nazev';
        body.style.display = 'block';
        body.style.flex = 'none';
        body.style.width = '100%';
        body.style.minWidth = '0';
        body.innerHTML = _escapeHtmlProfil(nb).replace(/\n/g, '<br>');
        if (typeof Knihovna !== 'undefined' && Knihovna.obalSlovnikemVElementu) {
          Knihovna.obalSlovnikemVElementu(body);
        }
        head.appendChild(icon);
        head.appendChild(title);
        entry.appendChild(head);
        entry.appendChild(body);
        levy.appendChild(entry);
      }

      const pravy = document.createElement('div');
      pravy.className = 'archiv-stav-duse-pravy';

      const finSekce = document.createElement('div');
      finSekce.className = 'archiv-souhrn-fin-sekce archiv-souhrn-fin-sekce--stav-pravy-sloupec';
      const finNad = document.createElement('div');
      finNad.className = 'postavy-frakce-nadpis';
      finNad.textContent = 'OBŽIVA';
      finSekce.appendChild(finNad);
      if (typeof Finance !== 'undefined' && Finance.zkontrolujCilOperace) {
        Finance.zkontrolujCilOperace();
      }
      const p = Finance.getPrehled();
      const denHry = Number(State.get('currentDay')) || 1;
      const ukazOperaci = denHry >= 4 || p.dopisOperaceViden === true;
      const dluhC = Math.round(Number(p.dluh) || 0);

      let radekVyplata = '';
      if (p.dniDoDalsiVyplaty != null) {
        const n = p.dniDoDalsiVyplaty;
        const val =
          n === 0 ? 'dnes (neděle)' : n === 1 ? 'zítra' : `za ${n} dní`;
        radekVyplata =
          '<div class="finance-radek">' +
          '<span>Příští plat</span>' +
          '<span class="finance-castka">' + val + '</span>' +
          '</div>';
      } else {
        radekVyplata =
          '<div class="finance-radek">' +
          '<span>Nedělní plat v kampani</span>' +
          '<span class="finance-castka">vše vyplaceno</span>' +
          '</div>';
      }

      let radekDluh = '';
      if (dluhC > 0) {
        radekDluh =
          '<div class="finance-radek">' +
          '<span>Dluh</span>' +
          '<span class="finance-castka finance-castka--minus">' + dluhC + ' Kčs</span>' +
          '</div>';
      }

      let operaceHtml = '';
      if (ukazOperaci) {
        const opTermDen =
          typeof Finance !== 'undefined' && Number.isFinite(Number(Finance.OPERACE_DEADLINE_DEN))
            ? Number(Finance.OPERACE_DEADLINE_DEN)
            : 16;
        const vyhodnocenoOperace = State.get('flags.operace_vyhodnoceni_den16_rano') === true;
        const terminZapis =
          '<p class="finance-operace-text finance-operace-text--termin">Termín z dopisu MUDr. Síbera: <strong>17. března 1931</strong> — Nemocnice Podolí, <strong>400 Kčs</strong> při příjmu.</p>';
        if (p.operaceOdlozena === true) {
          operaceHtml =
            '<div class="finance-operace-blok">' +
            '<div class="finance-operace-podnadpis">Matčina operace</div>' +
            terminZapis +
            '<p class="finance-operace-text">V uvedený den nebyla částka uhrazena včas — ordinace termín zrušila. Operace je odložena; další postup hlídejte ve spisu a ve večerních volbách.</p>' +
            '</div>';
        } else if (p.operaceZaplacena === true) {
          const poTermu = vyhodnocenoOperace === true || denHry > opTermDen;
          const stavTxt = poTermu
            ? 'Poplatek byl uhrazen včas; matka nastoupila k příjmu v den uvedený výše.'
            : 'Na poplatek u lékaře (' + p.operaceCil +
              ' Kčs) máte naspořeno — podle dopisu splatné při příjmu v uvedený den.';
          operaceHtml =
            '<div class="finance-operace-blok">' +
            '<div class="finance-operace-podnadpis">Matčina operace</div>' +
            terminZapis +
            '<p class="finance-operace-text">' + stavTxt + '</p>' +
            '</div>';
        } else {
          const chybi = Math.round(Number(p.chybiNaOperaci) || 0);
          const nd = Number(p.dnuDoDeadlineOperace) || 0;
          let lhutaTxt;
          if (nd <= 0) {
            lhutaTxt = 'Lhůta podle dopisu končí v kalendáři kampaně tímto dnem (17. března).';
          } else if (nd === 1) {
            lhutaTxt = 'Do uzávěrky lhůty v kampani zbývá 1 herní den.';
          } else {
            lhutaTxt = 'Do uzávěrky lhůty v kampani zbývá ' + nd + ' herních dní.';
          }
          operaceHtml =
            '<div class="finance-operace-blok">' +
            '<div class="finance-operace-podnadpis">Matčina operace</div>' +
            terminZapis +
            '<div class="finance-radek finance-radek--operace">' +
            '<span>Chybí do cíle (' + p.operaceCil + ' Kčs)</span>' +
            '<span class="finance-castka">' + chybi + ' Kčs</span>' +
            '</div>' +
            '<p class="finance-operace-text">' + lhutaTxt + '</p>' +
            '<p class="finance-operace-text finance-operace-text--hint">Úplné znění je v dopise od lékaře ve spisu.</p>' +
            '</div>';
        }
      }

      const rzMin = Number.isFinite(Number(p.rozsudekOdmenaMin)) ? Number(p.rozsudekOdmenaMin) : 0;
      const rzMax = Number.isFinite(Number(p.rozsudekOdmenaMax)) ? Number(p.rozsudekOdmenaMax) : 55;
      const rozsudekBlok =
        '<div class="finance-radek finance-radek--rozsudek">' +
        '<span>Odměna za rozsudek</span>' +
        '<span class="finance-castka finance-castka--plus">+' + rzMin + '–' + rzMax + ' Kčs</span>' +
        '</div>' +
        '<p class="finance-operace-text finance-operace-text--hint finance-rozsudek-hint">' +
        'Orientační rozmezí: skutečná částka závisí na typu spisu, průzkumu a souladu výroku se spisem ' +
        '(u náročnějších spisů přibývá typový příplatek).</p>';

      const skupinaPlatARozsudek =
        '<div class="finance-archiv-skupina-plat-rozsudek">' +
        radekVyplata +
        rozsudekBlok +
        '</div>';

      const finHost = document.createElement('div');
      finHost.innerHTML =
        '<div class="finance-widget">' +
        '<div class="finance-radek finance-radek--zustatek">' +
        '<span class="archiv-stav-finance-label"><span class="archiv-stav-duse-ikona" aria-hidden="true"><img src="src/effect-finance.png" alt="" loading="lazy" decoding="async"></span><span>Zůstatek</span></span>' +
        '<span class="finance-castka">' + p.zustatek + ' Kčs</span>' +
        '</div>' +
        '<div class="finance-radek">' +
        '<span>Nedělní plat soudu</span>' +
        '<span class="finance-castka finance-castka--plus">+' + p.plat + ' Kčs</span>' +
        '</div>' +
        '<div class="finance-radek">' +
        '<span>Běžné výdaje (denně)</span>' +
        '<span class="finance-castka finance-castka--minus">-' + p.vydaje + ' Kčs</span>' +
        '</div>' +
        '<div class="finance-radek">' +
        '<span>Za 7 dní celkem</span>' +
        '<span class="finance-castka finance-castka--minus">-' + p.vydajeTydenni + ' Kčs</span>' +
        '</div>' +
        skupinaPlatARozsudek +
        radekDluh +
        operaceHtml +
        '</div>';
      finSekce.appendChild(finHost);
      pravy.appendChild(finSekce);

      layout.appendChild(levy);
      layout.appendChild(pravy);
      obsah.appendChild(layout);

    } else if (tab === 'postavy') {
      obsah.innerHTML = '';

      const polePov =
        typeof DataLoader !== 'undefined' && DataLoader.ziskej
          ? DataLoader.ziskej('postavy_okoli')
          : null;
      const byIdPov = new Map();
      if (Array.isArray(polePov)) {
        for (const z of polePov) {
          if (z && z.id) byIdPov.set(String(z.id), z);
        }
      }
      const unlockedIdsRaw = State.get('flags.povest_odemcene_ids');
      const unlockedIds = Array.isArray(unlockedIdsRaw) ? unlockedIdsRaw : [];
      const unlockedSet = new Set(unlockedIds.map(x => String(x)));
      const TRIO_KLIC = ['vlcek', 'zavadova', 'karas'];
      const trioSet = new Set(TRIO_KLIC);

      const root = document.createElement('div');
      root.className = 'povest-zapisnik-root';

      const nav = document.createElement('div');
      nav.className = 'knihovna-podtabs';
      nav.setAttribute('role', 'tablist');
      for (const pane of [{ id: 'lide', label: 'Lidé' }, { id: 'frakce', label: 'Frakce' }]) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className =
          'knihovna-podtab' +
          (_povestArchivPodtab === pane.id ? ' knihovna-podtab--aktivni' : '');
        b.dataset.povestPodtab = pane.id;
        b.setAttribute('role', 'tab');
        b.setAttribute('aria-selected', _povestArchivPodtab === pane.id ? 'true' : 'false');
        b.textContent = pane.label;
        b.addEventListener('click', () => {
          _povestArchivPodtab = pane.id;
          _vyplnArchivTab('postavy');
        });
        nav.appendChild(b);
      }
      root.appendChild(nav);

      const panel = document.createElement('div');
      panel.className = 'knihovna-panel';

      if (_povestArchivPodtab === 'lide') {
        const nadK = document.createElement('div');
        nadK.className = 'postavy-frakce-nadpis';
        nadK.textContent = 'KLÍČOVÉ KONTAKTY';
        panel.appendChild(nadK);

        const vizSeznam =
          typeof Characters !== 'undefined' && Characters.getSeznamVizitek
            ? Characters.getSeznamVizitek()
            : [];
        const modeDuvera = _getStatsDisplayMode();
        for (const v of vizSeznam) {
          const sec = document.createElement('section');
          sec.className = 'povest-klicovy-clovek';
          const idBez = String(v.id || '').replace(/[^a-zA-Z0-9_-]/g, '');
          if (idBez) sec.id = 'povest-zaznam-' + idBez;
          const head = document.createElement('div');
          head.className = 'povest-klicovy-hlavicka';
          const tit = document.createElement('h3');
          tit.className = 'povest-klicovy-jmeno';
          tit.textContent = String(v.jmeno || v.id || '—').trim();
          head.appendChild(tit);
          if (v.role) {
            const ro = document.createElement('div');
            ro.className = 'povest-klicovy-role';
            ro.textContent = String(v.role);
            head.appendChild(ro);
          }
          sec.appendChild(head);

          const zRec = byIdPov.get(String(v.id));
          const expText =
            zRec && unlockedSet.has(String(v.id)) && String(zRec.expozice || '').trim()
              ? String(zRec.expozice).trim()
              : String(v.popis || v.popisKratky || '').trim() || '—';
          const exp = document.createElement('div');
          exp.className = 'povest-klicovy-expozice';
          _wfNastavRichText(exp, expText);
          if (typeof Knihovna !== 'undefined' && Knihovna.obalSlovnikemVElementu) {
            Knihovna.obalSlovnikemVElementu(exp);
          }
          sec.appendChild(exp);

          const tVal = Math.max(
            0,
            Math.min(3, Math.round(Number(State.get('trust.' + v.id)) || 0))
          );
          const duBlok = document.createElement('div');
          duBlok.className = 'povest-duvera-blok';
          const duH = document.createElement('div');
          duH.className = 'povest-duvera-hlava';
          const duLab = document.createElement('span');
          duLab.className = 'povest-duvera-label';
          duLab.textContent = 'Důvěra';
          const punky = document.createElement('div');
          punky.className = 'povest-duvera-punky';
          punky.setAttribute('role', 'img');
          punky.setAttribute(
            'aria-label',
            'Důvěra ' + tVal + ' z 3'
          );
          for (let i = 0; i < 3; i++) {
            const d = document.createElement('span');
            d.className =
              'povest-duvera-punkt' + (i < tVal ? ' povest-duvera-punkt--plny' : '');
            d.setAttribute('aria-hidden', 'true');
            punky.appendChild(d);
          }
          const slovo = document.createElement('strong');
          slovo.className = 'povest-duvera-slovo';
          slovo.textContent =
            typeof Characters !== 'undefined' && Characters.getDuveraVizitka
              ? Characters.getDuveraVizitka(v.id)
              : '—';
          duH.appendChild(duLab);
          duH.appendChild(punky);
          duH.appendChild(slovo);
          if (modeDuvera === 'spreadsheet') {
            const c = document.createElement('span');
            c.className = 'povest-duvera-cislo';
            c.textContent = ' · ' + tVal + '/3';
            duH.appendChild(c);
          }
          duBlok.appendChild(duH);
          sec.appendChild(duBlok);

          const profBtn = document.createElement('button');
          profBtn.type = 'button';
          profBtn.className = 'povest-klicovy-profil-btn';
          profBtn.textContent = 'Profil a historie';
          profBtn.addEventListener('click', () => {
            _otevriProfilPostavy(v.id);
          });
          sec.appendChild(profBtn);
          panel.appendChild(sec);
        }

        const nadO = document.createElement('div');
        nadO.className = 'postavy-frakce-nadpis';
        nadO.style.marginTop = '20px';
        nadO.textContent = 'DALŠÍ JMÉNA VE VYPRÁVĚNÍ';
        panel.appendChild(nadO);

        const povestWrap = document.createElement('div');
        povestWrap.className = 'povest-zapisnik-seznam';
        const ostatni = unlockedIds.filter(uid => !trioSet.has(String(uid)));
        if (!Array.isArray(polePov) || polePov.length === 0) {
          const prazd = document.createElement('p');
          prazd.className = 'povest-zapisnik-prazdno';
          prazd.textContent = 'Data pověstí postav nejsou k dispozici.';
          povestWrap.appendChild(prazd);
        } else if (!unlockedSet.size) {
          const prazd = document.createElement('p');
          prazd.className = 'povest-zapisnik-prazdno';
          prazd.textContent =
            'Jakmile ve hře poprvé zazní nové jméno, doplní se sem stručná pověst — sledujte stavovou hlášku dole.';
          povestWrap.appendChild(prazd);
        } else if (!ostatni.length) {
          const prazd = document.createElement('p');
          prazd.className = 'povest-zapisnik-prazdno';
          prazd.textContent =
            'Zatím tu nejsou další odemčená jména mimo klíčové kontakty výše.';
          povestWrap.appendChild(prazd);
        } else {
          for (const uid of ostatni) {
            const z = byIdPov.get(String(uid));
            if (!z || typeof z !== 'object') continue;
            const idBez = String(z.id || '').replace(/[^a-zA-Z0-9_-]/g, '');
            const sec = document.createElement('section');
            sec.className = 'povest-zapisnik-zaznam';
            if (idBez) sec.id = 'povest-zaznam-' + idBez;
            const h = document.createElement('h3');
            h.className = 'povest-zapisnik-jmeno';
            h.textContent = String(z.nazev || z.id || '—').trim() || '—';
            sec.appendChild(h);
            const role = String(z.role || '').trim();
            if (role) {
              const rr = document.createElement('p');
              rr.className = 'povest-zapisnik-role';
              rr.textContent = role;
              sec.appendChild(rr);
            }
            const tx = document.createElement('p');
            tx.className = 'povest-zapisnik-expozice';
            _wfNastavRichText(tx, String(z.expozice || '').trim() || '—');
            sec.appendChild(tx);
            povestWrap.appendChild(sec);
          }
        }
        panel.appendChild(povestWrap);

      } else {
        const moc = Number(State.get('factions.Moc') ?? 50);
        const kapital = Number(State.get('factions.Kapital') ?? 50);
        const lid = Number(State.get('factions.Lid') ?? 50);
        const frBlok = document.createElement('div');
        frBlok.className = 'postavy-frakce-blok';
        const frNadpis = document.createElement('div');
        frNadpis.className = 'postavy-frakce-nadpis';
        frNadpis.textContent = 'MOC · KAPITÁL · LID';
        frBlok.appendChild(frNadpis);
        const frRadky = [
          { stateKey: 'Moc', idKey: 'moc', hodnota: moc },
          { stateKey: 'Kapital', idKey: 'kapital', hodnota: kapital },
          { stateKey: 'Lid', idKey: 'lid', hodnota: lid }
        ];
        for (const { stateKey, idKey, hodnota } of frRadky) {
          const val = _statPasmoTextFrakce(hodnota);
          const def =
            typeof DataLoader !== 'undefined' && DataLoader.ziskejFrakci
              ? DataLoader.ziskejFrakci(idKey)
              : null;
          const dlouhy =
            def && typeof def.zapisnik_popis === 'string' ? def.zapisnik_popis.trim() : '';
          const lab =
            typeof Factions !== 'undefined' && Factions.getNazev
              ? Factions.getNazev(stateKey)
              : stateKey;

          const r = document.createElement('div');
          r.className =
            'postavy-frakce-radek' + (dlouhy ? ' postavy-frakce-radek--s-lore' : '');

          const iconAsset = _dusledkyIkonaAssetu({ typ: 'faction', klic: stateKey });
          const icon = document.createElement('span');
          icon.className = 'postavy-frakce-ikona';
          icon.setAttribute('aria-hidden', 'true');
          if (iconAsset) {
            const img = document.createElement('img');
            img.src = iconAsset;
            img.alt = '';
            img.loading = 'lazy';
            img.decoding = 'async';
            icon.appendChild(img);
          }

          const a = document.createElement('span');
          a.className = 'postavy-frakce-jmeno';
          a.textContent = lab;

          const pravy = document.createElement('div');
          pravy.className = 'postavy-frakce-pravy';
          if (dlouhy) {
            const lore = document.createElement('div');
            lore.className = 'postavy-frakce-lore';
            lore.innerHTML = _escapeHtmlProfil(dlouhy).replace(/\n/g, '<br>');
            if (typeof Knihovna !== 'undefined' && Knihovna.obalSlovnikemVElementu) {
              Knihovna.obalSlovnikemVElementu(lore);
            }
            pravy.appendChild(lore);
          }
          const b = document.createElement('div');
          b.className =
            'postavy-frakce-popis' + (dlouhy ? ' postavy-frakce-popis--pod-lore' : '');
          b.textContent = dlouhy ? ('Nyní: ' + (val || '—')) : (val || '—');
          pravy.appendChild(b);

          r.appendChild(icon);
          r.appendChild(a);
          r.appendChild(pravy);
          frBlok.appendChild(r);
        }
        panel.appendChild(frBlok);
      }

      root.appendChild(panel);
      obsah.appendChild(root);

      if (_povestZapisnikAnchorId) {
        const aid = _povestZapisnikAnchorId;
        requestAnimationFrame(() => {
          const el = document.getElementById('povest-zaznam-' + aid);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
        _povestZapisnikAnchorId = null;
      }

    } else if (tab === 'rozsudky') {
      const rozsudkyVse = State.get('archive.verdicts') || [];
      if (!rozsudkyVse.length) {
        obsah.innerHTML = '<p style="color: var(--barva-text-slaby); font-style: italic; text-align: center;">Zatím žádné vyřešené případy.</p>';
        return;
      }
      obsah.innerHTML = '';
      const filtrRow = document.createElement('div');
      filtrRow.className = 'archiv-rozsudky-filtr';
      for (const opt of _ARCHIV_ROZ_TYP_FILTRY) {
        const b = document.createElement('button');
        b.type = 'button';
        const tridaTyp =
          opt.id !== 'vse' ? ' archiv-rozsudky-filtr-btn--case-' + opt.id : '';
        b.className =
          'archiv-rozsudky-filtr-btn' +
          tridaTyp +
          (_archivRozsudkyFiltrTyp === opt.id ? ' archiv-rozsudky-filtr-btn--aktivni' : '');
        b.dataset.filtrTyp = opt.id;
        b.textContent = opt.lab;
        b.addEventListener('click', () => {
          _archivRozsudkyFiltrTyp = opt.id;
          _vyplnArchivTab('rozsudky');
        });
        filtrRow.appendChild(b);
      }
      obsah.appendChild(filtrRow);
      const seznamWrap = document.createElement('div');
      seznamWrap.className = 'archiv-list-scroll';
      obsah.appendChild(seznamWrap);

      const rozsudky =
        _archivRozsudkyFiltrTyp === 'vse'
          ? rozsudkyVse.slice()
          : rozsudkyVse.filter(r => _archivRozsudekTypZaznamu(r) === _archivRozsudkyFiltrTyp);
      const trendyEl = _archivVytvorTrendyPanel(rozsudky);
      if (trendyEl) seznamWrap.appendChild(trendyEl);
      if (!rozsudky.length) {
        const prazdne = document.createElement('p');
        prazdne.className = 'archiv-rozsudky-filtr-prazdne';
        prazdne.textContent = 'Pro zvolený typ tu zatím nic není.';
        seznamWrap.appendChild(prazdne);
        return;
      }
      const modeRz = _getStatsDisplayMode();
      const formatSouhrnNeoficial = (sum) => {
        const s = sum && typeof sum === 'object' ? sum : null;
        if (!s) return null;
        const count = Number(s.count) || 0;
        const finance = Number(s.finance) || 0;
        const casti = [];
        if (finance !== 0) {
          casti.push(_archivNeoficialniSoucetUsek(modeRz, 'finance', null, finance));
        }
        for (const [k, d] of Object.entries(s.traits || {})) {
          const v = Number(d) || 0;
          if (!v) continue;
          const u = _archivNeoficialniSoucetUsek(modeRz, 'trait', k, v);
          if (u) casti.push(u);
        }
        for (const [kRaw, d] of Object.entries(s.factions || {})) {
          const v = Number(d) || 0;
          if (!v) continue;
          const u = _archivNeoficialniSoucetUsek(modeRz, 'faction', kRaw, v);
          if (u) casti.push(u);
        }
        for (const [npcId, d] of Object.entries(s.trust || {})) {
          const v = Number(d) || 0;
          if (!v) continue;
          const u = _archivNeoficialniSoucetUsek(modeRz, 'trust', npcId, v);
          if (u) casti.push(u);
        }
        if (count <= 0 && !casti.length) return null;
        const dopadBezCisel =
          modeRz === 'intuitive' ? 'bez dalšího viditelného číselného dopadu' : 'bez dalšího číselného dopadu';
        return {
          count: Math.max(0, Math.round(count)),
          text: casti.length ? casti.join(' · ') : dopadBezCisel
        };
      };
      rozsudky.forEach(r => {
        const typZ = _archivRozsudekTypZaznamu(r);
        const item = document.createElement('div');
        item.className = 'archiv-rozsudek-item archiv-rozsudek-item--typ-' + typZ;
        const headBtn = document.createElement('button');
        headBtn.type = 'button';
        headBtn.className = 'archiv-rozsudek-toggle';
        headBtn.innerHTML =
          `<span class="archiv-rozsudek-den archiv-rozsudek-datum">${_archivFragmentDatumText(r.day)}</span>` +
          `<span class="archiv-rozsudek-typ-chip archiv-rozsudek-typ-chip--${typZ}">${_archivNazevTypuChip(typZ)}</span>` +
          `<span class="archiv-rozsudek-nazev">${r.caseTitle}</span>` +
          `<span class="archiv-rozsudek-verdict">${_archivTextVyroku(r)}</span>` +
          `<span class="archiv-rozsudek-toggle-arrow" aria-hidden="true">▾</span>`;
        item.appendChild(headBtn);

        const detail = document.createElement('div');
        detail.className = 'archiv-rozsudek-detail skryto';
        const radkyEf =
          (r && Array.isArray(r.dusledkyRadky) && r.dusledkyRadky.length)
            ? r.dusledkyRadky
            : (r && r.consequences ? vypoctiDusledkyRadky(r.consequences) : []);
        const komp = _dusledkyVytvorKompaktEfekty(radkyEf, { jenZmena: true });
        if (komp.childElementCount) detail.appendChild(komp);

        const sum = formatSouhrnNeoficial(r && r.unofficialSummary);
        if (sum) {
          const box = document.createElement('div');
          box.className = 'archiv-rozsudek-unofficial';
          box.innerHTML =
            `<div class="archiv-rozsudek-unofficial-title">Mimo spis: ${sum.count}×</div>` +
            `<div class="archiv-rozsudek-unofficial-text">Součet obětovaných zdrojů: ${sum.text}.</div>`;
          detail.appendChild(box);
        }
        if (Number.isFinite(Number(r && r.pathEvidenceDelta))) {
          const p = Math.round(Number(r.pathEvidenceDelta));
          const boxP = document.createElement('div');
          boxP.className = 'archiv-rozsudek-unofficial';
          boxP.innerHTML =
            `<div class="archiv-rozsudek-unofficial-title">Průzkumné cesty</div>` +
            `<div class="archiv-rozsudek-unofficial-text">Vliv na důkazní oporu: ${_wfTextProcesnihoPodkladu(p)}.</div>`;
          detail.appendChild(boxP);
        }

        const detailBtn = document.createElement('button');
        detailBtn.type = 'button';
        detailBtn.className = 'archiv-rozsudek-detail-btn';
        detailBtn.textContent = 'Detail';
        detailBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const pripad = DataLoader.ziskejPripad(r.caseId);
          if (pripad) {
            _zavriModal('modal-archiv');
            zobrazPripadReadonly(pripad, { poZavreniArchivTab: 'rozsudky' });
          }
        });
        detail.appendChild(detailBtn);

        headBtn.addEventListener('click', () => {
          const jeSkryte = detail.classList.contains('skryto');
          seznamWrap.querySelectorAll('.archiv-rozsudek-detail').forEach(el => el.classList.add('skryto'));
          seznamWrap.querySelectorAll('.archiv-rozsudek-item').forEach(el => el.classList.remove('archiv-rozsudek-item--open'));
          if (jeSkryte) {
            detail.classList.remove('skryto');
            item.classList.add('archiv-rozsudek-item--open');
          }
        });
        item.appendChild(detail);
        seznamWrap.appendChild(item);
      });

    } else if (tab === 'fragmenty') {
      const povoleneFiltryFr = new Set(_ARCHIV_FRAGMENT_TYP_FILTRY.map(o => o.id));
      if (!povoleneFiltryFr.has(_archivFragmentyFiltrTyp)) _archivFragmentyFiltrTyp = 'vse';
      const fragmentyVse = (State.get('archive.fragments') || [])
        .map(_archivFragmentObjekt)
        .filter(Boolean);
      if (!fragmentyVse.length) {
        obsah.innerHTML = '<p style="color: var(--barva-text-slaby); font-style: italic; text-align: center;">Zatím žádné přečtené záznamy.</p>';
        return;
      }
      obsah.innerHTML = '';
      const filtrRow = document.createElement('div');
      filtrRow.className = 'archiv-rozsudky-filtr archiv-fragmenty-filtr';
      for (const opt of _ARCHIV_FRAGMENT_TYP_FILTRY) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className =
          'archiv-rozsudky-filtr-btn archiv-fragmenty-filtr-btn archiv-fragmenty-filtr-btn--' + opt.id +
          (_archivFragmentyFiltrTyp === opt.id ? ' archiv-rozsudky-filtr-btn--aktivni' : '');
        b.dataset.filtrTyp = opt.id;
        b.textContent = opt.lab;
        b.addEventListener('click', () => {
          _archivFragmentyFiltrTyp = opt.id;
          _vyplnArchivTab('fragmenty');
        });
        filtrRow.appendChild(b);
      }
      obsah.appendChild(filtrRow);
      const seznamWrap = document.createElement('div');
      seznamWrap.className = 'archiv-list-scroll';
      obsah.appendChild(seznamWrap);

      const fragmenty =
        _archivFragmentyFiltrTyp === 'vse'
          ? fragmentyVse
          : fragmentyVse.filter(z => _archivFragmentKategorie(z.f) === _archivFragmentyFiltrTyp);

      if (!fragmenty.length) {
        const prazdne = document.createElement('p');
        prazdne.className = 'archiv-rozsudky-filtr-prazdne';
        prazdne.textContent = 'Pro zvolený typ tu zatím nic není.';
        seznamWrap.appendChild(prazdne);
        return;
      }

      fragmenty.forEach(({ isInline, id, f }) => {
        const z = { isInline, id, f };
        const item = document.createElement('div');
        item.className = 'archiv-rozsudek-item archiv-fragment-item';
        item.style.cursor = 'pointer';
        const den = document.createElement('span');
        den.className = 'archiv-rozsudek-den archiv-fragment-den';
        const denNum = _archivFragmentDen(z);
        den.textContent = _archivFragmentDatumText(denNum);
        const typ = document.createElement('span');
        const kat = _archivFragmentKategorie(f);
        typ.className = `archiv-fragment-typ archiv-fragment-typ--${kat}`;
        typ.textContent = _archivFragmentKategorieLabel(kat);
        const nazev = document.createElement('span');
        nazev.className = 'archiv-rozsudek-nazev';
        nazev.textContent = f.title || id || 'Záznam';
        item.appendChild(den);
        item.appendChild(typ);
        item.appendChild(nazev);
        item.addEventListener('click', () => {
          if (isInline) {
            zobrazFragment({
              type: f.type || 'letter',
              title: f.title || 'Dopis',
              text: f.text || '',
              id: f.id || id,
              archiveId: f.archiveId || id
            });
          } else {
            Narrative.zobrazFragment(id);
          }
        });
        seznamWrap.appendChild(item);
      });

    } else if (tab === 'knihovna') {
      obsah.innerHTML = '<p class="knihovna-nacitani">Načítám…</p>';
      if (typeof Knihovna === 'undefined') {
        obsah.innerHTML =
          '<p class="knihovna-chyba">Modul Knihovny není k dispozici.</p>';
        return;
      }
      Knihovna.nacti().then(() => {
        const tabEl = document.querySelector('.archiv-tab--aktivni');
        if (!tabEl || tabEl.dataset.tab !== 'knihovna') return;
        const box = document.getElementById('archiv-obsah');
        if (!box) return;
        _vyplnKnihovnaObsah(box);
      });
    }
  }

  function _escapeHtmlProfil(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /** Zavře návštěvu / historii u profilu a vrátí otevřený zápisník na Pověst → Lidé. */
  function _zavriProfilPostavyAVratNaPovest() {
    _zavriModal('modal-postava-historie-detail');
    _zavriModal('modal-postava-profil');
    const arch = document.getElementById('modal-archiv');
    if (arch && arch.classList.contains('aktivni')) {
      _povestArchivPodtab = 'lide';
      _prepniArchivTab('postavy');
    }
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
      if (typeof Knihovna !== 'undefined' && Knihovna.obalSlovnikemVElementu) {
        Knihovna.obalSlovnikemVElementu(telo);
      }
    } else {
      telo.innerHTML = '<p class="postava-historie-detail-prazdne">Úplný text není k dispozici.</p>';
    }
    _otevriModal('modal-postava-historie-detail');
  }

  function _otevriProfilPostavy(npcId) {
    const v = Characters.getSeznamVizitek().find(x => x.id === npcId);
    if (!v) return;
    const roleEl = document.getElementById('postava-profil-role');
    const jmeno = document.getElementById('postava-profil-jmeno');
    const duveraEl = document.getElementById('postava-profil-duvera');
    const vliv = document.getElementById('postava-profil-vliv');
    const historie = document.getElementById('postava-profil-historie');
    if (!roleEl || !jmeno || !duveraEl || !vliv || !historie) return;
    roleEl.textContent = String(v.role || '').trim() || '—';
    jmeno.textContent = v.jmeno;
    duveraEl.dataset.npcId = v.id;
    duveraEl.textContent = Characters.getDuveraVizitka(v.id);

    const vlivText = Characters.getVlivNaHrace(npcId);
    vliv.innerHTML = vlivText
      ? vlivText.split('\n').map(radek =>
          '<p class="postava-profil-vliv-radek">' + _escapeHtmlProfil(radek) + '</p>'
        ).join('')
      : '<p class="postava-profil-vliv-radek">—</p>';
    if (typeof Knihovna !== 'undefined' && Knihovna.obalSlovnikemVElementu) {
      Knihovna.obalSlovnikemVElementu(vliv);
    }

    const zaznamy = Characters.getHistorieSetkani(npcId);
    historie.innerHTML = '';
    if (zaznamy.length === 0) {
      const p = document.createElement('p');
      p.className = 'postava-profil-historie-prazdne';
      p.textContent = Characters.getHistoriePrazdnaZprava(npcId);
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

  /** Délka zobrazení stavové hlášky (ms). */
  const STAVOVA_ZPRAVA_TRVANI_MS = 10000;
  /** Toast s HTML (odkazy do zápisníku) — déle kvůli čtení a kliku. */
  const STAVOVA_ZPRAVA_TRVANI_HTML_MS = 18000;
  /** Krátké atmosférické hlášky (reakce frakcí po rozsudku apod.). */
  const STAVOVA_ZPRAVA_TRVANI_KRATKA_MS = 5000;

  /**
   * @param {string} text — prostý text nebo HTML (viz opts.html).
   * @param {number} [trvani]
   * @param {{ html?: boolean }} [opts] — při html: true se použije innerHTML (odkazy v toastu).
   */
  function zobrazStavovouZpravu(text, trvani = STAVOVA_ZPRAVA_TRVANI_MS, opts) {
    const el = document.getElementById('stavova-zprava');
    if (!el) return;
    const useHtml = opts && opts.html === true;
    if (useHtml) {
      el.innerHTML = text;
      if (typeof Knihovna !== 'undefined' && Knihovna.obalSlovnikemVElementu) {
        Knihovna.obalSlovnikemVElementu(el);
      }
      el.classList.add('stavova-zprava--html');
    } else {
      el.innerHTML = '';
      el.textContent = text;
      el.classList.remove('stavova-zprava--html');
    }
    el.classList.add('viditelna');

    if (_zpravaCasovac) clearTimeout(_zpravaCasovac);
    _zpravaCasovac = setTimeout(() => {
      el.classList.remove('viditelna');
      if (useHtml) {
        el.innerHTML = '';
        el.classList.remove('stavova-zprava--html');
      }
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

  function _aktualizujMenuPatraniNastaveni() {
    const b = document.getElementById('menu-patrani-na-cas');
    if (!b) return;
    const on = State.get('settings.patraniNaCas') === true;
    b.textContent = on ? 'Zapnuto' : 'Vypnuto';
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  function _aktualizujMenuStatsZobrazeni() {
    const wrap = document.getElementById('menu-stats-display-wrap');
    if (!wrap) return;
    const ok = !!State.get('flags.stats_display_unlocked');
    wrap.classList.toggle('skryto', !ok);
    if (!ok) return;
    const mode = _getStatsDisplayMode();
    wrap.querySelectorAll('[data-stats-mode]').forEach(btn => {
      const active = btn.getAttribute('data-stats-mode') === mode;
      btn.classList.toggle('menu-stats-mode-btn--aktivni', active);
    });
  }

  function _obnovObsahArchivuPokudJeOtevren() {
    const archiv = document.getElementById('modal-archiv');
    if (!archiv || !archiv.classList.contains('aktivni')) return;
    const tabAktivni = document.querySelector('.archiv-tab--aktivni');
    const tab = (tabAktivni && tabAktivni.dataset.tab) ? tabAktivni.dataset.tab : 'rozsudky';
    _vyplnArchivTab(tab);
  }

  /**
   * Odemkne pověst postavy po události (přečtený fragment, dopis, otevřený případ, adventure).
   * Lidé s `od_zacatku` jsou už ve stavu — viz migrace ve state.js.
   * @param {'fragment'|'dopis'|'pripad'|'adventure'} typ
   * @param {string} id — id fragmentu / dopisu / případu / scény z JSON
   */
  function odemkniPovestPodleUdalosti(typ, id) {
    if (typeof State === 'undefined' || typeof DataLoader === 'undefined') return;
    const typN = String(typ || '').trim().toLowerCase();
    const idN = String(id || '').trim();
    if (!typN || !idN) return;
    const pole = DataLoader.ziskej('postavy_okoli');
    if (!Array.isArray(pole) || !pole.length) return;
    const stateIds = State.get('flags.povest_odemcene_ids');
    const unlocked = Array.isArray(stateIds) ? stateIds.slice() : [];
    const set = new Set(unlocked);
    const nove = [];
    for (const z of pole) {
      if (!z || typeof z !== 'object') continue;
      const pid = String(z.id || '').trim();
      if (!pid || set.has(pid) || z.od_zacatku === true) continue;
      const trig = z.odemkni_po_preceteni;
      if (!Array.isArray(trig) || !trig.length) continue;
      let pasuje = false;
      for (const t of trig) {
        if (!t || typeof t !== 'object') continue;
        const tt = String(t.typ || '').trim().toLowerCase();
        const tid = String(t.id || '').trim();
        if (tt === typN && tid === idN) {
          pasuje = true;
          break;
        }
      }
      if (!pasuje) continue;
      nove.push(z);
      unlocked.push(pid);
      set.add(pid);
    }
    if (!nove.length) return;
    State.set('flags.povest_odemcene_ids', unlocked);
    State.uloz();
    const jmenaHtml = nove.map(z => {
      const pClean = String(z.id || '').trim().replace(/[^a-zA-Z0-9_-]/g, '');
      const naz = _escapeHtmlProfil(String(z.nazev || z.id || '').trim());
      return (
        '<button type="button" class="stavova-zprava-link povest-zapisnik-link" data-povest-id="' +
        pClean +
        '">' +
        naz +
        '</button>'
      );
    });
    const text =
      nove.length === 1
        ? 'Váš zápisník byl aktualizován o novou postavu: ' + jmenaHtml[0] + '.'
        : 'Váš zápisník byl aktualizován o nové postavy: ' + jmenaHtml.join(' · ') + '.';
    zobrazStavovouZpravu(text, STAVOVA_ZPRAVA_TRVANI_HTML_MS, { html: true });
    _obnovObsahArchivuPokudJeOtevren();
  }

  function _aktualizujTextyMenuSlotu() {
    const autoStav = document.getElementById('menu-auto-stav');
    const autoBtn = document.getElementById('menu-nacist-auto');
    const a = State.peekAutosave();
    if (autoStav) {
      autoStav.textContent = a ? 'Den ' + a.currentDay : 'Zatím žádné';
      autoStav.classList.toggle('menu-slot-stav--obsazeno', !!a);
    }
    if (autoBtn) {
      autoBtn.disabled = !a;
      autoBtn.title = a
        ? 'Načíst automatické uložení (den ' + a.currentDay + ')'
        : 'Automatické uložení vznikne po chvíli hraní';
    }
    const autoRow = document.querySelector('.menu-slot--auto');
    if (autoRow) autoRow.classList.toggle('menu-slot--obsazeno', !!a);

    const nSlot = Number(State.pocetRucnichUlozeni) || 5;
    for (let poz = 1; poz <= nSlot; poz++) {
      const ulozeno = State.peekUlozene(poz);
      const maUlozku = !!ulozeno;
      const stavEl = document.getElementById('menu-slot-stav-' + poz);
      if (stavEl) {
        stavEl.textContent = maUlozku
          ? ('Den ' + ulozeno.currentDay)
          : 'Prázdná';
        stavEl.classList.toggle('menu-slot-stav--obsazeno', maUlozku);
      }
      const ulozBtn = document.getElementById('menu-ulozit-' + poz);
      const nacistBtn = document.getElementById('menu-nacist-' + poz);
      if (ulozBtn) {
        ulozBtn.textContent = 'Uložit';
        ulozBtn.disabled = false;
        ulozBtn.title = maUlozku
          ? 'Přepsat ruční zálohu ' + poz + ' (nyní den ' + ulozeno.currentDay + ')'
          : 'Uložit aktuální postup do prázdné zálohy ' + poz;
      }
      if (nacistBtn) {
        nacistBtn.textContent = 'Načíst';
        nacistBtn.disabled = !maUlozku;
        nacistBtn.title = maUlozku
          ? 'Načíst ruční zálohu ' + poz + ' (den ' + ulozeno.currentDay + ')'
          : 'V této záloze není uložená hra';
      }
      const row = document.querySelector('.menu-slot[data-slot="' + poz + '"]');
      if (row) row.classList.toggle('menu-slot--obsazeno', maUlozku);
    }
    _aktualizujMenuStatsZobrazeni();
    _aktualizujMenuPatraniNastaveni();
  }

  function _otevriMenu() {
    const modal = document.getElementById('modal-menu');
    if (!modal) return;
    _aktualizujTextyMenuSlotu();
    _aktualizujMenuStatsZobrazeni();
    _aktualizujMenuPatraniNastaveni();
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
      'Krátké pověsti postav z okolí soudu přibývají v zápisníku na stole (záložka Pověst), ' +
      'jakmile ve hře poprvé zazní jejich jméno.\n\n' +
      'Uložení je v tomto prohlížeči (localStorage): automatické uložení během hry ' +
      'a pět nezávislých ručních záloh. ' +
      'Na jiném zařízení nebo v jiném prohlížeči uložená pozice není; ' +
      'po vymazání dat stránky nebo v soukromém okně může zmizet.\n\n' +
      'Verze: 0.1 (vývoj)';
    void _zobrazMenuDialog({
      kicker: 'Informace',
      title: 'O hře a ukládání',
      text,
      showStudioLogo: true,
      confirmText: 'Rozumím',
      cancelHidden: true
    });
  }

  // --- INICIALIZACE LISTENERY ---

  function inicializuj() {
    if (typeof Branding !== 'undefined' && Branding.inicializuj) {
      Branding.inicializuj();
      Branding.napojFallback(
        document.getElementById('menu-studio-badge-img'),
        document.getElementById('menu-studio-badge-fallback')
      );
    }

    // Zápisník na stole — archiv (záložka Rozsudky)
    document.getElementById('desk-notebook')?.addEventListener('click', () => {
      if (typeof SFX !== 'undefined') SFX.penWriting();
      zobrazArchiv('rozsudky');
    });

    document.getElementById('desk-knihovna')?.addEventListener('click', () => {
      if (typeof SFX !== 'undefined' && SFX.penWriting) SFX.penWriting();
      zobrazArchiv('knihovna');
    });

    document.addEventListener('click', (e) => {
      const pLink = e.target && e.target.closest && e.target.closest('.povest-zapisnik-link');
      if (pLink) {
        const pid = pLink.getAttribute('data-povest-id');
        if (!pid || !String(pid).trim()) return;
        e.preventDefault();
        e.stopPropagation();
        if (typeof SFX !== 'undefined' && SFX.penWriting) SFX.penWriting();
        zobrazArchiv('postavy', { povest: { anchorId: pid } });
        return;
      }
      const link = e.target && e.target.closest && e.target.closest('.knihovna-link');
      if (!link) return;
      const kid = link.getAttribute('data-knihovna-id');
      if (!kid || !String(kid).trim()) return;
      e.preventDefault();
      e.stopPropagation();
      if (typeof SFX !== 'undefined' && SFX.penWriting) SFX.penWriting();
      zobrazArchiv('knihovna', { knihovna: { panel: 'slovnik', anchorId: kid } });
    }, true);

    // Panel financí na stole → totéž okno archivu, záložka Stav (obživa)
    document.querySelector('.pravy-panel-finance-wrap')?.addEventListener('click', () => {
      zobrazArchiv('stav-duse');
    });

    document.getElementById('pripad-zpet-do-archivu')?.addEventListener('click', () => {
      const tab = _archivNavZpetTab || 'rozsudky';
      _zavriPripadModal();
      zobrazArchiv(tab);
    });

    // Zavřít případ tlačítkem X
    document.getElementById('pripad-zavrit-x')?.addEventListener('click', () => {
      _zavriPripadModal();
    });

    document.querySelectorAll('.menu-stats-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const m = btn.getAttribute('data-stats-mode');
        if (!m || !_STATS_MODES.includes(m)) return;
        if (!State.get('flags.stats_display_unlocked')) return;
        State.set('statsDisplayMode', m);
        State.uloz();
        _aktualizujMenuStatsZobrazeni();
        _obnovObsahArchivuPokudJeOtevren();
      });
    });

    document.getElementById('menu-patrani-na-cas')?.addEventListener('click', () => {
      const on = State.get('settings.patraniNaCas') === true;
      if (!State.set) return;
      State.set('settings.patraniNaCas', !on);
      State.uloz();
      _aktualizujMenuPatraniNastaveni();
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
          _zavriProfilPostavyAVratNaPovest();
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
        const modalArchiv = document.getElementById('modal-archiv');
        if (modalArchiv && modalArchiv.classList.contains('aktivni')) {
          _zavriModal('modal-archiv');
          return;
        }
        _zavriPripadModal();
      }
    });

    // Zavřít archiv
    document.getElementById('archiv-zavrit')?.addEventListener('click', () => {
      _zavriModal('modal-archiv');
    });

    document.getElementById('postava-profil-zavrit')?.addEventListener('click', () => {
      _zavriProfilPostavyAVratNaPovest();
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
              overlay.id === 'modal-postava-historie-detail') {
            _zavriModal(overlay.id);
          }
          if (overlay.id === 'modal-postava-profil') {
            _zavriProfilPostavyAVratNaPovest();
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

    document.addEventListener('click', (e) => {
      const rawTarget = e.target;
      const targetEl = rawTarget instanceof Element ? rawTarget : rawTarget?.parentElement;
      const clueEl = targetEl && targetEl.closest ? targetEl.closest('.clue[data-clue-id]') : null;
      if (!clueEl) return;
      const modalPripad = document.getElementById('modal-pripad');
      if (!modalPripad || !modalPripad.classList.contains('aktivni')) return;
      if (!modalPripad.contains(clueEl)) return;
      if (modalPripad.dataset.verdictMode === 'readonly') return;
      if (_wfJeAktivniDopadovaVrstvaPripadu()) return;
      if (clueEl.classList.contains('clue--locked')) {
        zobrazStavovouZpravu('Osa stop je potvrzená. Další kombinace jsou v tomto spisu uzamčené.');
        return;
      }
      /* Označení textu ve stopě nesmí spustit logiku výběru dvojice / pátrání. */
      const sel = typeof window.getSelection === 'function' ? window.getSelection() : null;
      if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
        try {
          const r = sel.getRangeAt(0);
          const n = r.commonAncestorContainer;
          const el = n.nodeType === Node.TEXT_NODE ? n.parentElement : n;
          if (el && clueEl.contains(el)) return;
        } catch (_err) { /* ignore */ }
      }
      e.preventDefault();
      _wfClueZpracujKlik(clueEl);
    }, true);

    // Hamburger menu
    document.getElementById('btn-menu')?.addEventListener('click', () => {
      _otevriMenu();
    });

    document.getElementById('menu-zavrit')?.addEventListener('click', () => {
      _zavriMenu();
    });

    document.getElementById('menu-zavrit-x')?.addEventListener('click', () => {
      _zavriMenu();
    });

    document.getElementById('menu-nova-hra')?.addEventListener('click', () => {
      void _zobrazMenuDialog({
        kicker: 'Nová hra',
        title: 'Začít nový běh?',
        text:
          'Aktuální rozehraný běh a automatické uložení se smažou.\n\n' +
          'Ruční zálohy 1–5 v menu zůstanou zachované a můžeš je později načíst.',
        confirmText: 'Začít znovu',
        cancelText: 'Zpět'
      }).then(ok => {
        if (!ok) return;
        _zavriMenu();
        State.reset();
        location.reload();
      });
    });

    function _handlerUlozPozici(pozice) {
      const denAktualni = Number(State.get('currentDay'));
      const stara = State.peekUlozene(pozice);
      const title = stara ? 'Přepsat ruční zálohu?' : 'Uložit do ruční zálohy?';
      const body = stara
        ? (
          'V záloze ' + pozice + ' je uložen den ' + stara.currentDay + '.\n' +
          'Aktuální hra je den ' + denAktualni + '.\n\n' +
          'Po potvrzení zůstane v tomto slotu jen nový stav.'
        )
        : (
          'Uložit aktuální postup (den ' + denAktualni + ') do prázdné zálohy ' + pozice + '.\n\n' +
          'Později můžeš načíst jinou zálohu; neuložené změny v jiném slotu se nepřepíšou samy.'
        );

      void _zobrazMenuDialog({
        kicker: 'Uložení',
        title,
        text: body,
        confirmText: stara ? 'Přepsat' : 'Uložit',
        cancelText: 'Zrušit'
      }).then(ok => {
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
      });
    }

    {
      const nSlot = Number(State.pocetRucnichUlozeni) || 5;
      for (let poz = 1; poz <= nSlot; poz++) {
        document.getElementById('menu-ulozit-' + poz)?.addEventListener('click', () => _handlerUlozPozici(poz));
      }
    }

    function _handlerNactiAutosave() {
      const ulozene = State.peekAutosave();
      if (!ulozene) {
        zobrazStavovouZpravu('Automatické uložení zatím neexistuje.');
        return;
      }
      const denAktualni = Number(State.get('currentDay'));
      void _zobrazMenuDialog({
        kicker: 'Načtení',
        title: 'Načíst automatické uložení?',
        text:
          'V automatickém uložení je den ' + ulozene.currentDay + '.\n' +
          'Aktuálně hraješ den ' + denAktualni + '.\n\n' +
          'Po načtení se běžící stav nahradí uloženým postupem. Ruční zálohy zůstanou beze změny.',
        confirmText: 'Načíst',
        cancelText: 'Zpět'
      }).then(ok => {
        if (!ok) return;
        const nacten = State.nactiJenAutosave();
        if (!nacten) {
          zobrazStavovouZpravu('Automatické uložení se nepodařilo načíst.');
          return;
        }
        Engine.syncFromSavedState();
        obnovUIDataPoNacteniSlotu();
        _aktualizujTextyMenuSlotu();
        _zavriMenu();
        zobrazStavovouZpravu('Automatické uložení načteno — den ' + ulozene.currentDay + '.');
      });
    }

    document.getElementById('menu-nacist-auto')?.addEventListener('click', () => _handlerNactiAutosave());

    function _handlerNactiPozici(pozice) {
      const ulozene = State.peekUlozene(pozice);
      if (!ulozene) {
        zobrazStavovouZpravu('Tato záloha je prázdná — není co načíst.');
        return;
      }
      const denAktualni = Number(State.get('currentDay'));
      void _zobrazMenuDialog({
        kicker: 'Načtení',
        title: 'Načíst ruční zálohu ' + pozice + '?',
        text:
          'V záloze je uložen den ' + ulozene.currentDay + '.\n' +
          'Aktuálně hraješ den ' + denAktualni + '.\n\n' +
          'Po načtení se běžící stav nahradí uloženým postupem. Pokud chceš současný běh zachovat, nejdřív ho ulož do jiného slotu.',
        confirmText: 'Načíst',
        cancelText: 'Zpět'
      }).then(ok => {
        if (!ok) return;
        const nacten = State.nacti(pozice);
        if (!nacten) {
          zobrazStavovouZpravu('Uloženou hru se nepodařilo načíst.');
          return;
        }
        Engine.syncFromSavedState();
        obnovUIDataPoNacteniSlotu();
        _aktualizujTextyMenuSlotu();
        _zavriMenu();
        zobrazStavovouZpravu('Hra načtena — den ' + ulozene.currentDay + '.');
      });
    }

    {
      const nSlot = Number(State.pocetRucnichUlozeni) || 5;
      for (let poz = 1; poz <= nSlot; poz++) {
        document.getElementById('menu-nacist-' + poz)?.addEventListener('click', () => _handlerNactiPozici(poz));
      }
    }

    document.getElementById('menu-o-hre')?.addEventListener('click', () => {
      _zobrazOHre();
    });

    document.getElementById('menu-o-hre-text')?.addEventListener('click', () => {
      _zobrazOHre();
    });

    document.getElementById('modal-menu')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) _zavriMenu();
    });
  }

  /**
   * Před závěrečným epilogem: rámcový text z `data/ending_prelude.json` (konec kampaně, typ konce).
   * Bez slovníkových prokliků. Chybí-li data nebo DOM, rovnou epilog.
   */
  function zobrazPredKoncemAKonecHry(typ, epilogRadky) {
    const preludeModal = document.getElementById('modal-konec-prelude');
    const ramecek = document.getElementById('konec-prelude-ramecek');
    const nadpisEl = document.getElementById('konec-prelude-nadpis');
    const teloEl = document.getElementById('konec-prelude-telo');
    const btn = document.getElementById('konec-prelude-pokracovat');
    if (!preludeModal || !ramecek || !nadpisEl || !teloEl || !btn) {
      zobrazKonecHry(typ, epilogRadky);
      return;
    }

    let data = null;
    if (typeof DataLoader !== 'undefined' && DataLoader.ziskejEndingPrelude) {
      data = DataLoader.ziskejEndingPrelude();
    }
    if (!data || typeof data !== 'object') {
      zobrazKonecHry(typ, epilogRadky);
      return;
    }

    const typy = data.typy && typeof data.typy === 'object' ? data.typy : {};
    const blok = typy[typ] || typy.default;
    const nadpisBlok = blok && typeof blok === 'object' ? String(blok.nadpis || '').trim() : '';
    const odstavceRaw = blok && typeof blok === 'object' && Array.isArray(blok.odstavce) ? blok.odstavce : [];
    if (!nadpisBlok && odstavceRaw.length === 0) {
      zobrazKonecHry(typ, epilogRadky);
      return;
    }

    const uvod = String(data.uvod_vzdy || '').trim();
    ramecek.textContent = uvod || 'Konec příběhové kampaně. Následuje epilog s následky.';

    nadpisEl.textContent = nadpisBlok || '—';

    const htmlPar = [];
    for (const p of odstavceRaw) {
      const t = String(p || '').trim();
      if (!t) continue;
      htmlPar.push(
        '<p class="konec-prelude-odstavec">' +
          _escapeHtmlProfil(t).replace(/\n/g, '<br>') +
          '</p>'
      );
    }
    teloEl.innerHTML = htmlPar.length ? htmlPar.join('') : '<p class="konec-prelude-odstavec">—</p>';

    const obrPre = document.getElementById('konec-prelude-obraz');
    if (obrPre && typeof _narativNastavObraz === 'function') {
      _narativNastavObraz(obrPre, 'aftermath');
    }

    const novyBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(novyBtn, btn);
    novyBtn.addEventListener('click', () => {
      _zavriModal('modal-konec-prelude');
      zobrazKonecHry(typ, epilogRadky);
    });

    _otevriModal('modal-konec-prelude');
  }

  function zobrazKonecHry(typ, epilogRadky) {
    const overlay = document.getElementById('konec-hry-overlay');
    const typEl = document.getElementById('konec-typ');
    const epilogEl = document.getElementById('konec-epilog');

    const TYPY_NAZVY = {
      odvolani: 'Odvolání',
      korupce:  'Korupce',
      atentát:  'Atentát',
      preziti:  'Přežití',
      hrdina:   'Hrdina',
      smireni:  'Smíření',
      utek:     'Útěk',
      rad:      'Kruh',
      anna:     'Anna'
    };

    if (typEl) typEl.textContent = TYPY_NAZVY[typ] || typ;
    const obrKon = document.getElementById('konec-hry-obraz');
    if (obrKon && typeof _narativNastavObraz === 'function') {
      _narativNastavObraz(obrKon, 'aftermath');
    }

    if (!overlay || !epilogEl) return;

    epilogEl.innerHTML = epilogRadky.map((radek, i) => `
      <div class="epilog-radek ${radek.klic ? 'epilog-radek--novak' : ''}"
           style="animation-delay: ${1.5 + i * 0.3}s">
        ${radek.postava ? '<strong>' + radek.postava + '.</strong> ' : ''}${radek.text}
      </div>
    `).join('');
    if (typeof Knihovna !== 'undefined' && Knihovna.obalSlovnikemVElementu) {
      Knihovna.obalSlovnikemVElementu(epilogEl);
    }

    overlay.classList.remove('skryto');

    const restartBtn = document.getElementById('konec-restart');
    if (restartBtn) {
      const novySouhrn = restartBtn.cloneNode(true);
      restartBtn.parentNode.replaceChild(novySouhrn, restartBtn);
      novySouhrn.addEventListener('click', () => {
        spustKreditniSekvenci(() => zobrazSouhrnKampane());
      });
    }
  }

  const KREDITY_MS = {
    zatmaveni: 1900,
    fadeLogo: 1600,
    drzeniHra: 3000,
    drzeniStudio: 3600,
    mezera: 550
  };

  function _kredityResetVrstvy() {
    const root = document.getElementById('konec-kredity-overlay');
    const hra = document.getElementById('konec-kredity-hra');
    const studio = document.getElementById('konec-kredity-studio');
    if (hra) {
      hra.classList.remove('konec-kredity-logo-slot--viditelny');
      hra.setAttribute('aria-hidden', 'true');
    }
    if (studio) {
      studio.classList.remove('konec-kredity-logo-slot--viditelny');
      studio.setAttribute('aria-hidden', 'true');
    }
    if (root) {
      root.classList.add('skryto');
      root.setAttribute('aria-hidden', 'true');
    }
    const plachta = document.getElementById('desk-priprava-overlay');
    if (plachta) {
      plachta.classList.remove(
        'desk-priprava-overlay--aktivni',
        'desk-priprava-overlay--pomalu',
        'desk-priprava-overlay--rozdeni',
        'desk-priprava-overlay--propustne'
      );
      plachta.setAttribute('aria-hidden', 'true');
    }
  }

  function _kredityNastavLogaFallback() {
    if (typeof Branding !== 'undefined' && Branding.inicializuj) {
      Branding.inicializuj();
    }
  }

  /**
   * Po epilogu: zatmavení → logo hry → zatmavení → logo studia → souhrn (callback).
   * Klik na obrazovku celou sekvenci přeskočí.
   */
  async function spustKreditniSekvenci(onHotovo) {
    const root = document.getElementById('konec-kredity-overlay');
    const hra = document.getElementById('konec-kredity-hra');
    const studio = document.getElementById('konec-kredity-studio');
    const plocha = document.getElementById('konec-kredity-plocha');
    const epilog = document.getElementById('konec-hry-overlay');

    if (!root || !hra) {
      if (typeof onHotovo === 'function') onHotovo();
      return;
    }

    _kredityNastavLogaFallback();

    let preskoceno = false;
    const cekTimery = [];

    const cek = ms => new Promise(resolve => {
      if (preskoceno) {
        resolve();
        return;
      }
      const t = window.setTimeout(() => {
        const idx = cekTimery.indexOf(t);
        if (idx !== -1) cekTimery.splice(idx, 1);
        resolve();
      }, ms);
      cekTimery.push(t);
    });

    const preskoc = () => {
      if (preskoceno) return;
      preskoceno = true;
      while (cekTimery.length) window.clearTimeout(cekTimery.pop());
    };

    const zobrazLogo = async (slot, drzeniMs) => {
      if (!slot || preskoceno) return;
      slot.setAttribute('aria-hidden', 'false');
      await cek(40);
      if (preskoceno) return;
      slot.classList.add('konec-kredity-logo-slot--viditelny');
      await cek(drzeniMs);
      if (preskoceno) return;
      slot.classList.remove('konec-kredity-logo-slot--viditelny');
      await cek(KREDITY_MS.fadeLogo);
      slot.setAttribute('aria-hidden', 'true');
      await cek(KREDITY_MS.mezera);
    };

    const onKlik = () => preskoc();
    plocha?.addEventListener('click', onKlik);
    root.addEventListener('click', onKlik);

    if (epilog) epilog.classList.add('skryto');

    root.classList.remove('skryto');
    root.setAttribute('aria-hidden', 'false');
    hra.classList.remove('konec-kredity-logo-slot--viditelny');
    if (studio) studio.classList.remove('konec-kredity-logo-slot--viditelny');

    if (typeof zobrazZatemneniPripravyStoluPomalu === 'function') {
      await zobrazZatemneniPripravyStoluPomalu();
    } else {
      await cek(KREDITY_MS.zatmaveni);
    }

    if (!preskoceno) await zobrazLogo(hra, KREDITY_MS.drzeniHra);
    if (!preskoceno && studio) await zobrazLogo(studio, KREDITY_MS.drzeniStudio);

    while (cekTimery.length) window.clearTimeout(cekTimery.pop());
    _kredityResetVrstvy();
    plocha?.removeEventListener('click', onKlik);
    root.removeEventListener('click', onKlik);

    if (typeof onHotovo === 'function') onHotovo();
  }

  function _novaHraPoKonce() {
    State.reset();
    location.reload();
  }

  /** Po epilogu — přehled rysů, pověsti, spisů a trendů rozhodování. */
  function zobrazSouhrnKampane(opts) {
    const o = opts && typeof opts === 'object' ? opts : {};
    const devPreview = o.devPreview === true;
    const onZavrit = typeof o.onZavrit === 'function' ? o.onZavrit : null;

    const overlayEpilog = document.getElementById('konec-hry-overlay');
    const overlay = document.getElementById('konec-statistiky-overlay');
    const obsah = document.getElementById('konec-statistiky-obsah');
    const btnNova = document.getElementById('konec-statistiky-nova-hra');
    if (!overlay || !obsah) {
      if (devPreview && onZavrit) onZavrit();
      else _novaHraPoKonce();
      return;
    }

    if (overlayEpilog) overlayEpilog.classList.add('skryto');

    const obrStat = document.getElementById('konec-statistiky-obraz');
    if (obrStat && typeof _narativNastavObraz === 'function') {
      _narativNastavObraz(obrStat, 'epilog');
    }

    if (typeof StatsSummary !== 'undefined' && StatsSummary.sestav && StatsSummary.vykresliDo) {
      StatsSummary.vykresliDo(obsah, StatsSummary.sestav());
    } else {
      obsah.innerHTML = '<p class="konec-stat-prazdne">Souhrn není k dispozici.</p>';
    }

    overlay.classList.remove('skryto');

    if (btnNova) {
      const novy = btnNova.cloneNode(true);
      btnNova.parentNode.replaceChild(novy, btnNova);
      if (devPreview) {
        novy.textContent = 'Zpět do hry';
        novy.addEventListener('click', () => {
          overlay.classList.add('skryto');
          if (onZavrit) onZavrit();
        });
      } else {
        novy.textContent = 'Nová hra';
        novy.addEventListener('click', _novaHraPoKonce);
      }
    }
  }

  // Tlačítko Další den
  function zobrazBtnDalsiDen(show) {
    const btn = document.getElementById('btn-dalsi-den');
    if (!btn) return;
    if (show) {
      btn.classList.add('viditelny');
      if (typeof Tutorial !== 'undefined' && Tutorial.priZobrazeniDalsihoDne) {
        Tutorial.priZobrazeniDalsihoDne();
      }
    } else {
      btn.classList.remove('viditelny');
    }
  }

  /** Tyčové / osobní položky bez řádného spisu — na stole jen titul (obálka, návštěva…), ne fiktivní Sp. zn. */
  function _pripadBezUredniSpisoveZnacky(pripad) {
    if (!pripad) return false;
    const cn = String(pripad.case_number || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '');
    return cn.includes('interni') && cn.includes('bez') && cn.includes('cisla');
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
      slozka.classList.remove('slozka--bez-uredni-spzn');
      return;
    }
    /* Zelené složky (osobní případ) — bez nápisu na desce; hráč poznává obsah až po otevření. */
    const jeOsobniTyp =
      String(pripad.type || '').toLowerCase() === 'osobni' ||
      slozka.classList.contains('slozka--typ-osobni');
    if (jeOsobniTyp) {
      if (spz) spz.textContent = '';
      if (tit) tit.textContent = '';
      if (obz) obz.textContent = '';
      slozka.classList.add('slozka--bez-uredni-spzn');
      return;
    }
    const rawTit = ((pripad.title || '').trim() || 'Bez názvu');

    if (_pripadBezUredniSpisoveZnacky(pripad)) {
      if (spz) spz.textContent = '';
      const titNorm = rawTit
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '');
      /* Na ilustrované složce nechat prázdný horní řádek — „Složka“ jen jako interní název v datech, ne jako štítek. */
      if (tit) tit.textContent = titNorm === 'slozka' ? '' : rawTit.toLocaleUpperCase('cs-CZ');
      const defJm = (pripad.defendant && pripad.defendant.name) ? String(pripad.defendant.name).trim() : '';
      const defOk = defJm && defJm !== '—' && defJm !== '-';
      if (obz) obz.textContent = defOk ? defJm : '';
      slozka.classList.add('slozka--bez-uredni-spzn');
      return;
    }

    slozka.classList.remove('slozka--bez-uredni-spzn');
    if (tit) tit.textContent = rawTit.toLocaleUpperCase('cs-CZ');
    const cisloSpisu = 47 + slotIndex;
    if (spz) spz.textContent = `Sp. zn. ${cisloSpisu}/1931`;
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

      slozka.classList.remove('slozka--tutorial-locked');

      const uzamcenoTutorial =
        typeof Tutorial !== 'undefined' &&
        Tutorial.jeSlozkaOtevrelitelna &&
        !Tutorial.jeSlozkaOtevrelitelna(i);

      if (typeof State !== 'undefined' && State.jePripadUzavren && State.jePripadUzavren(pripad.id)) {
        slozka.classList.add('slozka--vyresena');
        slozka.classList.remove('slozka--aktivni');
        slozka.style.cursor = 'pointer';
        _pridejRazitekImg(folder);
        _slozkaMeta(slotNazvy[i] + ' — ' + nazev + ' (vyřešeno)', nazev + ' — vyřešeno');
      } else if (uzamcenoTutorial) {
        slozka.classList.remove('slozka--vyresena', 'slozka--aktivni');
        slozka.classList.add('slozka--tutorial-locked');
        slozka.style.cursor = 'not-allowed';
        _odstranRazitekImg(folder);
        _slozkaMeta(
          slotNazvy[i] + ' — ' + nazev + ' (po prvním spisu)',
          'Nejdřív uzavřete první spis rozsudkem, nebo přeskočte úvod v nápovědě.'
        );
      } else {
        slozka.classList.remove('slozka--vyresena', 'slozka--tutorial-locked');
        slozka.classList.add('slozka--aktivni');
        slozka.style.cursor = 'pointer';
        _odstranRazitekImg(folder);
        _slozkaMeta(slotNazvy[i] + ' — ' + nazev, nazev);
      }
    }

    const slozkyWr = document.getElementById('slozky-wrapper');
    const deskBezSpisu = document.getElementById('desk-bez-spisu-hlaska');
    let denNum = 1;
    if (typeof State !== 'undefined' && State.get) {
      denNum = Number(State.get('currentDay')) || 1;
    }
    let denDat = null;
    if (typeof DataLoader !== 'undefined' && DataLoader.ziskejDen) {
      denDat = DataLoader.ziskejDen(denNum);
    }
    const explicitneBezSpisu =
      denDat &&
      Object.prototype.hasOwnProperty.call(denDat, 'cases') &&
      Array.isArray(denDat.cases) &&
      denDat.cases.length === 0;

    if (slozkyWr) {
      if (explicitneBezSpisu) {
        slozkyWr.classList.add('skryto');
      } else {
        slozkyWr.classList.remove('skryto');
      }
      let pocetAktivnich = 0;
      for (let j = 0; j < 3; j++) {
        if (pripady && pripady[j]) pocetAktivnich++;
      }
      slozkyWr.classList.remove(
        'slozky-wrapper--tri-sloty',
        'slozky-wrapper--dva-sloty',
        'slozky-wrapper--jedna-slozka'
      );
      if (pocetAktivnich >= 3) {
        slozkyWr.classList.add('slozky-wrapper--tri-sloty');
      } else if (pocetAktivnich === 2) {
        slozkyWr.classList.add('slozky-wrapper--dva-sloty');
      } else if (pocetAktivnich === 1) {
        slozkyWr.classList.add('slozky-wrapper--jedna-slozka');
      } else {
        slozkyWr.classList.add('slozky-wrapper--tri-sloty');
      }
    }

    if (deskBezSpisu) {
      const titEl = deskBezSpisu.querySelector('.desk-bez-spisu-hlaska__titul');
      const txtEl = deskBezSpisu.querySelector('.desk-bez-spisu-hlaska__text');
      if (explicitneBezSpisu) {
        const tit =
          (denDat && String(denDat.desk_bez_spisu_titul || '').trim()) ||
          'Bez nových spisů';
        const txt =
          (denDat && String(denDat.desk_bez_spisu_text || '').trim()) ||
          'Na tento den nejsou naplánovaná jednání ani příděly spisů.';
        if (titEl) titEl.textContent = tit;
        if (txtEl) txtEl.textContent = txt;
        deskBezSpisu.classList.remove('skryto');
      } else {
        deskBezSpisu.classList.add('skryto');
      }
    }
  }

  function zobrazStulBlokaciDoModaluFragmentu() {
    const b = document.getElementById('desk-stul-click-blok');
    if (!b) return;
    b.classList.remove('skryto');
    b.setAttribute('aria-hidden', 'false');
  }

  function skryjStulBlokaciDoModaluFragmentu() {
    const b = document.getElementById('desk-stul-click-blok');
    if (!b) return;
    b.classList.add('skryto');
    b.setAttribute('aria-hidden', 'true');
  }

  /** Zatemnění nad stolem při startu relace — okamžitá plná tma (bez přechodu 0→1). */
  function zobrazZatemneniPripravyStolu() {
    const el = document.getElementById('desk-priprava-overlay');
    if (!el) return;
    el.classList.remove('desk-priprava-overlay--rozdeni', 'desk-priprava-overlay--propustne', 'desk-priprava-overlay--pomalu');
    el.setAttribute('aria-hidden', 'false');
    el.classList.add('desk-priprava-overlay--aktivni');
  }

  /**
   * Pomalé zatmavení před přechodem na další den (stejná plachta jako úvod — stůl pod ní).
   * Promise se vyřeší po dokončení náběhu do plné tmy.
   */
  function zobrazZatemneniPripravyStoluPomalu() {
    const el = document.getElementById('desk-priprava-overlay');
    if (!el) return Promise.resolve();
    el.classList.remove('desk-priprava-overlay--rozdeni', 'desk-priprava-overlay--propustne', 'desk-priprava-overlay--aktivni');
    el.classList.add('desk-priprava-overlay--pomalu');
    el.setAttribute('aria-hidden', 'false');
    return new Promise(resolve => {
      const hotovo = () => {
        el.removeEventListener('transitionend', onEnd);
        if (tid) window.clearTimeout(tid);
        resolve();
      };
      const onEnd = ev => {
        if (ev.target === el && ev.propertyName === 'opacity') hotovo();
      };
      let tid = 0;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.addEventListener('transitionend', onEnd);
          tid = window.setTimeout(hotovo, 2000);
          void el.offsetWidth;
          el.classList.add('desk-priprava-overlay--aktivni');
        });
      });
    });
  }

  /**
   * Rozednění: CSS ~3 s. Promise dřív (~0,6 s) → ranní fragment hned; plachta dojede pod modalem (--propustne).
   * Úklid tříd až na transitionend / fallback.
   */
  function skryjZatemneniPripravyStoluPoNacteni() {
    const el = document.getElementById('desk-priprava-overlay');
    if (!el || !el.classList.contains('desk-priprava-overlay--aktivni')) {
      return Promise.resolve();
    }
    el.classList.remove('desk-priprava-overlay--pomalu');
    return new Promise(resolve => {
      let hraPokracuje = false;
      let plachtaUklizena = false;

      const vyresHru = () => {
        if (hraPokracuje) return;
        hraPokracuje = true;
        el.classList.add('desk-priprava-overlay--propustne');
        resolve();
      };

      const dokonciPlachtu = () => {
        if (plachtaUklizena) return;
        plachtaUklizena = true;
        el.removeEventListener('transitionend', onTe);
        if (tid) window.clearTimeout(tid);
        if (tidRany) window.clearTimeout(tidRany);
        el.classList.remove('desk-priprava-overlay--rozdeni', 'desk-priprava-overlay--propustne', 'desk-priprava-overlay--pomalu');
        el.setAttribute('aria-hidden', 'true');
      };

      const jednou = () => {
        dokonciPlachtu();
        if (!hraPokracuje) vyresHru();
      };

      const onTe = ev => {
        if (ev.target === el && ev.propertyName === 'opacity') jednou();
      };

      let tid = 0;
      let tidRany = 0;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.addEventListener('transitionend', onTe);
          tidRany = window.setTimeout(vyresHru, 600);
          tid = window.setTimeout(jednou, 4000);
          void el.offsetWidth;
          el.classList.add('desk-priprava-overlay--rozdeni');
          void el.offsetWidth;
          el.classList.remove('desk-priprava-overlay--aktivni');
        });
      });
    });
  }

  return {
    otevriModal:      _otevriModal,
    zavriModal:       _zavriModal,
    zavriPripadModal: _zavriPripadModal,
    zavriVsechnyModaly,
    obnovUIDataPoNacteniSlotu,
    zobrazPripad,
    ziskejAktivniPripadVeSpisu() {
      return _wfClueAktivniPripad;
    },
    zobrazPripadReadonly,
    zobrazDusledkyRozsudku,
    vypoctiDusledkyRadky,
    aplikujVecerniNeboNedelniMoznost,
    zobrazVecerniVolbu,
    zobrazNedelniVolbu,
    zobrazReviziPripadu,
    zobrazTydenniShrnuti,
    zobrazFragment,
    zobrazAdventureScenu,
    zobrazArchiv,
    odemkniPovestPodleUdalosti,
    syncPostavyDuvera,
    zobrazStavovouZpravu,
    /** ms — atmosférické hlášky po rozsudku (frakce), kratší než výchozí toast. */
    get stavovaZpravaKratkaTrvaniMs() {
      return STAVOVA_ZPRAVA_TRVANI_KRATKA_MS;
    },
    zobrazPredKoncemAKonecHry,
    zobrazKonecHry,
    spustKreditniSekvenci,
    zobrazSouhrnKampane,
    zobrazBtnDalsiDen,
    aktualizujSlozky,
    zobrazZatemneniPripravyStolu,
    zobrazZatemneniPripravyStoluPomalu,
    skryjZatemneniPripravyStoluPoNacteni,
    zobrazStulBlokaciDoModaluFragmentu,
    skryjStulBlokaciDoModaluFragmentu,
    inicializuj
  };

})();

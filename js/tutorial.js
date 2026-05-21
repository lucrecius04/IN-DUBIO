/**
 * tutorial.js — Úvodní průvodce (den 1 ve spisu + finále den 2, jen nová hra).
 * Data: data/tutorial_d1.json
 */

const Tutorial = (() => {

  const SOUBOR = 'data/tutorial_d1.json';
  let _def = null;
  let _nacitam = null;
  let _aktivniPanel = false;
  let _ioRozsudek = null;

  function _jeDen1() {
    return Number(State.get('currentDay')) === 1;
  }

  function _preskocenoNeboHotovo() {
    return State.get('flags.tutorial_skipped') === true
      || State.get('flags.tutorial_completed') === true;
  }

  /** Běží úvodní osa (den 1, bez přeskočení / dokončení). */
  function jeAktivni() {
    if (typeof State === 'undefined' || !State.get) return false;
    if (!_jeDen1()) return false;
    if (_preskocenoNeboHotovo()) return false;
    return true;
  }

  function _krokyHotove() {
    const arr = State.get('flags.tutorial_steps_done');
    return Array.isArray(arr) ? arr : [];
  }

  function krokHotovy(id) {
    const k = String(id || '').trim();
    if (!k) return false;
    return _krokyHotove().includes(k);
  }

  /** Jednorázový úvod ve spisu (den 1) — včetně starších ID kroků. */
  function _introSpisuHotovy() {
    return krokHotovy('case_intro_spis')
      || krokHotovy('bozena_rozsudek')
      || krokHotovy('horak_kapka_inkoustu');
  }

  function _krokySpisu(def) {
    const cs = def && def.case_steps;
    if (Array.isArray(cs)) return cs;
    return null;
  }

  /** Spis zůstane nahoře — žádné scrollIntoView k rozsudku / svědectví. */
  function _scrollSpisNahoru(mod) {
    if (!mod) return;
    const body = mod.querySelector('#case-wf-body');
    if (body) body.scrollTop = 0;
    const layout = mod.querySelector('.pripad-wireframe-layout');
    if (layout) layout.scrollTop = 0;
  }

  /** Posun scrollu uvnitř #case-wf-body (ne celé okno). */
  function _scrollKUmistuVSpisu(selector) {
    const mod = document.getElementById('modal-pripad');
    if (!mod) return;
    const body = mod.querySelector('#case-wf-body');
    const el = mod.querySelector(selector) || document.querySelector(selector);
    if (!body || !el) return;
    const bodyRect = body.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    body.scrollTop += elRect.top - bodyRect.top - 12;
  }

  /** Po scrollu počkat na layout — výřez u rozsudku musí měřit až po posunu spisu. */
  async function _scrollKUmistuVSpisuPoDokonceni(selector) {
    _scrollKUmistuVSpisu(selector);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    await new Promise(r => setTimeout(r, 60));
  }

  function _verdiktScrollCilSelektor() {
    const mod = document.getElementById('modal-pripad');
    if (!mod) return '#case-wf-sec-verdict';
    const step2w = mod.querySelector('#case-wf-step2-wrap');
    if (step2w && !step2w.classList.contains('skryto')) return '#case-wf-step2-wrap';
    return '#case-wf-sec-verdict';
  }

  let _verdictSpotlightScrollCleanup = null;

  function _odstranVerdictSpotlightScroll() {
    if (_verdictSpotlightScrollCleanup) {
      _verdictSpotlightScrollCleanup();
      _verdictSpotlightScrollCleanup = null;
    }
  }

  function _aktualizujSpotlightVerdikt(layer) {
    if (!layer) return;
    const r = _rectSpotlightVerdikt();
    if (!r || r.width < 4 || r.height < 4) return;
    layer
      .querySelectorAll('.tutorial-case-dim-part, .tutorial-case-spotlight-frame, .tutorial-case-spotlight')
      .forEach(n => n.remove());
    _pridejZatemniVeSpisuRect(layer, r);
  }

  function _napojScrollVerdiktSpotlight(layer) {
    _odstranVerdictSpotlightScroll();
    const mod = document.getElementById('modal-pripad');
    if (!mod || !layer) return;
    const fn = () => _aktualizujSpotlightVerdikt(layer);
    const body = mod.querySelector('#case-wf-body');
    const layout = mod.querySelector('.pripad-wireframe-layout');
    body?.addEventListener('scroll', fn, { passive: true });
    layout?.addEventListener('scroll', fn, { passive: true });
    window.addEventListener('resize', fn, { passive: true });
    _verdictSpotlightScrollCleanup = () => {
      body?.removeEventListener('scroll', fn);
      layout?.removeEventListener('scroll', fn);
      window.removeEventListener('resize', fn);
    };
  }

  function _guidedMomentyProPripad(def, caseId) {
    const map = def && def.guided_moments;
    if (!map || typeof map !== 'object') return [];
    const list = map[caseId];
    return Array.isArray(list) ? list : [];
  }

  function oznacKrok(id) {
    const k = String(id || '').trim();
    if (!k) return;
    const cur = _krokyHotove();
    if (cur.includes(k)) return;
    State.set('flags.tutorial_steps_done', cur.concat([k]));
    if (typeof State.uloz === 'function') State.uloz();
  }

  function preskocitVse() {
    State.set('flags.tutorial_skipped', true);
    State.set('flags.tutorial_completed', true);
    zastavSledovaniRozsudku();
    _skryjOverlay();
    _odstranVrstvuVeSpisu();
    if (typeof State.uloz === 'function') State.uloz();
    obnovZamkySlozek();
  }

  function _prvniPripadIdDne() {
    if (typeof Cases !== 'undefined' && typeof Cases.getPripady === 'function') {
      const arr = Cases.getPripady();
      if (arr && arr[0] && arr[0].id) return String(arr[0].id).trim();
    }
    return 'pool_a1_bozena_slepice';
  }

  /** Panely ve spisu jen u první složky dne (ne u druhého spisu). */
  function _jePrvniSpisId(caseId) {
    const id = String(caseId || '').trim();
    return !!id && id === _prvniPripadIdDne();
  }

  function _prvniPripadVyresen() {
    const id = _prvniPripadIdDne();
    const resolved = State.get('casesResolvedToday');
    return Array.isArray(resolved) && resolved.includes(id);
  }

  /** Den 1 — druhá (a třetí) složka uzamčena, dokud není hotový první spis nebo přeskočení. */
  function jeDruhaSlozkaUzamcena() {
    if (!jeAktivni()) return false;
    return !_prvniPripadVyresen();
  }

  function jeSlozkaOtevrelitelna(index) {
    const i = Number(index);
    if (!Number.isFinite(i) || i < 0) return true;
    if (!jeAktivni()) return true;
    if (i === 0) return true;
    return !jeDruhaSlozkaUzamcena();
  }

  function jePripadOtevrelitelny(pripad) {
    if (!pripad || !jeAktivni()) return true;
    if (typeof Cases === 'undefined' || typeof Cases.getPripady !== 'function') return true;
    const arr = Cases.getPripady();
    const idx = arr.findIndex(p => p && String(p.id) === String(pripad.id));
    if (idx < 0) return true;
    return jeSlozkaOtevrelitelna(idx);
  }

  function obnovZamkySlozek() {
    if (typeof Cases === 'undefined' || typeof UI === 'undefined') return;
    if (typeof Cases.getPripady !== 'function' || typeof UI.aktualizujSlozky !== 'function') return;
    UI.aktualizujSlozky(Cases.getPripady(), State.get('casesResolvedToday'));
  }

  function dokoncitOsu() {
    State.set('flags.tutorial_completed', true);
    _skryjOverlay();
    if (typeof State.uloz === 'function') State.uloz();
  }

  async function nactiDef() {
    if (_def) return _def;
    if (_nacitam) return _nacitam;
    _nacitam = fetch(SOUBOR)
      .then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(j => {
        _def = j && typeof j === 'object' ? j : {};
        if (_def && !_def.verdict_on_click && Array.isArray(_def.case_steps)) {
          console.warn('[Tutorial] tutorial_d1.json bez verdict_on_click — obnovte stránku (Ctrl+F5).');
        }
        return _def;
      })
      .catch(e => {
        console.warn('[Tutorial] Nelze načíst', SOUBOR, e.message);
        _def = {};
        return _def;
      })
      .finally(() => { _nacitam = null; });
    return _nacitam;
  }

  function _overlayEl() {
    return document.getElementById('tutorial-overlay');
  }

  function _skryjOverlay() {
    _aktivniPanel = false;
    zastavSledovaniRozsudku();
    const root = _overlayEl();
    if (!root) return;
    root.classList.remove('tutorial-overlay--aktivni');
    root.innerHTML = '';
    root.classList.add('skryto');
    root.setAttribute('aria-hidden', 'true');
    _odstranVrstvuVeSpisu();
  }

  function _odstranZvyrazneniCile() {
    document.querySelectorAll('.tutorial-zvyrazneni-cil').forEach(el => {
      el.classList.remove('tutorial-zvyrazneni-cil');
    });
  }

  /** Panel nápovědy uvnitř #modal-pripad — ztmavení a blokace spisu. */
  function _odstranVrstvuVeSpisu() {
    _odstranVerdictSpotlightScroll();
    _odstranZvyrazneniCile();
    document.getElementById('tutorial-case-layer')?.remove();
    document.getElementById('modal-pripad')?.classList.remove('tutorial-case-locked');
  }

  function zastavSledovaniRozsudku() {
    if (_ioRozsudek) {
      _ioRozsudek.disconnect();
      _ioRozsudek = null;
    }
  }

  /** Text z Knihovny → Pravidla (stejné bloky jako v zápisníku). */
  function _teloknihovnyKroku(step) {
    if (!step) return '';
    const lead = String(step.body_lead || '').trim();
    const titles = [];
    if (step.knihovna_blok) titles.push(String(step.knihovna_blok).trim());
    if (Array.isArray(step.knihovna_bloky)) {
      for (const t of step.knihovna_bloky) {
        const k = String(t || '').trim();
        if (k) titles.push(k);
      }
    }
    if (typeof Knihovna !== 'undefined' && Knihovna.getData && titles.length) {
      const bloky = Knihovna.getData()?.pravidla?.bloky || [];
      const parts = titles.map(tit => {
        const b = bloky.find(x => x && x.title === tit);
        return b && b.body ? b.body : '';
      }).filter(Boolean);
      if (parts.length) {
        const core = parts.join('\n\n');
        return lead ? lead + '\n\n' + core : core;
      }
    }
    const fallback = String(step.body || '').trim();
    return lead ? (fallback ? lead + '\n\n' + fallback : lead) : fallback;
  }

  function _krokProZobrazeni(step) {
    if (!step) return step;
    const body = _teloknihovnyKroku(step);
    return body ? Object.assign({}, step, { body }) : step;
  }

  function _pridejZatemniVeSpisuRect(layer, rect, pad) {
    if (!rect || rect.width < 4 || rect.height < 4) {
      const backdrop = document.createElement('div');
      backdrop.className = 'tutorial-case-backdrop';
      layer.appendChild(backdrop);
      return;
    }
    const p = pad != null ? pad : 10;
    const top = Math.round(rect.top - p);
    const left = Math.round(rect.left - p);
    const width = Math.round(rect.width + p * 2);
    const height = Math.round(rect.height + p * 2);
    const right = left + width;
    const bottom = top + height;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const dim = (cls, t, l, w, h) => {
      const ww = Math.max(0, Math.round(w));
      const hh = Math.max(0, Math.round(h));
      if (ww < 1 || hh < 1) return;
      const d = document.createElement('div');
      d.className = 'tutorial-case-dim-part ' + cls;
      d.style.top = Math.round(t) + 'px';
      d.style.left = Math.round(l) + 'px';
      d.style.width = ww + 'px';
      d.style.height = hh + 'px';
      layer.appendChild(d);
    };

    dim('tutorial-case-dim-top', 0, 0, vw, top);
    dim('tutorial-case-dim-left', top, 0, left, height);
    dim('tutorial-case-dim-right', top, right, vw - right, height);
    dim('tutorial-case-dim-bottom', bottom, 0, vw, Math.max(0, vh - bottom));

    const frame = document.createElement('div');
    frame.className = 'tutorial-case-spotlight-frame';
    frame.style.top = top + 'px';
    frame.style.left = left + 'px';
    frame.style.width = width + 'px';
    frame.style.height = height + 'px';
    layer.appendChild(frame);
  }

  function _pridejZatemniVeSpisu(layer, cil) {
    if (cil) {
      _pridejZatemniVeSpisuRect(layer, cil.getBoundingClientRect());
      return;
    }
    const backdrop = document.createElement('div');
    backdrop.className = 'tutorial-case-backdrop';
    layer.appendChild(backdrop);
  }

  /** Výřez rozsudku — celý blok VERDIKT (od štítku), ne jedna volba. */
  function _rectSpotlightVerdikt() {
    const mod = document.getElementById('modal-pripad');
    if (!mod) return null;

    const step2w = mod.querySelector('#case-wf-step2-wrap');
    if (step2w && _jeViditelnyElement(step2w)) {
      const rw = step2w.getBoundingClientRect();
      const lbl = mod.querySelector('#case-wf-step2-label');
      const rLabel = lbl && _jeViditelnyElement(lbl) ? lbl.getBoundingClientRect() : rw;
      return {
        top: rLabel.top,
        left: rw.left,
        width: rw.width,
        height: Math.max(rw.bottom - rLabel.top, rw.height)
      };
    }

    const step1w = mod.querySelector('#case-wf-step1-wrap');
    if (step1w && _jeViditelnyElement(step1w)) {
      return step1w.getBoundingClientRect();
    }

    const sec = mod.querySelector('#case-wf-sec-verdict');
    if (sec && _jeViditelnyElement(sec)) {
      return sec.getBoundingClientRect();
    }
    return null;
  }

  async function _cekejSpotlightVerdikt(maxPokusu) {
    const n = Number(maxPokusu) > 0 ? Number(maxPokusu) : 40;
    for (let i = 0; i < n; i++) {
      const r = _rectSpotlightVerdikt();
      if (r && r.width >= 4 && r.height >= 4) return;
      await new Promise(res => setTimeout(res, 80));
    }
  }

  function _najdiPrvniSpotlightElement(selectors) {
    const list = Array.isArray(selectors) ? selectors : [selectors];
    for (const sel of list) {
      const el = _najdiElementProSpotlight(sel);
      if (el) return el;
    }
    return null;
  }

  async function _cekejSpotlightElement(selectors, maxPokusu) {
    const n = Number(maxPokusu) > 0 ? Number(maxPokusu) : 30;
    for (let i = 0; i < n; i++) {
      if (_najdiPrvniSpotlightElement(selectors)) return;
      await new Promise(res => setTimeout(res, 80));
    }
  }

  function _vytvorTutorialPanelDom(step, veSpisu) {
    const panelWrap = document.createElement('div');
    panelWrap.className = 'tutorial-panel-wrap' + (veSpisu ? ' tutorial-panel-wrap--ve-spisu' : '');

    const panel = document.createElement('div');
    panel.className = 'panel-papir tutorial-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'tutorial-panel-title');

    const inner = document.createElement('div');
    inner.className = 'tutorial-panel-inner';

    const zahlavi = document.createElement('div');
    zahlavi.className = 'tutorial-panel-zahlavi';

    const znak = document.createElement('div');
    znak.className = 'tutorial-panel-znak';
    znak.setAttribute('aria-hidden', 'true');
    znak.textContent = '⚖';

    const zahlaviText = document.createElement('div');
    zahlaviText.className = 'tutorial-panel-zahlavi-text';

    const kicker = document.createElement('div');
    kicker.className = 'tutorial-panel-kicker';
    if (step.id === 'desk_notebook') {
      kicker.textContent = 'Zápisník na stole';
    } else if (step.id === 'evening_d1') {
      kicker.textContent = 'Konec dne';
    } else if (step.id === 'next_day_d1') {
      kicker.textContent = 'Konec pracovního dne';
    } else if (step.id === 'day2_knihovna_pravidla') {
      kicker.textContent = 'Zápisník — Knihovna';
    } else if (step.id === 'case_patrani_lupa') {
      kicker.textContent = 'Pátrání ve spisu';
    } else if (step.id === 'case_pruzum_inkoust') {
      kicker.textContent = 'Průzkum';
    } else if (step.id === 'case_rozsudek_nav') {
      kicker.textContent = 'Rozsudek';
    } else if (veSpisu) {
      kicker.textContent = 'Nápověda ve spisu';
    } else {
      kicker.textContent = 'Úvod k prvnímu dni';
    }

    const tit = document.createElement('h2');
    tit.className = 'tutorial-panel-title';
    tit.id = 'tutorial-panel-title';
    tit.textContent = String(step.title || 'Nápověda').trim();

    zahlaviText.appendChild(kicker);
    zahlaviText.appendChild(tit);
    zahlavi.appendChild(znak);
    zahlavi.appendChild(zahlaviText);
    inner.appendChild(zahlavi);

    const body = document.createElement('p');
    const bodyTxt = String(step.body || '').trim();
    body.className = 'tutorial-panel-body' + (bodyTxt.indexOf('•') !== -1 ? ' tutorial-panel-body--odrazky' : '');
    body.textContent = bodyTxt;
    inner.appendChild(body);

    const actions = document.createElement('div');
    actions.className = 'tutorial-panel-actions';

    const skipBtn = document.createElement('button');
    skipBtn.type = 'button';
    skipBtn.className = 'tutorial-btn-skip';
    skipBtn.textContent = 'Přeskočit úvod';

    const contBtn = document.createElement('button');
    contBtn.type = 'button';
    contBtn.className = 'btn tutorial-btn-continue';
    contBtn.textContent = 'Pokračovat';

    actions.appendChild(skipBtn);
    actions.appendChild(contBtn);
    inner.appendChild(actions);
    panel.appendChild(inner);
    panelWrap.appendChild(panel);

    return { panelWrap, contBtn, skipBtn };
  }

  function _jeViditelnyElement(el) {
    if (!el || !el.getBoundingClientRect) return false;
    if (el.classList && el.classList.contains('skryto')) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return false;
    try {
      const st = window.getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden') return false;
      if (Number(st.opacity) < 0.05) return false;
    } catch (_) { /* ignore */ }
    return true;
  }

  function _najdiElementProSpotlight(sel) {
    const s = String(sel || '').trim();
    if (!s) return null;

    if (s.includes('.clue')) {
      const scope = document.querySelector('#modal-pripad') || document;
      const list = scope.querySelectorAll(s);
      for (const el of list) {
        if (_jeViditelnyElement(el)) return el;
      }
      return null;
    }

    let el = document.querySelector(s);
    if (!el) return null;
    if (el.matches && el.matches('.slozka')) {
      const folder = el.querySelector('.folder');
      if (folder) el = folder;
    }
    return _jeViditelnyElement(el) ? el : null;
  }

  function _boxZRameru(r, pad) {
    const p = pad != null ? pad : 12;
    return {
      top: r.top - p,
      left: r.left - p,
      width: r.width + p * 2,
      height: r.height + p * 2
    };
  }

  function _rectSpisPanel() {
    const panel = document.querySelector('#modal-pripad .pripad-panel--wireframe');
    if (!panel) return null;
    return _boxZRameru(panel.getBoundingClientRect(), 6);
  }

  function _verdictTutorialUzHotovo() {
    return krokHotovy('case_rozsudek_nav');
  }

  function _sberSpotlightRect(selectors) {
    const list = Array.isArray(selectors) ? selectors : [selectors];
    for (const sel of list) {
      if (!sel) continue;
      const el = _najdiElementProSpotlight(sel);
      if (!el) continue;
      return _boxZRameru(el.getBoundingClientRect());
    }
    return null;
  }

  async function _cekejSpotlightRect(selectors, maxPokusu) {
    const n = Number(maxPokusu) > 0 ? Number(maxPokusu) : 25;
    for (let i = 0; i < n; i++) {
      const r = _sberSpotlightRect(selectors);
      if (r) return r;
      await new Promise(res => setTimeout(res, 80));
    }
    return _sberSpotlightRect(selectors);
  }

  function _umistiPanel(panelWrap, rect, placement, step, alignRect) {
    const margin = 16;
    const arrowGap = 10;
    const arrowVyska = 12;
    const gapExtra = Number(step && step.panel_gap) || 0;
    const ph = panelWrap.offsetHeight || 220;
    const pw = panelWrap.offsetWidth || 360;
    let top = margin + 40;
    let left = Math.max(margin, (window.innerWidth - pw) / 2);

    panelWrap.classList.remove(
      'tutorial-panel-wrap--above-spotlight',
      'tutorial-panel-wrap--left-spotlight',
      'tutorial-panel-wrap--force-bottom'
    );

    const chceVlevoSpisu = placement === 'left_of_spis';
    const chceVlevo = placement === 'left';
    const chceNad = placement === 'above' || placement === 'top';
    const chceHore = placement === 'top';

    if (!rect && chceHore) {
      top = margin + 48;
      left = Math.max(margin, (window.innerWidth - pw) / 2);
    } else if (rect && chceVlevoSpisu) {
      const align = alignRect && alignRect.width > 4 ? alignRect : rect;
      top = align.top + align.height / 2 - ph / 2;
      left = rect.left - pw - margin - arrowGap - gapExtra;
      panelWrap.classList.add('tutorial-panel-wrap--left-spotlight');
      if (left < margin) {
        left = margin;
        top = Math.max(margin + 32, rect.top + 28);
      }
    } else if (rect && chceVlevo) {
      top = rect.top + rect.height / 2 - ph / 2;
      left = rect.left - pw - margin - arrowGap - gapExtra;
      panelWrap.classList.add('tutorial-panel-wrap--left-spotlight');
      if (left < margin) {
        left = rect.left + rect.width + margin + arrowGap;
        panelWrap.classList.remove('tutorial-panel-wrap--left-spotlight');
        panelWrap.classList.add('tutorial-panel-wrap--above-spotlight');
        top = rect.top - ph - margin - arrowGap - arrowVyska - gapExtra;
        left = rect.left + rect.width / 2 - pw / 2;
        if (top < margin + 28) top = margin + 28;
      }
    } else if (rect && chceNad) {
      top = rect.top - ph - margin - arrowGap - arrowVyska - gapExtra;
      left = rect.left + rect.width / 2 - pw / 2;
      panelWrap.classList.add('tutorial-panel-wrap--above-spotlight');
      if (step && step.id === 'desk_notebook') {
        panelWrap.classList.add('tutorial-panel-wrap--nad-zapisnikem');
      }
      if (top < margin + 28) {
        top = margin + 28;
      }
    } else if (rect) {
      const nad = rect.top - ph - margin - arrowGap;
      const pod = rect.top + rect.height + margin;
      if (nad >= margin + 36) {
        top = nad;
        panelWrap.classList.add('tutorial-panel-wrap--above-spotlight');
      } else if (pod + ph < window.innerHeight - margin) {
        top = pod;
      } else {
        top = Math.max(margin, (window.innerHeight - ph) / 2);
      }
      left = rect.left + rect.width / 2 - pw / 2;
    } else {
      top = Math.max(margin + 40, (window.innerHeight - ph) / 2 - 40);
    }

    top = Math.max(margin, Math.min(top, window.innerHeight - ph - margin));
    left = Math.min(Math.max(margin, left), window.innerWidth - pw - margin);

    if (window.innerWidth <= 640 && top + ph > window.innerHeight - margin) {
      panelWrap.classList.add('tutorial-panel-wrap--force-bottom');
      top = Math.max(margin, window.innerHeight - ph - margin);
      left = Math.max(margin, (window.innerWidth - pw) / 2);
      panelWrap.classList.remove('tutorial-panel-wrap--above-spotlight');
    }

    panelWrap.style.top = Math.round(top) + 'px';
    panelWrap.style.left = Math.round(left) + 'px';
  }

  /**
   * Blokující krok s volitelným spotlightem.
   * @returns {Promise<'continue'|'skip'>}
   */
  async function _zobrazKrokPanel(step, opts) {
    const veSpisu = false;
    let rect = null;
    if (step && step.spotlight) {
      rect = await _cekejSpotlightRect(step.spotlight, 8);
    }

    return new Promise(resolve => {
      const root = _overlayEl();
      if (!root) {
        resolve('continue');
        return;
      }

      _aktivniPanel = true;
      root.innerHTML = '';
      root.classList.remove('skryto', 'tutorial-overlay--ve-spisu', 'tutorial-overlay--nad-modalem');
      root.setAttribute('aria-hidden', 'false');
      root.classList.add('tutorial-overlay--aktivni');
      if (veSpisu) root.classList.add('tutorial-overlay--ve-spisu');
      if (step.overlay_nad_modalem) root.classList.add('tutorial-overlay--nad-modalem');

      let spotEl = null;

      /* Plné ztmavení jen u prvního okna na stole (bez výřezu). Ve spisu bez cíle = panel bez backdropu. */
      if (!rect) {
        if (!veSpisu) {
          const dimKlic = String(step.dim_backdrop || 'strong').trim();
          const backdrop = document.createElement('div');
          backdrop.className = 'tutorial-backdrop tutorial-backdrop--' + dimKlic;
          root.appendChild(backdrop);
        }
      } else {
        spotEl = document.createElement('div');
        spotEl.className = 'tutorial-spotlight';
        spotEl.style.top = Math.round(rect.top) + 'px';
        spotEl.style.left = Math.round(rect.left) + 'px';
        spotEl.style.width = Math.round(rect.width) + 'px';
        spotEl.style.height = Math.round(rect.height) + 'px';
        root.appendChild(spotEl);
      }

      const placement = String(step.panel_placement || 'above').trim();

      const { panelWrap, contBtn, skipBtn } = _vytvorTutorialPanelDom(step, veSpisu);
      skipBtn.addEventListener('click', () => {
        preskocitVse();
        resolve('skip');
      });
      contBtn.addEventListener('click', () => {
        _skryjOverlay();
        resolve('continue');
      });
      root.appendChild(panelWrap);

      const umisti = () => _umistiPanel(panelWrap, rect, placement, step);

      requestAnimationFrame(() => {
        umisti();
        requestAnimationFrame(() => {
          umisti();
          contBtn.focus();
        });
      });

      const onResize = () => {
        const r2 = step.spotlight ? _sberSpotlightRect(step.spotlight) : null;
        if (r2) rect = r2;
        if (spotEl && r2) {
          spotEl.style.top = Math.round(r2.top) + 'px';
          spotEl.style.left = Math.round(r2.left) + 'px';
          spotEl.style.width = Math.round(r2.width) + 'px';
          spotEl.style.height = Math.round(r2.height) + 'px';
        }
        umisti();
      };
      window.addEventListener('resize', onResize);
      const done = () => window.removeEventListener('resize', onResize);
      contBtn.addEventListener('click', done, { once: true });
      skipBtn.addEventListener('click', done, { once: true });
    });
  }

  /**
   * Nápověda v modálu spisu — ztmavení + blokace kliků do spisu do Pokračovat.
   * @returns {Promise<'continue'|'skip'>}
   */
  async function _zobrazKrokVeSpisu(step) {
    const mod = document.getElementById('modal-pripad');
    if (!mod || !mod.classList.contains('aktivni')) return 'continue';

    const krok = _krokProZobrazeni(step);
    const bezVyrezu = !!(krok && krok.no_spotlight);

    const jeVerdiktNav = krok && krok.id === 'case_rozsudek_nav';
    if (!bezVyrezu && jeVerdiktNav) {
      await _cekejSpotlightVerdikt(50);
      await _scrollKUmistuVSpisuPoDokonceni(_verdiktScrollCilSelektor());
    } else if (!bezVyrezu && krok && krok.spotlight) {
      await _cekejSpotlightElement(krok.spotlight, 50);
    }

    return new Promise(resolve => {
      _odstranVrstvuVeSpisu();
      _aktivniPanel = true;
      mod.classList.add('tutorial-case-locked');

      if (jeVerdiktNav) {
        /* Scroll proběhl před zobrazením vrstvy — výřez měří správnou pozici. */
      } else if (krok.scroll_in_body) {
        _scrollKUmistuVSpisu(krok.scroll_in_body);
      } else if (bezVyrezu) {
        _scrollSpisNahoru(mod);
      }

      const verdictRect = !bezVyrezu && jeVerdiktNav ? _rectSpotlightVerdikt() : null;
      const cil = !bezVyrezu && !verdictRect && krok.spotlight
        ? _najdiPrvniSpotlightElement(krok.spotlight)
        : null;

      const layer = document.createElement('div');
      layer.id = 'tutorial-case-layer';
      layer.className = 'tutorial-case-layer' + (cil || verdictRect ? ' tutorial-case-layer--positioned' : '');
      if (verdictRect) {
        _pridejZatemniVeSpisuRect(layer, verdictRect);
        _napojScrollVerdiktSpotlight(layer);
      } else {
        _pridejZatemniVeSpisu(layer, cil);
      }

      const { panelWrap, contBtn, skipBtn } = _vytvorTutorialPanelDom(krok, true);

      const zavri = (vysledek) => {
        _odstranVrstvuVeSpisu();
        _aktivniPanel = false;
        resolve(vysledek);
      };

      skipBtn.addEventListener('click', () => {
        preskocitVse();
        zavri('skip');
      });
      contBtn.addEventListener('click', () => zavri('continue'));

      layer.appendChild(panelWrap);
      mod.appendChild(layer);

      const umisti = () => {
        if (jeVerdiktNav) _aktualizujSpotlightVerdikt(layer);
        const place = String(krok.panel_placement || 'above').trim();
        const spotRect = jeVerdiktNav
          ? _rectSpotlightVerdikt()
          : (krok.spotlight ? _sberSpotlightRect(krok.spotlight) : null);
        if (place === 'left_of_spis') {
          const spisR = _rectSpisPanel();
          if (spisR) {
            _umistiPanel(panelWrap, spisR, 'left_of_spis', krok, spotRect || spisR);
            return;
          }
        }
        if (!spotRect && !cil) return;
        if (spotRect) _umistiPanel(panelWrap, spotRect, place, krok);
      };

      const onResize = () => umisti();
      if (!jeVerdiktNav) window.addEventListener('resize', onResize);

      requestAnimationFrame(() => {
        umisti();
        requestAnimationFrame(() => {
          umisti();
          contBtn.focus();
        });
      });

      contBtn.addEventListener('click', () => window.removeEventListener('resize', onResize), { once: true });
      skipBtn.addEventListener('click', () => window.removeEventListener('resize', onResize), { once: true });
    });
  }

  /** Po přípravě stolu v den 1 — dva úvodní panely. */
  async function poPripraveStolu() {
    if (!jeAktivni()) return;
    if (_aktivniPanel) return;
    const modaly = document.querySelectorAll('.overlay.aktivni');
    if (modaly.length > 0) return;

    const def = await nactiDef();
    const steps = Array.isArray(def.desk_steps) ? def.desk_steps : [];
    for (const step of steps) {
      if (!step || !step.id) continue;
      if (krokHotovy(step.id)) continue;
      if (!jeAktivni()) return;
      const vysledek = await _zobrazKrokPanel(step);
      if (vysledek === 'skip') return;
      oznacKrok(step.id);
    }
    oznacKrok('desk_hotovo');
    obnovZamkySlozek();
  }

  /**
   * Text pro #case-wf-nav-hint — null = použít výchozí UI.
   */
  function navHintProPripad(pripad, ctx) {
    if (!jeAktivni() || !_def || !pripad) return null;
    const hints = _def.case_hints && _def.case_hints[pripad.id];
    if (!hints || typeof hints !== 'object') return null;

    const phase = ctx && ctx.phase ? String(ctx.phase) : 'open';
    if (phase === 'verdict_step1' && hints.verdict_step1) return hints.verdict_step1;
    if (phase === 'verdict_step2' && hints.verdict_step2) return hints.verdict_step2;
    if (phase === 'verdict' && hints.verdict) return hints.verdict;
    if (phase === 'after_first_clue' && hints.after_first_clue) return hints.after_first_clue;

    if (phase === 'open') {
      const maSkryte = !!(ctx && ctx.maSkryte);
      const zbyva = Number(ctx && ctx.zbyvaAkci) || 0;
      if (maSkryte && zbyva <= 0 && hints.open_no_actions) return hints.open_no_actions;
      if (hints.open) return hints.open;
    }
    return null;
  }

  async function _spustJedenGuidedVeSpisu(step) {
    if (!step || !step.id || _aktivniPanel) return;
    const mod = document.getElementById('modal-pripad');
    if (!mod || !mod.classList.contains('aktivni')) return;

    if (step.scroll_in_body) {
      _scrollKUmistuVSpisu(step.scroll_in_body);
      await new Promise(r => setTimeout(r, 150));
    } else {
      _scrollSpisNahoru(mod);
    }

    const vysledek = await _zobrazKrokVeSpisu(_krokProZobrazeni(step));
    if (vysledek === 'skip') return;
    oznacKrok(step.id);
  }

  async function _spustGuidedMomentsProPripadu(pripad) {
    if (!pripad || !_jePrvniSpisId(pripad.id) || !_introSpisuHotovy()) return;
    const def = await nactiDef();
    const cid = String(pripad.id || '').trim();
    const list = _guidedMomentyProPripad(def, cid);
    for (const step of list) {
      if (!step || String(step.trigger || '') !== 'on_open') continue;
      if (!jeAktivni()) return;
      if (krokHotovy(step.id)) continue;
      if (step.requires_clue) {
        await _cekejSpotlightElement(
          step.spotlight || '#modal-pripad #pripad-svedectvi .clue',
          30
        );
        if (!_najdiPrvniSpotlightElement(
          step.spotlight || '#modal-pripad #pripad-svedectvi .clue'
        )) {
          continue;
        }
      }
      if (!document.getElementById('modal-pripad')?.classList.contains('aktivni')) return;
      await _spustJedenGuidedVeSpisu(step);
    }
  }

  async function _spustKrokyVeSpisu(steps, pripad) {
    if (!Array.isArray(steps) || !steps.length) return;
    const mod = document.getElementById('modal-pripad');
    if (!mod || !mod.classList.contains('aktivni')) return;

    _scrollSpisNahoru(mod);

    for (const step of steps) {
      if (!step || !step.id) continue;
      if (!jeAktivni()) return;
      if (krokHotovy(step.id)) continue;
      if (!document.getElementById('modal-pripad')?.classList.contains('aktivni')) return;

      _scrollSpisNahoru(mod);

      const vysledek = await _zobrazKrokVeSpisu(_krokProZobrazeni(step));
      if (vysledek === 'skip') return;
      oznacKrok(step.id);
    }
  }

  function _frontaGuided(fn) {
    if (_aktivniPanel) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { void fn(); });
    });
  }

  async function priOtevreniPripadu(pripad) {
    if (!jeAktivni() || !pripad) return;
    if (!jePripadOtevrelitelny(pripad)) return;
    const def = await nactiDef();
    const steps = _krokySpisu(def);

    const spust = async () => {
      if (!jeAktivni()) return;
      const mod = document.getElementById('modal-pripad');
      if (!mod || !mod.classList.contains('aktivni')) return;

      if (
        _jePrvniSpisId(pripad.id) &&
        !_introSpisuHotovy() &&
        Array.isArray(steps) &&
        steps.length
      ) {
        _scrollSpisNahoru(mod);
        await _spustKrokyVeSpisu(steps, pripad);
      }

      if (!jeAktivni()) return;
      if (_jePrvniSpisId(pripad.id)) {
        await _spustGuidedMomentsProPripadu(pripad);
      }
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(() => { void spust(); });
    });
  }

  let _verdictTutorialBezi = false;
  let _rozsudekClickNapojeno = false;

  /** Po úvodních krocích ve spisu lze spustit nápovědu k rozsudku (jen první spis). */
  function _mohuVerdictTutorial(pripad) {
    if (_verdictTutorialUzHotovo()) return false;
    if (pripad && !_jePrvniSpisId(pripad.id)) return false;
    return (
      krokHotovy('case_pruzum_inkoust') ||
      krokHotovy('case_patrani_lupa') ||
      krokHotovy('case_intro_spis') ||
      _introSpisuHotovy()
    );
  }

  /** UI: neposouvat spis před tutorialovým výřezem rozsudku. */
  function cekaVerdictTutorial() {
    if (!jeAktivni() || !_mohuVerdictTutorial()) return false;
    const p = _aktivniPripadZeSpisu();
    if (p && !_jePrvniSpisId(p.id)) return false;
    return true;
  }

  function _aktivniPripadZeSpisu() {
    if (typeof UI !== 'undefined' && typeof UI.ziskejAktivniPripadVeSpisu === 'function') {
      return UI.ziskejAktivniPripadVeSpisu();
    }
    return null;
  }

  function _napojKlikRozsudekTutorial() {
    if (_rozsudekClickNapojeno) return;
    _rozsudekClickNapojeno = true;
    document.addEventListener('click', e => {
      if (!jeAktivni()) return;
      const mod = document.getElementById('modal-pripad');
      if (!mod || !mod.classList.contains('aktivni')) return;
      if (!e.target.closest('#case-wf-sec-verdict')) return;
      const pripad = _aktivniPripadZeSpisu();
      if (!pripad || !_mohuVerdictTutorial(pripad)) return;
      priKlikNaRozsudek(pripad);
    }, true);
  }

  /** Klepnutí kamkoli v sekci Rozsudek — šestý krok úvodu (jen den 1). */
  function priKlikNaRozsudek(pripad) {
    if (!jeAktivni() || !pripad || !_mohuVerdictTutorial(pripad) || _verdictTutorialBezi) return;
    _verdictTutorialBezi = true;
    void _spustVerdictTutorial(pripad);
  }

  async function _spustVerdictTutorial(pripad) {
    if (!jeAktivni() || !pripad || !_mohuVerdictTutorial(pripad)) {
      _verdictTutorialBezi = false;
      return;
    }
    const mod = document.getElementById('modal-pripad');
    if (!mod || !mod.classList.contains('aktivni')) {
      _verdictTutorialBezi = false;
      return;
    }

    let cek = 0;
    while (_aktivniPanel && cek < 80) {
      await new Promise(r => setTimeout(r, 50));
      cek++;
    }
    if (_aktivniPanel || _verdictTutorialUzHotovo()) {
      _verdictTutorialBezi = false;
      return;
    }

    try {
      let def = await nactiDef();
      let raw = def && def.verdict_on_click;
      if (!raw || !raw.id) {
        _def = null;
        def = await nactiDef();
        raw = def && def.verdict_on_click;
      }
      if (!raw || !raw.id || _verdictTutorialUzHotovo()) return;

      document.getElementById('case-wf-sec-verdict')?.classList.remove('skryto');

      const v = await _zobrazKrokVeSpisu(_krokProZobrazeni(raw));
      if (v !== 'skip') oznacKrok(raw.id);
    } finally {
      _verdictTutorialBezi = false;
    }
  }

  async function priVecerniVolbe() {
    if (!jeAktivni()) return;
    if (!document.getElementById('modal-vecer')?.classList.contains('aktivni')) return;
    _frontaGuided(async () => {
      const def = await nactiDef();
      const step = def.evening_step;
      if (!step || !step.id || krokHotovy(step.id)) return;
      if (!document.getElementById('modal-vecer')?.classList.contains('aktivni')) return;
      const v = await _zobrazKrokPanel(step);
      if (v !== 'skip') oznacKrok(step.id);
    });
  }

  /** Den 1 — panel u tlačítka Další den (po uzavření obou spisů). */
  function priZobrazeniDalsihoDne() {
    if (!jeAktivni()) return;
    _frontaGuided(async () => {
      const def = await nactiDef();
      const step = def.next_day_step;
      if (!step || !step.id || krokHotovy(step.id)) return;
      const btn = document.getElementById('btn-dalsi-den');
      if (!btn || !btn.classList.contains('viditelny')) return;
      await new Promise(r => setTimeout(r, 120));
      if (!btn.classList.contains('viditelny')) return;
      const v = await _zobrazKrokPanel(step);
      if (v !== 'skip') oznacKrok(step.id);
    });
  }

  function zavriVeSpisu() {
    zastavSledovaniRozsudku();
    _odstranVrstvuVeSpisu();
    _aktivniPanel = false;
  }

  function priRozsudku(pripad) {
    if (!jeAktivni() || !pripad || !_def) return;
    if (_prvniPripadVyresen()) {
      obnovZamkySlozek();
    }
    const msgMap = _def.stavove_po_rozsudku;
    const msg = msgMap && msgMap[pripad.id] ? String(msgMap[pripad.id]) : '';
    if (msg && typeof UI !== 'undefined' && UI.zobrazStavovouZpravu) {
      UI.zobrazStavovouZpravu(msg);
    }

    const resolved = State.get('casesResolvedToday') || [];
    if (Array.isArray(resolved) && resolved.length >= 2 && !krokHotovy('notebook_reminder')) {
      const remind = String(_def.notebook_reminder || '').trim();
      if (remind) {
        setTimeout(() => {
          if (!jeAktivni()) return;
          if (typeof UI !== 'undefined' && UI.zobrazStavovouZpravu) {
            UI.zobrazStavovouZpravu(remind);
          }
          oznacKrok('notebook_reminder');
        }, 1200);
      }
    }
  }

  /** Druhý spis — bez panelů, jen krátká stavová nápověda z case_hints. */
  function priPrvnimOdhaleniStopy(pripad) {
    if (!jeAktivni() || !pripad || pripad.id !== 'tyc_horak_d1') return;
    if (krokHotovy('horak_first_clue')) return;
    oznacKrok('horak_first_clue');
    const hint = navHintProPripad(pripad, { phase: 'after_first_clue' });
    if (hint && typeof UI !== 'undefined' && UI.zobrazStavovouZpravu) {
      UI.zobrazStavovouZpravu(hint);
    }
  }

  /** Den 1 — text pod večerní volbou. */
  function nastavVecerHintD1() {
    if (!jeAktivni() || !_def) return;
    const el = document.getElementById('vecer-mechanika-hint');
    const txt = String(_def.evening_hint_d1 || '').trim();
    if (el && txt) el.textContent = txt;
  }

  function priVeceruDokoncen() {
    if (!_jeDen1()) return;
    /* Finále až den 2 (Knihovna → Pravidla); zámky a panely den 1 končí večerem. */
    oznacKrok('d1_axis_complete');
  }

  /** Den 2 — poslední panel (nezávisí na tutorial_completed z večera dne 1). */
  function cekaFinaleDen2() {
    if (State.get('flags.tutorial_skipped') === true) return false;
    if (Number(State.get('currentDay')) !== 2) return false;
    return !krokHotovy('day2_knihovna_pravidla');
  }

  async function poStartuDne2() {
    if (!cekaFinaleDen2()) return;
    if (_aktivniPanel) return;
    const modaly = document.querySelectorAll('.overlay.aktivni');
    if (modaly.length > 0) return;

    const def = await nactiDef();
    const step = def.day2_final_step;
    if (!step || !step.id) {
      dokoncitOsu();
      return;
    }
    if (krokHotovy(step.id)) {
      dokoncitOsu();
      return;
    }

    const v = await _zobrazKrokPanel(step);
    if (v !== 'skip') oznacKrok(step.id);
    dokoncitOsu();
  }

  /** V úvodním Horákovi nechat pátrání bez časového limitu (i když je v menu zapnuto). */
  function vynucBezCasovehoPatrani(pripad) {
    if (!jeAktivni() || !pripad) return false;
    return String(pripad.id) === 'tyc_horak_d1';
  }

  function inicializuj() {
    nactiDef();
    _napojKlikRozsudekTutorial();
  }

  return {
    jeAktivni,
    jeSlozkaOtevrelitelna,
    jePripadOtevrelitelny,
    obnovZamkySlozek,
    krokHotovy,
    oznacKrok,
    preskocitVse,
    dokoncitOsu,
    nactiDef,
    poPripraveStolu,
    navHintProPripad,
    priOtevreniPripadu,
    priKlikNaRozsudek,
    cekaVerdictTutorial,
    priVecerniVolbe,
    priZobrazeniDalsihoDne,
    priRozsudku,
    priPrvnimOdhaleniStopy,
    nastavVecerHintD1,
    priVeceruDokoncen,
    cekaFinaleDen2,
    poStartuDne2,
    vynucBezCasovehoPatrani,
    zavriVeSpisu,
    zastavSledovaniRozsudku,
    inicializuj
  };

})();

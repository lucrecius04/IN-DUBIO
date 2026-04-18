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

  function _anulujPredohruConsequence() {
    const ctx = _predohraConsequenceCtx;
    if (!ctx) return;
    _predohraConsequenceCtx = null;
    if (ctx.timerId) clearTimeout(ctx.timerId);
    if (ctx.prelude && ctx.onClickPrelude) {
      ctx.prelude.removeEventListener('click', ctx.onClickPrelude);
    }
    const el = document.getElementById('pripad-consequence-prelude');
    if (el) {
      el.classList.add('skryto');
      el.setAttribute('aria-hidden', 'true');
    }
  }

  function _zavriPripadModal() {
    _anulujPredohruConsequence();
    _zavriModal('modal-pripad');
    Desk.nastavAktivniSpis(null);
  }

  function _formatujDatumSpisu(den) {
    const d = Number(den);
    if (!Number.isFinite(d) || d < 1) return '—';
    const zacatek = new Date(1931, 2, 1);
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

  function _dokonciPredohruConsequence(pripad, rozsudek) {
    if (!_predohraConsequenceCtx) return;
    const ctx = _predohraConsequenceCtx;
    _predohraConsequenceCtx = null;
    if (ctx.timerId) clearTimeout(ctx.timerId);
    if (ctx.prelude && ctx.onClickPrelude) {
      ctx.prelude.removeEventListener('click', ctx.onClickPrelude);
    }
    const prelude = document.getElementById('pripad-consequence-prelude');
    if (prelude) {
      prelude.classList.add('skryto');
      prelude.setAttribute('aria-hidden', 'true');
    }

    if (typeof Desk !== 'undefined' && Desk.animujRazitko && typeof Cases !== 'undefined') {
      Desk.animujRazitko(Cases.typRazitkaProVerdikt(rozsudek.id));
    }
    _zavriPripadModal();
    zobrazDusledkyRozsudku(
      pripad,
      rozsudek,
      () => Cases.zpracujRozsudek(pripad, rozsudek, { preskocRazitko: true }),
      { vynechatConsequenceNarativ: true }
    );
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

    _anulujPredohruConsequence();

    const dokonci = () => _dokonciPredohruConsequence(pripad, rozsudek);

    const onClickPrelude = () => dokonci();

    const timerId = setTimeout(dokonci, 2000);

    prelude.classList.remove('skryto');
    prelude.setAttribute('aria-hidden', 'false');
    prelude.addEventListener('click', onClickPrelude);

    _predohraConsequenceCtx = { timerId, onClickPrelude, prelude, dokonci };
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

  /** Archivní / staré JSON mohou mít Stat, Obchodnici, Cirkev. */
  function _mapLegacyFactionKlic(klic) {
    if (klic === 'Stat') return 'Moc';
    if (klic === 'Obchodnici') return 'Kapital';
    if (klic === 'Cirkev') return null;
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

  function zobrazDusledkyRozsudku(pripad, rozsudek, onPokracovat, opts) {
    if (!pripad || !rozsudek) {
      if (onPokracovat) onPokracovat();
      return;
    }

    _dusledkyZrusCasovace();
    _dusledkyCtx = {
      timers: [],
      onPokracovat: typeof onPokracovat === 'function' ? onPokracovat : null,
      skipped: false,
      hotovo: false
    };

    const tit = document.getElementById('dusledky-pripad-nazev');
    const verd = document.getElementById('dusledky-verdikt-text');
    const nar = document.getElementById('dusledky-narativ');
    const seznam = document.getElementById('dusledky-zmeny');
    const reakceEl = document.getElementById('dusledky-reakce');
    const btn = document.getElementById('dusledky-pokracovat');

    if (tit) tit.textContent = pripad.title || '—';
    if (verd) verd.textContent = rozsudek.text || '—';
    if (nar) {
      nar.innerHTML = '';
      if (rozsudek.consequence && !(opts && opts.vynechatConsequenceNarativ)) {
        const p = document.createElement('p');
        p.className = 'dusledky-narativ-text';
        p.textContent = rozsudek.consequence;
        nar.appendChild(p);
      }
    }

    const prPruzkum = Cases.posoudPruzkumProVerdikt(pripad, rozsudek);
    const typPripadu = Cases.typProZobrazeni(pripad);
    const pruzPozn = document.getElementById('dusledky-pruzkum-poznamka');
    if (pruzPozn) {
      if (typPripadu === 'moralni' && prPruzkum.pouzitPruzkum) {
        pruzPozn.textContent = 'Případ jsi prostudoval pečlivě.';
        pruzPozn.classList.remove('skryto');
      } else if (prPruzkum.pouzitPruzkum && prPruzkum.soulad) {
        pruzPozn.textContent = 'Případ jsi prostudoval pečlivě.';
        pruzPozn.classList.remove('skryto');
      } else {
        pruzPozn.textContent = '';
        pruzPozn.classList.add('skryto');
      }
    }

    const { merged, typNarativ } = Cases.pripravSlouceneDusledky(pripad, rozsudek);
    if (nar && typNarativ && typNarativ.length) {
      for (const line of typNarativ) {
        const p = document.createElement('p');
        p.className = 'dusledky-narativ-text';
        p.textContent = line;
        nar.appendChild(p);
      }
    }

    const radky = _dusledkySestavRadky(merged);
    if (reakceEl) reakceEl.textContent = _dusledkyTextReakce(radky);

    if (seznam) {
      seznam.innerHTML = '';
      for (const r of radky) {
        seznam.appendChild(_dusledkyVytvorElementRadku(r, false));
      }
    }

    if (btn) {
      btn.disabled = true;
      btn.onclick = () => {
        const cb = _dusledkyCtx && _dusledkyCtx.onPokracovat;
        _dusledkyZrusCasovace();
        _dusledkyCtx = null;
        _zavriModal('modal-dusledky');
        if (cb) cb();
      };
    }

    _otevriModal('modal-dusledky');

    const radkyEls = () => document.querySelectorAll('#modal-dusledky .dusledky-radek');

    if (radky.length === 0) {
      if (btn) btn.disabled = false;
      _dusledkyCtx.hotovo = true;
      return;
    }

    radkyEls().forEach((row, i) => {
      const t = setTimeout(() => row.classList.add('dusledky-radek--viditelny'), 80 + i * 220);
      _dusledkyCtx.timers.push(t);
    });

    const tBar = setTimeout(() => {
      const modal = document.getElementById('modal-dusledky');
      void modal?.offsetWidth;
      modal?.querySelectorAll('.dusledky-bar-track').forEach(track => {
        const tm = track.querySelector('.dusledky-bar-tmavy');
        const sv = track.querySelector('.dusledky-bar-svetly');
        if (tm && tm.dataset.cilSpodek != null) tm.style.width = tm.dataset.cilSpodek + '%';
        if (!sv) return;
        if (track.classList.contains('dusledky-bar-track--minus')) {
          if (sv.dataset.cilLeft != null) sv.style.left = sv.dataset.cilLeft + '%';
          if (sv.dataset.cilW != null) sv.style.width = sv.dataset.cilW + '%';
        } else {
          if (sv.dataset.cilLeft != null) sv.style.left = sv.dataset.cilLeft + '%';
          if (sv.dataset.cilW != null) sv.style.width = sv.dataset.cilW + '%';
        }
      });
    }, 120);
    _dusledkyCtx.timers.push(tBar);

    const maxMs = 120 + radky.length * 220 + 900;
    const tDone = setTimeout(() => _dusledkyDokonciAnimace(), maxMs);
    _dusledkyCtx.timers.push(tDone);
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

  function zobrazPripad(pripad, onRozsudek) {
    if (!pripad) return;

    // Reset na výchozí záložku
    _prepniTabPripadu('pripad');

    // Vyčisti readonly stav z předchozího otevření
    const zahlavi0 = document.querySelector('.pripad-zahlavi');
    zahlavi0?.classList.remove('zahlavi--vyreseno');
    _odstranTridyTypuPripadu(zahlavi0);
    _odstranTridyTypuPripadu(document.getElementById('pripad-kategorie-text'));

    // Záhlaví
    document.getElementById('pripad-kategorie-text').textContent = _stitulekTypuPripadu(pripad);
    document.getElementById('pripad-nazev-text').textContent = pripad.title;
    document.getElementById('pripad-obvineni-text').textContent =
      `${pripad.defendant?.name || '—'}, ${pripad.charge || '—'}`;

    const spDatum = document.getElementById('pripad-spis-datum');
    if (spDatum) spDatum.textContent = _formatujDatumSpisu(State.get('currentDay'));

    // Situace (pondělní bonus z nedělní volby C — jednou)
    let situace = pripad.situation || '';
    const denP = Number(State.get('currentDay'));
    if (Number.isFinite(denP) && denP % 7 === 1 && State.get('pondeli_moudrost_extra')) {
      situace = 'Odpočinutá neděle ti ještě rezonuje v hlavě — první řádky čteš jinak než obvykle.\n\n' + situace;
      State.set('pondeli_moudrost_extra', false);
    }
    document.getElementById('pripad-situace-text').textContent = situace;

    // Svědectví
    const svedkySekce = document.getElementById('pripad-svedectvi');
    svedkySekce.innerHTML = '<div class="svedectvi-nadpis">SVĚDECTVÍ</div>';
    if (pripad.testimony) {
      for (const sv of pripad.testimony) {
        const item = document.createElement('div');
        item.className = 'svedek-item';
        item.innerHTML = `
          <div class="svedek-label">${sv.label || sv.source}</div>
          <div class="svedek-text">${sv.text}</div>
        `;
        svedkySekce.appendChild(item);
      }
    }

    // Odhalené informace
    const odhaleneEl = document.getElementById('pripad-odhalene-info');
    odhaleneEl.innerHTML = '';
    const jizOdhalene = pripad.hidden_info?.filter(info =>
      State.jeInfoOdhaleno(pripad.id, info.id)
    ) || [];
    jizOdhalene.forEach(info => _zobrazOdhalenoInfo(odhaleneEl, info));

    // Průzkumné akce
    _aktualizujPruzkumPanel(pripad, onRozsudek);

    // Rozsudky + shrnutí na záložce ROZSUDEK
    _vyplnShrnutiRozsudku(pripad);
    _zobrazRozsudky(pripad, onRozsudek);

    _nastavTypPripaduVModalu(pripad);

    // Aktualizuj spis na stole
    Desk.nastavAktivniSpis(pripad);

    _otevriModal('modal-pripad');
    Desk.animujPrichodSpisu();
  }

  function zobrazPripadReadonly(pripad) {
    if (!pripad) return;

    // Reset záložek — readonly zobrazuje případ
    _prepniTabPripadu('pripad');

    const zahlavi0 = document.querySelector('.pripad-zahlavi');
    _odstranTridyTypuPripadu(zahlavi0);
    _odstranTridyTypuPripadu(document.getElementById('pripad-kategorie-text'));

    // Záhlaví
    document.getElementById('pripad-kategorie-text').textContent = _stitulekTypuPripadu(pripad);
    document.getElementById('pripad-nazev-text').textContent = pripad.title;
    document.getElementById('pripad-obvineni-text').textContent =
      `${pripad.defendant?.name || '—'}, ${pripad.charge || '—'}`;

    const spDatumR = document.getElementById('pripad-spis-datum');
    if (spDatumR) spDatumR.textContent = _formatujDatumSpisu(State.get('currentDay'));

    // Situace
    document.getElementById('pripad-situace-text').textContent = pripad.situation || '';

    // Svědectví
    const svedkySekce = document.getElementById('pripad-svedectvi');
    svedkySekce.innerHTML = '<div class="svedectvi-nadpis">SVĚDECTVÍ</div>';
    if (pripad.testimony) {
      for (const sv of pripad.testimony) {
        const item = document.createElement('div');
        item.className = 'svedek-item';
        item.innerHTML = `
          <div class="svedek-label">${sv.label || sv.source}</div>
          <div class="svedek-text">${sv.text}</div>
        `;
        svedkySekce.appendChild(item);
      }
    }

    // Odkryté informace
    const odhaleneEl = document.getElementById('pripad-odhalene-info');
    odhaleneEl.innerHTML = '';
    const jizOdhalene = pripad.hidden_info?.filter(info =>
      State.jeInfoOdhaleno(pripad.id, info.id)
    ) || [];
    jizOdhalene.forEach(info => _zobrazOdhalenoInfo(odhaleneEl, info));

    // Průzkum — skrýt
    document.getElementById('prukzum-panel')?.classList.add('skryto');

    const archivRozsudky = State.get('archive.verdicts') || [];
    const zaznam = archivRozsudky.find(v => v.caseId === pripad.id);
    _vyplnShrnutiRozsudku(pripad);
    _zobrazRozsudkyReadonly(pripad, zaznam);

    // Označit záhlaví jako vyřešené
    const zahlaviR = document.querySelector('.pripad-zahlavi');
    zahlaviR?.classList.add('zahlavi--vyreseno');
    _nastavTypPripaduVModalu(pripad);

    Desk.nastavAktivniSpis(pripad);
    _otevriModal('modal-pripad');
    Desk.animujPrichodSpisu();
  }

  function _aktualizujPruzkumPanel(pripad, onRozsudek) {
    const panel = document.getElementById('prukzum-panel');
    const tlacitka = document.getElementById('prukzum-tlacitka');
    const akceInfo = document.getElementById('prukzum-akce-info');

    const zbyvaji = State.get('investigationActionsLeft');
    if (akceInfo) akceInfo.textContent = `${zbyvaji} akce`;

    tlacitka.innerHTML = '';

    if (!pripad.hidden_info || pripad.hidden_info.length === 0) {
      panel.classList.add('skryto');
      return;
    }
    panel.classList.remove('skryto');

    const AKCE_POPIS = {
      witness:    'Vyslechnout svědka',
      records:    'Zkontrolovat záznamy',
      informant:  'Kontaktovat informátora',
      fast:       'Rozhodnout rychle'
    };

    for (const info of pripad.hidden_info) {
      const jizOdhaleno = State.jeInfoOdhaleno(pripad.id, info.id);
      const btn = document.createElement('button');
      btn.className = 'btn-prukzum' + (jizOdhaleno ? ' btn-prukzum--pouzit' : '');
      btn.textContent = AKCE_POPIS[info.action] || info.action;
      btn.disabled = jizOdhaleno || zbyvaji <= 0;

      if (!jizOdhaleno) {
        btn.addEventListener('click', () => {
          const zbyvaji2 = State.get('investigationActionsLeft');
          if (zbyvaji2 <= 0) return;

          State.set('investigationActionsLeft', zbyvaji2 - 1);
          State.odhalInfoPripadu(pripad.id, info.id);

          // Zobraz odkrytou informaci v záložce Svědectví
          const odhaleneEl = document.getElementById('pripad-odhalene-info');
          _zobrazOdhalenoInfo(odhaleneEl, info);

          // Aktualizuj panel
          _aktualizujPruzkumPanel(pripad, onRozsudek);

          // Aktualizuj vizuál akcí na stole
          Desk.aktualizujVse();

          // Moudrost roste za průzkum (násobič podle skrytého vzorce rozhodování)
          State.upravRys('Moudrost', Traits.aplikovatNasobekMoudrostiZaAkci(3));
          State.uloz();
        });
      }

      tlacitka.appendChild(btn);
    }
  }

  function _zobrazOdhalenoInfo(kontejner, info) {
    const el = document.createElement('div');
    el.className = 'odhalene-info';
    el.innerHTML = `
      <div class="odhalene-info-label">ZJIŠTĚNO</div>
      <div class="odhalene-info-text">${info.reveal}</div>
    `;
    kontejner.appendChild(el);
  }

  function _zobrazRozsudky(pripad, onRozsudek) {
    const seznam = document.getElementById('rozsudky-seznam');
    seznam.innerHTML = '';

    if (!pripad.verdicts) return;

    // Filtruj rozsudky podle podmínek (nízká Odvaha může odebrat možnosti)
    const odvaha = State.get('traits.Odvaha') ?? 50;
    const dostupneRozsudky = pripad.verdicts.filter(v => {
      if (v.requires_odvaha_min && odvaha < v.requires_odvaha_min) return false;
      return true;
    });

    for (const rozsudek of dostupneRozsudky) {
      const btn = document.createElement('button');
      const trida = _rozsudekTrida(rozsudek.id);
      btn.className = `btn-rozsudek ${trida}`;

      const consequenceHtml = rozsudek.consequence
        ? `<div class="rozsudek-consequence">${rozsudek.consequence}</div>`
        : '';

      btn.innerHTML = `
        <div class="rozsudek-radek-hlavni">
          <span class="rozsudek-nazev">${rozsudek.text}</span>
        </div>
        ${consequenceHtml}
      `;

      btn.addEventListener('click', () => {
        if (onRozsudek) _zobrazPredohruConsequenceAKlik(pripad, rozsudek, onRozsudek);
      });

      seznam.appendChild(btn);
    }

    const uplatek = Number(pripad.bribe_amount);
    if (Number.isFinite(uplatek) && uplatek > 0 && !State.get('flags.uplatek_prijat')) {
      const btnU = document.createElement('button');
      btnU.className = 'btn-rozsudek btn-rozsudek--uplatek';
      btnU.type = 'button';
      btnU.innerHTML = `
        <div class="rozsudek-radek-hlavni">
          <span class="rozsudek-nazev">Přijmout úplatek (${uplatek} Kč)</span>
        </div>
        <div class="rozsudek-consequence">Integrita utrpí — obálka je však na stole.</div>
      `;
      btnU.addEventListener('click', () => {
        _zavriPripadModal();
        const uR = {
          id:          'uplatek',
          text:        'Přijmout úplatek',
          consequence: `Nabídka zní na ${uplatek} Kč.`,
          consequences: {
            traits:   { Integrita: -15 },
            factions: {},
            trust:    {},
            finance:  uplatek,
            flags:    []
          }
        };
        zobrazDusledkyRozsudku(pripad, uR, () => Cases.zpracujPrijetiUplatekPoModalu(pripad));
      });
      seznam.appendChild(btnU);
    }
  }

  function _rozsudekTrida(id) {
    if (id.includes('prison') || id === 'maximum' || id === 'guilty') return 'btn-rozsudek--vinen';
    if (id === 'acquit' || id === 'zprostit') return 'btn-rozsudek--zprosit';
    return '';
  }

  /** Všechny verdikty ze spisu; zvolený zlatě + VYŘEŠENO, ostatní šedě bez kliknutí. */
  function _zobrazRozsudkyReadonly(pripad, zaznam) {
    const seznam = document.getElementById('rozsudky-seznam');
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
      btn.addEventListener('click', () => {
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
      btn.addEventListener('click', () => {
        _zavriModal('modal-vecer');
        const id = moznost.id;
        if (id === 'A' || id === 'B' || id === 'C' || id === 'D' || id === 'E') {
          State.set('nedele_volba', id);
        }
        if (id === 'C') State.set('pondeli_moudrost_extra', true);
        if (id === 'E') State.set('pondeli_vina_emotivni', true);
        aplikujVecerniNeboNedelniMoznost(moznost);
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

    if (tab === 'finance') {
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
        document.querySelectorAll('#archiv-obsah .postava-duvera[data-npc-id]').forEach(el => {
          const id = el.getAttribute('data-npc-id');
          if (id) el.textContent = Characters.getDuveraVizitka(id);
        });
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

  function zobrazStavovouZpravu(text, trvani = 2500) {
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
    document.querySelectorAll('.pripad-tab').forEach(t => {
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
      'Hráč hraje roli soudce Dr. Karla Nováka s temnou minulostí. ' +
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
        if (modalPripad && modalPripad.classList.contains('aktivni') &&
            prelude && !prelude.classList.contains('skryto') &&
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

  function aktualizujSlozky(pripady, vyresene) {
    const slotNazvy = ['Složka 1', 'Složka 2', 'Složka 3'];
    for (let i = 0; i < 3; i++) {
      const slozka = document.getElementById('slozka-' + (i + 1));
      if (!slozka) continue;

      const pripad = pripady[i];

      function _slozkaMeta(label, titulek) {
        slozka.setAttribute('aria-label', label);
        if (titulek) slozka.setAttribute('title', titulek);
        else slozka.removeAttribute('title');
      }

      if (!pripad) {
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

      if (vyresene.includes(pripad.id)) {
        slozka.classList.add('slozka--vyresena');
        slozka.classList.remove('slozka--aktivni');
        slozka.style.cursor = 'pointer';
        _slozkaMeta(slotNazvy[i] + ' — ' + nazev + ' (vyřešeno)', nazev + ' — vyřešeno');
      } else {
        slozka.classList.remove('slozka--vyresena');
        slozka.classList.add('slozka--aktivni');
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

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

  function _zavriPripadModal() {
    _zavriModal('modal-pripad');
    Desk.nastavAktivniSpis(null);
  }

  const _RYSY_IKONY_TREND = {
    Integrita: '⚖️', Odvaha: '✊', Moudrost: '🧠',
    Vina: '💔', Maska: '🎭', Nadeje: '🕯️'
  };
  const _FRAKCE_IKONY_TREND = {
    Stat: '🏛️', Lid: '👥', Obchodnici: '💼', Cirkev: '⛪'
  };

  /** 1–5: jedna šipka, 6–15: dvě, 16+: tři */
  function _trendTier(abs) {
    const a = Math.abs(Number(abs));
    if (!Number.isFinite(a) || a === 0) return 0;
    if (a >= 16) return 3;
    if (a >= 6) return 2;
    return 1;
  }

  function _trendSpan(ikona, nazev, delta) {
    const d = Number(delta);
    if (!Number.isFinite(d) || d === 0) return '';
    const tier = _trendTier(d);
    if (tier === 0) return '';
    const up = d > 0;
    const dir = up ? 'up' : 'down';
    const sipka = up ? '↑' : '↓';
    const sipky = sipka.repeat(tier);
    const znam = d > 0 ? '+' : '';
    return (
      `<span class="trend-item trend-${dir} trend--tier${tier}" title="${nazev} ${znam}${d}">` +
      `<span class="trend-ikona" aria-hidden="true">${ikona}</span>` +
      `<span class="trend-sipky">${sipky}</span></span>`
    );
  }

  function _trendBadge(cons) {
    if (!cons) return '';
    const casti = [];
    for (const [k, v] of Object.entries(cons.traits || {})) {
      const html = _trendSpan(_RYSY_IKONY_TREND[k] || '·', k, v);
      if (html) casti.push(html);
    }
    for (const [k, v] of Object.entries(cons.factions || {})) {
      const html = _trendSpan(_FRAKCE_IKONY_TREND[k] || '·', k, v);
      if (html) casti.push(html);
    }
    return casti.length ? `<div class="rozsudek-trendy">${casti.join('')}</div>` : '';
  }

  // --- PŘÍPAD ---

  const _TYPY_PRIPADU = ['rutinni', 'moralni', 'politicky', 'osobni'];

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

  function _nastavTypSlozky(el, pripad) {
    _odstranTypSlozky(el);
    if (!pripad) return;
    const typ = _typPripaduProVizual(pripad);
    el.classList.add('slozka--typ-' + typ);
    el.dataset.pripadTyp = typ;
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

    // Odhalené informace
    const odhaleneEl = document.getElementById('pripad-odhalene-info');
    odhaleneEl.innerHTML = '';
    const jizOdhalene = pripad.hidden_info?.filter(info =>
      State.jeInfoOdhaleno(pripad.id, info.id)
    ) || [];
    jizOdhalene.forEach(info => _zobrazOdhalenoInfo(odhaleneEl, info));

    // Průzkumné akce
    _aktualizujPruzkumPanel(pripad, onRozsudek);

    // Rozsudky
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

    // Zvýraznit zvolený rozsudek z archivu
    const archivRozsudky = State.get('archive.verdicts') || [];
    const zaznam = archivRozsudky.find(v => v.caseId === pripad.id);
    const rozsudekText = zaznam?.verdict || null;

    const seznam = document.getElementById('rozsudky-seznam');
    seznam.innerHTML = '';
    if (rozsudekText) {
      const el = document.createElement('div');
      const typ = _typPripaduProVizual(pripad);
      el.className = 'pripad-vybrany-rozsudek pripad-typ--' + typ;
      el.dataset.pripadTyp = typ;
      el.innerHTML = `
        <span class="pripad-vybrany-razitko pripad-typ--${typ}">VYRESENO</span>
        <span>${rozsudekText}</span>
      `;
      seznam.appendChild(el);
    } else {
      const el = document.createElement('div');
      el.style.cssText = 'padding:12px;font-style:italic;color:var(--barva-text-slaby);font-size:13px;';
      el.textContent = 'Případ byl vyřešen.';
      seznam.appendChild(el);
    }

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

          // Přepni na záložku Svědectví aby uživatel výsledek viděl
          _prepniTabPripadu('svedectvi');

          // Aktualizuj panel
          _aktualizujPruzkumPanel(pripad, onRozsudek);

          // Aktualizuj vizuál akcí na stole
          Desk.aktualizujVse();

          // Moudrost roste za průzkum
          State.upravRys('Moudrost', +3);
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
      const trendHtml = _trendBadge(rozsudek.consequences);

      btn.innerHTML = `
        <div class="rozsudek-radek-hlavni">
          <span class="rozsudek-nazev">${rozsudek.text}</span>
        </div>
        ${consequenceHtml}
        ${trendHtml}
      `;

      btn.addEventListener('click', () => {
        _zavriPripadModal();
        if (onRozsudek) onRozsudek(pripad, rozsudek);
      });

      seznam.appendChild(btn);
    }
  }

  function _rozsudekTrida(id) {
    if (id.includes('prison') || id === 'maximum' || id === 'guilty') return 'btn-rozsudek--vinen';
    if (id === 'acquit' || id === 'zprostit') return 'btn-rozsudek--zprosit';
    return '';
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

  // --- VEČERNÍ VOLBA ---

  function zobrazVecerniVolbu(denDat, callback) {
    const volba = denDat?.evening_choice;
    if (!volba) {
      if (callback) callback(null);
      return;
    }

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

  function zobrazArchiv() {
    _prepniArchivTab('rozsudky');
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
        ${_renderHaasObalka()}
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
        item.style.cursor = 'pointer';
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

  function _renderHaasObalka() {
    const otevrenoFlag = State.get('flags.haas_envelope_opened');
    const den = State.get('currentDay');
    if (den < 8) return '';

    if (otevrenoFlag) {
      return '<p style="color: var(--barva-text-slaby); font-style: italic; font-size: 13px;">Obálka od Haasova advokáta — otevřena.</p>';
    }

    const zustatek = State.get('finance.balance');
    const krizeTrida = zustatek < 50 ? ' haas-obalka--krize' : '';

    return `
      <div class="haas-obalka${krizeTrida}" id="haas-obalka-btn" onclick="Engine.otevriHaasovuObalku()">
        <div class="haas-obalka-pecet"></div>
        <div class="haas-obalka-text">Obálka — JUDr. Haas & synové<br><em>Neotevírat</em></div>
      </div>
    `;
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
    // Šuplík
    document.getElementById('suplik')?.addEventListener('click', () => {
      zobrazArchiv();
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
  function aktualizujSlozky(pripady, vyresene) {
    for (let i = 0; i < 3; i++) {
      const slozka = document.getElementById('slozka-' + (i + 1));
      if (!slozka) continue;

      const pripad = pripady[i];
      const stavEl  = slozka.querySelector('.slozka-stav');
      const cisloEl = slozka.querySelector('.slozka-cislo');

      if (!pripad) {
        _odstranTypSlozky(slozka);
        slozka.classList.add('slozka--ceka');
        slozka.classList.remove('slozka--aktivni', 'slozka--vyresena');
        slozka.style.opacity = '';
        slozka.style.cursor  = '';
        if (stavEl)  stavEl.textContent  = '—';
        if (cisloEl) cisloEl.textContent = ['I.', 'II.', 'III.'][i];
        continue;
      }

      _nastavTypSlozky(slozka, pripad);
      slozka.classList.remove('slozka--ceka');
      slozka.style.opacity = '1';
      slozka.style.cursor  = 'pointer';
      if (cisloEl) cisloEl.textContent = ['I.', 'II.', 'III.'][i];

      if (vyresene.includes(pripad.id)) {
        slozka.classList.add('slozka--vyresena');
        slozka.classList.remove('slozka--aktivni');
        if (stavEl) stavEl.textContent = '✓';
        slozka.style.cursor = 'pointer';
      } else {
        slozka.classList.remove('slozka--vyresena');
        slozka.classList.add('slozka--aktivni');
        if (stavEl) stavEl.textContent = pripad.title.substring(0, 12) + '…';
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
    zobrazVecerniVolbu,
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

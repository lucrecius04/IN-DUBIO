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
    Integrita: '⚖', Odvaha: '✊', Moudrost: '🧠',
    Vina: '💔', Maska: '🎭', Nadeje: '🕯'
  };
  const _FRAKCE_ZKRATKY = {
    Stat: 'Stát', Lid: 'Lid', Obchodnici: 'Obc.', Cirkev: 'Círk.'
  };

  function _trendBadge(cons) {
    if (!cons) return '';
    const casti = [];
    for (const [k, v] of Object.entries(cons.traits || {})) {
      if (v !== 0) {
        const ikona = _RYSY_IKONY_TREND[k] || k;
        casti.push(`<span class="trend-${v > 0 ? 'up' : 'down'}">${ikona}${v > 0 ? '↑' : '↓'}</span>`);
      }
    }
    for (const [k, v] of Object.entries(cons.factions || {})) {
      if (v !== 0) {
        const zkratka = _FRAKCE_ZKRATKY[k] || k;
        casti.push(`<span class="trend-${v > 0 ? 'up' : 'down'}">${zkratka}${v > 0 ? '↑' : '↓'}</span>`);
      }
    }
    return casti.length ? `<div class="rozsudek-trendy">${casti.join('')}</div>` : '';
  }

  // --- PŘÍPAD ---

  function zobrazPripad(pripad, onRozsudek) {
    if (!pripad) return;

    // Reset na výchozí záložku
    _prepniTabPripadu('pripad');

    // Vyčisti readonly stav z předchozího otevření
    document.querySelector('.pripad-zahlavi')?.classList.remove('zahlavi--vyreseno');

    // Záhlaví
    document.getElementById('pripad-kategorie-text').textContent = _formatujKategorii(pripad.category);
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

    // Aktualizuj spis na stole
    Desk.nastavAktivniSpis(pripad);

    _otevriModal('modal-pripad');
    Desk.animujPrichodSpisu();
  }

  function zobrazPripadReadonly(pripad) {
    if (!pripad) return;

    // Reset záložek — readonly zobrazuje případ
    _prepniTabPripadu('pripad');

    // Záhlaví
    document.getElementById('pripad-kategorie-text').textContent = _formatujKategorii(pripad.category);
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
      el.className = 'pripad-vybrany-rozsudek';
      el.innerHTML = `
        <span class="pripad-vybrany-razitko">VYRESENO</span>
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
    document.querySelector('.pripad-zahlavi')?.classList.add('zahlavi--vyreseno');

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

  function _formatujKategorii(cat) {
    const MAPA = {
      moral_dilemma: 'MORÁLNÍ DILEMA',
      political:     'POLITICKÝ PŘÍPAD',
      property:      'MAJETKOVÝ SPOR',
      criminal:      'TRESTNÍ PŘÍPAD',
      absurd:        'JINÝ PŘÍPAD',
      personal:      'OSOBNÍ PŘÍPAD'
    };
    return MAPA[cat] || cat;
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

  function zobrazArchiv() {
    _vyplnArchivTab('finance');
    _otevriModal('modal-archiv');
  }

  function _vyplnArchivTab(tab) {
    const obsah = document.getElementById('archiv-obsah');
    if (!obsah) return;

    if (tab === 'finance') {
      const p = Finance.getPrehled();
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
        </div>
        ${_renderHaasObalka()}
      `;

    } else if (tab === 'rozsudky') {
      const rozsudky = State.get('archive.verdicts');
      if (!rozsudky.length) {
        obsah.innerHTML = '<p style="color: var(--barva-text-slaby); font-style: italic; text-align: center;">Žádné rozsudky.</p>';
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
      const fragmenty = State.get('archive.fragments');
      if (!fragmenty.length) {
        obsah.innerHTML = '<p style="color: var(--barva-text-slaby); font-style: italic; text-align: center;">Žádné záznamy.</p>';
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

  function _renderHaasObalka() {
    const otevrenoFlag = State.get('flags.haas_envelope_opened');
    const den = State.get('currentDay');
    if (den < 8) return '';

    if (otevrenoFlag) {
      return '<p style="color: var(--barva-text-slaby); font-style: italic; font-size: 13px;">Obálka od Haasova advokáta — otevřena.</p>';
    }

    return `
      <div class="haas-obalka" id="haas-obalka-btn" onclick="Engine.otevriHaasovuObalku()">
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

  function _otevriMenu() {
    const modal = document.getElementById('modal-menu');
    if (!modal) return;
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
        _zavriPripadModal();
        _zavriModal('modal-archiv');
      }
    });

    // Zavřít archiv
    document.getElementById('archiv-zavrit')?.addEventListener('click', () => {
      _zavriModal('modal-archiv');
    });

    // Taby archivu
    document.querySelectorAll('.archiv-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.archiv-tab').forEach(t => t.classList.remove('archiv-tab--aktivni'));
        tab.classList.add('archiv-tab--aktivni');
        _vyplnArchivTab(tab.dataset.tab);
      });
    });

    // Zavřít modaly kliknutím na overlay
    document.querySelectorAll('.overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay && overlay.id !== 'modal-fragment') {
          // Případ a archiv lze zavřít kliknutím vedle
          // Fragment vyžaduje explicitní akci
          if (overlay.id === 'modal-archiv') {
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

    document.getElementById('menu-ulozit')?.addEventListener('click', () => {
      State.uloz();
      _zavriMenu();
      zobrazStavovouZpravu('Hra uložena.');
    });

    document.getElementById('menu-nacist')?.addEventListener('click', () => {
      const nacten = State.nacti();
      if (!nacten) {
        zobrazStavovouZpravu('Žádná uložená hra.');
        return;
      }
      Desk.aktualizujVse();
      _zavriMenu();
      zobrazStavovouZpravu('Hra načtena.');
    });

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
        slozka.classList.add('slozka--ceka');
        slozka.classList.remove('slozka--aktivni', 'slozka--vyresena');
        slozka.style.opacity = '';
        slozka.style.cursor  = '';
        if (stavEl)  stavEl.textContent  = '—';
        if (cisloEl) cisloEl.textContent = ['I.', 'II.', 'III.'][i];
        continue;
      }

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
    zobrazStavovouZpravu,
    zobrazKonecHry,
    zobrazBtnDalsiDen,
    aktualizujSlozky,
    inicializuj
  };

})();

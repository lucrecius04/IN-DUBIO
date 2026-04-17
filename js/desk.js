/**
 * desk.js — Vizuální vrstva stolu.
 * Čte stav z State a aktualizuje DOM.
 * Neobsahuje žádnou herní logiku.
 */

const Desk = (() => {

  // --- Ikony rysů pro levý panel ---

  const RYSY_IKONY = {
    Integrita: '\u2696\uFE0F',
    Odvaha:    '🦁',
    Moudrost:  '🧠',
    Vina:      '💔',
    Nadeje:    '\uD83D\uDD6F\uFE0F'
  };

  // --- Mapování rysů na vizuální elementy ---

  const RYSY_VIZUAL = {
    Integrita: {
      // kalamář: plný = vysoká integrita
      aktualizuj(hodnota) {
        const hladina = document.getElementById('kalamár-hladina');
        if (!hladina) return;
        const procento = Math.max(5, hodnota);
        hladina.style.height = procento + '%';
        // Barva — stárnutí inkoustu při nízkých hodnotách
        if (hodnota < 30) {
          hladina.style.background = 'linear-gradient(180deg, #3a1a1a 0%, #1a0a0a 100%)';
        } else {
          hladina.style.background = 'linear-gradient(180deg, #1a1a4a 0%, #0a0a2a 100%)';
        }
      }
    },
    Odvaha: {
      // lampa: jasná = vysoká odvaha
      aktualizuj(hodnota) {
        const lampa = document.getElementById('lampa');
        if (!lampa) return;
        lampa.classList.remove('lampa--vysoka', 'lampa--stredni', 'lampa--nizka', 'lampa--blika');
        if (hodnota >= 70)      lampa.classList.add('lampa--vysoka');
        else if (hodnota >= 40) lampa.classList.add('lampa--stredni');
        else if (hodnota >= 20) lampa.classList.add('lampa--nizka');
        else                    lampa.classList.add('lampa--nizka', 'lampa--blika');
      }
    },
    Moudrost: {
      // Počet knih na stole — přibývají
      aktualizuj(hodnota) {
        // Implementováno v _aktualizujKnihy()
      }
    },
    Vina: {
      aktualizuj(_hodnota) {}
    },
    Nadeje: {
      // Lampa bliká při velmi nízké naději
      aktualizuj(hodnota) {
        if (hodnota < 20) {
          const lampa = document.getElementById('lampa');
          if (lampa) lampa.classList.add('lampa--blika');
        }
      }
    }
  };

  // --- Hlavní update funkce ---

  function aktualizujVse() {
    const stav = State.get();
    _aktualizujKalendar(stav.currentDay);
    _aktualizujHodiny(stav.phase);
    _aktualizujRysy(stav.traits);
    _aktualizujStulVase(stav.currentDay);
    aktualizujPanelRysu();
    aktualizujPanelFrakci();
    aktualizujPanelFinance();
    if (typeof UI !== 'undefined' && UI.syncPostavyDuvera) {
      UI.syncPostavyDuvera();
    }
  }

  function _hvezdicky(hodnota) {
    const plne = Math.min(5, Math.max(1, Math.ceil(hodnota / 20)));
    return '<span class="hvezdy-plne">' + '★'.repeat(plne) + '</span>' +
           '<span class="hvezdy-prazne">' + '☆'.repeat(5 - plne) + '</span>';
  }

  const RYSY_LEVY = ['Integrita', 'Odvaha', 'Moudrost', 'Vina', 'Nadeje'];

  function _vyplnPanelRysu(panelId, rysy) {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    panel.innerHTML = '';
    for (const nazev of rysy) {
      const ikona = RYSY_IKONY[nazev];
      if (!ikona) continue;
      const popis = Traits.getPopis(nazev);
      const hodnota = State.get('traits.' + nazev) ?? 50;
      const el = document.createElement('div');
      el.className = 'rys-radek';
      el.innerHTML =
        '<div class="rys-radek-hlavicka">' +
          '<span class="rys-radek-ikona">' + ikona + '</span>' +
          '<span class="rys-radek-nazev" data-rys="' + nazev + '">' + nazev.toUpperCase() + '</span>' +
        '</div>' +
        '<div class="rys-radek-hvezdicky">' + _hvezdicky(hodnota) + '</div>' +
        '<div class="rys-radek-popis">' + popis + '</div>';
      panel.appendChild(el);
    }
  }

  function aktualizujPanelRysu() {
    _vyplnPanelRysu('panel-rysy', RYSY_LEVY);
    const pravy = document.getElementById('panel-rysy-pravy');
    if (pravy) pravy.innerHTML = '';
  }

  const FRAKCE_RADKY = [
    { klic: 'Moc',     nazev: 'MOC' },
    { klic: 'Kapital', nazev: 'KAPITÁL' },
    { klic: 'Lid',     nazev: 'LID' }
  ];

  const FRAKCE_IKONY = {
    Moc:     '\uD83C\uDFDB\uFE0F',
    Kapital: '\uD83D\uDCB0',
    Lid:     '\u270A'
  };

  const FRAKCE_TOOLTIP = {
    Moc:     'Moc a pořádek — Vlček, systém.',
    Kapital: 'Majetek a trh — Haas, smlouvy.',
    Lid:     'Lidé si pamatují spravedlnost.'
  };

  function _frakceTecky(hodnota) {
    const h = Math.max(0, Math.min(100, hodnota));
    let n;
    if (h <= 20)      n = 1;
    else if (h <= 40) n = 2;
    else if (h <= 60) n = 3;
    else if (h <= 80) n = 4;
    else              n = 5;
    return '\u25CF'.repeat(n) + '\u25CB'.repeat(5 - n);
  }

  function aktualizujPanelFinance() {
    const panel = document.getElementById('panel-finance');
    if (!panel || typeof Finance === 'undefined' || !Finance.getTextyLevyPanel) return;
    const t = Finance.getTextyLevyPanel();
    const dluh = Number(t.dluh) || 0;
    panel.innerHTML = '';
    const r1 = document.createElement('div');
    r1.className = 'finance-radek finance-radek--uspory';
    r1.textContent = 'Úspory: ' + t.uspory + ' Kč';
    panel.appendChild(r1);
    const r2 = document.createElement('div');
    r2.className = 'finance-radek finance-radek--tydenni ' + (t.operaceTrida || 'finance--neutral');
    r2.textContent = t.radekOperace;
    panel.appendChild(r2);
    if (dluh > 0) {
      const r3 = document.createElement('div');
      r3.className = 'finance-radek finance-radek--dluh';
      r3.textContent = 'Dluh: ' + Math.round(dluh) + ' Kč';
      panel.appendChild(r3);
    }
  }

  function aktualizujPanelFrakci() {
    const panel = document.getElementById('panel-frakce');
    if (!panel) return;
    panel.innerHTML = '';
    for (const { klic, nazev } of FRAKCE_RADKY) {
      const hodnota = State.get('factions.' + klic) ?? 50;
      const ikona = FRAKCE_IKONY[klic] || '·';
      const el = document.createElement('div');
      el.className = 'frakce-radek';
      el.title = FRAKCE_TOOLTIP[klic] || '';
      el.innerHTML =
        '<span class="frakce-radek-vlevo">' +
          '<span class="frakce-radek-ikona" aria-hidden="true">' + ikona + '</span>' +
          '<span class="frakce-radek-nazev">' + nazev + '</span>' +
        '</span>' +
        '<span class="frakce-radek-tecky">' + _frakceTecky(hodnota) + '</span>';
      panel.appendChild(el);
    }
  }

  function _aktualizujRysy(rysy) {
    for (const [nazev, handler] of Object.entries(RYSY_VIZUAL)) {
      handler.aktualizuj(rysy[nazev] ?? 50);
    }
  }

  const _KALENDAR_DNY_V_TYDNU = [
    'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota', 'neděle'
  ];

  /** Pondělí = 0 … neděle = 6 (z JS Date.getDay()). */
  function _denVTydnuPondeli0(d) {
    return (d.getDay() + 6) % 7;
  }

  const _KALENDAR_MESICE_GEN = [
    'ledna', 'února', 'března', 'dubna', 'května', 'června',
    'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'
  ];

  function _aktualizujKalendar(den) {
    const elMeta = document.getElementById('kalendar-meta');
    const elDatum = document.getElementById('kalendar-datum');
    const elKal = document.getElementById('kalendar');
    if (!elMeta || !elDatum) return;

    // Hra začíná 1. března 1931
    const ZACATEK = new Date(1931, 2, 1); // 1.3.1931
    const datum = new Date(ZACATEK);
    datum.setDate(datum.getDate() + den - 1);

    const d = Number(den);
    const tydenHry = Number.isFinite(d) && d > 0 ? Math.ceil(d / 7) : 1;
    const denHry = Number.isFinite(d) && d > 0 ? d : 1;
    elMeta.textContent = 'TÝDEN ' + tydenHry + ' · DEN ' + denHry;

    const i = _denVTydnuPondeli0(datum);
    const jmenoDne = _KALENDAR_DNY_V_TYDNU[i] || '—';
    const denMes = datum.getDate();
    const mesGen = _KALENDAR_MESICE_GEN[datum.getMonth()] || '';
    const rok = datum.getFullYear();
    elDatum.textContent = jmenoDne + ', ' + denMes + '. ' + mesGen + ' ' + rok;

    // Politické dny (předdefinované)
    const POLITICKE_DNY = [6, 14, 17, 20, 24, 26];
    if (POLITICKE_DNY.includes(den)) {
      elKal.classList.add('politicky-den');
    } else {
      elKal.classList.remove('politicky-den');
    }
  }

  function _aktualizujHodiny(faze) {
    const el = document.getElementById('hodiny');
    if (!el) return;

    const CASY = {
      morning:   '07:30',
      forenoon:  '09:15',
      noon:      '12:00',
      afternoon: '14:30',
      evening:   '18:45',
      night:     '22:10'
    };

    el.classList.add('nova-faze');
    el.textContent = CASY[faze] || '12:00';
    setTimeout(() => el.classList.remove('nova-faze'), 600);
  }

  function _aktualizujStulVase(den) {
    const stul = document.getElementById('stul');
    if (!stul) return;
    stul.classList.remove('stul--tyden1', 'stul--tyden2', 'stul--tyden3', 'stul--finale', 'stul--nedele');
    const d = Number(den);
    if (Number.isFinite(d) && d > 0 && d % 7 === 0) {
      stul.classList.add('stul--nedele');
    }
    if (den >= 7)  stul.classList.add('stul--tyden1');
    if (den >= 15) stul.classList.add('stul--tyden2');
    if (den >= 20) stul.classList.add('stul--tyden3');
    if (den >= 28) stul.classList.add('stul--finale');
  }

  // --- Specifické animace ---

  function animujRazitko(typ) {
    // typ: 'vinen' | 'zprostit' | 'odlozit'
    const overlay = document.querySelector('.razitko-overlay');
    if (!overlay) return;

    const text = overlay.querySelector('.razitko-text');
    if (!text) return;

    const TEXTY = {
      vinen:    'VINEN',
      zprostit: 'ZPROŠTĚN',
      odlozit:  'ODLOŽENO',
      podminka: 'PODMÍNKA',
      pokuta:   'POKUTA'
    };
    const TRIDY = {
      vinen:    'razitko-text--vinen',
      zprostit: 'razitko-text--zprostit',
      odlozit:  'razitko-text--odlozit',
      podminka: 'razitko-text--odlozit',
      pokuta:   'razitko-text--odlozit'
    };

    text.textContent = TEXTY[typ] || typ.toUpperCase();
    text.className = 'razitko-text ' + (TRIDY[typ] || 'razitko-text--odlozit');
    text.style.fontVariant = 'normal';
    text.classList.add('razitko-text--animace');

    // Otřes papírem
    const spis = document.getElementById('aktivni-spis');
    if (spis) {
      spis.classList.add('spis--otres');
      setTimeout(() => spis.classList.remove('spis--otres'), 400);
    }

    // Zvuk razítka (pokud existuje)
    _prehrajZvuk('stamp');

    // Skryj razítko po chvíli
    setTimeout(() => {
      text.style.opacity = '0';
      text.style.transition = 'opacity 0.5s ease';
    }, 1800);
    setTimeout(() => {
      text.classList.remove('razitko-text--animace');
      text.style.opacity = '';
      text.style.transition = '';
    }, 2400);
  }

  function nastavNovinyClanek(text, datum) {
    const el = document.getElementById('noviny-text');
    const elDatum = document.getElementById('noviny-datum');
    if (el) el.textContent = text;
    if (elDatum) elDatum.textContent = datum;
  }

  function zobrazVlcekDopis(show) {
    const el = document.getElementById('vlcek-dopis');
    if (!el) return;
    if (show) {
      el.classList.remove('skryto');
      el.classList.add('prisel');
    } else {
      el.classList.add('skryto');
    }
  }


  function zobrazSuplikIndikator(show) {
    const el = document.getElementById('suplik-indikator');
    if (!el) return;
    if (show) el.classList.add('aktivni');
    else      el.classList.remove('aktivni');
  }

  function animujPrichodSpisu() {
    const spis = document.getElementById('aktivni-spis');
    if (!spis) return;
    spis.classList.remove('spis--prichod');
    void spis.offsetWidth; // reflow pro reset animace
    spis.classList.add('spis--prichod');
  }

  function _prehrajZvuk(nazev) {
    try {
      const audio = document.getElementById('zvuk-' + nazev);
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
    } catch (_) {}
  }

  function _zobrazModalRysu(nazev) {
    const modal = document.getElementById('modal-rys');
    if (!modal) return;

    const ikona    = RYSY_IKONY[nazev] || '';
    const popis    = Traits.getPopis(nazev);
    const hodnota  = State.get('traits.' + nazev) ?? 50;
    const vysvetl  = Traits.getCoToZnamena(nazev) || '';

    const elIkona    = document.getElementById('rys-detail-ikona');
    const elNazev    = document.getElementById('rys-detail-nazev');
    const elHvezd    = document.getElementById('rys-detail-hvezdicky');
    const elPopis    = document.getElementById('rys-detail-popis');
    const elVysvetl  = document.getElementById('rys-detail-vysvetlivka');

    if (elIkona)   elIkona.textContent  = ikona;
    if (elNazev)   elNazev.textContent  = nazev.toUpperCase();
    if (elHvezd)   elHvezd.innerHTML   = _hvezdicky(hodnota);

    const elHerna = document.getElementById('rys-detail-herna');
    if (elHerna) {
      const herna = Traits.getHerniPopis(nazev) || '';
      elHerna.innerHTML = herna
        ? herna.replace(/\n/g, '<br>')
        : '<span style="opacity:0.6">—</span>';
    }

    if (elPopis)   elPopis.textContent  = popis;
    if (elVysvetl) elVysvetl.textContent = vysvetl;

    modal.classList.remove('skryto');
    modal.classList.add('aktivni');
  }

  function _zavriModalRysu() {
    const modal = document.getElementById('modal-rys');
    if (!modal) return;
    modal.classList.remove('aktivni');
    modal.classList.add('skryto');
  }

  function inicializujTooltipyRysu() {
    const tooltip = document.getElementById('rys-tooltip');
    if (!tooltip) return;

    // Zavření modálu rysu
    document.getElementById('modal-rys-zavrit')
      ?.addEventListener('click', _zavriModalRysu);
    document.getElementById('modal-rys')
      ?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) _zavriModalRysu();
      });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') _zavriModalRysu();
    });

    let tooltipTimer = null;

    function _pripojTooltip(panel) {
      if (!panel) return;

      // Klik na rys-radek → otevři modál
      panel.addEventListener('click', (e) => {
        const radek = e.target.closest('.rys-radek');
        if (!radek) return;
        const nazevEl = radek.querySelector('.rys-radek-nazev');
        if (!nazevEl) return;
        const rys = nazevEl.dataset.rys;
        if (rys) _zobrazModalRysu(rys);
      });

      panel.addEventListener('mouseover', (e) => {
        const nazevEl = e.target.closest('.rys-radek-nazev');
        if (!nazevEl) return;
        const rys = nazevEl.dataset.rys;
        if (!rys) return;

        clearTimeout(tooltipTimer);
        tooltipTimer = setTimeout(() => {
          const nazevTooltip = tooltip.querySelector('.rys-tooltip-nazev');
          const textTooltip  = tooltip.querySelector('.rys-tooltip-text');
          if (nazevTooltip) nazevTooltip.textContent = rys.toUpperCase();
          if (textTooltip)  textTooltip.textContent  = Traits.getCoToZnamena(rys) || '';
          tooltip.classList.add('viditelny');
          _nastavPoziciTooltipu(e, tooltip);
        }, 500);
      });

      panel.addEventListener('mousemove', (e) => {
        if (tooltip.classList.contains('viditelny')) {
          _nastavPoziciTooltipu(e, tooltip);
        }
      });

      panel.addEventListener('mouseout', (e) => {
        const nazevEl = e.target.closest('.rys-radek-nazev');
        if (!nazevEl) return;
        clearTimeout(tooltipTimer);
        tooltip.classList.remove('viditelny');
      });
    }

    _pripojTooltip(document.getElementById('panel-rysy'));
  }

  /**
   * Ilustrované předměty na stole — tooltip z data/traits-text.json (getTraitText)
   * a desk_predmety (viz .cursorrules).
   */
  const _DESK_PREDMET_MAPA = [
    { id: 'desk-lamp', trait: 'Odvaha' },
    { id: 'desk-inkwell', trait: 'Integrita' },
    { id: 'desk-photo', trait: 'Vina' },
    { id: 'desk-ashtray-wrap', atmosfera: 'popelnik' }
  ];

  function _textTooltipuPredmetuStolu(zaznam) {
    if (zaznam.trait && typeof Traits !== 'undefined' && Traits.getTraitText) {
      const h = Number(State.get('traits.' + zaznam.trait));
      const v = Number.isFinite(h) ? h : 50;
      const { tooltip } = Traits.getTraitText(zaznam.trait, v);
      const nazev =
        typeof Traits.getTraitVisualLabel === 'function'
          ? Traits.getTraitVisualLabel(zaznam.trait)
          : zaznam.trait.toUpperCase();
      return { nazev, text: tooltip || '—' };
    }
    if (zaznam.atmosfera && typeof Traits !== 'undefined' && Traits.getDeskPredmetAtmosfera) {
      const { nazev, tooltip } = Traits.getDeskPredmetAtmosfera(zaznam.atmosfera);
      return { nazev: nazev || '—', text: tooltip || '—' };
    }
    return { nazev: '—', text: '—' };
  }

  /** Stejný práh jako u složek (js/desk-slozka-pixel-hover.js). */
  const _PREDMET_ALPHA_MIN = 28;

  function _predmetJeNaNeprůhlednémPixelu(img, canvas, ctx, e) {
    if (!img.naturalWidth || !canvas.width) return false;
    const rect = img.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return false;
    const rx = (e.clientX - rect.left) / rect.width;
    const ry = (e.clientY - rect.top) / rect.height;
    if (rx < 0 || ry < 0 || rx > 1 || ry > 1) return false;
    const x = Math.min(canvas.width - 1, Math.max(0, Math.floor(rx * canvas.width)));
    const y = Math.min(canvas.height - 1, Math.max(0, Math.floor(ry * canvas.height)));
    try {
      return ctx.getImageData(x, y, 1, 1).data[3] > _PREDMET_ALPHA_MIN;
    } catch (_err) {
      return false;
    }
  }

  function _predmetImgProZaznam(zaznam) {
    const el = document.getElementById(zaznam.id);
    if (!el) return null;
    if (el.tagName === 'IMG') return el;
    if (zaznam.id === 'desk-ashtray-wrap') return el.querySelector('img');
    return null;
  }

  function _pripojTooltipPredmetuPixel(img, zaznam, tooltip, nazevTooltip, textTooltip) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let ready = false;

    function rasterize() {
      ready = false;
      if (!img.naturalWidth || !img.naturalHeight) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      try {
        ctx.drawImage(img, 0, 0);
        ready = true;
      } catch (_e) {
        ready = false;
      }
    }

    img.addEventListener('load', rasterize);
    if (img.complete) rasterize();

    let tooltipTimer = null;
    let posledniUdalostNaAlfě = null;

    function zrusitTooltip() {
      clearTimeout(tooltipTimer);
      tooltipTimer = null;
      posledniUdalostNaAlfě = null;
      tooltip.classList.remove('viditelny');
    }

    img.addEventListener('mousemove', (e) => {
      const hit = ready && _predmetJeNaNeprůhlednémPixelu(img, canvas, ctx, e);
      img.classList.toggle('desk-predmet--hover', hit);
      if (!hit) {
        zrusitTooltip();
        return;
      }
      posledniUdalostNaAlfě = e;
      if (tooltip.classList.contains('viditelny')) {
        _nastavPoziciTooltipu(e, tooltip);
        return;
      }
      if (!tooltipTimer) {
        tooltipTimer = setTimeout(() => {
          tooltipTimer = null;
          if (!img.classList.contains('desk-predmet--hover') || !posledniUdalostNaAlfě) return;
          const tip = _textTooltipuPredmetuStolu(zaznam);
          nazevTooltip.textContent = tip.nazev;
          textTooltip.textContent = tip.text;
          tooltip.classList.add('viditelny');
          _nastavPoziciTooltipu(posledniUdalostNaAlfě, tooltip);
        }, 450);
      }
    });

    img.addEventListener('mouseleave', () => {
      img.classList.remove('desk-predmet--hover');
      zrusitTooltip();
    });

    img.addEventListener('dragstart', (e) => {
      e.preventDefault();
    });
  }

  function inicializujTooltipyPredmetuStolu() {
    const tooltip = document.getElementById('desk-predmet-tooltip');
    if (!tooltip) return;
    const nazevTooltip = tooltip.querySelector('.rys-tooltip-nazev');
    const textTooltip = tooltip.querySelector('.rys-tooltip-text');
    if (!nazevTooltip || !textTooltip) return;

    for (const zaznam of _DESK_PREDMET_MAPA) {
      const img = _predmetImgProZaznam(zaznam);
      if (!img) continue;
      _pripojTooltipPredmetuPixel(img, zaznam, tooltip, nazevTooltip, textTooltip);
    }
  }

  const _TYPY_SPIS = ['rutinni', 'moralni', 'politicky', 'osobni'];

  function _typPripaduProSpis(pripad) {
    return Cases.typProZobrazeni(pripad);
  }

  function nastavAktivniSpis(pripad) {
    const spis = document.getElementById('aktivni-spis');
    const hlavicka = document.querySelector('#spis-hlavicka .spis-nazev');
    const telo = document.getElementById('spis-telo');
    if (!telo) return;

    if (!pripad) {
      if (spis) {
        spis.style.display = 'none';
        for (const t of _TYPY_SPIS) spis.classList.remove('spis--typ-' + t);
        delete spis.dataset.pripadTyp;
      }
      return;
    }

    if (spis) {
      spis.style.display = '';
      for (const t of _TYPY_SPIS) spis.classList.remove('spis--typ-' + t);
      const typ = _typPripaduProSpis(pripad);
      spis.classList.add('spis--typ-' + typ);
      spis.dataset.pripadTyp = typ;
    }
    if (hlavicka) hlavicka.textContent = pripad.title;
    telo.innerHTML =
      '<div class="spis-obvineni">' +
        (pripad.defendant?.name || '—') + ' — ' + (pripad.charge || '—') +
      '</div>' +
      '<div class="spis-situace-kratka">' + (pripad.situation || '') + '</div>';
  }

  function _nastavPoziciTooltipu(e, tooltip) {
    const x = Math.min(e.clientX + 16, window.innerWidth - 300);
    const y = Math.min(e.clientY + 16, window.innerHeight - 100);
    tooltip.style.left = x + 'px';
    tooltip.style.top  = y + 'px';
  }

  return {
    aktualizujVse,
    animujRazitko,
    nastavNovinyClanek,
    nastavAktivniSpis,
    zobrazVlcekDopis,
    zobrazSuplikIndikator,
    animujPrichodSpisu,
    inicializujTooltipyRysu,
    inicializujTooltipyPredmetuStolu
  };

})();

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
    Maska:     '🎭',
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
    Maska: {
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
  }

  function _hvezdicky(hodnota) {
    const plne = Math.min(5, Math.max(1, Math.ceil(hodnota / 20)));
    return '<span class="hvezdy-plne">' + '★'.repeat(plne) + '</span>' +
           '<span class="hvezdy-prazne">' + '☆'.repeat(5 - plne) + '</span>';
  }

  const RYSY_LEVY  = ['Integrita', 'Odvaha', 'Moudrost'];
  const RYSY_PRAVY = ['Vina', 'Maska', 'Nadeje'];

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
    _vyplnPanelRysu('panel-rysy-pravy', RYSY_PRAVY);
  }

  function _aktualizujRysy(rysy) {
    for (const [nazev, handler] of Object.entries(RYSY_VIZUAL)) {
      handler.aktualizuj(rysy[nazev] ?? 50);
    }
  }

  function _aktualizujKalendar(den) {
    const elDen = document.getElementById('kalendar-den');
    const elMesic = document.getElementById('kalendar-mesic');
    const elKal = document.getElementById('kalendar');
    if (!elDen) return;

    // Hra začíná 1. března 1931
    const ZACATEK = new Date(1931, 2, 1); // 1.3.1931
    const datum = new Date(ZACATEK);
    datum.setDate(datum.getDate() + den - 1);

    const MESICE = ['LEDEN', 'ÚNOR', 'BŘEZEN', 'DUBEN', 'KVĚTEN', 'ČERVEN',
                    'ČERVENEC', 'SRPEN', 'ZÁŘÍ', 'ŘÍJEN', 'LISTOPAD', 'PROSINEC'];

    elDen.textContent = datum.getDate();
    elMesic.textContent = MESICE[datum.getMonth()] + ' ' + datum.getFullYear();

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
    stul.classList.remove('stul--tyden1', 'stul--tyden2', 'stul--tyden3', 'stul--finale');
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

  // Tooltip pro rysy — zobrazí se při hoveru na vizuální element
  const RYSY_TOOLTIP_TEXTY = {
    Integrita: 'Jak věrný zůstáváš svým hodnotám. Klesá přijetím úplatků a politických rozsudků.',
    Odvaha:    'Ochota jednat i za cenu osobních následků.',
    Moudrost:  'Schopnost číst situace a odhalovat lži.',
    Vina:      'Váha minulosti. Nikdy neklesne na nulu.',
    Maska:     'Jak dobře skrýváš své skutečné záměry.',
    Nadeje:    'Věříš ještě že něco má smysl?'
  };

  function _zobrazModalRysu(nazev) {
    const modal = document.getElementById('modal-rys');
    if (!modal) return;

    const ikona    = RYSY_IKONY[nazev] || '';
    const popis    = Traits.getPopis(nazev);
    const hodnota  = State.get('traits.' + nazev) ?? 50;
    const vysvetl  = RYSY_TOOLTIP_TEXTY[nazev] || '';

    const elIkona    = document.getElementById('rys-detail-ikona');
    const elNazev    = document.getElementById('rys-detail-nazev');
    const elHvezd    = document.getElementById('rys-detail-hvezdicky');
    const elPopis    = document.getElementById('rys-detail-popis');
    const elVysvetl  = document.getElementById('rys-detail-vysvetlivka');

    if (elIkona)   elIkona.textContent  = ikona;
    if (elNazev)   elNazev.textContent  = nazev.toUpperCase();
    if (elHvezd)   elHvezd.textContent  = _hvezdicky(hodnota);
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
          if (textTooltip)  textTooltip.textContent  = RYSY_TOOLTIP_TEXTY[rys] || '';
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
    _pripojTooltip(document.getElementById('panel-rysy-pravy'));
  }

  function nastavAktivniSpis(pripad) {
    const spis = document.getElementById('aktivni-spis');
    const hlavicka = document.querySelector('#spis-hlavicka .spis-nazev');
    const telo = document.getElementById('spis-telo');
    if (!telo) return;

    if (!pripad) {
      if (spis) spis.style.display = 'none';
      return;
    }

    if (spis) spis.style.display = '';
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
    inicializujTooltipyRysu
  };

})();

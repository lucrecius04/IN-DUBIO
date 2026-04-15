/**
 * desk.js — Vizuální vrstva stolu.
 * Čte stav z State a aktualizuje DOM.
 * Neobsahuje žádnou herní logiku.
 */

const Desk = (() => {

  // --- Ikony rysů pro levý panel ---

  const RYSY_IKONY = {
    Integrita: '⚖',
    Odvaha:    '🦁',
    Moudrost:  '🧠',
    Vina:      '💔',
    Maska:     '🎭',
    Nadeje:    '🕯'
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
      // fotografie — temní při vysoké vině
      aktualizuj(hodnota) {
        const foto = document.getElementById('fotografie');
        if (!foto) return;
        foto.classList.remove('fotografie--stredni-vina', 'fotografie--vysoka-vina');
        if (hodnota >= 80)      foto.classList.add('fotografie--vysoka-vina');
        else if (hodnota >= 55) foto.classList.add('fotografie--stredni-vina');
      }
    },
    Maska: {
      // zmačkané dopisy v rohu — více = nižší maska
      aktualizuj(hodnota) {
        _aktualizujZmackaneDopisy(100 - hodnota);
      }
    },
    Nadeje: {
      // okno — světlejší nebo temnější
      aktualizuj(hodnota) {
        const oknoWrapper = document.getElementById('okno');
        if (!oknoWrapper) return;
        // Nízká naděje = otočená fotografie
        const foto = document.getElementById('fotografie');
        if (foto) {
          if (hodnota < 20) foto.classList.add('fotografie--nizka-nadeje');
          else              foto.classList.remove('fotografie--nizka-nadeje');
        }
        // Lampa bliká při velmi nízké naději (i bez ohledu na odvahu)
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
    _aktualizujOkno(stav.phase);
    _aktualizujRysy(stav.traits);
    _aktualizujAkce(stav.investigationActionsLeft);
    _aktualizujStulVase(stav.currentDay);
    aktualizujPanelRysu();
  }

  function aktualizujPanelRysu() {
    const panel = document.getElementById('panel-rysy');
    if (!panel) return;
    panel.innerHTML = '';

    for (const [nazev, ikona] of Object.entries(RYSY_IKONY)) {
      const popis = Traits.getPopis(nazev);
      const el = document.createElement('div');
      el.className = 'rys-radek';
      el.innerHTML =
        '<div class="rys-radek-hlavicka">' +
          '<span class="rys-radek-ikona">' + ikona + '</span>' +
          '<span class="rys-radek-nazev">' + nazev.toUpperCase() + '</span>' +
        '</div>' +
        '<div class="rys-radek-popis">' + popis + '</div>';
      panel.appendChild(el);
    }
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

  function _aktualizujOkno(faze) {
    const okno = document.getElementById('okno');
    if (!okno) return;
    okno.classList.remove('okno--rano', 'okno--dopoledne', 'okno--poledne', 'okno--vecer', 'okno--noc');
    const MAPA = {
      morning:   'okno--rano',
      forenoon:  'okno--dopoledne',
      noon:      'okno--poledne',
      afternoon: 'okno--dopoledne',
      evening:   'okno--vecer',
      night:     'okno--noc'
    };
    okno.classList.add(MAPA[faze] || 'okno--dopoledne');
  }

  function _aktualizujAkce(zbyvaji) {
    const teckySeznam = document.querySelectorAll('.akce-tecka');
    teckySeznam.forEach((tecka, i) => {
      if (i < zbyvaji) {
        tecka.classList.remove('akce-tecka--pouzita');
      } else {
        tecka.classList.add('akce-tecka--pouzita');
      }
    });
  }

  function _aktualizujZmackaneDopisy(pocet) {
    // Počet zmačkaných dopisů v rohu = inverzní Maska (0–100 → 0–5 dopisů)
    const container = document.getElementById('zmackane-dopisy');
    if (!container) return;
    const cilPocet = Math.floor(pocet / 20); // 0–5
    const aktualni = container.children.length;

    if (cilPocet > aktualni) {
      for (let i = aktualni; i < cilPocet; i++) {
        const d = document.createElement('div');
        d.className = 'dopis--zmackany';
        d.style.left  = (5 + Math.random() * 30) + 'px';
        d.style.top   = (5 + Math.random() * 20) + 'px';
        d.style.transform = `rotate(${(Math.random() * 60 - 30)}deg)`;
        container.appendChild(d);
      }
    }
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

  function nastavPocastiOkna(typ) {
    const okno = document.getElementById('okno');
    if (!okno) return;
    okno.classList.remove('okno--dest', 'okno--snih');
    if (typ) okno.classList.add('okno--' + typ);
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
  function inicializujTooltipyRysu() {
    const MAPY = {
      'kalamár':    'Integrita',
      'lampa':      'Odvaha',
      'okno':       'Naděje',
      'fotografie': 'Vina'
    };

    const tooltip = document.getElementById('rys-tooltip');
    if (!tooltip) return;

    for (const [elId, rysNazev] of Object.entries(MAPY)) {
      const el = document.getElementById(elId);
      if (!el) continue;

      el.addEventListener('mouseenter', (e) => {
        const popis = Traits.getPopis(rysNazev);
        const nazevEl = tooltip.querySelector('.rys-tooltip-nazev');
        const textEl  = tooltip.querySelector('.rys-tooltip-text');
        if (nazevEl) nazevEl.textContent = rysNazev;
        if (textEl)  textEl.textContent  = popis;
        tooltip.classList.add('viditelny');
        _nastavPoziciTooltipu(e, tooltip);
      });

      el.addEventListener('mousemove', (e) => {
        _nastavPoziciTooltipu(e, tooltip);
      });

      el.addEventListener('mouseleave', () => {
        tooltip.classList.remove('viditelny');
      });
    }
  }

  function nastavAktivniSpis(pripad) {
    const hlavicka = document.querySelector('#spis-hlavicka .spis-nazev');
    const telo = document.getElementById('spis-telo');
    if (!telo) return;

    if (!pripad) {
      if (hlavicka) hlavicka.textContent = 'Soudní síň č. 4';
      telo.innerHTML = '<div id="stul-prazdny">Vyberte případ ze složky.<br><small style="font-size:12px;opacity:0.6;">Otevřete složku s případem.</small></div>';
      return;
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
    nastavPocastiOkna,
    zobrazSuplikIndikator,
    animujPrichodSpisu,
    inicializujTooltipyRysu
  };

})();

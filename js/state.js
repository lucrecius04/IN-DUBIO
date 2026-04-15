/**
 * state.js — Jediný zdroj pravdy celé hry.
 * Singleton objekt. Nikdy nepřistupuj k herním datům jinde než přes State.
 */

const State = (() => {

  const VYCHOZI_STAV = {
    currentDay: 1,
    phase: 'morning',          // morning | forenoon | noon | afternoon | evening | night
    investigationActionsLeft: 2,

    traits: {
      Integrita: 50,
      Odvaha:    50,
      Moudrost:  50,
      Vina:      60,   // začínáme na 60 — Novák ví o svém hříchu
      Maska:     50,
      Nadeje:    50
    },

    factions: {
      Stat:        50,
      Obchodnici:  50,
      Lid:         50,
      Cirkev:      50
    },

    trust: {
      vlcek:     0,
      horakova:  0,
      masek:     1,   // starý přítel — začíná se základní důvěrou
      benes:     0,
      haas:      0
    },

    finance: {
      balance:        450,
      weeklyExpenses: 120,
      salary:         180     // přijde každých 7 dní
    },

    flags: {
      haas_envelope_opened:   false,
      benes_identified:       false,
      horakova_alliance:      false,
      vlcek_lunch_attended:   false,
      masek_document_signed:  false,
      pravda_odhalena:        false
    },

    archive: {
      verdicts:        [],   // { day, caseId, verdict, caseTitle }
      fragments:       [],   // id přečtených fragmentů
      characters_met:  []    // id postav se kterými hráč interagoval
    },

    // Interní: případy vyřešené dnes (reset každý den)
    casesResolvedToday: [],
    // Které průzkumné informace byly odkryty: { caseId: [infoId, ...] }
    revealedInfo: {},
    // Skryté proměnné pro konce
    gameOver:    false,
    endingType:  null    // 'odvolani' | 'korupce' | 'atentát' | 'preziti' | 'hrdina'
  };

  let _stav = JSON.parse(JSON.stringify(VYCHOZI_STAV));

  // --- Gettery ---

  function get(klic) {
    if (klic === undefined) return _stav;
    return _naviguj(_stav, klic);
  }

  function _naviguj(obj, cesta) {
    return cesta.split('.').reduce((acc, k) => (acc != null ? acc[k] : undefined), obj);
  }

  // --- Settery ---

  function set(klic, hodnota) {
    const cesty = klic.split('.');
    let cur = _stav;
    for (let i = 0; i < cesty.length - 1; i++) {
      cur = cur[cesty[i]];
    }
    cur[cesty[cesty.length - 1]] = hodnota;
  }

  // --- Uložení / načtení ---

  function uloz() {
    try {
      localStorage.setItem('indubio_save', JSON.stringify(_stav));
    } catch (e) {
      console.warn('Nelze uložit stav:', e);
    }
  }

  function nacti() {
    try {
      const ulozeny = localStorage.getItem('indubio_save');
      if (ulozeny) {
        _stav = JSON.parse(ulozeny);
        return true;
      }
    } catch (e) {
      console.warn('Nelze načíst stav:', e);
    }
    return false;
  }

  function reset() {
    _stav = JSON.parse(JSON.stringify(VYCHOZI_STAV));
    localStorage.removeItem('indubio_save');
  }

  // --- Pomocné metody pro časté operace ---

  function upravRys(nazev, delta) {
    const aktualni = _stav.traits[nazev] ?? 50;
    _stav.traits[nazev] = Math.max(0, Math.min(100, aktualni + delta));
  }

  function upravFrakci(nazev, delta) {
    const aktualni = _stav.factions[nazev] ?? 50;
    _stav.factions[nazev] = Math.max(0, Math.min(100, aktualni + delta));
  }

  function upravDuveru(npcId, delta) {
    const aktualni = _stav.trust[npcId] ?? 0;
    _stav.trust[npcId] = Math.max(0, Math.min(3, aktualni + delta));
  }

  function upravFinance(delta) {
    _stav.finance.balance = Math.round(_stav.finance.balance + delta);
  }

  function pridejRozsudek(zaznam) {
    // zaznam: { day, caseId, verdict, caseTitle }
    _stav.archive.verdicts.push(zaznam);
    _stav.casesResolvedToday.push(zaznam.caseId);
  }

  function oznacFragment(id) {
    if (!_stav.archive.fragments.includes(id)) {
      _stav.archive.fragments.push(id);
    }
  }

  function oznacPostavuPotkanu(id) {
    if (!_stav.archive.characters_met.includes(id)) {
      _stav.archive.characters_met.push(id);
    }
  }

  function odhalInfoPripadu(caseId, infoId) {
    if (!_stav.revealedInfo[caseId]) _stav.revealedInfo[caseId] = [];
    if (!_stav.revealedInfo[caseId].includes(infoId)) {
      _stav.revealedInfo[caseId].push(infoId);
    }
  }

  function jeInfoOdhaleno(caseId, infoId) {
    return (_stav.revealedInfo[caseId] ?? []).includes(infoId);
  }

  function resetDen() {
    _stav.casesResolvedToday = [];
    _stav.investigationActionsLeft = 2;
    _stav.phase = 'morning';
    // Týdenní plat
    if (_stav.currentDay > 1 && (_stav.currentDay - 1) % 7 === 0) {
      upravFinance(_stav.finance.salary);
    }
    // Týdenní výdaje
    if (_stav.currentDay % 7 === 0) {
      upravFinance(-_stav.finance.weeklyExpenses);
    }
  }

  function dalsiDen() {
    resetDen();
    _stav.currentDay += 1;
  }

  return {
    get,
    set,
    uloz,
    nacti,
    reset,
    upravRys,
    upravFrakci,
    upravDuveru,
    upravFinance,
    pridejRozsudek,
    oznacFragment,
    oznacPostavuPotkanu,
    odhalInfoPripadu,
    jeInfoOdhaleno,
    resetDen,
    dalsiDen
  };

})();

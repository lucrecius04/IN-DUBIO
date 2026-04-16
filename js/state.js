/**
 * state.js — Jediný zdroj pravdy celé hry.
 * Singleton objekt. Nikdy nepřistupuj k herním datům jinde než přes State.
 */

const State = (() => {

  const SAVE_LEGACY = 'indubio_save';
  /** Poslední běžící stav — přepisuje každé `State.uloz()` bez čísla slotu. */
  const SAVE_AUTOSAVE = 'indubio_autosave';

  function _klicePozice(n) {
    return 'indubio_save_' + n;
  }

  function _normalizujPozici(p) {
    const x = Number(p);
    return x === 2 ? 2 : 1;
  }

  function _migrujStarySave() {
    try {
      const leg = localStorage.getItem(SAVE_LEGACY);
      if (!leg) return;
      const k1 = _klicePozice(1);
      if (!localStorage.getItem(k1)) localStorage.setItem(k1, leg);
      localStorage.removeItem(SAVE_LEGACY);
    } catch (_) { /* ignore */ }
  }

  /** Jednorázově: starý model bez autosave — vyplníme autosave z nejnovějšího ručního slotu (podle dne). */
  function _migrujAutosaveZeSlotu() {
    try {
      localStorage.removeItem('indubio_last_save_slot');
    } catch (_) { /* ignore */ }
    try {
      if (localStorage.getItem(SAVE_AUTOSAVE)) return;
      let bestRaw = null;
      let bestDay = -1;
      for (const t of [1, 2]) {
        const raw = localStorage.getItem(_klicePozice(t));
        if (!raw || !String(raw).trim()) continue;
        try {
          const d = JSON.parse(raw);
          const day = Number(d && d.currentDay);
          const dn = Number.isFinite(day) && day >= 1 ? day : 0;
          if (dn > bestDay) {
            bestDay = dn;
            bestRaw = raw;
          }
        } catch (_) { /* skip */ }
      }
      if (bestRaw) localStorage.setItem(SAVE_AUTOSAVE, bestRaw);
    } catch (_) { /* ignore */ }
  }

  function _nactiRawDoStavu(raw) {
    _stav = JSON.parse(raw);
    let d = Number(_stav.currentDay);
    if (!Number.isFinite(d) || d < 1) _stav.currentDay = 1;
    _normalizujArchivNpc();
    _normalizujUsedCaseIds();
  }

  /** Při startu: autosave → ruční slot 1 → slot 2. */
  function _najdiPrvniObsazenyZdroj() {
    const auto = localStorage.getItem(SAVE_AUTOSAVE);
    if (auto && String(auto).trim()) return { typ: 'auto', raw: auto };
    for (const t of [1, 2]) {
      const raw = localStorage.getItem(_klicePozice(t));
      if (raw && String(raw).trim()) return { typ: 'slot', slot: t, raw };
    }
    return null;
  }

  const VYCHOZI_STAV = {
    currentDay: 1,
    phase: 'morning',          // morning | forenoon | noon | afternoon | evening | night
    investigationActionsLeft: 2,

    traits: {
      Integrita: 70,
      Odvaha:    50,
      Moudrost:  55,
      Vina:      60,   // min. 1 — viz upravRys (GDD)
      Maska:     45,
      Nadeje:    60
    },

    factions: {
      Stat:        50,
      Obchodnici:  50,
      Lid:         50,
      Cirkev:      50
    },

    trust: {
      vlcek:     1,
      horakova:  0,
      masek:     2,
      benes:     0,
      haas:      0
    },

    finance: {
      balance:        150,
      weeklyExpenses: 60,
      salary:         80     // přijde každých 7 dní (GDD)
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
      verdicts:          [],   // { day, caseId, verdict, caseTitle }
      fragments:         [],   // id přečtených fragmentů
      characters_met:    [],   // id postav se kterými hráč interagoval
      npc_interactions:  [],   // { npcId, day, label } — historie setkání
      npc_last_words:    {}    // npcId → { day, text } — poslední dialog
    },

    // Interní: případy vyřešené dnes (reset každý den)
    casesResolvedToday: [],
    /** ID případů už vyřešených v tomto runu — náhodný pool je bez nich (fixed sloty výjimka). */
    usedCaseIds: [],
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

  /**
   * @param {number} [pozice] 1 nebo 2 — bez argumentu uloží jen automatické uložení (`indubio_autosave`).
   * Ruční záloha: vždy `State.uloz(1)` nebo `State.uloz(2)`.
   * @returns {boolean} false při chybě zápisu (soukromé okno, zaplněné úložiště, file:// …)
   */
  function uloz(pozice) {
    try {
      _migrujStarySave();
      _migrujAutosaveZeSlotu();
      if (pozice === undefined || pozice === null) {
        localStorage.setItem(SAVE_AUTOSAVE, JSON.stringify(_stav));
        return true;
      }
      const p = _normalizujPozici(pozice);
      localStorage.setItem(_klicePozice(p), JSON.stringify(_stav));
      return true;
    } catch (e) {
      console.warn('Nelze uložit stav:', e);
      return false;
    }
  }

  /**
   * @param {number} [pozice] 1 nebo 2 — načte ruční zálohu z daného slotu.
   * Bez argumentu: automatické uložení, jinak první neprázdná ruční záloha (1 → 2) — pro start hry.
   */
  function nacti(pozice) {
    try {
      _migrujStarySave();
      _migrujAutosaveZeSlotu();
      if (pozice !== undefined && pozice !== null) {
        const p = _normalizujPozici(pozice);
        const ulozeny = localStorage.getItem(_klicePozice(p));
        if (!ulozeny || !String(ulozeny).trim()) return false;
        _nactiRawDoStavu(ulozeny);
        return true;
      }
      const zdroj = _najdiPrvniObsazenyZdroj();
      if (!zdroj) return false;
      _nactiRawDoStavu(zdroj.raw);
      return true;
    } catch (e) {
      console.warn('Nelze načíst stav:', e);
    }
    return false;
  }

  /** Načte pouze automatické uložení (bez náhrady ze slotů). */
  function nactiJenAutosave() {
    try {
      _migrujStarySave();
      _migrujAutosaveZeSlotu();
      const raw = localStorage.getItem(SAVE_AUTOSAVE);
      if (!raw || !String(raw).trim()) return false;
      _nactiRawDoStavu(raw);
      return true;
    } catch (e) {
      console.warn('Nelze načíst autosave:', e);
    }
    return false;
  }

  function _normalizujUsedCaseIds() {
    if (!Array.isArray(_stav.usedCaseIds)) _stav.usedCaseIds = [];
  }

  function pridejPouzityPripad(id) {
    if (!id) return;
    _normalizujUsedCaseIds();
    if (!_stav.usedCaseIds.includes(id)) _stav.usedCaseIds.push(id);
  }

  /**
   * Náhled uložené hry — nemění běžící stav.
   * @param {number} pozice 1 nebo 2
   */
  function peekUlozene(pozice) {
    try {
      _migrujStarySave();
      _migrujAutosaveZeSlotu();
      const p = _normalizujPozici(pozice);
      const raw = localStorage.getItem(_klicePozice(p));
      if (raw == null || String(raw).trim() === '') return null;
      const data = JSON.parse(raw);
      if (data == null || typeof data !== 'object' || Array.isArray(data)) return null;
      let day = Number(data.currentDay);
      if (!Number.isFinite(day) || day < 1) day = 1;
      return { currentDay: day };
    } catch (e) {
      console.warn('Nelze přečíst uloženou hru:', e);
      return null;
    }
  }

  function peekAutosave() {
    try {
      _migrujStarySave();
      _migrujAutosaveZeSlotu();
      const raw = localStorage.getItem(SAVE_AUTOSAVE);
      if (raw == null || String(raw).trim() === '') return null;
      const data = JSON.parse(raw);
      if (data == null || typeof data !== 'object' || Array.isArray(data)) return null;
      let day = Number(data.currentDay);
      if (!Number.isFinite(day) || day < 1) day = 1;
      return { currentDay: day };
    } catch (e) {
      console.warn('Nelze přečíst autosave:', e);
      return null;
    }
  }

  function _normalizujArchivNpc() {
    if (!_stav.archive) return;
    if (!Array.isArray(_stav.archive.npc_interactions)) {
      _stav.archive.npc_interactions = [];
    }
    if (!_stav.archive.npc_last_words || typeof _stav.archive.npc_last_words !== 'object') {
      _stav.archive.npc_last_words = {};
    }
  }

  function _zarucArchiveNpcLog() {
    if (!_stav.archive.npc_interactions) _stav.archive.npc_interactions = [];
    if (!_stav.archive.npc_last_words || typeof _stav.archive.npc_last_words !== 'object') {
      _stav.archive.npc_last_words = {};
    }
  }

  /** Záznam: { npcId, day, summary, fullText } — summary = krátký řádek v historii, fullText = text do vnořeného popupu */
  function zalogujNpcSetkani(npcId, day, summary, fullText) {
    _zarucArchiveNpcLog();
    _stav.archive.npc_interactions.push({
      npcId,
      day: Number(day),
      summary: String(summary || ''),
      fullText: String(fullText != null ? fullText : '')
    });
  }

  function zapisNpcPosledniDialog(npcId, day, text) {
    _zarucArchiveNpcLog();
    _stav.archive.npc_last_words[npcId] = {
      day: Number(day),
      text: String(text || '')
    };
  }

  function reset() {
    _stav = JSON.parse(JSON.stringify(VYCHOZI_STAV));
    localStorage.removeItem(SAVE_LEGACY);
    localStorage.removeItem(SAVE_AUTOSAVE);
    localStorage.removeItem(_klicePozice(1));
    localStorage.removeItem(_klicePozice(2));
  }

  // --- Pomocné metody pro časté operace ---

  function upravRys(nazev, delta) {
    const aktualni = _stav.traits[nazev] ?? 50;
    let nova = Math.max(0, Math.min(100, aktualni + delta));
    if (nazev === 'Vina') {
      nova = Math.max(1, Math.min(100, nova));
    }
    _stav.traits[nazev] = nova;
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
    nactiJenAutosave,
    peekUlozene,
    peekAutosave,
    reset,
    upravRys,
    upravFrakci,
    upravDuveru,
    upravFinance,
    pridejRozsudek,
    oznacFragment,
    oznacPostavuPotkanu,
    zalogujNpcSetkani,
    zapisNpcPosledniDialog,
    odhalInfoPripadu,
    jeInfoOdhaleno,
    resetDen,
    dalsiDen,
    pridejPouzityPripad
  };

})();

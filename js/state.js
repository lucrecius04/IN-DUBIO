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

  function _zarucArchivVerdikty() {
    if (!_stav.archive || typeof _stav.archive !== 'object') {
      _stav.archive = {
        verdicts: [],
        fragments: [],
        characters_met: [],
        npc_interactions: [],
        npc_last_words: {}
      };
    }
    if (!Array.isArray(_stav.archive.verdicts)) _stav.archive.verdicts = [];
  }

  function _nactiRawDoStavu(raw) {
    _stav = JSON.parse(raw);
    let d = Number(_stav.currentDay);
    if (!Number.isFinite(d) || d < 1) _stav.currentDay = 1;
    _zarucArchivVerdikty();
    _normalizujArchivNpc();
    _normalizujUsedCaseIds();
    _normalizujCluePairsMatched();
    _normalizujClueConfirmations();
    _zarucRozhodovaciStyl();
    _zarucTydenniRozsireni();
    _zarucEkonomiku();
    _normalizujTraitsFrakceATrust();
  }

  function _zarucEkonomiku() {
    if (!_stav.flags || typeof _stav.flags !== 'object') _stav.flags = {};
    if (!_stav.finance || typeof _stav.finance !== 'object') {
      _stav.finance = { balance: 150, dluh: 0, vyplataPrijataVDnech: [] };
    }
    if (!Number.isFinite(Number(_stav.finance.balance))) _stav.finance.balance = 150;
    if (!Number.isFinite(Number(_stav.finance.dluh))) _stav.finance.dluh = 0;
    if (!Array.isArray(_stav.finance.vyplataPrijataVDnech)) _stav.finance.vyplataPrijataVDnech = [];
    delete _stav.finance.weeklyExpenses;
    delete _stav.finance.salary;
    if (!_stav.trust || typeof _stav.trust !== 'object') _stav.trust = {};
    const F = [
      'dopis_operace_den8_viden', 'operace_zaplacena', 'operace_odlozena',
      'haas_nabidka_den23_vyresena', 'uplatek_prijat', 'bankrot_varovani_zobrazeno',
      'dluh_pribeh_spusten'
    ];
    for (const k of F) {
      if (typeof _stav.flags[k] !== 'boolean') _stav.flags[k] = false;
    }
    if (_stav.flags.karas_dluh_do_dne != null && typeof _stav.flags.karas_dluh_do_dne !== 'number') {
      const x = Number(_stav.flags.karas_dluh_do_dne);
      _stav.flags.karas_dluh_do_dne = Number.isFinite(x) ? x : null;
    }
    if (_stav.flags.lepsi_lekar_do_dne != null && typeof _stav.flags.lepsi_lekar_do_dne !== 'number') {
      const x = Number(_stav.flags.lepsi_lekar_do_dne);
      _stav.flags.lepsi_lekar_do_dne = Number.isFinite(x) ? x : null;
    }
    if (_stav.tydenni_statistiky && typeof _stav.tydenni_statistiky.uplatek_prijat === 'boolean' &&
        _stav.tydenni_statistiky.uplatek_prijat) {
      _stav.flags.uplatek_prijat = true;
    }
  }

  /** Migrace: frakce Moc/Kapital/Lid; důvěra jen vlcek, zavadova, karas. */
  function _normalizujTraitsFrakceATrust() {
    if (!_stav.traits || typeof _stav.traits !== 'object') _stav.traits = {};
    const TR = ['Integrita', 'Odvaha', 'Moudrost', 'Vina', 'Nadeje'];
    for (const k of Object.keys(_stav.traits)) {
      if (!TR.includes(k)) delete _stav.traits[k];
    }
    for (const k of TR) {
      const v = Number(_stav.traits[k]);
      if (!Number.isFinite(v)) _stav.traits[k] = VYCHOZI_STAV.traits[k];
    }

    const f = _stav.factions && typeof _stav.factions === 'object' ? _stav.factions : {};
    const moc = Number.isFinite(Number(f.Moc)) ? Number(f.Moc) : (Number.isFinite(Number(f.Stat)) ? Number(f.Stat) : 50);
    const kap = Number.isFinite(Number(f.Kapital)) ? Number(f.Kapital)
      : (Number.isFinite(Number(f.Obchodnici)) ? Number(f.Obchodnici) : 50);
    const lid = Number.isFinite(Number(f.Lid)) ? Number(f.Lid) : 50;
    const clampF = x => Math.max(0, Math.min(100, Math.round(x)));
    _stav.factions = { Moc: clampF(moc), Kapital: clampF(kap), Lid: clampF(lid) };

    const t = _stav.trust && typeof _stav.trust === 'object' ? _stav.trust : {};
    const clampT = x => Math.max(0, Math.min(3, Math.round(Number(x))));
    const vl = Number.isFinite(Number(t.vlcek)) ? clampT(t.vlcek) : 1;
    const zv = Number.isFinite(Number(t.zavadova)) ? clampT(t.zavadova) : 0;
    const ka = Number.isFinite(Number(t.karas)) ? clampT(t.karas) : 2;
    _stav.trust = { vlcek: vl, zavadova: zv, karas: ka };
  }

  function _vychoziTydenniStatistiky() {
    return {
      /** Počet úspěšných průzkumných akcí (každé nové odhalení v případu). */
      pruzkum_pouzit: 0,
      /** Uzavřené případy týdne, kde byl aspoň jednou použit průzkum (bonus A). */
      pripady_s_prurzkumem: 0,
      pripady_celkem: 0,
      uplatek_prijat: false,
      pripady_odlozeny: 0,
      tezke_rozsudky: 0,
      verdikty_smer: []
    };
  }

  function _zarucTydenniRozsireni() {
    if (!_stav.tydenni_statistiky || typeof _stav.tydenni_statistiky !== 'object') {
      _stav.tydenni_statistiky = _vychoziTydenniStatistiky();
    } else {
      const v = _stav.tydenni_statistiky;
      if (!Number.isFinite(Number(v.pruzkum_pouzit))) v.pruzkum_pouzit = 0;
      if (!Number.isFinite(Number(v.pripady_s_prurzkumem))) v.pripady_s_prurzkumem = 0;
      if (!Number.isFinite(Number(v.pripady_celkem))) v.pripady_celkem = 0;
      if (typeof v.uplatek_prijat !== 'boolean') v.uplatek_prijat = false;
      if (!Number.isFinite(Number(v.pripady_odlozeny))) v.pripady_odlozeny = 0;
      if (!Number.isFinite(Number(v.tezke_rozsudky))) v.tezke_rozsudky = 0;
      if (!Array.isArray(v.verdikty_smer)) v.verdikty_smer = [];
    }
    let nm = Number(_stav.tydenni_nasobek_moudrosti);
    if (!Number.isFinite(nm) || (nm !== 1 && nm !== 1.5)) {
      _stav.tydenni_nasobek_moudrosti = 1;
    }
    if (_stav.nedele_volba != null && _stav.nedele_volba !== 'A' && _stav.nedele_volba !== 'B' &&
        _stav.nedele_volba !== 'C' && _stav.nedele_volba !== 'D' && _stav.nedele_volba !== 'E') {
      _stav.nedele_volba = null;
    }
    if (typeof _stav.pondeli_moudrost_extra !== 'boolean') _stav.pondeli_moudrost_extra = false;
    if (typeof _stav.pondeli_vina_emotivni !== 'boolean') _stav.pondeli_vina_emotivni = false;
  }

  function _zarucRozhodovaciStyl() {
    if (!_stav.rozhodovaci_styl || typeof _stav.rozhodovaci_styl !== 'object') {
      _stav.rozhodovaci_styl = {
        fair_lid_streak: 0,
        tough_stat_streak: 0,
        investigation_streak: 0,
        no_investigation_streak: 0
      };
      return;
    }
    const z = _stav.rozhodovaci_styl;
    for (const k of ['fair_lid_streak', 'tough_stat_streak', 'investigation_streak', 'no_investigation_streak']) {
      if (!Number.isFinite(Number(z[k]))) z[k] = 0;
    }
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
    investigationActionsLeft: 10,

    traits: {
      Integrita: 70,
      Odvaha:    50,
      Moudrost:  55,
      Vina:      60,   // min. 1 — viz upravRys (GDD)
      Nadeje:    60
    },

    factions: {
      Moc:     50,
      Kapital: 50,
      Lid:     50
    },

    trust: {
      vlcek:    1,
      zavadova: 0,
      karas:    2
    },

    finance: {
      balance: 150,
      /** Kumulovaný dluh (nájem apod.). */
      dluh: 0,
      /** Dny (7,14,21,28), ve kterých už proběhla nedělní výplata +80 Kč. */
      vyplataPrijataVDnech: []
    },

    flags: {
      haas_envelope_opened:   false,
      benes_identified:       false,
      horakova_alliance:      false,
      vlcek_lunch_attended:   false,
      masek_document_signed:  false,
      pravda_odhalena:        false,
      dopis_operace_den8_viden: false,
      operace_zaplacena:      false,
      operace_odlozena:       false,
      haas_nabidka_den23_vyresena: false,
      /** Splacení půjčky u Karase — den, do kdy. */
      karas_dluh_do_dne:      null,
      /** Naděje +2/den od zítřka do tohoto dne (včetně). */
      lepsi_lekar_do_dne:     null,
      uplatek_prijat:         false,
      bankrot_varovani_zobrazeno: false,
      dluh_pribeh_spusten:    false
    },

    archive: {
      verdicts:          [],   // { day, caseId, verdict, caseTitle, verdictId?, consequences?, dusledkyRadky? }
      fragments:         [],   // id přečtených fragmentů
      characters_met:    [],   // id postav se kterými hráč interagoval
      npc_interactions:  [],   // { npcId, day, label } — historie setkání
      npc_last_words:    {}    // npcId → { day, text } — poslední dialog
    },

    // Interní: případy vyřešené dnes (reset každý den)
    casesResolvedToday: [],
    /** ID případů už vyřešených v tomto runu — náhodný pool je bez nich (fixed sloty výjimka). */
    usedCaseIds: [],
    /** Nalezené Two-Click páry podle případu: { caseId: [pairId, ...] } */
    cluePairsMatched: {},
    /** Potvrzená dvojice stopy v případu: { caseId: { pairId, strength, aId, bId } } */
    clueConfirmations: {},
    // Které průzkumné informace byly odkryty: { caseId: [infoId, ...] }
    revealedInfo: {},
    /**
     * Skryté vzorce rozhodování (streaky). Hráč je nevidí — ovlivňují pasivní bonusy a růst Moudrosti.
     */
    rozhodovaci_styl: {
      fair_lid_streak: 0,
      tough_stat_streak: 0,
      investigation_streak: 0,
      no_investigation_streak: 0
    },

    /** Po–So: metriky pro sobotní vyhodnocení; v neděli ráno se mažou (násobek Moudrosti zůstává do sobotního přepočtu). */
    tydenni_statistiky: {
      pruzkum_pouzit: 0,
      pripady_s_prurzkumem: 0,
      pripady_celkem: 0,
      uplatek_prijat: false,
      pripady_odlozeny: 0,
      tezke_rozsudky: 0,
      verdikty_smer: []
    },
    /** 1 nebo 1,5 — bonus D; nastavuje se v sobotu večer. */
    tydenni_nasobek_moudrosti: 1,
    /** Poslední nedělní volba A–E (pondělní důsledky). */
    nedele_volba: null,
    pondeli_moudrost_extra: false,
    pondeli_vina_emotivni: false,

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

  function _normalizujCluePairsMatched() {
    if (!_stav.cluePairsMatched || typeof _stav.cluePairsMatched !== 'object') {
      _stav.cluePairsMatched = {};
      return;
    }
    for (const [cid, arr] of Object.entries(_stav.cluePairsMatched)) {
      if (!Array.isArray(arr)) {
        _stav.cluePairsMatched[cid] = [];
        continue;
      }
      _stav.cluePairsMatched[cid] = arr
        .map(x => String(x || '').trim())
        .filter(Boolean);
    }
  }

  function _normalizujClueConfirmations() {
    if (!_stav.clueConfirmations || typeof _stav.clueConfirmations !== 'object') {
      _stav.clueConfirmations = {};
      return;
    }
    for (const [cid, rec] of Object.entries(_stav.clueConfirmations)) {
      if (!rec || typeof rec !== 'object') {
        delete _stav.clueConfirmations[cid];
        continue;
      }
      const out = {
        pairId: String(rec.pairId || '').trim(),
        strength: String(rec.strength || '').trim(),
        aId: String(rec.aId || '').trim(),
        bId: String(rec.bId || '').trim()
      };
      if (!out.pairId || !out.strength) {
        delete _stav.clueConfirmations[cid];
        continue;
      }
      _stav.clueConfirmations[cid] = out;
    }
  }

  function pridejPouzityPripad(id) {
    if (id == null || id === '') return;
    const s = String(id);
    _normalizujUsedCaseIds();
    if (!_stav.usedCaseIds.some(x => String(x) === s)) _stav.usedCaseIds.push(s);
  }

  /** Je případ uzavřený rozsudkem (dnes, v archivu, nebo v usedCaseIds — vždy přes String). */
  function jePripadUzavren(caseId) {
    if (caseId == null || caseId === '') return false;
    const id = String(caseId).trim();
    if (!id) return false;
    const dnes = _stav.casesResolvedToday || [];
    if (dnes.some(x => String(x).trim() === id)) return true;
    const arch = _stav.archive && _stav.archive.verdicts;
    if (Array.isArray(arch) && arch.some(v => v && String(v.caseId ?? v.case_id ?? '').trim() === id)) return true;
    const used = _stav.usedCaseIds || [];
    if (used.some(x => String(x).trim() === id)) return true;
    return false;
  }

  function jeClueParNalezen(caseId, pairId) {
    if (caseId == null || pairId == null) return false;
    const cid = String(caseId).trim();
    const pid = String(pairId).trim();
    if (!cid || !pid) return false;
    _normalizujCluePairsMatched();
    const arr = _stav.cluePairsMatched[cid] || [];
    return arr.some(x => String(x).trim() === pid);
  }

  /**
   * @returns {boolean} true pouze při prvním záznamu páru (idempotentní zápis).
   */
  function oznacClueParNalezen(caseId, pairId) {
    if (caseId == null || pairId == null) return false;
    const cid = String(caseId).trim();
    const pid = String(pairId).trim();
    if (!cid || !pid) return false;
    _normalizujCluePairsMatched();
    if (!Array.isArray(_stav.cluePairsMatched[cid])) _stav.cluePairsMatched[cid] = [];
    const arr = _stav.cluePairsMatched[cid];
    if (arr.some(x => String(x).trim() === pid)) return false;
    arr.push(pid);
    return true;
  }

  function ziskejCluePotvrzeni(caseId) {
    if (caseId == null) return null;
    const cid = String(caseId).trim();
    if (!cid) return null;
    _normalizujClueConfirmations();
    return _stav.clueConfirmations[cid] || null;
  }

  function nastavCluePotvrzeni(caseId, potvrzeni) {
    if (caseId == null || !potvrzeni || typeof potvrzeni !== 'object') return false;
    const cid = String(caseId).trim();
    const pairId = String(potvrzeni.pairId || '').trim();
    const strength = String(potvrzeni.strength || '').trim();
    const aId = String(potvrzeni.aId || '').trim();
    const bId = String(potvrzeni.bId || '').trim();
    if (!cid || !pairId || !strength) return false;
    _normalizujClueConfirmations();
    _stav.clueConfirmations[cid] = { pairId, strength, aId, bId };
    return true;
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
    _normalizujTraitsFrakceATrust();
    _zarucRozhodovaciStyl();
    _zarucTydenniRozsireni();
    localStorage.removeItem(SAVE_LEGACY);
    localStorage.removeItem(SAVE_AUTOSAVE);
    localStorage.removeItem(_klicePozice(1));
    localStorage.removeItem(_klicePozice(2));
    try {
      if (typeof Desk !== 'undefined' && typeof Desk.vyresetujCacheObalkyStolu === 'function') {
        Desk.vyresetujCacheObalkyStolu();
      }
    } catch (_e) {
      /* Desk nemusí být inicializovaný při velmi raném resetu */
    }
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

  const _DUVERA_NPC = { vlcek: true, zavadova: true, karas: true };

  function upravDuveru(npcId, delta) {
    if (!_DUVERA_NPC[npcId]) return;
    const aktualni = _stav.trust[npcId] ?? 0;
    _stav.trust[npcId] = Math.max(0, Math.min(3, aktualni + delta));
  }

  function upravFinance(delta) {
    _stav.finance.balance = Math.round(Number(_stav.finance.balance || 0) + delta);
  }

  function upravDluh(delta) {
    _zarucEkonomiku();
    _stav.finance.dluh = Math.max(0, Math.round(Number(_stav.finance.dluh || 0) + delta));
  }

  function pridejRozsudek(zaznam) {
    if (!zaznam || typeof zaznam !== 'object') return;
    const raw = zaznam.caseId != null ? zaznam.caseId : zaznam.case_id;
    const cid = raw != null && raw !== '' ? String(raw).trim() : '';
    if (!cid) {
      console.warn('[State] pridejRozsudek: záznam bez platného caseId', zaznam);
      return;
    }
    _zarucArchivVerdikty();
    _stav.archive.verdicts.push({ ...zaznam, caseId: cid });
    _stav.casesResolvedToday.push(cid);
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
    _zarucTydenniRozsireni();
    if (!_stav.revealedInfo[caseId]) _stav.revealedInfo[caseId] = [];
    const arr = _stav.revealedInfo[caseId];
    if (arr.includes(infoId)) return;
    arr.push(infoId);

    const den = Number(_stav.currentDay);
    if (!Number.isFinite(den) || den % 7 === 0) return;

    const t = _stav.tydenni_statistiky;
    t.pruzkum_pouzit = (Number(t.pruzkum_pouzit) || 0) + 1;
  }

  function jeInfoOdhaleno(caseId, infoId) {
    return (_stav.revealedInfo[caseId] ?? []).includes(infoId);
  }

  function resetDen() {
    _stav.casesResolvedToday = [];
    _stav.investigationActionsLeft = 10;
    _stav.phase = 'morning';
    _zarucEkonomiku();
    const den = Number(_stav.currentDay);
    // Pevné denní výdaje −55 Kč za každý dokončený den (při přechodu na další den).
    if (Number.isFinite(den) && den >= 1) {
      const pred = Number(_stav.finance.balance) || 0;
      upravFinance(-55);
      if (pred < 0) {
        upravDluh(20);
      }
    }
  }

  function aplikujPasivniBonusyRozhodovacihoStylu() {
    _zarucRozhodovaciStyl();
    const rs = _stav.rozhodovaci_styl;
    if ((rs.fair_lid_streak || 0) >= 3) {
      upravFrakci('Lid', 2);
    }
    if ((rs.tough_stat_streak || 0) >= 3) {
      upravFrakci('Moc', 2);
    }
  }

  function dalsiDen() {
    resetDen();
    _stav.currentDay += 1;
    aplikujPasivniBonusyRozhodovacihoStylu();
  }

  /** Nedělní začátek pracovního týdne — jen statistiky, bez násobitele Moudrosti a bez rozhodovacího stylu. */
  function resetTydenniStatistikyNedele() {
    _zarucTydenniRozsireni();
    _stav.tydenni_statistiky = _vychoziTydenniStatistiky();
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
    upravDluh,
    pridejRozsudek,
    oznacFragment,
    oznacPostavuPotkanu,
    zalogujNpcSetkani,
    zapisNpcPosledniDialog,
    odhalInfoPripadu,
    jeInfoOdhaleno,
    resetDen,
    dalsiDen,
    pridejPouzityPripad,
    jePripadUzavren,
    jeClueParNalezen,
    oznacClueParNalezen,
    ziskejCluePotvrzeni,
    nastavCluePotvrzeni,
    resetTydenniStatistikyNedele
  };

})();

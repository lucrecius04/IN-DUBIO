/**
 * state.js — Jediný zdroj pravdy celé hry.
 * Singleton objekt. Nikdy nepřistupuj k herním datům jinde než přes State.
 */

const State = (() => {

  const SAVE_LEGACY = 'indubio_save';
  /** Poslední běžící stav — přepisuje každé `State.uloz()` bez čísla slotu. */
  const SAVE_AUTOSAVE = 'indubio_autosave';
  /** Počet ručních záloh v localStorage (`indubio_save_1` … `indubio_save_N`). */
  const POCET_RUCNICH_ULOZENI = 5;

  function _klicePozice(n) {
    return 'indubio_save_' + n;
  }

  function _normalizujPozici(p) {
    const x = Math.floor(Number(p));
    if (!Number.isFinite(x)) return 1;
    return Math.min(POCET_RUCNICH_ULOZENI, Math.max(1, x));
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
      for (let t = 1; t <= POCET_RUCNICH_ULOZENI; t++) {
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
        case_reviews: [],
        fragments: [],
        characters_met: [],
        npc_interactions: [],
        npc_last_words: {}
      };
    }
    if (!Array.isArray(_stav.archive.verdicts)) _stav.archive.verdicts = [];
    if (!Array.isArray(_stav.archive.case_reviews)) _stav.archive.case_reviews = [];
    if (!Array.isArray(_stav.archive.fragments)) _stav.archive.fragments = [];
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
    _normalizujClueFocusByCase();
    _normalizujCluePatraniSession();
    _normalizujReviewQueue();
    _zarucRozhodovaciStyl();
    _zarucTydenniRozsireni();
    _zarucEkonomiku();
    _zarucUzloveFlagy();
    _normalizujTraitsFrakceATrust();
    _normalizujSettings();
    _normalizujStatsDisplay();
  }

  function _normalizujSettings() {
    if (!_stav.settings || typeof _stav.settings !== 'object') {
      _stav.settings = { patraniNaCas: false };
    }
    if (typeof _stav.settings.patraniNaCas !== 'boolean') {
      _stav.settings.patraniNaCas = false;
    }
  }

  function _normalizujStatsDisplay() {
    const povolene = ['intuitive', 'hybrid', 'spreadsheet'];
    let m = String(_stav.statsDisplayMode || '').trim();
    if (!povolene.includes(m)) m = 'hybrid';
    _stav.statsDisplayMode = m;
    if (typeof _stav.flags.stats_display_unlocked !== 'boolean') {
      _stav.flags.stats_display_unlocked = _stav.gameOver === true;
    } else if (_stav.gameOver === true) {
      _stav.flags.stats_display_unlocked = true;
    }
  }

  function _zarucUzloveFlagy() {
    const defaults = {
      vlcek_vztah: 'neutral',
      haas_kontakt: 'odmitnut',
      benes_pravda: 'nezna',
      osobni_cena: 'nerozhodl'
    };
    if (!_stav.uzlove || typeof _stav.uzlove !== 'object') {
      _stav.uzlove = { ...defaults };
      return;
    }
    _stav.uzlove = Object.assign({}, defaults, _stav.uzlove);
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
      'dopis_operace_den8_viden', 'dopis_operace_den4_viden', 'operace_zaplacena', 'operace_odlozena',
      'operace_vyhodnoceni_den16_rano',
      'uplatek_prijat', 'bankrot_varovani_zobrazeno',
      'dluh_pribeh_spusten'
    ];
    for (const k of F) {
      if (typeof _stav.flags[k] !== 'boolean') _stav.flags[k] = false;
    }
    if (typeof _stav.flags.rano_bonus_inkoust_z_kavy !== 'boolean') {
      _stav.flags.rano_bonus_inkoust_z_kavy = false;
    }
    if (!Array.isArray(_stav.flags.povest_odemcene_ids)) {
      _stav.flags.povest_odemcene_ids = [];
    }
    const POVEST_ZAKLAD = ['svejda', 'kovarova', 'martin', 'karas', 'masek', 'vlcek'];
    const curP = _stav.flags.povest_odemcene_ids.slice();
    const mergedP = [];
    const seenP = new Set();
    for (const pid of POVEST_ZAKLAD) {
      if (!seenP.has(pid)) {
        seenP.add(pid);
        mergedP.push(pid);
      }
    }
    for (const pid of curP) {
      const mapId = pid === 'horakova' ? 'horackova' : pid;
      if (!seenP.has(mapId)) {
        seenP.add(mapId);
        mergedP.push(mapId);
      }
    }
    _stav.flags.povest_odemcene_ids = mergedP;
    if (_stav.flags.records_free_until_day != null) {
      const rf = Number(_stav.flags.records_free_until_day);
      _stav.flags.records_free_until_day = Number.isFinite(rf) ? rf : null;
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
    if (_stav.flags.horakova_alliance === true) {
      _stav.flags.zavadova_alliance = true;
    }
    if (typeof _stav.flags.zavadova_alliance !== 'boolean') {
      _stav.flags.zavadova_alliance = false;
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
    const NV = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    if (_stav.nedele_volba != null && !NV.includes(String(_stav.nedele_volba))) {
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

  /** Při startu: autosave → ruční sloty 1…N podle pořadí. */
  function _najdiPrvniObsazenyZdroj() {
    const auto = localStorage.getItem(SAVE_AUTOSAVE);
    if (auto && String(auto).trim()) return { typ: 'auto', raw: auto };
    for (let t = 1; t <= POCET_RUCNICH_ULOZENI; t++) {
      const raw = localStorage.getItem(_klicePozice(t));
      if (raw && String(raw).trim()) return { typ: 'slot', slot: t, raw };
    }
    return null;
  }

  const VYCHOZI_STAV = {
    currentDay: 1,
    phase: 'morning',          // morning | forenoon | noon | afternoon | evening | night
    investigationActionsLeft: 3,

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
      /** Dny (7,14,21,28), ve kterých už proběhla nedělní výplata +80 Kčs. */
      vyplataPrijataVDnech: []
    },

    flags: {
      haas_envelope_opened:   false,
      benes_identified:       false,
      horakova_alliance:      false,
      zavadova_alliance:      false,
      vlcek_lunch_attended:   false,
      masek_document_signed:  false,
      pravda_odhalena:        false,
      dopis_operace_den8_viden: false,
      dopis_operace_den4_viden: false,
      operace_zaplacena:      false,
      operace_odlozena:       false,
      /** Po ranním vyhodnocení termínu operace (den 16 / migrace starého save). */
      operace_vyhodnoceni_den16_rano: false,
      /** Splacení půjčky u Karase — den, do kdy. */
      karas_dluh_do_dne:      null,
      /** Naděje +2/den od zítřka do tohoto dne (včetně). */
      lepsi_lekar_do_dne:     null,
      uplatek_prijat:         false,
      bankrot_varovani_zobrazeno: false,
      dluh_pribeh_spusten:    false,
      /** Ráno po večerní kávě: +1 sdílená akce průzkumu (kapka inkoustu). */
      rano_bonus_inkoust_z_kavy: false,
      /** Záznamy v případech stojí 0 akcí do tohoto dne včetně (null = vypnuto). */
      records_free_until_day: null,
      /** Po dohrání běhu: nabídka režimu zobrazení statistik v menu. */
      stats_display_unlocked: false,
      /**
       * Pořadí odemčených id z data/postavy_okoli.json (zápisník → Pověst).
       * Základ = lidé, které Ben už zná (viz postavy_okoli od_zacatku).
       */
      povest_odemcene_ids: ['svejda', 'kovarova', 'martin', 'karas', 'masek', 'vlcek']
    },

    // Uzlové flagy — přepočítávány denně, nikdy ručně.
    uzlove: {
      vlcek_vztah: 'neutral',    // 'neutral' | 'kompromitovan' | 'vzdor'
      haas_kontakt: 'odmitnut',  // 'odmitnut' | 'otevren' | 'zavazany'
      benes_pravda: 'nezna',     // 'nezna' | 'prijal' | 'odmitl'
      osobni_cena: 'nerozhodl'   // 'nerozhodl' | 'zaplatil' | 'haasem' | 'odmitl'
    },

    archive: {
      verdicts:          [],   // { day, caseId, caseType?, verdict, caseTitle, verdictId?, consequences?, dusledkyRadky? }
      case_reviews:      [],   // { day, caseId, choice, effects, note }
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
    /** Soustředění u Two-Click: { caseId: { remaining: number, locked: boolean } } */
    clueFocusByCase: {},
    /**
     * Časované pátrání (clue) — persistuje stav mezi zavřením a znovuotevřením spisu.
     * { caseId: { hasRun, needsPaidRetry, extraDurationCut? } }
     */
    cluePatraniSession: {},
    // Které průzkumné informace byly odkryty: { caseId: [infoId, ...] }
    revealedInfo: {},
    /** U pool průzkumu: způsob odhalení { caseId: { infoId: 'official' | 'unofficial' } } */
    revealedInfoPath: {},
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
    /** Fronta krátkých revizí případů splatných v budoucích dnech. */
    reviewQueue: [],

    // Skryté proměnné pro konce
    gameOver:    false,
    endingType:  null,   // odvolani|korupce|atentát|preziti|hrdina|smireni|utek|rad|anna (variabilní D11+)
    /**
     * Režim zobrazení čísel u dopadů (archiv, kompaktní řádky, modál důsledků).
     * intuitive | hybrid (výchozí) | spreadsheet — přepínač v menu po dohrání.
     */
    statsDisplayMode: 'hybrid',
    /**
     * Nastavení hry.
     * patraniNaCas: true = časované pátrání (timed_hunt v datech), false = výchozí systém pokusů.
     */
    settings: {
      patraniNaCas: false
    }
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
   * @param {number} [pozice] 1…POCET_RUCNICH_ULOZENI — bez argumentu uloží jen automatické uložení (`indubio_autosave`).
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
   * @param {number} [pozice] číslo ručního slotu — načte zálohu z daného slotu.
   * Bez argumentu: automatické uložení, jinak první neprázdná ruční záloha (1…N) — pro start hry.
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

  function _normalizujClueFocusByCase() {
    if (!_stav.clueFocusByCase || typeof _stav.clueFocusByCase !== 'object') {
      _stav.clueFocusByCase = {};
      return;
    }
    for (const [cid, rec] of Object.entries(_stav.clueFocusByCase)) {
      if (!rec || typeof rec !== 'object') {
        delete _stav.clueFocusByCase[cid];
        continue;
      }
      const rem = Number(rec.remaining);
      _stav.clueFocusByCase[cid] = {
        remaining: Number.isFinite(rem) ? Math.max(0, Math.round(rem)) : 0,
        locked: !!rec.locked
      };
    }
  }

  function _normalizujCluePatraniSession() {
    if (!_stav.cluePatraniSession || typeof _stav.cluePatraniSession !== 'object') {
      _stav.cluePatraniSession = {};
    }
  }

  function _normalizujReviewQueue() {
    if (!Array.isArray(_stav.reviewQueue)) {
      _stav.reviewQueue = [];
      return;
    }
    const out = [];
    for (const raw of _stav.reviewQueue) {
      if (!raw || typeof raw !== 'object') continue;
      const caseId = String(raw.caseId || '').trim();
      const dueDay = Number(raw.dueDay);
      const originalDay = Number(raw.originalDay);
      if (!caseId || !Number.isFinite(dueDay) || !Number.isFinite(originalDay)) continue;
      out.push({
        id: String(raw.id || '').trim() || ('rev_' + caseId + '_' + originalDay + '_' + dueDay),
        caseId,
        caseTitle: String(raw.caseTitle || '').trim(),
        verdictId: String(raw.verdictId || '').trim(),
        verdictText: String(raw.verdictText || '').trim(),
        originalDay: Math.max(1, Math.round(originalDay)),
        dueDay: Math.max(1, Math.round(dueDay)),
        evidenceScore: Math.max(0, Math.min(100, Math.round(Number(raw.evidenceScore) || 0))),
        coherenceScore: Math.max(0, Math.min(100, Math.round(Number(raw.coherenceScore) || 0))),
        appealChance: Math.max(0, Math.min(100, Math.round(Number(raw.appealChance) || 0))),
        procesniKvalita: String(raw.procesniKvalita || '').trim(),
        hardVerdict: !!raw.hardVerdict,
        payload: raw.payload && typeof raw.payload === 'object' ? { ...raw.payload } : {}
      });
    }
    _stav.reviewQueue = out;
  }

  function ulozCluePatraniSession(caseId, patch) {
    const cid = String(caseId || '').trim();
    if (!cid || !patch || typeof patch !== 'object') return;
    _normalizujCluePatraniSession();
    const prev =
      _stav.cluePatraniSession[cid] && typeof _stav.cluePatraniSession[cid] === 'object'
        ? _stav.cluePatraniSession[cid]
        : {};
    _stav.cluePatraniSession[cid] = { ...prev, ...patch };
  }

  function nactiCluePatraniSession(caseId) {
    const cid = String(caseId || '').trim();
    if (!cid) return null;
    _normalizujCluePatraniSession();
    const r = _stav.cluePatraniSession[cid];
    return r && typeof r === 'object' ? { ...r } : null;
  }

  function vymazCluePatraniSession(caseId) {
    const cid = String(caseId || '').trim();
    if (!cid) return;
    _normalizujCluePatraniSession();
    delete _stav.cluePatraniSession[cid];
  }

  /**
   * @param {string} caseId
   * @param {number} maxPokusu 0 = bez limitu (neinicializuje se)
   */
  function inicializujClueFocusPokudTreba(caseId, maxPokusu) {
    const max = Number(maxPokusu);
    if (!Number.isFinite(max) || max <= 0) return;
    const cid = String(caseId || '').trim();
    if (!cid) return;
    _normalizujClueFocusByCase();
    if (_stav.clueFocusByCase[cid]) return;
    _stav.clueFocusByCase[cid] = { remaining: max, locked: false };
  }

  function jeClueFocusZamceno(caseId) {
    const cid = String(caseId || '').trim();
    if (!cid) return false;
    _normalizujClueFocusByCase();
    const r = _stav.clueFocusByCase[cid];
    return !!(r && r.locked);
  }

  function ziskejClueFocusZbyva(caseId) {
    const cid = String(caseId || '').trim();
    if (!cid) return null;
    _normalizujClueFocusByCase();
    const r = _stav.clueFocusByCase[cid];
    if (!r) return null;
    return { remaining: r.remaining, locked: !!r.locked };
  }

  /**
   * Odečte jeden tvrdý pokus (špatné spojení). Při 0 uzamkne stopy.
   * @returns {{ remaining: number, locked: boolean }}
   */
  function spotrebujClueFocusTvrdyPokus(caseId, maxPokusu) {
    const max = Number(maxPokusu);
    if (!Number.isFinite(max) || max <= 0) {
      return { remaining: 999, locked: false };
    }
    const cid = String(caseId || '').trim();
    if (!cid) return { remaining: max, locked: false };
    _normalizujClueFocusByCase();
    if (!_stav.clueFocusByCase[cid]) {
      _stav.clueFocusByCase[cid] = { remaining: max, locked: false };
    }
    const r = _stav.clueFocusByCase[cid];
    if (r.locked) return { remaining: r.remaining, locked: true };
    const next = Math.max(0, (Number(r.remaining) || 0) - 1);
    r.remaining = next;
    if (next <= 0) {
      r.locked = true;
    }
    return { remaining: r.remaining, locked: r.locked };
  }

  /**
   * Odemkne stopy: `ink` = 1 sdílená akce průzkumu, `moudrost` = −2 Moudrosti (obě cesty v HUD).
   * @returns {boolean}
   */
  function odemkniClueFocusZOplaty(caseId, maxPokusu, typ) {
    const max = Number(maxPokusu);
    if (!Number.isFinite(max) || max <= 0) return false;
    const cid = String(caseId || '').trim();
    if (!cid) return false;
    _normalizujClueFocusByCase();
    const r = _stav.clueFocusByCase[cid];
    if (!r || !r.locked) return false;
    const t = String(typ || '').trim();
    if (t === 'ink') {
      const z = Number(_stav.investigationActionsLeft) || 0;
      if (z < 1) return false;
      _stav.investigationActionsLeft = z - 1;
      r.locked = false;
      r.remaining = max;
      return true;
    }
    if (t === 'moudrost') {
      const m = Number(_stav.traits && _stav.traits.Moudrost) || 0;
      if (m < 2) return false;
      upravRys('Moudrost', -2);
      r.locked = false;
      r.remaining = max;
      return true;
    }
    return false;
  }

  /**
   * Druhý a další běh časovaného pátrání: buď odemknutí zámku soustředění (špatné spoje),
   * nebo zaplacení po neúspěšném běhu (needsPaidRetry), i když stopy nejsou zamčené.
   */
  function odemkniClueHuntDalsiBeh(caseId, maxPokusu, typ) {
    const cid = String(caseId || '').trim();
    if (!cid) return false;
    const max = Number(maxPokusu);
    const t = String(typ || '').trim();
    _normalizujClueFocusByCase();
    const ses = nactiCluePatraniSession(cid);
    const needPaid = !!(ses && ses.needsPaidRetry);
    const r = _stav.clueFocusByCase[cid];
    const isLocked = r && r.locked;

    if (isLocked) {
      return odemkniClueFocusZOplaty(caseId, maxPokusu, typ);
    }
    if (!needPaid) return false;

    if (t === 'ink') {
      const z = Number(_stav.investigationActionsLeft) || 0;
      if (z < 1) return false;
      _stav.investigationActionsLeft = z - 1;
    } else if (t === 'moudrost') {
      const m = Number(_stav.traits && _stav.traits.Moudrost) || 0;
      if (m < 2) return false;
      upravRys('Moudrost', -2);
    } else {
      return false;
    }

    ulozCluePatraniSession(cid, { needsPaidRetry: false, hasRun: true });
    return true;
  }

  function pridejPouzityPripad(id) {
    if (id == null || id === '') return;
    const s = String(id);
    _normalizujUsedCaseIds();
    if (!_stav.usedCaseIds.some(x => String(x) === s)) _stav.usedCaseIds.push(s);
  }

  /**
   * Je případ uzavřený rozsudkem v daném kalendářním dni (pool může stejné id zopakovat jindy).
   * `casesResolvedToday` + archivní záznamy s `day === den` — ne globální archiv z jiného dne.
   */
  function jePripadUzavrenVDen(caseId, den) {
    if (caseId == null || caseId === '') return false;
    const id = String(caseId).trim();
    if (!id) return false;
    const d = Number(den);
    if (!Number.isFinite(d) || d < 1) return false;

    const dnesni = Number(_stav.currentDay);
    if (d === dnesni) {
      const vyresene = _stav.casesResolvedToday || [];
      if (vyresene.some(x => String(x).trim() === id)) return true;
    }

    const arch = _stav.archive && _stav.archive.verdicts;
    if (!Array.isArray(arch)) return false;
    return arch.some(v => {
      if (!v) return false;
      const cid = String(v.caseId ?? v.case_id ?? '').trim();
      if (cid !== id) return false;
      const vden = Number(v.day);
      return Number.isFinite(vden) && vden === d;
    });
  }

  /** Je případ uzavřený pro aktuální herní den (viz `jePripadUzavrenVDen`). */
  function jePripadUzavren(caseId) {
    const den = Number(_stav.currentDay);
    return jePripadUzavrenVDen(caseId, Number.isFinite(den) && den > 0 ? den : 1);
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
   * @param {number} pozice 1…POCET_RUCNICH_ULOZENI
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

  /**
   * Nový běh — vynuluje aktivní stav a autosave.
   * Ruční zálohy 1–5 v localStorage zůstávají (lze načíst z menu).
   */
  function reset() {
    _stav = JSON.parse(JSON.stringify(VYCHOZI_STAV));
    _normalizujTraitsFrakceATrust();
    _zarucRozhodovaciStyl();
    _zarucTydenniRozsireni();
    localStorage.removeItem(SAVE_LEGACY);
    /* Zapsat výchozí stav jako autosave — jinak _migrujAutosaveZeSlotu po reloadu
       promuje ruční slot zpět na autosave a hra nenastartuje od D1. */
    try {
      localStorage.setItem(SAVE_AUTOSAVE, JSON.stringify(_stav));
    } catch (_e) { /* ignore */ }
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
    _zarucArchivVerdikty();
    if (!Array.isArray(_stav.archive.fragments)) _stav.archive.fragments = [];
    const arr = _stav.archive.fragments;

    if (id && typeof id === 'object') {
      const key = String(id.id || id.archiveId || '').trim();
      if (!key) return;

      const idxObj = arr.findIndex(
        f => f && typeof f === 'object' && String(f.id || f.archiveId || '').trim() === key
      );
      if (idxObj !== -1) {
        arr[idxObj] = { ...arr[idxObj], ...id };
        return;
      }
      const idxStr = arr.findIndex(x => x === key);
      if (idxStr !== -1) {
        arr[idxStr] = { ...id };
        return;
      }
      arr.push({ ...id });
      return;
    }

    const key = String(id || '').trim();
    if (!key) return;
    if (arr.some(f => f && typeof f === 'object' && String(f.id || f.archiveId || '').trim() === key)) {
      return;
    }
    if (!arr.includes(key)) {
      arr.push(key);
    }
  }

  function oznacPostavuPotkanu(id) {
    if (!_stav.archive.characters_met.includes(id)) {
      _stav.archive.characters_met.push(id);
    }
  }

  function odhalInfoPripadu(caseId, infoId, opts) {
    _zarucTydenniRozsireni();
    if (!_stav.revealedInfo[caseId]) _stav.revealedInfo[caseId] = [];
    const arr = _stav.revealedInfo[caseId];
    if (arr.includes(infoId)) return;
    arr.push(infoId);

    const sid = String(caseId || '').trim();
    const iid = String(infoId || '').trim();
    if (sid && iid) {
      if (!_stav.revealedInfoPath[sid]) _stav.revealedInfoPath[sid] = {};
      const unofficial = opts && opts.path === 'unofficial';
      _stav.revealedInfoPath[sid][iid] = unofficial ? 'unofficial' : 'official';
    }

    const den = Number(_stav.currentDay);
    if (!Number.isFinite(den) || den % 7 === 0) return;

    const t = _stav.tydenni_statistiky;
    t.pruzkum_pouzit = (Number(t.pruzkum_pouzit) || 0) + 1;
  }

  function jeInfoOdhaleno(caseId, infoId) {
    return (_stav.revealedInfo[caseId] ?? []).includes(infoId);
  }

  /** 'official' | 'unofficial' — jen informativní pro UI; výchozí official. */
  function zpusobOdhaleniInfo(caseId, infoId) {
    const sid = String(caseId || '').trim();
    const iid = String(infoId || '').trim();
    const m = _stav.revealedInfoPath[sid];
    if (!m || !iid) return 'official';
    return m[iid] === 'unofficial' ? 'unofficial' : 'official';
  }

  function resetDen() {
    _stav.casesResolvedToday = [];
    _stav.investigationActionsLeft = 3;
    _stav.phase = 'morning';
    _zarucEkonomiku();
    const den = Number(_stav.currentDay);
    // Pevné denní výdaje −55 Kčs za každý dokončený den (při přechodu na další den).
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

  function pridejReviziPripadu(revize) {
    if (!revize || typeof revize !== 'object') return false;
    const caseId = String(revize.caseId || '').trim();
    const dueDay = Number(revize.dueDay);
    const originalDay = Number(revize.originalDay);
    if (!caseId || !Number.isFinite(dueDay) || !Number.isFinite(originalDay)) return false;
    _normalizujReviewQueue();
    _stav.reviewQueue.push({
      id: String(revize.id || '').trim() || ('rev_' + caseId + '_' + Math.round(originalDay) + '_' + Math.round(dueDay)),
      caseId,
      caseTitle: String(revize.caseTitle || '').trim(),
      verdictId: String(revize.verdictId || '').trim(),
      verdictText: String(revize.verdictText || '').trim(),
      originalDay: Math.max(1, Math.round(originalDay)),
      dueDay: Math.max(1, Math.round(dueDay)),
      evidenceScore: Math.max(0, Math.min(100, Math.round(Number(revize.evidenceScore) || 0))),
      coherenceScore: Math.max(0, Math.min(100, Math.round(Number(revize.coherenceScore) || 0))),
      appealChance: Math.max(0, Math.min(100, Math.round(Number(revize.appealChance) || 0))),
      procesniKvalita: String(revize.procesniKvalita || '').trim(),
      hardVerdict: !!revize.hardVerdict,
      payload: revize.payload && typeof revize.payload === 'object' ? { ...revize.payload } : {}
    });
    return true;
  }

  function vyzvedniRevizeProDen(den) {
    const d = Number(den);
    if (!Number.isFinite(d) || d < 1) return [];
    _normalizujReviewQueue();
    const due = [];
    const keep = [];
    for (const r of _stav.reviewQueue) {
      if (Number(r.dueDay) <= d) due.push(r);
      else keep.push(r);
    }
    due.sort((a, b) => Number(a.dueDay) - Number(b.dueDay) || Number(a.originalDay) - Number(b.originalDay));
    _stav.reviewQueue = keep;
    return due;
  }

  function zalogujReviziPripadu(zaznam) {
    if (!zaznam || typeof zaznam !== 'object') return false;
    const caseId = String(zaznam.caseId || '').trim();
    if (!caseId) return false;
    _zarucArchivVerdikty();
    _stav.archive.case_reviews.push({
      day: Number.isFinite(Number(zaznam.day)) ? Number(zaznam.day) : Number(_stav.currentDay),
      caseId,
      caseTitle: String(zaznam.caseTitle || '').trim(),
      choice: String(zaznam.choice || '').trim(),
      note: String(zaznam.note || '').trim(),
      effects: zaznam.effects && typeof zaznam.effects === 'object' ? { ...zaznam.effects } : {}
    });
    return true;
  }

  function vypoctiUzloveFlagy() {
    const f = _stav.flags || {};
    const t = _stav.traits || {};
    const tr = _stav.trust || {};
    const den = Number(_stav.currentDay);
    const u = _stav.uzlove || (_stav.uzlove = {});

    // vlcek_vztah
    // Skutečný název v kódu: flag_vlcek_upozorneni (ne dokumentové vlcek_splnil_d7/d8).
    const vlcekKompromis = f.uplatek_prijat === true
      || (f.flag_vlcek_upozorneni === true && Number(t.Integrita) <= 35);
    // Skutečný název v kódu: trust.vlcek (0..3), ne samostatný flag vlcek_odmitl_d11.
    const vlcekVzdor = f.uplatek_prijat !== true
      && (Number.isFinite(Number(tr.vlcek)) ? Number(tr.vlcek) <= 0 : false)
      && Number(t.Odvaha) >= 65;
    u.vlcek_vztah = vlcekKompromis ? 'kompromitovan' : (vlcekVzdor ? 'vzdor' : 'neutral');

    // haas_kontakt
    // Skutečné názvy: uplatek_prijat, benes_identified, haas_envelope_opened, flag_rodny_list_pouzit.
    const haasZavazany = f.uplatek_prijat === true;
    const haasOtevren = !haasZavazany && (
      f.benes_identified === true
      || f.haas_envelope_opened === true
      || f.flag_rodny_list_pouzit === true
    );
    u.haas_kontakt = haasZavazany ? 'zavazany' : (haasOtevren ? 'otevren' : 'odmitnut');

    // benes_pravda
    // v1 bez adventure scén: mapujeme přes benes_identified.
    if (u.benes_pravda === 'nezna' && f.benes_identified === true) {
      u.benes_pravda = 'prijal';
    } else if (!['nezna', 'prijal', 'odmitl'].includes(String(u.benes_pravda))) {
      u.benes_pravda = 'nezna';
    }

    // osobni_cena
    if (f.operace_zaplacena === true && f.uplatek_prijat === true) {
      u.osobni_cena = 'haasem';
    } else if (f.operace_zaplacena === true) {
      u.osobni_cena = 'zaplatil';
    } else if (f.operace_odlozena === true) {
      u.osobni_cena = 'odmitl';
    } else if (Number.isFinite(den) && den >= 12) {
      u.osobni_cena = 'nerozhodl';
    }

    uloz();
  }

  return {
    get,
    set,
    /** Počet ručních pozic v menu (localStorage klíče indubio_save_1…). */
    pocetRucnichUlozeni: POCET_RUCNICH_ULOZENI,
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
    zpusobOdhaleniInfo,
    resetDen,
    dalsiDen,
    pridejPouzityPripad,
    jePripadUzavren,
    jePripadUzavrenVDen,
    jeClueParNalezen,
    oznacClueParNalezen,
    ziskejCluePotvrzeni,
    nastavCluePotvrzeni,
    resetTydenniStatistikyNedele,
    pridejReviziPripadu,
    vyzvedniRevizeProDen,
    zalogujReviziPripadu,
    vypoctiUzloveFlagy,
    inicializujClueFocusPokudTreba,
    jeClueFocusZamceno,
    ziskejClueFocusZbyva,
    spotrebujClueFocusTvrdyPokus,
    odemkniClueFocusZOplaty,
    ulozCluePatraniSession,
    nactiCluePatraniSession,
    vymazCluePatraniSession,
    odemkniClueHuntDalsiBeh
  };

})();

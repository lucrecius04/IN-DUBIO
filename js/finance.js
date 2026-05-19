/**
 * finance.js — Ekonomika soudce Benedikta Vraného (úspory, operace matky, výplata, dluh).
 */

const Finance = (() => {

  const OPERACE_CIL_KC = 400;
  /** Kalendář 15denní kampaně: deadline operace = D12 (pracovní) = den 16 (pondělí 3. týdne). */
  const OPERACE_DEADLINE_DEN = 16;
  const DENNI_VYDAJE_KC = 48;
  /** Týdenní plat soudu — pevná částka; další příjem jen ze spisů, úplatků, dopisů apod. */
  const VYPLATA_KC = 90;
  /** Neděle v herním kalendáři: první a druhá neděle (den 1 = pondělí). */
  const VYPLATA_DNY = [7, 14];

  /**
   * Orientační rozmezí odměny za jeden uzavřený spis (základ + typ spisu v cases.js).
   * Horní mez odpovídá silnému výsledku s politickým příplatkem (viz economy.mdc).
   */
  const ROZSUDEK_ODMENA_ORIENT_MIN_KS = 0;
  const ROZSUDEK_ODMENA_ORIENT_MAX_KS = 55;

  function getZustatek() {
    return State.get('finance.balance');
  }

  function getDluh() {
    return Number(State.get('finance.dluh')) || 0;
  }

  function jeDostupne(castka) {
    return getZustatek() >= castka;
  }

  function getChybiNaOperaci() {
    const b = Number(getZustatek()) || 0;
    return Math.max(0, OPERACE_CIL_KC - b);
  }

  function getDnuDoDeadline() {
    const den = Number(State.get('currentDay')) || 1;
    return Math.max(0, OPERACE_DEADLINE_DEN - den);
  }

  /**
   * Nedělní výplata (VYPLATA_KC) — idempotentně podle záznamu ve stavu.
   * @returns {boolean} true pokud se právě připsalo
   */
  function aplikujNedelniVyplatu(den) {
    const d = Number(den);
    if (!VYPLATA_DNY.includes(d)) return false;
    const arr = State.get('finance.vyplataPrijataVDnech') || [];
    if (arr.includes(d)) return false;
    State.upravFinance(VYPLATA_KC);
    const next = [...arr, d].sort((a, b) => a - b);
    State.set('finance.vyplataPrijataVDnech', next);
    return true;
  }

  function upravit(delta, popis) {
    State.upravFinance(delta);
    _zaloguj(delta, popis);
    return getZustatek();
  }

  function prijmoutUplatek(castka, zdroj) {
    const c = Number(castka) || 0;
    upravit(c, `Úplatek od: ${zdroj}`);
    /* Rysy z verdiktu `uplatek` — viz Cases.zpracujPrijetiUplatekPoModalu + `_aplikujDusledky`. */
    State.set('flags.uplatek_prijat', true);
    const t = State.get('tydenni_statistiky');
    if (t && typeof t === 'object') {
      t.uplatek_prijat = true;
      State.set('tydenni_statistiky', t);
    }
    zkontrolujCilOperace();
  }

  function odmitnutUplatek() {
    State.upravRys('Integrita', +5);
    State.upravRys('Odvaha', +3);
    UI.zobrazStavovouZpravu('Odmítnuto.');
  }

  function _zaloguj(delta, popis) {
    console.log(`Finance: ${delta > 0 ? '+' : ''}${delta} Kčs (${popis || '—'})`);
  }

  /** Varování při záporném zůstatku + příznak pro UI. */
  function zaznamenejBankrotAVarovani() {
    const b = Number(getZustatek()) || 0;
    if (b >= 0) {
      State.set('flags.bankrot_varovani_zobrazeno', false);
    } else if (!State.get('flags.bankrot_varovani_zobrazeno')) {
      State.set('flags.bankrot_varovani_zobrazeno', true);
      UI.zobrazStavovouZpravu('Nemáte na nájem.');
    }
  }

  /** Ranní buff: +2 Naděje každý den, pokud platí lepší lékař. */
  function aplikujLekarskyBuffRano() {
    const doDne = State.get('flags.lepsi_lekar_do_dne');
    const den = Number(State.get('currentDay'));
    if (doDne == null || !Number.isFinite(Number(doDne))) return;
    if (den >= 2 && den <= Number(doDne)) {
      State.upravRys('Nadeje', 2);
    }
  }

  /** Splátka / kontrola půjčky u Karase (den po splatnosti: penalizace volitelně později). */
  function tickKarasDluh() {
    const doDne = State.get('flags.karas_dluh_do_dne');
    if (doDne == null) return;
    const den = Number(State.get('currentDay'));
    if (den === Number(doDne) + 1) {
      UI.zobrazStavovouZpravu('Půjčka u Karase — splatnost byla včera.');
    }
  }

  /**
   * Počet dní do příští nedělní výplaty, nebo null po poslední výplatě v kampani.
   */
  function _getDniDoDalsiNedelniVyplaty() {
    const den = Number(State.get('currentDay')) || 1;
    const prijato = State.get('finance.vyplataPrijataVDnech') || [];
    const prijSet = new Set(prijato);
    for (const d of [...VYPLATA_DNY].sort((a, b) => a - b)) {
      if (d < den) continue;
      if (d === den && prijSet.has(d)) continue;
      return d - den;
    }
    return null;
  }

  function getPrehled() {
    const f = State.get('finance') || {};
    const zustatek = Math.round(Number(f.balance) || 0);
    const vydajeTydenni = DENNI_VYDAJE_KC * 7;
    const fl = State.get('flags') || {};
    const dniDoDalsiVyplaty = _getDniDoDalsiNedelniVyplaty();

    return {
      zustatek,
      plat: VYPLATA_KC,
      vydaje: DENNI_VYDAJE_KC,
      vydajeTydenni,
      dniDoDalsiVyplaty,
      mesicniCistka: VYPLATA_KC - vydajeTydenni,
      operaceCil: OPERACE_CIL_KC,
      chybiNaOperaci: Math.max(0, OPERACE_CIL_KC - zustatek),
      dnuDoDeadlineOperace: getDnuDoDeadline(),
      operaceZaplacena: fl.operace_zaplacena === true,
      operaceOdlozena: fl.operace_odlozena === true,
      dopisOperaceViden: fl.dopis_operace_den4_viden === true,
      dluh: getDluh(),
      rozsudekOdmenaMin: ROZSUDEK_ODMENA_ORIENT_MIN_KS,
      rozsudekOdmenaMax: ROZSUDEK_ODMENA_ORIENT_MAX_KS
    };
  }

  /**
   * Texty pro panel financí na stole (pravý sloupec).
   */
  /**
   * Při dosažení 400 Kčs označí operaci jako zaplacenou — až od termínu (D16).
   * Dříve lze šetřit (útěk / atentát) bez automatického „zaplaceno“; hráč platí v milníku nebo runner.
   */
  function zkontrolujCilOperace() {
    if (State.get('flags.operace_odlozena') === true) return;
    const den = Number(State.get('currentDay')) || 0;
    if (den < OPERACE_DEADLINE_DEN) return;
    if ((Number(getZustatek()) || 0) >= OPERACE_CIL_KC) {
      State.set('flags.operace_zaplacena', true);
    }
  }

  function getTextyLevyPanel() {
    const uspory = Math.round(Number(getZustatek()) || 0);
    const tydenKc = 7 * DENNI_VYDAJE_KC;
    const radekOperace =
      `Týdenní náklady: ${tydenKc} Kčs (${DENNI_VYDAJE_KC} Kčs/den)`;

    return {
      uspory,
      radekOperace,
      dluh: getDluh(),
      operaceTrida: 'finance--neutral'
    };
  }

  return {
    OPERACE_CIL_KC,
    OPERACE_DEADLINE_DEN,
    DENNI_VYDAJE_KC,
    VYPLATA_KC,
    VYPLATA_DNY,
    ROZSUDEK_ODMENA_ORIENT_MIN_KS,
    ROZSUDEK_ODMENA_ORIENT_MAX_KS,
    getZustatek,
    getDluh,
    jeDostupne,
    getChybiNaOperaci,
    getDnuDoDeadline,
    aplikujNedelniVyplatu,
    upravit,
    prijmoutUplatek,
    odmitnutUplatek,
    getPrehled,
    getTextyLevyPanel,
    zaznamenejBankrotAVarovani,
    zkontrolujCilOperace,
    aplikujLekarskyBuffRano,
    tickKarasDluh
  };

})();

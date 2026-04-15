/**
 * finance.js — Správa financí soudce Nováka.
 * Jednoduchý tracker: zůstatek, plat, výdaje.
 */

const Finance = (() => {

  function getZustatek() {
    return State.get('finance.balance');
  }

  function jeDostupne(castka) {
    return getZustatek() >= castka;
  }

  function upravit(delta, popis) {
    State.upravFinance(delta);
    _zaloguj(delta, popis);
    return getZustatek();
  }

  function prijmoutUplatek(castka, zdroj) {
    // Úplatek snižuje Integritu
    upravit(castka, `Úplatek od: ${zdroj}`);
    State.upravRys('Integrita', -15);
    State.upravRys('Maska', +5);
    UI.zobrazStavovouZpravu(`Přijal jsi ${castka} Kč.`);
  }

  function odmitnutUplatek() {
    State.upravRys('Integrita', +5);
    State.upravRys('Odvaha', +3);
    UI.zobrazStavovouZpravu('Odmítnuto.');
  }

  function _zaloguj(delta, popis) {
    // Zatím jen konzol — v archívu by se ukázaly
    console.log(`Finance: ${delta > 0 ? '+' : ''}${delta} Kč (${popis || '—'})`);
  }

  // Získá přehled pro zobrazení v šuplíku
  function getPrehled() {
    const f = State.get('finance');
    const den = State.get('currentDay');
    const dniDoPlatby = 7 - ((den - 1) % 7);

    return {
      zustatek:     f.balance,
      plat:         f.salary,
      vydaje:       f.weeklyExpenses,
      dniDoPlatby,
      mesicniCistka: f.salary - f.weeklyExpenses
    };
  }

  return {
    getZustatek,
    jeDostupne,
    upravit,
    prijmoutUplatek,
    odmitnutUplatek,
    getPrehled
  };

})();

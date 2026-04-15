/**
 * narrative.js — Narativní fragmenty.
 * Dopisy, sny, novinové výstřižky.
 * Načítá z fragments.json a předává UI k zobrazení.
 */

const Narrative = (() => {

  // Typy fragmentů → typ panelu
  const TYP_PANEL = {
    letter:   'fragment-panel--dopis',
    dream:    'fragment-panel--sen',
    clipping: 'fragment-panel--vystrizek'
  };

  const TYP_NADPIS = {
    letter:   'Dopis',
    dream:    'Sen',
    clipping: 'Z novin'
  };

  function zobrazFragment(id, callback) {
    const fragment = DataLoader.ziskejFragment(id);
    if (!fragment) {
      console.warn(`Fragment '${id}' nenalezen.`);
      if (callback) callback();
      return;
    }

    State.oznacFragment(id);
    UI.zobrazFragment(fragment, callback);
  }

  function zpracujRanni(denDat) {
    if (denDat?.morning_fragment) {
      zobrazFragment(denDat.morning_fragment);
    }
  }

  function zpracujNocni(denDat, callback) {
    if (denDat?.night_fragment) {
      zobrazFragment(denDat.night_fragment, callback);
    } else {
      if (callback) callback();
    }
  }

  // Novinový výstřižek na stole — aktualizuj denně
  function aktualizujNoviny(denDat) {
    if (!denDat?.newspaper_headline) return;
    const datum = _formatujDatum(State.get('currentDay'));
    Desk.nastavNovinyClanek(denDat.newspaper_headline, datum);
  }

  function _formatujDatum(den) {
    const ZACATEK = new Date(1931, 2, 1);
    const datum = new Date(ZACATEK);
    datum.setDate(datum.getDate() + den - 1);
    const MESICE = ['ledna', 'února', 'března', 'dubna', 'května', 'června',
                    'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];
    return `${datum.getDate()}. ${MESICE[datum.getMonth()]} ${datum.getFullYear()}`;
  }

  function getTYP_PANEL() { return TYP_PANEL; }
  function getTYP_NADPIS() { return TYP_NADPIS; }

  return {
    zobrazFragment,
    zpracujRanni,
    zpracujNocni,
    aktualizujNoviny,
    getTYP_PANEL,
    getTYP_NADPIS
  };

})();

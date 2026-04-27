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
    letter:   'DOPIS',
    dream:    'SEN',
    clipping: 'Z NOVIN'
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

  /**
   * Echo minulých verdiktů (PROMPT_echo_verdiktu) — první splněná podmínka; přidá se mezeru a text.
   * @param {Array<{ condition: { flag: string, value: string }, text: string }>} [conditionalLines]
   * @returns {string} suffix (prázdný nebo s úvodní mezerou)
   */
  function vyhodnotPodmineneRadky(conditionalLines) {
    if (!conditionalLines || !conditionalLines.length) return '';
    const fl = State.get('flags') || {};
    for (const line of conditionalLines) {
      const cond = line && line.condition;
      if (!cond || cond.flag == null) continue;
      if (fl[cond.flag] === cond.value) {
        const t = (line.text != null ? String(line.text) : '').trim();
        if (!t) return '';
        return ' ' + t;
      }
    }
    return '';
  }

  // Novinový výstřižek na stole — aktualizuj denně
  function aktualizujNoviny(denDat) {
    const datum = _formatujDatum(State.get('currentDay'));
    if (typeof Desk !== 'undefined' && Desk.nastavNovinyDen) {
      Desk.nastavNovinyDen(denDat || null, datum);
    }
  }

  function _formatujDatum(den) {
    const ZACATEK = new Date(1931, 2, 2);
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
    vyhodnotPodmineneRadky,
    getTYP_PANEL,
    getTYP_NADPIS
  };

})();

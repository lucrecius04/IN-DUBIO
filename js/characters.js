/**
 * characters.js — NPC postavy, důvěra, dialogy.
 * Důvěra: 0 = cizinec, 1 = známý, 2 = spojenec, 3 = věří ti životem.
 */

const Characters = (() => {

  let _data = {};

  function inicializuj() {
    const postavy = DataLoader.ziskej('characters');
    if (postavy) {
      for (const p of postavy) {
        _data[p.id] = p;
      }
    }
  }

  function getPostava(id) {
    return _data[id] || null;
  }

  // Vrátí dialog pro postavu na daný den, respektuje podmínky
  function getDialog(id, den) {
    const postava = _data[id];
    if (!postava || !postava.dialogues) return null;

    const trust = State.get('trust.' + id) ?? 0;
    const flags = State.get('flags');

    // Najdi dialog pro správný den s splněnými podmínkami
    const dialog = postava.dialogues.find(d => {
      if (d.day !== den) return false;
      if (!d.condition) return true;

      const podm = d.condition;
      if (podm.trust_min !== undefined && trust < podm.trust_min) return false;
      if (podm.trust_max !== undefined && trust > podm.trust_max) return false;
      if (podm.flag && !flags[podm.flag]) return false;
      if (podm.flag_not && flags[podm.flag_not]) return false;
      return true;
    });

    return dialog || null;
  }

  // Vrátí všechny dialogy postavy pro daný den (některé postavy mohou mít více)
  function getDialogyDen(den) {
    const vysledek = [];
    for (const [id, postava] of Object.entries(_data)) {
      const dialog = getDialog(id, den);
      if (dialog) {
        vysledek.push({ id, postava, dialog });
      }
    }
    return vysledek;
  }

  function getNazev(id) {
    return _data[id]?.name || id;
  }

  function getDuveraIkony(id) {
    const trust = State.get('trust.' + id) ?? 0;
    const plne = '★'.repeat(trust);
    const prazdne = '☆'.repeat(3 - trust);
    return plne + prazdne;
  }

  return {
    inicializuj,
    getPostava,
    getDialog,
    getDialogyDen,
    getNazev,
    getDuveraIkony
  };

})();

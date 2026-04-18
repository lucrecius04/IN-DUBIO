/**
 * data-loader.js — Načítání a cachování JSON dat.
 * Všechna data jsou přístupná přes DataLoader.ziskej(klic).
 */

const DataLoader = (() => {

  const _cache = {};

  function _inferCaseType() {
    return 'rutinni';
  }

  function _doplnteTypyPripadu(seznam) {
    if (!Array.isArray(seznam)) return;
    for (const c of seznam) {
      if (c && !c.type) c.type = _inferCaseType(c);
    }
  }

  /** Kořen JSON může být pole nebo obal `{ cases: [...] }` (legacy / export). */
  function _poleZOdpovediPripadu(raw) {
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object' && Array.isArray(raw.cases)) return raw.cases;
    if (raw && typeof raw === 'object' && Array.isArray(raw.items)) return raw.items;
    return [];
  }

  // Definice všech datových souborů
  const SOUBORY = {
    days:       'data/days.json',
    characters: 'data/characters.json',
    fragments:  'data/fragments.json',
    factions:   'data/factions.json',
    traits:     'data/traits-text.json'
  };

  // Případy jsou rozděleny do tří souborů pro přehlednost
  const SOUBORY_CASES = [
    'data/cases-akt1.json',
    'data/cases-akt2.json',
    'data/cases-akt3.json'
  ];

  async function nactiVse() {
    // Načti základní datové soubory
    const slibky = Object.entries(SOUBORY).map(async ([klic, cesta]) => {
      try {
        const odpoved = await fetch(cesta);
        if (!odpoved.ok) throw new Error(`HTTP ${odpoved.status} pro ${cesta}`);
        _cache[klic] = await odpoved.json();
      } catch (e) {
        console.warn(`Nelze načíst ${cesta}:`, e.message);
        _cache[klic] = null;
      }
    });

    // Načti a slij soubory s případy
    const casesSlibky = SOUBORY_CASES.map(async (cesta) => {
      try {
        const odpoved = await fetch(cesta);
        if (!odpoved.ok) throw new Error(`HTTP ${odpoved.status} pro ${cesta}`);
        return await odpoved.json();
      } catch (e) {
        console.warn(`Nelze načíst ${cesta}:`, e.message);
        return [];
      }
    });

    await Promise.all(slibky);
    const casesArrays = await Promise.all(casesSlibky);
    _cache.casesAkt1 = _poleZOdpovediPripadu(casesArrays[0]);
    _cache.casesAkt2 = _poleZOdpovediPripadu(casesArrays[1]);
    _cache.casesAkt3 = _poleZOdpovediPripadu(casesArrays[2]);
    _cache.cases = [_cache.casesAkt1, _cache.casesAkt2, _cache.casesAkt3].flat();
    _doplnteTypyPripadu(_cache.cases);

    console.log(
      `Načteno ${_cache.cases?.length || 0} případů (akt1: ${_cache.casesAkt1.length}, akt2: ${_cache.casesAkt2.length}, akt3: ${_cache.casesAkt3.length}).`
    );
    console.log('[DataLoader] casesAkt1 po načtení:', DataLoader.ziskej('casesAkt1'));
    return _cache;
  }

  function ziskej(klic) {
    if (!Object.prototype.hasOwnProperty.call(_cache, klic)) {
      console.warn(`Data '${klic}' nejsou v cache. Zavolej nactiVse() nejprve.`);
      return null;
    }
    return _cache[klic];
  }

  /** Po nactiVse: days + případy musí být neprázdné pole, jinak složky nemají co načíst. */
  function jeHernaDataOK() {
    const days = Object.prototype.hasOwnProperty.call(_cache, 'days') ? _cache.days : null;
    const cases = Object.prototype.hasOwnProperty.call(_cache, 'cases') ? _cache.cases : null;
    return Array.isArray(days) && days.length > 0 && Array.isArray(cases) && cases.length > 0;
  }

  // Pomocné gettery

  function ziskejPripad(id) {
    const cases = ziskej('cases');
    if (!cases) return null;
    const k = String(id == null ? '' : id).trim();
    if (!k) return null;
    return cases.find(c => String(c.id || '').trim() === k) || null;
  }

  function ziskejDen(cislo) {
    const days = ziskej('days');
    if (!days) return null;
    const n = Number(cislo);
    if (!Number.isFinite(n)) return null;
    return days.find(d => Number(d.day) === n) || null;
  }

  function ziskejPostavu(id) {
    const characters = ziskej('characters');
    if (!characters) return null;
    return characters.find(c => c.id === id) || null;
  }

  function ziskejFragment(id) {
    const fragments = ziskej('fragments');
    if (!fragments) return null;
    return fragments.find(f => f.id === id) || null;
  }

  function ziskejFrakci(id) {
    const factions = ziskej('factions');
    if (!factions) return null;
    return factions.find(f => f.id === id) || null;
  }

  function ziskejTextyRysu(id) {
    const traits = ziskej('traits');
    if (!traits) return null;
    return traits[id] || null;
  }

  return {
    nactiVse,
    ziskej,
    jeHernaDataOK,
    ziskejPripad,
    ziskejDen,
    ziskejPostavu,
    ziskejFragment,
    ziskejFrakci,
    ziskejTextyRysu
  };

})();

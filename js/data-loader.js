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

  const SOUBOR_POOL_AKT1 = 'data/pool_cases_akt1.json';

  /** Efekty z pool JSON (malá písmena) → consequences pro engine/UI. */
  function _poolEffectsNaConsequences(eff) {
    const e = eff && typeof eff === 'object' ? eff : {};
    const traits = {};
    const mapT = {
      integrita: 'Integrita',
      odvaha: 'Odvaha',
      moudrost: 'Moudrost',
      vina: 'Vina',
      nadeje: 'Nadeje'
    };
    for (const [k, v] of Object.entries(e)) {
      const nk = String(k).toLowerCase();
      if (mapT[nk]) {
        const n = Number(v);
        if (Number.isFinite(n) && n !== 0) traits[mapT[nk]] = n;
      }
    }
    const factions = {};
    if (Number.isFinite(Number(e.moc)) && Number(e.moc) !== 0) factions.Moc = Number(e.moc);
    if (Number.isFinite(Number(e.lid)) && Number(e.lid) !== 0) factions.Lid = Number(e.lid);
    if (Number.isFinite(Number(e.kapital)) && Number(e.kapital) !== 0) factions.Kapital = Number(e.kapital);
    const finance = Number.isFinite(Number(e.finance)) ? Number(e.finance) : 0;
    return { traits, factions, trust: {}, finance, flags: [] };
  }

  function _vyberInformantText(inv, stav) {
    const v = inv && inv.variants;
    if (!v || typeof v !== 'object') return '';
    const f = (stav && stav.factions) || {};
    const lid = Number(f.Lid ?? 50);
    const kap = Number(f.Kapital ?? 50);
    const moc = Number(f.Moc ?? f.Stat ?? 50);
    if (Number.isFinite(moc) && moc >= 60 && v.moc_high) return v.moc_high;
    if (Number.isFinite(lid) && lid >= 60 && v.lid_high) return v.lid_high;
    if (Number.isFinite(kap) && kap >= 60 && v.kapital_high) return v.kapital_high;
    return v.default || v.lid_high || v.moc_high || Object.values(v).find(x => typeof x === 'string') || '';
  }

  function _slozitPoolVerdikty(verdictsRoot) {
    const out = [];
    const v = verdictsRoot && typeof verdictsRoot === 'object' ? verdictsRoot : {};
    const guilty = v.guilty && v.guilty.sentences;
    if (guilty && typeof guilty === 'object') {
      for (const [key, sent] of Object.entries(guilty)) {
        if (!sent || typeof sent !== 'object') continue;
        const req = sent.requires || {};
        const au = sent.available_unless || {};
        out.push({
          id: `guilty_${key}`,
          text: sent.label || key,
          consequence: sent.description || '',
          consequences: _poolEffectsNaConsequences(sent.effects),
          requires_moudrost_min: req.moudrost_min != null ? Number(req.moudrost_min) : undefined,
          requires_odvaha_min: req.odvaha_min != null ? Number(req.odvaha_min) : undefined,
          available_unless_vina_above: au.vina_above != null ? Number(au.vina_above) : undefined
        });
      }
    }
    const ng = v.not_guilty && v.not_guilty.approaches;
    if (ng && typeof ng === 'object') {
      for (const [key, app] of Object.entries(ng)) {
        if (!app || typeof app !== 'object') continue;
        out.push({
          id: `not_guilty_${key}`,
          text: app.label || key,
          consequence: app.description || '',
          consequences: _poolEffectsNaConsequences(app.effects)
        });
      }
    }
    const ins = v.insufficient_evidence;
    if (ins && typeof ins === 'object') {
      const reqM = ins.requires && ins.requires.moudrost_min != null ? Number(ins.requires.moudrost_min) : undefined;
      const opts = ins.options || {};
      for (const [key, opt] of Object.entries(opts)) {
        if (!opt || typeof opt !== 'object') continue;
        const base = ins.label || 'Nedostatek důkazů';
        out.push({
          id: `insufficient_${key}`,
          text: `${base} — ${opt.label || key}`,
          consequence: opt.label || '',
          consequences: _poolEffectsNaConsequences(opt.effects),
          requires_moudrost_min: reqM
        });
      }
    }
    return out;
  }

  /**
   * Převod záznamu z pool_cases_akt1.json na tvar očekávaný UI (testimony, hidden_info, verdicts …).
   */
  function normalizujPoolPripad(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const stav = typeof State !== 'undefined' && State.get ? State.get() : {};
    const inv = raw.investigation || {};
    const hidden_info = [];

    if (inv.interview && inv.interview.text) {
      const cInt = Number(inv.interview.cost);
      const rowI = {
        id: 'pool_inv_interview',
        action: 'witness',
        reveal: inv.interview.text,
        cost: Number.isFinite(cInt) && cInt > 0 ? cInt : 1
      };
      if (inv.interview.dirty_unlock !== undefined) rowI.dirty_unlock = inv.interview.dirty_unlock;
      hidden_info.push(rowI);
    }
    if (inv.records && inv.records.text) {
      const src = inv.records.source ? `(${inv.records.source})\n\n` : '';
      const recCost = Number(inv.records.cost);
      const rowR = {
        id: 'pool_inv_records',
        action: 'records',
        cost: Number.isFinite(recCost) && recCost > 0 ? recCost : 1,
        reveal: src + inv.records.text
      };
      if (inv.records.dirty_unlock !== undefined) rowR.dirty_unlock = inv.records.dirty_unlock;
      hidden_info.push(rowR);
    }
    if (inv.informant && inv.informant.variants) {
      const cInf = Number(inv.informant.cost);
      const rowN = {
        id: 'pool_inv_informant',
        action: 'informant',
        reveal: _vyberInformantText(inv.informant, stav),
        cost: Number.isFinite(cInf) && cInf > 0 ? cInf : 1
      };
      if (inv.informant.dirty_unlock !== undefined) rowN.dirty_unlock = inv.informant.dirty_unlock;
      hidden_info.push(rowN);
    }
    const konf = inv.confrontation;
    if (konf && typeof konf === 'object' && (konf.prompt || (konf.success && konf.success.text))) {
      const casti = [];
      if (konf.prompt) casti.push(String(konf.prompt).trim());
      if (konf.success && konf.success.text) casti.push(String(konf.success.text).trim());
      const kCost = Number(konf.cost);
      const rowK = {
        id: 'pool_inv_confrontation',
        action: 'confrontation',
        reveal: casti.filter(Boolean).join('\n\n'),
        cost: Number.isFinite(kCost) && kCost > 0 ? kCost : 2
      };
      if (konf.dirty_unlock !== undefined) rowK.dirty_unlock = konf.dirty_unlock;
      hidden_info.push(rowK);
    }

    const verdicts = _slozitPoolVerdikty(raw.verdicts);
    const testimony = (Array.isArray(raw.testimonies) ? raw.testimonies : []).map(t => ({
      label: t.speaker,
      source: t.speaker,
      text: t.text || ''
    }));

    return {
      ...raw,
      _fromPool: true,
      type: 'rutinni',
      day: Number.isFinite(Number(raw.day)) ? Number(raw.day) : 1,
      situation: raw.description || '',
      testimony,
      verdicts,
      hidden_info
    };
  }

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

    try {
      const odpovedPool = await fetch(SOUBOR_POOL_AKT1);
      if (!odpovedPool.ok) throw new Error(`HTTP ${odpovedPool.status}`);
      const poolJson = await odpovedPool.json();
      const pole = poolJson && typeof poolJson === 'object' && Array.isArray(poolJson.pool_cases_akt1)
        ? poolJson.pool_cases_akt1
        : [];
      _cache.poolCasesAkt1 = pole;
    } catch (e) {
      console.warn(`Nelze načíst ${SOUBOR_POOL_AKT1}:`, e.message);
      _cache.poolCasesAkt1 = [];
    }

    console.log(
      `[DataLoader] případy akt1/2/3: ${_cache.casesAkt1.length} / ${_cache.casesAkt2.length} / ${_cache.casesAkt3.length}, pool akt1: ${_cache.poolCasesAkt1.length}`
    );
    return _cache;
  }

  function ziskej(klic) {
    if (!Object.prototype.hasOwnProperty.call(_cache, klic)) {
      console.warn(`Data '${klic}' nejsou v cache. Zavolej nactiVse() nejprve.`);
      return null;
    }
    return _cache[klic];
  }

  /** Po nactiVse: days + (legacy případy nebo pool akt1). */
  function jeHernaDataOK() {
    const days = Object.prototype.hasOwnProperty.call(_cache, 'days') ? _cache.days : null;
    const cases = Object.prototype.hasOwnProperty.call(_cache, 'cases') ? _cache.cases : null;
    const pool = Object.prototype.hasOwnProperty.call(_cache, 'poolCasesAkt1') ? _cache.poolCasesAkt1 : null;
    const maPripady =
      (Array.isArray(cases) && cases.length > 0) ||
      (Array.isArray(pool) && pool.length > 0);
    return Array.isArray(days) && days.length > 0 && maPripady;
  }

  // Pomocné gettery

  function ziskejPripad(id) {
    const k = String(id == null ? '' : id).trim();
    if (!k) return null;
    const pool = ziskej('poolCasesAkt1');
    if (Array.isArray(pool)) {
      const raw = pool.find(c => c && String(c.id || '').trim() === k);
      if (raw) return normalizujPoolPripad(raw);
    }
    const cases = ziskej('cases');
    if (!cases) return null;
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
    normalizujPoolPripad,
    ziskejDen,
    ziskejPostavu,
    ziskejFragment,
    ziskejFrakci,
    ziskejTextyRysu
  };

})();

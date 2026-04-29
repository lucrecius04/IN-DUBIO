/**
 * Generuje docs/scenar/Pripady.csv z data/days.json (dny 1–15) + data/pool_cases_akt1.json.
 * INT..FIN = min..max z consequences jednotlivých verdiktů (bez runtime typových bonusů z cases.js).
 * Spustit: node scripts/build-pripady-csv.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'scenar', 'Pripady.csv');
const DAYS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'days.json'), 'utf8'));
const POOL = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'pool_cases_akt1.json'), 'utf8'));
const CASES = Array.isArray(POOL.pool_cases_akt1) ? POOL.pool_cases_akt1 : [];
const BY_ID = Object.fromEntries(CASES.map(c => [c.id, c]));

const TR = ['Integrita', 'Odvaha', 'Moudrost', 'Vina', 'Nadeje'];
const FR = ['Moc', 'Kapital', 'Lid'];

function initRange() {
  return { min: Infinity, max: -Infinity, has: false };
}

function addNum(r, n) {
  if (!Number.isFinite(n) || n === 0) return;
  r.min = Math.min(r.min, n);
  r.max = Math.max(r.max, n);
  r.has = true;
}

function fmtRange(r) {
  if (!r.has) return '—';
  if (r.min === r.max) return String(r.min);
  return `${r.min}..${r.max}`;
}

/** Stejná logika jako `js/data-loader.js` `_poolEffectsNaConsequences`. */
function poolEffectsNaConsequences(eff) {
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
  const flags = [];
  if (Array.isArray(e.flags)) {
    for (const f of e.flags) {
      if (!f || typeof f !== 'object') continue;
      const key = String(f.key || '').trim();
      if (!key) continue;
      flags.push({ key, value: f.value });
    }
  }
  return { traits, factions, trust: {}, finance, flags };
}

/** Stejná logika jako `js/data-loader.js` `_slozitPoolVerdikty`. */
function slozitPoolVerdikty(verdictsRoot) {
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
        consequences: poolEffectsNaConsequences(sent.effects),
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
        consequences: poolEffectsNaConsequences(app.effects)
      });
    }
  }
  const ins = v.insufficient_evidence;
  if (ins && typeof ins === 'object') {
    const reqM = ins.requires && ins.requires.moudrost_min != null ? Number(ins.requires.moudrost_min) : undefined;
    const opts = ins.options || {};
    for (const [key, opt] of Object.entries(opts)) {
      if (!opt || typeof opt !== 'object') continue;
      out.push({
        id: `insufficient_${key}`,
        consequences: poolEffectsNaConsequences(opt.effects),
        requires_moudrost_min: reqM
      });
    }
  }
  return out;
}

function verdictRowsProAgregaci(c) {
  if (Array.isArray(c.verdicts)) return c.verdicts;
  return slozitPoolVerdikty(c.verdicts);
}

function aggregateVerdicts(c) {
  const verdicts = verdictRowsProAgregaci(c);
  const traits = Object.fromEntries(TR.map(k => [k, initRange()]));
  const frak = Object.fromEntries(FR.map(k => [k, initRange()]));
  const fin = initRange();
  const trust = { vlcek: initRange(), zavadova: initRange(), karas: initRange() };

  for (const v of verdicts) {
    const cons = v && v.consequences ? v.consequences : {};
    const tr = cons.traits || {};
    for (const k of TR) {
      if (tr[k] == null) continue;
      addNum(traits[k], Number(tr[k]));
    }
    const fac = cons.factions || {};
    for (const k of FR) {
      const legacy = k === 'Moc' ? fac.Stat : k === 'Kapital' ? fac.Obchodnici : null;
      const raw = fac[k] != null ? fac[k] : legacy;
      if (raw == null) continue;
      addNum(frak[k], Number(raw));
    }
    if (cons.finance != null) addNum(fin, Number(cons.finance));
    const tru = cons.trust || {};
    for (const nk of ['vlcek', 'zavadova', 'karas']) {
      if (tru[nk] == null) continue;
      addNum(trust[nk], Number(tru[nk]));
    }
  }

  const trustStr = ['vlcek', 'zavadova', 'karas']
    .map(nk => {
      const r = trust[nk];
      if (!r.has) return '';
      return `${nk}:${fmtRange(r)}`;
    })
    .filter(Boolean)
    .join('; ') || '—';

  return {
    INT: fmtRange(traits.Integrita),
    ODV: fmtRange(traits.Odvaha),
    MOU: fmtRange(traits.Moudrost),
    VIN: fmtRange(traits.Vina),
    NAD: fmtRange(traits.Nadeje),
    MOC: fmtRange(frak.Moc),
    LID: fmtRange(frak.Lid),
    KAP: fmtRange(frak.Kapital),
    FIN: fmtRange(fin),
    trustStr
  };
}

function normType(t) {
  const s = String(t || '').toLowerCase();
  if (s === 'routine' || s === 'rutinni' || s === 'rut') return 'Rut';
  if (s === 'moral_dilemma' || s === 'moraldilemma' || s === 'moralni' || s === 'mor') return 'Mor';
  if (s === 'personal' || s === 'osobni' || s === 'osob') return 'Osob';
  if (s === 'political' || s === 'politicky' || s === 'pol') return 'Pol';
  if (s === 'vlakno') return 'Vlak';
  return s || '?';
}

function defendantName(c) {
  const d = c.defendant;
  if (!d) return '—';
  if (typeof d === 'string') return d;
  if (d.name) return d.name;
  return '—';
}

function esc(s) {
  return String(s == null ? '' : s).replace(/\r?\n/g, ' ').replace(/;/g, ',');
}

function hiddenInfoSummary(c) {
  const n = Array.isArray(c.hidden_info) ? c.hidden_info.length : 0;
  const clue = c.clue_system && c.clue_system.enabled === true ? 'clue' : '';
  return [`hidden_info:${n}`, clue].filter(Boolean).join('+') || '—';
}

function hasHaasInCase(c) {
  return /haas/i.test(JSON.stringify(c)) ? 'ANO' : 'Ne';
}

function vrstva(id) {
  return String(id).startsWith('tyc_') ? 'Tyc' : 'Pool';
}

const lines = [];
lines.push(
  'ID;Den;Slot;Nazev;Sp.zn.;Typ;Vrstva;Varianta;Podminka;Obzalovany;INT;ODV;MOU;VIN;NAD;MOC;LID;KAP;FIN;TrustNPC;Rozpory;Pruzkum klic;Haas?;Odlozeny dusledek;Pozn'
);

for (const d of DAYS) {
  const den = Number(d.day);
  if (!Number.isFinite(den) || den < 1 || den > 15) continue;

  const ids = Array.isArray(d.cases) ? d.cases : [];
  const lights = Array.isArray(d.cases_light) ? d.cases_light : [];

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const c = BY_ID[id];
    const slot = i + 1;
    const vari = lights[i] === true ? 'light' : '—';
    const req = c && c.requires ? esc(JSON.stringify(c.requires)) : '—';

    if (!c) {
      lines.push(
        [
          esc(id),
          den,
          slot,
          'CHYBA',
          '—',
          '?',
          '?',
          vari,
          req,
          '—',
          '—',
          '—',
          '—',
          '—',
          '—',
          '—',
          '—',
          '—',
          '—',
          '—',
          '—',
          '—',
          'Ne',
          '—',
          'Case nenalezen v pool_cases_akt1.json'
        ].join(';')
      );
      continue;
    }

    const agg = aggregateVerdicts(c);
    const rozCount = Array.isArray(c.contradictions) ? c.contradictions.length : 0;
    const rozIds = Array.isArray(c.contradictions)
      ? c.contradictions
          .map(x => x && x.id)
          .filter(Boolean)
          .slice(0, 3)
          .join(',')
      : '';
    const roz = rozCount ? `n=${rozCount}${rozIds ? `(${esc(rozIds)})` : ''}` : '—';

    const pozn = [
      `trust:${agg.trustStr}`,
      c.bribe_amount ? `uplatek:${c.bribe_amount}` : ''
    ]
      .filter(Boolean)
      .join(' | ');

    lines.push(
      [
        esc(c.id),
        den,
        slot,
        esc(c.title),
        esc(c.case_number || '—'),
        normType(c.type),
        vrstva(c.id),
        vari,
        req,
        esc(defendantName(c)),
        agg.INT,
        agg.ODV,
        agg.MOU,
        agg.VIN,
        agg.NAD,
        agg.MOC,
        agg.LID,
        agg.KAP,
        agg.FIN,
        agg.trustStr,
        roz,
        hiddenInfoSummary(c),
        hasHaasInCase(c),
        '—',
        esc(pozn || 'zdroj: pool_cases_akt1 verdicts')
      ].join(';')
    );
  }

  if (d.adventure_scene && d.adventure_scene.id) {
    const aid = d.adventure_scene.id;
    lines.push(
      [
        esc(aid),
        den,
        0,
        'Adventure scena',
        '—',
        'Osob',
        'Scena',
        '—',
        '—',
        esc(d.adventure_scene.portrait_label || '—'),
        '—',
        '—',
        '—',
        '—',
        '—',
        '—',
        '—',
        '—',
        '—',
        '—',
        '—',
        '—',
        'Ne',
        '—',
        'efekty v choices v data/days.json adventure_scene'
      ].join(';')
    );
  }
}

fs.writeFileSync(OUT, lines.join('\n') + '\n', 'utf8');
console.log('Wrote', OUT, 'lines', lines.length);

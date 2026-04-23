/**
 * Úprava JSON případů: typy, political_stance, personal_outcome; odstranění zastaralého correct_verdict.
 * Spuštění: node tools/patch-case-bonus-data.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const TYPE_FIX = {
  case_021: 'moralni',
  case_024: 'moralni',
  case_025: 'moralni',
  case_027: 'politicky',
  case_028: 'politicky',
  case_030: 'moralni',
  case_069: 'moralni',
  case_070: 'moralni',
  case_osobni_1: 'osobni',
  case_071: 'osobni',
  case_haas_2: 'politicky',
  case_haas_3: 'politicky',
  case_068: 'politicky'
};

const POLITICAL_STANCE = {
  case_005: {
    guilty_fine: 'system',
    acquit: 'independent',
    podminka: null
  },
  case_008: {
    guilty_fine: 'system',
    acquit: 'independent',
    postpone: 'independent'
  },
  case_013: {
    prison_6m: 'system',
    acquit: 'independent',
    postpone: 'independent'
  },
  case_027: {
    kacér_vinen: 'system',
    zamitnut: 'independent'
  },
  case_028: {
    holub_vinen: 'independent',
    zamitnut: 'system'
  },
  case_068: {
    acquit: 'independent',
    pokuta_mala: 'system',
    prison_1m: 'system'
  },
  case_haas_2: {
    haas_pokuta: 'independent',
    jen_upozorneni: 'system',
    zamitnut: 'system'
  },
  case_haas_3: {
    haas_vinen: 'independent',
    odlozit: 'system',
    zamitnut_politika: 'system'
  }
};

const MARKOVA_OUTCOME = {
  markova_vinna: 'fair',
  podminka: 'fair',
  zprosten: 'biased'
};

const OSOBNI_1_OUTCOME = {
  david_vinen: 'fair',
  david_podminka: 'fair',
  zprosit: 'biased'
};

const OSOBNI_71_OUTCOME = {
  jako_vzdy: 'fair',
  pro_nej: 'biased'
};

function patchVerdictMap(c, map) {
  if (!map || !Array.isArray(c.verdicts)) return;
  const M = map[c.id];
  if (!M) return;
  for (const v of c.verdicts) {
    if (Object.prototype.hasOwnProperty.call(M, v.id)) {
      const val = M[v.id];
      if (val == null) delete v.political_stance;
      else v.political_stance = val;
    }
  }
}

function patchCase(c) {
  const id = c.id;
  if (TYPE_FIX[id]) c.type = TYPE_FIX[id];

  if (c.correct_verdict) delete c.correct_verdict;

  patchVerdictMap(c, POLITICAL_STANCE);

  if (id === 'case_markova_4' && Array.isArray(c.verdicts)) {
    for (const v of c.verdicts) {
      if (MARKOVA_OUTCOME[v.id]) v.personal_outcome = MARKOVA_OUTCOME[v.id];
    }
  }

  if (id === 'case_osobni_1' && Array.isArray(c.verdicts)) {
    for (const v of c.verdicts) {
      if (OSOBNI_1_OUTCOME[v.id]) v.personal_outcome = OSOBNI_1_OUTCOME[v.id];
    }
  }

  if (id === 'case_071' && Array.isArray(c.verdicts)) {
    for (const v of c.verdicts) {
      if (OSOBNI_71_OUTCOME[v.id]) v.personal_outcome = OSOBNI_71_OUTCOME[v.id];
    }
  }
}

function validate(arr, fname) {
  const byId = new Map(arr.map(c => [c.id, c]));
  for (const [id, vid] of Object.entries(CORRECT_VERDICT)) {
    const c = byId.get(id);
    if (!c) {
      console.warn('CORRECT_VERDICT: unknown case', id, 'in', fname);
      continue;
    }
    const ok = (c.verdicts || []).some(v => v.id === vid);
    if (!ok) console.warn('CORRECT_VERDICT: missing verdict', id, vid, fname);
  }
}

for (const rel of ['data/cases-akt1.json', 'data/cases-akt2.json', 'data/cases-akt3.json']) {
  const fp = path.join(ROOT, rel);
  const arr = JSON.parse(fs.readFileSync(fp, 'utf8'));
  for (const c of arr) patchCase(c);
  validate(arr, rel);
  fs.writeFileSync(fp, JSON.stringify(arr, null, 2) + '\n', 'utf8');
  console.log('patched', rel);
}

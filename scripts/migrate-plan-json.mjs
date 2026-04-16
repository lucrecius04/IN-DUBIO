/**
 * Jednorázová migrace dat: frakce Moc/Kapital/Lid, bez Maska/Cirkev v číslech,
 * trust jen vlcek/zavadova/karas (horakova→zavadova, masek→karas; benes/haas pryč).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function mergeNum(out, key, v) {
  const d = Number(v);
  if (!Number.isFinite(d)) return;
  out[key] = (Number(out[key]) || 0) + d;
}

function migrateTrustObject(t) {
  if (!t || typeof t !== 'object') return t;
  const out = {};
  for (const [k, v] of Object.entries(t)) {
    if (k === 'benes' || k === 'haas') continue;
    let nk = k;
    if (k === 'horakova') nk = 'zavadova';
    if (k === 'masek') nk = 'karas';
    mergeNum(out, nk, v);
  }
  return out;
}

/** effects / traits: čísla + Maska/Cirkev/Stat/Obchodnici */
function migrateMixedNumericMap(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'flags') {
      out.flags = v;
      continue;
    }
    if (k === 'trust' && v && typeof v === 'object' && !Array.isArray(v)) {
      out.trust = migrateTrustObject(v);
      continue;
    }
    const d = Number(v);
    if (!Number.isFinite(d)) continue;
    if (k === 'Stat') mergeNum(out, 'Moc', d);
    else if (k === 'Obchodnici') mergeNum(out, 'Kapital', d);
    else if (k === 'Cirkev') mergeNum(out, 'Lid', d);
    else if (k === 'Maska') mergeNum(out, 'Vina', d);
    else mergeNum(out, k, d);
  }
  return out;
}

function migrateConsequences(c) {
  if (!c || typeof c !== 'object') return c;
  const o = { ...c };
  if (o.traits && typeof o.traits === 'object') {
    const t = migrateMixedNumericMap({ ...o.traits });
    delete t.flags;
    delete t.trust;
    o.traits = t;
  }
  if (o.factions && typeof o.factions === 'object') {
    const f = {};
    for (const [k, v] of Object.entries(o.factions)) {
      const d = Number(v);
      if (!Number.isFinite(d)) continue;
      if (k === 'Stat') mergeNum(f, 'Moc', d);
      else if (k === 'Obchodnici') mergeNum(f, 'Kapital', d);
      else if (k === 'Cirkev') mergeNum(f, 'Lid', d);
      else mergeNum(f, k, d);
    }
    o.factions = f;
  }
  if (o.trust && typeof o.trust === 'object') o.trust = migrateTrustObject(o.trust);
  return o;
}

function walk(node, parentKey) {
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) node[i] = walk(node[i], parentKey);
    return node;
  }
  if (node && typeof node === 'object') {
    if (parentKey === 'consequences') {
      return migrateConsequences(node);
    }
    if (parentKey === 'effects') {
      return migrateMixedNumericMap(node);
    }
    if (parentKey === 'trust' && !Array.isArray(node)) {
      return migrateTrustObject(node);
    }
    for (const k of Object.keys(node)) {
      node[k] = walk(node[k], k);
    }
    return node;
  }
  return node;
}

const files = [
  'data/days.json',
  'data/cases-akt1.json',
  'data/cases-akt2.json',
  'data/cases-akt3.json'
];

for (const rel of files) {
  const fp = path.join(root, rel);
  const raw = fs.readFileSync(fp, 'utf8');
  const data = JSON.parse(raw);
  walk(data, null);
  fs.writeFileSync(fp, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log('OK', rel);
}

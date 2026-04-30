/**
 * Vloží staging případy z docs/Pripady do data/pool_cases_akt1.json (stejné schéma).
 * Spusť: node scripts/merge-staging-pool-akt1.js
 */
const fs = require('fs');
const path = require('path');

const poolPath = path.join(__dirname, '..', 'data', 'pool_cases_akt1.json');
const pool = JSON.parse(fs.readFileSync(poolPath, 'utf8'));
const arr = pool.pool_cases_akt1;
const ids = new Set(arr.map((c) => c && c.id).filter(Boolean));

const stagingFiles = [
  'docs/Pripady/tyc_bozena_1.json',
  'docs/Pripady/tyc_bozena_2.json',
  'docs/Pripady/tyc_hranice_1.json',
  'docs/Pripady/tyc_pospisil_1.json',
  'docs/Pripady/tyc_markova_1.json'
];

for (const rel of stagingFiles) {
  const fp = path.join(__dirname, '..', rel);
  const obj = JSON.parse(fs.readFileSync(fp, 'utf8'));
  if (!obj || !obj.id) {
    console.warn('Přeskočeno (chybí id):', rel);
    continue;
  }
  if (ids.has(obj.id)) {
    console.log('už v poolu:', obj.id);
    continue;
  }
  arr.push(obj);
  ids.add(obj.id);
  console.log('přidáno:', obj.id, '←', rel);
}

fs.writeFileSync(poolPath, JSON.stringify(pool, null, 2) + '\n', 'utf8');
console.log('Hotovo:', poolPath, '— položek:', arr.length);

/**
 * Přepočítá denní a kumulativní bilance v docs/scenar/Balancing.csv.
 * Bere v úvahu i ruční zásah ve sloupci "Manual zasah (vikend/design)".
 *
 * Spustit:
 *   node scripts/recalc-balancing.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BAL_PATH = path.join(ROOT, 'docs', 'scenar', 'Balancing.csv');

function parseNumber(raw) {
  const s = String(raw == null ? '' : raw).trim().replace(',', '.');
  if (!s || s === '—' || s === '-') return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function mustIndex(map, name) {
  if (!(name in map)) throw new Error(`Chybi sloupec "${name}" v Balancing.csv`);
  return map[name];
}

function main() {
  const raw = fs.readFileSync(BAL_PATH, 'utf8').replace(/\r\n/g, '\n').trimEnd();
  const lines = raw.split('\n');
  if (lines.length < 2) throw new Error('Balancing.csv nema zadna data.');

  const header = lines[0].split(';');
  const idx = Object.fromEntries(header.map((name, i) => [name, i]));

  const iType = mustIndex(idx, 'TypDne');
  const iIncomeMin = mustIndex(idx, 'Prijmy pripady min');
  const iIncomeMid = mustIndex(idx, 'Prijmy pripady stred');
  const iIncomeMax = mustIndex(idx, 'Prijmy pripady max');
  const iPlat = mustIndex(idx, 'Plat');
  const iVydaje = mustIndex(idx, 'Vydaje');
  const iSpecial = mustIndex(idx, 'Specialni system');
  const iManual = mustIndex(idx, 'Manual zasah (vikend/design)');
  const iDayMin = mustIndex(idx, 'Denni bilance min');
  const iDayMid = mustIndex(idx, 'Denni bilance stred');
  const iDayMax = mustIndex(idx, 'Denni bilance max');
  const iCumMin = mustIndex(idx, 'Kumulativ min');
  const iCumMid = mustIndex(idx, 'Kumulativ stred');
  const iCumMax = mustIndex(idx, 'Kumulativ max');

  let cumMin = 0;
  let cumMid = 0;
  let cumMax = 0;

  for (let r = 1; r < lines.length; r++) {
    const row = lines[r].split(';');
    if (row.length < header.length) {
      while (row.length < header.length) row.push('');
    }

    const type = String(row[iType] || '').trim().toLowerCase();
    const isStart = type === 'start';

    if (isStart) {
      cumMin = parseNumber(row[iCumMin]);
      cumMid = parseNumber(row[iCumMid]);
      cumMax = parseNumber(row[iCumMax]);
      row[iDayMin] = '0';
      row[iDayMid] = '0';
      row[iDayMax] = '0';
      lines[r] = row.join(';');
      continue;
    }

    const baseMin =
      parseNumber(row[iIncomeMin]) +
      parseNumber(row[iPlat]) +
      parseNumber(row[iVydaje]) +
      parseNumber(row[iSpecial]) +
      parseNumber(row[iManual]);

    const baseMid =
      parseNumber(row[iIncomeMid]) +
      parseNumber(row[iPlat]) +
      parseNumber(row[iVydaje]) +
      parseNumber(row[iSpecial]) +
      parseNumber(row[iManual]);

    const baseMax =
      parseNumber(row[iIncomeMax]) +
      parseNumber(row[iPlat]) +
      parseNumber(row[iVydaje]) +
      parseNumber(row[iSpecial]) +
      parseNumber(row[iManual]);

    cumMin += baseMin;
    cumMid += baseMid;
    cumMax += baseMax;

    row[iDayMin] = String(baseMin);
    row[iDayMid] = String(baseMid);
    row[iDayMax] = String(baseMax);
    row[iCumMin] = String(cumMin);
    row[iCumMid] = String(cumMid);
    row[iCumMax] = String(cumMax);

    lines[r] = row.join(';');
  }

  fs.writeFileSync(BAL_PATH, lines.join('\n') + '\n', 'utf8');
  console.log(`Recalculated ${BAL_PATH}`);
}

main();

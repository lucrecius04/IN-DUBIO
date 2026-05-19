/**
 * Projde 8 cílových person (konce) × 19 dní a vypíše tabulku endingType.
 * Použití: node scripts/playtest-konce-matrix.js
 *          node scripts/playtest-konce-matrix.js 11   (zkráceně jen do D11+)
 */

'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PERSONAS = [
  'stredni_cesta',
  'korupcni',
  'hrdina_cisty',
  'zbohaceny_utek',
  'smireni_mekky',
  'atentat_moc',
  'kruh_temny',
  'anna_pravda',
];

const days = Number(process.argv[2]) || 19;

function spustPersonu(personaId) {
  return new Promise((resolve) => {
    const proc = spawn(
      process.execPath,
      [path.join(__dirname, 'playtest-run.js'), personaId, String(days)],
      {
        cwd: ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, PLAYTEST_EXTERNAL_SERVER: '1' },
      }
    );
    let out = '';
    proc.stdout.on('data', d => { out += d; process.stdout.write(d); });
    proc.stderr.on('data', d => { process.stderr.write(d); });
    proc.on('close', code => {
      let reportPath = null;
      const m = out.match(/report:\s+(.+?\.json)/i);
      if (m) {
        const raw = m[1].trim();
        reportPath = path.isAbsolute(raw) ? raw : path.join(ROOT, raw.replace(/^[/\\]/, ''));
        if (!fs.existsSync(reportPath)) {
          const base = path.basename(raw);
          const alt = path.join(ROOT, 'artifacts', 'playtest', base);
          if (fs.existsSync(alt)) reportPath = alt;
        }
      }
      resolve({ personaId, code, reportPath });
    });
  });
}

async function main() {
  console.log(`\n=== Matice konců — ${days} dní, ${PERSONAS.length} person ===\n`);
  const vysledky = [];

  for (const id of PERSONAS) {
    console.log(`\n--- ${id} ---\n`);
    const r = await spustPersonu(id);
    let ending = '?';
    let finance = null;
    if (r.reportPath) {
      try {
        const rep = JSON.parse(fs.readFileSync(r.reportPath, 'utf8'));
        const snaps = rep.day_snapshots || [];
        const last = snaps[snaps.length - 1] || {};
        ending = rep.metrics?.endingType || last.endingType || '?';
        finance = rep.metrics?.finance_konec ?? last.finance?.balance ?? null;
      } catch (e) {
        ending = `err: ${e.message}`;
      }
    }
    vysledky.push({ persona: id, ending, finance, code: r.code });
  }

  console.log('\n=== SHRNUTÍ ===\n');
  console.log('| Persona | Konec | Finance | Exit |');
  console.log('|---------|-------|---------|------|');
  for (const v of vysledky) {
    console.log(`| ${v.persona} | ${v.ending} | ${v.finance ?? '—'} | ${v.code} |`);
  }
  const unikatni = new Set(vysledky.map(v => v.ending));
  console.log(`\nUnikátních konců: ${unikatni.size} / 8\n`);
  process.exit(vysledky.some(v => v.code !== 0) ? 1 : 0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

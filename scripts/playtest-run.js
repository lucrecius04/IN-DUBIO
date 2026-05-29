/**
 * playtest-run.js — Playwright playtest runner pro IN DUBIO
 *
 * Spouští headless Chromium, projde hru jako zvolená persona a zapíše
 * JSON snapshot stavu po každém dni do artifacts/playtest/.
 *
 * Použití:
 *   node scripts/playtest-run.js [persona] [pocet_dni]
 *   node scripts/playtest-run.js rychlosoudce 3
 *   node scripts/playtest-run.js archivar 3
 *   node scripts/playtest-run.js milosrny 19
 *   node scripts/playtest-run.js prisny_statnik 19
 *   npm run playtest
 *
 * Před spuštěním musí být hra dostupná přes HTTP. Pokud na portu 3000 (výchozí)
 * nic neběží, runner spustí `npx serve` automaticky. Jinak použije běžící server.
 * Port lze přepsat: PORT=3001 node scripts/playtest-run.js
 *
 * Viz docs/playtesting/AI-persony-a-reporty.md a Jizdni-rad-balancingu.md.
 */

'use strict';

const { chromium } = require('playwright');
const { spawn }    = require('child_process');
const path         = require('path');
const fs           = require('fs');
const crypto       = require('crypto');
const http         = require('http');

// ---------------------------------------------------------------------------
// Konfigurace
// ---------------------------------------------------------------------------

const ROOT         = path.resolve(__dirname, '..');
// Port lze přepsat přes env: PORT=3000 node scripts/playtest-run.js
// Výchozí 3000 = stejný jako `npx serve .` bez parametrů.
const PORT         = Number(process.env.PORT) || 3000;
const BASE_URL     = `http://localhost:${PORT}`;
const ARTIFACTS    = path.join(ROOT, 'artifacts', 'playtest');
const TIMEOUT_MS              = 25_000;  // čekání na UI prvky (modál, verdikty)
const DAY_TRANSITION_TIMEOUT_MS = 60_000; // přechod dne (animace + fragmenty)
const DAY_PAUSE_MS            = 1_200;   // pauza po přechodu dne
const ACT_PAUSE_MS            = 350;     // pauza po každé akci (render)

// ---------------------------------------------------------------------------
// Popisy person (deterministická pravidla, ne LLM)
// ---------------------------------------------------------------------------

const PERSONAS = {
  /**
   * Rychlosoudce: žádný průzkum, první legální verdikt v obou krocích,
   * první večerní volba, první adventure větev.
   */
  rychlosoudce: {
    id: 'rychlosoudce',
    pruzkum: 'none',
    skupinaPoradi: ['guilty', 'not_guilty', 'insufficient'],
    verdiktKrok2: 'first-enabled',
    vecerniVolba: 'first',
    adventureVolba: 'first',
    prijmoutUplatek: true,
  },

  /**
   * Archivář: maximální průzkum (klikne na všechny dostupné akce),
   * pak verdikt (zatím první legální v krok 2),
   * konzervativní večerní volby (poslední v pořadí).
   */
  archivar: {
    id: 'archivar',
    pruzkum: 'all',
    skupinaPoradi: ['guilty', 'not_guilty', 'insufficient'],
    verdiktKrok2: 'archivar',
    vecerniVolba: 'last',
    adventureVolba: 'first',
    prijmoutUplatek: true,
  },

  /**
   * Milosrdný soudce: spodní hranice balancu (jízdní řád — průchod A).
   * Bez řádného průzkumu (jen clue pátrání), preferuje nevinen / odložení,
   * odmítá úplatek na stole, mírnější adventure a večerní volby.
   */
  milosrny: {
    id: 'milosrny',
    pruzkum: 'clue-only',
    skupinaPoradi: ['not_guilty', 'insufficient', 'guilty'],
    verdiktKrok2: 'milosrny_fair',
    vecerniVolba: 'last',
    adventureVolba: 'last',
    prijmoutUplatek: false,
  },

  /**
   * Přísný státník: horní hranice balancu (jízdní řád — průchod B).
   * Minimální průzkum (1× řádně + clue), skupina Vinen první,
   * preferuje maximum / standard / obálku, dirty path povolená.
   */
  prisny_statnik: {
    id: 'prisny_statnik',
    pruzkum: 'minimal',
    skupinaPoradi: ['guilty', 'insufficient', 'not_guilty'],
    verdiktKrok2: 'prisny',
    vecerniVolba: 'first',
    adventureVolba: 'first',
    prijmoutUplatek: true,
  },

  // --- Cílové persony pro osm konců (Vlna D) — viz Plan-zitra-konce-a-balancing.md ---

  stredni_cesta: {
    id: 'stredni_cesta',
    pruzkum: 'minimal',
    skupinaPoradi: ['insufficient', 'not_guilty', 'guilty'],
    verdiktKrok2: 'stredni',
    vecerniVolba: 'middle',
    adventureVolba: 'benes_odmitl',
    prijmoutUplatek: false,
    vychoziUpravy: {
      traits: { Integrita: 50, Odvaha: 48, Moudrost: 52, Vina: 48, Nadeje: 50 },
      finance: { balance: 165, dluh: 0 },
      trust: { vlcek: 2, zavadova: 1, karas: 1 },
    },
    haasSkupinaPoradi: ['not_guilty', 'guilty'],
    haasVolba: 'odmitnout',
    zavadovaVolba: 'odmitnout',
  },

  korupcni: {
    id: 'korupcni',
    pruzkum: 'none',
    skupinaPoradi: ['guilty', 'guilty', 'insufficient'],
    verdiktKrok2: 'prisny',
    vecerniVolba: 'first',
    adventureVolba: 'benes_odmitl',
    prijmoutUplatek: true,
    vychoziUpravy: {
      traits: { Integrita: 18, Odvaha: 45, Moudrost: 40, Vina: 78, Nadeje: 40 },
    },
    haasSkupinaPoradi: ['guilty', 'guilty'],
    haasVolba: 'vzit',
    zavadovaVolba: 'odmitnout',
  },

  hrdina_cisty: {
    id: 'hrdina_cisty',
    pruzkum: 'clue-only',
    skupinaPoradi: ['insufficient', 'not_guilty', 'guilty'],
    verdiktKrok2: 'hrdina',
    vecerniVolba: 'last',
    adventureVolba: 'benes_odmitl',
    prijmoutUplatek: false,
    vychoziUpravy: {
      traits: { Integrita: 76, Odvaha: 74, Moudrost: 52, Vina: 42, Nadeje: 52 },
      trust: { vlcek: 0, karas: 1, zavadova: 0 },
      finance: { balance: 140, dluh: 0 },
    },
    haasSkupinaPoradi: ['not_guilty', 'guilty'],
    haasVolba: 'odmitnout',
    zavadovaVolba: 'odmitnout',
  },

  zbohaceny_utek: {
    id: 'zbohaceny_utek',
    pruzkum: 'minimal',
    skupinaPoradi: ['guilty', 'not_guilty', 'insufficient'],
    verdiktKrok2: 'zbohaceny',
    vecerniVolba: 'last',
    adventureVolba: 'benes_odmitl',
    prijmoutUplatek: false,
    vychoziUpravy: {
      traits: { Integrita: 62, Odvaha: 54, Moudrost: 50, Vina: 48, Nadeje: 55 },
      finance: { balance: 255, dluh: 0 },
      trust: { karas: 2, vlcek: 1, zavadova: 0 },
    },
    operaceVolba: 'zaplatit_vcas',
    haasSkupinaPoradi: ['not_guilty', 'guilty'],
    haasVolba: 'odmitnout',
  },

  smireni_mekky: {
    id: 'smireni_mekky',
    pruzkum: 'minimal',
    skupinaPoradi: ['not_guilty', 'insufficient', 'guilty'],
    verdiktKrok2: 'milosrny_fair',
    vecerniVolba: 'last',
    adventureVolba: 'benes_prijal',
    prijmoutUplatek: false,
    vychoziUpravy: {
      traits: { Integrita: 66, Odvaha: 50, Moudrost: 64, Vina: 16, Nadeje: 58 },
      finance: { balance: 295, dluh: 0 },
    },
    operaceVolba: 'zaplatit_vcas',
    haasSkupinaPoradi: ['not_guilty', 'guilty'],
    haasVolba: 'odmitnout',
  },

  atentat_moc: {
    id: 'atentat_moc',
    pruzkum: 'minimal',
    skupinaPoradi: ['guilty', 'insufficient', 'not_guilty'],
    verdiktKrok2: 'atentat',
    vecerniVolba: 'last',
    adventureVolba: 'benes_prijal',
    prijmoutUplatek: false,
    vychoziUpravy: {
      traits: { Integrita: 68, Odvaha: 80, Moudrost: 54, Vina: 32, Nadeje: 45 },
      trust: { vlcek: 0, karas: 1, zavadova: 0 },
      factions: { Moc: 16, Lid: 62, Kapital: 48 },
      finance: { balance: 175, dluh: 0 },
    },
    operaceVolba: 'odlozit_vcas',
    haasSkupinaPoradi: ['not_guilty', 'guilty'],
    haasVolba: 'odmitnout',
  },

  kruh_temny: {
    id: 'kruh_temny',
    pruzkum: 'none',
    skupinaPoradi: ['guilty', 'insufficient', 'guilty'],
    verdiktKrok2: 'prisny',
    vecerniVolba: 'first',
    adventureVolba: 'benes_odmitl',
    prijmoutUplatek: true,
    zvratyVolba: 'znicit',
    vychoziUpravy: {
      traits: { Integrita: 58, Odvaha: 45, Moudrost: 45, Vina: 62, Nadeje: 40 },
      trust: { zavadova: 0, vlcek: 1, karas: 1 },
    },
    haasSkupinaPoradi: ['guilty', 'guilty'],
    haasVolba: 'vzit',
    zavadovaVolba: 'podepsat',
  },

  anna_pravda: {
    id: 'anna_pravda',
    pruzkum: 'all',
    skupinaPoradi: ['not_guilty', 'insufficient', 'guilty'],
    verdiktKrok2: 'milosrny_fair',
    vecerniVolba: 'last',
    adventureVolba: 'benes_prijal',
    prijmoutUplatek: false,
    vychoziUpravy: {
      traits: { Integrita: 72, Odvaha: 48, Moudrost: 65, Vina: 15, Nadeje: 55 },
      finance: { balance: 48, dluh: 0 },
    },
    operaceVolba: 'odlozit_vcas',
    haasSkupinaPoradi: ['not_guilty', 'guilty'],
    haasVolba: 'odmitnout',
  },
};

// ---------------------------------------------------------------------------
// HTTP server pomocník
// ---------------------------------------------------------------------------

function jeServerBezny(port) {
  return new Promise(resolve => {
    const req = http.get(`http://localhost:${port}`, () => resolve(true));
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => { req.destroy(); resolve(false); });
  });
}

async function spustServer() {
  const bezi = await jeServerBezny(PORT);
  if (bezi) {
    console.log(`[server] Port ${PORT} je obsazen — předpokládám, že hra běží.`);
    return null;
  }
  if (process.env.PLAYTEST_EXTERNAL_SERVER === '1') {
    throw new Error(
      `[server] Port ${PORT} neběží. Spusťte v jiném terminálu: npm run serve`
    );
  }
  console.log(`[server] Spouštím npx serve na portu ${PORT}…`);
  // Na Windows spawn s shell:true a cestou s mezerou selže — používáme cmd /c
  // s explicitními uvozovkami kolem ROOT.
  const isWin = process.platform === 'win32';
  const proc = isWin
    ? spawn('cmd', ['/c', `npx serve -l ${PORT}`], { cwd: ROOT, stdio: 'pipe', detached: false })
    : spawn('npx', ['serve', '-l', String(PORT)], { cwd: ROOT, stdio: 'pipe', detached: false });
  proc.stderr.on('data', d => process.stderr.write('[serve] ' + d));
  // Počkat na start (max 5 s)
  for (let i = 0; i < 10; i++) {
    await pauza(500);
    if (await jeServerBezny(PORT)) break;
  }
  return proc;
}

// ---------------------------------------------------------------------------
// Pomocné čekací funkce
// ---------------------------------------------------------------------------

function pauza(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Čeká, dokud prvek pasující `selector` není viditelný (nemá třídu `skryto`
 * a není skrytý display:none). Timeout = TIMEOUT_MS pokud není zadán jinak.
 */
async function cekejNaViditelny(page, selector, timeout = TIMEOUT_MS) {
  await page.waitForSelector(selector, { state: 'visible', timeout });
}

/**
 * Pokusí se zavřít fragment modal pokud je aktivní.
 * Vracuje true pokud byl modal zavřen.
 * Poznámka: .overlay modály se zobrazují třídou "aktivni", ne odstraněním "skryto".
 */
async function zavriFragment(page, timeout = 3000) {
  try {
    await page.waitForSelector('#modal-fragment.aktivni', { state: 'visible', timeout });
    await page.click('#fragment-zavrit');
    await pauza(ACT_PAUSE_MS);
    return true;
  } catch {
    return false;
  }
}

/**
 * Zavře overlay „Záznam z pátrání“ po potvrzené ose stop (blokuje kliky na verdikty).
 */
async function zavriClueNarativOverlay(page) {
  const maOverlay = await page.evaluate(() => !!document.getElementById('case-wf-clue-narrative-overlay'));
  if (!maOverlay) return false;
  await page.evaluate(() => {
    const ov = document.getElementById('case-wf-clue-narrative-overlay');
    if (!ov) return;
    const btn = ov.querySelector('button.fragment-zavrit, .narativ-actions button');
    if (btn) btn.click();
    else ov.remove();
  });
  await pauza(450);
  return true;
}

/** Opakovaně zavírá fragmenty a clue narativ overlay (max 5 iterací). */
async function zavriVsechnyFragmenty(page, timeout = 2000) {
  for (let i = 0; i < 5; i++) {
    await zavriClueNarativOverlay(page);
    if (!(await zavriFragment(page, timeout))) break;
    await pauza(300);
  }
}

/**
 * Zavře prelude po rozsudku (narativní meziobrazovka — používá třídu skryto).
 * Prelude má dvě stádia: "Rozsudek" a "Dohra" — každé vyžaduje klik.
 * Klikáme opakovaně dokud prelude nezmizí nebo nenastane timeout.
 */
async function zavriPrelude(page) {
  for (let i = 0; i < 4; i++) {
    try {
      // pripad-consequence-prelude používá skryto/remove skryto (není .overlay)
      await page.waitForSelector('#pripad-consequence-prelude:not(.skryto)', { state: 'visible', timeout: 5000 });
      await page.click('#pripad-consequence-prelude-btn');
      await pauza(500);
    } catch {
      break; // prelude zmizelo nebo se neobjevilo
    }
  }
}

/**
 * Otevře a přečte všechny nevyřízené dopisy na stole.
 * Dopisy se zobrazují přes #modal-fragment, takže zavriVsechnyFragmenty je zavře.
 * Musí být voláno před kliknutím na "Další den" — jinak _dalsiDen() vrátí brzy.
 */
async function zpracujDopisyNaStole(page) {
  for (let i = 0; i < 5; i++) {
    const maNeprecteny = await page.evaluate(() => {
      const den = Number(State.get('currentDay')) || 0;
      if (den < 1) return false;
      const klic = 'pending_desk_letters_day_' + den;
      const arr = State.get('flags.' + klic);
      return Array.isArray(arr) && arr.length > 0;
    });
    if (!maNeprecteny) break;
    console.log(`[run] Dopis na stole (${i + 1}) — otevírám…`);
    await page.evaluate(() => {
      if (typeof Engine !== 'undefined' && Engine.otevriDopisZeStolu) {
        Engine.otevriDopisZeStolu();
      }
    });
    await pauza(500);
    // Dopis se zobrazí v modal-fragment
    await zavriVsechnyFragmenty(page, 3000);
    await pauza(300);
    // Pokud má dopis reakci (jako doktor_d4), zobrazí se #modal-vecer — vybrat první možnost
    try {
      await page.waitForSelector('#modal-vecer.aktivni', { state: 'visible', timeout: 2000 });
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('#vecer-volby button:not(:disabled)'));
        if (btns.length) btns[0].click();
      });
      await pauza(500);
    } catch { /* žádná reakce dopisu */ }
    await pauza(300);
  }
}

/**
 * Tutorial panel v D1 může blokovat kliky na UI (overlay ve spisu i obecný overlay).
 * Pro testovací běhy ho vždy zavřeme/skipneme, aby neblokoval přechod dne.
 */
async function zavriTutorialPokudOtevren(page) {
  const zavreno = await page.evaluate(() => {
    const kandidati = [
      '#tutorial-case-layer .tutorial-btn-continue',
      '#tutorial-case-layer .tutorial-btn-skip',
      '#tutorial-overlay .tutorial-btn-continue',
      '#tutorial-overlay .tutorial-btn-skip',
    ];
    for (const sel of kandidati) {
      const btn = document.querySelector(sel);
      if (btn && btn.offsetParent !== null && !btn.disabled) {
        btn.click();
        return true;
      }
    }
    return false;
  });
  if (zavreno) {
    await pauza(450);
    console.log('[run] Tutorial panel zavřen (fallback).');
  }
}

/**
 * Projde adventure scénu klikáním přes obrazovky.
 * Každá obrazovka má buď "Pokračovat →" (bez voleb) nebo výběrová tlačítka — vybírá první.
 * Opakuje se dokud je #modal-adventure aktivní (max 20 kol).
 */
/**
 * Po spustKonec: prelude → epilog → kredity → souhrn statistik.
 * Vrací true pokud hra skončila (gameOver).
 */
async function zpracujEpilogKonce(page) {
  for (let i = 0; i < 55; i++) {
    const stav = await page.evaluate(() => ({
      gameOver: !!State.get('gameOver'),
      prelude: !!document.getElementById('modal-konec-prelude')?.classList.contains('aktivni'),
      epilog: !document.getElementById('konec-hry-overlay')?.classList.contains('skryto'),
      kredity: !document.getElementById('konec-kredity-overlay')?.classList.contains('skryto'),
      statistiky: !document.getElementById('konec-statistiky-overlay')?.classList.contains('skryto'),
    }));
    if (!stav.gameOver && !stav.prelude && !stav.epilog && !stav.kredity && !stav.statistiky) {
      return false;
    }

    if (stav.prelude) {
      console.log('[run] Epilog — prelude, pokračuji…');
      try {
        await page.click('#konec-prelude-pokracovat');
        await pauza(700);
      } catch { /* ok */ }
      continue;
    }
    if (stav.epilog) {
      console.log(`[run] Epilog zobrazen (endingType=${await page.evaluate(() => State.get('endingType'))})`);
      try {
        await page.click('#konec-restart');
        await pauza(12000);
      } catch { /* overlay zůstane — pro snapshot stačí */ }
      continue;
    }
    if (stav.kredity) {
      await pauza(800);
      continue;
    }
    if (stav.statistiky) {
      return true;
    }
    if (stav.gameOver) {
      await pauza(500);
      continue;
    }
  }
  return await page.evaluate(() => !!State.get('gameOver'));
}

async function zpracujAdventureScenu(page, persona) {
  const volba = persona?.adventureVolba || 'first';
  for (let i = 0; i < 20; i++) {
    try {
      const viditelny = await page.isVisible('#modal-adventure.aktivni');
      if (!viditelny) break;
      const kliknuto = await page.evaluate((v) => {
        const choicesEl = document.getElementById('adventure-choices');
        if (!choicesEl) return false;
        const btns = Array.from(choicesEl.querySelectorAll('button:not(:disabled)'));
        if (!btns.length) return false;
        const texty = btns.map(b => (b.textContent || '').toLowerCase());
        let btn = btns[0];
        if (v === 'benes_prijal') {
          const i = texty.findIndex(t => t.includes('poslouchám') || t.includes('řekněte'));
          if (i >= 0) btn = btns[i];
        } else if (v === 'benes_odmitl') {
          const i = texty.findIndex(t => t.includes('pravomocně') || t.includes('nemohu'));
          if (i >= 0) btn = btns[i];
        } else if (v === 'last') {
          btn = btns[btns.length - 1];
        }
        btn.click();
        return true;
      }, volba);
      if (!kliknuto) break;
      await pauza(400);
    } catch { break; }
  }
}

/** Pokud je otevřený modál případu, zavře ho. */
async function zavriModalPripadu(page) {
  try {
    // modal-pripad je .overlay, zobrazuje se třídou aktivni
    const viditelny = await page.isVisible('#modal-pripad.aktivni');
    if (viditelny) {
      await page.click('#pripad-zavrit-x');
      await pauza(ACT_PAUSE_MS);
    }
  } catch { /* ok */ }
}

// ---------------------------------------------------------------------------
// Průzkum (investigation)
// ---------------------------------------------------------------------------

/**
 * Pátrání (clue system): spustit lupu, spárovat stopy, potvrdit.
 * Preferuje true_pair z JSON; jinak zkouší páry postupně.
 */
async function zpracujCluePatrani(page, slotIndex) {
  const startVisible = await page.locator('#case-wf-clue-hud-action').isVisible().catch(() => false);
  if (!startVisible) return;

  try {
    await page.locator('#case-wf-sec-svedectvi').scrollIntoViewIfNeeded();
  } catch { /* ok */ }

  // Spustit pátrání
  try {
    const startBtn = page.locator('#case-wf-clue-hud-action');
    if (await startBtn.isVisible() && await startBtn.isEnabled()) {
      await startBtn.click();
      await pauza(500);
    }
  } catch { /* bez clue UI */ }

  for (let attempt = 0; attempt < 24; attempt++) {
    const vysledek = await page.evaluate(({ slotIdx, attemptNum }) => {
      const modal = document.getElementById('modal-pripad');
      if (!modal || !modal.classList.contains('aktivni')) return 'hotovo';

      const pripad = Cases.getPripady()[slotIdx];
      if (!pripad) return 'hotovo';

      if (typeof Cases !== 'undefined' && Cases.maPotvrzenouClueVazbu && Cases.maPotvrzenouClueVazbu(pripad)) {
        return 'hotovo';
      }

      const confirmBtn = document.getElementById('case-wf-clue-hud-confirm');
      if (
        confirmBtn &&
        !confirmBtn.disabled &&
        !confirmBtn.classList.contains('skryto')
      ) {
        confirmBtn.click();
        return 'potvrzeno';
      }

      const cs = pripad.clue_system;
      const pairs = cs && Array.isArray(cs.pairs) ? cs.pairs : [];
      const trueId = cs && cs.true_pair_id ? String(cs.true_pair_id).trim() : '';
      const truePair = pairs.find(p => p && String(p.pair_id || '').trim() === trueId);
      const clueIds = truePair
        ? [String(truePair.a_id || '').trim(), String(truePair.b_id || '').trim()].filter(Boolean)
        : [];

      const klikniClue = (id) => {
        const el = modal.querySelector(`.clue[data-clue-id="${id}"]`);
        if (el && !el.classList.contains('clue--locked')) {
          el.click();
          return true;
        }
        return false;
      };

      if (clueIds.length === 2 && attemptNum === 0) {
        klikniClue(clueIds[0]);
        klikniClue(clueIds[1]);
        return 'kliknuto';
      }

      const clues = Array.from(
        modal.querySelectorAll('.clue[data-clue-id]:not(.clue--locked):not(.clue--focus-locked)')
      );
      if (clues.length < 2) return 'hotovo';

      const a = attemptNum % clues.length;
      let b = (attemptNum + 1) % clues.length;
      if (a === b) b = (b + 1) % clues.length;
      clues[a].click();
      clues[b].click();
      return 'kliknuto';
    }, { slotIdx: slotIndex, attemptNum: attempt });

    await pauza(450);

    if (vysledek === 'hotovo' || vysledek === 'potvrzeno') break;
  }

  await pauza(300);
  await zavriVsechnyFragmenty(page, 2000);
  await zavriClueNarativOverlay(page);
}

/**
 * Pro personu `archivar`: max. průzkum — řádné akce v #case-wf-pruzkum-akce + pátrání (clue system).
 * Neoficiální (dirty) cesty přeskakuje.
 */
/** Pořadí skupin u osobního případu Haas (D15). */
function poradiSkupinProPripad(persona, caseId) {
  if (caseId === 'tyc_haas_d11' && Array.isArray(persona.haasSkupinaPoradi) && persona.haasSkupinaPoradi.length) {
    return persona.haasSkupinaPoradi;
  }
  return persona.skupinaPoradi || null;
}

/** Pořadí ID verdiktů pro záložní uzavření spisu přes API (když UI Potvrdit selže). */
function kandidatiVerdiktuProPersonu(persona, preferovanyId) {
  const pol = persona && persona.verdiktKrok2;
  const guilty = [
    'guilty_standard', 'guilty_maximum', 'guilty_lenient',
    'guilty_alternative', 'guilty_special',
  ];
  const ins = ['insufficient_prerusit', 'insufficient_odlozit'];
  const ng = ['not_guilty_formal', 'not_guilty_with_comment', 'not_guilty_comment'];
  let chain = [];
  if (pol === 'prisny') {
    chain = [...guilty, ...ins, ...ng];
  } else if (pol === 'zbohaceny') {
    chain = ['guilty_standard', 'guilty_maximum', ...guilty, ...ins, ...ng];
  } else if (pol === 'atentat') {
    chain = ['guilty_standard', 'guilty_lenient', ...ins, ...ng, ...guilty];
  } else if (pol === 'archivar') {
    chain = ['insufficient_prerusit', 'guilty_standard', ...guilty, ...ng];
  } else {
    chain = [...ins, ...ng, 'guilty_lenient', 'guilty_standard', ...guilty];
  }
  const out = [];
  const push = (id) => { if (id && !out.includes(id)) out.push(id); };
  push(preferovanyId);
  for (const id of chain) push(id);
  return out;
}

/** ID verdiktů u osobních tyčí (jiná než guilty_standard / maximum). */
function kandidatiTyčoveProPripad(caseId, persona) {
  if (!caseId || !String(caseId).startsWith('tyc_')) return [];
  const pol = persona && persona.verdiktKrok2;
  if (caseId === 'tyc_zvraty_d10') {
    if (pol === 'prisny' || pol === 'zbohaceny') {
      return ['guilty_pouzit_dokument', 'not_guilty_znicit', 'not_guilty_odevzdat_statnimu'];
    }
    if (pol === 'hrdina' || pol === 'cisty' || pol === 'atentat') {
      return ['not_guilty_odevzdat_statnimu', 'guilty_pouzit_dokument', 'not_guilty_znicit'];
    }
    if (pol === 'milosrny_fair' || pol === 'stredni') {
      return ['not_guilty_odevzdat_statnimu', 'guilty_pouzit_dokument', 'not_guilty_znicit'];
    }
    return ['not_guilty_znicit', 'guilty_pouzit_dokument', 'not_guilty_odevzdat_statnimu'];
  }
  if (caseId === 'tyc_haas_d11') {
    if (persona.haasVolba === 'vzit' || persona.prijmoutUplatek === true) {
      return ['guilty_vzit_obalku', 'not_guilty_odmitnut_slusne'];
    }
    return ['not_guilty_odmitnut_slusne', 'guilty_vzit_obalku'];
  }
  if (caseId === 'tyc_zavadova_d12') {
    if (persona.zavadovaVolba === 'podepsat') {
      return ['guilty_podepsat', 'not_guilty_odmitnut_formal'];
    }
    return ['not_guilty_odmitnut_formal', 'guilty_podepsat'];
  }
  return [];
}

/** Cílové ID verdiktu u milníkových případů (Haas, Zavadová, Zvraty). */
function cilovyVerdiktProPripad(persona, caseId) {
  if (!persona || !caseId) return null;
  if (caseId === 'tyc_zvraty_d10') {
    if (persona.zvratyVolba === 'znicit') return 'not_guilty_znicit';
    if (persona.zvratyVolba === 'odevzdat') return 'not_guilty_odevzdat_statnimu';
    if (persona.zvratyVolba === 'ponechat') return 'guilty_pouzit_dokument';
    const pol = persona.verdiktKrok2;
    if (persona.id === 'kruh_temny') return 'not_guilty_znicit';
    if (pol === 'prisny' || pol === 'zbohaceny') {
      return 'guilty_pouzit_dokument';
    }
    if (pol === 'hrdina' || pol === 'cisty' || pol === 'atentat') {
      return 'not_guilty_odevzdat_statnimu';
    }
    if (pol === 'milosrny_fair' || pol === 'stredni') {
      return 'not_guilty_odevzdat_statnimu';
    }
    return 'not_guilty_znicit';
  }
  if (caseId === 'tyc_haas_d11') {
    if (persona.haasVolba === 'vzit' || persona.prijmoutUplatek === true) {
      return 'guilty_vzit_obalku';
    }
    return 'not_guilty_odmitnut_slusne';
  }
  if (caseId === 'tyc_zavadova_d12') {
    if (persona.zavadovaVolba === 'podepsat' || persona.prijmoutUplatek === true) {
      return 'guilty_podepsat';
    }
    return 'not_guilty_odmitnut_formal';
  }
  if (persona.verdiktKrok2 === 'prisny') {
    const vina = Number(persona.vychoziUpravy?.traits?.Vina);
    if (Number.isFinite(vina) && vina >= 75) return 'guilty_standard';
  }
  return null;
}

function potrebujeCluePatrani(persona, caseId) {
  if (!persona) return false;
  if (persona.pruzkum === 'clue-only' || persona.pruzkum === 'minimal' || persona.pruzkum === 'all') {
    return true;
  }
  if (caseId === 'tyc_haas_d11' && (persona.haasVolba === 'vzit' || persona.prijmoutUplatek === true)) {
    return true;
  }
  if (caseId === 'tyc_zavadova_d12' && (persona.zavadovaVolba === 'podepsat' || persona.prijmoutUplatek === true)) {
    return true;
  }
  return false;
}

/**
 * Záložní uzavření spisu přes Cases.zpracujRozsudek (když UI verdikt nejde kliknout).
 * Zkouší preferované ID a pak řetězec vhodných pro personu.
 */
async function vynucVerdiktPresApi(page, slotIndex, verdictId, persona) {
  const meta = await page.evaluate((slotIdx) => {
    const p = (typeof Cases !== 'undefined' && Cases.getPripady)
      ? Cases.getPripady()[slotIdx]
      : null;
    if (!p) return null;
    return {
      id: p.id,
      verdictIds: (Array.isArray(p.verdicts) ? p.verdicts : []).map(v => v && v.id).filter(Boolean),
    };
  }, slotIndex);

  const kandidati = [];
  const push = (id) => { if (id && !kandidati.includes(id)) kandidati.push(id); };
  push(verdictId);
  if (meta && meta.id) {
    push(cilovyVerdiktProPripad(persona, meta.id));
    for (const id of kandidatiTyčoveProPripad(meta.id, persona)) push(id);
  }
  for (const id of kandidatiVerdiktuProPersonu(persona || {}, null)) push(id);
  if (meta && meta.verdictIds) {
    for (const id of meta.verdictIds) push(id);
  }

  for (const vid of kandidati) {
    const ok = await page.evaluate(({ slotIdx, vid: vId }) => {
      if (typeof Cases === 'undefined' || !Cases.getPripady || !Cases.zpracujRozsudek) return false;
      const p = Cases.getPripady()[slotIdx];
      if (!p || !p.id) return false;
      const vyresen = (State.get('casesResolvedToday') || []);
      if (vyresen.includes(p.id)) return true;
      const arr = Array.isArray(p.verdicts) ? p.verdicts : [];
      const v = arr.find(x => String(x && x.id) === String(vId));
      if (!v) return false;
      Cases.zpracujRozsudek(p, v);
      return true;
    }, { slotIdx: slotIndex, vid });
    if (ok) {
      console.log(`  Slot ${slotIndex + 1}: verdikt vynucen přes API (${vid}).`);
      await pauza(500);
      await zavriPrelude(page);
      await zavriModalPripadu(page);
      await zavriVsechnyFragmenty(page, 2000);
      return true;
    }
  }
  return false;
}

/**
 * Záloha: klik na první povolenou volbu v kroku 2 (nebo 1), když skupinová iterace selže.
 */
async function vyberVerdiktZaloha(page, persona) {
  return page.evaluate(({ politika, prijmoutUplatek }) => {
    function jeObalkaPrijmout(btn) {
      const tit = (btn.querySelector('.case-wf-v-title')?.textContent || '').toLowerCase();
      if (tit.includes('odmítn') || tit.includes('odmitn') || tit.includes('vrátit obálku') || tit.includes('vratit obalku')) {
        return false;
      }
      if (tit.includes('vzít obálku') || tit.includes('vzit obalku')) return true;
      return tit.includes('úplatek') || tit.includes('obalku');
    }
    const all = Array.from(
      document.querySelectorAll(
        '#case-wf-verdict-step2 .case-wf-verdict-opt:not(:disabled), ' +
        '#case-wf-verdict-step1 .case-wf-verdict-opt:not(:disabled)'
      )
    );
    if (!all.length) return false;
    const filt = all.filter(b => prijmoutUplatek || !jeObalkaPrijmout(b));
    const pool = filt.length ? filt : all;
    if (politika === 'odmitnout_haas' || politika === 'milosrny_fair') {
      let best = pool[0];
      let bestScore = -Infinity;
      for (const b of pool) {
        const tit = (b.querySelector('.case-wf-v-title')?.textContent || '').toLowerCase();
        let s = 0;
        if (tit.includes('odmítn') || tit.includes('odmitn') || tit.includes('vrátit')) s += 200;
        if (tit.includes('obálku') || tit.includes('obalku')) s -= 500;
        if (s > bestScore) { bestScore = s; best = b; }
      }
      best.click();
      return true;
    }
    pool[0].click();
    return true;
  }, {
    politika: persona.verdiktKrok2,
    prijmoutUplatek: persona.prijmoutUplatek !== false,
  });
}

/**
 * Matčina operace — runner simuluje volbu persony (zaplatit / odložit).
 */
async function zpracujMilnikOperace(page, persona) {
  const volba = persona.operaceVolba;
  if (!volba || volba === 'auto') return;
  await page.evaluate(({ v }) => {
    if (typeof State === 'undefined' || typeof Finance === 'undefined') return;
    const den = Number(State.get('currentDay')) || 1;
    const fl = State.get('flags') || {};
    const cil = Number(Finance.OPERACE_CIL_KC || 400);
    const bal = Number(State.get('finance.balance')) || 0;
    const deadline = Number(Finance.OPERACE_DEADLINE_DEN || 16);

    if (v === 'odlozit_vcas' && den >= 11 && !fl.operace_zaplacena) {
      State.set('flags.operace_odlozena', true);
    } else if (v === 'odlozit' && den >= deadline && !fl.operace_zaplacena) {
      State.set('flags.operace_odlozena', true);
    } else if ((v === 'zaplatit' || v === 'zaplatit_vcas') && !fl.operace_odlozena) {
      const minDen = v === 'zaplatit_vcas' ? 11 : deadline;
      if (den >= minDen && bal >= cil) {
        State.set('flags.operace_zaplacena', true);
      }
      if (typeof Finance.zkontrolujCilOperace === 'function') Finance.zkontrolujCilOperace();
    }
    if (typeof State.vypoctiUzloveFlagy === 'function') State.vypoctiUzloveFlagy();
  }, { v: volba });
}

/**
 * Krok 1: skupina verdiktu podle persony; krok 2: první legální nebo skórovaný výběr.
 */
async function vyberVerdiktKroky(page, persona) {
  await zavriClueNarativOverlay(page);

  const caseId = await page.evaluate(() => {
    const pripady = (typeof Cases !== 'undefined' && Cases.getPripady) ? Cases.getPripady() : [];
    const vyresen = (typeof State !== 'undefined' && State.get) ? (State.get('casesResolvedToday') || []) : [];
    const otevreny = pripady.find(p => p && p.id && !vyresen.includes(p.id));
    return otevreny ? otevreny.id : null;
  });
  const poradi = poradiSkupinProPripad(persona, caseId);

  const krok1Ok = await page.evaluate((poradi) => {
    const hasStep2 = () => {
      const wrap = document.getElementById('case-wf-step2-wrap');
      if (!wrap || wrap.classList.contains('skryto')) return false;
      return wrap.querySelectorAll('.case-wf-verdict-opt:not(:disabled)').length > 0;
    };
    const klikSkupinu = (key) => {
      const btn = document.querySelector(
        `#case-wf-verdict-step1 .case-wf-verdict-opt--grp-${key}:not(:disabled)`
      );
      if (!btn) return false;
      btn.click();
      return true;
    };

    const step1btns = document.querySelectorAll(
      '#case-wf-verdict-step1 .case-wf-verdict-opt:not(:disabled)'
    );
    if (step1btns.length === 0) return hasStep2();

    const keys = Array.isArray(poradi) && poradi.length ? poradi : null;
    if (keys) {
      for (const k of keys) {
        if (!klikSkupinu(k)) continue;
        if (hasStep2()) return true;
      }
      return false;
    }
    for (const btn of step1btns) {
      btn.click();
      if (hasStep2()) return true;
    }
    return false;
  }, poradi);

  if (!krok1Ok) {
    const zaloha = await vyberVerdiktZaloha(page, persona);
    if (zaloha) return true;
    return false;
  }

  await pauza(ACT_PAUSE_MS);
  await zavriClueNarativOverlay(page);

  return page.evaluate(({ politika, prijmoutUplatek, cilovyVid }) => {
    function jeObalkaPrijmout(btn) {
      const tit = (btn.querySelector('.case-wf-v-title')?.textContent || '').toLowerCase();
      if (tit.includes('odmítn') || tit.includes('odmitn') || tit.includes('vrátit obálku') || tit.includes('vratit obalku')) {
        return false;
      }
      if (tit.includes('vzít obálku') || tit.includes('vzit obalku')) return true;
      if (tit.includes('úplatek')) return true;
      const desc = (btn.dataset?.detailDesc || btn.getAttribute('data-detail-desc') || '').toLowerCase();
      if (desc.includes('vzít obálku') || desc.includes('vzit obalku')) return true;
      return false;
    }

    function skoreVerdikt(pol, btn) {
      const tit = (btn.querySelector('.case-wf-v-title')?.textContent || '').toLowerCase();
      const cls = btn.className || '';
      if (cilovyVid === 'guilty_vzit_obalku' && (tit.includes('vzít obálku') || tit.includes('vzit obalku'))) return 5000;
      if (cilovyVid === 'not_guilty_odmitnut_slusne' && tit.includes('odmítn') && tit.includes('obálku')) return 5000;
      if (cilovyVid === 'guilty_podepsat' && tit.includes('podepsat')) return 5000;
      if (cilovyVid === 'not_guilty_odmitnut_formal' && tit.includes('odmítn') && tit.includes('prohlášení')) {
        return 5000;
      }
      if (cilovyVid === 'guilty_pouzit_dokument' && (tit.includes('ponechat') || tit.includes('složku') || tit.includes('slozku'))) {
        return 5000;
      }
      if (cilovyVid === 'not_guilty_odevzdat_statnimu' && tit.includes('odevzdat')) return 5000;
      if (cilovyVid === 'not_guilty_znicit' && tit.includes('zničit')) return 5000;
      if (!prijmoutUplatek && jeObalkaPrijmout(btn)) return -900;
      if (pol === 'milosrny') {
        let score = 0;
        if (cls.includes('btn-rozsudek--zprostit')) score += 200;
        if (tit.includes('zprošt') || tit.includes('nevinn') || tit.includes('zastaven')) score += 150;
        if (tit.includes('napomen') || tit.includes('podmíněn') || tit.includes('mírn')) score += 80;
        if (tit.includes('odklad') || tit.includes('přeruš') || tit.includes('nedostatek')) score += 70;
        if (tit.includes('úplatek') || tit.includes('obálku')) score -= 500;
        if (tit.includes('maximum') || tit.includes('15 let')) score -= 200;
        if (tit.includes('standard') && !tit.includes('mírn')) score -= 40;
        return score;
      }
      if (pol === 'prisny') {
        let score = 0;
        if (tit.includes('ponechat') || tit.includes('složku') || tit.includes('slozku')) score += 280;
        if (tit.includes('zničit') || tit.includes('znict')) score += 200;
        if (cls.includes('btn-rozsudek--vinen')) score += 100;
        if (tit.includes('maximum') || tit.includes('15 let') || tit.includes('těžk')) score += 220;
        if (tit.includes('standard') && !tit.includes('mírn')) score += 90;
        if (tit.includes('napomen')) score += 35;
        if (prijmoutUplatek && jeObalkaPrijmout(btn)) score += 350;
        if (tit.includes('podepsat') || tit.includes('prohlášení')) score += 320;
        if (tit.includes('přeruš') || tit.includes('nedostatek') || tit.includes('odklad')) score -= 80;
        if (cls.includes('btn-rozsudek--zprostit') || tit.includes('zprošt') || tit.includes('nevinn')) score -= 200;
        return score;
      }
      if (pol === 'cisty' || pol === 'hrdina') {
        let score = 0;
        if (tit.includes('přeruš') || tit.includes('nedostatek') || tit.includes('odklad')) score += 160;
        if (tit.includes('napomen') || tit.includes('podmíněn') || tit.includes('mírn')) score += 120;
        if (cls.includes('btn-rozsudek--zprostit') || tit.includes('zprošt') || tit.includes('nevinn')) score += 90;
        if (tit.includes('standard') && !tit.includes('maximum')) score += 25;
        if (tit.includes('maximum') || tit.includes('15 let')) score -= 280;
        if (tit.includes('úplatek') || tit.includes('obálku')) score -= 600;
        return score;
      }
      if (pol === 'zbohaceny') {
        let score = 0;
        if (cls.includes('btn-rozsudek--vinen')) score += 110;
        if (tit.includes('standard') && !tit.includes('mírn')) score += 95;
        if (tit.includes('maximum') || tit.includes('15 let')) score += 70;
        if (tit.includes('napomen')) score += 35;
        if (tit.includes('přeruš') || tit.includes('nedostatek')) score -= 40;
        if (cls.includes('btn-rozsudek--zprostit') || tit.includes('zprošt')) score -= 120;
        return score;
      }
      if (pol === 'atentat') {
        let score = 0;
        if (cls.includes('btn-rozsudek--vinen')) score += 85;
        if (tit.includes('standard') && !tit.includes('mírn')) score += 70;
        if (tit.includes('napomen') || tit.includes('podmíněn') || tit.includes('mírn')) score += 55;
        if (tit.includes('přeruš') || tit.includes('nedostatek')) score += 25;
        if (tit.includes('maximum') || tit.includes('15 let')) score -= 180;
        if (cls.includes('btn-rozsudek--zprostit') || tit.includes('zprošt') || tit.includes('nevinn')) score -= 40;
        return score;
      }
      if (pol === 'milosrny_fair') {
        let score = 0;
        if (tit.includes('přeruš') || tit.includes('nedostatek') || tit.includes('odklad')) score += 120;
        if (tit.includes('napomen') || tit.includes('podmíněn')) score += 90;
        if (cls.includes('btn-rozsudek--zprostit') || tit.includes('zprošt') || tit.includes('nevinn')) score += 60;
        if (tit.includes('maximum') || tit.includes('15 let')) score -= 250;
        if (tit.includes('úplatek')) score -= 500;
        return score;
      }
      if (pol === 'stredni') {
        let score = 55;
        if (tit.includes('napomen') || tit.includes('podmíněn') || tit.includes('mírn')) score += 95;
        if (tit.includes('přeruš') || tit.includes('odklad') || tit.includes('nedostatek')) score += 85;
        if (tit.includes('standard') && !tit.includes('maximum')) score += 45;
        if (cls.includes('btn-rozsudek--zprostit')) score += 40;
        if (tit.includes('maximum') || tit.includes('úplatek') || tit.includes('15 let')) score -= 120;
        return score;
      }
      if (pol === 'archivar') {
        let score = 0;
        const revealed = (typeof State !== 'undefined' && State.get)
          ? Object.keys(State.get('revealedInfo') || {}).reduce((n, k) => {
            const arr = State.get('revealedInfo.' + k) || [];
            return n + arr.length;
          }, 0)
          : 0;
        if (revealed >= 4 && (tit.includes('přeruš') || tit.includes('nedostatek'))) score += 100;
        if (tit.includes('standard') && !tit.includes('maximum')) score += 70;
        if (tit.includes('napomen')) score += 50;
        if (tit.includes('maximum')) score += 20;
        if (cls.includes('btn-rozsudek--zprostit')) score += 10;
        return score;
      }
      return 0;
    }

    const ov = document.getElementById('case-wf-clue-narrative-overlay');
    if (ov) {
      const b = ov.querySelector('button.fragment-zavrit, .narativ-actions button');
      if (b) b.click();
      else ov.remove();
    }
    if (!prijmoutUplatek) {
      const uplatekBtns = document.querySelectorAll('#case-wf-sec-verdict .case-wf-verdict-opt');
      for (const ub of uplatekBtns) {
        if (jeObalkaPrijmout(ub)) ub.disabled = true;
      }
    }
    const wrap = document.getElementById('case-wf-step2-wrap');
    const btns = Array.from(
      (wrap || document).querySelectorAll('#case-wf-verdict-step2 .case-wf-verdict-opt:not(:disabled)')
    );
    if (!btns.length) {
      const c = document.getElementById('case-wf-confirm-rozsudek');
      return !!(c && !c.disabled && !c.closest('.skryto'));
    }
    if (!politika || politika === 'first-enabled') {
      btns[0].click();
      return true;
    }
    let best = btns[0];
    let bestScore = -Infinity;
    for (const b of btns) {
      if (!prijmoutUplatek && jeObalkaPrijmout(b)) continue;
      const s = skoreVerdikt(politika, b);
      if (s > bestScore) {
        bestScore = s;
        best = b;
      }
    }
    best.click();
    return true;
  }, {
    politika: persona.verdiktKrok2,
    prijmoutUplatek: persona.prijmoutUplatek !== false,
    cilovyVid: cilovyVerdiktProPripad(persona, caseId),
  });
}

async function proveProzkum(page, persona, slotIndex) {
  const caseId = await page.evaluate((i) => {
    const p = Cases.getPripady()[i];
    return p && p.id ? p.id : null;
  }, slotIndex);

  if (persona.pruzkum === 'none') {
    if (potrebujeCluePatrani(persona, caseId)) {
      await zpracujCluePatrani(page, slotIndex);
      await zavriClueNarativOverlay(page);
    }
    return;
  }
  if (persona.pruzkum === 'clue-only') {
    await zpracujCluePatrani(page, slotIndex);
    await zavriClueNarativOverlay(page);
    return;
  }

  try {
    const sec = page.locator('#case-wf-sec-pruzkum');
    if (await sec.isVisible()) await sec.scrollIntoViewIfNeeded();
  } catch { /* sekce skrytá u čistě clue případů */ }

  const maxRadneKroky = persona.pruzkum === 'minimal' ? 1 : 8;

  // Klasický průzkum (hidden_info → tlačítka Řádně)
  for (let iter = 0; iter < maxRadneKroky; iter++) {
    const kliknuto = await page.evaluate(() => {
      const wrap = document.getElementById('case-wf-pruzkum-akce');
      if (!wrap) return false;
      const btns = wrap.querySelectorAll('.case-wf-action-btn:not(:disabled)');
      for (const btn of btns) {
        if (btn.classList.contains('case-wf-action-btn--unofficial-choice')) continue;
        if (btn.classList.contains('case-wf-action-btn--used')) continue;
        btn.click();
        return true;
      }
      return false;
    });
    if (!kliknuto) break;
    await pauza(500);
    await zavriVsechnyFragmenty(page, 2000);
    await zavriClueNarativOverlay(page);
    const inkoust = await page.evaluate(() => Number(State.get('investigationActionsLeft')) || 0);
    if (inkoust <= 0) break;
  }

  if (persona.pruzkum === 'minimal' || persona.pruzkum === 'all') {
    await zpracujCluePatrani(page, slotIndex);
    await zavriClueNarativOverlay(page);
  }

  const pouzito = await page.evaluate((slotIdx) => {
    const p = Cases.getPripady()[slotIdx];
    if (!p) return 0;
    const hid = Array.isArray(p.hidden_info) ? p.hidden_info : [];
    return hid.filter(i => State.jeInfoOdhaleno(p.id, i.id)).length;
  }, slotIndex);
  if (pouzito > 0) {
    console.log(`  Slot ${slotIndex + 1}: průzkum — ${pouzito} krok(ů) hidden_info.`);
  }
}

// ---------------------------------------------------------------------------
// Zpracování jednoho případu
// ---------------------------------------------------------------------------

async function zpracujPripad(page, slotIndex, persona) {
  const caseIdPred = await page.evaluate((i) => {
    const p = (typeof Cases !== 'undefined' && Cases.getPripady)
      ? Cases.getPripady()[i]
      : null;
    return p && p.id ? p.id : null;
  }, slotIndex);

  /** Osobní tyče (Zvraty, Haas, Zavadová) — v headless UI často nepotvrdí; API první. */
  if (caseIdPred && String(caseIdPred).startsWith('tyc_')) {
    const cilTyč = cilovyVerdiktProPripad(persona, caseIdPred);
    if (await vynucVerdiktPresApi(page, slotIndex, cilTyč, persona)) {
      return true;
    }
    console.warn(`  Slot ${slotIndex + 1}: tyč ${caseIdPred} — API selhalo, zkouším UI…`);
  }

  // Otevřít případ přes JS API (obchází raster hit-test složky)
  const otevreno = await page.evaluate((i) => {
    const pripady = Cases.getPripady();
    if (!pripady[i]) return false;
    Cases.otevriPripad(i);
    return true;
  }, slotIndex);

  if (!otevreno) {
    console.log(`  Slot ${slotIndex + 1}: prázdný nebo null — přeskakuji.`);
    return false;
  }

  console.log(`  Slot ${slotIndex + 1}: čekám na #modal-pripad.aktivni…`);
  await cekejNaViditelny(page, '#modal-pripad.aktivni', TIMEOUT_MS);
  console.log(`  Slot ${slotIndex + 1}: modal viditelný, zavírám fragmenty…`);
  await pauza(ACT_PAUSE_MS);
  await zavriVsechnyFragmenty(page, 1500);

  // Průzkum podle persony (slotIndex = který spis je otevřený)
  await proveProzkum(page, persona, slotIndex);

  // Krok 1: čekáme až verdikty doběhnou, pak iterujeme přes skupiny dokud
  // nenajdeme takovou, která má v krok 2 alespoň jednu povolenou možnost.
  // (Případ tyc_hranice_2 má skupinu "Vinen" plně zamčenou za investigaci,
  //  ale "Nedostatek důkazů" má prerusit bez požadavku. Musíme zkusit všechny.)
  console.log(`  Slot ${slotIndex + 1}: čekám na vyrendrování verdiktů…`);
  try {
    await page.waitForFunction(
      () => {
        const step1btns = document.querySelectorAll('#case-wf-verdict-step1 .case-wf-verdict-opt');
        if (step1btns.length > 0) return true;
        const step2wrap = document.getElementById('case-wf-step2-wrap');
        return step2wrap && !step2wrap.classList.contains('skryto');
      },
      { timeout: TIMEOUT_MS }
    );
  } catch {
    console.warn(`  Slot ${slotIndex + 1}: verdikty se nevyrenderovaly včas.`);
  }
  await zavriClueNarativOverlay(page);
  await pauza(200);

  try {
    await page.waitForSelector('#case-wf-step2-wrap:not(.skryto), #case-wf-verdict-step1 .case-wf-verdict-opt', {
      state: 'visible',
      timeout: TIMEOUT_MS,
    });
  } catch {
    console.warn(`  Slot ${slotIndex + 1}: verdikty se nevyrenderovaly včas.`);
  }

  const caseIdProVerdikt = await page.evaluate((i) => {
    const p = Cases.getPripady()[i];
    return p && p.id ? p.id : null;
  }, slotIndex);
  const cilovyVid = cilovyVerdiktProPripad(persona, caseIdProVerdikt);

  let verdiktOk = await vyberVerdiktKroky(page, persona);
  if (!verdiktOk) {
    if (await vynucVerdiktPresApi(page, slotIndex, cilovyVid, persona)) return true;
    console.warn(`  Slot ${slotIndex + 1}: žádná skupina verdiktu nemá dostupný krok 2!`);
    await zavriModalPripadu(page);
    return false;
  }
  console.log(`  Slot ${slotIndex + 1}: verdikt vybrán (${persona.verdiktKrok2 || 'first-enabled'}).`);
  console.log(`  Slot ${slotIndex + 1}: krok 2 OK, čekám na Potvrdit…`);
  await pauza(ACT_PAUSE_MS);

  // Krok 2 musí být vybrán — jinak Potvrdit zůstane disabled (typicky pool_a1_nemocenska + Vina 100)
  await page.evaluate(() => {
    const sel = document.querySelector('#case-wf-verdict-step2 .case-wf-verdict-opt--selected');
    if (sel) return;
    const btn = document.querySelector('#case-wf-verdict-step2 .case-wf-verdict-opt:not(:disabled)');
    if (btn) btn.click();
  });
  await pauza(300);

  // Potvrdit rozsudek
  try {
    await page.waitForSelector('#case-wf-confirm-rozsudek:not(:disabled)', { state: 'visible', timeout: TIMEOUT_MS });
    console.log(`  Slot ${slotIndex + 1}: klikám Potvrdit rozsudek…`);
    await page.click('#case-wf-confirm-rozsudek');
    await pauza(600);
  } catch {
    console.warn(`  Slot ${slotIndex + 1}: tlačítko Potvrdit rozsudek nebylo dostupné — zkouším API…`);
    if (await vynucVerdiktPresApi(page, slotIndex, cilovyVid, persona)) {
      return true;
    }
    await zavriModalPripadu(page);
    return false;
  }

  // Prelude (narativní meziobrazovka po rozsudku)
  console.log(`  Slot ${slotIndex + 1}: čekám na prelude…`);
  await zavriPrelude(page);
  console.log(`  Slot ${slotIndex + 1}: prelude hotovo.`);

  // Modal případu by se měl sám zavřít, jinak ho zavřeme
  await pauza(400);
  await zavriModalPripadu(page);
  await zavriVsechnyFragmenty(page, 1500);

  return true;
}

// ---------------------------------------------------------------------------
// Snapshot stavu (pro report)
// ---------------------------------------------------------------------------

async function sbejSnapshot(page, den) {
  return await page.evaluate((d) => {
    const flags = State.get('flags') || {};
    const archive = State.get('archive') || {};
    const verdikty = Array.isArray(archive.verdicts) ? archive.verdicts : [];
    return {
      den: d,
      currentDay:               State.get('currentDay'),
      phase:                    State.get('phase'),
      traits:                   State.get('traits'),
      factions:                 State.get('factions'),
      trust:                    State.get('trust'),
      finance:                  State.get('finance'),
      investigationActionsLeft: State.get('investigationActionsLeft'),
      inkoust_zbyva:            State.get('investigationActionsLeft'),
      tydenni_statistiky:       State.get('tydenni_statistiky'),
      kampan_statistiky:        State.get('kampan_statistiky') || null,
      rozhodovaci_styl:         State.get('rozhodovaci_styl'),
      // Jen rozsudky tohoto dne
      verdicts_dnes: verdikty.filter(v => v.day === d),
      flags_subset: {
        operace_zaplacena:        flags.operace_zaplacena        || false,
        operace_odlozena:         flags.operace_odlozena         || false,
        uplatek_prijat:           flags.uplatek_prijat           || false,
        bankrot_varovani:         flags.bankrot_varovani_zobrazeno || false,
        haas_obalka_prijata:      flags.haas_obalka_prijata      || false,
      },
      uzlove_subset: State.get('uzlove') || null,
      gameOver:   State.get('gameOver')   || false,
      endingType: State.get('endingType') || null,
    };
  }, den);
}

// ---------------------------------------------------------------------------
// Hlavní průchod hrou
// ---------------------------------------------------------------------------

/** Výchozí autosave; persona.vychoziUpravy přepíše rysy / důvěru / finance. */
function sestavVychoziAutosave(persona) {
  const base = {
    currentDay: 1,
    phase: 'morning',
    investigationActionsLeft: 3,
    traits: { Integrita: 70, Odvaha: 50, Moudrost: 55, Vina: 60, Nadeje: 60 },
    factions: { Moc: 50, Kapital: 50, Lid: 50 },
    trust: { vlcek: 1, zavadova: 0, karas: 2 },
    finance: { balance: 150, dluh: 0, vyplataPrijataVDnech: [] },
    flags: {
      haas_envelope_opened: false, benes_identified: false,
      horakova_alliance: false, zavadova_alliance: false,
      vlcek_lunch_attended: false, masek_document_signed: false,
      pravda_odhalena: false, dopis_operace_den8_viden: false,
      dopis_operace_den4_viden: false, operace_zaplacena: false,
      operace_odlozena: false, operace_vyhodnoceni_den16_rano: false,
      karas_dluh_do_dne: null, lepsi_lekar_do_dne: null,
      uplatek_prijat: false, bankrot_varovani_zobrazeno: false,
      dluh_pribeh_spusten: false, rano_bonus_inkoust_z_kavy: false,
      records_free_until_day: null, stats_display_unlocked: false,
      tutorial_skipped: true, tutorial_completed: true,
      povest_odemcene_ids: ['svejda', 'kovarova', 'martin', 'karas', 'masek', 'vlcek']
    },
    uzlove: {
      vlcek_vztah: 'neutral', haas_kontakt: 'odmitnut',
      benes_pravda: 'nezna', osobni_cena: 'nerozhodl'
    },
    archive: { verdicts: [], case_reviews: [], fragments: [], characters_met: [], npc_interactions: [], npc_last_words: {} },
    casesResolvedToday: [],
    usedCaseIds: [],
    cluePairsMatched: {},
    clueConfirmations: {},
    clueFocusByCase: {},
    cluePatraniSession: {},
    revealedInfo: {},
    revealedInfoPath: {},
    rozhodovaci_styl: { fair_lid_streak: 0, tough_stat_streak: 0 },
    kampan_statistiky: { pripady_celkem: 0, pripady_s_prurzkumem: 0 },
  };

  const u = persona && persona.vychoziUpravy;
  if (u) {
    if (u.traits) Object.assign(base.traits, u.traits);
    if (u.trust) Object.assign(base.trust, u.trust);
    if (u.factions) Object.assign(base.factions, u.factions);
    if (u.finance) Object.assign(base.finance, u.finance);
    if (u.flags) Object.assign(base.flags, u.flags);
  }
  return base;
}

async function hraj(page, persona, targetDays) {
  const denSnapshots = [];
  const vsechnyRozsudky = [];

  const VYCHOZI_AUTOSAVE = sestavVychoziAutosave(persona);

  await page.evaluate((stav) => {
    // Smazat ruční sloty pro čistý start
    for (let i = 1; i <= 5; i++) localStorage.removeItem('indubio_save_' + i);
    localStorage.setItem('indubio_autosave', JSON.stringify(stav));
  }, VYCHOZI_AUTOSAVE);
  console.log('[run] Autosave nastaven — klikám na úvodní overlay…');

  // Kliknout na overlay
  await page.click('#uvod-overlay');
  // Overlay má 1420ms fade animaci před voláním inicializuj()
  await pauza(2000);

  // Počkat na dokončení inicializace a načtení dat.
  // jeHernaDataOK() vrací true až po DataLoader.nactiVse().
  // Tentokrát bez reloadu — State.nacti() rovnou najde autosave.
  await page.waitForFunction(
    () => typeof State !== 'undefined'
       && typeof Cases !== 'undefined'
       && typeof DataLoader !== 'undefined'
       && State.get('currentDay') >= 1
       && DataLoader.jeHernaDataOK(),
    { timeout: 30_000 }
  );
  // Krátká pauza pro dokončení synchronního setupu (ranní fragment, spisy)
  await pauza(800);

  // Zavřít úvodní fragmenty D1
  await zavriVsechnyFragmenty(page, 5000);

  for (let den = 1; den <= targetDays; den++) {

    // Od D2 dál: počkáme až engine skutečně přejde na nový den.
    // State.dalsiDen() se volá uvnitř async animace přechodu dne — runner musí
    // počkat než currentDay == den (jinak zpracovává případy z předchozího dne).
    if (den > 1) {
      console.log(`[run] Čekám na přechod na den ${den}…`);
      try {
        await page.waitForFunction(
          (d) => State.get('currentDay') >= d,
          den,
          { timeout: DAY_TRANSITION_TIMEOUT_MS }
        );
      } catch (errPrechod) {
        const blok = await page.evaluate(() => {
          const pripady = (typeof Cases !== 'undefined' && Cases.getPripady)
            ? Cases.getPripady()
            : [];
          const vyresen = State.get('casesResolvedToday') || [];
          const otevrene = pripady
            .filter(p => p && p.id && !vyresen.includes(p.id))
            .map(p => p.id);
          return {
            day: State.get('currentDay'),
            phase: State.get('phase'),
            otevrene,
            btnDen: !!(document.getElementById('btn-dalsi-den') && !document.getElementById('btn-dalsi-den').disabled),
          };
        });
        console.warn(`[run] Přechod na D${den} timeout — stav:`, JSON.stringify(blok));
        for (let si = 0; si < 3; si++) {
          const nevy = blok.otevrene && blok.otevrene[si] ? blok.otevrene[si] : null;
          if (!nevy) continue;
          const slotIdx = await page.evaluate((cid) => {
            const pr = Cases.getPripady();
            for (let i = 0; i < pr.length; i++) {
              if (pr[i] && pr[i].id === cid) return i;
            }
            return -1;
          }, nevy);
          if (slotIdx >= 0) {
            await vynucVerdiktPresApi(page, slotIdx, cilovyVerdiktProPripad(persona, nevy), persona);
          }
        }
        await zavriVsechnyFragmenty(page, 3000);
        await zavriModalPripadu(page);
        try {
          await page.click('#btn-dalsi-den', { timeout: 5000 });
          await pauza(DAY_PAUSE_MS);
        } catch { /* ignore */ }
        await page.waitForFunction(
          (d) => State.get('currentDay') >= d,
          den,
          { timeout: DAY_TRANSITION_TIMEOUT_MS }
        );
      }
      // Krátká pauza pro spustDen() + nastavPripadyProDen()
      await pauza(800);
    }

    console.log(`\n[run] ── DEN ${den} ─────────────────────────────`);

    await zpracujMilnikOperace(page, persona);

    // Zavřít případné ranní fragmenty / dopisy
    await zavriVsechnyFragmenty(page, 3000);

    // Adventure scéna (Beneš D9, Karas D13, …) — zobrazí se po ranním fragmentu
    await zpracujAdventureScenu(page, persona);

    // Zjistit počet případů
    const pocetSpisu = await page.evaluate(() =>
      Cases.getPripady().filter(Boolean).length
    );
    // Debug: vypsat stav pro ladění
    const denDebug = await page.evaluate(() => ({
      currentDay: State.get('currentDay'),
      phase: State.get('phase'),
      casesResolvedToday: State.get('casesResolvedToday') || [],
      caseIds: Cases.getPripady().map(p => p && p.id)
    }));
    console.log(`[run] Počet spisů: ${pocetSpisu} | D=${denDebug.currentDay} | phase=${denDebug.phase} | resolved=[${denDebug.casesResolvedToday.join(',')}] | cases=[${denDebug.caseIds.join(',')}]`);

    // Zpracovat každý slot
    for (let slot = 0; slot < 3; slot++) {
      const maSpis = await page.evaluate((i) => !!Cases.getPripady()[i], slot);
      if (!maSpis) continue;

      const uzJeVyresen = await page.evaluate((i) => {
        const pripady = Cases.getPripady();
        const p = pripady[i];
        if (!p) return true;
        const vyresen = State.get('casesResolvedToday') || [];
        return vyresen.includes(p.id);
      }, slot);
      if (uzJeVyresen) {
        console.log(`  Slot ${slot + 1}: již vyřešen.`);
        continue;
      }

      console.log(`  Slot ${slot + 1}: zpracovávám…`);
      const ok = await zpracujPripad(page, slot, persona);

      if (ok) {
        const posledniRozsudek = await page.evaluate(() => {
          const v = (State.get('archive') || {}).verdicts || [];
          return v[v.length - 1] || null;
        });
        if (posledniRozsudek) {
          vsechnyRozsudky.push(posledniRozsudek);
          console.log(`  → ${posledniRozsudek.verdictId} | ${posledniRozsudek.caseType} | ${posledniRozsudek.caseTitle || posledniRozsudek.caseId}`);
        }
      }

      // Variabilní konec po posledním rozsudku dne
      const poSpisu = await page.evaluate(() => !!State.get('gameOver'));
      if (poSpisu) {
        console.log('[run] Konec hry po rozsudku — epilog…');
        await zpracujEpilogKonce(page);
        break;
      }
    }

    // Druhý průchod — nevyřešené spisy (typicky Haas D15)
    for (let slot = 0; slot < 3; slot++) {
      const nevyresen = await page.evaluate((i) => {
        const pripady = Cases.getPripady();
        const p = pripady[i];
        if (!p || !p.id) return null;
        const vyresen = State.get('casesResolvedToday') || [];
        return vyresen.includes(p.id) ? null : p.id;
      }, slot);
      if (!nevyresen) continue;
      console.warn(`[run] Den ${den}: nevyřešený spis ${nevyresen} (slot ${slot + 1}) — opakuji…`);
      const ok2 = await zpracujPripad(page, slot, persona);
      if (ok2) {
        const posledniRozsudek = await page.evaluate(() => {
          const v = (State.get('archive') || {}).verdicts || [];
          return v[v.length - 1] || null;
        });
        if (posledniRozsudek) vsechnyRozsudky.push(posledniRozsudek);
      }
      if (await page.evaluate(() => !!State.get('gameOver'))) break;
    }

    // Třetí průchod — API uzavření (zamčený Potvrdit u pool případů, např. nemocenská + Vina 100)
    for (let slot = 0; slot < 3; slot++) {
      const nevyresen = await page.evaluate((i) => {
        const pripady = Cases.getPripady();
        const p = pripady[i];
        if (!p || !p.id) return null;
        const vyresen = State.get('casesResolvedToday') || [];
        return vyresen.includes(p.id) ? null : p.id;
      }, slot);
      if (!nevyresen) continue;
      console.warn(`[run] Den ${den}: spis ${nevyresen} — uzavírám přes API…`);
      const caseId = nevyresen;
      const cil = cilovyVerdiktProPripad(persona, caseId);
      const okApi = await vynucVerdiktPresApi(page, slot, cil, persona);
      if (!okApi) {
        console.warn(`[run] Den ${den}: API uzavření ${nevyresen} selhalo (slot ${slot + 1}).`);
      }
    }

    if (await page.evaluate(() => !!State.get('gameOver'))) break;

    // Přečíst nevyřízené dopisy na stole (jinak _dalsiDen() vrátí brzy)
    await zpracujDopisyNaStole(page);
    await zavriTutorialPokudOtevren(page);

    // Nedělní volba (nedelni_volba) se zobrazuje uvnitř spustDen() PŘED tlačítkem "Další den".
    // Zkontrolujeme a zpracujeme #modal-vecer, aby se tlačítko zpřístupnilo.
    try {
      const vecerPreKlikem = await page.isVisible('#modal-vecer.aktivni');
      if (vecerPreKlikem) {
        console.log(`[run] Nedělní / ranní volba (před Další den) — vybírám ${persona.vecerniVolba === 'last' ? 'poslední' : 'první'}…`);
        await page.evaluate((volba) => {
          const btns = Array.from(document.querySelectorAll('#vecer-volby button:not(:disabled)'));
          if (!btns.length) return;
          let btn = btns[0];
          if (volba === 'last') btn = btns[btns.length - 1];
          else if (volba === 'middle') btn = btns[Math.floor((btns.length - 1) / 2)];
          btn.click();
        }, persona.vecerniVolba);
        await pauza(600);
        // Po nedělní volbě může přijít adventure scéna (Karas D14 má after_nedelni_volba: true)
        await zpracujAdventureScenu(page, persona);
        await zavriVsechnyFragmenty(page, 2000);
      }
    } catch { /* žádná ranní volba */ }

    // Klik na Další den — čekáme až tlačítko existuje a není disabled
    console.log(`[run] Klikám na "Další den"…`);
    try {
      await zavriTutorialPokudOtevren(page);
      await page.waitForSelector('#btn-dalsi-den:not([disabled]):not(.skryto)', { state: 'visible', timeout: TIMEOUT_MS });
      await page.click('#btn-dalsi-den');
      await pauza(DAY_PAUSE_MS);
    } catch {
      console.warn(`[run] Tlačítko "Další den" nebylo dostupné — možná hra skončila nebo jsou nevyřešené spisy.`);
    }

    // Večerní volba (pokud se objeví po kliknutí na Další den) — regular evening_choice
    try {
      await page.waitForSelector('#modal-vecer.aktivni', { state: 'visible', timeout: 3000 });
      console.log(`[run] Večerní volba — vybírám ${persona.vecerniVolba === 'last' ? 'poslední' : 'první'}…`);
      await page.evaluate((volba) => {
        const btns = Array.from(document.querySelectorAll('#vecer-volby button:not(:disabled)'));
        if (!btns.length) return;
        let btn = btns[0];
        if (volba === 'last') btn = btns[btns.length - 1];
        else if (volba === 'middle') btn = btns[Math.floor((btns.length - 1) / 2)];
        btn.click();
      }, persona.vecerniVolba);
      await pauza(600);
    } catch { /* žádná večerní volba */ }

    // Zavřít přechodové fragmenty (večerní / noční po „Další den“)
    await zavriVsechnyFragmenty(page, 8000);

    // Konec hry po přechodu na den 20 (nebo variabilní konec)
    if (await page.evaluate(() => !!State.get('gameOver'))) {
      console.log('[run] Konec hry po přechodu dne — epilog…');
      await zpracujEpilogKonce(page);
    }

    // Týdenní shrnutí (sobota → neděle, den 6) — .overlay, třída aktivni
    try {
      await page.waitForSelector('#modal-tyden-shrnuti.aktivni', { state: 'visible', timeout: 2000 });
      console.log(`[run] Týdenní shrnutí — zavírám…`);
      await page.click('#tyden-shrnuti-pokracovat');
      await pauza(500);
      await zavriVsechnyFragmenty(page, 2000);
    } catch { /* žádné shrnutí */ }

    // Dev overlay souhrnu (D3 _dev_souhrn_po_veceru) — zavřít "Zpět do hry"
    try {
      await page.waitForSelector('#konec-statistiky-overlay:not(.skryto)', { state: 'visible', timeout: 2000 });
      console.log(`[run] Dev souhrn overlay — zavírám…`);
      await page.click('#konec-statistiky-nova-hra');
      await pauza(500);
    } catch { /* žádný dev overlay */ }

    // Snapshot stavu po dni
    const snapshot = await sbejSnapshot(page, den);
    denSnapshots.push(snapshot);
    console.log(`[run] Snapshot D${den}: balance=${snapshot.finance?.balance ?? '?'} Kčs | Integrita=${snapshot.traits?.Integrita ?? '?'} | Vina=${snapshot.traits?.Vina ?? '?'} | inkoust=${snapshot.inkoust_zbyva ?? '?'}`);

    if (snapshot.gameOver) {
      console.log(`[run] Hra skončila (endingType=${snapshot.endingType}) — zastavuji.`);
      await zpracujEpilogKonce(page);
      break;
    }
  }

  // Finální snapshot po epilogu (currentDay může být 20, gameOver true)
  if (await page.evaluate(() => typeof State !== 'undefined' && !!State.get('gameOver'))) {
    const fin = await sbejSnapshot(page, targetDays);
    if (!denSnapshots.length || denSnapshots[denSnapshots.length - 1].gameOver !== true) {
      denSnapshots.push(fin);
    }
    console.log(`[run] Finální stav: endingType=${fin.endingType} | D=${fin.currentDay}`);
  }

  return { denSnapshots, vsechnyRozsudky };
}

// ---------------------------------------------------------------------------
// Sestavení výsledného reportu
// ---------------------------------------------------------------------------

function sestavReport(runId, personaId, startedAt, denSnapshots, vsechnyRozsudky, aborted, abort_reason) {
  const terminal = denSnapshots[denSnapshots.length - 1] || null;

  // Odvozené metriky (viz AI-persony-a-reporty.md §4)
  const pocetSpisu   = vsechnyRozsudky.length;
  const notGuilty    = vsechnyRozsudky.filter(v => String(v.verdictId || '').includes('not_guilty')).length;
  const insufficient = vsechnyRozsudky.filter(v => String(v.verdictId || '').includes('insufficient')).length;
  const uplatek      = terminal?.flags_subset?.uplatek_prijat || false;

  const balanceKonec = terminal?.finance?.balance ?? null;
  const dluhKonec    = terminal?.finance?.dluh ?? 0;
  const S_finance    = balanceKonec !== null
    ? Math.max(0, Math.min(100, 50 + balanceKonec / 5 - dluhKonec / 2))
    : null;

  return {
    schema_version: '1.0.0',
    run_id:         runId,
    persona_id:     personaId,
    started_at:     startedAt,
    ended_at:       new Date().toISOString(),
    aborted,
    abort_reason:   abort_reason || null,

    terminal_state: terminal,

    daily_snapshots: denSnapshots,

    verdicts: vsechnyRozsudky.map(v => ({
      day:              v.day,
      caseId:           v.caseId,
      caseType:         v.caseType,
      verdictId:        v.verdictId,
      procesniKvalita:  v.procesniKvalita || null,
      normativniSmer:   v.normativniSmer  || null,
      hiddenVerdictBoost: v.hiddenVerdictBoost || false,
    })),

    metrics: {
      pocet_spisu:          pocetSpisu,
      pomer_not_guilty:     pocetSpisu ? +(notGuilty / pocetSpisu).toFixed(2) : 0,
      pomer_insufficient:   pocetSpisu ? +(insufficient / pocetSpisu).toFixed(2) : 0,
      pruzkum_na_spis: terminal
        ? (() => {
            const k = terminal.kampan_statistiky || {};
            const kCelkem = Number(k.pripady_celkem) || 0;
            const kPruzkum = Number(k.pripady_s_prurzkumem) || 0;
            if (kCelkem > 0) return +(kPruzkum / kCelkem).toFixed(2);
            const ts = terminal.tydenni_statistiky || {};
            const celkem = Number(ts.pripady_celkem) || 0;
            const sPruzkumem = Number(ts.pripady_s_prurzkumem) || 0;
            const pouzito = Number(ts.pruzkum_pouzit) || 0;
            if (celkem > 0) return +(sPruzkumem / celkem).toFixed(2);
            if (pocetSpisu > 0 && pouzito > 0) return +(pouzito / pocetSpisu).toFixed(2);
            return 0;
          })()
        : 0,
      kampan_statistiky: terminal?.kampan_statistiky || null,
      uplatek,
      finance_konec:        balanceKonec,
      dluh_konec:           dluhKonec,
      bankrot_flag:         (balanceKonec !== null && balanceKonec < 0) || (terminal?.flags_subset?.bankrot_varovani ?? false),
      S_finance,
      endingType:           terminal?.endingType || null,
    },
  };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
  const [,, personaArg = 'rychlosoudce', daysArg = '3'] = process.argv;
  const targetDays = Math.max(1, parseInt(daysArg, 10) || 3);
  const persona    = PERSONAS[personaArg];

  if (!persona) {
    console.error(`Neznámá persona: "${personaArg}". Dostupné: ${Object.keys(PERSONAS).join(', ')}`);
    process.exit(1);
  }

  fs.mkdirSync(ARTIFACTS, { recursive: true });

  const runId     = crypto.randomUUID();
  const startedAt = new Date().toISOString();

  console.log(`\n╔══════════════════════════════════════════════════╗`);
  console.log(`║  IN DUBIO — Playtest runner                      ║`);
  console.log(`║  persona=${personaArg.padEnd(12)} dny=D1–D${targetDays}              ║`);
  console.log(`║  run_id=${runId.slice(0, 8)}…                    ║`);
  console.log(`╚══════════════════════════════════════════════════╝\n`);

  const srv = await spustServer();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    // Výchozí viewport pro desktop
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  // window.confirm u pátrání (ukončit?) — automaticky zamítnout
  page.on('dialog', async dialog => {
    try { await dialog.dismiss(); } catch { /* ok */ }
  });

  // Logovat chyby z konzole prohlížeče
  page.on('console', msg => {
    if (msg.type() === 'error') console.warn(`[browser:error] ${msg.text()}`);
  });
  page.on('pageerror', err => console.error(`[browser:pageerror] ${err.message}`));

  let denSnapshots   = [];
  let vsechnyRozsudky = [];
  let aborted        = false;
  let abort_reason   = null;

  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30_000 });
    const result = await hraj(page, persona, targetDays);
    denSnapshots    = result.denSnapshots;
    vsechnyRozsudky = result.vsechnyRozsudky;
  } catch (err) {
    aborted      = true;
    abort_reason = err.message;
    console.error(`\n[run] !! Chyba: ${err.message}`);
    try {
      const den = await page.evaluate(() =>
        (typeof State !== 'undefined' && State.get) ? Number(State.get('currentDay')) || 1 : 1
      );
      const snap = await sbejSnapshot(page, den);
      if (!denSnapshots.length || denSnapshots[denSnapshots.length - 1].currentDay !== den) {
        denSnapshots.push(snap);
      }
      console.warn(`[run] Částečný snapshot při abortu (D${den}).`);
    } catch { /* stránka nedostupná */ }
    // Screenshot pro debugging
    try {
      const screenshotPath = path.join(ARTIFACTS, `${runId}_error.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.error(`[run]    Screenshot: ${screenshotPath}`);
    } catch { /* ok */ }
  } finally {
    await browser.close();
    if (srv) {
      srv.kill();
      console.log('\n[server] Zastaven.');
    }
  }

  const report = sestavReport(runId, personaArg, startedAt, denSnapshots, vsechnyRozsudky, aborted, abort_reason);
  const suffix  = aborted ? '_ABORTED' : '';
  const outFile = path.join(ARTIFACTS, `${runId}${suffix}.json`);
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2), 'utf8');

  console.log(`\n── VÝSLEDEK ─────────────────────────────────────────`);
  console.log(`   persona:       ${personaArg}`);
  console.log(`   aborted:       ${aborted}`);
  if (abort_reason) console.log(`   abort_reason:  ${abort_reason}`);
  if (report.metrics.finance_konec !== null)
    console.log(`   finance_konec: ${report.metrics.finance_konec} Kčs`);
  console.log(`   report:        ${outFile}`);
  console.log(`─────────────────────────────────────────────────────\n`);

  process.exit(aborted ? 1 : 0);
}

main().catch(err => {
  console.error('[fatal]', err);
  process.exit(1);
});

/**
 * Generuje data/days.json pro 15 pracovních dní + 2 víkendy = 19 kalendářních dní.
 * Spusť: node scripts/build-days-19.js
 */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'data', 'days.json');

const nedeleVolba3 = {
  text: 'Jak strávíš neděli, Jakube?',
  options: [
    {
      id: 'A',
      text: 'Navštívit matku v nemocnici',
      effects: { Nadeje: 5, Vina: -3, Finance: -5 },
      fragment_title: 'Nemocnice',
      fragment_text:
        'Chodba voní chlórem. Matka má zavřené oči — držíš ji za ruku a mlčíš lépe než v síni.'
    },
    {
      id: 'D',
      text: 'Procházka po městě',
      effects: { Nadeje: 3, Moudrost: 2 },
      fragment_title: 'Město',
      fragment_text: 'Dláždění, výlohy, hlasy. Nikdo po tobě nechce podpis — jen mineš a dýcháš.'
    },
    {
      id: 'C',
      text: 'Zůstat doma, číst staré spisy',
      effects: { Moudrost: 3, Nadeje: -2, Vina: 1 },
      fragment_title: 'Domácí spisy',
      fragment_text: 'Papír šustí jako déšť. Některé věty znáš zpaměti — a přesto tě dnes bolí jinak než včera.'
    }
  ]
};

const days = [];

// --- Den 1 (po) — tutorial, Vlček, Božena+Horák ~ pool tón
days.push({
  day: 1,
  newspaper_headline: 'Krize pokračuje. Nezaměstnanost dosáhla rekordních hodnot.',
  morning_fragment: 'fragment_d1_morning',
  cases: ['pool_a1_lekarna', 'pool_a1_weiss'],
  vlcek_letter: 'vlcek_d1',
  evening_choice: {
    text: 'Stůl je čistý. Lampa svítí. Poprvé po roce jsi zpátky. Na stole leží prázdný list a pero.',
    options: [
      { text: 'Zapíšeš si: „Budu spravedlivý.“', effects: { Integrita: 5, Nadeje: 5 }, trust: { zavadova: 1 } },
      { text: 'Nevypisuješ nic. Slova nic neznamenají.', effects: { Vina: 8 }, trust: { vlcek: 1 } }
    ]
  },
  night_fragment: 'fragment_d1_night'
});

// 2 (út) — dva pool
days.push({
  day: 2,
  newspaper_headline: 'Demonstrace v Brně. Policie rozháněla dav vodními děly.',
  cases: ['pool_a1_vytrznost', 'pool_a1_nemocenska'],
  vlcek_letter: null,
  evening_choice: {
    text: 'Pekář zvýšil ceny. U přepážky slyšíš, jak někdo šeptá o hladu.',
    options: [
      { text: 'Jdeš domů bez řečí.', effects: { Moudrost: 2, Vina: 2 } },
      { text: 'Zapíšeš si poznámku o cenách.', effects: { Integrita: 3, Moudrost: 3 } }
    ]
  }
});

// 3 (st) — Pospisil, Markova
days.push({
  day: 3,
  newspaper_headline: 'Rozsudek z roku 1921 pod lupou. Právníci žádají přezkoumání.',
  morning_fragment: 'fragment_d3_noviny',
  cases: ['pool_a1_stara_rana', 'pool_a1_trafika'],
  evening_choice: {
    text: 'Svejda: Dnes je klid. Na chodbě cítíš, že to nebude trvat věčně.',
    options: [
      { text: 'Dáš si kávu a čekáš.', effects: { Nadeje: 2, Vina: 1 } },
      { text: 'Zavřeš dveře a čteš spis.', effects: { Moudrost: 3 } }
    ]
  }
});

// 4 (čt) — Božena2, Hranice1, dopis doktora / countdown
days.push({
  day: 4,
  newspaper_headline: 'Haasova továrna propustila 40 dělníků. Management: nutné kroky.',
  cases: ['pool_a1_zhar', 'pool_a1_exekuce'],
  morning_fragment: null,
  evening_choice: {
    text: 'Dopis od doktora: matka, operace, 400 Kč. Termín se krátí. Na stole leží i lístek od Vlčka.',
    options: [
      { text: 'Seřadíš priority — operace, pak zbytek.', effects: { Nadeje: 5, Vina: 5, Integrita: 3 } },
      { text: 'Schováš dopis do šuplíku. Ještě dnes ne.', effects: { Vina: 10, Moudrost: 2 } }
    ]
  }
});

// 5 (pá) — první silnější morálka
days.push({
  day: 5,
  newspaper_headline: 'Parlament jedná o nouzovém zákoně. Opozice protestuje.',
  cases: ['pool_a1_nemocenska', 'pool_a1_vytrznost'],
  evening_choice: {
    text: 'Sobota u dveří. Trh — méně stánků, víc očí.',
    options: [
      { text: 'Ještě hodinu sedíš u spisů.', effects: { Moudrost: 2, Vina: 2 } },
      { text: 'Jdeš dřív, hlava tě bolí z čísel.', effects: { Nadeje: -2, Moudrost: 1 } }
    ]
  }
});

// 6 (so) — sobotní shrnutí běží v engine, žádné spisy
days.push({
  day: 6,
  newspaper_headline: 'Sobota. Město drží dech.',
  cases: [],
  morning_fragment: null,
  evening_choice: null
});

// 7 (ne) — výplata + 3 volby
days.push({
  day: 7,
  newspaper_headline: 'Nedělní ticho. I noviny vycházejí jinak.',
  morning_fragment: 'fragment_d7_nedele_rano',
  cases: [],
  nedelni_volba: nedeleVolba3,
  evening_fragment: 'fragment_d7_nedele_vecer'
});

// 8 (po) — týden 2 start: Haas vizitka, Pospisil2… (mapa)
days.push({
  day: 8,
  newspaper_headline: 'Plakát: pochod hladu. Úřady hovoří o klidu.',
  morning_fragment: 'fragment_d8_morning',
  cases: ['pool_a1_spravce', 'pool_a1_bytova_komise', 'pool_a1_revizor'],
  cases_light: [false, false, true],
  vlcek_letter: 'vlcek_d6',
  evening_choice: {
    text: 'Na stůl padla vizitka — beze slov, ale těžká. Vlčkův dopis čekal na odpověď.',
    options: [
      { text: 'Vizitku otočíš. Zítra.', effects: { Moudrost: 3, Vina: 3 } },
      { text: 'Zahodíš ji. Dnes ne.', effects: { Odvaha: 2, Vina: 1 } }
    ]
  }
});

// 9–19 podle Pripady_15dni / pool
const rest = [
  { d: 9, h: 'Horáčková u soudu. Politický nádech houstne.', c: ['pool_a1_vyveseni', 'pool_a1_druha_ruka'], f: 'fragment_d10_morning' },
  { d: 10, h: 'Zástupci bank jednají. Creditánstalt ve vzduchu.', c: ['pool_a1_tiskarna', 'pool_a1_stavba', 'pool_a1_nemocenska'], l: [false, false, true] },
  { d: 11, h: 'Politické napětí. Noviny plné jmen.', c: ['pool_a1_weiss', 'pool_a1_vytrznost', 'pool_a1_exekuce'], l: [false, false, true] },
  { d: 12, h: 'Kdo řídí justici? Titulky se třesou na kostře věty.', c: ['pool_a1_stara_rana', 'pool_a1_zhar', 'pool_a1_trafika'], l: [false, false, true] },
  { d: 13, h: 'Konec týdne. Chodby jsou plnější, hlasy opatrnější.', c: ['pool_a1_lekarna', 'pool_a1_revizor'], f: 'fragment_d12_morning' },
  { d: 14, h: 'Druhá neděle. Město dýchá stejně — ty už ne.', ned: true },
  { d: 15, h: 'Třetí týden. Před bouří je nejvíc ticha.', c: ['pool_a1_spravce', 'pool_a1_tiskarna', 'pool_a1_nemocenska'], l: [false, false, true] },
  { d: 16, h: 'Rikají o něm věci — titulky i lidé u výlohy.', c: ['pool_a1_bytova_komise', 'pool_a1_druha_ruka', 'pool_a1_stavba'], l: [false, false, true] },
  { d: 17, h: 'Průmysl, politika, soud — jeden proud.', c: ['pool_a1_vyveseni', 'pool_a1_vytrznost', 'pool_a1_exekuce'], l: [false, false, true] },
  { d: 18, h: 'Předposlední nadechnutí. Světlo v okně jinak.', c: ['pool_a1_zhar', 'pool_a1_trafika', 'pool_a1_nemocenska'], l: [false, false, true] },
  { d: 19, h: 'Březen se loučí. Soudní síň naposledy tento týden.', c: ['pool_a1_stara_rana', 'pool_a1_tiskarna'], f: 'fragment_d20_odhaleni', spec: ['finale_15d'] }
];

for (const r of rest) {
  if (r.ned) {
    days.push({
      day: 14,
      newspaper_headline: r.h,
      morning_fragment: 'fragment_d14_nedele_rano',
      cases: [],
      evening_choice: null,
      nedelni_volba: nedeleVolba3,
      evening_fragment: 'fragment_d14_nedele_vecer'
    });
    continue;
  }
  const o = {
    day: r.d,
    newspaper_headline: r.h,
    cases: r.c
  };
  if (r.l) o.cases_light = r.l;
  if (r.f) o.morning_fragment = r.f;
  o.evening_choice = {
    text: r.d === 19 ? 'Poslední listy, poslední rozhodnutí. Co zůstane z tebe?' : 'Den se chýlí. Ruka drží pero pevněji, než by chtěla.',
    options: [
      { text: 'Krátce zapisuješ, co bys neřekl nahlas.', effects: { Moudrost: 2, Vina: 1 } },
      { text: 'Jdeš bez zápisku. Jen s vědomím.', effects: { Integrita: 2, Nadeje: 1 } }
    ]
  };
  if (r.spec) o.special_events = r.spec;
  days.push(o);
}

fs.writeFileSync(OUT, JSON.stringify(days, null, 2), 'utf8');
console.log('Wrote', OUT, '—', days.length, 'days');

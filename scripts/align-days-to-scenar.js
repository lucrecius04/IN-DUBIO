/**
 * Sladí data/days.json s docs/scenar/Mapa_15dni.csv + Pripady_15dni.csv
 * (kalendář 19 dní: 5+2+5+2+5). Přesune adventure bloky místo ručního kopírování.
 * Spusť: node scripts/align-days-to-scenar.js
 *
 * Po sladění případů doplň ručně (nebo zvláštním commitem) rána/večery/fragmenty
 * a titulky novin — tento skript je neřeší, aby se při opakovaném běhu nemazaly.
 */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'data', 'days.json');
const days = JSON.parse(fs.readFileSync(OUT, 'utf8'));

function den(n) {
  const o = days.find((d) => d.day === n);
  if (!o) throw new Error('Chybí den ' + n);
  return o;
}

// --- Den 1–5 (první pracovní týden) ---
Object.assign(den(1), {
  cases: ['pool_a1_bozena_slepice', 'tyc_horak_d1']
});
Object.assign(den(2), {
  cases: ['pool_a1_lekarna', 'pool_a1_weiss']
});
Object.assign(den(3), {
  cases: ['pool_a1_pospisil_vycep', 'pool_a1_markova_svedkyne']
});
Object.assign(den(4), {
  cases: ['pool_a1_bozena_cest', 'pool_a1_hranice_zed']
});
Object.assign(den(5), {
  cases: ['pool_a1_nemocenska', 'pool_a1_vytrznost']
});

// --- Den 8 = scénář D6 (pondělí týden 2): morálka + Pospíšil 2 ---
const d8 = den(8);
d8.cases = ['pool_a1_stara_rana', 'tyc_pospisil_2'];
d8.cases_light = undefined;
d8.morning_fragment = 'fragment_d6_morning';
// Ranní echo k nemocenské — hráč mohl rozhodnout v D5
// (ponecháno; D8 už není Božena/Hranice 2)

// --- Den 9 = scénář D7: Horáček + politický pool ---
const d9 = den(9);
const benešAdventure = d9.adventure_scene;
delete d9.adventure_scene;
d9.cases = ['tyc_horac_d7', 'pool_a1_vyveseni'];
d9.letters = ['vlcek_d7'];
d9.morning_fragment = null;
delete d9.morning_conditional_lines;
d9.evening_choice = {
  text: 'Po síni je cítit politický vánek. Listiny voní inkoustem — a někdy i strachem.',
  options: [
    {
      text: 'Zapíšeš si jen fakta z jednání. Bez domýšlení.',
      effects: { Moudrost: 2, Vina: 1 }
    },
    {
      text: 'Nezapíšeš nic. Necháš to doznít v hlavě.',
      effects: { Integrita: 1, Nadeje: 1 }
    }
  ]
};

// --- Den 10 = scénář D8: Božena 3 + Hranice 2 + light ---
const d10 = den(10);
d10.cases = ['tyc_bozena_3', 'tyc_hranice_2', 'pool_a1_spravce'];
d10.cases_light = [false, false, true];
d10.letters = ['vlcek_d8'];
d10.morning_fragment = 'fragment_d8_morning';

// --- Den 11 = scénář D9: Beneš + morální pool + light ---
const d11 = den(11);
d11.adventure_scene = benešAdventure;
d11.cases = ['pool_a1_spravce', 'pool_a1_bytova_komise', 'pool_a1_nemocenska'];
d11.cases_light = [false, false, true];
d11.letters = ['benes_d9'];
d11.morning_fragment = 'fragment_d9_morning';
d11.morning_conditional_lines = [
  {
    condition: { flag: 'flag_pospisil_dluzi', value: true },
    text: 'U Pospíšila víš, co dluží - a nejde o koruny. Dnes se v síni budou vyslovovat věci, které protokol stejně nikdy nepojmenuje celé.'
  }
];
d11.evening_choice = {
  text: 'Benešova obálka je pořád v hlavě, i když už leží zavřená v zásuvce.',
  options: [
    {
      text: 'Sepíšeš krátkou poznámku k tomu, co dnes zaznělo mezi dveřmi.',
      effects: { Moudrost: 2, Vina: 1 }
    },
    {
      text: 'Zhasneš lampu bez zápisu. Necháš to doznít ve tmě.',
      effects: { Integrita: 1, Nadeje: 1 }
    }
  ]
};

// --- Den 12 = scénář D10: tiskárna + zvraty + light ---
const d12 = den(12);
d12.cases = ['pool_a1_tiskarna', 'tyc_zvraty_d10', 'pool_a1_nemocenska'];
d12.cases_light = [false, false, true];
d12.letters = ['martin_d10'];
d12.morning_fragment = 'fragment_d10_morning';
delete d12.morning_conditional_lines;
d12.evening_choice = {
  text: 'Po dnešku je jasné jen to, že některé podpisy mají delší stín než jiné.',
  options: [
    {
      text: 'Vrátíš se ke spisu a ověříš každé datum ještě jednou.',
      effects: { Moudrost: 2, Vina: 1 }
    },
    {
      text: 'Jdeš domů bez papíru v ruce. Jen s tím, co nejde odložit.',
      effects: { Integrita: 1, Nadeje: 1 }
    }
  ]
};

// --- Den 13 = druhá sobota: bez spisů ---
const d13 = den(13);
const karasAdventure = d13.adventure_scene;
delete d13.adventure_scene;
d13.cases = [];
delete d13.letters;
d13.morning_fragment = null;
d13.evening_choice = null;
d13.newspaper_headline = 'Sobota. Město drží dech — soud mlčí.';

// --- Den 14 = druhá neděle: jen nedělní volba (bez spisů) ---
const d14 = den(14);
delete d14.cases;
delete d14.cases_light;
delete d14.morning_conditional_lines;
d14.evening_choice = null;

// --- Den 15 = scénář D11: Weiss + Haas + light ---
const d15 = den(15);
d15.cases = ['pool_a1_weiss', 'tyc_haas_d11', 'pool_a1_exekuce'];
d15.cases_light = [false, false, true];
d15.letters = ['vlcek_d11'];
d15.morning_fragment = 'fragment_d11_morning_base';
delete d15.morning_conditional_lines;
d15.evening_choice = {
  text: 'Po Haasově návštěvě je v kanceláři dusno, i když je okno dokořán.',
  options: [
    {
      text: 'Sepíšeš věcný záznam dne, bez jediné zbytečné věty.',
      effects: { Moudrost: 2, Vina: 1 }
    },
    {
      text: 'Nezapíšeš nic. Jen složíš ruce a počkáš, až se dech uklidní.',
      effects: { Integrita: 1, Nadeje: 1 }
    }
  ]
};

// --- Den 16 = scénář D12: Stará rána + Závadová + light ---
const d16 = den(16);
d16.cases = ['pool_a1_stara_rana', 'tyc_zavadova_d12', 'pool_a1_trafika'];
d16.cases_light = [false, false, true];
delete d16.letters;
d16.morning_fragment = 'fragment_d12_echo_base';
d16.morning_conditional_lines = [
  {
    condition: { flag: 'verdict_pool_a1_exekuce', value: 'alternative' },
    text: 'Ve Svobodném obzoru vyšel krátký sloupek o exekucích na venkově. Bez podpisu. Ben pozná autora hned po první větě.'
  },
  {
    condition: { flag: 'verdict_pool_a1_exekuce', value: 'guilty' },
    text: 'Součková pokutu zaplatila. Josef prodal hodinky a statek běží dál, jen tišeji než dřív.'
  }
];
d16.evening_choice = {
  text: 'Věta ze Závadové spisu se vrací pořád stejně: jednou slyšená, potřetí jiná.',
  options: [
    {
      text: 'Do deníku zapíšeš jen fakta. Bez přídavných jmen.',
      effects: { Moudrost: 2, Vina: 1 }
    },
    {
      text: 'Necháš deník zavřený. Dnes by slova byla horší než ticho.',
      effects: { Integrita: 1, Nadeje: 1 }
    }
  ]
};

// --- Den 17 = scénář D13: Karas + politický pool + light ---
const d17 = den(17);
d17.adventure_scene = karasAdventure;
d17.cases = ['pool_a1_vyveseni', 'pool_a1_druha_ruka', 'pool_a1_revizor'];
d17.cases_light = [false, false, true];
delete d17.letters;
d17.morning_fragment = 'fragment_d12_morning';
d17.evening_choice = {
  text: 'Karas odešel. V kanceláři po něm zůstalo víc otázek než odpovědí.',
  options: [
    {
      text: 'Napíšeš si tři jména, která dnes padla. Nic víc.',
      effects: { Moudrost: 2, Vina: 1 }
    },
    {
      text: 'Papír necháš čistý a jdeš domů dřív, než začneš pochybovat.',
      effects: { Integrita: 1, Nadeje: 1 }
    }
  ]
};

// --- Den 18 = scénář D14: Marková 3 + poslední pool + light ---
const d18 = den(18);
d18.cases = ['tyc_markova_3', 'pool_a1_posledni_vule', 'pool_a1_spravce'];
d18.cases_light = [false, false, true];
d18.letters = ['martin_d14'];
d18.morning_fragment = null;
delete d18.adventure_scene;
d18.evening_choice = {
  text: 'Den se chýlí. Ruka drží pero pevněji, než by chtěla.',
  options: [
    {
      text: 'Krátce zapisuješ, co bys neřekl nahlas.',
      effects: { Moudrost: 2, Vina: 1 }
    },
    {
      text: 'Jdeš bez zápisku. Jen s vědomím.',
      effects: { Integrita: 2, Nadeje: 1 }
    }
  ]
};

// --- Den 19 = scénář D15: velezrada + finále ---
const d19 = den(19);
d19.cases = ['tyc_velezrada_d15', '', ''];
d19.morning_fragment = 'fragment_d20_odhaleni';
d19.special_events = ['finale_15d'];
d19.cases_light = undefined;
d19.morning_conditional_lines = [
  {
    condition: { flag: 'benes_pravda_prijata', value: true },
    text: 'V zásuvce pod starými nálezy leží obálka. Ben už ví, čí podpis na tom listu čeká.'
  }
];
d19.evening_choice = {
  text: 'Poslední listy, poslední rozhodnutí. Co zůstane z tebe?',
  options: [
    {
      text: 'Krátce zapisuješ, co bys neřekl nahlas.',
      effects: { Moudrost: 2, Vina: 1 }
    },
    {
      text: 'Jdeš bez zápisku. Jen s vědomím.',
      effects: { Integrita: 2, Nadeje: 1 }
    }
  ]
};

fs.writeFileSync(OUT, JSON.stringify(days, null, 2) + '\n', 'utf8');
console.log('Zapsáno', OUT);

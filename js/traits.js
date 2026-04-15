/**
 * traits.js — Charakterové rysy.
 * Hodnoty 0–100 (skryté před hráčem).
 * Hráč čte jen textový popis a vizuální indikátor.
 */

const Traits = (() => {

  // Výchozí texty — přepíše je data z traits-text.json
  const VYCHOZI_TEXTY = {
    Integrita: [
      { range: [0,  15], text: 'Nevzpomínáš si, kdy sis naposledy myslel, že to má smysl.' },
      { range: [16, 30], text: 'Zákon je nástroj. Otázka je, v čích rukou.' },
      { range: [31, 50], text: 'Začínáš pochybovat, jestli zákon a spravedlnost jsou totéž.' },
      { range: [51, 70], text: 'Stále věříš, že zákon může být spravedlivý.' },
      { range: [71, 85], text: 'Zákon a spravedlnost jsou jedno. Nebo by měly být.' },
      { range: [86, 100], text: 'I kdyby tě to stálo vše — spravedlnost není vyjednatelná.' }
    ],
    Odvaha: [
      { range: [0,  20], text: 'Každé ráno přichází s novým důvodem mlčet.' },
      { range: [21, 40], text: 'Víš co je správné. Říct to nahlas je jiná věc.' },
      { range: [41, 60], text: 'Kompromis není vždy zbabělost. Říkáš si to dost často.' },
      { range: [61, 80], text: 'Tlak tě nezlomí. Možná ohne, ale nezlomí.' },
      { range: [81, 100], text: 'Rozhodl ses. Ať to stojí co to stojí.' }
    ],
    Moudrost: [
      { range: [0,  20], text: 'Rozhoduješ dřív, než přemýšlíš.' },
      { range: [21, 40], text: 'Fakta znáš. Pravdu ne vždy.' },
      { range: [41, 60], text: 'Zkušenost tě naučila, že první verze příběhu bývá ta nejméně pravdivá.' },
      { range: [61, 80], text: 'Čteš lidi tak, jak čteš spisy — s trpělivostí a skepticismem.' },
      { range: [81, 100], text: 'Vidíš co ostatní nevidí. To tě izoluje a chrání zároveň.' }
    ],
    Vina: [
      { range: [0,  30], text: 'Minulost je minulost. Tak si říkáš.' },
      { range: [31, 50], text: 'Někdy vidíš jeho tvář ve svědcích. V obviněných. Všude.' },
      { range: [51, 70], text: 'Jeden rozsudek. Před deseti lety. Stále nevíš, jestli jsi to byl ty.' },
      { range: [71, 85], text: 'Každý případ je zrcadlo. A to co vidíš, se ti nelíbí.' },
      { range: [86, 100], text: 'Jsi paralyzován vlastní minulostí. Rozsudky cítíš jako opakování.' }
    ],
    Maska: [
      { range: [0,  20], text: 'Všichni vidí, čím jsi unavený. Nedokážeš to skrýt.' },
      { range: [21, 40], text: 'Tvůj klid je vrstva ledového skla — tenká a praskající.' },
      { range: [41, 60], text: 'Soudce Novák. Pevný. Nezaujatý. Role, kterou hraješ dobře.' },
      { range: [61, 80], text: 'Maska sedí tak dobře, že někdy zapomeneš, co je pod ní.' },
      { range: [81, 100], text: 'Dokonalá fasáda. Ale Vlček tě přesto čte. A sní čítá dobře.' }
    ],
    Nadeje: [
      { range: [0,  10], text: 'Třicet dní. Pak to skončí — tak nebo tak.' },
      { range: [11, 25], text: 'Svítání je jen tmavší noc, která trvá kratší dobu.' },
      { range: [26, 45], text: 'Možná se věci zlepší. Možná ne. Zatím jsem tady.' },
      { range: [46, 65], text: 'Stojí to za to. Přinejmenším někdy.' },
      { range: [66, 80], text: 'Je šance. Malá, ale skutečná.' },
      { range: [81, 100], text: 'Věříš, že zákon lze napravit jedním spravedlivým člověkem najednou.' }
    ]
  };

  let _texty = VYCHOZI_TEXTY;

  function inicializuj() {
    const data = DataLoader.ziskej('traits');
    if (data) {
      // Přepiš výchozí texty z JSON
      for (const [id, def] of Object.entries(data)) {
        const nazev = _normalizeNazev(id);
        if (nazev && def.descriptions) {
          _texty[nazev] = def.descriptions.map(d => ({
            range: d.range,
            text: d.text
          }));
        }
      }
    }
  }

  function _normalizeNazev(id) {
    const MAPA = {
      integrita: 'Integrita',
      odvaha:    'Odvaha',
      moudrost:  'Moudrost',
      vina:      'Vina',
      maska:     'Maska',
      nadeje:    'Nadeje'
    };
    return MAPA[id.toLowerCase()] || null;
  }

  function getPopis(nazev) {
    const hodnota = State.get('traits.' + nazev) ?? 50;
    const textyRysu = _texty[nazev];
    if (!textyRysu) return '—';

    const zaznam = textyRysu.find(t => hodnota >= t.range[0] && hodnota <= t.range[1]);
    return zaznam ? zaznam.text : '—';
  }

  function getPopisVse() {
    const vysledek = {};
    const nazvy = ['Integrita', 'Odvaha', 'Moudrost', 'Vina', 'Maska', 'Nadeje'];
    for (const n of nazvy) {
      vysledek[n] = getPopis(n);
    }
    return vysledek;
  }

  function zkontrolujKrajniHodnoty() {
    const traits = State.get('traits');
    const udalosti = [];

    if (traits.Integrita <= 0) {
      udalosti.push({ typ: 'ending', ending: 'korupce' });
    }
    if (traits.Integrita >= 100) {
      udalosti.push({ typ: 'vlcek_utok' });
    }
    if (traits.Odvaha <= 15) {
      udalosti.push({ typ: 'omezeni_moznosti' });
    }
    if (traits.Nadeje <= 0) {
      udalosti.push({ typ: 'nejkratsi_epilog' });
    }

    return udalosti;
  }

  return {
    inicializuj,
    getPopis,
    getPopisVse,
    zkontrolujKrajniHodnoty
  };

})();

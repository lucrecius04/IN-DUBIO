/**
 * traits.js — Charakterové rysy.
 * Hodnoty 0–100 (skryté před hráčem).
 * Hráč čte jen textový popis a vizuální indikátor.
 */

const Traits = (() => {

  // Výchozí texty — přepíše je data z traits-text.json
  const VYCHOZI_TEXTY = {
    Integrita: [
      { range: [0, 20], text: 'Zákon je nástroj. Dávno sis přestal ptát, v čích rukou.' },
      { range: [21, 40], text: 'Ještě si pamatuješ, jaký jsi byl. Už to není každý den.' },
      { range: [41, 60], text: 'Ještě věříš, že lavice soudce může být čistá.' },
      { range: [61, 80], text: 'Kompromisy znáš. Zatím jsi každý z nich pojmenoval pravým jménem.' },
      { range: [81, 100], text: 'Čistý štít. Otázka je, kolik to ještě bude stát.' }
    ],
    Odvaha: [
      { range: [0, 20], text: 'Bezpečná cesta. Vždycky se nějaká najde.' },
      { range: [21, 40], text: 'Víš co je správné. Zatím to nestojí za ten risk.' },
      { range: [41, 60], text: 'Víš, co je správné. Otázka je, jestli to unese tvůj stůl.' },
      { range: [61, 80], text: 'Některé věci řekneš nahlas. I když tě nikdo nechce slyšet.' },
      { range: [81, 100], text: 'Strach cítíš. Jen ho přestal poslouchat.' }
    ],
    Moudrost: [
      { range: [0, 20], text: 'První verze příběhu bývá ta nejpěknější. Bereš ji.' },
      { range: [21, 40], text: 'Tušíš, že něco nesedí. Nemáš sílu to hledat.' },
      { range: [41, 60], text: 'Vidíš víc než ostatní. Někdy by bylo lepší nevidět.' },
      { range: [61, 80], text: 'Lži poznáš dřív, než je dopoví. To tě dělá nebezpečným.' },
      { range: [81, 100], text: 'Čteš mezi řádky. Někdy i tam, kde nic není. To tě unavuje.' }
    ],
    Vina: [
      { range: [0, 20], text: 'Naučil ses žít s tím co bylo. Nezapomněl jsi. Jen to přestal nosit.' },
      { range: [21, 40], text: 'Minulost tě ještě někdy probudí. Ale méně než dřív.' },
      { range: [41, 60], text: 'Jeden rozsudek před lety. Stále nevíš, jestli jsi byl ty, nebo jen paragraf.' },
      { range: [61, 80], text: 'Nesneseš pohled na určité spisy. Víš proč. Nechceš to pojmenovat.' },
      { range: [81, 100], text: 'Každý případ je připomínka. Každé razítko je ozvěna toho jednoho.' }
    ],
    Maska: [
      { range: [0, 20], text: 'Každý vidí skrz tebe. Přestal jsi to skrývat.' },
      { range: [21, 40], text: 'Občas tě někdo přečte. Vadí ti to víc než by mělo.' },
      { range: [41, 60], text: 'Soudce Novák. Klidný. Nezaujatý. Role, kterou umíš hrát poslepu.' },
      { range: [61, 80], text: 'Za tím klidem hledají trhlinu. Zatím ji nenašli.' },
      { range: [81, 100], text: 'Nevíš sám, kde končí role a začínáš ty. Možná už není rozdíl.' }
    ],
    Nadeje: [
      { range: [0, 20], text: 'Příběh mohl dopadnout jinak. Nedopadl.' },
      { range: [21, 40], text: 'Děláš co máš. Přestal jsi čekat, že to něco změní.' },
      { range: [41, 60], text: 'Někdy má smysl vstát. Ne vždycky. Ale dnes jo.' },
      { range: [61, 80], text: 'Věříš, že spravedlnost existuje. Zatím jsi ji párkrát viděl na vlastní oči.' },
      { range: [81, 100], text: 'Ještě ti záleží. Na všem. To tě chrání — a zároveň nejvíc zraňuje.' }
    ]
  };

  let _texty = VYCHOZI_TEXTY;

  const VYCHOZI_HERNI = {
    Integrita: 'Každý rozsudek tě posouvá blíž k člověku, kterým chceš být — nebo dál od něj. Integrita rozhoduje, které možnosti vůbec uvidíš: příliš nízko a hra ti zavře dveře, o kterých ani nevíš. Příliš vysoko a ti, kdo spoléhají na tvůj kompromis, začnou hledat jiné páky.',
    Odvaha:    'Odvaha je vstupenka na nepopulární lavici. Některé rozsudky se objeví jen tehdy, když na to máš sílu — jinak v seznamu prostě nejsou.\n\nKdyž lampa vyhasne příliš nízko, hra ti začne nabízet jen bezpečné střední cesty.\n\nVlček, Horáková i Mašek čtou odvahu jinak: jeden v ní vidí hrozbu, druhý spojence, třetí člověka, kterého stačí lehce zatlačit.',
    Moudrost:  'Moudrost roste za práci se spisem — každý průzkum, který opravdu něco vytáhne, tě něco naučí. Vysoká moudrost odkrývá skryté vrstvy příběhu v textu případu: nesrovnalosti, motivy, věci které tam oficiálně nejsou. Schází-li, zůstaneš u povrchu — méně podkladů, méně háčků, méně šancí rozhodnout správně.',
    Vina:      'Tíživé rozsudky a určité momenty příběhu vinu přidávají — úleva ji umí stáhnout, ale nikdy tě nepustí na nulu. Jednička je dno, pod které nejde spadnout. Čím těžší je svědomí, tím víc tě podobné případy bolí. Hra s tím počítá u věcí, které se dotýkají staré rány — kolik ti zbyde sil na průzkum, jak dlouho a jak bolestně čteš spis.',
    Maska:     'Chladná razítka a hladké odpovědi masku posilují. Upřímnost, slabost nebo dopisy, které tě rozhodí, ji škrábou. Určuje, jestli tě mocní vnímají jako nedobytnou zeď — nebo jako člověka s prasklinou. Vysoká maska zvýrazňuje bezpečné kompromisy v politických spisech a mění tón tvých střetů s Vlčkem nebo Haasem: kdo vidí sklo, a kdo už čeká za ním.',
    Nadeje:    'Spravedlivé dny a večery, kdy si neublížíš, naději zvedají. Cynismus, prohry a prázdnota ji berou vzduch. Když spadne na nulu, hra může sklouznout k nejkratšímu, nejchladnějšímu epilogu — jako by se příběh ani neobtěžoval dovyprávět. Naděje odemyká odvážnější kompromisy v morálních dilematech a naopak schovává ty příliš růžové — zúží i večerní volby, když už v tobě moc nezbývá věřit.'
  };

  const VYCHOZI_CO_TO_ZNAMENA = {
    Integrita: 'Jak věrný zůstáváš svým hodnotám. Klesá přijetím úplatků a politických rozsudků.',
    Odvaha:    'Ochota jednat i za cenu osobních následků.',
    Moudrost:  'Schopnost číst situace a odhalovat lži.',
    Vina:      'Váha minulosti. Nikdy neklesne na nulu.',
    Maska:     'Jak dobře skrýváš své skutečné záměry.',
    Nadeje:    'Věříš ještě, že něco má smysl?'
  };

  let _herniPopis = { ...VYCHOZI_HERNI };
  let _coToZnamena = { ...VYCHOZI_CO_TO_ZNAMENA };

  function inicializuj() {
    const data = DataLoader.ziskej('traits');
    if (data) {
      for (const [id, def] of Object.entries(data)) {
        const nazev = _normalizeNazev(id);
        if (!nazev) continue;
        if (def.descriptions) {
          _texty[nazev] = def.descriptions.map(d => ({
            range: d.range,
            text: d.text
          }));
        }
        if (def.gameplay_cz && typeof def.gameplay_cz === 'string') {
          _herniPopis[nazev] = def.gameplay_cz;
        }
        if (def.co_to_znamena_cz && typeof def.co_to_znamena_cz === 'string') {
          _coToZnamena[nazev] = def.co_to_znamena_cz;
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

  function getHerniPopis(nazev) {
    return _herniPopis[nazev] || VYCHOZI_HERNI[nazev] || '';
  }

  function getCoToZnamena(nazev) {
    return _coToZnamena[nazev] || VYCHOZI_CO_TO_ZNAMENA[nazev] || '';
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
    getHerniPopis,
    getCoToZnamena,
    zkontrolujKrajniHodnoty
  };

})();

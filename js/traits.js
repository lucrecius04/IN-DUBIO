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
    Odvaha:    'Odvaha je vstupenka na nepopulární lavici. Některé rozsudky se objeví jen tehdy, když na to máš sílu — jinak v seznamu prostě nejsou.\n\nKdyž lampa vyhasne příliš nízko, hra ti začne nabízet jen bezpečné střední cesty.\n\nVlček, Závadová i Karas čtou odvahu jinak: jeden v ní vidí hrozbu, druhá spojence, třetí člověka, kterého stačí lehce zatlačit.',
    Moudrost:  'Moudrost roste za práci se spisem — každý průzkum, který opravdu něco vytáhne, tě něco naučí. Když pak rozhodneš v souladu s tím, co spis prozradil, učíš se znovu — bez fanfár, jen v číslech pod kapotou. Opakovaný vzorec (průzkum vs rychlé razítko; měkčí k Lidu vs tvrdší k trestu) časem mění, jak rychle se ta čísla hýbou. Vysoká moudrost odkrývá skryté vrstvy příběhu v textu případu: nesrovnalosti, motivy, věci které tam oficiálně nejsou. Schází-li, zůstaneš u povrchu — méně podkladů, méně háčků, méně šancí rozhodnout správně.',
    Vina:      'Tíživé rozsudky a určité momenty příběhu vinu přidávají — úleva ji umí stáhnout, ale nikdy tě nepustí na nulu. Jednička je dno, pod které nejde spadnout. Čím těžší je svědomí, tím víc tě podobné případy bolí. Hra s tím počítá u věcí, které se dotýkají staré rány — kolik ti zbyde sil na průzkum, jak dlouho a jak bolestně čteš spis.',
    Nadeje:    'Spravedlivé dny a večery, kdy si neublížíš, naději zvedají. Cynismus, prohry a prázdnota ji berou vzduch. Když spadne na nulu, hra může sklouznout k nejkratšímu, nejchladnějšímu epilogu — jako by se příběh ani neobtěžoval dovyprávět. Naděje odemyká odvážnější kompromisy v morálních dilematech a naopak schovává ty příliš růžové — zúží i večerní volby, když už v tobě moc nezbývá věřit.'
  };

  const VYCHOZI_CO_TO_ZNAMENA = {
    Integrita: 'Jak věrný zůstáváš svým hodnotám. Klesá přijetím úplatků a politických rozsudků.',
    Odvaha:    'Ochota jednat i za cenu osobních následků.',
    Moudrost:  'Schopnost číst situace a odhalovat lži.',
    Vina:      'Váha minulosti. Nikdy neklesne na nulu.',
    Nadeje:    'Věříš ještě, že něco má smysl?'
  };

  let _herniPopis = { ...VYCHOZI_HERNI };
  let _coToZnamena = { ...VYCHOZI_CO_TO_ZNAMENA };

  const _RANGE_KLIC = /^(\d+)-(\d+)$/;

  function _textyZRozsahuTooltip(def) {
    const rows = [];
    if (!def || typeof def !== 'object') return rows;
    for (const [rk, val] of Object.entries(def)) {
      if (!val || typeof val !== 'object') continue;
      const m = _RANGE_KLIC.exec(rk);
      if (!m) continue;
      const tooltip = val.tooltip;
      if (typeof tooltip !== 'string') continue;
      rows.push({
        range: [Number(m[1]), Number(m[2])],
        text: tooltip
      });
    }
    rows.sort((a, b) => a.range[0] - b.range[0]);
    return rows;
  }

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
        } else {
          const zRozsahu = _textyZRozsahuTooltip(def);
          if (zRozsahu.length) _texty[nazev] = zRozsahu;
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
      nadeje:    'Nadeje'
    };
    return MAPA[id.toLowerCase()] || null;
  }

  /** Vnitřní klíč rysu → název pro UI (čeština s diakritikou). */
  const _NAZEV_RYSU_PRO_UI = {
    Integrita: 'Integrita',
    Odvaha: 'Odvaha',
    Moudrost: 'Moudrost',
    Vina: 'Vina',
    Nadeje: 'Naděje'
  };

  function getNazevRysuProUi(vnitrniKlic) {
    const k = String(vnitrniKlic || '');
    return _NAZEV_RYSU_PRO_UI[k] || k;
  }

  function getNazevRysuProUiVelky(vnitrniKlic) {
    return getNazevRysuProUi(vnitrniKlic).toLocaleUpperCase('cs-CZ');
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
    const nazvy = ['Integrita', 'Odvaha', 'Moudrost', 'Vina', 'Nadeje'];
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

  /**
   * Texty z data/traits-text.json podle hodnoty 0–100.
   * @param {string} key integrita | odvaha | moudrost | vina | nadeje (libovolná velikost písmen)
   * @param {number} value hodnota rysu
   * @returns {{ tooltip: string, notebook: string }}
   */
  function getTraitText(key, value) {
    const data = DataLoader.ziskej('traits');
    const traitKey = String(key || '').toLowerCase();
    const trait = data && data[traitKey];
    if (!trait || typeof trait !== 'object') {
      return { tooltip: '', notebook: '' };
    }
    const v = Math.max(0, Math.min(100, Number(value)));
    if (!Number.isFinite(v)) {
      return { tooltip: '', notebook: '' };
    }
    for (const [rk, obj] of Object.entries(trait)) {
      if (!obj || typeof obj !== 'object') continue;
      const m = _RANGE_KLIC.exec(rk);
      if (!m) continue;
      const a = Number(m[1]);
      const b = Number(m[2]);
      if (v < a || v > b) continue;
      let notebook = typeof obj.notebook === 'string' ? obj.notebook : '';
      if (traitKey === 'vina' && v >= 85 && notebook) {
        const dopln = v >= 92
          ? ' Další tvrdý rozsudek už vás uvnitř tolik nezmění — těžké svědomí drží hranici.'
          : ' Těžké svědomí — podobné případy bolí víc než zápisník ukáže.';
        if (!notebook.includes(dopln.trim())) notebook += dopln;
      }
      return {
        tooltip: typeof obj.tooltip === 'string' ? obj.tooltip : '',
        notebook
      };
    }
    return { tooltip: '', notebook: '' };
  }

  /** Nadpis tooltipu nad stolem — pole `visual` z traits-text.json (např. kalamář → KALAMÁŘ). */
  function getTraitVisualLabel(traitNazev) {
    const k = String(traitNazev || '').toLowerCase();
    const data = DataLoader.ziskej('traits');
    const t = data && data[k];
    const vis = t && typeof t.visual === 'string' ? t.visual.trim() : '';
    if (!vis) return getNazevRysuProUiVelky(traitNazev);
    return vis.toLocaleUpperCase('cs-CZ');
  }

  /** Atmosférické předměty na stole bez mapy na rys (zdroj: traits-text.json → desk_predmety). */
  function getDeskPredmetAtmosfera(predmetKlic) {
    const data = DataLoader.ziskej('traits');
    const blok = data && data.desk_predmety;
    const p = blok && blok[predmetKlic];
    if (!p || typeof p !== 'object') {
      return { nazev: '', tooltip: '' };
    }
    return {
      nazev: typeof p.nazev === 'string' ? p.nazev : '',
      tooltip: typeof p.tooltip === 'string' ? p.tooltip : ''
    };
  }

  /**
   * Skrytý násobič růstu Moudrosti z průzkumu / souladu s odhalením (podle vzorce rozhodování ve stavu).
   * Hráč číslo nevidí — jen plynulejší nebo pomalejší posun.
   */
  function aplikovatNasobekMoudrostiZaAkci(delta) {
    const d0 = Number(delta);
    if (!Number.isFinite(d0) || d0 === 0) return 0;
    const rs = State.get('rozhodovaci_styl');
    if (!rs || typeof rs !== 'object') return Math.round(d0);
    let m = 1;
    if ((rs.investigation_streak || 0) >= 3) m *= 1.5;
    if ((rs.no_investigation_streak || 0) >= 3) m *= 0.7;
    const tnm = Number(State.get('tydenni_nasobek_moudrosti'));
    if (Number.isFinite(tnm) && tnm > 1) m *= tnm;
    return Math.round(d0 * m);
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
    getTraitText,
    getTraitVisualLabel,
    getNazevRysuProUi,
    getNazevRysuProUiVelky,
    getDeskPredmetAtmosfera,
    aplikovatNasobekMoudrostiZaAkci,
    zkontrolujKrajniHodnoty
  };

})();

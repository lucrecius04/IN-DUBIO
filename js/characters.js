/**
 * characters.js — NPC postavy, důvěra, dialogy.
 * Důvěra: 0 = cizinec, 1 = známý, 2 = spojenec, 3 = věří ti životem.
 */

const Characters = (() => {

  let _data = {};

  /** Vizitky ve šuplíku — pořadí a id = klíče State.trust (jen tři NPC) */
  const SEZNAM_VIZITEK = [
    {
      id: 'vlcek',
      jmeno: 'Alexandr Vlček',
      role: 'Ministr',
      popisKratky: 'Ministr justice. K tobě hlavně dopisy.',
      popis: 'Politický nadřízený justice. Oslovuje tě úředně, často písemně — zdvořilý úvod, těžká věta uprostřed, klid na konci. Působí jako člověk, který věří v pořádek instituce.'
    },
    {
      id: 'zavadova',
      jmeno: 'Eliška Závadová',
      role: 'Novinářka',
      popisKratky: 'Novinářka. Právní vzdělání, ostrý pozor.',
      popis: 'Redaktorka ve Svobodném obzoru; část textů podepisuje jinak. Zná soud z hlediště i z chodby — mluví přesně, sleduje justici veřejně i osobně.'
    },
    {
      id: 'karas',
      jmeno: 'Ctibor Karas',
      role: 'Kolega soudce',
      popisKratky: 'Kolega z Vídně. Jediný, kdo říká Ben.',
      popis: 'Soudce a přítel ze studentských let ve Vídni. U kávy je vřelý, v práci opatrný; někdy mlčí tak, že nevíš, kde končí přátelství a začíná ticho, které si nechává pro sebe.'
    }
  ];

  const VLIV_NA_HRACE = {
    vlcek:
      'Důvěra roste → Integrita klesá každý den.\nDůvěra na 0 → Eskalace, osobní návštěva.',
    zavadova:
      'Důvěra roste → Odvaha a Naděje silnější.\nDůvěra na 0 → Naděje slábne.',
    karas:
      'Důvěra roste → Integrita klesá.\nNa vyšší úrovni máš od něj víc praktické opory — často za cenu toho, co si soudce nechce přiznat nahlas.'
  };

  function inicializuj() {
    const postavy = DataLoader.ziskej('characters');
    if (postavy) {
      for (const p of postavy) {
        _data[p.id] = p;
      }
    }
  }

  function getPostava(id) {
    return _data[id] || null;
  }

  // Vrátí dialog pro postavu na daný den, respektuje podmínky
  /** Dialogové podmínky `trust_*` u starých id (pool JSON: horakova / Mašek) čtou klíče důvěry ve stavu. */
  function _duveraProDialog(postavaId) {
    const klic = { horakova: 'zavadova', masek: 'karas' }[postavaId] || postavaId;
    const povoleno = { vlcek: true, zavadova: true, karas: true };
    if (!povoleno[klic]) return 0;
    return State.get('trust.' + klic) ?? 0;
  }

  function getDialog(id, den) {
    const postava = _data[id];
    if (!postava || !postava.dialogues) return null;

    const trust = _duveraProDialog(id);
    const flags = State.get('flags');

    // Najdi dialog pro správný den s splněnými podmínkami
    const dialog = postava.dialogues.find(d => {
      if (d.day !== den) return false;
      if (!d.condition) return true;

      const podm = d.condition;
      if (podm.trust_min !== undefined && trust < podm.trust_min) return false;
      if (podm.trust_max !== undefined && trust > podm.trust_max) return false;
      if (podm.flag && !flags[podm.flag]) return false;
      if (podm.flag_not && flags[podm.flag_not]) return false;
      return true;
    });

    return dialog || null;
  }

  // Vrátí všechny dialogy postavy pro daný den (některé postavy mohou mít více)
  function getDialogyDen(den) {
    const vysledek = [];
    for (const [id, postava] of Object.entries(_data)) {
      const dialog = getDialog(id, den);
      if (dialog) {
        vysledek.push({ id, postava, dialog });
      }
    }
    return vysledek;
  }

  function getNazev(id) {
    return _data[id]?.name || id;
  }

  /** Krátký titulek řádku historie (za „Den N — “) */
  function getHistorieRadkaTitulek(npcId, dialogType) {
    const typ = dialogType === 'visit' ? 'visit' : 'letter';
    const map = {
      vlcek:     { letter: 'Dopis od Vlčka',     visit: 'Osobní návštěva' },
      zavadova:  { letter: 'Dopis od Závadové', visit: 'Osobní návštěva' },
      karas:     { letter: 'Dopis od Karase',   visit: 'Osobní návštěva' },
      masek:     { letter: 'Dopis od Maška',    visit: 'Osobní návštěva' },
      benes:     { letter: 'Dopis od Beneše',   visit: 'Setkání s Benešem' },
      haas:      { letter: 'Dopis od Haase',    visit: 'Osobní návštěva' }
    };
    const r = map[npcId];
    if (r && r[typ]) return r[typ];
    const zakl = typ === 'visit' ? 'Osobní návštěva' : 'Dopis';
    return zakl + ' — ' + getNazev(npcId);
  }

  /** Slovní vyjádření důvěry (0–3) — stejná škála jako v archivu u dopadů. */
  const DUVERA_POPISEK = ['chladná', 'rezervovaná', 'vřelá', 'oddaná'];

  function getDuveraVizitka(id) {
    const t = Math.max(0, Math.min(3, Number(State.get('trust.' + id)) || 0));
    return DUVERA_POPISEK[t] || DUVERA_POPISEK[0];
  }

  function getDuveraIkony(id) {
    return getDuveraVizitka(id);
  }

  function getSeznamVizitek() {
    return SEZNAM_VIZITEK;
  }

  function getVlivNaHrace(id) {
    return VLIV_NA_HRACE[id] || '';
  }

  function _npcInteractionsPole() {
    const a = State.get('archive.npc_interactions');
    return Array.isArray(a) ? a : [];
  }

  function _lepsiTitulekHistorie(a, b) {
    const sa = String(a || '').trim();
    const sb = String(b || '').trim();
    if (!sa) return sb;
    if (!sb) return sa;
    if (sa === sb) return sa;
    const skor = (s) => {
      let u = 0;
      if (/od\s+/i.test(s)) u += 80;
      if (s.length > 12) u += s.length;
      else u += s.length * 2;
      return u;
    };
    return skor(sb) > skor(sa) ? sb : sa;
  }

  function getHistorieSetkani(npcId) {
    const radky = _npcInteractionsPole()
      .filter(e => e && e.npcId === npcId)
      .map(e => {
        const summary = e.summary != null && e.summary !== ''
          ? String(e.summary)
          : (e.label ? String(e.label).split(' · ')[0] : 'Setkání');
        const fullText = e.fullText != null && String(e.fullText).trim() !== ''
          ? String(e.fullText)
          : (e.label ? String(e.label) : '');
        return { day: Number(e.day) || 0, summary, fullText };
      });

    const poDni = new Map();
    for (const z of radky) {
      const d = z.day;
      if (!poDni.has(d)) {
        poDni.set(d, { day: d, summary: z.summary, fullText: z.fullText });
        continue;
      }
      const cur = poDni.get(d);
      const tCur = (cur.fullText || '').trim();
      const tNew = (z.fullText || '').trim();
      const delsi = tNew.length > tCur.length ? z.fullText : cur.fullText;
      poDni.set(d, {
        day: d,
        summary: _lepsiTitulekHistorie(cur.summary, z.summary),
        fullText: delsi || tCur || tNew
      });
    }

    const vysledek = Array.from(poDni.values()).sort((a, b) => b.day - a.day);
    return vysledek.slice(0, 25);
  }

  /** Prázdná historie v profilu — neznamená „nikdy jste se neviděli“, jen chybí záznam s váhou pro příběh. */
  function getHistoriePrazdnaZprava(npcId) {
    if (npcId === 'karas') {
      return 'Kolegu znáte z budovy každý den — sem patří jen významné chvíle příběhu. Zatím k nim nedošlo.';
    }
    return 'Sem patří jen významná setkání a události tohoto měsíce. Zatím k nim nedošlo.';
  }

  function getPosledniSlova(npcId) {
    const lw = State.get('archive.npc_last_words');
    if (!lw || typeof lw !== 'object') return null;
    const z = lw[npcId];
    if (!z || !z.text) return null;
    return String(z.text).trim() || null;
  }

  return {
    inicializuj,
    getPostava,
    getDialog,
    getDialogyDen,
    getNazev,
    getDuveraIkony,
    getDuveraVizitka,
    getSeznamVizitek,
    getVlivNaHrace,
    getHistorieSetkani,
    getHistoriePrazdnaZprava,
    getHistorieRadkaTitulek,
    getPosledniSlova
  };

})();

/**
 * characters.js — NPC postavy, důvěra, dialogy.
 * Důvěra: 0 = cizinec, 1 = známý, 2 = spojenec, 3 = věří ti životem.
 */

const Characters = (() => {

  let _data = {};

  /** Vizitky ve šuplíku — pořadí a id = klíče State.trust */
  const SEZNAM_VIZITEK = [
    {
      id: 'vlcek',
      jmeno: 'VLČEK',
      role: 'Ministr',
      popisKratky: 'Elegantní. Zdvořilý. Nebezpečný.',
      popis: 'Elegantní. Zdvořilý. Nebezpečný.\nNikdy nevyhrožuje přímo.'
    },
    {
      id: 'horakova',
      jmeno: 'HORÁKOVÁ',
      role: 'Novinářka',
      popisKratky: 'Sleduje tvá rozhodnutí.',
      popis: 'Sleduje tvá rozhodnutí.\nChce totéž co ty — ale jinak.'
    },
    {
      id: 'masek',
      jmeno: 'MAŠEK',
      role: 'Kolega soudce',
      popisKratky: 'Starý přítel. Dnes zkorumpovaný.',
      popis: 'Starý přítel. Dnes zkorumpovaný.\nŘíká že je to jediný způsob.'
    },
    {
      id: 'benes',
      jmeno: 'BENEŠ',
      role: 'Neznámý',
      popisKratky: 'Přišel jako svědek.',
      popis: 'Přišel jako svědek.\nNěco v něm tě znepokojuje.'
    },
    {
      id: 'haas',
      jmeno: 'HAAS',
      role: 'Průmyslník',
      popisKratky: 'Bohatý. Netknutelný.',
      popis: 'Bohatý. Netknutelný.\nPro něj jsi překážka nebo nástroj.'
    }
  ];

  const VLIV_NA_HRACE = {
    vlcek:
      'Důvěra roste → Integrita klesá každý den.\nDůvěra na 0 → Eskalace, osobní návštěva.',
    horakova:
      'Důvěra roste → Odvaha a Naděje silnější.\nDůvěra na 0 → Naděje slábne.',
    masek:
      'Důvěra roste → Integrita klesá.\nNa maximum → Varuje tě před Vlčkem.',
    benes:
      'Důvěra ≥ 2 → Vina klesá. Smíření.\nDůvěra na 0 → Vina roste při setkání.',
    haas:
      'Důvěra na maximum → Integrita −8.\nFinance +200 Kč. Bod bez návratu.'
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
  function getDialog(id, den) {
    const postava = _data[id];
    if (!postava || !postava.dialogues) return null;

    const trust = State.get('trust.' + id) ?? 0;
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
      vlcek:    { letter: 'Dopis od Vlčka',    visit: 'Osobní návštěva' },
      horakova: { letter: 'Dopis od Horákové', visit: 'Osobní návštěva' },
      masek:    { letter: 'Dopis od Maška',    visit: 'Osobní návštěva' },
      benes:    { letter: 'Dopis od Beneše',   visit: 'Setkání s Benešem' },
      haas:     { letter: 'Dopis od Haase',    visit: 'Osobní návštěva' }
    };
    const r = map[npcId];
    if (r && r[typ]) return r[typ];
    const zakl = typ === 'visit' ? 'Osobní návštěva' : 'Dopis';
    return zakl + ' — ' + getNazev(npcId);
  }

  function getDuveraVizitka(id) {
    const t = Math.max(0, Math.min(3, State.get('trust.' + id) ?? 0));
    if (t === 0) return '○○○';
    return '★'.repeat(t) + '☆'.repeat(3 - t);
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
    getHistorieRadkaTitulek,
    getPosledniSlova
  };

})();

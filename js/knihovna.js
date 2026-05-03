/**
 * knihovna.js — strukturovaný obsah záložky Knihovna (příběh / pravidla / slovník).
 * data/knihovna.json — version 2; starý formát { intro, entries } se sloučí do slovníku.
 */
const Knihovna = (() => {
  let _cache = null;
  let _nacitani = null;

  function _text(x) {
    return x != null && String(x).trim() ? String(x).trim() : '';
  }

  function _arr(x) {
    return Array.isArray(x) ? x : [];
  }

  function _vychoziV2() {
    return {
      version: 2,
      pribeh: { perex: '', body: '', rozhodnuti: [] },
      pravidla: { perex: '', body: '', bloky: [] },
      slovnik: { perex: '', body: '', hesla: [] }
    };
  }

  function normalizuj(raw) {
    if (!raw || typeof raw !== 'object') return _vychoziV2();
    if (Number(raw.version) === 2 && raw.pribeh && raw.pravidla && raw.slovnik) {
      const out = _vychoziV2();
      out.pribeh.perex = _text(raw.pribeh.perex);
      out.pribeh.body = _text(raw.pribeh.body);
      out.pribeh.rozhodnuti = _arr(raw.pribeh.rozhodnuti)
        .filter(r => r && typeof r === 'object')
        .map(r => {
          const titulek = _text(r.titulek || r.title);
          const text = _text(r.text);
          const id = _text(r.id);
          const condition = _text(r.condition);
          const minDay = r.minDay != null && Number.isFinite(Number(r.minDay)) ? Number(r.minDay) : null;
          const exclusiveGroup = _text(r.exclusiveGroup || r.skupina);
          /** @type {{ titulek: string, text: string, id?: string, condition?: string, minDay?: number, exclusiveGroup?: string }} */
          const o = { titulek, text };
          if (id) o.id = id;
          if (condition) o.condition = condition;
          if (minDay != null) o.minDay = minDay;
          if (exclusiveGroup) o.exclusiveGroup = exclusiveGroup;
          return o;
        })
        .filter(r => r.titulek || r.text);

      out.pravidla.perex = _text(raw.pravidla.perex);
      out.pravidla.body = _text(raw.pravidla.body);
      out.pravidla.bloky = _arr(raw.pravidla.bloky)
        .filter(b => b && typeof b === 'object')
        .map(b => ({
          title: _text(b.title || b.nadpis),
          body: _text(b.body)
        }))
        .filter(b => b.title || b.body);

      const sl = raw.slovnik && typeof raw.slovnik === 'object' ? raw.slovnik : {};
      out.slovnik.perex = _text(sl.perex || sl.intro);
      out.slovnik.body = _text(sl.body);
      const hesla = sl.hesla != null ? sl.hesla : sl.entries;
      out.slovnik.hesla = _arr(hesla)
        .filter(h => h && typeof h === 'object')
        .map(h => ({
          id: _text(h.id).replace(/\s+/g, '-') || null,
          title: _text(h.title || h.nazev),
          body: _text(h.body),
          aliases: _arr(h.aliases)
            .map(x => _text(x))
            .filter(Boolean)
        }))
        .filter(h => h.title || h.body);
      return out;
    }

    const out = _vychoziV2();
    out.slovnik.perex = _text(raw.intro);
    out.slovnik.body = '';
    out.slovnik.hesla = _arr(raw.entries)
      .filter(h => h && typeof h === 'object')
      .map(h => ({
        id: _text(h.id).replace(/\s+/g, '-') || null,
        title: _text(h.title),
        body: _text(h.body),
        aliases: _arr(h.aliases)
          .map(x => _text(x))
          .filter(Boolean)
      }))
      .filter(h => h.title || h.body);
    return out;
  }

  /** Klíče čtené z `State.uzlove` (výpočet v `State.vypoctiUzloveFlagy`). */
  const _UZLOVE_KLICE_PODMINKY = new Set(['benes_pravda', 'haas_kontakt', 'osobni_cena', 'vlcek_vztah']);

  function _hodnotaProPodminkuRozhodnuti(klic) {
    const k = String(klic || '').trim();
    if (!k) return undefined;
    if (typeof State === 'undefined' || !State.get) return undefined;
    if (_UZLOVE_KLICE_PODMINKY.has(k)) return State.get('uzlove.' + k);
    return State.get('flags.' + k);
  }

  /**
   * Jednoduchá podmínka `klíč == hodnota` z JSON (např. `benes_pravda == prijal`, `flag_rodny_list_pouzit == true`).
   * Prázdná / neznámý tvar → pravda (položka bez podmínky).
   */
  function vyhodnotPodminkuRozhodnuti(condition) {
    const c = String(condition || '').trim();
    if (!c) return true;
    const parts = c.split('==').map(x => String(x).trim());
    if (parts.length !== 2) return true;
    const [left, right] = parts;
    const val = _hodnotaProPodminkuRozhodnuti(left);
    if (right === 'true') return val === true;
    if (right === 'false') return val !== true;
    return String(val) === right;
  }

  /**
   * Položky Příběhu podle `minDay`, `condition` a `exclusiveGroup` (v rámci skupiny jen první shoda v pořadí z JSON).
   * @param {unknown} zdroj
   * @returns {Array<{ titulek: string, text: string, id?: string, condition?: string, minDay?: number, exclusiveGroup?: string }>}
   */
  function vyfiltrujPribehRozhodnuti(zdroj) {
    const arr = _arr(zdroj);
    if (!arr.length) return [];
    const den = Number(typeof State !== 'undefined' && State.get ? State.get('currentDay') : 0) || 0;
    const pouziteSkupiny = new Set();
    const out = [];
    for (const r of arr) {
      if (!r || typeof r !== 'object') continue;
      const minD = r.minDay != null && Number.isFinite(Number(r.minDay)) ? Number(r.minDay) : null;
      if (minD != null && den < minD) continue;
      if (!vyhodnotPodminkuRozhodnuti(r.condition)) continue;
      const grp = String(r.exclusiveGroup || '').trim();
      if (grp) {
        if (pouziteSkupiny.has(grp)) continue;
        pouziteSkupiny.add(grp);
      }
      out.push(r);
    }
    return out;
  }

  function nacti() {
    if (_cache) return Promise.resolve(_cache);
    if (_nacitani) return _nacitani;
    _nacitani = fetch('data/knihovna.json')
      .then(r => {
        if (!r.ok) throw new Error('knihovna fetch ' + r.status);
        return r.json();
      })
      .then(d => {
        _cache = normalizuj(d);
        _vzoryCache = null;
        _vzoryCacheKey = '';
        _vzoryBucketMap = null;
        return _cache;
      })
      .catch(() => {
        const ch = _vychoziV2();
        ch.slovnik.perex =
          'Obsah Knihovny se nepodařilo načíst. Ověřte soubor data/knihovna.json a že hra běží z kořene webu (ne přímo file://), aby fetch fungoval.';
        _cache = ch;
        _vzoryCache = null;
        _vzoryCacheKey = '';
        _vzoryBucketMap = null;
        return _cache;
      })
      .finally(() => {
        _nacitani = null;
      });
    return _nacitani;
  }

  function getData() {
    return _cache;
  }

  /**
   * Doplňkové tvary k nadpisu hesla (skloňování, hovorové tvary ve spisech).
   * Klíč = `id` hesla z JSON (po normalizaci mezer → pomlčka).
   */
  const _EXTRA_ALIASY = {
    zizkov: [
      'Žižkově',
      'na Žižkově',
      'ze Žižkova',
      'Žižkovu',
      'Žižkov',
      'žižkovský',
      'žižkovská',
      'žižkovské',
      'žižkovského',
      'žižkovskému',
      'Žižkovský',
      'Žižkovská',
      'Žižkovské',
      'Žižkovského',
      'ze žižkovského',
      'na žižkovském'
    ],
    smichov: [
      'Smíchově',
      'Smíchova',
      'ze Smíchova',
      'Smíchovu',
      'smíchovská',
      'smíchovské',
      'smíchovského',
      'smíchovskému',
      'smíchovský',
      'smíchovskou',
      'Záložna smíchovská',
      'smíchovské záložny'
    ],
    karlin: ['Karlíně', 'v Karlíně', 'Karlína', 'Karlínu', 'z Karlína'],
    holesovice: ['Holešovicích', 'v Holešovicích', 'Holešovicemi', 'z Holešovic'],
    bubenec: ['Bubeneči', 'v Bubeneči', 'Bubeneče', 'Bubenečí', 'z Bubeneče'],
    vinohrady: [
      'Vinohradech',
      've Vinohradech',
      'Vinohrad',
      'Královské Vinohrady',
      'na Vinohradech',
      'z Vinohrad'
    ],
    unetice: ['Úněticích', 'v Úněticích', 'Úněticemi', 'z Únětic'],
    horomerice: ['Horoměřicích', 'v Horoměřicích', 'Horoměřicemi', 'z Horoměřic'],
    waltrovka: ['Waltrovce', 've Waltrovce', 'z Waltrovky', 'Waltrovku'],
    orech_u_prahy: ['Ořechu', 'v Ořechu', 'z Ořechu', 'Ořech', 'Ořechu u Prahy'],
    zalozna: [
      'záložna',
      'záložny',
      'záložně',
      'záložnou',
      'Záložny',
      'Záložně',
      'Záložnou',
      'Záložna sv. Václava',
      'záložna sv. Václava'
    ],
    zharství: ['žhářství', 'žhářstvím', 'Žhářstvím'],
    statni_policie_praha: ['Státní policie', 'státní policie'],
    ministerstvo_vnitra: ['Ministerstvu vnitra', 'ministerstvu vnitra'],
    masarykovo_nadrazi: ['Masarykově nádraží', 'Masarykova nádraží'],
    obecni_dum: ['Obecním domě', 'Obecního domu', 'z Obecního domu'],
    dnsap: ['DNSAP.', 'dnsap'],
    nsdap: ['NSDAP.', 'nsdap'],
    narodni_obce_fasisticke: ['NOF', 'Národní obec fašistická'],
    hospodarska_krize: ['hospodářské krize', 'hospodářskou krizi'],
    zakon_na_ochranu_republiky: ['zákona na ochranu republiky', 'Zákona na ochranu republiky'],
    politicka_bezpecnost: ['politické bezpečnosti', 'Politické bezpečnosti'],
    cizinecke_oddeleni: ['cizineckého oddělení', 'Cizineckého oddělení'],
    pojistovna_slavia: ['Pojišťovny Slavia', 'pojišťovny Slavia', 'Slavia'],
    slogan_jeden_narod: ['Jeden národ', 'jedno právo', 'jeden národ', 'jedno právo']
  };

  let _vzoryCacheKey = '';
  let _vzoryCache = null;
  /** Mapa první znak (bez diakritiky, malé) → vzory začínající tímto znakem — zrychlení shody v dlouhých textech */
  let _vzoryBucketMap = null;

  function _minDelkaVzorce(pat) {
    const p = String(pat || '');
    if (/\s/.test(p)) return 2;
    return 4;
  }

  function _potrebujeSlovniOhrazeni(pat) {
    return !/\s/.test(String(pat || ''));
  }

  function _jeSlovniZnak(ch) {
    return ch !== '' && ch != null && /\p{L}|\p{N}/u.test(ch);
  }

  function _titulDoplnkoveVzory(title) {
    const t = String(title || '').trim();
    if (!t) return [];
    const out = [];
    const stripQ = t.replace(/^[„"\s]+/g, '').replace(/[""\s]+$/g, '').trim();
    if (stripQ && stripQ !== t) out.push(stripQ);
    const em = t.split(/\s*[—–-]\s*/);
    if (em.length > 1 && em[0].trim().length >= 4) out.push(em[0].trim());
    return out;
  }

  function _sestavVzoryProHeslo(h) {
    const id = h && h.id ? String(h.id).trim() : '';
    if (!id) return [];
    const seen = new Set();
    const vz = [];
    const push = s => {
      const x = String(s || '').trim();
      if (!x || seen.has(x)) return;
      seen.add(x);
      vz.push(x);
    };
    push(h.title);
    for (const a of h.aliases || []) push(a);
    const extra = _EXTRA_ALIASY[id];
    if (Array.isArray(extra)) for (const a of extra) push(a);
    for (const a of _titulDoplnkoveVzory(h.title)) push(a);
    return vz.map(pat => ({
      pat,
      id,
      len: pat.length,
      wordBoundary: _potrebujeSlovniOhrazeni(pat)
    }));
  }

  function _prvniZnakVzoru(pat) {
    const p = String(pat || '');
    if (!p) return '';
    const ch = p[0];
    return ch;
  }

  /** Klíč pro bucketing: první znak vzoru znormalizovaný pro rychlé párování s textem na pozici i. */
  function _bucketKlicZnaku(ch) {
    if (ch === '' || ch == null) return '\0';
    try {
      if (/\p{L}/u.test(ch)) {
        return ch
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase();
      }
    } catch (e) {
      /* starší enginy bez \p{L} */
    }
    return ch;
  }

  function _vybudujBucketMap(vzory) {
    const m = new Map();
    for (const v of vzory) {
      const bk = _bucketKlicZnaku(_prvniZnakVzoru(v.pat));
      if (!m.has(bk)) m.set(bk, []);
      m.get(bk).push(v);
    }
    return m;
  }

  function ziskejProklikoveVzory() {
    const data = _cache;
    if (!data || !data.slovnik || !Array.isArray(data.slovnik.hesla)) return [];
    const key = data.slovnik.hesla.map(h => `${h && h.id}:${h && h.title}`).join('\u001e');
    if (_vzoryCache && _vzoryCacheKey === key) return _vzoryCache;
    const flat = [];
    for (const h of data.slovnik.hesla) {
      if (!h || !h.id) continue;
      flat.push(..._sestavVzoryProHeslo(h));
    }
    flat.sort((a, b) => b.len - a.len || String(b.pat).localeCompare(String(a.pat), 'cs'));
    _vzoryCacheKey = key;
    _vzoryCache = flat;
    _vzoryBucketMap = _vybudujBucketMap(flat);
    return _vzoryCache;
  }

  function _najdiNeoverlappingShody(str, vzory, bucketMap) {
    const hits = [];
    const s = String(str == null ? '' : str);
    const slen = s.length;
    if (!slen || !vzory.length) return [];

    for (let i = 0; i < slen; i++) {
      const bk = _bucketKlicZnaku(s.charAt(i));
      const kandidati = bucketMap.get(bk);
      if (!kandidati || !kandidati.length) continue;

      for (const v of kandidati) {
        const pat = v.pat;
        const pl = pat.length;
        const minL = _minDelkaVzorce(pat);
        if (pl < minL || i + pl > slen) continue;
        const wb = v.wordBoundary;
        if (!_shodaBezDiakritiky(s.slice(i, i + pl), pat)) continue;
        if (wb) {
          const before = i > 0 ? s[i - 1] : '';
          const after = i + pl < slen ? s[i + pl] : '';
          if (_jeSlovniZnak(before) || _jeSlovniZnak(after)) continue;
        }
        hits.push({ start: i, end: i + pl, len: pl, id: v.id });
      }
    }
    hits.sort((a, b) => b.len - a.len || a.start - b.start || a.end - b.end);
    const picked = [];
    for (const h of hits) {
      if (picked.some(p => !(h.end <= p.start || h.start >= p.end))) continue;
      picked.push(h);
    }
    picked.sort((a, b) => a.start - b.start);
    return picked;
  }

  function _shodaBezDiakritiky(a, b) {
    return String(a).localeCompare(String(b), 'cs', { sensitivity: 'accent' }) === 0;
  }

  function _textNodeNaFragmentSKnh(text, vzory, bucketMap) {
    const s = String(text);
    if (!bucketMap) return null;
    const shody = _najdiNeoverlappingShody(s, vzory, bucketMap);
    if (!shody.length) return null;
    const frag = document.createDocumentFragment();
    let pos = 0;
    for (const h of shody) {
      if (h.start > pos) frag.appendChild(document.createTextNode(s.slice(pos, h.start)));
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'knihovna-link';
      btn.setAttribute('data-knihovna-id', h.id);
      btn.textContent = s.slice(h.start, h.end);
      frag.appendChild(btn);
      pos = h.end;
    }
    if (pos < s.length) frag.appendChild(document.createTextNode(s.slice(pos)));
    return frag;
  }

  /**
   * Obalí výskyty slovníkových hesel v HTML řetězci (bez úpravy uvnitř &lt;button&gt; a .clue).
   */
  function obalSlovnikemZHtml(html) {
    if (typeof document === 'undefined') return String(html || '');
    const vzory = ziskejProklikoveVzory();
    if (!vzory.length) return String(html || '');
    const host = document.createElement('div');
    host.innerHTML = String(html || '');
    obalSlovnikemVElementu(host);
    return host.innerHTML;
  }

  /**
   * Prokliky ve vloženém DOM (textové uzly mimo .clue a mimo tlačítka).
   */
  function obalSlovnikemVElementu(root) {
    if (!root || typeof document === 'undefined') return;
    if (root.nodeType === 1) {
      const el = /** @type {Element} */ (root);
      if (el.classList.contains('knihovna-wrap') || (el.closest && el.closest('.knihovna-wrap'))) {
        return;
      }
    }
    const vzory = ziskejProklikoveVzory();
    const bucketMap = _vzoryBucketMap;
    if (!vzory.length || !bucketMap) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
        const p = node.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        if (p.closest && p.closest('.clue')) return NodeFilter.FILTER_REJECT;
        if (p.closest && p.closest('button')) return NodeFilter.FILTER_REJECT;
        if (p.closest && p.closest('.case-wf-verdict-opt')) return NodeFilter.FILTER_REJECT;
        const tag = p.tagName;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA' || tag === 'CODE') {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const batch = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) batch.push(n);
    for (const tn of batch) {
      const frag = _textNodeNaFragmentSKnh(tn.nodeValue, vzory, bucketMap);
      if (frag && tn.parentNode) tn.parentNode.replaceChild(frag, tn);
    }
  }

  return {
    nacti,
    getData,
    normalizuj,
    vyfiltrujPribehRozhodnuti,
    vyhodnotPodminkuRozhodnuti,
    ziskejProklikoveVzory,
    obalSlovnikemZHtml,
    obalSlovnikemVElementu
  };
})();

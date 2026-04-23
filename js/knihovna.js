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
        .map(r => ({
          titulek: _text(r.titulek || r.title),
          text: _text(r.text)
        }))
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
          body: _text(h.body)
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
        body: _text(h.body)
      }))
      .filter(h => h.title || h.body);
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
        return _cache;
      })
      .catch(() => {
        const ch = _vychoziV2();
        ch.slovnik.perex =
          'Obsah Knihovny se nepodařilo načíst. Ověřte soubor data/knihovna.json a že hra běží z kořene webu (ne přímo file://), aby fetch fungoval.';
        _cache = ch;
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

  return { nacti, getData, normalizuj };
})();

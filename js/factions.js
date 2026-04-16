/**
 * factions.js — Systém frakcí (MOC, KAPITÁL, LID).
 * Sleduje hodnoty 3 frakcí a spouští jejich reakce při krajních hodnotách.
 */

const Factions = (() => {

  const VYCHOZI = {
    Moc: {
      nazev: 'MOC',
      reakceVysoka: { prah: 80, udalost: 'sledovani' },
      reakceNizka:  { prah: 20, udalost: 'politicky_tlak' }
    },
    Kapital: {
      nazev: 'KAPITÁL',
      reakceVysoka: { prah: 80, udalost: 'uplatky' },
      reakceNizka:  { prah: 20, udalost: 'kompromitujici_nabidka' }
    },
    Lid: {
      nazev: 'LID',
      reakceVysoka: { prah: 80, udalost: 'chvala_v_novinach' },
      reakceNizka:  { prah: 20, udalost: 'verejne_odsouzeni' }
    }
  };

  let _definice = VYCHOZI;

  function _reakceZJson(r, fallback) {
    if (!r || typeof r !== 'object') return fallback;
    const prah = Number(r.prah ?? r.threshold);
    const udalost = r.udalost ?? r.event;
    if (!Number.isFinite(prah) || !udalost) return fallback;
    return { prah, udalost: String(udalost) };
  }

  function inicializuj() {
    const data = DataLoader.ziskej('factions');
    if (data) {
      for (const frakce of data) {
        const klic = _normalizeKlic(frakce.id);
        if (klic) {
          const hi = frakce.reactions?.find(r => r.direction === 'high');
          const lo = frakce.reactions?.find(r => r.direction === 'low');
          _definice[klic] = {
            nazev: frakce.name || _definice[klic]?.nazev,
            reakceVysoka: _reakceZJson(hi, _definice[klic]?.reakceVysoka),
            reakceNizka:  _reakceZJson(lo, _definice[klic]?.reakceNizka)
          };
        }
      }
    }
  }

  function _normalizeKlic(id) {
    const MAPA = {
      moc:       'Moc',
      kapital:   'Kapital',
      obchodnici:'Kapital',
      stat:      'Moc',
      lid:       'Lid'
    };
    const k = String(id || '').toLowerCase();
    return MAPA[k] || null;
  }

  function zkontrolujReakce() {
    const frakce = State.get('factions');
    const aktivni = [];

    for (const [klic, def] of Object.entries(_definice)) {
      const hodnota = frakce[klic] ?? 50;

      if (hodnota >= def.reakceVysoka.prah) {
        aktivni.push({
          frakce: klic,
          nazev:  def.nazev,
          smer:   'vysoka',
          udalost: def.reakceVysoka.udalost
        });
      } else if (hodnota <= def.reakceNizka.prah) {
        aktivni.push({
          frakce: klic,
          nazev:  def.nazev,
          smer:   'nizka',
          udalost: def.reakceNizka.udalost
        });
      }
    }

    return aktivni;
  }

  function getNazev(klic) {
    return _definice[klic]?.nazev || klic;
  }

  function getStavPopis() {
    const frakce = State.get('factions');
    const vysledek = {};
    for (const klic of Object.keys(_definice)) {
      const h = frakce[klic] ?? 50;
      let stav;
      if (h >= 70)      stav = 'nakloněni';
      else if (h >= 40) stav = 'neutrální';
      else if (h >= 20) stav = 'nespokojeni';
      else              stav = 'nepřátelé';
      vysledek[klic] = { hodnota: h, stav, nazev: getNazev(klic) };
    }
    return vysledek;
  }

  return {
    inicializuj,
    zkontrolujReakce,
    getNazev,
    getStavPopis
  };

})();

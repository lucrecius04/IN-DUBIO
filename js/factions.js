/**
 * factions.js — Systém frakcí.
 * Sleduje hodnoty 4 frakcí a spouští jejich reakce při krajních hodnotách.
 */

const Factions = (() => {

  // Výchozí definice frakcí — přepíše je factions.json
  const VYCHOZI = {
    Stat: {
      nazev: 'Stát',
      reakceVysoka: { prah: 80, udalost: 'sledovani' },
      reakceNizka:  { prah: 20, udalost: 'politicky_tlak' }
    },
    Obchodnici: {
      nazev: 'Obchodníci',
      reakceVysoka: { prah: 80, udalost: 'uplatky' },
      reakceNizka:  { prah: 20, udalost: 'kompromitujici_nabidka' }
    },
    Lid: {
      nazev: 'Lid',
      reakceVysoka: { prah: 80, udalost: 'chvala_v_novinach' },
      reakceNizka:  { prah: 20, udalost: 'verejne_odsouzeni' }
    },
    Cirkev: {
      nazev: 'Církev',
      reakceVysoka: { prah: 80, udalost: 'verejna_podpora' },
      reakceNizka:  { prah: 20, udalost: 'moralní_odsouzeni' }
    }
  };

  let _definice = VYCHOZI;

  function inicializuj() {
    const data = DataLoader.ziskej('factions');
    if (data) {
      for (const frakce of data) {
        const klic = _normalizeKlic(frakce.id);
        if (klic) {
          _definice[klic] = {
            nazev: frakce.name,
            reakceVysoka: frakce.reactions?.find(r => r.direction === 'high') || _definice[klic]?.reakceVysoka,
            reakceNizka:  frakce.reactions?.find(r => r.direction === 'low')  || _definice[klic]?.reakceNizka
          };
        }
      }
    }
  }

  function _normalizeKlic(id) {
    const MAPA = {
      stat: 'Stat', obchodnici: 'Obchodnici', lid: 'Lid', cirkev: 'Cirkev'
    };
    return MAPA[id?.toLowerCase()] || null;
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

  // Vrátí stav frakcí jako čitelný popis pro archiv
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

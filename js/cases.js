/**
 * cases.js — Systém případů.
 * Načítání, zobrazování, průzkum, zpracování rozsudků.
 */

const Cases = (() => {

  // Aktuálně otevřené případy dne
  let _pripady = [];
  let _onRozsudekCallback = null;

  function nastavPripadyDne(ids) {
    _pripady = ids.map(id => (id == null ? null : DataLoader.ziskejPripad(id))).filter(Boolean);
  }

  function _aktZDne(den) {
    if (den <= 10) return 1;
    if (den <= 20) return 2;
    return 3;
  }

  function _pripadPatriDoAktu(c, akt) {
    const d = Number(c.day);
    if (!Number.isFinite(d)) return false;
    if (akt === 1) return d >= 1 && d <= 10;
    if (akt === 2) return d >= 11 && d <= 20;
    return d >= 21 && d <= 30;
  }

  const POVOLENE_TYPY = ['rutinni', 'moralni', 'politicky', 'osobni'];
  const _POVOLENE_SET = new Set(POVOLENE_TYPY);

  /** Záloha jen pro chybějící nebo legacy `type` v datech. */
  function _typZKategorie(c) {
    const cat = String(c.category || '').toLowerCase();
    if (cat === 'personal' || cat.includes('osobn')) return 'osobni';
    if (cat.includes('polit') || cat === 'political' || cat.includes('stat')) return 'politicky';
    if (cat.includes('moral')) return 'moralni';
    return 'rutinni';
  }

  /** Zakázané legacy hodnoty `type` → vždy rutinni (kromě vlákna Markové, viz _normalizujTyp). */
  const _TYP_LEGACY_NA_RUTINNI = new Set([
    'trestni', 'jiny', 'kriminalni', 'majetkovy', 'sousedsky'
  ]);

  /**
   * Herční typ případu — normalizace na 4 povolené hodnoty.
   * Opakování vlákna (`recurring` / `thread`) typ nemění.
   */
  function _normalizujTyp(c) {
    if (!c) return 'rutinni';
    const t = String(c.type || '').toLowerCase();
    if (_TYP_LEGACY_NA_RUTINNI.has(t)) return 'rutinni';
    if (t === 'vlakno') {
      const id = String(c.id || '').toLowerCase();
      if (c.thread === 'markova' || id.includes('markova')) return 'osobni';
      return 'rutinni';
    }
    if (_POVOLENE_SET.has(t)) return t;
    return _typZKategorie(c);
  }

  /** Shodné pravidlo jako DataLoader — pro filtr poolu podle `type`. */
  function _efektivniTyp(c) {
    return _normalizujTyp(c);
  }

  /** Barva složky / UI — výhradně z normalizovaného `type`. */
  function typProZobrazeni(pripad) {
    return _normalizujTyp(pripad);
  }

  /**
   * Typ smí do náhodného poolu jen pokud má v daný den nenulovou základní váhu (viz _vahyTypuProDen).
   */
  function _typJePovolenProDen(den, typ) {
    const d = Number(den);
    if (!Number.isFinite(d) || d < 1) return true;
    const v = _vahyTypuProDen(den);
    return (v[typ] || 0) > 0;
  }

  function _caseMeetsRequirements(c) {
    const req = c.requires;
    if (!req || typeof req !== 'object') return true;
    if (req.trust && typeof req.trust === 'object') {
      for (const [npc, min] of Object.entries(req.trust)) {
        const v = State.get('trust.' + npc);
        if (Number(v) < Number(min)) return false;
      }
    }
    if (req.factions && typeof req.factions === 'object') {
      for (const [fak, min] of Object.entries(req.factions)) {
        const v = State.get('factions.' + fak);
        if (Number(v) < Number(min)) return false;
      }
    }
    return true;
  }

  /** Základní váhy podle kalendářního dne (poměry odpovídají % v designu). */
  function _vahyTypuProDen(den) {
    const d = Number(den);
    if (!Number.isFinite(d) || d < 1) {
      return { rutinni: 1, moralni: 1, politicky: 1, osobni: 1 };
    }
    if (d <= 3) return { rutinni: 100, moralni: 0, politicky: 0, osobni: 0 };
    if (d <= 7) return { rutinni: 70, moralni: 30, politicky: 0, osobni: 0 };
    if (d <= 10) return { rutinni: 50, moralni: 35, politicky: 15, osobni: 0 };
    if (d <= 20) return { rutinni: 30, moralni: 35, politicky: 25, osobni: 10 };
    return { rutinni: 15, moralni: 30, politicky: 40, osobni: 15 };
  }

  function _vahaStavHry(typ, stav) {
    let m = 1;
    const t = stav.traits || {};
    const f = stav.factions || {};
    if (typ === 'moralni') {
      if (Number(t.Integrita) > 70) m *= 1.4;
      if (Number(t.Vina) > 70) m *= 1.25;
    }
    if (typ === 'politicky') {
      if (Number(t.Odvaha) > 70) m *= 1.35;
      if (Number(f.Stat) > 70) m *= 0.85;
      if (Number(t.Integrita) < 30) m *= 1.3;
    }
    if (typ === 'rutinni') {
      if (Number(f.Lid) < 30) m *= 1.25;
      if (Number(t.Integrita) < 30) m *= 1.15;
    }
    if (typ === 'osobni') {
      if (Number(t.Vina) > 70) m *= 1.2;
    }
    return m;
  }

  function _vyberVazenyTyp(c, zaklad, stav, den) {
    const typ = _efektivniTyp(c);
    if (!_typJePovolenProDen(den, typ)) return 0;
    const w0 = zaklad[typ] != null ? zaklad[typ] : zaklad.rutinni;
    return w0 * _vahaStavHry(typ, stav);
  }

  function _vyberNahodneId(den, slotIndex, jizVybrane, povinneIdsSet) {
    const vsechny = DataLoader.ziskej('cases');
    if (!vsechny || !vsechny.length) return null;
    const akt = _aktZDne(den);
    const stav = State.get();
    const used = State.get('usedCaseIds') || [];
    const zaklad = _vahyTypuProDen(den);
    const vylouceno = new Set(jizVybrane.filter(Boolean));
    for (const pid of povinneIdsSet) vylouceno.add(pid);

    const kandidati = [];
    for (const c of vsechny) {
      if (!c || !c.id) continue;
      if (c.recurring === true) continue;
      if (!_pripadPatriDoAktu(c, akt)) continue;
      if (used.includes(c.id)) continue;
      if (vylouceno.has(c.id)) continue;
      if (!_caseMeetsRequirements(c)) continue;
      const typ = _efektivniTyp(c);
      if (!_typJePovolenProDen(den, typ)) continue;
      const w = _vyberVazenyTyp(c, zaklad, stav, den);
      if (w > 0) kandidati.push({ id: c.id, w });
    }

    if (!kandidati.length) {
      for (const c of vsechny) {
        if (!c || !c.id) continue;
        if (c.recurring === true) continue;
        if (!_pripadPatriDoAktu(c, akt)) continue;
        if (vylouceno.has(c.id)) continue;
        if (!_caseMeetsRequirements(c)) continue;
        if (!_typJePovolenProDen(den, _efektivniTyp(c))) continue;
        kandidati.push({ id: c.id, w: 1 });
      }
    }

    if (!kandidati.length) return null;
    let sum = 0;
    for (const k of kandidati) sum += k.w;
    let r = Math.random() * sum;
    for (const k of kandidati) {
      r -= k.w;
      if (r <= 0) return k.id;
    }
    return kandidati[kandidati.length - 1].id;
  }

  /**
   * Sestaví 3 případy: `denData.cases` = seznam povinných id (pořadí, max 3), zbytek vážená náhodná.
   */
  function nastavPripadyProDen(den, denData) {
    if (!denData || !Array.isArray(denData.cases)) {
      console.log('[Cases] den', den, '— chybí pole cases, žádné případy');
      nastavPripadyDne([]);
      return;
    }
    const mandRaw = denData.cases.map(String).filter(Boolean);
    if (mandRaw.length > 3) {
      console.warn('[Cases] den', den, '— více než 3 povinné id, ořezávám:', mandRaw);
    }
    const mandKlice = mandRaw.slice(0, 3);
    const povinneSet = new Set(mandKlice);
    const ids = [];
    const povinneNacteno = [];
    const povinnePreskoceno = [];

    for (const mid of mandKlice) {
      if (ids.length >= 3) break;
      const c = DataLoader.ziskejPripad(mid);
      if (c) {
        ids.push(mid);
        povinneNacteno.push(mid);
      } else {
        povinnePreskoceno.push(mid);
        console.warn('[Cases] den', den, '— neplatné povinné id (není v datech):', mid);
      }
    }

    const nahodneVybrano = [];
    while (ids.length < 3) {
      const slot = ids.length;
      const vybrany = _vyberNahodneId(den, slot, ids, povinneSet);
      if (!vybrany) break;
      ids.push(vybrany);
      nahodneVybrano.push(vybrany);
    }

    const vahy = _vahyTypuProDen(den);
    console.log('[Cases] den', den, {
      povinneZeDne: mandKlice,
      povinneNacteno,
      povinnePreskoceno: povinnePreskoceno.length ? povinnePreskoceno : undefined,
      nahodneSloty: nahodneVybrano.length
        ? { id: nahodneVybrano, vahyDne: vahy, poznamka: 'vážený výběr z poolu (mimo recurring a used)' }
        : undefined,
      vysledneId: ids.slice()
    });

    nastavPripadyDne(ids.filter(Boolean));
  }

  function getPripady() {
    return _pripady;
  }

  function otevriPripad(index) {
    const pripad = _pripady[index];
    if (!pripad) {
      UI.zobrazStavovouZpravu('Složka není připravena. Zavřete otevřený dialog.');
      return;
    }

    const vyresene = State.get('casesResolvedToday');
    if (vyresene.includes(pripad.id)) {
      UI.zobrazPripadReadonly(pripad);
      return;
    }

    if (typProZobrazeni(pripad) === 'politicky') {
      Music.nastavKontext('tension');
    }

    UI.zobrazPripad(pripad, zpracujRozsudek);
  }

  function zpracujRozsudek(pripad, rozsudek) {
    if (!pripad || !rozsudek) return;

    const den = State.get('currentDay');

    // Použij razítko
    const typRazitka = _rozsudekNaTypRazitka(rozsudek.id);
    Desk.animujRazitko(typRazitka);

    // Aplikuj důsledky
    _aplikujDusledky(rozsudek.consequences);

    // Ulož do archivu
    State.pridejRozsudek({
      day:       den,
      caseId:    pripad.id,
      verdict:   rozsudek.text,
      caseTitle: pripad.title
    });
    State.pridejPouzityPripad(pripad.id);

    // Zkontroluj opakující se vlákna
    if (pripad.recurring === true && pripad.thread) {
      _zpracujOpakovani(pripad, rozsudek);
    }

    // Zkontroluj narrative_link
    if (pripad.narrative_link) {
      setTimeout(() => {
        Narrative.zobrazFragment(pripad.narrative_link);
      }, 2500);
    }

    // Zkontroluj krajní hodnoty rysů
    const udalosti = Traits.zkontrolujKrajniHodnoty();
    for (const udalost of udalosti) {
      if (udalost.typ === 'ending') {
        setTimeout(() => Engine.spustKonec(udalost.ending), 1500);
        return;
      }
    }

    // Zkontroluj reakce frakcí
    const reakce = Factions.zkontrolujReakce();
    if (reakce.length > 0) {
      _zpracujFrakceReakce(reakce);
    }

    // Speciální konce podle flagů a kombinací
    _zkontrolujSpeciálniKonce(pripad, rozsudek);

    // Resetuj kontextovou hudbu po rozsudku
    Music.nastavKontext('neutral');
    Music.aktualizujStopu();

    // Aktualizuj vizuál
    Desk.aktualizujVse();
    State.uloz();

    // Aktualizuj složky
    UI.aktualizujSlozky(_pripady, State.get('casesResolvedToday'));

    // Zpráva
    UI.zobrazStavovouZpravu(`Rozsudek: ${rozsudek.text}`);

    // Zkontroluj konec dne
    setTimeout(() => Engine.zkontrolujKonecDne(), 500);

    if (_onRozsudekCallback) _onRozsudekCallback(pripad, rozsudek);
  }

  function _aplikujDusledky(dusledky) {
    if (!dusledky) return;

    // Rysy
    if (dusledky.traits) {
      for (const [nazev, delta] of Object.entries(dusledky.traits)) {
        State.upravRys(nazev, delta);
      }
    }

    // Frakce
    if (dusledky.factions) {
      for (const [nazev, delta] of Object.entries(dusledky.factions)) {
        State.upravFrakci(nazev, delta);
      }
    }

    // Finance
    if (dusledky.finance && dusledky.finance !== 0) {
      State.upravFinance(dusledky.finance);
    }

    // Důvěra NPC
    if (dusledky.trust) {
      for (const [npcId, delta] of Object.entries(dusledky.trust)) {
        State.upravDuveru(npcId, delta);
      }
    }

    // Flags
    if (dusledky.flags) {
      for (const flag of dusledky.flags) {
        State.set('flags.' + flag.key, flag.value);
      }
    }
  }

  function _rozsudekNaTypRazitka(id) {
    if (id.includes('prison') || id === 'maximum' || id === 'guilty') return 'vinen';
    if (id === 'acquit' || id === 'zprostit')                         return 'zprostit';
    if (id === 'postpone' || id === 'odlozit')                        return 'odlozit';
    if (id === 'podminka')                                             return 'podminka';
    if (id === 'pokuta')                                               return 'pokuta';
    return 'odlozit';
  }

  function _zpracujOpakovani(pripad, rozsudek) {
    const thread = pripad.thread;
    if (thread === 'bozena') {
      console.log('Božena: aplikuji výsledek rozsudku pro příště');
    } else if (thread === 'hranice') {
      console.log('Hranice pozemku: výsledek rozsudku zaznamenán pro pokračování vlákna');
    }
  }

  function _zpracujFrakceReakce(reakce) {
    // Zobraz zprávy o reakcích frakcí
    for (const r of reakce) {
      const zprava = _reakceNaZpravu(r);
      if (zprava) {
        setTimeout(() => UI.zobrazStavovouZpravu(zprava), 1000);
        break; // Jedna zpráva najednou
      }
    }
  }

  function _reakceNaZpravu(reakce) {
    const ZPRAVY = {
      sledovani:              'Cítíš, že tě sledují.',
      politicky_tlak:         'Z ministerstva přišel neformální dotaz.',
      uplatky:                'Advokát čeká venku s obálkou.',
      kompromitujici_nabidka: 'Dostal jsi anonymní dopis.',
      chvala_v_novinach:      'Horáková o tobě napsala pozitivně.',
      verejne_odsouzeni:      'Na ulici tě někdo poznal. Bylo to nepříjemné.',
      verejna_podpora:        'Farář tě veřejně pochválil.',
      moralni_odsouzeni:      'Církev vydala prohlášení.',
      moralní_odsouzeni:      'Církev vydala prohlášení.'
    };
    return ZPRAVY[reakce.udalost] || null;
  }

  function _zkontrolujSpeciálniKonce(pripad, rozsudek) {
    const stav = State.get();
    const den  = stav.currentDay;

    // Konec ATENTÁT: Haas odsouzen + Stát pod 20 + den >= 25
    if (stav.flags.haas_odsouzen && stav.factions.Stat <= 20 && den >= 25) {
      setTimeout(() => Engine.spustKonec('atentát'), 3000);
      return;
    }

    // Konec ODVOLÁNÍ: Integrita pod 20 + Moudrost pod 30 + den >= 20
    if (stav.traits.Integrita <= 20 && stav.traits.Moudrost <= 30 && den >= 20) {
      setTimeout(() => Engine.spustKonec('odvolani'), 3000);
      return;
    }

    // Konec HRDINA: Beneš pravda uznána + Haas odsouzen + den 30
    if (den >= 30 && stav.flags.benes_pravda_uzana && stav.flags.haas_odsouzen) {
      setTimeout(() => Engine.spustKonec('hrdina'), 2000);
      return;
    }

    // Konec KORUPCE: Integrita <= 10 (ze Traits.zkontrolujKrajniHodnoty)
    // → řeší se již výše přes Traits
  }

  function setOnRozsudek(callback) {
    _onRozsudekCallback = callback;
  }

  return {
    nastavPripadyDne,
    nastavPripadyProDen,
    getPripady,
    otevriPripad,
    zpracujRozsudek,
    setOnRozsudek,
    typProZobrazeni
  };

})();

/**
 * cases.js — Systém případů.
 * Načítání, zobrazování, průzkum, zpracování rozsudků.
 */

const Cases = (() => {

  // Aktuálně otevřené případy dne
  let _pripady = [];
  let _onRozsudekCallback = null;

  function nastavPripadyDne(ids) {
    _pripady = ids.map(id => DataLoader.ziskejPripad(id)).filter(Boolean);
  }

  function getPripady() {
    return _pripady;
  }

  function otevriPripad(index) {
    const pripad = _pripady[index];
    if (!pripad) return;

    const vyresene = State.get('casesResolvedToday');
    if (vyresene.includes(pripad.id)) {
      UI.zobrazPripadReadonly(pripad);
      return;
    }

    // Politický případ = napínavá hudba
    const politickeKategorie = ['politický', 'politicky', 'political', 'státní', 'statni'];
    if (politickeKategorie.includes((pripad.category || '').toLowerCase())) {
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

    // Zkontroluj opakující se vlákna
    if (pripad.repeating_thread) {
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
    // Specifická logika pro opakující se vlákna
    const thread = pripad.repeating_thread;
    if (thread === 'bozena') {
      // Slepice Božena — každý rozsudek přidá vrstvu
      console.log('Božena: aplikuji výsledek rozsudku pro příště');
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
    getPripady,
    otevriPripad,
    zpracujRozsudek,
    setOnRozsudek
  };

})();

/**
 * engine.js — Herní smyčka. Řídí tok dní a fází.
 * Spouští den, přechází fázemi, kontroluje konce hry.
 */

const Engine = (() => {

  let _denData = null;

  function _vyhodnotTydenniBonusyKody() {
    const st = State.get('tydenni_statistiky');
    if (!st || typeof st !== 'object') return [];
    const pc = Math.max(1, Number(st.pripady_celkem) || 0);
    const psp = Number(st.pripady_s_prurzkumem) || 0;
    const earned = [];
    if (psp / pc >= 0.75) earned.push('A');
    if (st.uplatek_prijat !== true) earned.push('B');
    if ((Number(st.pripady_celkem) || 0) >= 1 && (Number(st.pripady_odlozeny) || 0) === 0) earned.push('C');
    const vs = Array.isArray(st.verdikty_smer) ? st.verdikty_smer : [];
    const tough = vs.filter(x => x && x.tough).length;
    const fair = vs.filter(x => x && x.fair).length;
    const allSurvey = vs.length >= 5 && vs.every(x => x && x.pruzkum);
    if (tough >= 5) earned.push('D_stat');
    else if (fair >= 5) earned.push('D_lid');
    else if (allSurvey) earned.push('D_mul');
    if ((Number(st.tezke_rozsudky) || 0) >= 3) earned.push('E');
    return earned;
  }

  function _sestavTydenniShrnutiPayload(kody) {
    const n = kody.length;
    let hlavni;
    if (n === 0) {
      hlavni = 'Týden končí. Lavice mlčí — žádný z tichých vzorců se neprojevil natolik, aby sis toho všiml odměnou.';
    } else if (n === 1) {
      hlavni = 'Linie týdne se vyjasnila — jeden vzorec převážil. Zbytek byl jen práce.';
    } else if (n === 2) {
      hlavni = 'Dva principy vedle sebe — ani jeden nepřekřičel druhého. Týden byl vyrovnaný.';
    } else if (n === 3) {
      hlavni = 'Víc cest najednou — a přesto z toho nebyl chaos. Jen hustší papír a tišší kroky.';
    } else {
      hlavni = 'Komplexní týden. Nic oslavného na povrchu — jen stopy, které si systém zapamatuje jemněji než ty.';
    }

    const J = {
      A: 'Spisy nebyly jen papír — četl jsi je, jako by na nich záleželo někomu, koho znáš.',
      B: 'Vaše nezávislost se probírá v kavárnách.',
      C: 'Žádné odložení — týden plynul dál bez zadrhnutí v šuplíku.',
      D_stat: 'Stát si tě zapisuje mezi ty, kdo neuhnou, když se tlačí zhora.',
      D_lid: 'Chudina si vaše jméno pamatuje.',
      D_mul: 'Každý větší verdikt měl svůj stín v průzkumu — a ty sis ho nenechal ujít.',
      E: 'Několik rozsudků tě stálo víc než inkoust; tělo to ještě cítíš v klidu sobotní noci.'
    };
    const jemneRadky = kody.map(k => J[k] || k).filter(Boolean);

    return {
      titulek: 'Konec pracovního týdne',
      hlavni,
      jemneRadky
    };
  }

  function _aplikujTydenniBonusyPoModalu(kody) {
    State.set('tydenni_nasobek_moudrosti', 1);
    for (const k of kody) {
      if (k === 'A') {
        State.upravRys('Moudrost', 5);
        State.oznacFragment('fragment_tyden_bonus_a');
      } else if (k === 'B') {
        State.upravRys('Integrita', 5);
        State.upravFrakci('Lid', 8);
        State.oznacFragment('fragment_tyden_bonus_b');
      } else if (k === 'C') {
        State.upravRys('Odvaha', 3);
        State.oznacFragment('fragment_tyden_bonus_c');
      } else if (k === 'D_stat') {
        State.upravFrakci('Moc', 10);
        State.oznacFragment('fragment_tyden_bonus_d');
      } else if (k === 'D_lid') {
        State.upravFrakci('Lid', 10);
        State.oznacFragment('fragment_tyden_bonus_d');
      } else if (k === 'D_mul') {
        State.set('tydenni_nasobek_moudrosti', 1.5);
        State.oznacFragment('fragment_tyden_bonus_d');
      } else if (k === 'E') {
        State.upravRys('Odvaha', 5);
        State.oznacFragment('fragment_tyden_bonus_e');
      }
    }
  }

  function _fragmentyProTydenniBonusy(kody) {
    const map = {
      A: 'fragment_tyden_bonus_a',
      B: 'fragment_tyden_bonus_b',
      C: 'fragment_tyden_bonus_c',
      D_stat: 'fragment_tyden_bonus_d',
      D_lid: 'fragment_tyden_bonus_d',
      D_mul: 'fragment_tyden_bonus_d',
      E: 'fragment_tyden_bonus_e'
    };
    const out = [];
    const seen = new Set();
    for (const k of kody) {
      const id = map[k];
      if (id && !seen.has(id)) {
        seen.add(id);
        out.push(id);
      }
    }
    return out;
  }

  // --- INICIALIZACE ---

  async function inicializuj() {
    // Načti data
    await DataLoader.nactiVse();

    // Inicializuj moduly
    Traits.inicializuj();
    Factions.inicializuj();
    Characters.inicializuj();

    // Načti uloženou hru nebo začni novou
    const ulozeno = State.nacti();
    if (!ulozeno) {
      State.reset();
    }

    // Nastav UI listenery
    UI.inicializuj();
    Desk.inicializujTooltipyRysu();
    Desk.inicializujTooltipyPredmetuStolu();

    // Tlačítko Další den
    document.getElementById('btn-dalsi-den')?.addEventListener('click', () => {
      _dalsiDen();
    });

    // Složky — click handlers
    for (let i = 0; i < 3; i++) {
      const slozka = document.getElementById('slozka-' + (i + 1));
      slozka?.addEventListener('click', () => Cases.otevriPripad(i));
    }

    // Spusť aktuální den
    await spustDen();
  }

  // --- DEN ---

  async function spustDen() {
    const den = State.get('currentDay');

    // Konec hry po 30 dnech
    if (den > 30) {
      spustKonec('preziti');
      return;
    }

    // Neděle — nový pracovní týden: vynulovat týdenní statistiky (násobek Moudrosti řeší sobota večer)
    if (den % 7 === 0) {
      State.resetTydenniStatistikyNedele();
    }

    // Pondělí — důsledky nedělní volby (investigace)
    if (den % 7 === 1) {
      const v = State.get('nedele_volba');
      if (v === 'A' || v === 'D') {
        State.set('investigationActionsLeft', 3);
      }
    }

    // Načti denní data
    _denData = DataLoader.ziskejDen(den);

    // Aktualizuj vizuál stolu
    State.set('phase', 'morning');
    Desk.aktualizujVse();
    Music.aktualizujStopu();

    // Aktualizuj noviny
    if (_denData) Narrative.aktualizujNoviny(_denData);

    // Nastav případy dne PŘED dialogy — složky musí být aktivní hned po zavření overlaye
    Cases.nastavPripadyProDen(den, _denData);
    const pripady = Cases.getPripady();
    UI.aktualizujSlozky(pripady, State.get('casesResolvedToday'));
    Desk.nastavAktivniSpis(null);

    // Ekonomika ráno: buff lékaře, Karas, výplata, varování, dluh > 100, krize 23. března
    Finance.aplikujLekarskyBuffRano();
    Finance.tickKarasDluh();
    if (Finance.aplikujNedelniVyplatu(den)) {
      await _cekejNaFragment('fragment_vyplata');
    }
    Finance.zaznamenejBankrotAVarovani();
    if (Finance.getDluh() > 100 && !State.get('flags.dluh_pribeh_spusten')) {
      State.set('flags.dluh_pribeh_spusten', true);
      await _cekejNaFragment('fragment_ekonomika_dluh_krize');
    }
    if (den === 23 && !State.get('flags.haas_nabidka_den23_vyresena')) {
      await _cekejNaDen23Modal();
    }
    Finance.zkontrolujCilOperace();
    Desk.aktualizujVse();

    // Ranní fragment (den 8 — dopis o operaci jen jednou)
    let morningId = _denData?.morning_fragment;
    if (den === 8 && State.get('flags.dopis_operace_den8_viden')) {
      morningId = null;
    }
    if (morningId) {
      await _cekejNaFragment(morningId);
      if (den === 8) {
        State.set('flags.dopis_operace_den8_viden', true);
        State.uloz();
      }
    }

    // Dialogy postav pro tento den
    await _zpracujDialogyDne(den);

    // Nedělní volba (bez případů — samostatný krok před pokračováním dne)
    if (_denData?.nedelni_volba) {
      await new Promise(resolve => {
        UI.zobrazNedelniVolbu(_denData, () => {
          Desk.aktualizujVse();
          State.uloz();
          resolve();
        });
      });
    }

    State.set('phase', 'forenoon');
    Desk.aktualizujVse();

    // Vlčkův dopis
    if (_denData?.vlcek_letter) {
      Desk.zobrazVlcekDopis(true);
      Desk.zobrazSuplikIndikator(true);
    } else {
      Desk.zobrazVlcekDopis(false);
    }

    // Skrýt tlačítko do vyřešení případů; po F5 / resume znovu sladit s uloženým casesResolvedToday
    UI.zobrazBtnDalsiDen(false);
    zkontrolujKonecDne();
  }

  /**
   * Zarovná runtime s právě načteným State (menu „Načíst hru“ bez reloadu).
   *
   * Follow-up (zatím neřešeno): po F5 stále proběhne celý `spustDen` včetně dialogů —
   * může duplikovat archivní záznamy; idempotentní resume by vyžadovalo flag v State nebo
   * sloučení části uložení s výchozím stavem při `State.nacti()`.
   */
  function syncFromSavedState() {
    const den = State.get('currentDay');
    if (den > 30) {
      Desk.aktualizujVse();
      Music.aktualizujStopu();
      return;
    }

    _denData = DataLoader.ziskejDen(den);
    Cases.nastavPripadyProDen(den, _denData);
    const pripady = Cases.getPripady();
    UI.aktualizujSlozky(pripady, State.get('casesResolvedToday'));
    Desk.nastavAktivniSpis(null);

    if (_denData) Narrative.aktualizujNoviny(_denData);

    if (_denData?.vlcek_letter) {
      Desk.zobrazVlcekDopis(true);
      Desk.zobrazSuplikIndikator(true);
    } else {
      Desk.zobrazVlcekDopis(false);
      Desk.zobrazSuplikIndikator(false);
    }

    Desk.aktualizujVse();
    Music.aktualizujStopu();
    zkontrolujKonecDne();
  }

  function zkontrolujKonecDne() {
    const vyresene = State.get('casesResolvedToday');
    const pripadyNactene = Cases.getPripady();
    const vsechnyIds = pripadyNactene.map(p => p && p.id).filter(Boolean);

    // Žádné případy → umožni přejít hned
    if (vsechnyIds.length === 0) {
      State.set('phase', 'evening');
      Desk.aktualizujVse();
      UI.zobrazBtnDalsiDen(true);
      return;
    }

    // Všechny případy vyřešeny → zobraz tlačítko Další den
    const vsechnyVyreseny = vsechnyIds.every(id => vyresene.includes(id));
    if (vsechnyVyreseny) {
      State.set('phase', 'evening');
      Desk.aktualizujVse();
      UI.zobrazStavovouZpravu('Dnešní případy jsou uzavřeny.');
      setTimeout(() => UI.zobrazBtnDalsiDen(true), 800);
    }
  }

  async function _dalsiDen() {
    UI.zobrazBtnDalsiDen(false);

    // Večerní volba
    if (_denData?.evening_choice) {
      await _cekejNaVecerniVolbu(_denData);
    }

    // Večerní fragment (např. reflexe v neděli)
    if (_denData?.evening_fragment) {
      State.set('phase', 'evening');
      Desk.aktualizujVse();
      Music.aktualizujStopu();
      await _cekejNaFragment(_denData.evening_fragment);
    }

    // Noční fragment
    if (_denData?.night_fragment) {
      State.set('phase', 'night');
      Desk.aktualizujVse();
      Music.aktualizujStopu();
      await _cekejNaFragment(_denData.night_fragment);
    }

    // Sobota večer — shrnutí týdne a tiché bonusy před přechodem na neděli
    const denS = Number(State.get('currentDay'));
    if (Number.isFinite(denS) && denS % 7 === 6) {
      const kody = _vyhodnotTydenniBonusyKody();
      const payload = _sestavTydenniShrnutiPayload(kody);
      await new Promise(resolve => {
        UI.zobrazTydenniShrnuti(payload, () => {
          _aplikujTydenniBonusyPoModalu(kody);
          State.uloz();
          resolve();
        });
      });
      for (const fid of _fragmentyProTydenniBonusy(kody)) {
        await _cekejNaFragment(fid);
      }
    }

    // Přechod dne — vizuální stmívání
    const stul = document.getElementById('stul');
    stul?.classList.add('prechod-dne');
    await _cekej(1600);
    stul?.classList.remove('prechod-dne');

    // Posun na další den
    State.dalsiDen();
    State.uloz();

    await spustDen();
  }

  // --- DIALOGY POSTAV ---

  async function _zpracujDialogyDne(den) {
    const dialogy = Characters.getDialogyDen(den);
    for (const { id, dialog } of dialogy) {
      State.oznacPostavuPotkanu(id);
      const souhrn = Characters.getHistorieRadkaTitulek(id, dialog.type);
      State.zalogujNpcSetkani(id, den, souhrn, dialog.text || '');
      State.zapisNpcPosledniDialog(id, den, dialog.text || '');
      // Dialogy se zobrazí jako fragmenty
      await _cekejNaFragment(null, {
        type:  dialog.type === 'letter' ? 'letter' : 'letter',
        title: Characters.getNazev(id),
        text:  dialog.text
      });
    }
  }

  // --- HAASOVA OBÁLKA ---

  function otevriHaasovuObalku() {
    if (State.get('flags.haas_envelope_opened')) return;

    const den = State.get('currentDay');
    if (den < 8) {
      UI.zobrazStavovouZpravu('Obálka přišla den 8.');
      return;
    }

    State.set('flags.haas_envelope_opened', true);
    State.upravRys('Vina', +5);

    const denHaas = State.get('currentDay');
    const fragment = DataLoader.ziskejFragment('haas_obalka');
    const haasText = fragment?.text ||
      'Vážený pane doktore,\n\nDovolujeme si Vás informovat, že náš klient pan průmyslník Haas přiložil k tomuto dopisu výraz své úcty ve výši 800 Kč.\n\nVěříme, že budete jeho záležitostem věnovat patřičnou pozornost.\n\nS uctivým pozdravem,\nJUDr. Haas & synové, advokátní kancelář';
    State.zalogujNpcSetkani('haas', denHaas, 'Obálka od advokáta (Haas)', haasText);
    State.zapisNpcPosledniDialog('haas', denHaas, haasText);

    // Najdi fragment obálky
    if (fragment) {
      UI.zobrazFragment(fragment, () => {});
    } else {
      UI.zobrazFragment({
        type:  'letter',
        title: 'Obálka od Haasova advokáta',
        text:  haasText
      }, () => {});
    }

    State.uloz();
    UI.zavriModal('modal-archiv');
  }

  // --- VLČKŮV DOPIS ---

  function otevriVlcekuvDopis() {
    if (!_denData?.vlcek_letter) return;

    const fragment = DataLoader.ziskejFragment(_denData.vlcek_letter);
    const obsah = fragment || {
      type:  'letter',
      title: 'Dopis od ministra Vlčka',
      text:  _denData.vlcek_letter_text || '„Věřím, že jste muž který rozumí nutnosti kompromisů, pane doktore."'
    };

    const denV = State.get('currentDay');
    State.zalogujNpcSetkani('vlcek', denV, 'Dopis od Vlčka', obsah.text || '');
    State.zapisNpcPosledniDialog('vlcek', denV, obsah.text || '');

    UI.zobrazFragment(obsah, () => {
      Desk.zobrazVlcekDopis(false);
      Desk.zobrazSuplikIndikator(false);
    });

    // Zmačkání dopisu (dříve −Maska) — tíha viny
    State.upravRys('Vina', 3);
    State.uloz();
  }

  // --- KONEC HRY ---

  function spustKonec(typ) {
    State.set('gameOver', true);
    State.set('endingType', typ);
    State.uloz();
    Music.nastavStopu('epilog');

    const epilog = _sestavEpilog(typ);
    UI.zobrazKonecHry(typ, epilog);
  }

  function _sestavEpilog(typ) {
    const stav = State.get();
    const radky = [];

    // Radky pro každou postavu — ze State a flags
    const postavyEpilog = {
      vlcek:     _epilogVlcek(typ, stav),
      horakova:  _epilogHorakova(typ, stav),
      masek:     _epilogMasek(typ, stav),
      benes:     _epilogBenes(typ, stav),
      novak:     _epilogNovak(typ, stav)
    };

    for (const [id, text] of Object.entries(postavyEpilog)) {
      if (text) {
        radky.push({
          postava: id === 'novak' ? null : Characters.getNazev(id),
          text,
          klic: id === 'novak'
        });
      }
    }

    return radky;
  }

  function _epilogVlcek(typ, stav) {
    if (typ === 'hrdina') return 'Byl odvolán z funkce. Řízení bylo zastaveno po dvou týdnech.';
    if (typ === 'korupce') return 'Nadále slouží republice. Novákův případ nikdy nezmínil.';
    return 'Zůstal na místě. Jako vždy.';
  }

  function _epilogHorakova(typ, stav) {
    const trust = stav.trust.horakova;
    if (typ === 'hrdina')        return 'Vydala sérii článků. Tři novináři přišli o práci kvůli ní. Pokračovala.';
    if (trust >= 2)              return 'Napsala o Novákovi. Ne o případu — o člověku.';
    return 'Sledovala případ z dálky. Psala o jiných věcech.';
  }

  function _epilogMasek(typ, stav) {
    if (typ === 'korupce') return 'Přivítal Nováka mezi svými. Nikdy o tom nemluvili.';
    return 'Odešel do penze o rok dříve. Bez rozloučení.';
  }

  function _epilogBenes(typ, stav) {
    const identified = stav.flags.benes_identified;
    if (identified && typ === 'hrdina') return 'Přišel na pohřeb. Nestál blízko. Ale byl tam.';
    if (identified) return 'Odešel tiše. Nikdo nevěděl, kdo byl.';
    return 'Starý muž. Novák nikdy nezjistil, kdo byl.';
  }

  function _epilogNovak(typ, stav) {
    const endingTexty = {
      odvolani: 'Dr. Karel Novák byl odvolán z funkce. Kariéra skončila. Přestěhoval se na venkov.',
      korupce:  'Dr. Karel Novák se stal součástí systému. Přesně tak, jak se bál.',
      atentát:  'Dr. Karel Novák zemřel 28. března 1931. Příčina nebyla nikdy plně objasněna.',
      preziti:  'Dr. Karel Novák přežil třicet dní. Věděl, co za to zaplatil.',
      hrdina:   'Dr. Karel Novák přežil. A věděl — napravit minulost správnými rozhodnutími nejde. Ale žít s ní — to ano.'
    };
    return endingTexty[typ] || 'Dr. Karel Novák. 1931.';
  }

  // --- HELPERS ---

  function _cekejNaFragment(id, inlineFragment) {
    return new Promise(resolve => {
      if (inlineFragment) {
        UI.zobrazFragment(inlineFragment, resolve);
      } else if (id) {
        Narrative.zobrazFragment(id, resolve);
      } else {
        resolve();
      }
    });
  }

  function _cekejNaVecerniVolbu(denData) {
    return new Promise(resolve => {
      UI.zobrazVecerniVolbu(denData, (moznost) => {
        UI.aplikujVecerniNeboNedelniMoznost(moznost);
        Desk.aktualizujVse();
        resolve();
      });
    });
  }

  function _cekejNaDen23Modal() {
    return new Promise(resolve => {
      UI.zobrazModalDen23Krize(() => resolve());
    });
  }

  function _cekej(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // --- SPUŠTĚNÍ ---

  document.addEventListener('DOMContentLoaded', () => {
    _inicializujUvod();
  });

  function _inicializujUvod() {
    const overlay = document.getElementById('uvod-overlay');
    if (!overlay) { inicializuj(); return; }

    const zpravaEl = document.getElementById('uvod-ulozena-zprava');
    if (zpravaEl) {
      const ra = State.peekAutosave();
      const r1 = State.peekUlozene(1);
      const r2 = State.peekUlozene(2);
      if (ra || r1 || r2) {
        const ta = ra ? 'den ' + ra.currentDay : '—';
        const t1 = r1 ? 'den ' + r1.currentDay : 'prázdná';
        const t2 = r2 ? 'den ' + r2.currentDay : 'prázdná';
        zpravaEl.textContent =
          'Automatické uložení: ' + ta + ' · záloha 1: ' + t1 + ' · záloha 2: ' + t2;
      }
    }

    overlay.addEventListener('click', () => {
      Music.spustPoInterakci();
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.style.display = 'none';
        inicializuj();
      }, 1500);
    });
  }

  return {
    spustDen,
    syncFromSavedState,
    zkontrolujKonecDne,
    spustKonec,
    otevriHaasovuObalku,
    otevriVlcekuvDopis
  };

})();

/**
 * engine.js — Herní smyčka. Řídí tok dní a fází.
 * Spouští den, přechází fázemi, kontroluje konce hry.
 */

const Engine = (() => {

  let _denData = null;

  /**
   * Den 1: při `false` proběhne ranní fragment (`days.json` → `morning_fragment`) a běžná logika dopisů.
   * Dopis Vlčka v den 1 je v `letters.json` (delivery `desk`) — není duplicitně v `characters.json` jako dialog.
   */
  const _SKIP_D1_INTRO_MODALS = false;

  /**
   * Akce průzkumu (inkoust) na každý pracovní den s alespoň jedním případem.
   * Ostré nastavení: 3. Změnit sem + state.js resetDen() + VYCHOZI_STAV najednou.
   */
  const _INVESTIGATION_ACTIONS_BASE_DEN_S_PRIPADY = 3;

  /** První `spustDen` v relaci: zatemnění stolu do rozsvícení po přípravě (ne každé ráno). */
  let _stulPripravaMaRozsvitit = true;
  /** Po kliknutí „Další den“: rozednění až po dokončení `_pokracujSpustDen` (nebo fallback při game over). */
  let _rozdeniPoPrepnuDne = false;

  function _vyhodnotTydenniBonusyKody() {
    const st = State.get('tydenni_statistiky');
    if (!st || typeof st !== 'object') return [];
    const pc = Math.max(1, Number(st.pripady_celkem) || 0);
    const psp = Number(st.pripady_s_prurzkumem) || 0;
    const earned = [];
    // 15denní verze: jen „Pečlivý“ a „Nezávislý“ (MIGRACE_20-15)
    if (psp / pc >= 0.75) earned.push('A');
    if (st.uplatek_prijat !== true) earned.push('B');
    return earned;
  }

  function _sestavTydenniShrnutiPayload(kody) {
    const n = kody.length;
    const ramec =
      'Sobota večer. Budova soudu utichla a Ben si v kanceláři ještě jednou srovnal, co se během týdne stalo.\n\n';
    let hlavni;
    if (n === 0) {
      hlavni =
        'Týden nepřinesl žádný zvláštní zlom. Ben uzavřel spisy, splnil úřední povinnosti a zůstaly po něm hlavně poznámky, podpisy a únava.';
    } else if (n === 1) {
      hlavni = 'Z celého týdne vystoupila jedna věc, kterou si Ben potřeboval poznamenat. Nebyla jediná důležitá, ale vracela se mu v hlavě častěji než ostatní.';
    } else if (n === 2) {
      hlavni = 'Týden po sobě zanechal dvě výrazné stopy. Ben je zapsal vedle sebe, protože ani jedna nepůsobila jako drobnost, kterou by bylo možné přejít.';
    } else if (n === 3) {
      hlavni = 'Týden byl náročnější, než naznačoval rozvrh jednání. Ben si na konci dne zapsal několik věcí, které podle něj mohou mít význam i později.';
    } else {
      hlavni = 'Týden přinesl víc podstatných událostí najednou. Ben je nezjednodušoval do jedné věty a raději si je zaznamenal odděleně.';
    }

    const J = {
      A:
        'Ben se u většiny spisů opíral o průzkum a nespokojil se s rychlým přečtením základních podkladů.',
      B:
        'Ben během týdne nepřijal úplatek a nenechal si zaplatit za mlčení ani za pohodlnější rozhodnutí.',
      C: 'Ben během týdne neodkládal rozhodnutí a nenechal žádný spis ležet stranou jen proto, že byl nepříjemný.',
      D_stat: 'Benovy rozsudky během týdne výrazně posílily pozici státní moci a ministerstvo si toho mohlo všimnout.',
      D_lid: 'Benovy rozsudky během týdne častěji vycházely vstříc lidem mimo úřady a vlivné kanceláře.',
      D_mul:
        'Ben věnoval pozornost i těžším verdiktům a nenechal je projít jen jako další položky v pořadí.',
      E: 'Ben vynesl několik tvrdších rozsudků a jejich dopad na sobě cítil ještě po skončení pracovního týdne.'
    };
    const jemneRadky = _radkyZTydennichStatistik().concat(kody.map(k => J[k] || k).filter(Boolean));

    return {
      titulek: 'Konec pracovního týdne',
      hlavni: ramec + hlavni,
      jemneRadky
    };
  }

  /** Krátké věty z týdenních statistik (tvrdé tresty, průzkum, úplatek). */
  function _radkyZTydennichStatistik() {
    const t = State.get('tydenni_statistiky');
    if (!t || typeof t !== 'object') return [];
    const radky = [];
    const vs = Array.isArray(t.verdikty_smer) ? t.verdikty_smer : [];
    let tvrdy = 0;
    let sPruzkum = 0;
    for (const v of vs) {
      if (v && v.tough) tvrdy++;
      if (v && v.pruzkum) sPruzkum++;
    }
    const pc = Number(t.pripady_celkem) || 0;
    if (tvrdy > 0) {
      const sklon =
        tvrdy === 1 ? 'tvrdý trest' : tvrdy >= 5 ? 'tvrdých trestů' : 'tvrdé tresty';
      radky.push(`Tento týden ${tvrdy}× ${sklon}.`);
    }
    if (pc > 0 && sPruzkum > 0) {
      radky.push(`U ${sPruzkum} z ${pc} spisů jste sáhl po průzkumu.`);
    }
    if (t.uplatek_prijat === true) {
      radky.push('Úplatek tento týden vám zůstane v paměti déle než kterýkoli výrok.');
    }
    const k = State.get('kampan_statistiky');
    if (k && typeof k === 'object') {
      const kC = Number(k.pripady_celkem) || 0;
      const kTv = Number(k.verdikty_tvrdy) || 0;
      if (kC >= 8 && kTv > 0) {
        const pct = Math.round((kTv / kC) * 100);
        if (pct >= 40) {
          radky.push(`Za kampaň už ${kTv} tvrdých rozsudků — soudní síň vás poznává jako přísného.`);
        }
      }
    }
    return radky;
  }

  function _aplikujTydenniBonusyPoModalu(kody) {
    const denT = Number(State.get('currentDay')) || 1;
    State.set('tydenni_nasobek_moudrosti', 1);
    for (const k of kody) {
      if (k === 'A') {
        State.upravRys('Moudrost', 5);
        State.oznacFragment({ id: 'fragment_tyden_bonus_a', day: denT });
      } else if (k === 'B') {
        if ((Number(State.get('traits.Integrita')) || 0) < 80) {
          State.upravRys('Integrita', 3);
        }
        State.upravFrakci('Lid', 8);
        State.oznacFragment({ id: 'fragment_tyden_bonus_b', day: denT });
      } else if (k === 'C') {
        State.upravRys('Odvaha', 3);
        State.oznacFragment({ id: 'fragment_tyden_bonus_c', day: denT });
      } else if (k === 'D_stat') {
        State.upravFrakci('Moc', 10);
        State.oznacFragment({ id: 'fragment_tyden_bonus_d', day: denT });
      } else if (k === 'D_lid') {
        State.upravFrakci('Lid', 10);
        State.oznacFragment({ id: 'fragment_tyden_bonus_d', day: denT });
      } else if (k === 'D_mul') {
        State.set('tydenni_nasobek_moudrosti', 1.5);
        State.oznacFragment({ id: 'fragment_tyden_bonus_d', day: denT });
      } else if (k === 'E') {
        State.upravRys('Odvaha', 5);
        State.oznacFragment({ id: 'fragment_tyden_bonus_e', day: denT });
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
    if (_stulPripravaMaRozsvitit && typeof UI !== 'undefined' && UI.zobrazZatemneniPripravyStolu) {
      UI.zobrazZatemneniPripravyStolu();
    }
    // Načti data
    await DataLoader.nactiVse();

    if (typeof Knihovna !== 'undefined' && Knihovna.nacti) {
      try {
        await Knihovna.nacti();
      } catch (e) {
        console.warn('[Engine] Knihovna.nacti:', e);
      }
    }

    if (typeof DataLoader.jeHernaDataOK === 'function' && !DataLoader.jeHernaDataOK()) {
      const msg =
        'Herní data se nenačetla (days.json / případy). Otevření přes file:// často fetch blokuje.\n\n' +
        'Stránku je potřeba spustit přes HTTP z kořene projektu, např.:\n' +
        '  npx --yes serve .\n' +
        'nebo:  python -m http.server\n' +
        'Potom je možné v prohlížeči otevřít zobrazenou URL.';
      console.error('[Engine]', msg);
      const el = document.getElementById('stavova-zprava');
      if (el) {
        el.textContent = msg;
        el.classList.add('viditelna');
        el.style.whiteSpace = 'pre-wrap';
        el.style.maxWidth = 'min(92vw, 640px)';
        el.style.fontSize = '11px';
        el.style.lineHeight = '1.45';
      }
    }

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
    if (typeof Tutorial !== 'undefined' && Tutorial.inicializuj) Tutorial.inicializuj();
    Desk.inicializujTooltipyRysu();
    Desk.inicializujTooltipyPredmetuStolu();
    if (Desk.inicializujNovinyAObaalkaStolu) Desk.inicializujNovinyAObaalkaStolu();

    // Tlačítko Další den (SFX až po kontrole — nepřehrávat zvuk při blokaci)
    document.getElementById('btn-dalsi-den')?.addEventListener('click', () => {
      _dalsiDen();
    });

    // Složky — capture; klik jen na neprůhledný pixel PNG (viz desk-slozka-pixel-hover.js → _slozkaRasterHitTest)
    for (let i = 0; i < 3; i++) {
      const slozka = document.getElementById('slozka-' + (i + 1));
      if (!slozka) continue;
      const folder = slozka.querySelector('.folder');
      if (!folder) continue;
      const onSlozkaClick = (event) => {
        if (slozka.classList.contains('slozka--ceka')) return;
        if (slozka.classList.contains('slozka--tutorial-locked')) return;
        const folderEl = slozka.querySelector('.folder');
        if (!folderEl) return;
        const ht = folderEl._slozkaRasterHitTest;
        if (typeof ht !== 'function' || !ht(event.clientX, event.clientY)) return;
        Cases.otevriPripad(i);
      };
      folder.addEventListener('click', onSlozkaClick, true);
    }

    // Spusť aktuální den
    await spustDen();
  }

  // --- DEN ---

  /** Dva dny po úplatku: tíha svědomí (−3 INT, −2 Naděje) — rozložený dopad místo jednorázového propadu. */
  function _aplikujRanniTihyUplatku() {
    const zbyva = Number(State.get('flags.uplatek_tihy_zbyva')) || 0;
    if (zbyva < 1) return;
    State.upravRys('Integrita', -3);
    State.upravRys('Nadeje', -2);
    State.set('flags.uplatek_tihy_zbyva', zbyva - 1);
  }

  /** Dopady dokončené adventure scény (sdílené mezi `spustDen` a odloženým spuštěním po neděli). */
  function _aplikujVysledekAdventure(vysledek, adventureDoneKey) {
    const out = vysledek && typeof vysledek === 'object' ? vysledek : {};

    if (out.sets_flag) {
      State.set('flags.' + out.sets_flag, true);
    }
    if (out.sets_flag_extra) {
      State.set('flags.' + out.sets_flag_extra, true);
    }

    if (out.sets_uzlovy && State.get('uzlove')) {
      const uz = State.get('uzlove');
      Object.assign(uz, out.sets_uzlovy);
      State.set('uzlove', uz);
    }

    if (out.effects && typeof out.effects === 'object') {
      for (const [klic, deltaRaw] of Object.entries(out.effects)) {
        const delta = Number(deltaRaw);
        if (!Number.isFinite(delta) || delta === 0) continue;
        if (['Integrita', 'Odvaha', 'Moudrost', 'Vina', 'Nadeje'].includes(klic)) {
          State.upravRys(klic, delta);
          continue;
        }
        if (['Moc', 'Kapital', 'Lid', 'Stat', 'Obchodnici'].includes(klic)) {
          const frakce = klic === 'Stat' ? 'Moc' : (klic === 'Obchodnici' ? 'Kapital' : klic);
          State.upravFrakci(frakce, delta);
          continue;
        }
        if (['vlcek', 'zavadova', 'karas'].includes(klic)) {
          State.upravDuveru(klic, delta);
          continue;
        }
        if (klic === 'Finance') {
          State.upravFinance(delta);
        }
      }
    }

    if (out.morning_fragment_append) {
      State.set('flags.morning_fragment_append_next', out.morning_fragment_append);
    }

    if (adventureDoneKey) {
      State.set(adventureDoneKey, true);
    }
    if (typeof State.vypoctiUzloveFlagy === 'function') {
      State.vypoctiUzloveFlagy();
    }
    State.uloz();
    return out;
  }

  /**
   * Adventure s `after_nedelni_volba: true` — až po nedělní volbě (Karas odpoledne v D14),
   * před dialogy postav (Vlček).
   */
  async function _spustAdventurePoNedeliPokud(dDat) {
    const adventureScena = dDat && dDat.adventure_scene;
    if (!adventureScena || adventureScena.after_nedelni_volba !== true) return;
    if (String(adventureScena.trigger || '') !== 'morning_after_fragment') return;
    const adventureDoneKey = adventureScena.id
      ? ('flags.adventure_done_' + adventureScena.id)
      : null;
    if (!adventureDoneKey || State.get(adventureDoneKey) === true) return;
    if (!UI || typeof UI.zobrazAdventureScenu !== 'function') return;
    await new Promise(resolve => {
      UI.zobrazAdventureScenu(adventureScena, function(vysledek) {
        _aplikujVysledekAdventure(vysledek, adventureDoneKey);
        resolve();
      });
    });
  }

  async function spustDen() {
    let den = Number(State.get('currentDay'));
    if (!Number.isFinite(den) || den < 1) {
      console.warn('[Engine] currentDay není platné číslo, nastavuji 1:', State.get('currentDay'));
      State.set('currentDay', 1);
      den = 1;
    }

    // Konec hry: 15 pracovních dní + 2 víkendy = 19 kalendářních dní (currentDay 1…19)
    if (den > 19) {
      spustKonec('preziti');
      return;
    }

    _aplikujRanniTihyUplatku();

    // Neděle — nový pracovní týden: vynulovat týdenní statistiky (násobek Moudrosti řeší sobota večer)
    if (den % 7 === 0) {
      State.resetTydenniStatistikyNedele();
      const vinaN = Number(State.get('traits.Vina')) || 0;
      const nadN = Number(State.get('traits.Nadeje')) || 0;
      if (vinaN <= 15 && nadN >= 78) {
        State.set('pondeli_vina_emotivni', true);
      }
    }

    // Pondělí — důsledky nedělní volby (inkoust navíc)
    let pondelniBonusInkoust = 0;
    if (den % 7 === 1) {
      const v = State.get('nedele_volba');
      if (v === 'A' || v === 'D') {
        pondelniBonusInkoust = 1;
      }
    }

    // Výchozí inkoust na pracovní den s případy.
    _denData = DataLoader.ziskejDen(den);
    const dnesniPripady = Array.isArray(_denData && _denData.cases) ? _denData.cases.length : 0;
    if (dnesniPripady > 0) {
      State.set('investigationActionsLeft', _INVESTIGATION_ACTIONS_BASE_DEN_S_PRIPADY);
    }

    if (pondelniBonusInkoust > 0) {
      const curInk = Number(State.get('investigationActionsLeft')) || 0;
      State.set('investigationActionsLeft', curInk + pondelniBonusInkoust);
    }

    if (State.get('flags.rano_bonus_inkoust_z_kavy')) {
      State.set('flags.rano_bonus_inkoust_z_kavy', false);
      const curInk = Number(State.get('investigationActionsLeft')) || 0;
      State.set('investigationActionsLeft', curInk + 1);
    }
    const bonusInkoustRaw = Number(State.get('flags.bonus_inkoust_rano'));
    if (Number.isFinite(bonusInkoustRaw) && bonusInkoustRaw > 0) {
      const bonusInkoust = Math.max(1, Math.min(2, Math.round(bonusInkoustRaw)));
      State.set('flags.bonus_inkoust_rano', 0);
      const curInk = Number(State.get('investigationActionsLeft')) || 0;
      State.set('investigationActionsLeft', curInk + bonusInkoust);
    }

    const recUntil = State.get('flags.records_free_until_day');
    if (recUntil != null && Number.isFinite(Number(recUntil)) && den > Number(recUntil)) {
      State.set('flags.records_free_until_day', null);
    }

    /* Složky hned podle dne — jinak zůstane výchozí HTML (3 „plné“ sloty) až do _pokracujSpustDen po fragmentu. */
    Cases.nastavPripadyProDen(den, _denData);
    UI.aktualizujSlozky(Cases.getPripady(), State.get('casesResolvedToday'));
    Desk.nastavAktivniSpis(null);

    // Aktualizuj vizuál stolu
    State.set('phase', 'morning');
    Desk.aktualizujVse();
    Music.aktualizujStopu();

    // Aktualizuj noviny
    if (_denData) Narrative.aktualizujNoviny(_denData);

    // Ekonomika ráno: buff lékaře, Karas, výplata, varování, dluh > 100
    Finance.aplikujLekarskyBuffRano();
    Finance.tickKarasDluh();
    if (Finance.aplikujNedelniVyplatu(den)) {
      const vyplatyDny = State.get('finance.vyplataPrijataVDnech') || [];
      const vyplataFragmentId =
        vyplatyDny.length >= 2 ? 'fragment_vyplata_druha' : 'fragment_vyplata';
      await _cekejNaFragment(vyplataFragmentId);
    }
    Finance.zaznamenejBankrotAVarovani();
    if (Finance.getDluh() > 100 && !State.get('flags.dluh_pribeh_spusten')) {
      State.set('flags.dluh_pribeh_spusten', true);
      await _cekejNaFragment('fragment_ekonomika_dluh_krize');
    }
    Finance.zkontrolujCilOperace();
    Desk.aktualizujVse();

    await _vyhodnotMatcinuOperaciRano(den);

    /* Dopisy s fází morning_first: modál hned ráno před ranním fragmentem (např. Benešův lístek). */
    await _zpracujDopisyRanoPredFragmentem(den, _denData);

    if (_stulPripravaMaRozsvitit && typeof UI !== 'undefined' && UI.skryjZatemneniPripravyStoluPoNacteni) {
      await UI.skryjZatemneniPripravyStoluPoNacteni();
      _stulPripravaMaRozsvitit = false;
    }

    // Ranní fragment (den 4 — dopis o operaci jen jednou v ranním okně)
    let morningId = _denData?.morning_fragment;
    if (den === 1 && _SKIP_D1_INTRO_MODALS) {
      morningId = null;
    }
    if (den === 4 && State.get('flags.dopis_operace_den4_viden')) {
      morningId = null;
    }
    if (morningId) {
      if (typeof UI !== 'undefined' && UI.zobrazStulBlokaciDoModaluFragmentu) {
        UI.zobrazStulBlokaciDoModaluFragmentu();
      }
      const addEcho = typeof Narrative !== 'undefined' && Narrative.vyhodnotPodmineneRadky
        ? Narrative.vyhodnotPodmineneRadky(_denData && _denData.morning_conditional_lines)
        : '';
      const addAdventure = String(State.get('flags.morning_fragment_append_next') || '').trim();
      if (addEcho && typeof DataLoader !== 'undefined' && DataLoader.ziskejFragment) {
        const baseF = DataLoader.ziskejFragment(morningId);
        if (baseF) {
          const casti = [(baseF.text || '').trim(), addEcho.trim(), addAdventure].filter(Boolean);
          State.oznacFragment(morningId);
          await _cekejNaFragment(null, {
            ..._titulFragmentuSDnem(baseF, den),
            text: casti.join('\n\n')
          });
          if (addAdventure) State.set('flags.morning_fragment_append_next', null);
        } else {
          await _cekejNaFragment(morningId);
        }
      } else {
        if (addAdventure && typeof DataLoader !== 'undefined' && DataLoader.ziskejFragment) {
          const baseF = DataLoader.ziskejFragment(morningId);
          if (baseF) {
            const casti = [(baseF.text || '').trim(), addAdventure].filter(Boolean);
            State.oznacFragment(morningId);
            await _cekejNaFragment(null, {
              ..._titulFragmentuSDnem(baseF, den),
              text: casti.join('\n\n')
            });
            State.set('flags.morning_fragment_append_next', null);
          } else {
            await _cekejNaFragment(morningId);
          }
        } else {
          await _cekejNaFragment(morningId);
        }
      }
      if (den === 4) {
        State.set('flags.dopis_operace_den4_viden', true);
        State.uloz();
      }
    }

    await _zpracujDopisyDne(den, _denData); /* desk + ostatní fáze; morning_first vynecháno — už zobrazeno výše */

    // Adventure scéna: po ranním fragmentu, před načtením případů.
    const adventureScena = _denData && _denData.adventure_scene;
    const adventureDoneKey = adventureScena && adventureScena.id
      ? ('flags.adventure_done_' + adventureScena.id)
      : null;
    const odlozitAdventureNaPoNedeli = adventureScena && adventureScena.after_nedelni_volba === true;
    const maSpustitAdventure =
      adventureScena &&
      adventureScena.trigger === 'morning_after_fragment' &&
      adventureDoneKey &&
      State.get(adventureDoneKey) !== true &&
      !odlozitAdventureNaPoNedeli;

    if (maSpustitAdventure && UI && typeof UI.zobrazAdventureScenu === 'function') {
      /* Čekat na konec scény — jinak `spustDen` skončí dřív než `_pokracujSpustDen` a `_dalsiDen`
         vynuluje `_rozdeniPoPrepnuDne` → plachta zůstane tmavá (Beneš D11 / 12. března). */
      await new Promise(resolve => {
        UI.zobrazAdventureScenu(adventureScena, function(vysledek) {
          _aplikujVysledekAdventure(vysledek, adventureDoneKey);
          Promise.resolve(_pokracujSpustDen(_denData, den)).then(resolve, resolve);
        });
      });
      return;
    }

    await _pokracujSpustDen(_denData, den);
  }

  async function _pokracujSpustDen(denData, den) {
    /* Po `await` v `spustDen` může hráč načíst zálohu — `syncFromSavedState` přepíše `_denData`,
       ale uzávěr stále předává staré `den` → nesoulad (např. pondělí + nedělní volba). */
    let dCislo = Number(den);
    if (!Number.isFinite(dCislo) || dCislo < 1) dCislo = Number(State.get('currentDay')) || 1;
    const denZeStavu = Number(State.get('currentDay'));
    let dDat = denData;
    if (Number.isFinite(denZeStavu) && denZeStavu > 0 && denZeStavu !== dCislo) {
      dCislo = denZeStavu;
      dDat = DataLoader.ziskejDen(dCislo);
    } else if (dDat && typeof dDat === 'object' && Number.isFinite(Number(dDat.day)) && Number(dDat.day) !== dCislo) {
      dDat = DataLoader.ziskejDen(dCislo);
    } else if (!dDat && Number.isFinite(dCislo)) {
      dDat = DataLoader.ziskejDen(dCislo);
    }
    if (dDat) _denData = dDat;

    /* Případy už nastavené na začátku spustDen (složky pod fragmentem); zopakování je idempotentní. */
    Cases.nastavPripadyProDen(dCislo, dDat);
    const pripady = Cases.getPripady();
    UI.aktualizujSlozky(pripady, State.get('casesResolvedToday'));
    Desk.nastavAktivniSpis(null);

    // Revize spisů — v 15denní verzi vypnuto (MIGRACE_20-15)
    // await _zpracujRevizeDne(dCislo);

    // Nedělní volba před NPC dialogy (dopoledne před odpolední návštěvou / scénou).
    if (dDat?.nedelni_volba) {
      await new Promise(resolve => {
        UI.zobrazNedelniVolbu(dDat, () => {
          Desk.aktualizujVse();
          State.uloz();
          resolve();
        });
      });
    }

    await _spustAdventurePoNedeliPokud(dDat);

    await _zpracujDialogyDne(dCislo);

    State.set('phase', 'forenoon');
    Desk.aktualizujVse();

    _obnovDopisyNaStoleProDen(dDat, dCislo);

    /* Po „Další den“ nejdřív zvednout plachtu a odblokovat stůl — jinak zůstane zachytávat kliky
       a tlačítko „Další den“ je sice vidět, ale nejde na něj kliknout (zejm. neděle bez spisů). */
    if (_rozdeniPoPrepnuDne && typeof UI !== 'undefined' && UI.skryjZatemneniPripravyStoluPoNacteni) {
      _rozdeniPoPrepnuDne = false;
      await UI.skryjZatemneniPripravyStoluPoNacteni();
    } else if (typeof UI !== 'undefined' && UI.skryjZatemneniPripravyStoluPoNacteni) {
      const plachta = document.getElementById('desk-priprava-overlay');
      if (plachta && plachta.classList.contains('desk-priprava-overlay--aktivni')) {
        await UI.skryjZatemneniPripravyStoluPoNacteni();
      }
    }
    if (typeof UI !== 'undefined' && UI.skryjStulBlokaciDoModaluFragmentu) {
      UI.skryjStulBlokaciDoModaluFragmentu();
    }

    // Skrýt tlačítko do vyřešení případů; po F5 / resume znovu sladit s uloženým casesResolvedToday
    UI.zobrazBtnDalsiDen(false);
    zkontrolujKonecDne(false);

    if (
      dCislo === 1 &&
      typeof Tutorial !== 'undefined' &&
      Tutorial.jeAktivni &&
      Tutorial.jeAktivni() &&
      typeof Tutorial.poPripraveStolu === 'function' &&
      !Tutorial.krokHotovy('desk_hotovo')
    ) {
      setTimeout(() => {
        if (typeof Tutorial !== 'undefined' && Tutorial.poPripraveStolu) {
          Tutorial.poPripraveStolu();
        }
      }, 720);
    }

    if (
      dCislo === 2 &&
      typeof Tutorial !== 'undefined' &&
      Tutorial.cekaFinaleDen2 &&
      Tutorial.cekaFinaleDen2() &&
      typeof Tutorial.poStartuDne2 === 'function'
    ) {
      setTimeout(() => {
        if (typeof Tutorial !== 'undefined' && Tutorial.poStartuDne2) {
          Tutorial.poStartuDne2();
        }
      }, 900);
    }

  }

  /**
   * Zarovná runtime s právě načteným State (menu „Načíst hru“ bez reloadu).
   *
   * Follow-up (zatím neřešeno): po F5 stále proběhne celý `spustDen` včetně dialogů —
   * může duplikovat archivní záznamy; idempotentní resume by vyžadovalo flag v State nebo
   * sloučení části uložení s výchozím stavem při `State.nacti()`.
   */
  function syncFromSavedState() {
    _rozdeniPoPrepnuDne = false;
    if (State.get('gameOver')) {
      Desk.aktualizujVse();
      Music.aktualizujStopu();
      return;
    }
    const den = State.get('currentDay');
    if (den > 19) {
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

    _obnovDopisyNaStoleProDen(_denData, den);

    Desk.aktualizujVse();
    Music.aktualizujStopu();
    // false: při loadu / resume nespouštět variabilní konec (konec jen po posledním rozsudku dne v relaci)
    zkontrolujKonecDne(false);
  }

  function _tTrait(nazev) {
    return Number(State.get('traits.' + nazev)) || 0;
  }

  /**
   * Variabilní konce (MIGRACE_20-15) — po uzavření posledního spisu dne, den ≥ 11.
   * Podmínky mapují stav hry (rys, důvěra, finance, flagy) na design v docs/scenar/Konce.csv.
   * Výchozí „přežití“ až poslední kalendářní den (19), ať běh nemusí skončit hned 15. dnem.
   * @returns {string|null} typ pro spustKonec, nebo null
   */
  function _vyhodnotVariabilniKonecLegacy() {
    if (State.get('gameOver')) return null;
    const den = Number(State.get('currentDay'));
    if (!Number.isFinite(den) || den < 11) return null;

    const st = State.get() || {};
    const integ = _tTrait('Integrita');
    const odv = _tTrait('Odvaha');
    const moudr = _tTrait('Moudrost');
    const vina = _tTrait('Vina');
    const t = st.trust || {};
    const tv = Number(t.vlcek) || 0;
    const tz = Number(t.zavadova) || 0;
    const tk = Number(t.karas) || 0;
    const f = st.factions || {};
    const moc = Number(f.Moc);
    const bal = Number((st.finance && st.finance.balance) || 0) || 0;
    const fl = st.flags || {};
    const uplatek = fl.uplatek_prijat === true;
    const operPl = fl.operace_zaplacena === true;
    const operOd = fl.operace_odlozena === true;

    const KONCE = [
      {
        type: 'korupce',
        minDay: 15,
        check: () => uplatek && (integ <= 20 || integ <= 35)
      },
      {
        type: 'smireni',
        minDay: 16,
        check: () => integ >= 60 && vina <= 20 && (operPl || fl.benes_identified === true)
      },
      {
        type: 'utek',
        minDay: 17,
        check: () => tk >= 1 && bal > 300 && !operOd
      },
      {
        type: 'atentát',
        minDay: 17,
        check: () =>
          integ >= 60 &&
          odv >= 80 &&
          Number.isFinite(moc) &&
          moc <= 20 &&
          tv <= 0 &&
          !uplatek
      },
      {
        type: 'rad',
        minDay: 16,
        check: () => tv <= 0 && tz >= 3 && fl.masek_document_signed === true
      },
      {
        type: 'anna',
        minDay: 18,
        check: () => vina <= 20 && bal < 100 && moudr >= 75 && !uplatek && !operPl
      },
      {
        type: 'hrdina',
        minDay: 19,
        check: () => integ >= 78 && odv >= 78
      },
      {
        type: 'preziti',
        minDay: 19,
        check: () => true
      }
    ];

    for (const k of KONCE) {
      if (den >= k.minDay && k.check()) return k.type;
    }
    return null;
  }

  /** Rys v pásmu 25–75 (design Přežití — mírně širší než 30–70 kvůli driftu z poolu). */
  function _jeRysStredni(hodnota) {
    const v = Number(hodnota);
    return Number.isFinite(v) && v >= 25 && v <= 75;
  }

  /** Alespoň 3 z 5 hlavních rysů ve středním pásmu (4/5 bylo v praxi nedosažitelné). */
  function _maStredniProfilRysu(traits) {
    const t = traits || {};
    const klice = ['Integrita', 'Odvaha', 'Moudrost', 'Vina', 'Nadeje'];
    let vPasmu = 0;
    for (const k of klice) {
      if (_jeRysStredni(t[k])) vPasmu++;
    }
    return vPasmu >= 3;
  }

  /** Podíl případů s průzkumem za celou kampaň (0–1). */
  function _pomerPruzkumuKampan() {
    const k = State.get('kampan_statistiky');
    if (!k || typeof k !== 'object') return 0;
    const pc = Number(k.pripady_celkem) || 0;
    if (pc < 1) return 0;
    return (Number(k.pripady_s_prurzkumem) || 0) / pc;
  }

  /** Haas nezavázal (odmítnutá obálka); „otevřený“ kontakt neblokuje čisté větve. */
  function _haasBezVazby(uzlove) {
    return uzlove && uzlove.haas_kontakt !== 'zavazany';
  }

  /**
   * Politický vzdor + pravda Beneše + vina z tvrdých rozsudků (oddělení od smíření / útěku).
   * Tvrdé tresty mohou Moc zvedat — atentát je konfrontace, ne servilita (vyloučena jen extrémní loajalita).
   */
  function _profilAtentatu(uzlove, traits, flags, mocHodnota) {
    if (!uzlove || flags.uplatek_prijat === true) return false;
    if (uzlove.vlcek_vztah !== 'vzdor' || uzlove.benes_pravda !== 'prijal') return false;
    if (!_haasBezVazby(uzlove)) return false;
    const odv = Number(traits.Odvaha) || 0;
    const vina = Number(traits.Vina) || 0;
    const moc = Number(mocHodnota) || 50;
    if (vina < 22 || odv < 72) return false;
    if (moc >= 88 && vina < 45) return false;
    return true;
  }

  /**
   * Variabilní konce — pořadí: hnusné / únikové / čisté extrémy / střed / fallback D19.
   * Soulad s docs/scenar/Konce_15dni.csv (Vlna D).
   */
  function _vyhodnotVariabilniKonec() {
    if (State.get('gameOver')) return null;
    const st = State.get() || {};
    const den = Number(st.currentDay);
    if (!Number.isFinite(den) || den < 11) return null;

    const u = st.uzlove;
    if (!u || typeof u !== 'object') {
      return _vyhodnotVariabilniKonecLegacy();
    }

    const t = st.traits || {};
    const tr = st.trust || {};
    const bal = Number((st.finance && st.finance.balance) || 0) || 0;
    const f = st.flags || {};
    const factions = st.factions || {};
    const mocHodnota = Number.isFinite(Number(factions.Moc)) ? Number(factions.Moc) : 50;
    const integ = Number(t.Integrita) || 0;
    const vina = Number(t.Vina) || 0;
    const moudr = Number(t.Moudrost) || 0;
    const odv = Number(t.Odvaha) || 0;
    const nad = Number(t.Nadeje) || 0;
    const uplatek = f.uplatek_prijat === true;
    const operPl = f.operace_zaplacena === true;
    const pruzkumKampan = _pomerPruzkumuKampan();
    const pruzkumAnna = pruzkumKampan >= 0.72 || moudr >= 58;
    const profilAtentat = _profilAtentatu(u, t, f, mocHodnota);
    const osobniCenaAnna = u.osobni_cena === 'nerozhodl' || u.osobni_cena === 'odmitl';
    /** Cesta k Anně — pravda, nezaplacená operace, vysoký průzkum (bez finance). */
    const profilAnnaCesta = u.benes_pravda === 'prijal'
      && _haasBezVazby(u)
      && osobniCenaAnna
      && vina <= 28
      && pruzkumAnna
      && !operPl
      && !f.flag_rodny_list_pouzit;
    /** Chudý archivář na Markové — investice do spisů, ne do matky. */
    const annaChudy = bal < 130
      || (pruzkumKampan >= 0.72 && bal < 165)
      || (pruzkumKampan >= 0.50 && bal < 170)
      || (moudr >= 58 && pruzkumKampan >= 0.45 && bal < 175);
    const annaKandidat = profilAnnaCesta && annaChudy;
    /** Blokuje smíření jen když by jinak padla Anna (ne bohatý Benešův profil). */
    const profilBlokujeSmireni = profilAnnaCesta && annaChudy;
    const bohatyProfilSmireni = bal >= 140 && pruzkumKampan < 0.65;
    /** Měkké smíření — zaplacená operace snáší vyšší vinu než čistá větev. */
    const vinaProSmireni = vina <= 35 || (operPl && vina <= 45);

    // 7. KRUH (D16+, Zavadová) — před korupcí: úplatek + INT 46–62, ne hluboký pád
    if (den >= 16
      && u.vlcek_vztah !== 'vzdor'
      && u.haas_kontakt === 'zavazany'
      && u.benes_pravda !== 'prijal'
      && !profilAnnaCesta
      && (f.masek_document_signed === true
          || (tr.zavadova !== undefined ? Number(tr.zavadova) >= 3 : false))) {
      return 'rad';
    }

    // 2. KORUPCE (D15+, Haas) — hluboká korupce (INT ≤45 s úplatkem), ne kruh na D16
    if (den >= 15
      && u.vlcek_vztah === 'kompromitovan'
      && u.haas_kontakt === 'zavazany'
      && (integ <= 20 || (uplatek && integ <= 45))) {
      return 'korupce';
    }

    // 8. ANNA (currentDay 18 = 19. 3., Marková) — před smířením
    if (den >= 18
      && annaKandidat) {
      return 'anna';
    }

    // 5. SMÍŘENÍ (currentDay 16 = 17. 3., Zavadová) — ne annin chudý profil
    if (den >= 16
      && !profilBlokujeSmireni
      && !profilAtentat
      && u.benes_pravda === 'prijal'
      && _haasBezVazby(u)
      && integ >= 52
      && vinaProSmireni
      && moudr >= 48
      && (operPl || u.osobni_cena === 'zaplatil' || bohatyProfilSmireni)) {
      return 'smireni';
    }

    // 6. ATENTÁT (currentDay 17 = 18. 3., Karas)
    if (den >= 17
      && profilAtentat
      && !operPl
      && u.osobni_cena !== 'zaplatil'
      && u.osobni_cena !== 'haasem') {
      return 'atentát';
    }

    // 4. ÚTĚK (currentDay 17 = 18. 3., Karas)
    if (den >= 17
      && _haasBezVazby(u)
      && !profilAtentat
      && u.osobni_cena === 'zaplatil'
      && (tr.karas !== undefined ? Number(tr.karas) >= 2 : false)
      && bal > 260) {
      return 'utek';
    }

    // 3. HRDINA (currentDay 19 = 20. 3., Velezrada) — vzdor + vysoká odvaha, ne čistý drift z poolu
    if (den >= 19
      && !uplatek
      && u.vlcek_vztah === 'vzdor'
      && _haasBezVazby(u)
      && u.benes_pravda !== 'prijal'
      && odv >= 88
      && (integ >= 78 || vina <= 55)
      && !f.flag_rodny_list_pouzit) {
      return 'hrdina';
    }

    // 1. PŘEŽITÍ (currentDay 19 = 20. 3.) — neutrální Vlček, střední profil, rezignace ne euforie
    if (den >= 19
      && u.vlcek_vztah === 'neutral'
      && _maStredniProfilRysu(t)
      && u.haas_kontakt !== 'zavazany'
      && integ >= 28 && integ <= 78
      && vina >= 25 && vina <= 75
      && nad >= 28 && nad <= 72) {
      return 'preziti';
    }

    // Fallback — konec kampaně bez extrémní větve
    if (den >= 19) {
      return 'preziti';
    }

    return null;
  }

  /**
   * @param {boolean} [allowVariabilni=false] true jen po rozsudku/úplatku (aktivní relace) — umožní
   *   MIGRACE_20-15 variabilní konce. false při spuštění dne a syncFromSavedState, aby F5/načtení
   *   neeskalovalo okamžitý game over.
   */
  function zkontrolujKonecDne(allowVariabilni) {
    if (State.get('gameOver')) return;
    const variabilniOk = allowVariabilni === true;
    const pripadyNactene = Cases.getPripady();
    const vsechnyIds = pripadyNactene.map(p => p && p.id).filter(Boolean);
    const denKonec = Number(State.get('currentDay'));
    const denProKontrolu = Number.isFinite(denKonec) && denKonec > 0 ? denKonec : 1;

    // Žádné případy dnes → bez kontroly variabilních konců (prázdný den / neděle bez spisů)
    if (vsechnyIds.length === 0) {
      State.set('phase', 'evening');
      Desk.aktualizujVse();
      UI.zobrazBtnDalsiDen(true);
      return;
    }

    // Všechny případy vyřešeny v tento den (pool může opakovat id — globální archiv nestačí)
    const vsechnyVyreseny = vsechnyIds.every(id =>
      typeof State.jePripadUzavrenVDen === 'function'
        ? State.jePripadUzavrenVDen(id, denProKontrolu)
        : (State.get('casesResolvedToday') || []).includes(id)
    );
    if (!vsechnyVyreseny) {
      return;
    }

    if (!variabilniOk) {
      State.set('phase', 'evening');
      Desk.aktualizujVse();
      setTimeout(() => UI.zobrazBtnDalsiDen(true), 800);
      return;
    }

    if (variabilniOk && typeof State.vypoctiUzloveFlagy === 'function') {
      State.vypoctiUzloveFlagy();
    }
    const konecTyp = _vyhodnotVariabilniKonec();
    if (konecTyp) {
      State.set('phase', 'evening');
      Desk.aktualizujVse();
      setTimeout(() => {
        if (!State.get('gameOver')) {
          spustKonec(konecTyp);
        }
      }, 600);
      return;
    }

    State.set('phase', 'evening');
    Desk.aktualizujVse();
    setTimeout(() => UI.zobrazBtnDalsiDen(true), 800);
  }

  async function _dalsiDen() {
    if (_maNeprectenyDopisNaStole()) {
      UI.zobrazStavovouZpravu('Na stole leží neotevřený dopis.');
      return;
    }
    if (typeof SFX !== 'undefined') SFX.prechodNaDalsiDen();
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
        const f =
          typeof DataLoader !== 'undefined' && DataLoader.ziskejFragment
            ? DataLoader.ziskejFragment(fid)
            : null;
        if (f) {
          State.oznacFragment({ id: fid, day: denS });
          await _cekejNaFragment(null, {
            ...f,
            day: denS,
            type: 'fragment',
            title: 'Večer'
          });
        } else {
          await _cekejNaFragment(fid);
        }
      }
    }

    // Přechod dne: pomalé zatmavení plachtou jako po úvodu; stůl se rozsvítí až po startu nového dne (`_pokracujSpustDen`)
    if (typeof UI !== 'undefined' && UI.zobrazZatemneniPripravyStoluPomalu) {
      await UI.zobrazZatemneniPripravyStoluPomalu();
    } else if (typeof UI !== 'undefined' && UI.zobrazZatemneniPripravyStolu) {
      UI.zobrazZatemneniPripravyStolu();
    }

    State.dalsiDen();
    State.uloz();
    _rozdeniPoPrepnuDne = true;
    await spustDen();
    /* Po přechodu dne: při game over může `_pokracujSpustDen` nenaběhnout — plachtu stejně zvednout.
       Příznak „rozjezd“ už mohl `_pokracujSpustDen` vynulovat po rozednění. */
    if (State.get('gameOver') && typeof UI !== 'undefined' && UI.skryjZatemneniPripravyStoluPoNacteni) {
      await UI.skryjZatemneniPripravyStoluPoNacteni();
    }
    _rozdeniPoPrepnuDne = false;
  }

  // --- DIALOGY POSTAV ---

  async function _zpracujDialogyDne(den) {
    if (den === 1 && _SKIP_D1_INTRO_MODALS) {
      return;
    }
    const dialogy = Characters.getDialogyDen(den);
    for (const { id, dialog } of dialogy) {
      State.oznacPostavuPotkanu(id);
      const souhrn = Characters.getHistorieRadkaTitulek(id, dialog.type);
      State.zalogujNpcSetkani(id, den, souhrn, dialog.text || '');
      State.zapisNpcPosledniDialog(id, den, dialog.text || '');
      // Dopisy zůstávají dopisy, osobní návštěvy patří do běžného narativního okna.
      const typDialogu = dialog.type === 'letter' ? 'letter' : 'visit';
      const podtitulNavstevy =
        typDialogu === 'visit' && dialog && String(dialog.visit_label || '').trim()
          ? String(dialog.visit_label).trim()
          : Characters.getNazev(id);
      await _cekejNaFragment(null, {
        type:  typDialogu,
        title: typDialogu === 'visit'
          ? `Návštěva — ${podtitulNavstevy}`
          : Characters.getNazev(id),
        text:  dialog.text,
        day:   den
      });
    }
  }

  function _klicPendingDeskDopisu(den) {
    return 'pending_desk_letters_day_' + Number(den);
  }

  /** Nepřečtený dopis na stole (fronta z `letters.json` s delivery „desk“). */
  function _maNeprectenyDopisNaStole() {
    const den = Number(State.get('currentDay')) || 0;
    if (den < 1) return false;
    const arr = State.get('flags.' + _klicPendingDeskDopisu(den));
    return Array.isArray(arr) && arr.length > 0;
  }

  function _klicZpracovaniDopisu(den) {
    return 'letters_processed_day_' + Number(den);
  }

  function _sestavTextDopisu(dopis) {
    if (!dopis || typeof dopis !== 'object') return '';
    let body = String(dopis.body || '');
    const flagWb = String(dopis.wrote_back_flag || '').trim();
    if (flagWb && dopis.body_wrote_back && State.get('flags.' + flagWb) === true) {
      body = String(dopis.body_wrote_back);
      State.set('flags.' + flagWb, false);
    }
    const casti = [];
    if (dopis.salutation) casti.push(String(dopis.salutation).trim());
    if (body) casti.push(body.trim());
    if (dopis.closing) casti.push(String(dopis.closing).trim());
    if (dopis.postscript) casti.push('P.S. ' + String(dopis.postscript).trim());
    return casti.filter(Boolean).join('\n\n');
  }

  function _vyhodnotPodminkuDopisu(cond) {
    if (!cond || typeof cond !== 'object') return true;
    if (cond.trust && typeof cond.trust === 'object') {
      for (const [npc, cfg] of Object.entries(cond.trust)) {
        const c = cfg && typeof cfg === 'object' ? cfg : {};
        const v = Number(State.get('trust.' + npc)) || 0;
        if (c.min != null && v < Number(c.min)) return false;
        if (c.max != null && v > Number(c.max)) return false;
      }
    }
    if (cond.flags && typeof cond.flags === 'object') {
      for (const [k, expected] of Object.entries(cond.flags)) {
        if (State.get('flags.' + k) !== expected) return false;
      }
    }
    return true;
  }

  function _aplikujEfektyDopisu(effects) {
    if (!effects || typeof effects !== 'object') return;
    if (effects.traits && typeof effects.traits === 'object') {
      for (const [k, d] of Object.entries(effects.traits)) {
        const n = Number(d);
        if (Number.isFinite(n) && n !== 0) State.upravRys(k, n);
      }
    }
    if (effects.trust && typeof effects.trust === 'object') {
      for (const [k, d] of Object.entries(effects.trust)) {
        const n = Number(d);
        if (Number.isFinite(n) && n !== 0) State.upravDuveru(k, n);
      }
    }
    if (effects.flags && typeof effects.flags === 'object') {
      for (const [k, v] of Object.entries(effects.flags)) {
        State.set('flags.' + k, v);
      }
    }
  }

  async function _zobrazReakciDopisu(reaction, dopisMeta) {
    if (!reaction || !Array.isArray(reaction.options) || reaction.options.length === 0) return;
    const r = { ...reaction };
    const ph = dopisMeta && String(dopisMeta.phase || '').trim();
    if (!r.cas_label && (ph === 'morning_after_fragment' || ph === 'forenoon' || ph === 'morning_first')) {
      r.cas_label = 'RÁNO';
    }
    const vyber = await new Promise(resolve => {
      UI.zobrazVecerniVolbu({ evening_choice: r }, moznost => resolve(moznost || null));
    });
    if (vyber && vyber.effects) {
      _aplikujEfektyDopisu(vyber.effects);
    }
  }

  async function _zobrazDopisModalem(dopis) {
    const text = _sestavTextDopisu(dopis);
    const den = Number(State.get('currentDay')) || 0;
    const npcId = String(dopis.from || '').trim();
    if (npcId) {
      const souhrn = String(dopis.archive_summary || Characters.getHistorieRadkaTitulek(npcId, 'letter') || 'Dopis');
      State.zalogujNpcSetkani(npcId, den, souhrn, text);
      State.zapisNpcPosledniDialog(npcId, den, text);
    }
    await _cekejNaFragment(null, {
      type: 'letter',
      title: dopis.title || 'Dopis',
      text
    });
    if (typeof UI !== 'undefined' && typeof UI.odemkniPovestPodleUdalosti === 'function' && dopis.id) {
      UI.odemkniPovestPodleUdalosti('dopis', String(dopis.id));
    }
    _aplikujEfektyDopisu(dopis.effects);
    await _zobrazReakciDopisu(dopis.reaction, dopis);
    Desk.aktualizujVse();
    State.uloz();
  }

  function _pridejDeskDopisProDen(den, letterId) {
    const klic = _klicPendingDeskDopisu(den);
    const arr = Array.isArray(State.get('flags.' + klic)) ? State.get('flags.' + klic).slice() : [];
    if (!arr.includes(letterId)) arr.push(letterId);
    State.set('flags.' + klic, arr);
  }

  function _obnovDopisyNaStoleProDen(denData, den) {
    const klic = _klicPendingDeskDopisu(den);
    const pending = Array.isArray(State.get('flags.' + klic)) ? State.get('flags.' + klic) : [];
    const legacy = !!(denData && denData.vlcek_letter);
    const maDeskDopis = pending.length > 0 || legacy;
    Desk.zobrazVlcekDopis(maDeskDopis);
    Desk.zobrazSuplikIndikator(maDeskDopis);
  }

  /**
   * Dopisy s `phase: "morning_first"` v letters.json — zobrazí se modálně před ranním fragmentem,
   * nejdou na frontu stolu (stejné efekty jako při čtení z obálky).
   */
  async function _zpracujDopisyRanoPredFragmentem(den, denData) {
    if (!denData || !Array.isArray(denData.letters) || denData.letters.length === 0) return;
    const hotovoKlic = 'letters_morning_first_done_day_' + Number(den);
    if (State.get('flags.' + hotovoKlic) === true) return;

    const klicP = _klicPendingDeskDopisu(den);
    const pen = Array.isArray(State.get('flags.' + klicP)) ? State.get('flags.' + klicP).slice() : [];
    const promazano = pen.filter(id => {
      const d = DataLoader.ziskejDopis(id);
      return !d || String(d.phase || '').trim() !== 'morning_first';
    });
    if (promazano.length !== pen.length) {
      State.set('flags.' + klicP, promazano);
      if (typeof Desk !== 'undefined' && Desk.aktualizujVse) Desk.aktualizujVse();
    }

    let udelano = false;
    for (const letterId of denData.letters) {
      const dopis = DataLoader.ziskejDopis(letterId);
      if (!dopis || String(dopis.phase || '').trim() !== 'morning_first') continue;
      if (!_vyhodnotPodminkuDopisu(dopis.condition)) continue;
      /* Starší uložení: lístek už byl na stole přečten — neopakovat modál ani efekty */
      if (letterId === 'benes_d9' && State.get('flags.benes_listek_precten') === true) {
        udelano = true;
        continue;
      }
      await _zobrazDopisModalem(dopis);
      udelano = true;
    }
    if (udelano) {
      State.set('flags.' + hotovoKlic, true);
      State.uloz();
    }
  }

  async function _zpracujDopisyDne(den, denData) {
    if (!denData || !Array.isArray(denData.letters) || denData.letters.length === 0) return;
    const doneKey = _klicZpracovaniDopisu(den);
    if (State.get('flags.' + doneKey) === true) return;
    const letterIds = denData.letters.filter(id => {
      const dopis = DataLoader.ziskejDopis(id);
      return dopis && String(dopis.phase || '').trim() !== 'morning_first';
    });
    for (const letterId of letterIds) {
      const dopis = DataLoader.ziskejDopis(letterId);
      if (!dopis || !_vyhodnotPodminkuDopisu(dopis.condition)) continue;
      if (dopis.delivery === 'auto') {
        await _zobrazDopisModalem(dopis);
      } else {
        _pridejDeskDopisProDen(den, letterId);
      }
    }
    State.set('flags.' + doneKey, true);
    State.uloz();
  }

  function otevriDopisZeStolu() {
    const den = Number(State.get('currentDay')) || 0;
    const klic = _klicPendingDeskDopisu(den);
    const pending = Array.isArray(State.get('flags.' + klic)) ? State.get('flags.' + klic).slice() : [];
    if (pending.length === 0) {
      otevriVlcekuvDopis();
      return;
    }
    const letterId = pending[0];
    const dopis = DataLoader.ziskejDopis(letterId);
    if (!dopis) {
      State.set('flags.' + klic, pending.slice(1));
      _obnovDopisyNaStoleProDen(_denData, den);
      if (typeof Desk !== 'undefined' && Desk.aktualizujVse) Desk.aktualizujVse();
      State.uloz();
      return;
    }
    _zobrazDopisModalem(dopis).then(() => {
      const zbytek = Array.isArray(State.get('flags.' + klic)) ? State.get('flags.' + klic).slice() : [];
      if (zbytek.length && zbytek[0] === letterId) {
        State.set('flags.' + klic, zbytek.slice(1));
      }
      _obnovDopisyNaStoleProDen(_denData, den);
      const po = State.get('flags.' + klic);
      if (!Array.isArray(po) || po.length === 0) {
        if (typeof Desk !== 'undefined' && Desk.skryjObalkuStoluPoPreceniVlcka) {
          Desk.skryjObalkuStoluPoPreceniVlcka();
        }
      }
      /* Po odebrání z fronty — např. druhá obálka zmizí po přečtení prvního dopisu */
      if (typeof Desk !== 'undefined' && Desk.aktualizujVse) Desk.aktualizujVse();
      State.uloz();
    });
  }

  // --- HAASOVA OBÁLKA ---

  function otevriHaasovuObalku() {
    if (State.get('flags.haas_envelope_opened')) return;

    const den = State.get('currentDay');
    if (den < 8) {
      UI.zobrazStavovouZpravu('Obálka bude k dispozici od osmého dne.');
      return;
    }

    State.set('flags.haas_envelope_opened', true);
    State.upravRys('Vina', +5, { bezKampanStropu: true });

    const denHaas = State.get('currentDay');
    const fragment = DataLoader.ziskejFragment('haas_obalka');
    const haasText = fragment?.text ||
      'Vážený pane doktore,\n\nDovolujeme si Vás informovat, že náš klient pan průmyslník Haas přiložil k tomuto dopisu výraz své úcty ve výši 800 Kčs.\n\nVěříme, že budete jeho záležitostem věnovat patřičnou pozornost.\n\nS uctivým pozdravem,\nJUDr. Haas & synové, advokátní kancelář';
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
    const denV = Number(State.get('currentDay')) || 0;

    if (_denData && _denData.vlcek_letter) {
      const fragment = DataLoader.ziskejFragment(_denData.vlcek_letter);
      const obsah = fragment || {
        type:  'letter',
        title: 'Dopis od ministra Vlčka',
        text:  _denData.vlcek_letter_text || '„Věřím, že jste muž, který rozumí nutnosti kompromisů, pane doktore."'
      };

      State.zalogujNpcSetkani('vlcek', denV, 'Dopis od Vlčka', obsah.text || '');
      State.zapisNpcPosledniDialog('vlcek', denV, obsah.text || '');

      UI.zobrazFragment(obsah, () => {
        Desk.zobrazVlcekDopis(false);
        Desk.zobrazSuplikIndikator(false);
        if (typeof Desk.skryjObalkuStoluPoPreceniVlcka === 'function') {
          Desk.skryjObalkuStoluPoPreceniVlcka();
        }
        if (typeof UI !== 'undefined' && typeof UI.odemkniPovestPodleUdalosti === 'function') {
          UI.odemkniPovestPodleUdalosti('dopis', 'vlcek_d1');
        }
      });

      State.upravRys('Vina', 3, { bezKampanStropu: true });
      State.uloz();
      return;
    }

    /* Dopisy s delivery „desk“ jdou přes _zpracujDopisyDne + obálku na stole, ne automatickým modalem. */
  }

  // --- KONEC HRY ---

  function spustKonec(typ) {
    if (State.get('gameOver')) return;
    State.set('gameOver', true);
    State.set('endingType', typ);
    State.set('flags.stats_display_unlocked', true);
    State.uloz();
    Music.nastavStopu('epilog');

    const epilog = _sestavEpilog(typ);
    if (typeof UI !== 'undefined' && typeof UI.zobrazPredKoncemAKonecHry === 'function') {
      UI.zobrazPredKoncemAKonecHry(typ, epilog);
    } else if (typeof UI !== 'undefined' && typeof UI.zobrazKonecHry === 'function') {
      UI.zobrazKonecHry(typ, epilog);
    }
  }

  function _sestavEpilog(typ) {
    const stav = State.get();
    const radky = [];

    // Radky pro každou postavu — ze State a flags
    const postavyEpilog = {
      vlcek:     _epilogVlcek(typ, stav),
      zavadova:  _epilogZavadova(typ, stav),
      masek:     _epilogMasek(typ, stav),
      karas:     _epilogKaras(typ, stav),
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

  /**
   * Jedna epilogová větev z `data/endings_epilog.json` (`typy[typ][npcId]`).
   * Závadová: { low, high } podle trust.zavadova. Beneš: unknown / identified / identified_hrdina (atentát|hrdina + identified).
   */
  function _epilogRadekZeSouboru(typ, npcId, stav) {
    if (typeof DataLoader === 'undefined' || typeof DataLoader.ziskejEndingsEpilog !== 'function') return null;
    const root = DataLoader.ziskejEndingsEpilog();
    if (!root || !root.typy || typeof root.typy !== 'object') return null;
    const blok = root.typy[typ];
    if (!blok || typeof blok !== 'object') return null;
    const entry = blok[npcId];
    if (entry == null) return null;
    if (npcId === 'zavadova' && typeof entry === 'object' && !Array.isArray(entry)) {
      const tr = Number(stav.trust && stav.trust.zavadova) || 0;
      const t = tr >= 2 ? entry.high : entry.low;
      return typeof t === 'string' && t.trim() ? t.trim() : null;
    }
    if (npcId === 'benes' && typeof entry === 'object' && !Array.isArray(entry)) {
      const identified = !!(stav.flags && stav.flags.benes_identified);
      if (!identified) {
        const u = entry.unknown;
        return typeof u === 'string' && u.trim() ? u.trim() : null;
      }
      if (
        (typ === 'atentát' || typ === 'hrdina') &&
        typeof entry.identified_hrdina === 'string' &&
        entry.identified_hrdina.trim()
      ) {
        return entry.identified_hrdina.trim();
      }
      const i = entry.identified;
      return typeof i === 'string' && i.trim() ? i.trim() : null;
    }
    if (typeof entry === 'string' && entry.trim()) return entry.trim();
    return null;
  }

  function _epilogVlcek(typ, stav) {
    const z = _epilogRadekZeSouboru(typ, 'vlcek', stav);
    if (z) return z;
    if (typ === 'hrdina') return 'Vlček byl odvolán z funkce a řízení proti němu bylo po dvou týdnech zastaveno.';
    if (typ === 'korupce') return 'Vlček zůstal ve službě republice a Vraného případ v úředních rozhovorech nezmiňoval.';
    return 'Vlček zůstal ve své funkci a pokračoval v práci stejným způsobem jako předtím.';
  }

  function _epilogZavadova(typ, stav) {
    const z = _epilogRadekZeSouboru(typ, 'zavadova', stav);
    if (z) return z;
    const trust = Number(stav.trust && stav.trust.zavadova) || 0;
    if (typ === 'hrdina')        return 'Závadová vydala sérii článků a v redakci pokračovala i poté, co kvůli ní přišli o místo tři kolegové.';
    if (trust >= 2)              return 'Závadová napsala o Vraném text, který nešel jen o případ, ale i o člověka za stolem.';
    return 'Závadová případ sledovala z větší dálky a brzy se v práci věnovala jiným tématům.';
  }

  function _epilogKaras(typ, stav) {
    const z = _epilogRadekZeSouboru(typ, 'karas', stav);
    if (z) return z;
    const tr = Number(stav.trust && stav.trust.karas) || 0;
    if (typ === 'utek') {
      return 'Karas půjčoval peníze dál, ale o Vraném se už v lokálu nevyptával a říkal jen, že někteří klienti jsou dočasně mimo dosah.';
    }
    if (typ === 'korupce') {
      return 'Karas si ponechal stejný způsob jednání, jen častěji nosil smlouvy lidem, kteří už soudní síň nepotřebovali.';
    }
    if (typ === 'odvolani') {
      return 'Karas nechal Vraného v účtech stranou, protože kolem případu zůstalo příliš mnoho čitelných jmen.';
    }
    if (typ === 'atentát') {
      return 'Karas půjčoval peníze i v týdnech chaosu a opakoval, že peníze podle něj neznají politiku, jen splatnost.';
    }
    if (typ === 'hrdina') {
      return 'Karas u šachovnice dlouho mlčel a nakonec poznamenal, že každý člověk musí někdy přijmout riziko.';
    }
    if (tr >= 2) {
      return 'Karas si Vraného zapamatoval jako člověka, kterého se mohlo vyplatit nechat pro pozdější příležitost.';
    }
    return 'Karas dál sedával u okna v U Fleků a vedl své účty se stejnou pečlivostí jako dřív.';
  }

  function _epilogMasek(typ, stav) {
    const z = _epilogRadekZeSouboru(typ, 'masek', stav);
    if (z) return z;
    if (typ === 'korupce') return 'Mašek přijal Vraného mezi lidi, kteří se naučili s režimem spolupracovat, a nikdy o tom nemluvili nahlas.';
    return 'Mašek odešel do penze o rok dříve a s většinou kolegů se nerozloučil.';
  }

  function _epilogBenes(typ, stav) {
    const z = _epilogRadekZeSouboru(typ, 'benes', stav);
    if (z) return z;
    const identified = stav.flags && stav.flags.benes_identified;
    if (identified && typ === 'hrdina') return 'Beneš přišel na pohřeb, nestál blízko rakve, ale zůstal až do konce.';
    if (identified) return 'Beneš odešel tiše a většina lidí v budově se nikdy nedozvěděla, kdo vlastně byl.';
    return 'Vraný se nikdy nedozvěděl, kdo byl starý muž, který se kolem případu objevil.';
  }

  function _epilogNovak(typ, stav) {
    const z = _epilogRadekZeSouboru(typ, 'novak', stav);
    if (z) return z;
    const endingTexty = {
      odvolani: 'Dr. Benedikt Vraný byl odvolán z funkce, jeho soudcovská kariéra skončila a později se přestěhoval na venkov.',
      korupce:  'Dr. Benedikt Vraný se postupně stal součástí systému, kterého se na začátku své služby obával.',
      'atentát':  'Dr. Benedikt Vraný zemřel 28. března 1931. Příčina nebyla nikdy plně objasněna.',
      preziti:  'Dr. Benedikt Vraný došel na konec roku s opatrnou úlevou, protože úřad i jeho vlastní život pokračovaly dál.',
      hrdina:   'Dr. Benedikt Vraný přežil a pochopil, že minulost nejde napravit správnými rozhodnutími, ale je možné s ní dál žít.',
      smireni:  'Dr. Benedikt Vraný odešel z příběhu bez jistoty vlastní čistoty, ale také bez úplného zlomení.',
      utek:     'Dr. Benedikt Vraný nechal žaluzie stažené a soustředil se na každodenní účty, které šly alespoň spočítat.',
      rad:      'Dr. Benedikt Vraný dál žil s pochybností, zda se některé události skutečně staly tak, jak si je pamatoval.',
      anna:     'Dr. Benedikt Vraný večer zhasínal dřív než dřív a po dlouhé době usínal klidněji.'
    };
    return endingTexty[typ] || 'Dr. Benedikt Vraný uzavřel svůj příběh v roce 1931.';
  }

  // --- HELPERS ---

  /**
   * Ráno dne operace (kalendář kampaně: 17. března = `Finance.OPERACE_DEADLINE_DEN`) — fragment + příznaky.
   * Starý save po termínu: doplní `operace_odlozena` / příznak vyhodnocení bez modálu.
   */
  async function _vyhodnotMatcinuOperaciRano(den) {
    if (typeof Finance === 'undefined' || typeof Finance.OPERACE_DEADLINE_DEN !== 'number') return;
    const opDen = Finance.OPERACE_DEADLINE_DEN;
    const d = Number(den);
    if (!Number.isFinite(d) || d < 1) return;
    if (State.get('flags.operace_vyhodnoceni_den16_rano') === true) return;

    if (d > opDen) {
      Finance.zkontrolujCilOperace();
      if (State.get('flags.operace_zaplacena') === true) {
        State.set('flags.operace_vyhodnoceni_den16_rano', true);
        State.uloz();
        if (typeof Desk !== 'undefined' && Desk.aktualizujVse) Desk.aktualizujVse();
        return;
      }
      if (State.get('flags.operace_odlozena') !== true) {
        State.set('flags.operace_odlozena', true);
        State.upravRys('Vina', 10, { bezKampanStropu: true });
        if (typeof State.vypoctiUzloveFlagy === 'function') State.vypoctiUzloveFlagy();
      }
      State.set('flags.operace_vyhodnoceni_den16_rano', true);
      State.uloz();
      if (typeof Desk !== 'undefined' && Desk.aktualizujVse) Desk.aktualizujVse();
      return;
    }

    if (d !== opDen) return;

    const paid = State.get('flags.operace_zaplacena') === true;
    if (paid) {
      await _cekejNaFragment('fragment_operace_den16_ano');
    } else {
      State.set('flags.operace_odlozena', true);
      State.upravRys('Vina', 10, { bezKampanStropu: true });
      if (typeof State.vypoctiUzloveFlagy === 'function') State.vypoctiUzloveFlagy();
      await _cekejNaFragment('fragment_operace_den16_ne');
    }
    State.set('flags.operace_vyhodnoceni_den16_rano', true);
    State.uloz();
    if (typeof Desk !== 'undefined' && Desk.aktualizujVse) Desk.aktualizujVse();
  }

  /** Titulek fragmentu s dnem v týdnu před kalendářním datem (viz Narrative.doplnDenVTydneDoTitulku). */
  function _titulFragmentuSDnem(baseF, den) {
    if (!baseF || typeof Narrative === 'undefined' || !Narrative.doplnDenVTydneDoTitulku) return baseF;
    return {
      ...baseF,
      day: Number(den) || Number(State.get('currentDay')) || 1,
      title: Narrative.doplnDenVTydneDoTitulku(baseF.title, den)
    };
  }

  function _cekejNaFragment(id, inlineFragment) {
    return new Promise(resolve => {
      if (inlineFragment) {
        UI.zobrazFragment(inlineFragment, resolve);
      } else if (id) {
        const den = Number(State.get('currentDay')) || 1;
        const f =
          typeof DataLoader !== 'undefined' && DataLoader.ziskejFragment
            ? DataLoader.ziskejFragment(id)
            : null;
        if (f) {
          State.oznacFragment({ id, day: den });
          UI.zobrazFragment(_titulFragmentuSDnem(f, den), resolve);
        } else {
          Narrative.zobrazFragment(id, resolve);
        }
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

  async function _zpracujRevizeDne(den) {
    if (typeof State === 'undefined' || !State.vyzvedniRevizeProDen) return;
    const revize = State.vyzvedniRevizeProDen(den);
    if (!Array.isArray(revize) || revize.length === 0) return;
    for (const rev of revize) {
      const pripad = (typeof DataLoader !== 'undefined' && DataLoader.ziskejPripad)
        ? DataLoader.ziskejPripad(rev.caseId)
        : null;
      const volba = await new Promise(resolve => {
        UI.zobrazReviziPripadu(
          {
            ...rev,
            caseTitle: rev.caseTitle || (pripad && pripad.title) || 'Neznámý spis',
            verdictText: rev.verdictText || '—',
            summaryShort: String(rev.payload && rev.payload.summaryShort || '').trim(),
            optionAText: String(rev.payload && rev.payload.optionAText || '').trim(),
            optionBText: String(rev.payload && rev.payload.optionBText || '').trim(),
            pripad
          },
          choice => resolve(choice)
        );
      });
      if (typeof Cases !== 'undefined' && Cases.zpracujVolbuRevize) {
        const out = Cases.zpracujVolbuRevize(rev, volba);
        if (out && out.note) UI.zobrazStavovouZpravu(out.note);
      }
      Desk.aktualizujVse();
      Music.aktualizujStopu();
      State.uloz();
    }
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
      const nSlot = Number(State.pocetRucnichUlozeni) || 5;
      const castiRucni = [];
      let necoRucniho = false;
      for (let i = 1; i <= nSlot; i++) {
        const ri = State.peekUlozene(i);
        if (ri) necoRucniho = true;
        castiRucni.push('záloha ' + i + ': ' + (ri ? 'den ' + ri.currentDay : 'prázdná'));
      }
      if (ra || necoRucniho) {
        const ta = ra ? 'den ' + ra.currentDay : '—';
        zpravaEl.textContent = 'Automatické uložení: ' + ta + ' · ' + castiRucni.join(' · ');
      }
    }

    overlay.addEventListener('click', () => {
      Music.spustPoInterakci();
      if (typeof SFX !== 'undefined') SFX.spustPoInterakci();
      if (typeof UI !== 'undefined' && UI.zobrazZatemneniPripravyStolu) {
        UI.zobrazZatemneniPripravyStolu();
      }
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.style.display = 'none';
        inicializuj();
      }, 1420);
    });
  }

  return {
    spustDen,
    syncFromSavedState,
    zkontrolujKonecDne,
    spustKonec,
    otevriHaasovuObalku,
    otevriVlcekuvDopis,
    otevriDopisZeStolu
  };

})();

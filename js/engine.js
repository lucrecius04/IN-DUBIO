/**
 * engine.js — Herní smyčka. Řídí tok dní a fází.
 * Spouští den, přechází fázemi, kontroluje konce hry.
 */

const Engine = (() => {

  let _denData = null;

  /**
   * Testování: u dne 1 nespouští dva modaly (modal-fragment) — ranní úvodní text
   * a první dopis z dialogů (Vlček). Obálka / noviny na stole zůstanou, jdou otevřít ručně.
   * Pro ostrý běh hry nastav na `false`.
   */
  const _SKIP_D1_INTRO_MODALS = true;

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

    if (typeof DataLoader.jeHernaDataOK === 'function' && !DataLoader.jeHernaDataOK()) {
      const msg =
        'Herní data se nenačetla (days.json / případy). Otevření přes file:// často fetch blokuje.\n\n' +
        'Spusť stránku přes HTTP z kořene projektu, např.:\n' +
        '  npx --yes serve .\n' +
        'nebo:  python -m http.server\n' +
        'a v prohlížeči otevři zobrazenou URL.';
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
    Desk.inicializujTooltipyRysu();
    Desk.inicializujTooltipyPredmetuStolu();
    if (Desk.inicializujNovinyAObaalkaStolu) Desk.inicializujNovinyAObaalkaStolu();

    // Tlačítko Další den
    document.getElementById('btn-dalsi-den')?.addEventListener('click', () => {
      if (typeof SFX !== 'undefined') SFX.prechodNaDalsiDen();
      _dalsiDen();
    });

    // Složky — capture: spolehlivě i při pointer-events none na obalu #slozky-wrapper; prázdný slot = .slozka--ceka
    for (let i = 0; i < 3; i++) {
      const slozka = document.getElementById('slozka-' + (i + 1));
      if (!slozka) continue;
      const folder = slozka.querySelector('.folder');
      if (!folder) continue;
      const onSlozkaClick = (event) => {
        if (slozka.classList.contains('slozka--ceka')) return;
        const folder = slozka.querySelector('.folder');
        if (!folder) return;
        const rect = folder.getBoundingClientRect();
        if (event.clientY < rect.top) return;
        Cases.otevriPripad(i);
      };
      folder.addEventListener('click', onSlozkaClick, true);
    }

    // Spusť aktuální den
    await spustDen();
  }

  // --- DEN ---

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

    // Neděle — nový pracovní týden: vynulovat týdenní statistiky (násobek Moudrosti řeší sobota večer)
    if (den % 7 === 0) {
      State.resetTydenniStatistikyNedele();
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
      State.set('investigationActionsLeft', 3);
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

    // Aktualizuj vizuál stolu
    State.set('phase', 'morning');
    Desk.aktualizujVse();
    Music.aktualizujStopu();

    // Aktualizuj noviny
    if (_denData) Narrative.aktualizujNoviny(_denData);

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
    if (den === 15 && !State.get('flags.haas_nabidka_den23_vyresena')) {
      await _cekejNaDen23Modal();
    }
    Finance.zkontrolujCilOperace();
    Desk.aktualizujVse();

    // Ranní fragment (den 8 — dopis o operaci jen jednou)
    let morningId = _denData?.morning_fragment;
    if (den === 1 && _SKIP_D1_INTRO_MODALS) {
      morningId = null;
    }
    if (den === 4 && State.get('flags.dopis_operace_den4_viden')) {
      morningId = null;
    }
    if (morningId) {
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
            ...baseF,
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
              ...baseF,
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

    await _zpracujDopisyDne(den, _denData);

    // Adventure scéna: po ranním fragmentu, před načtením případů.
    const adventureScena = _denData && _denData.adventure_scene;
    const adventureDoneKey = adventureScena && adventureScena.id
      ? ('flags.adventure_done_' + adventureScena.id)
      : null;
    const maSpustitAdventure =
      adventureScena &&
      adventureScena.trigger === 'morning_after_fragment' &&
      adventureDoneKey &&
      State.get(adventureDoneKey) !== true;

    if (maSpustitAdventure && UI && typeof UI.zobrazAdventureScenu === 'function') {
      UI.zobrazAdventureScenu(adventureScena, function(vysledek) {
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

        State.set(adventureDoneKey, true);
        if (typeof State.vypoctiUzloveFlagy === 'function') {
          State.vypoctiUzloveFlagy();
        }
        State.uloz();
        _pokracujSpustDen(_denData, den);
      });
      return;
    }

    await _pokracujSpustDen(_denData, den);
  }

  async function _pokracujSpustDen(denData, den) {
    // Případy dne načítáme až po ranním fragmentu / adventure scéně.
    Cases.nastavPripadyProDen(den, denData);
    const pripady = Cases.getPripady();
    UI.aktualizujSlozky(pripady, State.get('casesResolvedToday'));
    Desk.nastavAktivniSpis(null);

    // Revize spisů — v 15denní verzi vypnuto (MIGRACE_20-15)
    // await _zpracujRevizeDne(den);

    // Dialogy postav pro tento den
    await _zpracujDialogyDne(den);

    // Nedělní volba (bez případů — samostatný krok před pokračováním dne)
    if (denData?.nedelni_volba) {
      await new Promise(resolve => {
        UI.zobrazNedelniVolbu(denData, () => {
          Desk.aktualizujVse();
          State.uloz();
          resolve();
        });
      });
    }

    State.set('phase', 'forenoon');
    Desk.aktualizujVse();

    _obnovDopisyNaStoleProDen(denData, den);

    // Skrýt tlačítko do vyřešení případů; po F5 / resume znovu sladit s uloženým casesResolvedToday
    UI.zobrazBtnDalsiDen(false);
    zkontrolujKonecDne(false);
  }

  /**
   * Zarovná runtime s právě načteným State (menu „Načíst hru“ bez reloadu).
   *
   * Follow-up (zatím neřešeno): po F5 stále proběhne celý `spustDen` včetně dialogů —
   * může duplikovat archivní záznamy; idempotentní resume by vyžadovalo flag v State nebo
   * sloučení části uložení s výchozím stavem při `State.nacti()`.
   */
  function syncFromSavedState() {
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
        minDay: 11,
        check: () => integ <= 20 && tv >= 2 && uplatek
      },
      {
        type: 'smireni',
        minDay: 12,
        check: () => integ >= 60 && vina <= 20 && (operPl || fl.benes_identified === true)
      },
      {
        type: 'utek',
        minDay: 13,
        check: () => tk >= 1 && bal > 300 && !operOd
      },
      {
        type: 'atentát',
        minDay: 13,
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
        minDay: 14,
        check: () => tv <= 0 && tz >= 3 && fl.masek_document_signed === true
      },
      {
        type: 'anna',
        minDay: 14,
        check: () => vina <= 20 && bal < 100 && moudr >= 75 && !uplatek && !operPl
      },
      {
        type: 'hrdina',
        minDay: 15,
        check: () => integ >= 80 && odv >= 80
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
    // Skutečný název v kódu: factions.Moc (dokument mluví obecně o "frakce/Moc").
    const mocHodnota = Number.isFinite(Number(factions.Moc)) ? Number(factions.Moc) : 50;

    // 2. KORUPCE (nejdříve D11)
    if (den >= 11
      && u.vlcek_vztah === 'kompromitovan'
      && u.haas_kontakt === 'zavazany'
      && Number(t.Integrita) <= 20) {
      return 'korupce';
    }

    // 5. SMÍŘENÍ (nejdříve D12)
    if (den >= 12
      && u.benes_pravda === 'prijal'
      && u.haas_kontakt !== 'zavazany'
      && Number(t.Integrita) >= 60
      && Number(t.Vina) <= 20) {
      return 'smireni';
    }

    // 4. ÚTĚK (nejdříve D13)
    if (den >= 13
      && u.haas_kontakt !== 'zavazany'
      && u.osobni_cena === 'zaplatil'
      // Skutečný název v kódu: trust.karas (ne flag karas_nabidl_odchod).
      && (tr.karas !== undefined ? Number(tr.karas) >= 2 : false)
      && bal > 300) {
      return 'utek';
    }

    // 6. ATENTÁT (nejdříve D13)
    if (den >= 13
      && u.vlcek_vztah === 'vzdor'
      && u.haas_kontakt === 'odmitnut'
      && u.benes_pravda === 'prijal'
      && Number(t.Odvaha) >= 80
      && mocHodnota <= 20) {
      return 'atentát';
    }

    // 7. KRUH (nejdříve D14)
    if (den >= 14
      && u.vlcek_vztah !== 'vzdor'
      && u.haas_kontakt === 'zavazany'
      && u.benes_pravda !== 'prijal'
      && (f.masek_document_signed === true
          || (tr.zavadova !== undefined ? Number(tr.zavadova) >= 3 : false))) {
      return 'rad';
    }

    // 8. ANNA (nejdříve D14)
    // Skutečný kontrakt pruzkumProcent zatím není; v1 proxy přes Moudrost.
    const pruzkumSplnen = Number(t.Moudrost) >= 60;
    if (den >= 14
      && u.benes_pravda === 'prijal'
      && u.haas_kontakt === 'odmitnut'
      && u.osobni_cena === 'nerozhodl'
      && bal < 100
      && pruzkumSplnen) {
      return 'anna';
    }

    // 3. HRDINA (nejdříve D15)
    if (den >= 15
      && u.vlcek_vztah === 'vzdor'
      && u.haas_kontakt === 'odmitnut'
      && Number(t.Integrita) >= 80
      && Number(t.Odvaha) >= 80) {
      return 'hrdina';
    }

    // 1. PŘEŽITÍ (výchozí D15)
    if (den >= 15) {
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
    const vyresene = State.get('casesResolvedToday');
    const pripadyNactene = Cases.getPripady();
    const vsechnyIds = pripadyNactene.map(p => p && p.id).filter(Boolean);

    // Žádné případy dnes → bez kontroly variabilních konců (prázdný den / neděle bez spisů)
    if (vsechnyIds.length === 0) {
      State.set('phase', 'evening');
      Desk.aktualizujVse();
      UI.zobrazBtnDalsiDen(true);
      return;
    }

    // Všechny případy vyřešeny
    const vsechnyVyreseny = vsechnyIds.every(id => vyresene.includes(id));
    if (!vsechnyVyreseny) {
      return;
    }

    if (!variabilniOk) {
      const fazePred = State.get('phase');
      State.set('phase', 'evening');
      Desk.aktualizujVse();
      if (fazePred !== 'evening') {
        UI.zobrazStavovouZpravu('Dnešní případy jsou uzavřeny.');
      }
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
    UI.zobrazStavovouZpravu('Dnešní případy jsou uzavřeny.');
    setTimeout(() => UI.zobrazBtnDalsiDen(true), 800);
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
    if (den === 1 && _SKIP_D1_INTRO_MODALS) {
      return;
    }
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

  function _klicPendingDeskDopisu(den) {
    return 'pending_desk_letters_day_' + Number(den);
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

  async function _zobrazReakciDopisu(reaction) {
    if (!reaction || !Array.isArray(reaction.options) || reaction.options.length === 0) return;
    const vyber = await new Promise(resolve => {
      UI.zobrazVecerniVolbu({ evening_choice: reaction }, moznost => resolve(moznost || null));
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
    _aplikujEfektyDopisu(dopis.effects);
    await _zobrazReakciDopisu(dopis.reaction);
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

  async function _zpracujDopisyDne(den, denData) {
    if (!denData || !Array.isArray(denData.letters) || denData.letters.length === 0) return;
    const doneKey = _klicZpracovaniDopisu(den);
    if (State.get('flags.' + doneKey) === true) return;
    for (const letterId of denData.letters) {
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
    const letterId = pending.shift();
    const dopis = DataLoader.ziskejDopis(letterId);
    State.set('flags.' + klic, pending);
    if (!dopis) {
      _obnovDopisyNaStoleProDen(_denData, den);
      State.uloz();
      return;
    }
    _zobrazDopisModalem(dopis).then(() => {
      _obnovDopisyNaStoleProDen(_denData, den);
    });
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
      if (typeof Desk.skryjObalkuStoluPoPreceniVlcka === 'function') {
        Desk.skryjObalkuStoluPoPreceniVlcka();
      }
    });

    // Zmačkání dopisu — tíha viny
    State.upravRys('Vina', 3);
    State.uloz();
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
    if (typ === 'korupce') return 'Nadále slouží republice. Vraného případ nikdy nezmínil.';
    return 'Zůstal na místě. Jako vždy.';
  }

  function _epilogHorakova(typ, stav) {
    const trust = stav.trust.horakova;
    if (typ === 'hrdina')        return 'Vydala sérii článků. Tři novináři přišli o práci kvůli ní. Pokračovala.';
    if (trust >= 2)              return 'Napsala o Vraném. Ne o případu — o člověku.';
    return 'Sledovala případ z dálky. Psala o jiných věcech.';
  }

  function _epilogMasek(typ, stav) {
    if (typ === 'korupce') return 'Přivítal Vraného mezi svými. Nikdy o tom nemluvili.';
    return 'Odešel do penze o rok dříve. Bez rozloučení.';
  }

  function _epilogBenes(typ, stav) {
    const identified = stav.flags.benes_identified;
    if (identified && typ === 'hrdina') return 'Přišel na pohřeb. Nestál blízko. Ale byl tam.';
    if (identified) return 'Odešel tiše. Nikdo nevěděl, kdo byl.';
    return 'Starý muž. Vraný nikdy nezjistil, kdo byl.';
  }

  function _epilogNovak(typ, stav) {
    const endingTexty = {
      odvolani: 'Dr. Benedikt Vraný byl odvolán z funkce. Kariéra skončila. Přestěhoval se na venkov.',
      korupce:  'Dr. Benedikt Vraný se stal součástí systému. Přesně tak, jak se bál.',
      'atentát':  'Dr. Benedikt Vraný zemřel 28. března 1931. Příčina nebyla nikdy plně objasněna.',
      preziti:  'Dr. Benedikt Vraný došel na konec roku s rozpačitým úlevou — úřad přežil, tělo taky. Co dál, to už nepsali noviny.',
      hrdina:   'Dr. Benedikt Vraný přežil. A věděl — napravit minulost správnými rozhodnutími nejde. Ale žít s ní — to ano.',
      smireni:  'Dr. Benedikt Vraný si odnesl ticho, ve kterém se dá dýchat. Nebyl čistý — ale nebyl rozbitý.',
      utek:     'Dr. Benedikt Vraný nechal žaluzie stažené. Venku hluk; uvnitř jenom účty, které sedí.',
      rad:      'Dr. Benedikt Vraný si myslel, že slyší smích dozadu. Možná to byl jen větřík v šachtě.',
      anna:     'Dr. Benedikt Vraný večer zhasínal knihu dřív než poslední větu. A přesto usnul lehčeji než včera.'
    };
    return endingTexty[typ] || 'Dr. Benedikt Vraný. 1931.';
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
      if (typeof SFX !== 'undefined') SFX.spustPoInterakci();
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
    otevriVlcekuvDopis,
    otevriDopisZeStolu
  };

})();

/**
 * cases.js — Systém případů.
 * Načítání, zobrazování, průzkum, zpracování rozsudků.
 */

const Cases = (() => {

  /**
   * Balancovací konstanty — měnit zde, efekt se projeví napříč celou mechanikou.
   * Viz docs/playtesting/Jizdni-rad-balancingu.md §2.
   */
  const BALANC = {
    /** Finance navíc za uzavření nerutinního případu (typový příplatek). */
    PRIPLATEK_MORALNI:   25,
    PRIPLATEK_POLITICKY: 35,
    PRIPLATEK_OSOBNI:    30,

    /** Koeficient pro efekty skrytých (průzkumem odemčených) verdiktů. */
    SKRYTY_VERDIKT_KOEF: 1.15,

    /** Škálování všech frakčních delt z rozsudků (JSON + meta + typové doplňky). Vlna A balanc. */
    FRAKCE_DELTA_SCALE: 0.75,

    /** Výchozí finanční penalizace dirty path (neoficiální zdroj) podle ceny slotu v kapkách. */
    DIRTY_FINANCE_1_KAPKA: -12,
    DIRTY_FINANCE_2_KAPKY: -20,

    /** Meta-vrstva: procesní kvalita — bonus/malus Moudrosti a Viny. */
    META_PROCESNI_VYSOKA_MOUD:  1,
    META_PROCESNI_VYSOKA_INT:   1,
    META_PROCESNI_VYSOKA_VINA: -1,
    META_PROCESNI_STREDNI_MOUD: 1,
    META_PROCESNI_NIZKA_MOUD:  -1,
    META_PROCESNI_NIZKA_VINA:   1,

    /** Meta-vrstva: normativní směr — frakční pohyby. */
    META_NORM_LEGALISTNI_MOC:  2,
    META_NORM_LEGALISTNI_LID: -2,
    META_NORM_SOCIALNI_LID:    2,
    META_NORM_SOCIALNI_MOC:   -1,
    META_NORM_SOCIALNI_KAP:   -1,
    META_NORM_VYVAZENY_INT:    1,

    /** Vlna B: zpomalení růstu Viny u tvrdých trestních verdiktů (×0,75 pozitivní delta). */
    VINA_GUILTY_TRESTNI_SCALE: 0.75,
    /** Vlna J/L1: guilty — menší růst Viny; trestní navíc ×0,75 výše. */
    VINA_GUILTY_POS_SCALE: 0.45,
    /** Vlna L1: NG — silnější úleva Viny (záporná delta ×1,15). */
    VINA_NG_NEG_SCALE: 1.15,
    /** Vlna L1: guilty při Vina ≥70 — max. +2 z jednoho verdiktu. */
    VINA_GUILITY_HIGH_PRAG: 70,
    VINA_GUILITY_HIGH_CAP: 2,
    /** Vlna L1: kampaní strop z běžných rozsudků (výjimky: úplatek, příběh). */
    VINA_KAMPAN_STROP: 92,

    /** Vlna B: jednorázový fragment po překročení prahu Viny. */
    VINA_KRIZE_PRAG: 80,

    /** Vlna C: guilty zvyšuje odměny, NG je zhoršuje — oddělení ekonomických větví. */
    GUILTY_FINANCE_BONUS: 1.26,
    NOT_GUILTY_FINANCE_BONUS_SCALE: 0.85,
    NOT_GUILTY_FINANCE_PENAL_SCALE: 1.06,
    INSUFFICIENT_FINANCE_BONUS_SCALE: 0.94,

    /** Vlna C: fragmenty při extrémních frakcích. */
    FRAKCE_KRIZE_PRAG: 72,

    /** Vlna G: škálování delt rysů podle skupiny verdiktu (pestřejší profily). */
    TRAIT_DELTA_SCALE_NG: 0.55,
    /** NG: Integrita roste pomaleji než Odvaha (čisté větve nemají všichni INT 95+). */
    TRAIT_DELTA_SCALE_NG_INT: 0.48,
    /** NG: naděje z „spravedlivých“ verdiktů — méně růžových konců. */
    TRAIT_DELTA_SCALE_NG_NAD: 0.58,
    TRAIT_DELTA_SCALE_NG_MOU: 0.75,
    /** Guilty: tvrdý trest bere naději víc než zákonný rámec. */
    TRAIT_DELTA_SCALE_GUILTY_NEG_NAD: 1.12,
    TRAIT_DELTA_SCALE_INSUFFICIENT: 0.85,
    /** Kladná Integrita/Odvaha u guilty — trestní přísnost neroste „ctnost“. */
    TRAIT_DELTA_SCALE_GUILTY_POS_INT_ODV: 0.35,
    /** Záporná Integrita/Odvaha u guilty — pokles cti za tvrdý trest. */
    TRAIT_DELTA_SCALE_GUILTY_NEG_INT_ODV: 1.35,
    /** Max. absolutní změna jednoho rysu z jednoho rozsudku (po sloučení JSON + typ + meta). */
    TRAIT_DELTA_CAP_PER_VERDIKT: 4,
    TYP_POLITICKY_INT_SWING: 3,
    TYP_OSOBNI_FAIR_INT: 2,
    TYP_OSOBNI_FAIR_ODV: 1,
    TYP_OSOBNI_BIAS_VINA: 4,
    TYP_MORALNI_PRUZKUM_MOUD: 2,
  };

  // Aktuálně otevřené případy dne
  let _pripady = [];
  let _onRozsudekCallback = null;

  /**
   * Vždy 3 položky (index = slot složky I–III). Chybějící / neznámé id → null
   * (UI „načítání“). První tři prvky vstupu bereme podle indexu — nesvařovat
   * přes filter(Boolean), jinak se z [idA, null, idC] stane [idA, idC] a sloty se zhorší.
   */
  function nastavPripadyDne(ids, casesLight) {
    const raw = Array.isArray(ids) ? ids : [];
    const light = Array.isArray(casesLight) ? casesLight : [];
    const tri = [0, 1, 2].map(i => {
      const x = raw[i];
      if (x == null || String(x).trim() === '') return null;
      return String(x).trim();
    });
    _pripady = tri.map((mid, i) => {
      if (mid == null) return null;
      const c = DataLoader.ziskejPripad(mid);
      if (!c) console.warn('[Cases] nenašel případ pro id:', mid);
      if (!c) return null;
      if (light[i]) {
        return { ...c, _lightMode: true };
      }
      return c;
    });
  }

  function _aktZDne(den) {
    const d = Number(den);
    if (!Number.isFinite(d)) return 1;
    if (d <= 19) return 1;
    return 3;
  }

  /** Pole případů z jednoho JSON souboru aktu (stejné pořadí jako v souboru). */
  function _polePripaduProAkt(akt) {
    const n = Number(akt);
    const klic = n === 2 ? 'casesAkt2' : n === 3 ? 'casesAkt3' : 'casesAkt1';
    if (typeof DataLoader === 'undefined' || !DataLoader.ziskej) return [];
    const pole = DataLoader.ziskej(klic);
    return Array.isArray(pole) ? pole : [];
  }

  /**
   * Slot I–III = 1.–3. případ v daném aktu s `day === den` (pořadí v JSON).
   * Není pole `slot` v datech — index ve filtrovaném seznamu = číslo složky.
   */
  function _triPripadyDleDne(den) {
    const d = Number(den);
    if (!Number.isFinite(d) || d < 1) return [null, null, null];
    const zdroj = _polePripaduProAkt(_aktZDne(d));
    const naDen = zdroj.filter(c => c && Number(c.day) === d);
    return [0, 1, 2].map(i => naDen[i] || null);
  }

  function _pripadPatriDoAktu(c, akt) {
    const d = Number(c.day);
    if (!Number.isFinite(d)) return false;
    if (akt === 1) return d >= 1 && d <= 19;
    if (akt === 2) return d >= 11 && d <= 20;
    return d >= 21 && d <= 30;
  }

  const POVOLENE_TYPY = ['rutinni', 'moralni', 'politicky', 'osobni'];
  const _POVOLENE_SET = new Set(POVOLENE_TYPY);
  const _PATH_SKORE_OFFICIAL = 2;
  const _PATH_SKORE_UNOFFICIAL = -2;
  const _PATH_SKORE_CONFRONTATION = 3;
  const _PATH_SKORE_CAP = 6;

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
    if (t === 'routine') return 'rutinni';
    /* Anglický export z nástrojů / starší JSON — červená složka = politicky */
    if (t === 'political') return 'politicky';
    if (t === 'personal') return 'osobni';
    if (t === 'moral_dilemma' || t === 'moraldilemma') return 'moralni';
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

  function _duveraKlicProPozadavek(npc) {
    if (npc === 'horakova') return 'zavadova';
    if (npc === 'masek') return 'karas';
    return npc;
  }

  function _frakceKlicProPozadavek(fak) {
    if (fak === 'Stat') return 'Moc';
    if (fak === 'Obchodnici') return 'Kapital';
    return fak;
  }

  function _caseMeetsRequirements(c) {
    const req = c.requires;
    if (!req || typeof req !== 'object') return true;
    if (req.trust && typeof req.trust === 'object') {
      for (const [npc, min] of Object.entries(req.trust)) {
        const klic = _duveraKlicProPozadavek(npc);
        const v = State.get('trust.' + klic);
        if (Number(v) < Number(min)) return false;
      }
    }
    if (req.factions && typeof req.factions === 'object') {
      for (const [fak, min] of Object.entries(req.factions)) {
        const klic = _frakceKlicProPozadavek(fak);
        const v = State.get('factions.' + klic);
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
      const moc = Number(f.Moc ?? f.Stat);
      if (Number.isFinite(moc) && moc > 70) m *= 0.85;
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

  /**
   * Pool náhodných případů rozdělený podle `_efektivniTyp` (JSON `type` po normalizaci).
   * Recurring / již použité / povinné id jsou vyřazeny stejně jako dřív.
   */
  function _poolsNahodnychKandidatu(den, jizVybrane, povinneIdsSet) {
    const pools = { rutinni: [], moralni: [], politicky: [], osobni: [] };
    const vsechny = DataLoader.ziskej('cases');
    if (!vsechny || !vsechny.length) return pools;
    const akt = _aktZDne(den);
    const used = State.get('usedCaseIds') || [];
    const vylouceno = new Set(jizVybrane.filter(Boolean));
    for (const pid of povinneIdsSet) vylouceno.add(pid);

    for (const c of vsechny) {
      if (!c || !c.id) continue;
      if (c.recurring === true) continue;
      if (!_pripadPatriDoAktu(c, akt)) continue;
      if (used.includes(c.id)) continue;
      if (vylouceno.has(c.id)) continue;
      if (!_caseMeetsRequirements(c)) continue;
      const typ = _efektivniTyp(c);
      if (!_typJePovolenProDen(den, typ)) continue;
      if (!pools[typ]) pools[typ] = [];
      pools[typ].push(c.id);
    }
    return pools;
  }

  /**
   * Váhy dne určí pravděpodobnost TYPu (50/35/15 u dne 8), uvnitř typu je případ rovnoměrně.
   * Dříve se váha násobila počtem případů v typu → rutinní převažovaly jen kvůli velikosti poolu.
   */
  function _vyberNahodneId(den, slotIndex, jizVybrane, povinneIdsSet) {
    const vsechny = DataLoader.ziskej('cases');
    if (!vsechny || !vsechny.length) return null;
    const akt = _aktZDne(den);
    const stav = State.get();
    const used = State.get('usedCaseIds') || [];
    const zaklad = _vahyTypuProDen(den);
    const vylouceno = new Set(jizVybrane.filter(Boolean));
    for (const pid of povinneIdsSet) vylouceno.add(pid);

    const pools = _poolsNahodnychKandidatu(den, jizVybrane, povinneIdsSet);
    const pocty = Object.fromEntries(POVOLENE_TYPY.map(t => [t, (pools[t] || []).length]));
    const celkem = POVOLENE_TYPY.reduce((n, t) => n + pocty[t], 0);

    const typVahy = {};
    for (const typ of POVOLENE_TYPY) {
      if (!pocty[typ]) continue;
      const w0 = zaklad[typ] != null ? zaklad[typ] : 0;
      if (w0 <= 0) continue;
      const w = w0 * _vahaStavHry(typ, stav);
      if (w > 0) typVahy[typ] = w;
    }

    const typyKNahode = Object.keys(typVahy);
    if (typyKNahode.length) {
      let sumTyp = 0;
      for (const t of typyKNahode) sumTyp += typVahy[t];
      let r = Math.random() * sumTyp;
      let zvolenyTyp = typyKNahode[typyKNahode.length - 1];
      for (const t of typyKNahode) {
        r -= typVahy[t];
        if (r <= 0) {
          zvolenyTyp = t;
          break;
        }
      }
      const arr = pools[zvolenyTyp];
      const id = arr[Math.floor(Math.random() * arr.length)];
      const modStav = Object.fromEntries(
        typyKNahode.map(t => [t, Number(_vahaStavHry(t, stav).toFixed(3))])
      );
      console.log('[Cases] výběr slot', slotIndex, 'den', den, {
        zvolenyTyp,
        vybraneId: id,
        vahaZvolenehoTypu: Number(typVahy[zvolenyTyp].toFixed(2)),
        zakladniVahyDne: zaklad,
        modifikatoryStavu: modStav,
        poctyVPoolech: pocty,
        duvod: 'typ podle vah dne×stav, případ náhodně z poolu daného typu'
      });
      return id;
    }

    const kandidati = [];
    for (const c of vsechny) {
      if (!c || !c.id) continue;
      if (c.recurring === true) continue;
      if (!_pripadPatriDoAktu(c, akt)) continue;
      if (used.includes(c.id)) continue;
      if (vylouceno.has(c.id)) continue;
      if (!_caseMeetsRequirements(c)) continue;
      if (!_typJePovolenProDen(den, _efektivniTyp(c))) continue;
      kandidati.push(c.id);
    }

    if (!kandidati.length) {
      console.warn('[Cases] žádný kandidát pro náhodný výběr, den', den, 'slot', slotIndex, { pocty, pouzite: used.length });
      return null;
    }
    const id = kandidati[Math.floor(Math.random() * kandidati.length)];
    console.warn('[Cases] fallback výběr (typové váhy 0 nebo prázdné typy), den', den, 'slot', slotIndex, 'id', id, { pocty, zaklad });
    return id;
  }

  /**
   * Tři složky = první tři případy z JSON aktu (`cases-akt1.json` …) s `day === den`, v pořadí v poli.
   * Kalendář `days.json` už sloty nedefinuje — jen engine dál čte večerní volby apod. z denData.
   */
  function nastavPripadyProDen(den, denData) {
    const d = Number(den);
    if (denData == null || typeof denData !== 'object') {
      console.warn('[Cases] nastavPripadyProDen: denData chybí (days.json?) — složky stejně z pole případů aktu.');
    }
    const idsZDne = denData && Array.isArray(denData.cases) ? denData.cases : null;
    /* Explicitní prázdné pole = žádné spisy (sobota, neděle, …) — nesmí spadnout do _triPripadyDleDne. */
    if (idsZDne != null) {
      const light = denData && Array.isArray(denData.cases_light) ? denData.cases_light : [];
      nastavPripadyDne(idsZDne, light);
      console.log('[Cases] nastavPripadyProDen z days.json.cases', {
        den: d,
        slotId: _pripady.map(p => (p && p.id) || null),
        prazdnyDen: idsZDne.length === 0
      });
      return;
    }
    const tri = _triPripadyDleDne(d);
    _pripady = tri;
    const naDen = _polePripaduProAkt(_aktZDne(d)).filter(c => c && Number(c.day) === d);
    console.log('[Cases] nastavPripadyProDen', {
      den: d,
      akt: _aktZDne(d),
      zdrojSoubor: d <= 19 ? 'cases-akt1.json (fallback)' : 'cases-akt2+',
      pripaduNaDen: naDen.length,
      slotId: tri.map(p => (p && p.id) || null)
    });
  }

  function getPripady() {
    return _pripady;
  }

  /**
   * Třetí spis (light): bez průzkumu, první svědectví, dva základní rozsudky.
   */
  function _pripravPripadLightRezim(p) {
    if (!p || !p._lightMode) return p;
    const v = Array.isArray(p.verdicts) ? p.verdicts.slice() : [];
    const guilty = v.find(x => /guilty/i.test(String(x.id || '')));
    const notg = v.find(x => /not_guilty/i.test(String(x.id || '')));
    const testim = Array.isArray(p.testimony) && p.testimony[0] ? [p.testimony[0]] : p.testimony;
    const verdicts = [guilty, notg].filter(Boolean);
    return {
      ...p,
      hidden_info: [],
      testimony: testim,
      verdicts: verdicts.length > 0 ? verdicts : v
    };
  }

  function otevriPripad(index) {
    const denHry = State.get('currentDay');
    const pripad = _pripady[index];
    console.log('[Cases] klik složka', {
      slotIndex: index,
      currentDay: denHry,
      pripadId: pripad && pripad.id,
      maPripad: !!pripad,
      poleSlotu: _pripady.map((p, i) => (p && p.id) || null)
    });

    if (!pripad) {
      console.warn('[Cases] klik složka — žádný případ v _pripady[' + index + ']');
      UI.zobrazStavovouZpravu('V této složce dnes není přiřazený spis.');
      return;
    }

    try {
      if (State.jePripadUzavren(pripad.id)) {
        console.log('[Cases] otevírám případ jen ke čtení (už vyřešeno):', pripad.id);
        UI.zobrazPripadReadonly(pripad);
        return;
      }

      if (typProZobrazeni(pripad) === 'politicky') {
        Music.nastavKontext('tension');
      }

      const otevriNorm = () => {
        const pZobraz = _pripravPripadLightRezim(pripad);
        console.log('[Cases] otevírám modál případu:', pripad.id, pripad._lightMode ? '(light)' : '', '(title, situation, svědectví, rozsudky z JSON)');
        UI.zobrazPripad(pZobraz, (p, r) => zpracujRozsudek(pripad, r));
      };

      const denN = Number(State.get('currentDay'));
      if (Number.isFinite(denN) && denN % 7 === 1 && State.get('pondeli_vina_emotivni')) {
        const typ = typProZobrazeni(pripad);
        if (typ === 'moralni' || pripad.emotional === true) {
          State.set('pondeli_vina_emotivni', false);
          UI.zobrazFragment({
            type:  'fragment',
            title: 'Pondělí',
            text:  'Nedělní ticho skončilo. Ben otevřel první spis a poznal, že tentokrát nepůjde jen o pořádek v protokolu. Případ se dotkne věcí, které si člověk běžně nechává mimo soudní síň.',
            narrative_image: 'morning'
          }, otevriNorm);
          return;
        }
      }

      otevriNorm();
      console.log('[Cases] klik složka — modál zavolán bez chyby.');
    } catch (err) {
      console.error('[Cases] klik složka — výjimka při otevírání:', err);
      UI.zobrazStavovouZpravu(err && err.message ? String(err.message) : String(err));
    }
  }

  function _zaznamenejKampanStatistiky(pripad, rozsudek) {
    let k = State.get('kampan_statistiky');
    if (!k || typeof k !== 'object') {
      k = {
        pripady_celkem: 0,
        pripady_s_prurzkumem: 0,
        verdikty_guilty: 0,
        verdikty_ng: 0,
        verdikty_insufficient: 0,
        verdikty_tvrdy: 0,
        uplatky_prijaty: 0
      };
      State.set('kampan_statistiky', k);
    }
    k.pripady_celkem = (Number(k.pripady_celkem) || 0) + 1;
    if (_pocetOdhalenychInfo(pripad) > 0) {
      k.pripady_s_prurzkumem = (Number(k.pripady_s_prurzkumem) || 0) + 1;
    }
    if (rozsudek) {
      const rid = String(rozsudek.id || '').toLowerCase();
      if (rid === 'uplatek') {
        k.uplatky_prijaty = (Number(k.uplatky_prijaty) || 0) + 1;
      } else {
        const sk = _skupinaVerdiktuProBalanc(rid);
        if (sk === 'guilty') k.verdikty_guilty = (Number(k.verdikty_guilty) || 0) + 1;
        else if (sk === 'not_guilty') k.verdikty_ng = (Number(k.verdikty_ng) || 0) + 1;
        else if (sk === 'insufficient') {
          k.verdikty_insufficient = (Number(k.verdikty_insufficient) || 0) + 1;
        }
        if (_verdiktJeTvrdyNaZlocin(rozsudek)) {
          k.verdikty_tvrdy = (Number(k.verdikty_tvrdy) || 0) + 1;
        }
      }
    }
  }

  function _zaznamenejTydenniStatistiky(pripad, rozsudek) {
    _zaznamenejKampanStatistiky(pripad, rozsudek);

    const den = Number(State.get('currentDay'));
    if (!Number.isFinite(den) || den % 7 === 0) return;

    let t = State.get('tydenni_statistiky');
    if (!t || typeof t !== 'object') return;

    t.pripady_celkem = (Number(t.pripady_celkem) || 0) + 1;

    if (_pocetOdhalenychInfo(pripad) > 0) {
      t.pripady_s_prurzkumem = (Number(t.pripady_s_prurzkumem) || 0) + 1;
    }

    const rid = String(rozsudek.id || '').toLowerCase();
    if (rid.includes('postpone') || rid.includes('odloz') || rid === 'odlozit') {
      t.pripady_odlozeny = (Number(t.pripady_odlozeny) || 0) + 1;
    }

    const tr = rozsudek.consequences && rozsudek.consequences.traits;
    if (tr && typeof tr === 'object') {
      const di = Number(tr.Integrita);
      const dn = Number(tr.Nadeje);
      if ((Number.isFinite(di) && di <= -3) || (Number.isFinite(dn) && dn <= -3)) {
        t.tezke_rozsudky = (Number(t.tezke_rozsudky) || 0) + 1;
      }
    }

    const vs = Array.isArray(t.verdikty_smer) ? t.verdikty_smer : [];
    const pr = posoudPruzkumProVerdikt(pripad, rozsudek);
    vs.push({
      tough:  _verdiktJeTvrdyNaZlocin(rozsudek),
      fair:   _verdiktJeFairKChudym(rozsudek),
      pruzkum: !!pr.pouzitPruzkum
    });
    while (vs.length > 24) vs.shift();
    t.verdikty_smer = vs;

    State.set('tydenni_statistiky', t);
  }

  function _sloucitDeltaObj(a, b) {
    const o = { ...(a || {}) };
    for (const [k, v] of Object.entries(b || {})) {
      const n = Number(v);
      if (!Number.isFinite(n) || n === 0) continue;
      o[k] = (Number(o[k]) || 0) + n;
    }
    return o;
  }

  /**
   * Sloučí základní consequences verdiktu s typovým doplnkem (penalizace / odměny).
   * `_ui_finance_label` — vlastní řádek 💰 v modalu důsledků.
   */
  function sloucitDusledky(base, extra) {
    const b = base || {};
    const e = extra || {};
    const out = {
      traits: _sloucitDeltaObj(b.traits, e.traits),
      factions: _sloucitDeltaObj(b.factions, e.factions),
      trust: _sloucitDeltaObj(b.trust, e.trust),
      finance: (Number(b.finance) || 0) + (Number(e.finance) || 0),
      flags: [...(b.flags || []), ...(e.flags || [])]
    };
    if (e._ui_finance_label) out._ui_finance_label = e._ui_finance_label;
    return out;
  }

  const _SKRYTY_VERDIKT_KOEF = BALANC.SKRYTY_VERDIKT_KOEF;
  const _SKRYTY_CAP = {
    traits: 12,
    factions: 12,
    trust: 2,
    finance: 250
  };

  function _clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function _vynasobDeltaObjCap(obj, coef, capAbs) {
    const out = {};
    for (const [k, raw] of Object.entries(obj || {})) {
      const n = Number(raw);
      if (!Number.isFinite(n) || n === 0) continue;
      const scaled = Math.round(n * coef);
      if (scaled === 0) continue;
      out[k] = _clamp(scaled, -Math.abs(capAbs), Math.abs(capAbs));
    }
    return out;
  }

  function _applyHiddenVerdictMultiplier(base) {
    const src = base || {};
    const out = {
      ...src,
      traits: _vynasobDeltaObjCap(src.traits, _SKRYTY_VERDIKT_KOEF, _SKRYTY_CAP.traits),
      factions: _vynasobDeltaObjCap(src.factions, _SKRYTY_VERDIKT_KOEF, _SKRYTY_CAP.factions),
      trust: _vynasobDeltaObjCap(src.trust, _SKRYTY_VERDIKT_KOEF, _SKRYTY_CAP.trust),
      finance: _clamp(
        Math.round((Number(src.finance) || 0) * _SKRYTY_VERDIKT_KOEF),
        -_SKRYTY_CAP.finance,
        _SKRYTY_CAP.finance
      ),
      flags: [...(src.flags || [])]
    };
    if (src._ui_finance_label) out._ui_finance_label = src._ui_finance_label;
    return out;
  }

  function _nejvetsiKladnaFrakceZFactions(f) {
    if (!f || typeof f !== 'object') return null;
    let bestK = null;
    let bestV = 0;
    for (const [k, v] of Object.entries(f)) {
      const n = Number(v);
      if (Number.isFinite(n) && n > bestV) {
        bestV = n;
        bestK = k;
      }
    }
    return bestK && bestV > 0 ? bestK : null;
  }

  function _inferPoliticalStance(rozsudek) {
    const raw = rozsudek && (rozsudek.political_stance || rozsudek.vlcek_stance);
    const s = String(raw || '').toLowerCase();
    if (s === 'independent' || s === 'against_vlcek' || s === 'against') return 'independent';
    if (s === 'system' || s === 'for_vlcek' || s === 'for') return 'system';
    const c = rozsudek.consequences || {};
    const t = c.trust || {};
    const f = c.factions || {};
    const fMoc = Number(f.Moc ?? f.Stat);
    if (Number(t.vlcek) >= 1 && Number.isFinite(fMoc) && fMoc >= 5) return 'system';
    if (Number(t.vlcek) <= -1 || (Number.isFinite(fMoc) && fMoc <= -8)) return 'independent';
    return null;
  }

  /**
   * Typové bonusy / pokuty + texty do okna důsledků (kromě morální poznámky k průzkumu — tu má `#dusledky-pruzkum-poznamka`).
   * @returns {{ doplnek: object, narativ: string[] }}
   */
  function vypoctiTypoveDoplnky(pripad, rozsudek) {
    if (rozsudek && String(rozsudek.id) === 'uplatek') {
      return {
        doplnek: { traits: {}, factions: {}, trust: {}, finance: 0, flags: [] },
        narativ: [],
        meta: {
          procesniKvalita: { key: 'nizka', label: 'procesně slabé' },
          normativniSmer: { key: 'vyvazeny', label: 'normativně vyvážené' }
        }
      };
    }

    const typ = _efektivniTyp(pripad);
    const pr = posoudPruzkumProVerdikt(pripad, rozsudek);
    const procesniKvalita = _vyhodnotProcesniKvalitu(pripad, rozsudek);
    const normativniSmer = _urciNormativniSmerVerdiktu(rozsudek);
    const pouzit = pr.pouzitPruzkum;
    const soulad = pr.soulad;
    const doplnek = { traits: {}, factions: {}, trust: {}, finance: 0, flags: [] };
    const narativ = [];

    if (typ === 'moralni' && pouzit) {
      doplnek.traits.Moudrost = (doplnek.traits.Moudrost || 0) + BALANC.TYP_MORALNI_PRUZKUM_MOUD;
    }

    const c0 = rozsudek.consequences || {};
    const tr0 = c0.traits || {};
    const intD = Number(tr0.Integrita);
    const nadD = Number(tr0.Nadeje);
    if (typ === 'moralni' && ((Number.isFinite(intD) && intD <= -5) || (Number.isFinite(nadD) && nadD <= -5))) {
      doplnek.traits.Odvaha = (doplnek.traits.Odvaha || 0) + 2;
    }

    if (typ === 'moralni' && soulad) {
      const fk = _nejvetsiKladnaFrakceZFactions(c0.factions);
      if (fk) doplnek.factions[fk] = (doplnek.factions[fk] || 0) + 5;
    }

    if (typ === 'moralni') {
      doplnek.finance = (Number(doplnek.finance) || 0) + BALANC.PRIPLATEK_MORALNI;
      doplnek._ui_finance_label = `Odměna za uzavření morálního případu (+${BALANC.PRIPLATEK_MORALNI} Kčs)`;
    }

    if (typ === 'politicky') {
      const stance = _inferPoliticalStance(rozsudek);
      if (stance === 'independent') {
        doplnek.traits.Integrita = (doplnek.traits.Integrita || 0) + BALANC.TYP_POLITICKY_INT_SWING;
        doplnek.factions.Moc = (doplnek.factions.Moc || 0) - 6;
        narativ.push('Rozhodl jsi nezávisle.');
      } else if (stance === 'system') {
        doplnek.traits.Integrita = (doplnek.traits.Integrita || 0) - BALANC.TYP_POLITICKY_INT_SWING;
        doplnek.factions.Moc = (doplnek.factions.Moc || 0) + 6;
        narativ.push('Systém si tvůj rozsudek zapíše.');
      }
      if (pouzit && soulad) {
        doplnek.traits.Moudrost = (doplnek.traits.Moudrost || 0) + 3;
      }
      doplnek.finance = (Number(doplnek.finance) || 0) + BALANC.PRIPLATEK_POLITICKY;
      doplnek._ui_finance_label = `Odměna za uzavření politického případu (+${BALANC.PRIPLATEK_POLITICKY} Kčs)`;
    }

    if (typ === 'osobni') {
      const pid = String(pripad && pripad.id || '').trim();
      /** Haas / obálka — hotovost jen z varianty verdiktu (JSON), ne „úřední“ +30 za osobní spis. */
      const bezTypoveOdmMerOsobni = pid === 'tyc_haas_d11';

      const po = rozsudek.personal_outcome;
      if (po === 'fair') {
        doplnek.traits.Integrita = (doplnek.traits.Integrita || 0) + BALANC.TYP_OSOBNI_FAIR_INT;
        doplnek.traits.Odvaha = (doplnek.traits.Odvaha || 0) + BALANC.TYP_OSOBNI_FAIR_ODV;
        narativ.push('Osobní vazby tě neovlivnily.');
      } else if (po === 'biased') {
        doplnek.traits.Vina = (doplnek.traits.Vina || 0) + BALANC.TYP_OSOBNI_BIAS_VINA;
        narativ.push('Doufáš že si toho nikdo nevšiml.');
      }
      if (pouzit) {
        doplnek.traits.Moudrost = (doplnek.traits.Moudrost || 0) + 2;
        doplnek.traits.Vina = (doplnek.traits.Vina || 0) - 2;
      }
      if (!bezTypoveOdmMerOsobni) {
        doplnek.finance = (Number(doplnek.finance) || 0) + BALANC.PRIPLATEK_OSOBNI;
        doplnek._ui_finance_label = `Odměna za uzavření osobního případu (+${BALANC.PRIPLATEK_OSOBNI} Kčs)`;
      }
    }

    const metaMix = _metaDoplnkyZaKvalituANormu(procesniKvalita, normativniSmer);
    const finalDoplnek = sloucitDusledky(doplnek, metaMix.doplnek);
    narativ.push(...metaMix.narativ);

    return {
      doplnek: finalDoplnek,
      narativ,
      meta: {
        procesniKvalita,
        normativniSmer
      }
    };
  }

  function _jeSkrytyVerdiktOdemceny(pripad, rozsudek) {
    const vid = String(rozsudek && rozsudek.id || '').trim();
    if (!pripad || !vid) return false;
    const infoPrahy = _informacniPrahyMap(pripad, 'verdicts');
    const info = vypoctiInformovanostPripadu(pripad);
    const infoPct = Number(info && info.pct);
    const odemcenInfoPrahem =
      infoPrahy.has(vid) &&
      Number.isFinite(infoPct) &&
      infoPct >= Number(infoPrahy.get(vid));

    const potvrzeni = _cluePotvrzeni(pripad);
    let odemcenClue = false;
    if (potvrzeni) {
      const rewards = _clueRewardsProSilu(pripad, potvrzeni.strength);
      const unlockVerdicts = (rewards && Array.isArray(rewards.unlock_verdict_ids))
        ? rewards.unlock_verdict_ids.map(x => String(x || '').trim()).filter(Boolean)
        : [];
      odemcenClue = unlockVerdicts.includes(vid);
    }
    return odemcenInfoPrahem || odemcenClue;
  }

  function pripravSlouceneDusledky(pripad, rozsudek) {
    const baseRaw = JSON.parse(JSON.stringify(rozsudek.consequences || {}));
    const hiddenVerdictBoost = _jeSkrytyVerdiktOdemceny(pripad, rozsudek);
    const base = hiddenVerdictBoost ? _applyHiddenVerdictMultiplier(baseRaw) : baseRaw;
    const { doplnek, narativ, meta } = vypoctiTypoveDoplnky(pripad, rozsudek);
    const merged = _upravMergedBalanc(sloucitDusledky(base, doplnek), rozsudek);
    return {
      merged,
      typNarativ: narativ,
      meta: {
        ...(meta || {}),
        hiddenVerdictBoost
      }
    };
  }

  /** +1 sdílená akce průzkumu po uzavření morálního / politického / osobního spisu. */
  function _bonusInkoustZaNarocnySpis(pripad) {
    if (!pripad || typeof State === 'undefined') return;
    const t = typProZobrazeni(pripad);
    if (t === 'rutinni' || !t) return;
    const cur = Number(State.get('investigationActionsLeft')) || 0;
    State.set('investigationActionsLeft', cur + 1);
  }

  function _defaultDirtyFinanceDelta(costKapky) {
    const c = Math.max(1, Number(costKapky) || 1);
    return c >= 2 ? BALANC.DIRTY_FINANCE_2_KAPKY : BALANC.DIRTY_FINANCE_1_KAPKA;
  }

  function _dirtySpecProInfo(info) {
    if (!info || info.dirty_unlock === false) return null;
    if (String(info.action || '') === 'confrontation') return null;
    const rawCost = Number(info.cost) > 0 ? Number(info.cost) : 1;
    const spec = {
      finance: _defaultDirtyFinanceDelta(rawCost),
      traits: { Integrita: -2, Vina: 1 },
      factions: {},
      trust: {}
    };
    const o = info.dirty_unlock;
    if (o && typeof o === 'object') {
      if ('finance' in o && o.finance != null) spec.finance = Number(o.finance);
      if (o.traits && typeof o.traits === 'object') {
        for (const [k, v] of Object.entries(o.traits)) {
          if (v != null) spec.traits[k] = Number(v);
        }
      }
      if (o.factions && typeof o.factions === 'object') {
        for (const [k, v] of Object.entries(o.factions)) {
          if (v != null) spec.factions[k] = Number(v);
        }
      }
      if (o.trust && typeof o.trust === 'object') {
        for (const [k, v] of Object.entries(o.trust)) {
          if (v != null) spec.trust[k] = Number(v);
        }
      }
    }
    return spec;
  }

  /** Součet všech neoficiálně odhalených průzkumů v daném spisu (bez výčtu jednotlivostí). */
  function _souhrnNeoficialnichZdroju(pripad) {
    const out = { count: 0, finance: 0, traits: {}, factions: {}, trust: {} };
    if (!pripad || typeof State === 'undefined' || !Array.isArray(pripad.hidden_info)) return out;
    const cid = String(pripad.id || '').trim();
    if (!cid) return out;
    for (const info of pripad.hidden_info) {
      if (!info || !info.id) continue;
      if (!State.jeInfoOdhaleno || !State.jeInfoOdhaleno(cid, info.id)) continue;
      if (!State.zpusobOdhaleniInfo || State.zpusobOdhaleniInfo(cid, info.id) !== 'unofficial') continue;
      const spec = _dirtySpecProInfo(info);
      if (!spec) continue;
      out.count += 1;
      out.finance += Number(spec.finance) || 0;
      for (const [k, d] of Object.entries(spec.traits || {})) {
        const v = Number(d) || 0;
        if (!v) continue;
        out.traits[k] = (Number(out.traits[k]) || 0) + v;
      }
      for (const [k, d] of Object.entries(spec.factions || {})) {
        const v = Number(d) || 0;
        if (!v) continue;
        out.factions[k] = (Number(out.factions[k]) || 0) + v;
      }
      for (const [k, d] of Object.entries(spec.trust || {})) {
        const v = Number(d) || 0;
        if (!v) continue;
        out.trust[k] = (Number(out.trust[k]) || 0) + v;
      }
    }
    return out;
  }

  function zpracujPrijetiUplatekPoModalu(pripad) {
    if (!pripad || !pripad.bribe_amount) return;
    if (State.jePripadUzavren(pripad.id)) return;
    const castka = Number(pripad.bribe_amount) || 0;
    const rozsudek = {
      id:          'uplatek',
      text:        'Přijmout úplatek',
      consequence: 'Hotovost změní průběh dne — ne zákon.',
      consequences: {
        traits:   { Integrita: -12, Nadeje: -5, Vina: 3 },
        factions: {},
        trust:    {},
        finance:  castka,
        flags:    []
      }
    };
    const { merged, typNarativ, meta } = pripravSlouceneDusledky(pripad, rozsudek);
    merged._ui_finance_label = `Úplatek: +${castka} Kčs`;
    const dusledkyRadky = UI.vypoctiDusledkyRadky(merged);

    Finance.prijmoutUplatek(castka, pripad.title || '');
    merged._bez_vina_kampan_stropu = true;
    _aplikujDusledky(merged);
    State.set('flags.uplatek_tihy_zbyva', 2);
    const den = State.get('currentDay');
    const typRazitka = _rozsudekNaTypRazitka(rozsudek.id);
    Desk.animujRazitko(typRazitka);

    _aktualizujRozhodovaciStyl(pripad, rozsudek);
    _zaznamenejTydenniStatistiky(pripad, rozsudek);

    State.pridejRozsudek({
      day:            den,
      caseId:         String(pripad.id).trim(),
      caseType:       typProZobrazeni(pripad),
      verdict:        rozsudek.text,
      caseTitle:      pripad.title,
      verdictId:      rozsudek.id,
      consequences:   merged,
      typNarativ:     typNarativ,
      dusledkyRadky:  dusledkyRadky,
      procesniKvalita: meta && meta.procesniKvalita ? meta.procesniKvalita.key : null,
      normativniSmer: meta && meta.normativniSmer ? meta.normativniSmer.key : null,
      evidenceScore:  meta && meta.procesniKvalita ? meta.procesniKvalita.evidenceScore : null,
      coherenceScore: meta && meta.procesniKvalita ? meta.procesniKvalita.coherenceScore : null,
      pathEvidenceDelta: meta && meta.procesniKvalita && meta.procesniKvalita.path
        ? Number(meta.procesniKvalita.path.clamped) || 0
        : 0,
      hiddenVerdictBoost: !!(meta && meta.hiddenVerdictBoost),
      unofficialSummary: _souhrnNeoficialnichZdroju(pripad)
    });
    _bonusInkoustZaNarocnySpis(pripad);
    State.pridejPouzityPripad(pripad.id);
    _naplanovatReviziPoRozsudku(pripad, rozsudek, meta);

    if (pripad.recurring === true && pripad.thread) {
      _zpracujOpakovani(pripad, rozsudek);
    }

    if (pripad.narrative_link) {
      setTimeout(() => {
        Narrative.zobrazFragment(pripad.narrative_link);
      }, 2500);
    }

    const udalosti = Traits.zkontrolujKrajniHodnoty();
    for (const udalost of udalosti) {
      if (udalost.typ === 'ending') {
        setTimeout(() => Engine.spustKonec(udalost.ending), 1500);
        Desk.aktualizujVse();
        State.uloz();
        UI.aktualizujSlozky(_pripady, State.get('casesResolvedToday'));
        {
          const mo = document.getElementById('modal-pripad');
          if (mo && mo.classList.contains('aktivni') && State.jePripadUzavren(pripad.id)) UI.zobrazPripadReadonly(pripad);
        }
        return;
      }
    }

    const reakce = Factions.zkontrolujReakce();
    if (reakce.length > 0) {
      _zpracujFrakceReakce(reakce);
    }

    _zkontrolujSpeciálniKonce(pripad, rozsudek);

    Music.nastavKontext('neutral');
    Music.aktualizujStopu();

    Desk.aktualizujVse();
    State.uloz();

    UI.aktualizujSlozky(_pripady, State.get('casesResolvedToday'));
    {
      const mo = document.getElementById('modal-pripad');
      if (mo && mo.classList.contains('aktivni') && State.jePripadUzavren(pripad.id)) UI.zobrazPripadReadonly(pripad);
    }
    const spisTypU = typProZobrazeni(pripad);
    const inkMsgU = spisTypU !== 'rutinni' ? ' +1 sdílená akce průzkumu.' : '';
    UI.zobrazStavovouZpravu(`Úplatek: ${castka} Kčs${inkMsgU}`);
    setTimeout(() => Engine.zkontrolujKonecDne(true), 500);

    if (_onRozsudekCallback) _onRozsudekCallback(pripad, rozsudek);
  }

  /**
   * Skupina pro echo v ranních/novinových textech (flags.verdict_<caseId>).
   * @returns {'guilty'|'not_guilty'|'insufficient'|'alternative'|null}
   */
  function _verdiktIdDoSkupinyProEcho(verdictId) {
    const v = String(verdictId || '').toLowerCase();
    if (!v || v === 'uplatek') return null;
    if (v.indexOf('insufficient') !== -1) return 'insufficient';
    if (v === 'guilty_alternative' || (v.indexOf('guilty') !== -1 && v.indexOf('alternative') !== -1)) {
      return 'alternative';
    }
    if (v.indexOf('not_guilty') !== -1) return 'not_guilty';
    if (v.indexOf('guilty') !== -1) return 'guilty';
    return null;
  }

  function zpracujRozsudek(pripad, rozsudek, opts) {
    if (!pripad || !rozsudek) return;
    if (pripad.id == null || pripad.id === '') {
      console.warn('[Cases] zpracujRozsudek: případ bez id — rozsudek se neuloží.');
      return;
    }
    if (State.jePripadUzavren(pripad.id)) {
      console.warn('[Cases] zpracujRozsudek: případ už je uzavřený, ignoruji.', pripad.id);
      return;
    }

    const den = State.get('currentDay');

    // Použij razítko (lze přeskočit, pokud už proběhlo před modalem důsledků)
    const typRazitka = _rozsudekNaTypRazitka(rozsudek.id);
    if (!opts || !opts.preskocRazitko) {
      Desk.animujRazitko(typRazitka);
    }

    const { merged, typNarativ, meta } = pripravSlouceneDusledky(pripad, rozsudek);

    // Snímek řádků důsledků před aplikací (archiv + přesné bary)
    const dusledkyRadky = UI.vypoctiDusledkyRadky(merged);

    // Aplikuj důsledky (verdikt + typové doplnky jedním sloučením)
    _aplikujDusledky(merged);
    _zkontrolujFragmentVinoveKrize();
    _zkontrolujFragmentFrakcniKrize();
    if (typeof Finance !== 'undefined' && Finance.zkontrolujCilOperace) {
      Finance.zkontrolujCilOperace();
    }

    _aktualizujRozhodovaciStyl(pripad, rozsudek);
    _zaznamenejTydenniStatistiky(pripad, rozsudek);

    const pr = posoudPruzkumProVerdikt(pripad, rozsudek);
    if (pr.pouzitPruzkum && pr.soulad && _efektivniTyp(pripad) === 'rutinni') {
      const md = Traits.aplikovatNasobekMoudrostiZaAkci(3);
      if (md !== 0) State.upravRys('Moudrost', md);
    }

    // Ulož do archivu
    State.pridejRozsudek({
      day:            den,
      caseId:         String(pripad.id).trim(),
      caseType:       typProZobrazeni(pripad),
      verdict:        rozsudek.text,
      caseTitle:      pripad.title,
      verdictId:      rozsudek.id,
      consequences:   merged,
      typNarativ:     typNarativ,
      dusledkyRadky:  dusledkyRadky,
      procesniKvalita: meta && meta.procesniKvalita ? meta.procesniKvalita.key : null,
      normativniSmer: meta && meta.normativniSmer ? meta.normativniSmer.key : null,
      evidenceScore:  meta && meta.procesniKvalita ? meta.procesniKvalita.evidenceScore : null,
      coherenceScore: meta && meta.procesniKvalita ? meta.procesniKvalita.coherenceScore : null,
      pathEvidenceDelta: meta && meta.procesniKvalita && meta.procesniKvalita.path
        ? Number(meta.procesniKvalita.path.clamped) || 0
        : 0,
      unofficialSummary: _souhrnNeoficialnichZdroju(pripad)
    });
    _bonusInkoustZaNarocnySpis(pripad);
    State.pridejPouzityPripad(pripad.id);

    const echoSkup = _verdiktIdDoSkupinyProEcho(rozsudek.id);
    if (echoSkup) {
      const cid = String(pripad.id || '').trim();
      if (cid) State.set('flags.verdict_' + cid, echoSkup);
    }

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
        Desk.aktualizujVse();
        State.uloz();
        UI.aktualizujSlozky(_pripady, State.get('casesResolvedToday'));
        {
          const mo = document.getElementById('modal-pripad');
          if (mo && mo.classList.contains('aktivni') && State.jePripadUzavren(pripad.id)) UI.zobrazPripadReadonly(pripad);
        }
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
    UI.aktualizujSlozky(_pripady, State.get('casesResolvedToday'));

    {
      const mo = document.getElementById('modal-pripad');
      if (mo && mo.classList.contains('aktivni') && State.jePripadUzavren(pripad.id)) UI.zobrazPripadReadonly(pripad);
    }

    // Zpráva
    const spisTypR = typProZobrazeni(pripad);
    const inkMsgR = spisTypR !== 'rutinni' ? ' +1 sdílená akce průzkumu.' : '';
    UI.zobrazStavovouZpravu(`Rozsudek: ${rozsudek.text}${inkMsgR}`);

    // Zkontroluj konec dne (true = dovolit variabilní MIGRACE_20-15)
    setTimeout(() => Engine.zkontrolujKonecDne(true), 500);

    if (_onRozsudekCallback) _onRozsudekCallback(pripad, rozsudek);
  }

  function _frakcniKlicDoStavu(klic) {
    if (klic === 'Stat') return 'Moc';
    if (klic === 'Obchodnici') return 'Kapital';
    return klic;
  }

  /** Vlna A: zmírnění frakčních skoků z rozsudků (×0,75, trunc směrem k nule). */
  function _skalujFrakcniDelta(delta) {
    const d = Number(delta) || 0;
    if (d === 0) return 0;
    const t = Math.trunc(d * BALANC.FRAKCE_DELTA_SCALE);
    if (t !== 0) return t;
    return d > 0 ? 1 : -1;
  }

  function _jeGuiltyTrestniVerdikt(verdictId) {
    const v = String(verdictId || '').toLowerCase();
    return v.startsWith('guilty_maximum') || v.startsWith('guilty_standard');
  }

  function _skupinaVerdiktuProBalanc(verdictId) {
    const v = String(verdictId || '').toLowerCase();
    if (v.startsWith('guilty')) return 'guilty';
    if (v.startsWith('not_guilty')) return 'not_guilty';
    if (v.startsWith('insufficient')) return 'insufficient';
    return null;
  }

  /** Vlna C: odlišný dopad na finance podle skupiny verdiktu. */
  function _skalujFinanceVerdikt(verdictId, delta) {
    const d = Number(delta) || 0;
    if (d === 0) return 0;
    const sk = _skupinaVerdiktuProBalanc(verdictId);
    if (sk === 'guilty' && d > 0) {
      const t = Math.trunc(d * BALANC.GUILTY_FINANCE_BONUS);
      return t !== 0 ? t : 1;
    }
    if (sk === 'not_guilty') {
      if (d > 0) {
        const t = Math.trunc(d * BALANC.NOT_GUILTY_FINANCE_BONUS_SCALE);
        return t !== 0 ? t : (d > 0 ? 1 : 0);
      }
      const t = Math.trunc(d * BALANC.NOT_GUILTY_FINANCE_PENAL_SCALE);
      return t !== 0 ? t : -1;
    }
    if (sk === 'insufficient' && d > 0) {
      const t = Math.trunc(d * BALANC.INSUFFICIENT_FINANCE_BONUS_SCALE);
      return t !== 0 ? t : 1;
    }
    return d;
  }

  /** Vlna B+J: menší růst Viny u guilty (obecně ×0,6; maximum/standard navíc ×0,75). */
  function _skalujVinaGuiltyVerdikt(verdictId, delta) {
    const d = Number(delta) || 0;
    if (d <= 0) return d;
    const sk = _skupinaVerdiktuProBalanc(verdictId);
    if (sk !== 'guilty') return d;
    let scale = BALANC.VINA_GUILTY_POS_SCALE;
    if (_jeGuiltyTrestniVerdikt(verdictId)) {
      scale *= BALANC.VINA_GUILTY_TRESTNI_SCALE;
    }
    const t = Math.trunc(d * scale);
    return t !== 0 ? t : 1;
  }

  /** Vlna G: zmírnění růstu Integrita/Odvaha u NG a guilty; Moudrost u NG mírněji. */
  function _skalujTraitDeltaVerdikt(verdictId, traitName, delta) {
    const d = Number(delta) || 0;
    if (d === 0) return 0;
    const sk = _skupinaVerdiktuProBalanc(verdictId);
    const tn = String(traitName || '');
    let scale = 1;

    if (sk === 'not_guilty') {
      if (tn === 'Vina' && d < 0) scale = BALANC.VINA_NG_NEG_SCALE;
      else if (tn === 'Integrita') scale = BALANC.TRAIT_DELTA_SCALE_NG_INT;
      else if (tn === 'Nadeje') scale = BALANC.TRAIT_DELTA_SCALE_NG_NAD;
      else if (tn === 'Odvaha') scale = BALANC.TRAIT_DELTA_SCALE_NG;
      else if (tn === 'Moudrost') scale = BALANC.TRAIT_DELTA_SCALE_NG_MOU;
    } else if (sk === 'insufficient') {
      scale = BALANC.TRAIT_DELTA_SCALE_INSUFFICIENT;
    } else if (sk === 'guilty' && d > 0 && (tn === 'Integrita' || tn === 'Odvaha')) {
      scale = BALANC.TRAIT_DELTA_SCALE_GUILTY_POS_INT_ODV;
    } else if (sk === 'guilty' && d < 0 && (tn === 'Integrita' || tn === 'Odvaha')) {
      scale = BALANC.TRAIT_DELTA_SCALE_GUILTY_NEG_INT_ODV;
    } else if (sk === 'guilty' && d < 0 && tn === 'Nadeje') {
      scale = BALANC.TRAIT_DELTA_SCALE_GUILTY_NEG_NAD;
    }

    const t = Math.trunc(d * scale);
    if (t !== 0) return t;
    return d > 0 ? 1 : -1;
  }

  function _omezTraitDeltasNaVerdikt(traits, verdictId) {
    if (!traits || typeof traits !== 'object') return traits;
    const cap = BALANC.TRAIT_DELTA_CAP_PER_VERDIKT;
    const sk = _skupinaVerdiktuProBalanc(verdictId);
    const vinaAkt = Number(State.get('traits.Vina')) || 0;
    const out = {};
    for (const [k, raw] of Object.entries(traits)) {
      let n = Number(raw);
      if (!Number.isFinite(n) || n === 0) continue;
      if (k === 'Vina' && n > 0 && sk === 'guilty' && vinaAkt >= BALANC.VINA_GUILITY_HIGH_PRAG) {
        n = Math.min(n, BALANC.VINA_GUILITY_HIGH_CAP);
      }
      out[k] = Math.max(-cap, Math.min(cap, n));
    }
    return out;
  }

  /**
   * Sloučené důsledky před UI náhledem i aplikací — frakce ×0,75, Vina u guilty trestů ×0,75.
   */
  function _upravMergedBalanc(merged, rozsudek) {
    if (!merged || typeof merged !== 'object') return merged;
    const vid = String(rozsudek && rozsudek.id || '');

    if (merged.traits && typeof merged.traits === 'object') {
      const nt = {};
      for (const [klic, delta] of Object.entries(merged.traits)) {
        let d = _skalujTraitDeltaVerdikt(vid, klic, delta);
        if (klic === 'Vina') d = _skalujVinaGuiltyVerdikt(vid, d);
        if (d !== 0) nt[klic] = d;
      }
      merged.traits = _omezTraitDeltasNaVerdikt(nt, vid);
    }

    if (Object.prototype.hasOwnProperty.call(merged, 'finance')) {
      merged.finance = _skalujFinanceVerdikt(vid, merged.finance);
    }

    if (merged.factions && typeof merged.factions === 'object') {
      const nf = {};
      for (const [klic, delta] of Object.entries(merged.factions)) {
        const sk = _skalujFrakcniDelta(delta);
        if (sk !== 0) nf[klic] = sk;
      }
      merged.factions = nf;
    }
    return merged;
  }

  function _zkontrolujFragmentVinoveKrize() {
    const vina = Number(State.get('traits.Vina')) || 0;
    if (vina < BALANC.VINA_KRIZE_PRAG) return;
    if (State.get('flags.vina_krize_80_zobrazeno')) return;
    State.set('flags.vina_krize_80_zobrazeno', true);
    setTimeout(() => {
      if (typeof Narrative !== 'undefined' && Narrative.zobrazFragment) {
        Narrative.zobrazFragment('fragment_vina_krize_80');
      }
    }, 2800);
  }

  function _zkontrolujFragmentFrakcniKrize() {
    const prag = BALANC.FRAKCE_KRIZE_PRAG;
    const moc = Number(State.get('factions.Moc')) || 0;
    if (moc >= prag && !State.get('flags.moc_vysoka_zobrazeno')) {
      State.set('flags.moc_vysoka_zobrazeno', true);
      setTimeout(() => {
        if (typeof Narrative !== 'undefined' && Narrative.zobrazFragment) {
          Narrative.zobrazFragment('fragment_moc_vysoka');
        }
      }, 3000);
    }
    const lid = Number(State.get('factions.Lid')) || 0;
    if (lid >= prag && !State.get('flags.lid_vysoka_zobrazeno')) {
      State.set('flags.lid_vysoka_zobrazeno', true);
      setTimeout(() => {
        if (typeof Narrative !== 'undefined' && Narrative.zobrazFragment) {
          Narrative.zobrazFragment('fragment_lid_vysoka');
        }
      }, 3200);
    }
  }

  function _aplikujDusledky(dusledky) {
    if (!dusledky) return;

    const vinaOpts = dusledky._bez_vina_kampan_stropu ? { bezKampanStropu: true } : undefined;

    // Rysy
    if (dusledky.traits) {
      for (const [nazev, delta] of Object.entries(dusledky.traits)) {
        const opts = nazev === 'Vina' ? vinaOpts : undefined;
        State.upravRys(nazev, delta, opts);
      }
    }

    // Frakce (už normalizované v pripravSlouceneDusledky / _upravMergedBalanc)
    if (dusledky.factions) {
      const ag = {};
      for (const [klic, delta] of Object.entries(dusledky.factions)) {
        const cil = _frakcniKlicDoStavu(klic);
        if (!cil) continue;
        const d = Number(delta) || 0;
        if (d === 0) continue;
        ag[cil] = (ag[cil] || 0) + d;
      }
      for (const [nazev, soucet] of Object.entries(ag)) {
        if (!Number.isFinite(soucet) || soucet === 0) continue;
        State.upravFrakci(nazev, soucet);
      }
    }

    // Finance
    if (dusledky.finance && dusledky.finance !== 0) {
      State.upravFinance(dusledky.finance);
    }

    // Důvěra NPC
    if (dusledky.trust) {
      const povoleno = { vlcek: true, zavadova: true, karas: true };
      for (const [npcId, delta] of Object.entries(dusledky.trust)) {
        if (!povoleno[npcId]) continue;
        State.upravDuveru(npcId, delta);
      }
    }

    // Flags
    if (dusledky.flags) {
      for (const flag of dusledky.flags) {
        State.set('flags.' + flag.key, flag.value);
        if (flag.key === 'uplatek_prijat' && flag.value === true) {
          _inkrementujKampanUplatky();
        }
      }
    }
  }

  function _inkrementujKampanUplatky() {
    let k = State.get('kampan_statistiky');
    if (!k || typeof k !== 'object') {
      k = {
        pripady_celkem: 0, pripady_s_prurzkumem: 0,
        verdikty_guilty: 0, verdikty_ng: 0, verdikty_insufficient: 0,
        verdikty_tvrdy: 0, uplatky_prijaty: 0
      };
    }
    k.uplatky_prijaty = (Number(k.uplatky_prijaty) || 0) + 1;
    State.set('kampan_statistiky', k);
  }

  // --- Průzkum: soulad s odhalením, vzorce rozhodování ---

  function _pocetOdhalenychInfo(pripad) {
    return (State.get('revealedInfo.' + pripad.id) || []).length;
  }

  function _clueSystem(pripad) {
    if (!pripad || !pripad.clue_system || typeof pripad.clue_system !== 'object') return null;
    if (pripad.clue_system.enabled !== true) return null;
    return pripad.clue_system;
  }

  function _clueStrengthToRank(strength) {
    const s = String(strength || '').trim();
    if (s === 'strong') return 3;
    if (s === 'medium') return 2;
    if (s === 'weak') return 1;
    return 0;
  }

  /** Pár dle ID stop — při více shodách (sdílené stopy) vybere nejsilnější pár. */
  function _clueParDleIdsNejsilnejsi(pripad, aId, bId) {
    const cs = _clueSystem(pripad);
    const a = String(aId || '').trim();
    const b = String(bId || '').trim();
    if (!cs || !a || !b || !Array.isArray(cs.pairs)) return null;
    let best = null;
    let bestRank = -1;
    for (const p of cs.pairs) {
      if (!p || typeof p !== 'object') continue;
      const pa = String(p.a_id || '').trim();
      const pb = String(p.b_id || '').trim();
      if (!((a === pa && b === pb) || (a === pb && b === pa))) continue;
      const pairId = String(p.pair_id || '').trim();
      const sRaw = String(p.strength || '').trim();
      const strength = sRaw || (String(cs.true_pair_id || '').trim() === pairId ? 'strong' : 'medium');
      const r = _clueStrengthToRank(strength);
      if (r > bestRank) {
        bestRank = r;
        best = p;
      }
    }
    return best;
  }

  /** Max. pokusů na spojení stop; 0 = bez limitu soustředění. */
  function ziskejClueFocusMax(pripad) {
    const cs = _clueSystem(pripad);
    if (!cs) return 0;
    const fa = cs.focus_attempts;
    if (fa && fa.enabled === false) return 0;
    const m = Number(fa && fa.max);
    if (!Number.isFinite(m)) return 3;
    return Math.max(0, Math.round(m));
  }

  function _thematicPairVzkus(pripad, aId, bId) {
    const cs = _clueSystem(pripad);
    const a = String(aId || '').trim();
    const b = String(bId || '').trim();
    if (!cs || !a || !b) return null;
    const list = Array.isArray(cs.thematic_pairs) ? cs.thematic_pairs : [];
    for (const row of list) {
      if (!row || typeof row !== 'object') continue;
      const pa = String(row.a_id || '').trim();
      const pb = String(row.b_id || '').trim();
      if ((a === pa && b === pb) || (a === pb && b === pa)) {
        const msg = String(row.message || '').trim();
        return msg || 'Tyto informace spolu souvisí, ale neprokazují lživou výpověď.';
      }
    }
    return null;
  }

  function _cluePotvrzeni(pripad) {
    if (!pripad || typeof State === 'undefined' || !State.ziskejCluePotvrzeni) return null;
    return State.ziskejCluePotvrzeni(pripad.id);
  }

  function _clueRewardsProSilu(pripad, strength) {
    const cs = _clueSystem(pripad);
    if (!cs || !cs.rewards || typeof cs.rewards !== 'object') return null;
    const s = String(strength || '').trim();
    if (!s) return null;
    const onConfirm = cs.rewards.on_confirm;
    if (onConfirm && typeof onConfirm === 'object' && onConfirm[s] && typeof onConfirm[s] === 'object') {
      return onConfirm[s];
    }
    if (s === 'strong') {
      const onMatch = cs.rewards.on_match;
      if (onMatch && typeof onMatch === 'object') return onMatch;
    }
    return null;
  }

  /** Krátké ID z JSON (vzit_obalku) ↔ složené ID z pool loaderu (guilty_vzit_obalku). */
  function _verdiktIdVarianty(verdictId) {
    const id = String(verdictId || '').trim();
    if (!id) return [];
    const out = [id];
    if (id.startsWith('guilty_')) out.push(id.slice('guilty_'.length));
    else if (id.startsWith('not_guilty_')) out.push(id.slice('not_guilty_'.length));
    else if (id.startsWith('insufficient_')) out.push(id.slice('insufficient_'.length));
    else {
      out.push(`guilty_${id}`, `not_guilty_${id}`, `insufficient_${id}`);
    }
    return [...new Set(out.filter(Boolean))];
  }

  function _prahyMinProVerdikt(prahy, verdictId) {
    if (!prahy || typeof prahy.get !== 'function') return null;
    let best = null;
    for (const v of _verdiktIdVarianty(verdictId)) {
      if (!prahy.has(v)) continue;
      const min = Number(prahy.get(v));
      if (!Number.isFinite(min)) continue;
      if (best === null || min < best) best = min;
    }
    return best;
  }

  function _informacniPrahyMap(pripad, kind) {
    const cs = _clueSystem(pripad);
    const out = new Map();
    const sec = cs && cs.info_threshold_unlocks && cs.info_threshold_unlocks[kind];
    if (!Array.isArray(sec)) return out;
    for (const row of sec) {
      if (!row || typeof row !== 'object') continue;
      const min = Number(row.min);
      if (!Number.isFinite(min)) continue;
      const ids = Array.isArray(row.ids) ? row.ids : [];
      for (const raw of ids) {
        const id = String(raw || '').trim();
        if (!id) continue;
        for (const alias of _verdiktIdVarianty(id)) {
          if (!out.has(alias) || min < out.get(alias)) out.set(alias, min);
        }
      }
    }
    return out;
  }

  function maInformacniPrahyVerdiktu(pripad) {
    return _informacniPrahyMap(pripad, 'verdicts').size > 0;
  }

  function _zakladInformovanosti(pripad) {
    const revealed = (pripad && Array.isArray(pripad.hidden_info))
      ? pripad.hidden_info.filter(i => State.jeInfoOdhaleno(pripad.id, i.id))
      : [];
    const n = revealed.length;
    const maKonf = revealed.some(
      i => i && (i.id === 'pool_inv_confrontation' || i.action === 'confrontation')
    );
    let pct = 15;
    let label = 'Naslepo';
    let tone = 'case-wf-inform-fill--blind';
    if (n >= 1) {
      pct = 40;
      label = 'Základní přehled';
      tone = 'case-wf-inform-fill--basic';
    }
    if (n >= 2) {
      pct = 70;
      label = 'Důkladný přehled';
      tone = 'case-wf-inform-fill--good';
    }
    if (n >= 3 && !maKonf) {
      pct = 85;
      label = 'Pečlivý přehled';
      tone = 'case-wf-inform-fill--great';
    }
    if (maKonf) {
      pct = 100;
      label = 'Kompletní';
      tone = 'case-wf-inform-fill--full';
    }
    return { pct, label, tone };
  }

  function vypoctiInformovanostPripadu(pripad) {
    const base = _zakladInformovanosti(pripad);
    const bonus = Number(bonusInformovanostiZaClue(pripad));
    const add = Number.isFinite(bonus) ? bonus : 0;
    return {
      pct: Math.max(0, Math.min(100, base.pct + add)),
      label: base.label,
      tone: base.tone
    };
  }

  function _cluePopisekSily(strength) {
    const s = String(strength || '').trim();
    if (s === 'strong') return 'silná';
    if (s === 'medium') return 'střední';
    if (s === 'weak') return 'slabá';
    return 'neurčitá';
  }

  function maPotvrzenouClueVazbu(pripad) {
    return !!_cluePotvrzeni(pripad);
  }

  function ziskejPotvrzenouClueVazbu(pripad) {
    const rec = _cluePotvrzeni(pripad);
    if (!rec) return null;
    return {
      pairId: String(rec.pairId || '').trim(),
      strength: String(rec.strength || '').trim(),
      aId: String(rec.aId || '').trim(),
      bId: String(rec.bId || '').trim(),
      label: _cluePopisekSily(rec.strength)
    };
  }

  function _poolPocetOdhalenychAKonf(pripad) {
    const cid = String(pripad && pripad.id != null ? pripad.id : '').trim();
    const hidden = (pripad && Array.isArray(pripad.hidden_info)) ? pripad.hidden_info : [];
    let n = 0;
    let maKonf = false;
    for (const i of hidden) {
      if (!i || typeof State === 'undefined' || !State.jeInfoOdhaleno) continue;
      if (!State.jeInfoOdhaleno(cid, i.id)) continue;
      n++;
      if (i.action === 'confrontation' || i.id === 'pool_inv_confrontation') maKonf = true;
    }
    return { n, maKonf };
  }

  /**
   * Stejná logika jako `_wfFiltrovatVerdiktyPodlePruzkumu` v ui.js — jeden verdikt.
   * Při `maInformacniPrahyVerdiktu` se počítání kroků neaplikuje (vrací true).
   */
  function poolVerdiktProjdePoctemPrůzkumu(pripad, verdictId) {
    if (!pripad || pripad._fromPool !== true) return true;
    if (String(pripad.type || '').toLowerCase() === 'osobni') return true;
    if (!Array.isArray(pripad.hidden_info) || !pripad.hidden_info.length) return true;
    if (maInformacniPrahyVerdiktu(pripad)) return true;
    const id = String(verdictId || '').trim();
    const { n, maKonf } = _poolPocetOdhalenychAKonf(pripad);
    if (n === 0) {
      return id === 'guilty_maximum' || id === 'guilty_standard' || id === 'not_guilty_formal';
    }
    if (n === 1) {
      if (id.startsWith('insufficient_')) return false;
      if (id === 'guilty_alternative' || id === 'guilty_special') return false;
      return (
        id === 'guilty_maximum' ||
        id === 'guilty_standard' ||
        id === 'guilty_lenient' ||
        id === 'not_guilty_formal' ||
        id === 'not_guilty_comment' ||
        id === 'not_guilty_with_comment'
      );
    }
    if (id === 'guilty_special') return maKonf;
    if (id === 'guilty_alternative') return maKonf || n >= 3;
    return true;
  }

  function _clueUnlockVerdictIds(pripad) {
    const potvrzeni = _cluePotvrzeni(pripad);
    if (!potvrzeni) return [];
    const rewards = _clueRewardsProSilu(pripad, potvrzeni.strength);
    const unlockVerdicts = (rewards && Array.isArray(rewards.unlock_verdict_ids))
      ? rewards.unlock_verdict_ids.map(x => String(x || '').trim()).filter(Boolean)
      : [];
    return unlockVerdicts;
  }

  function jePruzkumAkceOdemcenaPoClue(pripad, infoId) {
    const cs = _clueSystem(pripad);
    const iid = String(infoId || '').trim();
    if (!cs || !iid) return true;
    const prahy = _informacniPrahyMap(pripad, 'actions');
    if (prahy.has(iid)) {
      const info = vypoctiInformovanostPripadu(pripad);
      return info.pct >= Number(prahy.get(iid));
    }
    const potvrzeni = _cluePotvrzeni(pripad);
    if (!potvrzeni) return true;
    const rewards = _clueRewardsProSilu(pripad, potvrzeni.strength);
    const unlockActions = (rewards && Array.isArray(rewards.unlock_actions))
      ? rewards.unlock_actions.map(x => String(x || '').trim()).filter(Boolean)
      : [];
    if (!unlockActions.includes(iid)) return true;
    return !!potvrzeni;
  }

  function _jeVerdiktVClueUnlocku(pripad, verdictId) {
    const unlockVerdicts = _clueUnlockVerdictIds(pripad);
    if (!unlockVerdicts.length) return false;
    for (const v of _verdiktIdVarianty(verdictId)) {
      if (unlockVerdicts.includes(v)) return true;
    }
    return false;
  }

  function jeVerdiktOdemcenPoClue(pripad, verdictId) {
    const cs = _clueSystem(pripad);
    const vid = String(verdictId || '').trim();
    if (!cs || !vid) return true;
    const prahy = _informacniPrahyMap(pripad, 'verdicts');
    const minPrah = _prahyMinProVerdikt(prahy, vid);
    if (minPrah !== null) {
      const info = vypoctiInformovanostPripadu(pripad);
      if (Number.isFinite(minPrah) && info.pct >= minPrah) return true;
      if (_jeVerdiktVClueUnlocku(pripad, vid)) return true;
      return false;
    }
    const potvrzeni = _cluePotvrzeni(pripad);
    if (!potvrzeni) return true;
    const rewards = _clueRewardsProSilu(pripad, potvrzeni.strength);
    const unlockVerdicts = (rewards && Array.isArray(rewards.unlock_verdict_ids))
      ? rewards.unlock_verdict_ids.map(x => String(x || '').trim()).filter(Boolean)
      : [];
    if (!unlockVerdicts.length) return true;
    for (const v of _verdiktIdVarianty(vid)) {
      if (!unlockVerdicts.includes(v)) continue;
      return !!potvrzeni;
    }
    return true;
  }

  /** Krátký text pro tooltip u dostupného pool verdiktu — proč je k dispozici. */
  function popisDuvoduVerdiktu(pripad, verdictId) {
    const vid = String(verdictId || '').trim();
    if (!pripad || !vid) return '';
    if (!pripad._fromPool) return 'Dostupné podle rysů a dat případu.';
    const casti = [];
    const zakladni = vid === 'guilty_maximum' || vid === 'guilty_standard' || vid === 'not_guilty_formal';
    if (zakladni) casti.push('Základní možnost — nevyžaduje průzkum.');

    const { n, maKonf } = _poolPocetOdhalenychAKonf(pripad);
    if (!maInformacniPrahyVerdiktu(pripad) && poolVerdiktProjdePoctemPrůzkumu(pripad, vid) && !zakladni) {
      if (vid === 'guilty_special' && maKonf) casti.push('Po odhalené konfrontaci.');
      else if (vid === 'guilty_alternative' && (maKonf || n >= 3)) {
        casti.push(maKonf ? 'Po konfrontaci nebo po třech průzkumech.' : 'Po třech odkrytých průzkumech.');
      } else if (vid.startsWith('insufficient_') && n >= 2) {
        casti.push('Postup „nedostatek důkazů“ po více průzkumech.');
      } else if (n >= 1) casti.push(`Postup průzkumu (${n} ${n === 1 ? 'odhalený krok' : 'odhalené kroky'}).`);
    }

    const prahy = _informacniPrahyMap(pripad, 'verdicts');
    const u = _clueUnlockVerdictIds(pripad);
    if (prahy.has(vid)) {
      const min = Number(prahy.get(vid));
      const pct = (vypoctiInformovanostPripadu(pripad) || {}).pct;
      const pN = Number(pct);
      if (Number.isFinite(min) && Number.isFinite(pN) && pN >= min) {
        casti.push(`Informovanost ≥ ${min} % (nyní ${Math.round(pN)} %).`);
      }
      if (u.includes(vid)) casti.push('Splněna odměna z potvrzené osy stop (pátrání).');
    } else if (u.includes(vid)) {
      casti.push('Odemčeno potvrzenou osou stop (pátrání).');
    }

    if (!casti.length) {
      const prahyF = _informacniPrahyMap(pripad, 'verdicts');
      if (prahyF.has(vid)) {
        const minF = Number(prahyF.get(vid));
        const pctF = (vypoctiInformovanostPripadu(pripad) || {}).pct;
        const pNF = Number(pctF);
        if (Number.isFinite(minF) && Number.isFinite(pNF) && pNF < minF) {
          return `Spis ještě nemluví dost nahlas — informovanost pod ${minF} % (teď asi ${Math.round(pNF)} %); až dozrá, tahle varianta začne dávat smysl.`;
        }
      }
      return 'Současná situace případu už tuto možnost ve výchozí nabídce umožňuje.';
    }
    return casti.join(' ');
  }

  /** Proč verdikt v seznamu není klikací (krok 2 / zamčené). */
  function popisNepristupnostiVerdiktu(pripad, verdictId) {
    return 'Ben tento rozsudek zatím nemůže uplatnit.';
  }

  function bonusInformovanostiZaClue(pripad) {
    const potvrzeni = _cluePotvrzeni(pripad);
    if (!potvrzeni) return 0;
    const rewards = _clueRewardsProSilu(pripad, potvrzeni.strength);
    const delta = Number(rewards && rewards.investigation_progress_delta);
    if (!Number.isFinite(delta)) return 0;
    return Math.max(0, Math.round(delta));
  }

  function jeTruePairNalezen(pripad) {
    return maPotvrzenouClueVazbu(pripad);
  }

  /**
   * Two-Click vyhodnocení rozporu.
   * @returns {{ok:boolean, reason?:string, softFail?:boolean, softMessage?:string, pairId?:string, strength?:string, label?:string, aId?:string, bId?:string}}
   */
  function vyhodnotTwoClickRozpor(pripad, firstClueId, secondClueId) {
    const cs = _clueSystem(pripad);
    if (!cs) return { ok: false, reason: 'disabled' };
    const a = String(firstClueId || '').trim();
    const b = String(secondClueId || '').trim();
    if (!a || !b || a === b) return { ok: false, reason: 'invalid' };
    const thematic = _thematicPairVzkus(pripad, a, b);
    if (thematic) {
      return { ok: true, softFail: true, softMessage: thematic };
    }
    const p = _clueParDleIdsNejsilnejsi(pripad, a, b);
    if (!p) return { ok: false, reason: 'mismatch' };
    const pairId = String(p.pair_id || '').trim();
    if (!pairId) return { ok: false, reason: 'mismatch' };
    if (p.soft_fail === true) {
      const sm = String(p.soft_fail_message || '').trim();
      return {
        ok: true,
        softFail: true,
        softMessage: sm || 'Tyto informace spolu souvisí, ale neprokazují lživou výpověď.'
      };
    }
    const strengthRaw = String(p.strength || '').trim();
    const strength = strengthRaw || (String(cs.true_pair_id || '').trim() === pairId ? 'strong' : 'medium');
    return {
      ok: true,
      softFail: false,
      pairId,
      strength,
      label: _cluePopisekSily(strength),
      aId: String(p.a_id || '').trim(),
      bId: String(p.b_id || '').trim()
    };
  }

  function potvrdTwoClickRozpor(pripad, kandidat) {
    if (!pripad || !kandidat) return { ok: false, reason: 'invalid' };
    const pairId = String(kandidat.pairId || '').trim();
    const strength = String(kandidat.strength || '').trim();
    if (!pairId || !strength) return { ok: false, reason: 'invalid' };
    if (typeof State === 'undefined' || !State.nastavCluePotvrzeni || !State.oznacClueParNalezen) {
      return { ok: false, reason: 'state' };
    }
    State.oznacClueParNalezen(pripad.id, pairId);
    State.nastavCluePotvrzeni(pripad.id, {
      pairId,
      strength,
      aId: String(kandidat.aId || '').trim(),
      bId: String(kandidat.bId || '').trim()
    });
    State.uloz();
    return {
      ok: true,
      pairId,
      strength,
      label: _cluePopisekSily(strength),
      rewards: _clueRewardsProSilu(pripad, strength) || null
    };
  }

  /** Tvrdé tresty / křik „vina!“ — nesoulad s průzkumem typu svědek / záznamy, pokud není vlastní hint. */
  function _jeTrestneNejprisnejsi(id) {
    const s = String(id || '').toLowerCase();
    if (s.includes('prison')) return true;
    if (s.includes('maximum')) return true;
    if (s.includes('veznice')) return true;
    if (s.includes('zabit_umysln')) return true;
    if (s === 'guilty' || s.startsWith('guilty_') || s.endsWith('_vinen') || s === 'vinen') return true;
    return false;
  }

  /**
   * Doporučené rozsudky pro soulad s konkrétním odhalením.
   * Volitelně v JSON: hidden_info[].revealed_hint.verdict_ids
   */
  function _hintVerdiktyProInfo(pripad, info) {
    if (info.revealed_hint && Array.isArray(info.revealed_hint.verdict_ids) && info.revealed_hint.verdict_ids.length > 0) {
      return info.revealed_hint.verdict_ids;
    }
    const vsechny = (pripad.verdicts || []).map(v => v.id).filter(Boolean);
    if (info.action === 'fast') return null;
    if (info.action === 'witness' || info.action === 'informant' || info.action === 'records') {
      return vsechny.filter(id => !_jeTrestneNejprisnejsi(id));
    }
    return null;
  }

  /**
   * @returns {{ pouzitPruzkum: boolean, soulad: boolean }}
   */
  function posoudPruzkumProVerdikt(pripad, rozsudek) {
    if (!pripad || !rozsudek) return { pouzitPruzkum: false, soulad: false };
    const revealed = State.get('revealedInfo.' + pripad.id) || [];
    const pouzitPruzkum = revealed.length > 0;
    if (!pouzitPruzkum) return { pouzitPruzkum: false, soulad: false };

    const infos = (pripad.hidden_info || []).filter(hi => revealed.includes(hi.id));
    let maHint = false;
    let soulad = true;
    for (const info of infos) {
      const ids = _hintVerdiktyProInfo(pripad, info);
      if (ids == null || ids.length === 0) continue;
      maHint = true;
      if (!ids.includes(rozsudek.id)) {
        soulad = false;
        break;
      }
    }
    if (!maHint) soulad = false;
    return { pouzitPruzkum, soulad };
  }

  function _verdiktJeFairKChudym(rozsudek) {
    const c = rozsudek.consequences || {};
    const lid = Number((c.factions && c.factions.Lid) ?? 0);
    if (lid >= 5) return true;
    const id = String(rozsudek.id || '').toLowerCase();
    if (id === 'acquit' || id === 'zprostit') return true;
    if (lid >= 3) return true;
    return false;
  }

  function _verdiktJeTvrdyNaZlocin(rozsudek) {
    const id = String(rozsudek.id || '').toLowerCase();
    if (_jeTrestneNejprisnejsi(id)) return true;
    const c = rozsudek.consequences || {};
    const st = Number((c.factions && (c.factions.Moc ?? c.factions.Stat)) ?? 0);
    const lid = Number((c.factions && c.factions.Lid) ?? 0);
    if (st >= 5 && lid <= -5) return true;
    return false;
  }

  function vypoctiProcesniPodkladZCest(pripad) {
    if (!pripad || !Array.isArray(pripad.hidden_info) || typeof State === 'undefined') {
      return { raw: 0, clamped: 0, official: 0, unofficial: 0, confrontation: 0, revealed: 0 };
    }
    const cid = String(pripad.id || '').trim();
    if (!cid) return { raw: 0, clamped: 0, official: 0, unofficial: 0, confrontation: 0, revealed: 0 };

    let raw = 0;
    let official = 0;
    let unofficial = 0;
    let confrontation = 0;
    let revealed = 0;

    for (const info of pripad.hidden_info) {
      if (!info || !State.jeInfoOdhaleno(cid, info.id)) continue;
      revealed++;
      if (String(info.action || '') === 'confrontation') {
        raw += _PATH_SKORE_CONFRONTATION;
        confrontation++;
        continue;
      }
      const way = State.zpusobOdhaleniInfo ? State.zpusobOdhaleniInfo(cid, info.id) : 'official';
      if (way === 'unofficial') {
        raw += _PATH_SKORE_UNOFFICIAL;
        unofficial++;
      } else {
        raw += _PATH_SKORE_OFFICIAL;
        official++;
      }
    }

    const clamped = _clamp(raw, -_PATH_SKORE_CAP, _PATH_SKORE_CAP);
    return { raw, clamped, official, unofficial, confrontation, revealed };
  }

  function _vypoctiEvidenceScore(pripad, rozsudek) {
    const pr = posoudPruzkumProVerdikt(pripad, rozsudek);
    const info = vypoctiInformovanostPripadu(pripad);
    const infoPct = Number(info && info.pct);
    const revealed = Array.isArray(pripad && pripad.hidden_info)
      ? pripad.hidden_info.filter(i => State.jeInfoOdhaleno(pripad.id, i.id)).length
      : 0;
    let score = Number.isFinite(infoPct) ? infoPct : 15;
    score += Math.min(12, revealed * 3);
    if (pr.pouzitPruzkum && pr.soulad) score += 6;
    if (pr.pouzitPruzkum && !pr.soulad) score -= 8;
    const path = vypoctiProcesniPodkladZCest(pripad);
    score += Number(path.clamped) || 0;
    return _clamp(Math.round(score), 0, 100);
  }

  function _vypoctiCoherenceScore(pripad) {
    const potvrz = ziskejPotvrzenouClueVazbu(pripad);
    if (!potvrz) return 20;
    if (potvrz.strength === 'strong') return 85;
    if (potvrz.strength === 'medium') return 65;
    if (potvrz.strength === 'weak') return 45;
    return 35;
  }

  function _vyhodnotProcesniKvalitu(pripad, rozsudek) {
    const evidenceScore = _vypoctiEvidenceScore(pripad, rozsudek);
    const coherenceScore = _vypoctiCoherenceScore(pripad);
    const path = vypoctiProcesniPodkladZCest(pripad);
    if (evidenceScore < 45 || coherenceScore < 35) {
      return { key: 'nizka', label: 'procesně slabé', evidenceScore, coherenceScore, path };
    }
    if (evidenceScore >= 75 && coherenceScore >= 65) {
      return { key: 'vysoka', label: 'procesně pečlivé', evidenceScore, coherenceScore, path };
    }
    return { key: 'stredni', label: 'procesně přijatelné', evidenceScore, coherenceScore, path };
  }

  function _urciNormativniSmerVerdiktu(rozsudek) {
    const tough = _verdiktJeTvrdyNaZlocin(rozsudek);
    const fair = _verdiktJeFairKChudym(rozsudek);
    if (tough && !fair) return { key: 'legalistni', label: 'normativně přísné' };
    if (fair && !tough) return { key: 'socialni', label: 'normativně sociální' };
    return { key: 'vyvazeny', label: 'normativně vyvážené' };
  }

  function _metaDoplnkyZaKvalituANormu(procesni, normativni) {
    const doplnek = { traits: {}, factions: {}, trust: {}, finance: 0, flags: [] };
    const narativ = [];

    if (procesni && procesni.key === 'vysoka') {
      doplnek.traits.Moudrost = (doplnek.traits.Moudrost || 0) + BALANC.META_PROCESNI_VYSOKA_MOUD;
      doplnek.traits.Vina = (doplnek.traits.Vina || 0) + BALANC.META_PROCESNI_VYSOKA_VINA;
      narativ.push('Postup byl procesně pečlivý.');
    } else if (procesni && procesni.key === 'stredni') {
      doplnek.traits.Moudrost = (doplnek.traits.Moudrost || 0) + BALANC.META_PROCESNI_STREDNI_MOUD;
      narativ.push('Postup byl procesně přijatelný.');
    } else {
      doplnek.traits.Moudrost = (doplnek.traits.Moudrost || 0) + BALANC.META_PROCESNI_NIZKA_MOUD;
      doplnek.traits.Vina = (doplnek.traits.Vina || 0) + BALANC.META_PROCESNI_NIZKA_VINA;
      narativ.push('Procesní opora rozsudku byla slabá.');
    }

    if (normativni && normativni.key === 'legalistni') {
      doplnek.factions.Moc = (doplnek.factions.Moc || 0) + BALANC.META_NORM_LEGALISTNI_MOC;
      doplnek.factions.Lid = (doplnek.factions.Lid || 0) + BALANC.META_NORM_LEGALISTNI_LID;
    } else if (normativni && normativni.key === 'socialni') {
      doplnek.factions.Lid = (doplnek.factions.Lid || 0) + BALANC.META_NORM_SOCIALNI_LID;
      doplnek.factions.Moc = (doplnek.factions.Moc || 0) + BALANC.META_NORM_SOCIALNI_MOC;
      doplnek.factions.Kapital = (doplnek.factions.Kapital || 0) + BALANC.META_NORM_SOCIALNI_KAP;
    }
    /* vyvážený směr — bez automatického +Integrita (Vlna G) */

    return { doplnek, narativ };
  }

  function _spocitejSanciRevize(params) {
    const evidence = Number(params && params.evidenceScore);
    const coherence = Number(params && params.coherenceScore);
    const procKey = String(params && params.procesniKvalita || '').trim();
    const hardVerdict = !!(params && params.hardVerdict);
    const ev = Number.isFinite(evidence) ? evidence : 15;
    const co = Number.isFinite(coherence) ? coherence : 20;
    const qualityBonus = procKey === 'vysoka' ? 12 : procKey === 'stredni' ? 5 : 0;
    const hardVerdictBonus = hardVerdict ? 10 : 0;
    const chanceRaw =
      5 +
      (70 - ev) * 0.45 +
      (60 - co) * 0.35 +
      hardVerdictBonus -
      qualityBonus;
    return _clamp(Math.round(chanceRaw), 5, 75);
  }

  function _naplanovatReviziPoRozsudku(pripad, rozsudek, meta) {
    // Revize v 15denní verzi vypnuto (MIGRACE_20-15); data review_card se ignorují
    return;
    if (!pripad || !rozsudek || !meta || !meta.procesniKvalita) return;
    if (String(rozsudek.id || '') === 'uplatek') return;
    if (typeof State === 'undefined' || !State.pridejReviziPripadu) return;

    const den = Number(State.get('currentDay'));
    if (!Number.isFinite(den) || den < 1) return;
    const evidenceScore = Number(meta.procesniKvalita.evidenceScore);
    const coherenceScore = Number(meta.procesniKvalita.coherenceScore);
    const hardVerdict = _verdiktJeTvrdyNaZlocin(rozsudek);
    const appealChance = _spocitejSanciRevize({
      evidenceScore,
      coherenceScore,
      procesniKvalita: meta.procesniKvalita.key,
      hardVerdict
    });
    const roll = Math.random() * 100;
    if (roll > appealChance) return;

    const dueDay = den + 2 + Math.floor(Math.random() * 3);
    const card = pripad.review_card && typeof pripad.review_card === 'object' ? pripad.review_card : {};
    State.pridejReviziPripadu({
      caseId: String(pripad.id || '').trim(),
      caseTitle: String(pripad.title || '').trim(),
      verdictId: String(rozsudek.id || '').trim(),
      verdictText: String(rozsudek.text || '').trim(),
      originalDay: den,
      dueDay,
      evidenceScore: Number.isFinite(evidenceScore) ? evidenceScore : 15,
      coherenceScore: Number.isFinite(coherenceScore) ? coherenceScore : 20,
      appealChance,
      procesniKvalita: meta.procesniKvalita.key,
      hardVerdict,
      payload: {
        summaryShort: String(card.summary_short || '').trim(),
        optionAText: String(card.option_a_text || '').trim(),
        optionBText: String(card.option_b_text || '').trim(),
        uniqueEffectA: card.unique_effect_a && typeof card.unique_effect_a === 'object'
          ? { ...card.unique_effect_a }
          : null,
        uniqueEffectB: card.unique_effect_b && typeof card.unique_effect_b === 'object'
          ? { ...card.unique_effect_b }
          : null
      }
    });
  }

  function _sestavDusledkyRevize(revize, volba) {
    const e = Number(revize && revize.evidenceScore);
    const c = Number(revize && revize.coherenceScore);
    const proc = String(revize && revize.procesniKvalita || '').trim();
    const hard = !!(revize && revize.hardVerdict);
    const effects = { traits: {}, factions: {}, trust: {}, finance: 0, flags: [] };
    let note = '';
    if (volba === 'A') {
      effects.traits.Moudrost = proc === 'vysoka' ? -1 : -2;
      effects.traits.Vina = proc === 'vysoka' ? +1 : +2;
      if (hard) effects.traits.Integrita = (effects.traits.Integrita || 0) - 2;
      if (Number.isFinite(e) && e < 45) effects.factions.Lid = (effects.factions.Lid || 0) - 2;
      if (Number.isFinite(c) && c < 35) effects.factions.Moc = (effects.factions.Moc || 0) - 2;
      note = hard
        ? 'Revize potvrdila tvrdý rozsudek, ale procedura vyvolala pochybnosti.'
        : 'Rozsudek byl podržen, systém však zaznamenal procesní výhrady.';
    } else {
      effects.traits.Integrita = +1;
      effects.traits.Vina = -1;
      effects.factions.Moc = hard ? -3 : -2;
      effects.factions.Lid = +2;
      effects.finance = -10;
      note = 'Rozsudek byl zmírněn po revizi. Veřejnost i mocenské kruhy to čtou rozdílně.';
    }
    return { effects, note };
  }

  function zpracujVolbuRevize(revize, volba) {
    const c = String(volba || '').trim().toUpperCase();
    if (!revize || (c !== 'A' && c !== 'B')) return null;
    const { effects, note } = _sestavDusledkyRevize(revize, c);
    const extra = revize.payload && c === 'A'
      ? revize.payload.uniqueEffectA
      : revize.payload && c === 'B'
        ? revize.payload.uniqueEffectB
        : null;
    const merged = _upravMergedBalanc(
      sloucitDusledky(effects, extra && typeof extra === 'object' ? extra : null),
      null
    );
    _aplikujDusledky(merged);
    if (typeof Finance !== 'undefined' && Finance.zkontrolujCilOperace) {
      Finance.zkontrolujCilOperace();
    }
    if (typeof State !== 'undefined' && State.zalogujReviziPripadu) {
      State.zalogujReviziPripadu({
        day: State.get('currentDay'),
        caseId: revize.caseId,
        caseTitle: revize.caseTitle,
        choice: c,
        note,
        effects: merged
      });
    }
    return { choice: c, note, effects: merged };
  }

  function _aktualizujRozhodovaciStyl(pripad, rozsudek) {
    const cur = State.get('rozhodovaci_styl') || {};
    const rs = {
      fair_lid_streak: Number(cur.fair_lid_streak) || 0,
      tough_stat_streak: Number(cur.tough_stat_streak) || 0,
      investigation_streak: Number(cur.investigation_streak) || 0,
      no_investigation_streak: Number(cur.no_investigation_streak) || 0
    };

    if (_verdiktJeFairKChudym(rozsudek)) rs.fair_lid_streak += 1;
    else rs.fair_lid_streak = 0;

    if (_verdiktJeTvrdyNaZlocin(rozsudek)) rs.tough_stat_streak += 1;
    else rs.tough_stat_streak = 0;

    if (_pocetOdhalenychInfo(pripad) > 0) {
      rs.investigation_streak += 1;
      rs.no_investigation_streak = 0;
    } else {
      rs.no_investigation_streak += 1;
      rs.investigation_streak = 0;
    }

    State.set('rozhodovaci_styl', rs);
  }

  function typRazitkaProVerdikt(id) {
    return _rozsudekNaTypRazitka(id);
  }

  function _rozsudekNaTypRazitka(id) {
    const s = String(id || '');
    if (s.startsWith('guilty_')) return 'vinen';
    if (s.startsWith('not_guilty_')) return 'zprostit';
    if (s.startsWith('insufficient_')) return 'odlozit';
    if (s.includes('prison') || s === 'maximum' || s === 'guilty') return 'vinen';
    if (s === 'acquit' || s === 'zprostit') return 'zprostit';
    if (s === 'postpone' || s === 'odlozit') return 'odlozit';
    if (s === 'podminka') return 'podminka';
    if (s === 'pokuta') return 'pokuta';
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
    // Zobraz zprávy o reakcích frakcí (krátký toast — nebrzdit výběr rozsudku)
    const trvaniKratka = typeof UI !== 'undefined' && Number.isFinite(UI.stavovaZpravaKratkaTrvaniMs)
      ? UI.stavovaZpravaKratkaTrvaniMs
      : 5000;
    for (const r of reakce) {
      const zprava = _reakceNaZpravu(r);
      if (zprava) {
        setTimeout(() => UI.zobrazStavovouZpravu(zprava, trvaniKratka), 1000);
        break; // Jedna zpráva najednou
      }
    }
  }

  function _reakceNaZpravu(reakce) {
    /** Mapování na Factions.zkontrolujReakce (např. Moc ≥80 → sledovani = státní dohled). */
    const ZPRAVY = {
      sledovani:              'Cítíš, že tě sledují.',
      politicky_tlak:         'Z ministerstva přišel neformální dotaz.',
      uplatky:                'Advokát čeká venku s obálkou.',
      kompromitujici_nabidka: 'Dostal jsi anonymní dopis.',
      chvala_v_novinach:
        'Tvého rozhodnutí si všimli důležití lidé.',
      verejne_odsouzeni:      'Na ulici tě někdo poznal. Bylo to nepříjemné.',
      verejna_podpora:        'Farář tě veřejně pochválil.'
    };
    return ZPRAVY[reakce.udalost] || null;
  }

  function _zkontrolujSpeciálniKonce(pripad, rozsudek) {
    const stav = State.get();
    const den  = stav.currentDay;

    // Konec ATENTÁT: Haas odsouzen + Stát pod 20 + den >= 25
    const moc = Number(stav.factions.Moc ?? stav.factions.Stat);
    if (stav.flags.haas_odsouzen && Number.isFinite(moc) && moc <= 20 && den >= 25) {
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
    typRazitkaProVerdikt,
    zpracujPrijetiUplatekPoModalu,
    posoudPruzkumProVerdikt,
    pripravSlouceneDusledky,
    sloucitDusledky,
    setOnRozsudek,
    typProZobrazeni,
    vyhodnotTwoClickRozpor,
    potvrdTwoClickRozpor,
    jePruzkumAkceOdemcenaPoClue,
    jeVerdiktOdemcenPoClue,
    popisDuvoduVerdiktu,
    popisNepristupnostiVerdiktu,
    poolVerdiktProjdePoctemPrůzkumu,
    bonusInformovanostiZaClue,
    vypoctiInformovanostPripadu,
    vypoctiProcesniPodkladZCest,
    maInformacniPrahyVerdiktu,
    zpracujVolbuRevize,
    jeTruePairNalezen,
    maPotvrzenouClueVazbu,
    ziskejPotvrzenouClueVazbu,
    ziskejClueFocusMax
  };

})();

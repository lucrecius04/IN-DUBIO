/**
 * cases.js — Systém případů.
 * Načítání, zobrazování, průzkum, zpracování rozsudků.
 */

const Cases = (() => {

  // Aktuálně otevřené případy dne
  let _pripady = [];
  let _onRozsudekCallback = null;

  /**
   * Vždy 3 položky (index = slot složky I–III). Chybějící / neznámé id → null
   * (UI „načítání“). První tři prvky vstupu bereme podle indexu — nesvařovat
   * přes filter(Boolean), jinak se z [idA, null, idC] stane [idA, idC] a sloty se zhorší.
   */
  function nastavPripadyDne(ids) {
    const raw = Array.isArray(ids) ? ids : [];
    const tri = [0, 1, 2].map(i => {
      const x = raw[i];
      if (x == null || String(x).trim() === '') return null;
      return String(x).trim();
    });
    _pripady = tri.map(mid => {
      if (mid == null) return null;
      const c = DataLoader.ziskejPripad(mid);
      if (!c) console.warn('[Cases] nenašel případ pro id:', mid);
      return c || null;
    });
  }

  function _aktZDne(den) {
    if (den <= 10) return 1;
    if (den <= 20) return 2;
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
    if (t === 'routine') return 'rutinni';
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
    if (idsZDne && idsZDne.length > 0) {
      nastavPripadyDne(idsZDne);
      console.log('[Cases] nastavPripadyProDen z days.json.cases', {
        den: d,
        slotId: _pripady.map(p => (p && p.id) || null)
      });
      return;
    }
    const tri = _triPripadyDleDne(d);
    _pripady = tri;
    const naDen = _polePripaduProAkt(_aktZDne(d)).filter(c => c && Number(c.day) === d);
    console.log('[Cases] nastavPripadyProDen', {
      den: d,
      akt: _aktZDne(d),
      zdrojSoubor: d <= 10 ? 'cases-akt1.json' : d <= 20 ? 'cases-akt2.json' : 'cases-akt3.json',
      pripaduNaDen: naDen.length,
      slotId: tri.map(p => (p && p.id) || null)
    });
  }

  function getPripady() {
    return _pripady;
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
        console.log('[Cases] otevírám modál případu:', pripad.id, '(title, situation, svědectví, rozsudky z JSON)');
        UI.zobrazPripad(pripad, (p, r) => zpracujRozsudek(p, r));
      };

      const denN = Number(State.get('currentDay'));
      if (Number.isFinite(denN) && denN % 7 === 1 && State.get('pondeli_vina_emotivni')) {
        const typ = typProZobrazeni(pripad);
        if (typ === 'moralni' || pripad.emotional === true) {
          State.set('pondeli_vina_emotivni', false);
          UI.zobrazFragment({
            type:  'letter',
            title: 'Pondělí',
            text:  'Nedělní ticho je pryč. Tento spis tě zasáhne dřív, než stihneš oddělit lavici od sebe.'
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

  function _zaznamenejTydenniStatistiky(pripad, rozsudek) {
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

    if (typ === 'rutinni') {
      const correctId = pripad.correct_verdict;
      if (correctId) {
        const ok = rozsudek.id === correctId;
        if (ok && pouzit) {
          doplnek.finance = 20;
          doplnek._ui_finance_label = 'Odměna za správný rozsudek (s průzkumem)';
          narativ.push('Pečlivé vyšetřování. +20 Kč.');
        } else if (ok) {
          doplnek.finance = 10;
          doplnek._ui_finance_label = 'Odměna za správný rozsudek';
          narativ.push('Rozsudek odpovídá důkazům. +10 Kč.');
        } else if (!ok) {
          doplnek.finance = -15;
          doplnek.traits.Moudrost = pouzit ? -1 : -2;
          doplnek._ui_finance_label = pouzit
            ? 'Pokuta — rozsudek neobstál'
            : 'Pokuta — rozsudek zpochybněn';
          narativ.push(
            pouzit
              ? 'Přes pečlivé vyšetřování rozsudek neobstál. -15 Kč.'
              : 'Váš rozsudek byl zpochybněn vyšší instancí. -15 Kč.'
          );
        }
      }
    }

    if (typ === 'moralni' && pouzit) {
      doplnek.traits.Moudrost = (doplnek.traits.Moudrost || 0) + 3;
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
      doplnek.finance = (Number(doplnek.finance) || 0) + 10;
      doplnek._ui_finance_label = 'Odměna za uzavření morálního případu';
    }

    if (typ === 'politicky') {
      const stance = _inferPoliticalStance(rozsudek);
      if (stance === 'independent') {
        doplnek.traits.Integrita = (doplnek.traits.Integrita || 0) + 8;
        doplnek.factions.Moc = (doplnek.factions.Moc || 0) - 10;
        narativ.push('Rozhodl jsi nezávisle.');
      } else if (stance === 'system') {
        doplnek.traits.Integrita = (doplnek.traits.Integrita || 0) - 8;
        doplnek.factions.Moc = (doplnek.factions.Moc || 0) + 10;
        narativ.push('Systém si tvůj rozsudek zapíše.');
      }
      if (pouzit && soulad) {
        doplnek.traits.Moudrost = (doplnek.traits.Moudrost || 0) + 3;
      }
      doplnek.finance = (Number(doplnek.finance) || 0) + 10;
      doplnek._ui_finance_label = 'Odměna za uzavření politického případu';
    }

    if (typ === 'osobni') {
      const po = rozsudek.personal_outcome;
      if (po === 'fair') {
        doplnek.traits.Integrita = (doplnek.traits.Integrita || 0) + 5;
        doplnek.traits.Odvaha = (doplnek.traits.Odvaha || 0) + 3;
        narativ.push('Osobní vazby tě neovlivnily.');
      } else if (po === 'biased') {
        doplnek.traits.Vina = (doplnek.traits.Vina || 0) + 8;
        narativ.push('Doufáš že si toho nikdo nevšiml.');
      }
      if (pouzit) {
        doplnek.traits.Moudrost = (doplnek.traits.Moudrost || 0) + 2;
        doplnek.traits.Vina = (doplnek.traits.Vina || 0) - 2;
      }
      doplnek.finance = (Number(doplnek.finance) || 0) + 10;
      doplnek._ui_finance_label = 'Odměna za uzavření osobního případu';
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

  function pripravSlouceneDusledky(pripad, rozsudek) {
    const base = JSON.parse(JSON.stringify(rozsudek.consequences || {}));
    const { doplnek, narativ, meta } = vypoctiTypoveDoplnky(pripad, rozsudek);
    const merged = sloucitDusledky(base, doplnek);
    return { merged, typNarativ: narativ, meta };
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
        traits:   { Integrita: -15 },
        factions: {},
        trust:    {},
        finance:  castka,
        flags:    []
      }
    };
    const { merged, typNarativ, meta } = pripravSlouceneDusledky(pripad, rozsudek);
    merged._ui_finance_label = `Úplatek: +${castka} Kč`;
    const dusledkyRadky = UI.vypoctiDusledkyRadky(merged);

    Finance.prijmoutUplatek(castka, pripad.title || '');
    const den = State.get('currentDay');
    const typRazitka = _rozsudekNaTypRazitka(rozsudek.id);
    Desk.animujRazitko(typRazitka);

    _aktualizujRozhodovaciStyl(pripad, rozsudek);
    _zaznamenejTydenniStatistiky(pripad, rozsudek);

    State.pridejRozsudek({
      day:            den,
      caseId:         String(pripad.id).trim(),
      verdict:        rozsudek.text,
      caseTitle:      pripad.title,
      verdictId:      rozsudek.id,
      consequences:   merged,
      typNarativ:     typNarativ,
      dusledkyRadky:  dusledkyRadky,
      procesniKvalita: meta && meta.procesniKvalita ? meta.procesniKvalita.key : null,
      normativniSmer: meta && meta.normativniSmer ? meta.normativniSmer.key : null
    });
    State.pridejPouzityPripad(pripad.id);

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
    UI.zobrazStavovouZpravu(`Úplatek: ${castka} Kč`);
    setTimeout(() => Engine.zkontrolujKonecDne(), 500);

    if (_onRozsudekCallback) _onRozsudekCallback(pripad, rozsudek);
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
      verdict:        rozsudek.text,
      caseTitle:      pripad.title,
      verdictId:      rozsudek.id,
      consequences:   merged,
      typNarativ:     typNarativ,
      dusledkyRadky:  dusledkyRadky,
      procesniKvalita: meta && meta.procesniKvalita ? meta.procesniKvalita.key : null,
      normativniSmer: meta && meta.normativniSmer ? meta.normativniSmer.key : null
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
    UI.zobrazStavovouZpravu(`Rozsudek: ${rozsudek.text}`);

    // Zkontroluj konec dne
    setTimeout(() => Engine.zkontrolujKonecDne(), 500);

    if (_onRozsudekCallback) _onRozsudekCallback(pripad, rozsudek);
  }

  function _frakcniKlicDoStavu(klic) {
    if (klic === 'Stat') return 'Moc';
    if (klic === 'Obchodnici') return 'Kapital';
    return klic;
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
      const ag = {};
      for (const [klic, delta] of Object.entries(dusledky.factions)) {
        const cil = _frakcniKlicDoStavu(klic);
        if (!cil) continue;
        ag[cil] = (ag[cil] || 0) + Number(delta);
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
      }
    }
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

  function _clueParDleIds(pripad, aId, bId) {
    const cs = _clueSystem(pripad);
    const a = String(aId || '').trim();
    const b = String(bId || '').trim();
    if (!cs || !a || !b || !Array.isArray(cs.pairs)) return null;
    for (const p of cs.pairs) {
      if (!p || typeof p !== 'object') continue;
      const pa = String(p.a_id || '').trim();
      const pb = String(p.b_id || '').trim();
      if ((a === pa && b === pb) || (a === pb && b === pa)) return p;
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
        if (!out.has(id) || min < out.get(id)) out.set(id, min);
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

  function jeVerdiktOdemcenPoClue(pripad, verdictId) {
    const cs = _clueSystem(pripad);
    const vid = String(verdictId || '').trim();
    if (!cs || !vid) return true;
    const prahy = _informacniPrahyMap(pripad, 'verdicts');
    if (prahy.has(vid)) {
      const info = vypoctiInformovanostPripadu(pripad);
      return info.pct >= Number(prahy.get(vid));
    }
    const potvrzeni = _cluePotvrzeni(pripad);
    if (!potvrzeni) return true;
    const rewards = _clueRewardsProSilu(pripad, potvrzeni.strength);
    const unlockVerdicts = (rewards && Array.isArray(rewards.unlock_verdict_ids))
      ? rewards.unlock_verdict_ids.map(x => String(x || '').trim()).filter(Boolean)
      : [];
    if (!unlockVerdicts.includes(vid)) return true;
    return !!potvrzeni;
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
   * @returns {{ok:boolean, reason?:string, pairId?:string, strength?:string, label?:string, aId?:string, bId?:string}}
   */
  function vyhodnotTwoClickRozpor(pripad, firstClueId, secondClueId) {
    const cs = _clueSystem(pripad);
    if (!cs) return { ok: false, reason: 'disabled' };
    const a = String(firstClueId || '').trim();
    const b = String(secondClueId || '').trim();
    if (!a || !b || a === b) return { ok: false, reason: 'invalid' };
    const p = _clueParDleIds(pripad, a, b);
    if (!p) return { ok: false, reason: 'mismatch' };
    const pairId = String(p.pair_id || '').trim();
    if (!pairId) return { ok: false, reason: 'mismatch' };
    const strengthRaw = String(p.strength || '').trim();
    const strength = strengthRaw || (String(cs.true_pair_id || '').trim() === pairId ? 'strong' : 'medium');
    return {
      ok: true,
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
    if (maPotvrzenouClueVazbu(pripad)) soulad = true;
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

  function _vyhodnotProcesniKvalitu(pripad, rozsudek) {
    const pr = posoudPruzkumProVerdikt(pripad, rozsudek);
    const info = vypoctiInformovanostPripadu(pripad);
    const infoPct = Number(info && info.pct);
    const potvrz = ziskejPotvrzenouClueVazbu(pripad);
    let score = 0;

    if (Number.isFinite(infoPct)) {
      if (infoPct >= 90) score += 2;
      else if (infoPct >= 70) score += 1;
      else if (infoPct < 40) score -= 1;
    }

    if (potvrz) {
      if (potvrz.strength === 'strong') score += 2;
      else if (potvrz.strength === 'medium') score += 1;
    }

    if (pr.pouzitPruzkum) score += 1;
    if (pr.soulad) score += 1;
    else if (pr.pouzitPruzkum) score -= 1;

    if (score <= 0) {
      return { key: 'nizka', label: 'procesně slabé' };
    }
    if (score <= 2) {
      return { key: 'stredni', label: 'procesně přijatelné' };
    }
    return { key: 'vysoka', label: 'procesně pečlivé' };
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
      doplnek.traits.Moudrost = (doplnek.traits.Moudrost || 0) + 2;
      doplnek.traits.Integrita = (doplnek.traits.Integrita || 0) + 1;
      doplnek.traits.Vina = (doplnek.traits.Vina || 0) - 1;
      narativ.push('Postup byl procesně pečlivý.');
    } else if (procesni && procesni.key === 'stredni') {
      doplnek.traits.Moudrost = (doplnek.traits.Moudrost || 0) + 1;
      narativ.push('Postup byl procesně přijatelný.');
    } else {
      doplnek.traits.Moudrost = (doplnek.traits.Moudrost || 0) - 1;
      doplnek.traits.Vina = (doplnek.traits.Vina || 0) + 1;
      narativ.push('Procesní opora rozsudku byla slabá.');
    }

    if (normativni && normativni.key === 'legalistni') {
      doplnek.factions.Moc = (doplnek.factions.Moc || 0) + 2;
      doplnek.factions.Lid = (doplnek.factions.Lid || 0) - 2;
    } else if (normativni && normativni.key === 'socialni') {
      doplnek.factions.Lid = (doplnek.factions.Lid || 0) + 2;
      doplnek.factions.Moc = (doplnek.factions.Moc || 0) - 1;
      doplnek.factions.Kapital = (doplnek.factions.Kapital || 0) - 1;
    } else {
      doplnek.traits.Integrita = (doplnek.traits.Integrita || 0) + 1;
    }

    return { doplnek, narativ };
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
      chvala_v_novinach:      'Závadová o tobě napsala pozitivně.',
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
    bonusInformovanostiZaClue,
    vypoctiInformovanostPripadu,
    maInformacniPrahyVerdiktu,
    jeTruePairNalezen,
    maPotvrzenouClueVazbu,
    ziskejPotvrzenouClueVazbu
  };

})();

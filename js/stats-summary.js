/**
 * stats-summary.js — Přehled vyprávění po epilogu (agregace ze stavu hry).
 */

const StatsSummary = (() => {

  const RYSY = ['Integrita', 'Odvaha', 'Moudrost', 'Vina', 'Nadeje'];
  const FRAKCE = [
    { stateKey: 'Moc' },
    { stateKey: 'Kapital' },
    { stateKey: 'Lid' }
  ];
  /** Stejné pásmo jako zápisník → Pověst → Frakce (`ui.js`). */
  const PASMA_FRAKCE = ['nenáviděn', 'v nemilosti', 'neutrální', 'oblíben', 'milován'];
  const TYPY_KONCE = {
    odvolani: 'Odvolání',
    korupce: 'Korupce',
    'atentát': 'Atentát',
    preziti: 'Přežití',
    hrdina: 'Hrdina',
    smireni: 'Smíření',
    utek: 'Útěk',
    rad: 'Kruh',
    anna: 'Anna'
  };

  function _pasmoIndex100(v) {
    const x = Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
    return Math.min(4, Math.floor(x / 20));
  }

  function _pasmoTextFrakce(hodnota) {
    return PASMA_FRAKCE[_pasmoIndex100(hodnota)] || '—';
  }

  /** 0–100 → ★ / ⯪ (polovina intervalu 20) / ☆ — bez čísel. */
  function _hvezdicky(hodnota) {
    const h = Math.max(0, Math.min(100, Number(hodnota) || 0));
    let out = '';
    for (let i = 0; i < 5; i++) {
      const dolni = i * 20;
      const horni = dolni + 20;
      if (h >= horni) out += '★';
      else if (h >= dolni + 10) out += '⯪';
      else out += '☆';
    }
    return out;
  }

  function _textOperaceMatky(flags) {
    const f = flags && typeof flags === 'object' ? flags : {};
    if (f.operace_zaplacena === true) {
      if (f.operace_vyhodnoceni_den16_rano === true) {
        return 'Ano — poplatek u MUDr. Síbera byl zaplacen v termínu.';
      }
      return 'Ano — na poplatek u lékaře máte dostatek úspor.';
    }
    if (f.operace_odlozena === true) {
      return 'Ne — termín propadl, matčina operace byla odložena.';
    }
    const den = Number(State.get('currentDay')) || 0;
    const deadline =
      typeof Finance !== 'undefined' && Number.isFinite(Number(Finance.OPERACE_DEADLINE_DEN))
        ? Number(Finance.OPERACE_DEADLINE_DEN)
        : 16;
    if (den >= deadline) {
      return 'Ne — k uzávěrce lhůty nebyla částka složena.';
    }
    return 'Zatím nejasné — lhůta z dopisu ještě neskončila.';
  }

  function _kategorieVerdiktu(verdictId) {
    const id = String(verdictId || '').trim().toLowerCase();
    if (id === 'uplatek') return 'Úplatek';
    if (id.startsWith('guilty_')) return 'Vinen';
    if (id.startsWith('not_guilty_')) return 'Nevinen';
    if (id.startsWith('insufficient_')) return 'Odloženo';
    if (id === 'acquit' || id === 'zprostit') return 'Nevinen';
    if (id === 'guilty' || id === 'maximum' || id === 'prison') return 'Vinen';
    return '—';
  }

  function _typZaznamuRozsudku(r) {
    const raw = r && r.caseType != null ? String(r.caseType).trim().toLowerCase() : '';
    if (raw === 'rutinni' || raw === 'moralni' || raw === 'politicky' || raw === 'osobni') return raw;
    return 'rutinni';
  }

  function _skupinaVerdiktu(r) {
    const id = String(r && r.verdictId || '').toLowerCase();
    if (id === 'uplatek') return 'uplatek';
    if (_typZaznamuRozsudku(r) === 'osobni') {
      if (id.startsWith('insufficient')) return 'nedostatek';
      if (id.startsWith('not_guilty')) return 'odmitnuto';
      if (id.startsWith('guilty')) return 'prijato';
      return 'osobni_jine';
    }
    if (id.startsWith('insufficient')) return 'nedostatek';
    if (id.startsWith('not_guilty')) return 'zprosteni';
    if (id.startsWith('guilty')) return 'vinen';
    return 'ostatni';
  }

  function _procesniLabel(k) {
    if (k === 'vysoka') return 'vysoká';
    if (k === 'stredni') return 'střední';
    if (k === 'nizka') return 'nízká';
    return '—';
  }

  function _normativLabel(k) {
    if (k === 'legalistni') return 'přísnější k zákonu';
    if (k === 'socialni') return 'sociálnější';
    if (k === 'vyvazeny') return 'vyvážený';
    return '—';
  }

  function _pocetOdhalenychPruzkumu(caseId, pripad) {
    const cid = String(caseId || '').trim();
    if (!cid) return 0;
    const arr = State.get('revealedInfo.' + cid);
    if (Array.isArray(arr) && arr.length) return arr.length;
    if (!pripad || !pripad.investigation) return 0;
    const inv = pripad.investigation;
    let max = 0;
    if (inv.interview) max++;
    if (inv.records) max++;
    if (inv.informant) max++;
    return 0;
  }

  function _pocetPotvrzenychVazeb() {
    const conf = State.get('clueConfirmations') || {};
    return Object.keys(conf).filter(k => conf[k] && conf[k].pairId).length;
  }

  /** Přehled vyprávění — jen klíčové NPC s důvěrou (ne celý zápisník → Pověst). */
  const SOUHRN_POVEST_IDS = new Set(['vlcek', 'zavadova', 'karas']);

  function _povestPostavy() {
    const odem = State.get('flags.povest_odemcene_ids');
    const ids = (Array.isArray(odem) ? odem : []).filter(id => SOUHRN_POVEST_IDS.has(String(id)));
    const vse = (typeof DataLoader !== 'undefined' && DataLoader.ziskej)
      ? (DataLoader.ziskej('postavy_okoli') || [])
      : [];
    const mapa = {};
    for (const p of vse) {
      if (p && p.id) mapa[String(p.id)] = p;
    }
    return ids.map(id => {
      const p = mapa[String(id)] || {};
      const trustKlic = { horakova: 'zavadova', masek: 'karas' }[id] || id;
      let duvera = null;
      if (['vlcek', 'zavadova', 'karas'].includes(trustKlic)) {
        const t = Number(State.get('trust.' + trustKlic));
        if (Number.isFinite(t)) {
          duvera = typeof Characters !== 'undefined' && Characters.getDuveraVizitka
            ? Characters.getDuveraVizitka(trustKlic)
            : String(t);
        }
      }
      return {
        id: String(id),
        nazev: p.nazev || id,
        role: p.role || '',
        duvera
      };
    });
  }

  function _agregujTrendy(rozsudky) {
    const n = rozsudky.length;
    const v = {
      vinen: 0,
      zprosteni: 0,
      nedostatek: 0,
      uplatek: 0,
      prijato: 0,
      odmitnuto: 0,
      osobni_jine: 0,
      ostatni: 0
    };
    const proc = { nizka: 0, stredni: 0, vysoka: 0 };
    const norm = { legalistni: 0, socialni: 0, vyvazeny: 0 };
    const path = { plus: 0, minus: 0, neutral: 0, soucet: 0 };
    let procN = 0;
    let normN = 0;
    let pathN = 0;
    let sumEvidence = 0;
    let sumCoherence = 0;
    let evN = 0;
    let cohN = 0;
    let sumInfo = 0;
    let infoN = 0;
    let sumPruzkum = 0;

    for (const r of rozsudky) {
      const g = _skupinaVerdiktu(r);
      if (g === 'vinen') v.vinen++;
      else if (g === 'zprosteni') v.zprosteni++;
      else if (g === 'nedostatek') v.nedostatek++;
      else if (g === 'uplatek') v.uplatek++;
      else if (g === 'prijato') v.prijato++;
      else if (g === 'odmitnuto') v.odmitnuto++;
      else if (g === 'osobni_jine') v.osobni_jine++;
      else v.ostatni++;

      const pk = r && r.procesniKvalita != null ? String(r.procesniKvalita).trim() : '';
      if (pk === 'nizka' || pk === 'stredni' || pk === 'vysoka') {
        proc[pk]++;
        procN++;
      }
      const nk = r && r.normativniSmer != null ? String(r.normativniSmer).trim() : '';
      if (nk === 'legalistni' || nk === 'socialni' || nk === 'vyvazeny') {
        norm[nk]++;
        normN++;
      }
      const pd = Number(r && r.pathEvidenceDelta);
      if (Number.isFinite(pd)) {
        pathN++;
        path.soucet += pd;
        if (pd > 0) path.plus++;
        else if (pd < 0) path.minus++;
        else path.neutral++;
      }
      const ev = Number(r && r.evidenceScore);
      if (Number.isFinite(ev)) {
        sumEvidence += ev;
        evN++;
      }
      const co = Number(r && r.coherenceScore);
      if (Number.isFinite(co)) {
        sumCoherence += co;
        cohN++;
      }
      if (r && r._infoPct != null && Number.isFinite(Number(r._infoPct))) {
        sumInfo += Number(r._infoPct);
        infoN++;
      }
      if (Number.isFinite(Number(r && r._pruzkumCount))) {
        sumPruzkum += Number(r._pruzkumCount);
      }
    }

    const pct = x => (n ? Math.round((x / n) * 100) : 0);
    return {
      pocet: n,
      smer: v,
      smerText: [
        v.vinen ? `vina / trest ${v.vinen}× (${pct(v.vinen)} %)` : '',
        v.zprosteni ? `zproštění ${v.zprosteni}× (${pct(v.zprosteni)} %)` : '',
        v.nedostatek ? `odloženo ${v.nedostatek}× (${pct(v.nedostatek)} %)` : '',
        v.prijato ? `přijato / ponecháno ${v.prijato}× (${pct(v.prijato)} %)` : '',
        v.odmitnuto ? `odmítnuto ${v.odmitnuto}× (${pct(v.odmitnuto)} %)` : '',
        v.uplatek ? `úplatek ${v.uplatek}×` : '',
        v.osobni_jine ? `osobní volba ${v.osobni_jine}×` : '',
        v.ostatni ? `jiný výrok ${v.ostatni}×` : ''
      ].filter(Boolean).join(' · '),
      procesni: proc,
      procesniN: procN,
      normativni: norm,
      normativniN: normN,
      path,
      pathN,
      prumerEvidence: evN ? Math.round(sumEvidence / evN) : null,
      prumerKoherence: cohN ? Math.round(sumCoherence / cohN) : null,
      prumerInformovanost: infoN ? Math.round(sumInfo / infoN) : null,
      celkemPruzkumu: sumPruzkum
    };
  }

  function sestav() {
    const rozsudkyRaw = State.get('archive.verdicts') || [];
    const rozsudky = rozsudkyRaw.map(r => {
      const cid = String(r.caseId || '').trim();
      const pripad = cid && typeof DataLoader !== 'undefined' && DataLoader.ziskejPripad
        ? DataLoader.ziskejPripad(cid)
        : null;
      let infoPct = null;
      if (pripad && typeof Cases !== 'undefined' && Cases.vypoctiInformovanostPripadu) {
        const info = Cases.vypoctiInformovanostPripadu(pripad) || {};
        if (Number.isFinite(Number(info.pct))) infoPct = Math.round(Number(info.pct));
      }
      const vazba = pripad && typeof Cases !== 'undefined' && Cases.ziskejPotvrzenouClueVazbu
        ? Cases.ziskejPotvrzenouClueVazbu(pripad)
        : null;
      let vazbaText = 'Nenalezena';
      if (vazba && vazba.strength) {
        const s = String(vazba.strength);
        if (s === 'strong') vazbaText = 'Potvrzená (silná)';
        else if (s === 'medium') vazbaText = 'Potvrzená (střední)';
        else if (s === 'weak') vazbaText = 'Potvrzená (slabá)';
        else vazbaText = 'Potvrzená';
      }
      return {
        ...r,
        _infoPct: infoPct,
        _pruzkumCount: _pocetOdhalenychPruzkumu(cid, pripad),
        _vazbaText: vazbaText
      };
    });

    const tyd = State.get('tydenni_statistiky') || {};
    const styl = State.get('rozhodovaci_styl') || {};
    const flags = State.get('flags') || {};
    const kamp = State.get('kampan_statistiky') || {};
    const pc = Number(kamp.pripady_celkem) || rozsudky.length || 0;
    const pPr = Number(kamp.pripady_s_prurzkumem) || 0;
    const zustatek = Math.round(Number(State.get('finance.balance')) || 0);
    const vinaK = Number(State.get('traits.Vina')) || 50;
    const cenaSpravedlnosti = Math.round(Math.max(0, zustatek - 20) / Math.max(1, 100 - vinaK));
    const vGuilty = Number(kamp.verdikty_guilty) || 0;
    const vNg = Number(kamp.verdikty_ng) || 0;
    const vTvrdy = Number(kamp.verdikty_tvrdy) || 0;
    return {
      typKonce: State.get('endingType') || null,
      den: Number(State.get('currentDay')) || null,
      rysy: RYSY.map(nazev => ({
        nazev,
        hodnota: Number(State.get('traits.' + nazev)) || 0,
        hvezdy: _hvezdicky(State.get('traits.' + nazev))
      })),
      frakce: FRAKCE.map(({ stateKey }) => {
        const hodnota = Number(State.get('factions.' + stateKey)) || 50;
        const lab =
          typeof Factions !== 'undefined' && Factions.getNazev
            ? Factions.getNazev(stateKey)
            : stateKey;
        return {
          klic: stateKey,
          nazev: lab,
          pasmo: _pasmoTextFrakce(hodnota)
        };
      }),
      operaceMatky: _textOperaceMatky(flags),
      povest: _povestPostavy(),
      finance: {
        zustatek,
        dluh: Math.round(Number(State.get('finance.dluh')) || 0),
        operaceZaplacena: flags.operace_zaplacena === true,
        operaceOdlozena: flags.operace_odlozena === true
      },
      kampan: {
        pripadyCelkem: pc,
        pripadySPrurzkumem: pPr,
        pomerPruzkum: pc > 0 ? Math.round((pPr / pc) * 100) : null,
        verdiktyGuilty: vGuilty,
        verdiktyNg: vNg,
        verdiktyTvrdy: vTvrdy,
        uplatky: Number(kamp.uplatky_prijaty) || 0
      },
      cenaSpravedlnosti,
      vypraveni: {
        rozsudky,
        trendy: _agregujTrendy(rozsudky),
        fragmenty: (State.get('archive.fragments') || []).length,
        potvrzeneVazby: _pocetPotvrzenychVazeb(),
        tydenni: {
          pruzkumPouzit: Number(tyd.pruzkum_pouzit) || 0,
          pripadySPrurzkumem: Number(tyd.pripady_s_prurzkumem) || 0,
          pripadyCelkem: Number(tyd.pripady_celkem) || rozsudky.length,
          pripadyOdlozeny: Number(tyd.pripady_odlozeny) || 0,
          tezkeRozsudky: Number(tyd.tezke_rozsudky) || 0,
          uplatek: tyd.uplatek_prijat === true
        },
        styly: {
          fairLid: Number(styl.fair_lid_streak) || 0,
          toughStat: Number(styl.tough_stat_streak) || 0,
          investigation: Number(styl.investigation_streak) || 0,
          noInvestigation: Number(styl.no_investigation_streak) || 0
        }
      }
    };
  }

  function _sekce(nadpis, obsahEl) {
    const sec = document.createElement('section');
    sec.className = 'konec-stat-sekce';
    const h = document.createElement('h3');
    h.className = 'konec-stat-sekce-nadpis';
    h.textContent = nadpis;
    sec.appendChild(h);
    sec.appendChild(obsahEl);
    return sec;
  }

  function _radek(label, hodnota) {
    const row = document.createElement('div');
    row.className = 'konec-stat-radek';
    const l = document.createElement('span');
    l.className = 'konec-stat-radek-label';
    l.textContent = label;
    const v = document.createElement('span');
    v.className = 'konec-stat-radek-hodnota';
    if (typeof hodnota === 'string' && hodnota.includes('<')) {
      v.innerHTML = hodnota;
    } else {
      v.textContent = hodnota;
    }
    row.appendChild(l);
    row.appendChild(v);
    return row;
  }

  function vykresliDo(container, data) {
    if (!container || !data) return;
    container.innerHTML = '';

    const typ = data.typKonce;
    const uvod = document.createElement('p');
    uvod.className = 'konec-stat-uvod';
    uvod.textContent =
      'Souhrn příběhu — vlastnosti, vztahy, spisy.';
    container.appendChild(uvod);

    if (typ) {
      const chip = document.createElement('div');
      chip.className = 'konec-stat-konec-chip';
      chip.textContent = 'Konec: ' + (TYPY_KONCE[typ] || typ);
      container.appendChild(chip);
    }

    if (data.cenaSpravedlnosti != null && Number.isFinite(data.cenaSpravedlnosti)) {
      const karta = document.createElement('p');
      karta.className = 'konec-stat-karta-text';
      const k = data.kampan || {};
      const pruz =
        k.pomerPruzkum != null ? ` Průzkum u ${k.pomerPruzkum} % spisů.` : '';
      const tvr =
        k.verdiktyTvrdy > 0 ? ` Tvrdých verdiktů: ${k.verdiktyTvrdy}.` : '';
      karta.textContent =
        'Cena spravedlnosti (úspory vůči vině): ' +
        data.cenaSpravedlnosti +
        '.' +
        pruz +
        tvr;
      container.appendChild(karta);
    }

    const gridRysy = document.createElement('div');
    gridRysy.className = 'konec-stat-grid';
    for (const r of data.rysy) {
      const box = document.createElement('div');
      box.className = 'konec-stat-karta';
      box.innerHTML =
        `<div class="konec-stat-karta-nazev">${r.nazev}</div>` +
        `<div class="konec-stat-karta-hvezdy" aria-label="${r.nazev}">${r.hvezdy}</div>`;
      gridRysy.appendChild(box);
    }
    container.appendChild(_sekce('Vlastnosti', gridRysy));

    const opText = document.createElement('p');
    opText.className = 'konec-stat-operace-text';
    opText.textContent = data.operaceMatky || '—';
    container.appendChild(_sekce('Matčina operace', opText));

    const listFr = document.createElement('div');
    listFr.className = 'konec-stat-list';
    for (const f of data.frakce) {
      listFr.appendChild(_radek(f.nazev, f.pasmo || '—'));
    }
    container.appendChild(_sekce('Frakce', listFr));

    const listPo = document.createElement('div');
    listPo.className = 'konec-stat-list';
    if (!data.povest.length) {
      listPo.appendChild(_radek('—', 'Žádné záznamy v pověsti.'));
    } else {
      for (const p of data.povest) {
        const du = p.duvera ? ` · důvěra ${p.duvera}` : '';
        listPo.appendChild(_radek(p.nazev, (p.role || '—') + du));
      }
    }
    container.appendChild(_sekce('Pověst — Vlček, Závadová, Karas', listPo));

    const tr = data.vypraveni.trendy;
    const souhrn = document.createElement('div');
    souhrn.className = 'konec-stat-list';
    souhrn.appendChild(_radek('Vyřešených spisů', String(tr.pocet)));
    if (tr.smerText) souhrn.appendChild(_radek('Směr rozhodování', tr.smerText));
    if (tr.procesniN > 0) {
      const bits = [];
      if (tr.procesni.nizka) bits.push(`slabší ${tr.procesni.nizka}×`);
      if (tr.procesni.stredni) bits.push(`přijatelné ${tr.procesni.stredni}×`);
      if (tr.procesni.vysoka) bits.push(`pečlivé ${tr.procesni.vysoka}×`);
      souhrn.appendChild(_radek('Procesní stopa', bits.join(', ')));
    }
    if (tr.normativniN > 0) {
      const bitsN = [];
      if (tr.normativni.legalistni) bitsN.push(`k zákonu ${tr.normativni.legalistni}×`);
      if (tr.normativni.socialni) bitsN.push(`sociální ${tr.normativni.socialni}×`);
      if (tr.normativni.vyvazeny) bitsN.push(`vyvážené ${tr.normativni.vyvazeny}×`);
      souhrn.appendChild(_radek('Normativní odstín', bitsN.join(', ')));
    }
    if (tr.pathN > 0) {
      const avg = Math.round((tr.path.soucet / tr.pathN) * 10) / 10;
      souhrn.appendChild(_radek(
        'Průzkumné cesty',
        `posílily ${tr.path.plus}×, oslabily ${tr.path.minus}×, neutrálně ${tr.path.neutral}× · průměr ${avg > 0 ? '+' : ''}${avg}`
      ));
    }
    if (tr.prumerInformovanost != null) {
      souhrn.appendChild(_radek('Průměrná informovanost', `${tr.prumerInformovanost} %`));
    }
    if (tr.prumerEvidence != null) souhrn.appendChild(_radek('Průměrná evidence', `${tr.prumerEvidence} %`));
    if (tr.prumerKoherence != null) souhrn.appendChild(_radek('Průměrná koherence stop', `${tr.prumerKoherence} %`));
    souhrn.appendChild(_radek('Odhalených kroků průzkumu (celkem)', String(tr.celkemPruzkumu)));
    souhrn.appendChild(_radek('Potvrzených vazeb stop', String(data.vypraveni.potvrzeneVazby)));
    souhrn.appendChild(_radek('Přečtených záznamů (fragmenty)', String(data.vypraveni.fragmenty)));
    const ty = data.vypraveni.tydenni;
    if (ty.pripadyCelkem > 0) {
      souhrn.appendChild(_radek(
        'Spisy s průzkumem',
        `${ty.pripadySPrurzkumem} z ${ty.pripadyCelkem}`
      ));
    }
    if (ty.pripadyOdlozeny > 0) souhrn.appendChild(_radek('Odložené spisy', String(ty.pripadyOdlozeny)));
    if (ty.tezkeRozsudky > 0) souhrn.appendChild(_radek('Těžší rozsudky (dopad)', String(ty.tezkeRozsudky)));
    if (ty.uplatek) souhrn.appendChild(_radek('Úplatek', 'přijat'));
    container.appendChild(_sekce('Cesta příběhem', souhrn));

    const fin = document.createElement('div');
    fin.className = 'konec-stat-list';
    fin.appendChild(_radek('Úspory', `${data.finance.zustatek} Kčs`));
    if (data.finance.dluh > 0) fin.appendChild(_radek('Dluh', `${data.finance.dluh} Kčs`));
    container.appendChild(_sekce('Finance', fin));

    const tabWrap = document.createElement('div');
    tabWrap.className = 'konec-stat-tabulka-wrap';
    const tab = document.createElement('table');
    tab.className = 'konec-stat-tabulka';
    tab.innerHTML =
      '<thead><tr>' +
      '<th>Spis</th><th>Výrok</th><th>Průzkum</th><th>Info.</th><th>Vazba</th><th>Proces</th>' +
      '</tr></thead>';
    const tbody = document.createElement('tbody');
    for (const r of data.vypraveni.rozsudky) {
      const trRow = document.createElement('tr');
      const info = r._infoPct != null ? `${r._infoPct} %` : '—';
      const proc = _procesniLabel(String(r.procesniKvalita || '').trim());
      trRow.innerHTML =
        `<td>${(r.caseTitle || r.caseId || '—').replace(/</g, '&lt;')}</td>` +
        `<td>${_kategorieVerdiktu(r.verdictId)}</td>` +
        `<td>${r._pruzkumCount != null ? r._pruzkumCount : '—'}</td>` +
        `<td>${info}</td>` +
        `<td>${(r._vazbaText || '—').replace(/</g, '&lt;')}</td>` +
        `<td>${proc}</td>`;
      tbody.appendChild(trRow);
    }
    tab.appendChild(tbody);
    tabWrap.appendChild(tab);
    if (!data.vypraveni.rozsudky.length) {
      const prazd = document.createElement('p');
      prazd.className = 'konec-stat-prazdne';
      prazd.textContent = 'Žádné uzavřené spisy v archivu.';
      tabWrap.appendChild(prazd);
    }
    container.appendChild(_sekce('Spisy — detail', tabWrap));
  }

  return {
    sestav,
    vykresliDo
  };

})();

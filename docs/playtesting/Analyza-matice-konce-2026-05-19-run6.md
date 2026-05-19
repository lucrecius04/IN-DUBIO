# Analýza matice konců — běh 6 (8×19 dní, po F1–F4)

**Datum:** 2026-05-19 (večer)  
**Zdroj:** ruční běhy `node scripts/playtest-run.js <persona> 19`  
**Engine:** F1 kalendář + F2 přežití/hrdina + F4 Anna

---

## 1. Souhrn matice

| Persona | Cíl | Výsledek | Den | Zásah |
|---------|-----|----------|-----|-------|
| `stredni_cesta` | přežití | **preziti** | 19 | ✓ |
| `korupcni` | korupce | **korupce** | 15 | ✓ |
| `hrdina_cisty` | hrdina | **hrdina** | 19 | ✓ |
| `zbohaceny_utek` | útěk | **utek** | 17 | ✓ |
| `smireni_mekky` | smíření | **preziti** | 19 | ✗ |
| `atentat_moc` | atentát | **atentát** | 17 | ✓ |
| `kruh_temny` | kruh | **rad** | 16 | ✓ |
| `anna_pravda` | Anna | **anna** | 18 | ✓ |

**Zásah cíle: 7/8** · **Unikátní konce: 7/8** (chybí `smireni` v sadě)

Reporty (nejnovější z 21:27–22:07):  
`499cbd04…` stredni · `a4387e0d…` korupcni · `d1af2323…` hrdina · `e3751121…` zbohaceny · `60565ed4…` smireni · `d5e86a4e…` atentat · `1ca86530…` kruh · `a50334fc…` anna

---

## 2. Kalendář konců (F1) — funguje

| Konec | Očekávaný den | Skutečnost |
|-------|---------------|------------|
| korupce | 15 | 15 ✓ |
| rad | 16 | 16 ✓ |
| smireni | 16–17 | — (nepadlo) |
| utek / atentát | 17 | 17 ✓ |
| anna | 18 | 18 ✓ |
| hrdina / přežití | 19 | 19 ✓ |

Hráč u sedmi větví **dožije** scénu z mapy (Haas → … → Velezrada). To je velké zlepšení oproti běhu 4 (většina konců na D15).

---

## 3. Proč `smireni_mekky` → `preziti` (regrese F4)

Na D16–18 persona splňuje skoro vše pro **smíření** (Beneš přijal, INT 100, Vina ≤ 28, balance 271–344, operace nezaplacena).

**Blokuje ji `profilAnnaPotencial`** (F4):

- Beneš přijal ✓  
- `osobni_cena === 'odmitl'` (operace odložena) ✓  
- vysoký průzkum (89 %) ✓  
- `!operPl` ✓  

→ Engine považuje profil za **annin potenciál** a **smíření vůbec nevyhodnotí** (`!profilAnnaPotencial`).

Anna na D18 **nepadne** (balance > 165), takže hra pokračuje až na D19 → **fallback `preziti`**.

**Doporučení:** `profilAnnaPotencial` zpřesnit (např. vyžadovat `bal < 165` nebo `moudrost` + chudší profil), nebo smíření povolit při `operPl || bal >= 140` i když je annin potenciál, pokud `bal >= 130`.

---

## 4. Veličiny — kritický stav

### 4.1 Rysy (Integrita, Odvaha, Vina, …)

| Persona | INT konec | ODV | VIN | Poznámka |
|---------|-----------|-----|-----|----------|
| stredni | 100 | 97 | 85 | „Střed“ jen díky neutrálnímu Vlčkovi + fallback D19 |
| korupcni | 44 | 62 | 100 | Extrém drží ✓ |
| hrdina | 100 | 100 | 88 | Čistá větev ✓ |
| zbohaceny | 95 | 85 | 100 | Bohatý únik ✓ |
| smireni | 100 | 100 | 5 | Měkká větev v číslech, špatný konec |
| atentat | 100 | 100 | 100 | Atentát přesto sedí (vzdor, Beneš) |
| kruh | 50 | 64 | 99 | Temná větev ✓ |
| anna | 100 | 100 | 1 | Archivář ✓ |

**Problém:** `not_guilty` / mírné verdikty **tlačí INT na strop 100** u 6/8 person. Střední persona nedrží pásmo 30–70 — přežití je **fallback**, ne čistý střední profil.

**Doporučení (F2d / vlna C):** mírnější INT bonus u NG, nebo strop „měkkých“ verdiktů; u přežití zvážit pásmo 25–75.

### 4.2 Finance

| Persona | Konec | Balance |
|---------|-------|---------|
| anna | anna | 145 |
| hrdina | hrdina | 221 |
| stredni | preziti | 229 |
| smireni | preziti | 385 |
| atentat | atentát | 584 |
| zbohaceny | utek | 645 |
| korupcni | korupce | 694 |
| kruh | rad | 735 |

**Spread ~145–735 Kčs** — útěk vs. Anna vs. korupce jsou oddělené.  
**Slabina:** smíření persona končí bohatá (385) a stejně bez smíření; operace u ní `odlozena` místo `zaplacena` (persona má `zaplatit_vcas`, ale runner/ekonomika ji neprovedla včas?).

### 4.3 Frakce (konec)

| Persona | Moc | Lid | Kapital |
|---------|-----|-----|---------|
| anna / smireni / zbohaceny | 0 | 100 | 0–1 |
| korupcni | 100 | 0 | 57 |
| kruh | 95 | 18 | 54 |
| hrdina | 96 | 16 | 57 |
| stredni | 16 | 100 | 7 |

Frakce **extrémně polarizují** (0/100) u měkkých person — hráč může cítit „přepínač“, ne postupnou dráhu. Zkontrolovat prahy fragmentů (vlna C3).

### 4.4 Průzkum

| Persona | pruzkum_na_spis (kampaň) |
|---------|--------------------------|
| anna | 0,74 |
| stredni / smireni / atentat / zbohaceny | ~0,88–0,89 |
| kruh | 0 (persona `pruzkum: none`) |
| korupcni / hrdina | 0* |

\*U korupce/hrdiny metrika z kampaně může být 0 při malém počtu `pripady_celkem` v reportu — ověřit F4a v JSON (`kampan_statistiky`).

### 4.5 Uzly (vzorky)

- **korupce:** `uplatek_prijat`, `haas=zavazany`, `vlcek=kompromitovan` ✓  
- **hrdina:** `vzdor`, `benes=odmitl`, `haas=odmitnut` ✓  
- **anna:** `benes=prijal`, `osobni=odmitl`, chudoba ✓  
- **útěk:** `osobni=zaplatil`, bohatý ✓  

Uzlová logika pro dosažené konce **sedí s designem**.

---

## 5. Hratelnost (lidský hráč)

| Oblast | Hodnocení |
|--------|-----------|
| **Dosažitelnost 8 konců (bot)** | 7/8 — mechanicky téměř hotovo |
| **Kalendář vs. mapa** | Silné — konce u správných milníků |
| **Čitelnost cesty** | Střední — extrémy v číslech; smíření vs. Anna se překrývají |
| **Pocit „moje rozhodnutí“** | **Neověřeno** — chybí F6 (ruční průchody) |
| **Ekonomický tlak** | Anna jde do mínusu (OK); korupce/kruh bohatnou (OK) |

Automatická matice **neříká**, jestli je hra zábavná — jen že engine umí rozdělit větve.

---

## 6. Prioritní další kroky

1. **P0 — Opravit smíření vs. Anna** (`profilAnnaPotencial` vs. `smireni`) → cíl 8/8.  
2. **P1 — F6** ruční hraní (přežití, smíření, Anna) + průvodce 8 konců.  
3. **P2 — Drift rysů** (INT→100) u měkkých person; volitelně F2d.  
4. **P3 — F5** sjednotit `economy.mdc`, UI hint operace; 7d smoke 4 person.  
5. **P3 — Frakce** zpomalit skok na 0/100 u NG voleb.

---

## 7. Verdikt

**Balancing konců:** z **„většina na D15“** na **„7/8 správných větví ve správný den“** — velký pokrok.  
**Celková hratelnost:** připravená na **playtest člověkem**, ne na release — jedna logická díra (smíření), přílišný drift k extrémům v rysích, frakce jako přepínač.

*Po opravě smíření doporučen běh 7 (plná matice) + 2 ruční session (F6).*

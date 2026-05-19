# Analýza matice konců — `npm run playtest:konce` (19 dní)

**Datum běhu:** 2026-05-18/19  
**Stav:** 8/8 běhů dokončeno (`exit 0`), žádný `ABORTED`.

---

## Souhrnná tabulka

| Persona | Cíl | Skutečný konec | Den | Finance | Úplatek | Poznámka |
|---------|-----|----------------|-----|---------|---------|----------|
| `stredni_cesta` | přežití | **preziti** ✓ | 19 | 180 | ne | Fallback D19, rysy extrémní (INT 100, VIN 87) |
| `korupcni` | korupce | **rad** ✗ | 16 | 763 | ano | INT 48 na D11 → korupce nesplněna |
| `hrdina_cisty` | hrdina | **rad** ✗ | 16 | 774 | ano | Úplatek z Haase (prisny), rad předběhl hrdinu |
| `zbohaceny_utek` | útěk | **rad** ✗ | 16 | 854 | ano | Balance > 280, ale rad dřív než útěk |
| `smireni_mekky` | smíření | **smireni** ✓ | 12 | 159 | ne | Jediná čistá zásah |
| `atentat_moc` | atentát | **preziti** ✗ | 19 | 995 | ano | Moc 100, Vina 100 — opak atentátu |
| `kruh_temny` | kruh (rad) | **rad** ✓ | 16 | 763 | ano | Záměr splněn |
| `anna_pravda` | anna | **smireni** ✗ | 12 | 69 | ne | Smíření D12 předběhlo Annu D14 |

**Zásah cíle:** 3/8 person (přežití, smíření, kruh) — u přežití spíš náhodou fallbacku.  
**Unikátních typů konců:** **3 / 8** (`preziti`, `rad`, `smireni`).  
**Chybí v matici:** `korupce`, `hrdina`, `utek`, `atentát`, `anna`.

Reporty: `artifacts/playtest/` — `d61eff26…`, `446196bf…`, `4b573b25…`, `95ddbcf4…`, `51c80116…`, `c50b8220…`, `aba1fff5…`, `c2c5bdee…`.

---

## Hlavní zjištění

### 1. „Kruh“ (rad) dominuje — 4× stejný konec na D16

Čtyři persony skončily **`rad`** ve stejný den po případu Závadová (`guilty_podepsat`):

- Společný vzorec: `uplatek_prijat: true`, `operace_zaplacena: true`, Moc ~95, Lid ~18.
- V kódu: `haas_kontakt = zavazany` jen z úplatku; `rad` vyžaduje zavázaného Haase + Mašek **nebo** Závadová ≥ 3 + Beneš ≠ přijal.

**Proč `hrdina_cisty` a `zbohaceny_utek` padly do kruhu:** runner (`verdiktKrok2: prisny`) na spisu Haase bere variantu s obálkou → úplatek, přestože `prijmoutUplatek: false` blokuje jen tlačítko s „úplatek“ v názvu, ne `guilty_vzit_obalku`.

### 2. Korupce se vůbec neaktivovala

`korupcni` měla na D11 Integritu **48** (práh s úplatkem **≤ 35**). Úplatek přišel až později → na D11–D15 podmínka korupce neplatila; na D16 vyhrál **rad** (vyšší priorita než fallback).

### 3. Smíření „krade“ Annu i atentát

- **`anna_pravda`:** profil ideální pro Annu (Vina 1, finance 69, vysoký průzkum 0,92, bez úplatku), ale **D12 smíření** (`benes_prijal` z adventure) vyhodnotí dřív než **D14 anna**.
- **`atentat_moc`:** skončila **preziti** D19 s Mocí **100**, Vinou **100**, úplatkem — runner ji nevedl k atentátu (úplatek, žádný vzdor Haas, Moc nesnižena).

### 4. Přežití = spíš default než střední cesta

`stredni_cesta` → `preziti` na **D19**, ale koncové rysy nejsou „střed“ (Integrita 100, Moc 16 / Lid 100). Pravděpodobně **fallback den 19**, ne větev D15 se středním pásmem 30–70.

### 5. Ekonomika a styly — dílčí signál

| Persona | pomer NG | pruzkum/spis | finance |
|---------|----------|--------------|---------|
| smireni / anna | 1,00 | 0 / 0,92 | 159 / 69 |
| stredni / atentat | 0,53 / 0,11 | 0,77 | 180 / 995 |
| tvrdé + rad | ~0,14 | 0–0,67 | 763–854 |

Vlna C (guilty +finance / NG −) **odděluje měkké a tvrdé finance**, ale u tvrdých person konverguje stejný milník (úplatek + operace) → stejný konec.

### 6. Bug v `playtest-konce-matrix.js`

Terminálové shrnutí ukázalo jen 2 řádky; při ručním čtení JSON je všech 8 běhů platných. Pravděpodobně chyba parsování cesty k reportu (mezery v `IN DUBIO`).

---

## Co z toho plyne (priorita)

| P | Akce | Stav |
|---|------|------|
| P0 | Runner: vyloučit obálku / `guilty_vzit_obalku` | ✅ 2026-05-19 |
| P0 | Pořadí konců: anna před smířením, `annaKandidat` blokuje smíření | ✅ |
| P1 | Korupce: práh INT ≤ 45 s úplatkem; start INT 22 u persony | ✅ |
| P1 | Rad až po útěku/hrdině/anně; vyžaduje `!annaKandidat`, ne vzdor | ✅ |
| P2 | Persony `cisty` / `atentat` skórování; atentát bez úplatku v kódu | ✅ |
| P2 | Matice: oprava parsování cesty reportu | ✅ |
| — | Znovu spustit `npm run playtest:konce` a porovnat | ✅ viz **Analyza-matice-konce-2026-05-19-run2.md** |

---

## Závěr

Matice **nesplnila cíl 8 různých konců**. Potvrdila ale:

1. Vyhodnocení konců **funguje** (hra končí před D19).
2. **Uzly + priorita** silně řídí výsledek — často jinak než záměr persony.
3. **Playwright persony** musí respektovat milníky (Haas obálka), ne jen `prijmoutUplatek`.
4. Tři konce (**smíření**, **kruh**, **přežití** fallback) jsou dosažitelné; pět zbývá ladit v kódu, runneru nebo podmínkách.

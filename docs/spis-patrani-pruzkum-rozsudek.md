# Spis: pátrání, průzkum, rozsudek — IN DUBIO

Případ se neotevírá jako záložky, ale jako **jeden svislý dokument** v modálu `#modal-pripad` (styly `css/case-wireframe.css`). Tento text shrnuje **kanon mechanik** z pohledu hráče i dat (`cases.mdc`, `js/ui.js`, `js/cases.js`).

---

## 1. Části spisu (pořadí na obrazovce)

1. **Hlavička** — typ případu, název, obžaloba, identifikace spisu.  
2. **Spis (skutek)** — popis situace, často s encyklopedickými odkazy.  
3. **Svědectví** — karty výpovědí; v textu mohou být **klikací stopy** (`<span class="clue" data-clue-id="…">`).  
4. **Pátrání (Two-Click)** — pokud má případ `clue_system` a je zapnuto: panel ve hlavičce (start časovače, potvrzení vazby, případné odemykání odměn).  
5. **Průzkum** — akce za **kapky inkoustu** (sdílené mezi oběma případy dne) + volitelně **neoficiální zdroj** (stejné zjištění bez kapek, za jiné zdroje); výstupy jako zelené „zjištění“ pod svědectvími.  
6. **Informovanost** — lišta odvozená od počtu odhalení / konfrontace (viz `cases.mdc`).  
7. **Rozsudek** — **vždy viditelný**; u pool případů **dvojkrok**: typ verdiktu → konkrétní varianta/trest → **Potvrdit rozsudek**.

**Zásada:** Rozsudek **není** zamčený za průzkumem — hráč může soudit „naslepo“. Průzkum a pátrání **rozšiřují** nabídku a kvalitu rozhodnutí.

---

## 2. Pátrání (Two-Click, clue systém)

Oddělené od průzkumu: jde o **koherenci stop** v textu, ne o „faktický výslech“.

- **Kotva ve spise:** stopy a správné páry musí být z **exaktní, hmatatelné** reality (číslo, čas, místo, záznam, citace) — ne z čistě emočních nebo neprokazatelných vět. Příklady a zákaz „pocitových“ párů: **`.cursor/rules/cases.mdc`** (Two-Click, *Kvalita stop a párů*).  
- **První klik** označí stopu, **druhý** zkouší **párování** stejného `data-clue-id` podle mapy párů v datech případu.  
- Správný pár: odměny dle dat — např. bonus informovanosti, `unlock_actions`, `unlock_verdict_ids`.  
- **Timed hunt** (`timed_hunt`): stopy jsou plně aktivní až po **Zahájit pátrání**, běží odpočet, lze potvrdit nejlepší vazbu.  
- **Moudrost ★★★★★** může jemně podtrhnout indície; hra **neprozrazuje** správný pár.
- **Scénář dne:** u případů navázaných na den drž v zadání sloupec *Patrani_navrh* v [`scenar/Mapa_20dni.csv`](./scenar/Mapa_20dni.csv) (std / stress / klid) a význam v [`scenar/Milniky-dynamika-akt1.md`](./scenar/Milniky-dynamika-akt1.md) — jde o náladu a tempo textů kolem pátrání, ne o změnu engine pravidel.

**Krátký narativ po potvrzení osy:** v datech případu lze u `clue_system.rewards.on_confirm.<weak|medium|strong>` doplnit `narrative_lines` (doporučeno tři věty podle síly) nebo jedno pole `narrative` s odstavci oddělenými prázdným řádkem. Po potvrzení vazby se v modálu spisu zobrazí překryv s textem a tlačítkem **Rozumím**; teprve poté se ve spisu dokončí vizuální potvrzení páru stop.

Implementace: `Cases.vyhodnotTwoClickRozpor`, `Cases.potvrdTwoClickRozpor`, filtrace odemčených akcí `Cases.jePruzkumAkceOdemcenaPoClue`.

---

## 3. Průzkum (inkoust)

### Kapky

- Sdílený fond **`investigationActionsLeft`** pro oba případy daného dne.  
- Ceny typicky: výslech / záznamy / informátor **1**, konfrontace **2** (z `hidden_info[].cost`).  
- Bonusové kapky z herních událostí (neděle, rysy, volby…) — viz `cases.mdc` a ekonomická pravidla.

### Typy akcí (`hidden_info`)

| Akce | Smysl (hráč) |
|------|----------------|
| Výslech (`witness`) | Motivace, proč |
| Záznamy (`records`) | Tvrdá fakta |
| Informátor (`informant`) | Kontext, často zabarvený frakcemi |
| Konfrontace (`confrontation`) | Riziko, vyšší cena, dramatická scéna |

Po odhalení se text přidá do spisu jako **zjištění**; může obsahovat další `clue` span pro pátrání.

### Bezplatné záznamy

- Pokud platí `flags.records_free_until_day` a akce je `records`, cena v kapkách je **0**.  
- V tomto režimu se **nezobrazuje** druhá cesta „Neoficiální zdroj“ (nemá smysl obcházet zdarma akci).

### Neoficiální zdroj (alternativa k kapce)

- U stejné položky `hidden_info` kromě **konfrontace** druhé tlačítko: **stejné odhalení** bez snížení `investigationActionsLeft`.  
- **Cena:** výchozí pokuta podle `cost` (1 → −12 Kčs, 2 → −20 Kčs), **Integrita −2**, **Vina +1**; autor přepíše v `dirty_unlock` v JSON (`pool_cases`), loader přenáší do `hidden_info`. Vypnutí: `dirty_unlock: false`.  
- **Moudrost** po neoficiálním zdroji roste **slaběji** (násobek 2 oproti 3 u čisté akce).  
- Tlačítko je neaktivní při nedostatku peněz na zápornou složku (`Finance.jeDostupne`).  
- Karta zjištění má štítek **„Zjištění — … (průzkum / neoficiální zdroj)“**, ne stejný text jako tlačítko akce.

**Verdikty:** u variant v kroku 2 jsou **tooltipy** (důvod zpřístupnění / důvod zamčení). **Informovanost:** tooltip lišty připomíná roli v procesní kvalitě po rozsudku.

Implementace: `js/ui.js`, `js/cases.js` (`popisDuvoduVerdiktu`, `jeVerdiktOdemcenPoClue` včetně OR s odměnou z pátrání u prahů).

### Zamčené / skryté sloty

- Akce podmíněné odvahou, pátráním nebo prahem informovanosti se v UI mohou **vůbec neukázat** nebo ukázat jako **„?“** — bez spoilerů (`cases.mdc`).

---

## 4. Rozsudek

### Kroky (pool případy)

1. **Výběr skupiny** (Vinen / Nevinen / Nedostatek důkazů / … podle dat).  
2. **Výběr konkrétní varianty** (trest, přístup…).  
3. **Potvrdit** — spustí se předehra (`Jménem republiky se vynáší tento rozsudek.` + konkrétní věta varianty), poté `Cases.zpracujRozsudek`.

### Filtrování nabídky

- Verdikty a tresty mohou vyžadovat **Moudrost**, **Odvahu**, omezení podle **Viny**.  
- Počet **odhalených** položek `hidden_info` u pool případů **filtruje** dostupné varianty (`_wfFiltrovatVerdiktyPodlePruzkumu` v `ui.js`).  
- **Odemčené** možnosti mají být **vizuálně odlišené** a v textu označené prefixem `Alternativa:` (`cases.mdc`).

### Upozornění na slabý podklad

- Při **nízké informovanosti** (lišta ve spisu) může UI zobrazit drobné upozornění, že rozhoduješ „na tenkém ledě“.
- Upozornění se vykresluje **jen u tlačítek konkrétních verdiktů v kroku 2** (výběr trestu / varianty), **ne** u základních skupin v kroku 1 a **ne** u legacy seznamu verdiktů.
- Implementace: `_wfHtmlUpozorneniSlabySpis` v `js/ui.js`.

### Kvalita a meta-vrstva

- JSON `effects` u verdiktů = **základní** číselné dopady.  
- Nad tím běží **procesní kvalita** (informovanost, soulad s fakty z průzkumu, párování stop) a **normativní směr** (dopad na frakce) — skládá se v `Cases.pripravSlouceneDusledky` / související logika.  
- Verdikty odemčené průzkumem/pátráním mohou mít **zvýšený koeficient** výsledných čísel (např. 1.25×) dle pravidel v `cases.mdc`.

### Lidský dopad (autor případu)

- U textů verdiktů (název, důsledek, doprovodný popis) má smysl vždy **jedna věta k člověku**: co rozsudek znamená pro obžalovaného, poškozeného nebo rodinu — nejen paragraf nebo částku. Slouží to čitelnosti i emoční váze rozhodnutí.

### Co hráč vidí před potvrzením rozsudku

- Na kartě varianty je **předběžný hint**:
  - **Finance vždy číslem** (např. `Finance: -15 Kčs`),  
  - ostatní pouze jako **osy dopadu bez směru a bez čísel** (např. `Integrita`, `Moudrost`, `Důvěra: Horáková`).
  - **Frakce:** jeden řádek se všemi dotčenými frakcemi, např. `Frakce: Lid, Moc` (bez opakování „Frakce:“ u každé položky).
- Cílem je, aby hráč nebyl naslepo, ale zároveň neřešil volbu jako čistý min-max.

### Úplatek (krizová integrita)

- Při velmi nízké integritě se může objevit možnost **přijmout úplatek** u případu — jiná větev zpracování s okamžitým dopadem na finance a rysy (`Cases.zpracujPrijetiUplatekPoModalu`).

---

## 5. Co se stane po potvrzení rozsudku

1. **Razítko** na stole podle typu výsledku.  
2. Aplikace **sloučených důsledků** (rysy, frakce, finance, příznaky) včetně **typového příplatku** u morálního / politického / osobního spisu (+25 / +35 / +30 Kčs oproti rutině) — viz `Cases.vypoctiTypoveDoplnky` a shrnutí v `knihovna.json` / `economy.mdc`.  
3. U **ne-rutinního** spisu (morální, politický, osobní) navíc **+1** sdílená akce průzkumu (`investigationActionsLeft`) — `_bonusInkoustZaNarocnySpis` v `js/cases.js`.  
4. Záznam do **archivu** (`State.pridejRozsudek`) včetně meta polí (mj. `caseType` = normalizovaný typ případu pro šuplík, procesní kvalita, normativní směr, skóre evidence/coherence kde počítáno).  
5. **Naplánování revize** spisu (krátká karta za několik dní) — `Cases` + `State` fronta revizí.  
6. Kontrola **krajních hodnot rysů** a **speciálních konců hry** (může spustit epilog).  
7. Reakce **frakcí** (stavové zprávy).  
8. Obnovení UI složek, případně přepnutí modálu spisu do **readonly** pro uzavřený případ.  
9. **`Engine.zkontrolujKonecDne`** — uvolnění „Další den“, když jsou hotové všechny případy.

---

## 6. Krizové stavy ovlivňující spis

Shrnutí z `economy.mdc` / `cases.mdc`:

- **Finance = 0** — jiné ranní texty, tlak na Naději, Haasova obálka zvýrazněná; hra **pokračuje**.  
- **Integrita &lt; 10** — mizí část soudních možností, přibývá úplatek; směřuje to k **korupčnímu** oblouku.  
- **Odvaha &lt; 10** — mizí konfrontace, zvýrazněné odkládání; politický tlak přes dopisy.

---

## 7. Čtení v archivech a revize

- Uzavřený spis lze znovu otevřít v **readonly** režimu (bez změny rozsudku).  
- Šuplík `Rozsudky` funguje jako rozbalovací přehled: klik na řádek rozsudku otevře/skryje panel se statistikami a tlačítkem **Detail** (readonly spis).  
- Nad seznamem je **filtr podle typu případu** (Všechny / Rutinní / Morální / Politický / Osobní); u každého řádku **štítek typu**. Uložený záznam má pole **`caseType`**; u starších uložených her bez něj se typ dopočítá ze spisu (`DataLoader` + `Cases.typProZobrazeni`).  
- **Pod filtrem** je krátký souhrn **trendů** pro právě zobrazené výroky: poměr směrů (vina / zproštění / nedostatek důkazů / úplatek / jiné), případně uložená **procesní** a **normativní** metadata tam, kde archivní záznam tato pole má — bez vyhodnocování „správnosti“ rozhodnutí.  
- Po vynesení rozsudku jsou v readonly detailu i v šuplíku (`Rozsudky`) dostupné **kompaktní přesné změny** (`dusledkyRadky`) včetně čísel.  
- U každého rozsudku se navíc zobrazuje **součet využitých neoficiálních zdrojů** (agregovaně, bez výčtu jednotlivých kliků).  
- **Revize** (`review_card` v datech případu): po pár dnech krátká volba A/B s dopady — ne plné přehrání případu. Obálka nebo úřední lístek na stole používá **jednu univerzální šablonu** rámu dopisu (společný tón pro celou hru); konkrétní spis se jen dosadí z ID případu a z `review_card`.

---

## 8. Kde číst detaily v projektu

| Téma | Soubor |
|------|--------|
| JSON případu, clue mapa, informovanost | `.cursor/rules/cases.mdc` |
| Rysy, frakce, hvězdičky | `.cursor/rules/traits-factions.mdc` |
| Peníze, operace, krize | `.cursor/rules/economy.mdc` |
| Příběh, 8 konců, postavy | `.cursor/rules/story.mdc` |
| Denní tok, načítání skriptů | `.cursor/rules/core.mdc` |

Tento dokument je **výtažek pro jedno místo**; při rozporu má přednost kanon v `.cursor/rules/` a aktuální chování v `js/`.

---

## 9. Nápad do rozšíření (zatím neimplementováno)

- **Deník transakcí** — chronologický přehled herních plateb a úprav rysů/frakcí (zejména po „špinavých“ cestách průzkumu), aby hráč měl jistotu bez přetížení hlavního UI; doplnit až bude jasná obrazovka nebo záložka ve spisu.

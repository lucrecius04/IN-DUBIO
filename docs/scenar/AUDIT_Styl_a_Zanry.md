# Audit brief — styl, zanry, jazyk

Tento dokument je podklad pro externiho auditora narace.
Cil: sjednotit literarni kvalitu bez poruseni kanonu a doboveho zasazeni.
Primarni pozadavek: text musi byt ctivy, srozumitelny a udrzet hrace v orientaci i po delsi pauze.

---

## 1) Globalni stylove zasady

- Prostredi: Ceskoslovensko 1931, soudni a uradni realie.
- Ton: noir, moralni seda zona, tlak instituci a osobni viny.
- Jazyk: spisovny, stridmy, bez moderniho slangu.
- Rytmus: plynuly, dobre citelny; jednoslovne nebo usecne vety lze pouzit vyjimecne, kdyz maji jasnou funkci.
- Srozumitelnost pred mlhou: tajemno a metafora jen jako koreni, ne jako hlavni nosic informace.
- Hrac musi rozumet motivaci Bena: kdo je, o co mu jde, proc pokracovat dal.
- Obcasny odlehcujici detail je zadouci (jemny kontrast), ale nesmi rozbit ton sveta.
- Text je herni: ma vest hrace k rozhodnuti, ne ho unavit literarni exhibici.
- Cilem je uceleny vypravecsky styl; odchylky jsou povolene jako osvezeni, ne jako pravidelna manira.
- Vyhybat se:
  - anachronismum (americky courtroom styl, moderni policejni slang),
  - explicitnimu moralizovani,
  - doslovnemu vysvetlovani motivu tam, kde ma fungovat podtext,
  - grafomanii (dlouhe pasaze bez nove informace, bez rozhodovaciho tlaku).

Zakladni opora:
- `docs/world-reference.md`
- `docs/analyza_soudni_reci_1925-1935.md`

---

## 2) Zanry textu ve hre a jejich pozadavky

## A) Ranni fragment (`fragments.json`, morning)

- Funkce: nastavit denni naladu, tlak, predznamenat konflikt.
- Perspektiva: blizka Benovi, vecna, pozorovaci.
- Jazyk: obrazny, ale stridmy; 1-2 konkretni smyslove detaily.
- Delka: kratka az stredni; bez preinformovani celeho dne.
- Musi obsahovat orientacni kotvu: co je dnes ve hre, proc je to pro Bena dulezite.

## B) Vecerni/nocni fragment (`fragments.json`, evening/night)

- Funkce: uzavrit den, zpracovat dusledek volby.
- Perspektiva: vice introspektivni nez rano.
- Jazyk: mene uradni, vice osobni; porad bez sentimentu navic.
- Delka: kratka; jeden hlavni emocionalni akcent.
- Prirodzena mikro-rekapitulace: co den zmenil v Benovi/svete, aby hrac neztratil nit.

## C) Dopisy (`letters.json`)

- Funkce: tlak na Bena / vztahova osa / informace mimo soud.
- Hlas: kazdy autor dopisu musi byt okamzite rozpoznatelny.
- Forma: jasna kompozice (uvod -> jadro -> implikovany tlak/zadost).
- Zakaz: generic texty, ktere by mohl napsat kdokoli.
- Citelnost: i po tydnu pauzy musi byt jasne, kdo pise, proc pise, co chce.

## D) Setkani a navstevy (`characters.json`, `days.json` adventure)

- Funkce: konfrontace zajmu, informace skrze konflikt.
- Dialog: podtext > vysvetlovani.
- Dramaturgie: kazde setkani musi posunout aspon 1 z os:
  - Benova vina,
  - institucionni tlak,
  - vztah s klicovou postavou.
- Kontrast: je povolena obcasna odlehcena replika, pokud zvysi lidskost postavy a neoslabi stakes.

## E) Soudni/proceduralni text (spisy, vypovedi, formalni pasaze)

- Funkce: autenticita justicniho prostredi.
- Jazyk: vecny, uradni, terminologicky presny.
- Doplnek: civilni rovina musi kontrastovat se soudni strohosti.

## F) Epilogy (`ending_prelude.json`, `endings_epilog.json`)

- Funkce: tematicke uzavreni, ne vysvetlovani vseho.
- Ton: dusledek cesty, ne didakticky soud.
- Delka: koncentrovana, obraz + konsekvence.
- Jasnost: hrac musi rozpoznat, proc skoncil prave takto.

---

## 3) Vypravec, osoba, cas

- Dominantni rezim: er-forma nebo blizka fokalizace na Bena dle aktualni implementace.
- Konzistence:
  - jeden rezim v ramci jednoho textoveho bloku,
  - bez nahodnych prechodu mezi denikovym a objektivnim hlasem.
- Cas:
  - pritomny tlak v aktualnim dni,
  - minulost jen jako presne davkovana ozvena (ne expozicni dump).

---

## 4) Jazykove registry podle kanalu

- Rano: obraz + predtucha.
- Soud: presnost + procedura.
- Dopis od moci: formalita + latentni hrozba.
- Dopis od rodiny: civilni tonalita + emocionalni podtext.
- Vecer: stazeni tempa + dosvit rozhodnuti.

---

## 5) Checklist pro auditora (na kazdy textovy blok)

1. Je text ukotveny v roce 1931 a soudnim prostredi?
2. Odpovida styl pozadovanemu zanru kanalu?
3. Posouva text dramaticky oblouk, nebo jen opakuje info?
4. Je v textu konkretni detail (misto, predmet, zvuk, gesto)?
5. Neni text didakticky nebo modernim jazykem?
6. Je tonalita konzistentni s predchozim/next blokem?
7. Je text plynuly a ctivy bez krecovitych jednoslovnych vet?
8. Je z textu jasne, proc by mel hrac pokracovat?
9. Neni text prehusteny metaforami natolik, ze skryva smysl?
10. Je Benova motivace v bloku citelna (aspon neprimo)?

---

## 6) Doporuceny postup auditu

1. Nejdřív audit **dramaturgie a scenare**:
   - co se kdy stane,
   - proc se to stane,
   - jaky to ma dopad na Bena/svet.
2. Pak audit **konzistence hlasu a zanru** (bez prepisu fakt).
3. Pak audit **davkovani informaci** po dnech (pacing + orientace po navratu).
4. Nakonec audit **literarni kvality vet** (mikro styl).

Teprve potom delat rozsahlejsi prepisy.

---

## 7) Metrika stridmosti napeti a kontrastu

- Usecna veta pro napeti: max vyjimecne v ramci bloku, ne jako dominantni rytmus.
- Odlehcujici moment: ma odhalit charakter nebo situacni kontrast, ne shodit stakes.
- Pokud by slo stejnou informaci rict normalni vetou bez ztraty ucinku, preferuj normalni vetu.


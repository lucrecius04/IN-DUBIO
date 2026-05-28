# Kalendar 1931 - mapa dni (definitivni standard)

Tento soubor zavadi jednotny system oznacovani dni napric dokumentaci, daty a auditem.

---

## 1) Rozhodnuti (zavazne)

- Primarni identifikator dne ve scenari je **datum** (napr. `1931-03-08`).
- Sekundarni identifikatory:
  - `currentDay` (runtime poradi v `data/days.json`)
  - `W` (pracovni den kampane, `W1-W15`)

Format zapisu dne v dokumentaci:

`1931-03-08 (currentDay 7, W5, Ne)`

Tohle je povinny format pro nove texty, auditni tabulky a poznamky.

---

## 2) Prevodni tabulka (brezen 1931)

| Datum | Den v tydnu | currentDay | Pracovni den |
|---|---|---:|---|
| 1931-03-02 | Po | 1 | W1 |
| 1931-03-03 | Ut | 2 | W2 |
| 1931-03-04 | St | 3 | W3 |
| 1931-03-05 | Ct | 4 | W4 |
| 1931-03-06 | Pa | 5 | W5 |
| 1931-03-07 | So | 6 | - |
| 1931-03-08 | Ne | 7 | - |
| 1931-03-09 | Po | 8 | W6 |
| 1931-03-10 | Ut | 9 | W7 |
| 1931-03-11 | St | 10 | W8 |
| 1931-03-12 | Ct | 11 | W9 |
| 1931-03-13 | Pa | 12 | W10 |
| 1931-03-14 | So | 13 | - |
| 1931-03-15 | Ne | 14 | - |
| 1931-03-16 | Po | 15 | W11 |
| 1931-03-17 | Ut | 16 | W12 |
| 1931-03-18 | St | 17 | W13 |
| 1931-03-19 | Ct | 18 | W14 |
| 1931-03-20 | Pa | 19 | W15 |

---

## 3) Pravidla pouziti

- V runtime souborech (`data/days.json`) zustava technicke pole `day` (1..19).
- V dokumentaci a auditu se pise primarne datum.
- Pokud je potreba vazba na gameplay, uvadi se trojice:
  - datum,
  - `currentDay`,
  - `W`.

Priklad:
- `1931-03-16 (currentDay 15, W11, Po): Haas osobne`

---

## 4) Migacni kroky pro dokumentaci

1. Vsechny aktivni scenarove dokumenty doplnit o datumovy zapis dne.
2. Stare oznaceni `D1-D15` ponechat jen jako sekundarni `W1-W15`.
3. V textech, kde je jen `day 1..19`, dopsat vedle datum.
4. Archivni 20d dokumenty nechavat beze zmeny, ale oznacit jako LEGACY.

---

## 5) Proc je to lepsi

- Datum je lidsky nejcitelnejsi kotva.
- Pri navratu po pauze hrac i autor rychleji pochopi, kde je.
- Odstrani se kolize mezi `D1-D15` a `currentDay`.
- Audit dramaturgie bude mit stabilni osu "co se stalo kdy".


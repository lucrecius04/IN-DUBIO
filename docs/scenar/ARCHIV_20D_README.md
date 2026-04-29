# Archiv: 20denní scénář (nepoužívat pro vývoj)

Hra a dokumentace v repu vycházejí z **15 pracovních dní** (3 týdny, ~19 kalendářních kroků s víkendy).  
Tyto soubory zachovávají starší plánovací vrstvu a **nejsou zdrojem pravdy** pro sladění s `data/days.json` ani pro nové případy.

| Archiv (jen reference) | Nahrazeno (kanon) |
|------------------------|---------------------|
| `Mapa_20dni.csv` | `Mapa_15dni.csv` |
| Historický 20denní rozvrh případů (dříve často v `Pripady.csv`) | `Pripady_15dni.csv` (plán ID a slotů pro 15 dní) |
| — | **Aktuální** `Pripady.csv` v repozitáři: **generovaný** přehled toho, co je ve `data/days.json` (dny 1–15) + agregace min..max z verdiktů v `data/pool_cases_akt1.json` — příkaz `node scripts/build-pripady-csv.js`; není to archiv 20d |
| `Vlakna.csv` / `Dopisy.csv` u starého toku | `Vlakna_15dni.csv` / `Dopisy_15dni.csv` |
| `InDubio_20dni_Mapa-scenar.md` (čísla dní) | obecné principy ve `Milniky-dynamika-akt1.md` + řádky v `Mapa_15dni.csv` |

Implementační plán zůstává v `MIGRACE_20-15.md` (historický dokument).  
**Při práci na příběhu, poolu a dnech vždycky otevírej `Mapa_15dni.csv` a `Pripady_15dni.csv`.**

# PROMPT: Epilogy (IN DUBIO)

Tento prompt použij, když chceš napsat nebo upravit epilogy konců kampaně.

---

## Co má vzniknout

Vytvoř epilog(y), které:

- uzavírají Benův oblouk bez moralizování,
- drží noir a dobový rejstřík (1931),
- odlišují jednotlivé konce tónem i obrazností,
- nechávají v závěru prostor pro dozvuk, ne „tečku s vysvětlením“.

---

## Soubory, které musí mít autor otevřené

Pracuj jen s kanonem a daty projektu. Před psaním si otevři:

1. `docs/InDubio_StoryBible_v2_Cursor.txt`  
   (postavy, tajemství, oblouk, osm konců)
2. `.cursor/rules/story.mdc`  
   (aktuální produkční shrnutí příběhu, rytmus kampaně)
3. `docs/scenar/Mapa_15dni.csv`  
   (dynamika dnů, milníky, návaznosti)
4. `docs/scenar/Vlakna_15dni.csv`  
   (vlákna a jejich uzly, co má v závěru doznívat)
5. `docs/scenar/Milniky-dynamika-akt1.md`  
   (co už bylo tematicky „zaplaceno“ během hry)
6. `data/days.json`  
   (finální denní rytmus, volby a echo stopy)
7. `docs/scenar/Konce_15dni.csv`  
   (kanon 15denních konců, jejich podmínky a odlišení)
8. `data/letters.json`  
   (hlasy Martina/Vlčka/dalších, jazyková kontinuita)
9. `data/fragments.json`  
   (stávající styl fragmentů a závěrečných obrazů)
10. `docs/analyza_soudni_reci_1925-1935.md`  
   (dobový jazyk, rytmus věty, slovník)

Pokud některý soubor chybí, vyžádej si ho před psaním.

---

## Tvůj úkol

Pro každý požadovaný konec napiš:

1. **Název epilogu** (krátký, věcný, bez klišé).
2. **Text epilogu** (cca 120-220 slov).
3. **Poslední větu** (silná, obrazná, zapamatovatelná).
4. **Volitelný post-echo řádek** (1 věta do „novinového“ dozvuku).

---

## Tón a styl (povinné)

- Piš ve 2. osobě, přítomný čas (hlas blízký stávajícím fragmentům).
- Ben není „hrdina“ ani „padouch“; je člověk nesoucí důsledek.
- Krátké odstavce, konkrétní detaily (stůl, inkoust, chodba, obálka, světlo, dech města).
- Emoce ukazuj obrazem a jednáním, ne vysvětlováním.
- Neopakuj doslova formulace z dřívějších fragmentů; drž stejný rejstřík, ale nový text.

---

## Co nesmíš

- Nepřepisuj kanon (fakta, motivace, vztahy, odhalení).
- Nezaváděj nové klíčové postavy ani nové velké zvraty.
- Nedávej „správný“ konec; žádný není definitivně vítězný.
- Nepiš moderní slang, anachronismy ani publicistiku 21. století.
- Nepopisuj mechaniky hry (staty, flagy, body) přímo v textu epilogu.

---

## Doporučené odlišení mezi konci

- **PŘEŽITÍ:** únava, setrvačnost, tiché pokračování systému.
- **KORUPCE:** pohodlí bez klidu, přesnost bez svědomí.
- **HRDINA:** veřejné gesto, soukromá cena.
- **ÚTĚK:** pohyb, vzdálenost, neuzavřenost.
- **SMÍŘENÍ:** pravda bez triumfu, menší ale skutečný klid.
- **ATENTÁT:** osamělost rozhodnutí, chladná disciplína.
- **KRUH:** přesvědčení se mění v nový tlak.
- **ANNA:** ztráta přijatá bez iluzí, křehké světlo místo jistoty.

---

## Výstupní formát

Vrať čistě strukturovaný blok:

```json
[
  {
    "ending_id": "SMIRENI",
    "title": "Kalamář",
    "epilogue_text": "…",
    "final_line": "…",
    "post_echo": "…"
  }
]
```

Poznámky:

- `post_echo` je volitelné (`null`, pokud se nepoužije).
- Texty vrať bez komentářů mimo JSON.

---

## Rychlá QA kontrola před odevzdáním

- Sedí epilog fakticky na kanon konkrétního konce?
- Je hlas konzistentní s `data/fragments.json` a `data/days.json`?
- Má text aspoň 2 konkrétní obrazy a neklouže do abstrakcí?
- Nekáže hráči a nevnucuje „správný výklad“?
- Poslední věta nese dozvuk, ne vysvětlení?


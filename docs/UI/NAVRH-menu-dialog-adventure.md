# Návrh: menu, okna, adventure / dialog scéna

Dokument je **fixní kotva** pro další práci na grafice a UX — aby se nápad o „Baldur’s Gate / adventuře“ neztratil v chatu.

---

## 1) Co už v repu existuje (nezahazovat)

### Adventure / dialog

- **HTML:** `#modal-adventure` v `index.html` — dva sloupce: portrét + text + kontejner voleb (`#adventure-portrait`, `#adventure-speaker`, `#adventure-text`, `#adventure-choices`).
- **Logika:** `UI.zobrazAdventureScenu(scena, callback)` v `js/ui.js` — prochází `scena.screens[]`, u každé obrazovky buď **lineární „Pokračovat“**, nebo **klikací volby** s `next`, `sets_flag`, `sets_uzlovy`, `effects`.
- **Trigger ve smyčce:** `js/engine.js` po ranním fragmentu a dopisech — pokud `days.json` má `adventure_scene` s `trigger: "morning_after_fragment"` a ještě není `flags.adventure_done_<id>`, spustí scénu a **až poté** načte případy dne.
- **Data:** `adventure_scene` je vložené přímo v `data/days.json` (např. D9 Beneš, D13 Karas). Referenční kopie / šablona: `docs/Pripady/adventure_benes_d9.json`.

### Menu

- **`#modal-menu`** v `index.html` — základ pro hlavní / pauzové menu (doplňovat obsahem a styly, ne duplikovat druhý overlay bez důvodu).

### Ostatní okna

- Fragmenty: `#modal-fragment`
- Spis: `#modal-pripad` + `css/case-wireframe.css`
- Večer, noviny na stole, archiv — vlastní overlaye v `index.html`

**Závěr:** nový vizuální styl má **navázat na stávající modály** (`overlay` + `panel-papir`), ne vymýšlet paralelní systém, pokud to není nutné.

---

## 2) Cílový dojem (pro grafika / art direction)

- **Noir + meziválečná úřednost** — stejná rodina jako stůl a spis: papír, rámeček, tiché animace, žádný „RPG inventory“ šum.
- **Adventure scéna** = důraz na **tvář / řeč / volbu**, ne na mapu. Pozadí může být statické (kancelář, chodba, soudní dveře) nebo lehký parallax — až v druhé vlně.
- **Klikací věty** čitelné na jeden pohled: krátké labely, konzistentní typografie s fragmenty.

---

## 3) „Dvě dveře“ + klikací věty — co to znamená v datech

### Varianta A — čistě datová (už funguje)

Uzel se třemi `choices`, každá vede na jiný `next` (`s5a` / `s5b` / `s5c`). Graficky to můžeme později stylizovat jako **dvě velké karty + jedna třetí** nebo jako **dvě dveře + úniková třetí věta** — chování zůstává stejné.

### Varianta B — vizuální metafora „dveří“

- Jedna obrazovka typu `screen.layout: "two_doors"` (budoucí rozšíření schématu).
- Každá „dveřní“ volba má `door_art` / `door_caption` — čistě prezentační vrstva; `next` a efekty zůstávají jako dnes.
- **Doporučení:** nejdřív dodělat **Variantu A** v CSS (dvě velké tlačítka), až pak přidávat nová pole do JSON, až bude jisté, že je UI potřebuje.

### Podmíněné volby (Baldurův styl — později)

Dnes se všechny volby zobrazí. Rozšíření do budoucna:

- u `choice` pole `condition` (stejná logika jako u dopisů / fragmentů — trust, flag, finance),
- nepřístupné volby buď **skrýt**, nebo zobrazit **šedě s důvodem** (design decision).

Implementace patří do `zobrazAdventureScenu` + sdílený helper s `_vyhodnotPodminku` z enginu — až na to přijde řada.

---

## 4) Doporučený datový kontrakt (současný stav + rozšíření)

Minimální `adventure_scene` (funguje dnes):

```json
{
  "id": "adventure_priklad",
  "portrait": "soubor_nebo_cesta",
  "portrait_label": "Jméno pro alt / štítek",
  "trigger": "morning_after_fragment",
  "blocks_cases_until_complete": false,
  "screens": [
    {
      "id": "s1",
      "speaker": "narrator",
      "text": "…",
      "choices": null,
      "next": "s2"
    },
    {
      "id": "s2",
      "speaker": "NPC",
      "text": "…",
      "choices": [
        {
          "label": "Krátká věta volby",
          "next": "s3a",
          "sets_flag": "volitelny_flag",
          "sets_uzlovy": { "vetev": "a" },
          "effects": { "Integrita": 1 }
        }
      ]
    }
  ]
}
```

**Volitelná budoucí pole** (až budeme řešit grafiku / layout):

- `background` — obrázek nebo ID pozadí
- `music_cue` / `sfx_cue` — návaznost na `music.js` / `sfx.js`
- `layout` na úrovni screenu — `"default" | "two_doors" | "fullscreen_text"`
- `condition` na choice — viz výše

---

## 5) Menu a okna — navrhované fáze (aby se to nezlomilo)

### Fáze 0 — vizuální sjednocení (bez nové logiky)

- Jedna **paleta** (papír, inkoust, akcent, chyba / varování).
- Jednotné **rámečky, stíny, zaoblení, hover** pro: menu, fragment, adventure, dopis, noviny.
- Typografie: stejné fonty jako stůl / spis; velikosti pro „titulek / tělo / volba“.

### Fáze 1 — adventure jako produkt

- Portrét + štítek mluvčího — **bez rozbití** stávajícího API.
- Vylepšení **choice buttonů** (dvousloupec na široké obrazovce, jeden sloupec na úzké).
- Volitelně **indikátor „kdo mluví“** (barva pruhu u textu).

### Fáze 2 — „dveře“ a atmosféra

- Pozadí scény (statické), případně lehký posuv.
- Layout `two_doors` jen jako prezentace nad stávajícími `choices`.

### Fáze 3 — podmíněné volby + log

- Skrývání voleb, tooltip důvodu, zápis do stavu / archivu „co hráč řekl“.

---

## 6) Kontrolní seznam před merge grafiky

- Adventure se **zavře** vždycky a zavolá callback (žádné visící `overlay`).
- Volby jsou **klikatelně větší než min. touch target** (~44 px výška).
- Kontrast textu na papíře splní čitelnost (rychlý test na notebooku + mobilu).
- **Esc** / zavření: policy — adventure často **nemá** přerušit příběh Esc bez potvrzení (doplnit až s designem).
- Žádné nové story fakta v UI textech — jen prezentace obsahu z JSON / kanonu.

---

## 7) Kde to dál zakotvit v dokumentaci

- Tato složka: `docs/UI/README.md`
- Hlavní přehled docs: odkaz v `docs/README.md` (sekce UI)
- Story / mechaniky neměnit — UI je jen vrstva nad `story.mdc` / `cases.mdc`

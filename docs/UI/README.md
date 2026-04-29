# UI a grafika — vstupní brána

Návrhy rozhraní, které nepatří do scénáře ani do pravidel mechanik, ale drží **jednotnou podobu hry** (menu, modály, adventure / dialog).

| Dokument | Účel |
|----------|------|
| [`NAVRH-menu-dialog-adventure.md`](./NAVRH-menu-dialog-adventure.md) | Menu, okna, adventure scéna (BG3 / adventura styl), „dvě dveře“, datový model, fáze implementace |

**Související kód (orientace):**

- `index.html` — `#modal-menu`, `#modal-adventure`, ostatní overlaye
- `js/ui.js` — `zobrazAdventureScenu`, fragmenty, modály
- `js/engine.js` — spouštění `adventure_scene` po ranním fragmentu
- `data/days.json` — pole `adventure_scene` u konkrétních dnů
- Příklad dat: `docs/Pripady/adventure_benes_d9.json`, `adventure_karas_d13.json`

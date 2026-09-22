# Who's Round

Friend-group round tracker for coffee, drinks, or lunch. Add names, tap **Bought** when someone pays, and see who's due next (least recent buyer; ties break alphabetically). **Local-first:** the group and last twelve rounds live in this browser (`whos-round-v1`). Snapshot links encode a copy into the URL; they are not live sync, and nothing is sent to a server.

Live: [bryanralston.github.io/whos-round](https://bryanralston.github.io/whos-round/)

## Feature Map (what it does today)

In-product **Feature Map** lists current capabilities, not a roadmap:

- Who's due hero (least recent buyer, alphabetical tie-break)
- One-tap Bought on a person or the due hero
- Add / rename / remove people (min 2 to track)
- Optional group label (Coffee / Drinks / Lunch)
- Undo last Bought
- History of the last 12 rounds on this device
- Snapshot share via URL hash/query (`#r=` / `?r=`)
- Clear history / clear group
- Storage-blocked private-mode alert
- Offline via service worker cache **`whos-round-v1`**

**Is not:** accounts, a server, analytics, or live multi-device sync.

## Persistence

- `localStorage` key **`whos-round-v1`**
- Soft reload keeps the current group and history
- Loud banner if storage is blocked

## Offline / PWA

Service worker cache: **`whos-round-v1`**. Installable via `manifest.webmanifest`. Relative `./` paths so GitHub Pages can serve `/whos-round/`.

## Tests

```bash
node whos-round/round.test.js
```

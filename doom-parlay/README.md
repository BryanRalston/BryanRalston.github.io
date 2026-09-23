# Doom Parlay

A theatrical parlay calculator. Stack two to eight legs — American odds or a win percent — and watch the compound win chance collapse on a doom meter.

Entertainment math only. Not advice. Not a book. No real money.

Live: [bryanralston.github.io/doom-parlay](https://bryanralston.github.io/doom-parlay/)

## The loop

1. First open seeds a three-leg sample (`-110`, `-110`, `+200`) so the glass already shows the compound and the doom label.
2. Each leg takes American odds or a percent. A leading `+`/`-` is read as American. A `%` is read as percent. The toggle covers the ambiguous cases.
3. Every armed leg shows its implied win chance. The parlay win chance is the product of those probabilities, with the American price of the whole ticket under the hero.
4. The doom meter drains as long shots get added. Roast copy escalates with it.
5. Optional labels (team, player, market) stay on this device. Keep the slip to store it in the last 12. Copy a snapshot when you want to hand someone the same numbers.

## Feature Map (what it does today)

In-product **Feature Map** (collapsed in the footer) lists current capabilities, not a roadmap:

- 2–8 legs, remove, and start over
- American odds or win percent, with smart-parse
- Implied probability per leg
- Compound win chance (product; independence is stated, not pretended)
- American equivalent of the parlay
- Doom meter and escalating roast copy
- Optional labels
- History of the last 12 parlays
- Snapshot share via `#p=` or `?p=` — a copy, not live sync
- Storage-blocked private-mode alert
- Offline via service worker cache **`doom-parlay-v1`**

**Is not:** real betting, a bankroll, an odds feed, accounts, ads, analytics, or live multi-device sync.

## Persistence

- `localStorage` key **`doom-parlay-v1`**
- Soft reload keeps the slip and history
- Loud banner if storage is blocked (private mode or a browser setting)

## Share

- **Copy snapshot** packs the current legs into the URL (`#p=` and `?p=`).
- A friend opens that link and can keep the copy on their phone. It is the slip from the moment you copied the link, not live sync.
- Nothing is uploaded.

## Offline / PWA

Service worker cache: **`doom-parlay-v1`**. Installable via `manifest.webmanifest`. Relative `./` paths so GitHub Pages can serve `/doom-parlay/`.

## Tests

```
node doom-parlay/parlay.test.js
```

Covers American ↔ probability, the `-110 / -110 / +200` compound (`9.15%`, `+993`), bad inputs, the 12-deep history cap, reload, and snapshot round-trip.

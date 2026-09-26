# Rematch

A couch rivalry series tracker. Name yourself and a rival, start a best-of series, and log who won each game. The scoreboard stays on this device.

Entertainment only. Friend rivalry — not a league, not a book, not money.

Live: [bryanralston.github.io/rematch](https://bryanralston.github.io/rematch/)

## The loop

1. Name **You** and **Rival**. The glass starts empty.
2. Start a series: the game, best of 3 / 5 / 7 or an odd custom, and an optional stakes line.
3. Tap **You won** or **They won**. The scoreboard updates. An optional one-line note sticks to that game.
4. The status reads series open, a lead, tied, or clinched, plus how many wins are left to clinch.
5. Past series stay on this phone. Open one to see the card again.
6. Copy a series link. Someone else can keep that copy. It is not live sync.
7. Remove one series, or clear them all. Undo puts it back.

## Feature Map (what it does today)

In-product **Feature Map** (collapsed in the footer) lists current capabilities, not a roadmap:

- Display names for you and your rival
- A series: title, best of 3 / 5 / 7 / odd custom (1–21), optional stakes
- Theatrical scoreboard
- You won / They won, with an optional one-line note
- Status: open, lead, tied, you clinched, they clinched — and wins left to clinch
- History of past series, including putting an unfinished one back on the glass
- Remove and clear, with Undo
- Undo last game
- Snapshot share via `#r=` or `?r=` — Keep or Not now, not live sync
- 24 series on this device
- Storage-blocked private-mode alert
- Offline via service worker cache **`rematch-v1`**

**Is not:** a league, accounts, live sync, a book, ads, analytics, or anything that phones home.

## Persistence

- `localStorage` key **`rematch-v1`**
- Soft reload keeps the names, the series on the glass, and the history
- Loud banner if storage is blocked (private mode or a browser setting)

## Share

- **Copy series link** packs the series on the glass, or one you opened from history, into the URL (`#r=` and `?r=`).
- A friend opens that link and can keep the copy. It is the series from the moment you copied the link, not live sync.
- Nothing is uploaded.

## Offline / PWA

Service worker cache: **`rematch-v1`**. Installable via `manifest.webmanifest`. Relative `./` paths so GitHub Pages can serve `/rematch/`. The store key is **`rematch-v1`**.

## Tests

```
node rematch/series.test.js
```

Covers best-of clinch math (3 / 5 / 7 / custom), leads, ties, games left to clinch, notes, the 24-series cap, remove and clear undo, reload, and snapshot round-trip.

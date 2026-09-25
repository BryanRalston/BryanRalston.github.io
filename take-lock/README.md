# Take Lock

A sealed vault for hot takes. Name the matchup, write the opinion, and pick when it can open. Until that minute the words are not drawn. When the clock lands, the seal cracks.

Entertainment only. Not betting advice. No book. No real money.

Live: [bryanralston.github.io/take-lock](https://bryanralston.github.io/take-lock/)

## The loop

1. The vault starts empty. Seal a take, or load the sample so the glass already has a seal on it.
2. While it is sealed, the card shows the matchup, an optional side, a countdown, and the unlock time. The take itself is not on the glass.
3. If this tab is open when the clock hits, the seal cracks and the take is exposed. If you come back later, tap **Break the seal**.
4. Edit the words or move the clock. A future unlock seals it again. Remove one, or clear the vault. Undo puts it back.
5. Copy a vault link or a card link. Someone else can keep that copy, or merge it into the vault already on their phone.

## Feature Map (what it does today)

In-product **Feature Map** (collapsed in the footer) lists current capabilities, not a roadmap:

- Matchup, take, optional side, and an unlock time
- Presets: 15 min, 1 hour, tonight at 7, tomorrow at 1, ready now, or an exact minute
- Sealed card: countdown and unlock time, take text not drawn
- Live crack when this tab is open at unlock
- Reveal after the fact, if the clock hit while the tab was closed
- Exposed card built to screenshot
- Edit, including reseal by moving the unlock forward
- Remove and clear, with Undo
- Filters: all, sealed, exposed
- Snapshot share via `#t=` or `?t=` — keep or merge, not live sync
- 24 takes on this device
- Storage-blocked private-mode alert
- Offline via service worker cache **`take-lock-v1`**

**Is not:** betting, a book, an odds feed, accounts, ads, analytics, or live multi-device sync.

## Persistence

- `localStorage` key **`take-lock-v1`**
- Soft reload keeps the vault, the filter, and which seals have already broken
- Loud banner if storage is blocked (private mode or a browser setting)

## Share

- **Copy vault link** packs every take into the URL (`#t=` and `?t=`).
- **Copy card link** packs one take.
- A friend opens that link and can keep the copy or merge it. It is the vault from the moment you copied the link, not live sync.
- The link has to carry the words so they can open later. The screen still hides a take until its unlock time.
- Nothing is uploaded.

## Offline / PWA

Service worker cache: **`take-lock-v1`**. Installable via `manifest.webmanifest`. Relative `./` paths so GitHub Pages can serve `/take-lock/`.

## Tests

```
node take-lock/vault.test.js
```

Covers seal, ready, and exposed phases, early reveal blocked, live crack, reseal, undo, the 24-take cap, filters, and snapshot round-trip.

# Queue Lock

After a bad loss, lock yourself out of queueing again until a cool-down ends.

On this device. A self-control gag. Not a game launcher. No accounts. Nothing phones home.

Live: [bryanralston.github.io/queue-lock](https://bryanralston.github.io/queue-lock/)

## The loop

1. The shelf starts empty. Name the game or mode, or load the sample (Ranked — Control, 15 minutes).
2. Optional tilt chips: bad call, lag, cheese, self-destruct, teammates, just salty. An optional note stays on the card.
3. Cool-down presets are +5m, +15m, +30m, and +60m, or an exact minute.
4. **Lock** opens a **LOCKED FROM QUEUE** card with a live countdown.
5. If this tab is open when the clock hits, the lock opens and the badge reads Waited. Coming back later does the same.
6. **Break the lock** ends it early and logs Broke. Undo puts it back while the cool-down is still ahead.
7. The shelf keeps past locks, with star, filters (all / active / done), remove, and clear. Undo puts a removal back. 24 locks on this phone.
8. Copy a link. Someone else can keep that copy. It is not live sync. Their phone follows the unlock time. A break does not travel.

## Feature Map (what it does today)

In-product **Feature Map** (collapsed in the footer) lists current capabilities, not a roadmap:

- Game or mode, optional tilt chips, optional note
- Presets +5m, +15m, +30m, +60m, or an exact minute
- LOCKED FROM QUEUE card with a live countdown
- Auto-unlock when the clock hits, badged Waited
- Break the lock early, badged Broke, with Undo while time remains
- Star, shelf of 24, filters (all, active, done). Lock stops when the shelf is full
- Remove and clear all, with Undo
- Snapshot share via `#q=` or `?q=` — Keep or Not now, not live sync. The recipient follows the unlock time. Keep at the cap may evict the oldest lock, with Undo
- Load a sample
- Storage-blocked private-mode alert
- Offline via service worker cache **`queue-lock-v1`**

**Is not:** a game launcher, matchmaking, accounts, ads, analytics, or live multi-device sync.

## Persistence

- `localStorage` key **`queue-lock-v1`**
- Soft reload keeps the shelf, the filter, stars, and which locks were broken or waited out
- Loud banner if storage is blocked (private mode or a browser setting)

## Share

- **Copy link** on the shelf packs every lock. **Copy link** on a card packs that lock.
- The token lives in `#q=`. `?q=` works if the token is in the query string.
- A friend can keep that copy or dismiss it. Duplicate locks say they are already on this phone.
- A lock you already broke still arrives locked until the unlock time on their clock. The break does not travel.
- At 24 locks, Keep may drop the oldest lock to make room. Undo puts it back.
- Nothing is uploaded.

## Offline / PWA

Service worker cache: **`queue-lock-v1`**. HTML is network-first. `?q=` links cache on the pathname. Installable via `manifest.webmanifest`. Relative `./` paths so GitHub Pages can serve `/queue-lock/`. Storage key stays **`queue-lock-v1`**. Bump the cache name in `sw.js` when the cached files change. Leave the storage key alone.

## Tests

```
node queue-lock/lock.test.js
```

Covers lock, tilt chips, presets, early break, undo break, auto-unlock as Waited, star order, remove undo, the 24 cap, filters, the sample, duplicate keep, oldest eviction, and a snapshot round-trip that does not carry a break.

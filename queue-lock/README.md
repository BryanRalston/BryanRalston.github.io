# Queue Lock

After a bad loss, lock yourself out of queueing again until a cool-down ends.

On this device. A self-control gag. Not a game launcher. No accounts. Nothing phones home.

Live: [bryanralston.github.io/queue-lock](https://bryanralston.github.io/queue-lock/)

## The loop

1. The shelf starts empty. Name the game or mode, or load the sample (Ranked — Control, 15 minutes).
2. Optional tilt chips: bad call, lag, cheese, self-destruct, teammates, just salty. An optional note stays on the card.
3. Cool-down presets are +5m, +15m, +30m, and +60m, or an exact minute.
4. **Lock** opens a **LOCKED FROM QUEUE** card with a live countdown.
5. If this tab is open when the clock hits, the lock opens and the card reads Queue open. Coming back later does the same.
6. **Break the lock** ends it early and logs Broke. Undo puts it back while the cool-down is still ahead. Remove on an active lock counts as a break.
7. The shelf keeps past locks, with star, filters (all / active / done), remove, and clear. Undo puts a removal back. 24 locks on this phone.
8. Copy a link. Someone else can keep that copy. It is not live sync. Their phone follows the unlock time. A break does not travel.

## Feature Map (what it does today)

In-product **Feature Map** (collapsed in the footer) lists current capabilities, not a roadmap:

- Game or mode, optional tilt chips, optional note
- Presets +5m, +15m, +30m, +60m, or an exact minute
- LOCKED FROM QUEUE card with a live countdown
- Auto-unlock when the clock hits, card reads Queue open
- Break the lock early, logged as Broke, with Undo while time remains. Remove on an active lock counts as a break
- Star, shelf of 24, filters (all, active, done). Lock stops when the shelf is full
- Remove a finished lock, and clear all, with Undo
- Snapshot share via `#q=` or `?q=` — Keep or Not now, not live sync. The recipient follows the unlock time. Keep at the cap drops the oldest finished, unstarred lock, with Undo. Active and starred locks stay
- Load a sample. Each sample gets its own id
- Storage-blocked private-mode alert, only when storage itself throws
- Offline via service worker cache **`queue-lock-v3`**

**Is not:** a game launcher, matchmaking, accounts, ads, analytics, or live multi-device sync.

## Persistence

- `localStorage` key **`queue-lock-v1`**
- Soft reload keeps the shelf, the filter, stars, and which locks were broken or waited out
- A corrupt value is copied to **`queue-lock-v1-corrupt`**, the shelf starts fresh, and saving continues
- Loud banner if storage is blocked (private mode or a browser setting). A bad JSON value does not raise that banner

## Share

- **Copy link** on the shelf packs every lock. **Copy link** on a card packs that lock.
- The token lives in `#q=`. `?q=` works if the token is in the query string.
- A friend can keep that copy or dismiss it. Duplicate locks say they are already on this phone.
- A lock you already broke still arrives locked until the unlock time on their clock. The break does not travel.
- At 24 locks, Keep drops the oldest finished, unstarred lock to make room. Undo puts it back. Active and starred locks are not dropped. If none can be dropped, Keep refuses.
- Nothing is uploaded.

## Offline / PWA

Service worker cache: **`queue-lock-v3`**. HTML is network-first, so a `?q=` share link still caches on the pathname. A script or style request keeps its query string. Installable via `manifest.webmanifest`. Relative `./` paths so GitHub Pages can serve `/queue-lock/`. Storage key stays **`queue-lock-v1`**. Bump the cache name in `sw.js` when the cached files change. Leave the storage key alone.

## Tests

```
node queue-lock/lock.test.js
```

Covers lock, tilt chips, presets, early break, undo break, auto-unlock as Queue open, star order, remove undo, the 24 cap, filters, unique samples, duplicate keep, finished-lock eviction, expired imports, corrupt storage, and a snapshot round-trip that does not carry a break.

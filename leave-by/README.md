# Leave By

Street and lot parking meter countdown. You park, guess the meter, forget, and come back to a ticket. Leave By puts the **leave-by** time on your phone and counts the minutes down while the tab is open.

This is a timer, not a stall recall. Park Spot remembers *where* you parked. Leave By tells you *when you have to move*.

**Local-first:** the running meter and the last 12 sessions live in this browser (`leave-by-v1`). Snapshot links encode a copy of the countdown into the URL. They are not live sync, and nothing is sent to a server. The amount you paid stays on this phone and is left out of the link.

Live: [bryanralston.github.io/leave-by](https://bryanralston.github.io/leave-by/)

## The loop

1. No meter yet. Pick a duration or a leave-by time. Nothing runs until you start.
2. The hero shows the leave-by clock time, large, and the minutes remaining. The remaining time ticks while this tab is open.
3. Optional note (block, lot, spot). Optional amount paid — this device only.
4. **+15 min** extends a running meter. **Ended** closes it. **Start over** and **Clear** put you back on an empty meter. The session stays in history.
5. Last 12 sessions on this phone: leave-by time, duration, note. **Same length** starts that many minutes again.

## Feature Map (what it does today)

In-product **Feature Map** (collapsed in the footer) lists current capabilities, not a roadmap:

- Leave-by hero plus a minutes-remaining countdown that ticks while the tab is open
- Duration chips 15 / 30 / 45 / 60 / 90 / 120
- Exact leave-by clock time (today, at least a minute ahead, up to 16 hours)
- Optional block / lot / spot note
- Optional meter amount, stored locally, never placed in the share link
- +15 min extend while the meter is running
- Ended, clear, and start over
- History of the last 12 sessions, with same-length replay
- Snapshot share via `#m=` or `?m=` — a copy of the countdown, not live sync
- Storage-blocked private-mode alert
- Offline via service worker cache **`leave-by-v1`**

**Is not:** accounts, a server, maps, GPS, payments, ticket lookup, analytics, or live multi-device sync.

## Persistence

- `localStorage` key **`leave-by-v1`**
- Soft reload keeps the running meter and history. Remaining time is computed from the leave-by timestamp, so a reload does not drift.
- Loud banner if storage is blocked

## Share

- **Share snapshot** packs the countdown into the URL (`#m=` and `?m=`).
- A friend opens that link and sees the same leave-by time. The countdown keeps running toward that clock time. It is a copy from the moment you copied the link, not live sync. A later **+15 min** on your phone does not move their copy.
- Amount paid is not in the link.
- Opening the link offers **Keep on this phone**. Nothing is uploaded.

## Offline / PWA

Service worker cache: **`leave-by-v1`**. Installable via `manifest.webmanifest`. Relative `./` paths so GitHub Pages can serve `/leave-by/`.

## Tests

```
node leave-by/meter.test.js
```

Covers chips, clock time (past / short / 16-hour cap), extend, early end, expiry, history cap, paid staying out of the snapshot, and the cache name.

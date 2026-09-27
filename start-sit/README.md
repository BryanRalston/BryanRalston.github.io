# Start Sit

Sunday lineup theater. Name two players, tap Decide, and get a seeded start-or-sit card. The same pair gets the same call until you hit Rematch. The shelf stays on this device.

Entertainment only. For fun with friends. Not fantasy advice. Not betting.

Live: [bryanralston.github.io/start-sit](https://bryanralston.github.io/start-sit/)

## The loop

1. The booth starts empty. Name Player A and Player B. Team / pos and a gut note are optional.
2. Tap **Decide**. One side is START, the other is SIT, with a one-line reason and a confidence meter. The meter is theater, not a projection.
3. **Swap sides** trades the columns. The same player still starts.
4. **Rematch** rerolls a new seeded flavor on that card.
5. **Star** a verdict you want to find later. **Undo** takes back the last decide, swap, rematch, or star.
6. Past matchups stay on this phone, up to 24. Open one, remove one, or clear them. Undo puts a removal back.
7. **Copy link** packs the open verdict into `#s=` (or `?s=`). Someone else can keep that copy. It is not live sync.

## Feature Map (what it does today)

In-product **Feature Map** (collapsed in the footer) lists current capabilities, not a roadmap:

- Two names, optional team / pos, optional gut note. Whitespace is trimmed.
- Theatrical START / SIT card, one-line reason, entertainment confidence meter
- Same inputs, same call, until Rematch
- Swap sides, Rematch / Reroll, Star, Undo
- History of 24 verdicts, open, remove, clear, toast Undo
- Snapshot share via `#s=` or `?s=` — Keep or Not now, not live sync. Same-tab hash changes show the offer. A bad token toasts.
- Load sample
- Storage-blocked private-mode alert
- Offline via service worker cache **`start-sit-v1`**

**Is not:** fantasy advice, betting, projections, news, live scores, accounts, live sync, ads, analytics, or anything that phones home.

## Persistence

- `localStorage` key **`start-sit-v1`**
- Service worker cache **`start-sit-v1`**

## Check

```bash
node verdict.test.js
```

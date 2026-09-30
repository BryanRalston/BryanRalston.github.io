# Trade Grade

Fantasy trade roast booth. Name what you give and what you get, tap Grade, and get a seeded letter card. The same packages get the same letter and roast until you hit Re-grade. The shelf stays on this device.

Entertainment only. For the group chat. Not fantasy advice. Not betting.

Live: [bryanralston.github.io/trade-grade](https://bryanralston.github.io/trade-grade/)

## The loop

1. The booth starts empty. Name what you give and what you get. A league or team note is optional.
2. Tap **Grade**. A letter card (A+ through F), a one-line roast, a confidence meter, and the give ↔ get line. The meter is theater, not a projection. The same packages get the same card. Grading a pair already on the shelf brings that card up.
3. **Re-grade** keeps the letter and rolls a new roast on that card.
4. **Star** a grade you want to find later. **Undo** takes back the last grade, re-grade, or star.
5. Past grades stay on this phone, up to 24. Filter all or starred. Open one, remove one, or clear them. Undo puts a removal back. A new grade at the cap drops the oldest unstarred grade. Starred grades stay.
6. **Copy link** packs the open grade into `#g=` (or `?g=`). **Copy shelf link** packs the shelf. Someone else can keep that copy. It is not live sync.

## Feature Map (what it does today)

In-product **Feature Map** (collapsed in the footer) lists current capabilities, not a roadmap:

- Give and get, optional league or team note. Whitespace is trimmed. Markup stays text.
- Letter card, one-line roast, entertainment confidence meter, give ↔ get summary
- Same give and get, same letter and roast, until Re-grade
- Re-grade, Star, Undo
- History of 24 grades, all / starred filters, open, remove, clear, toast Undo
- At the cap, the oldest unstarred grade makes room. Starred grades are not dropped when another can go
- Snapshot share via `#g=` or `?g=` — Keep or Not now, not live sync. Keep does not copy the sender's star. A duplicate says it is already on this phone. A bad token toasts. Same-tab hash changes show the offer
- Load sample
- Storage-blocked private-mode alert
- Offline via service worker cache **`trade-grade-v1`**. HTML is network-first, and `?g=` is not cached as its own URL

**Is not:** fantasy advice, betting, projections, news, live scores, accounts, live sync, ads, or anything that phones home.

## Persistence

- `localStorage` key **`trade-grade-v1`**
- Service worker cache **`trade-grade-v1`**

## Check

```bash
node grade.test.js
```

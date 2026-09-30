# Trade Grade

Fantasy trade roast booth. Name what you give and what you get, tap Grade, and get a seeded letter card. The same packages get the same letter and roast until you hit Re-grade. The shelf stays on this device.

Entertainment only. For the group chat. Not fantasy advice. Not betting.

Live: [bryanralston.github.io/trade-grade](https://bryanralston.github.io/trade-grade/)

## The loop

1. The booth starts empty. Name what you give and what you get. A league or team note is optional.
2. Tap **Grade**. A letter card (A+ through F), a one-line roast, a stamp, a confidence meter, and the give ↔ get line. The meter is theater, not a projection. Ordinary names can land anywhere on the scale. The reverse trade gets the mirror letter, and C stays C. The same packages get the same card. Grading a pair already on the shelf brings that card up, including a re-graded roast.
3. **Re-grade** keeps the letter, rolls a new roast, and keeps the stamp with that letter.
4. **Star** a grade you want to find later. **Undo** takes back the last grade, re-grade, or star.
5. Past grades stay on this phone, up to 24. Filter all or starred. Open one, remove one, or clear them. Undo puts a removal back. A new grade at the cap drops the oldest unstarred grade. Starred grades stay.
6. **Copy link** packs the open grade into `#g=` (or `?g=`). **Copy shelf link** packs the shelf. Someone else can keep that copy. It is not live sync.

## Feature Map (what it does today)

In-product **Feature Map** (collapsed in the footer) lists current capabilities, not a roadmap:

- Give and get, optional league or team note. Whitespace is trimmed. Packages split on commas, plus signs, ampersands, slashes, or the word and, then sort. Markup stays text.
- Letter card, one-line roast, stamp, entertainment confidence meter, give ↔ get summary. Stamps and meters follow the letter. Keyboard mash gets a joke grade.
- Same normalized packages share one card. Re-grade changes the roast and keeps the letter. Grading that pair again brings the re-graded card back. The reverse package gets the mirror letter.
- Re-grade, Star, Undo. A toast that still has Undo is not replaced by a later note.
- History of 24 grades, all / starred filters, open, remove, clear, toast Undo. Opening a row does not wipe a half-typed trade.
- At the cap, the oldest unstarred grade makes room. Starred grades are not dropped when another can go.
- Snapshot share via `#g=` or `?g=` — Copy link copies in one tap. The link does not carry the star. Keep recomputes the letter, stamp, meter, and roast. A shelf link keeps what fits and says so before you tap, including how many oldest unstarred grades it drops. If nothing fits, the offer stays up. Not live sync. A duplicate says it is already on this phone. A bad token toasts. Same-tab hash changes show the offer.
- Load sample
- Storage-blocked private-mode alert. A corrupt save is backed up under `trade-grade-v1-corrupt` and a notice shows.
- Offline via service worker cache **`trade-grade-v2`**. HTML is network-first. Scripts and styles are stale-while-revalidate. `?v=` and `?g=` are cached by pathname only.

**Is not:** fantasy advice, betting, projections, news, live scores, accounts, live sync, ads, or anything that phones home.

## Persistence

- `localStorage` key **`trade-grade-v1`**
- Service worker cache **`trade-grade-v2`**

## Check

```bash
node grade.test.js
```

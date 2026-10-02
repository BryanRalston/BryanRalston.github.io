# Parlay Autopsy

Parlay postmortem theater. The slip is dead. Name two to six legs, mark the leg that killed it, and tap Autopsy. The same legs and the same killers get the same stamp and roast until you hit Re-autopsy. The shelf stays on this device.

Entertainment only. For the group chat. Not betting advice. Not a book. No real money.

Live: [bryanralston.github.io/parlay-autopsy](https://bryanralston.github.io/parlay-autopsy/)

## The loop

1. The slab starts empty. Name two to six legs. American odds are optional. Mark at least one leg that killed it. A note is optional.
2. Tap **Autopsy**. An AUTOPSY card, a cause-of-death stamp, a one-line roast, a tag, a corpse meter, and the legs. The meter is theater, not a probability. The same legs and killers get the same card. Cutting a slip already on the shelf brings that card up, including a re-autopsied roast, and saves a newly typed note.
3. **Re-autopsy** keeps the stamp, the tag, and the corpse meter, and rolls a new roast. It does not always open with the same phrase.
4. **Star** an autopsy you want to find later. **Undo** takes back the last autopsy, re-autopsy, or star.
5. Past autopsies stay on this phone, up to 24. Filter all or starred. Open one, remove one, or clear them. Undo puts a removal back. A new autopsy at the cap drops the oldest unstarred autopsy. Starred autopsies stay. If every autopsy is starred, the slab refuses another.
6. **Copy link** packs the open autopsy into `#a=` (or `?a=`). **Copy shelf link** packs the shelf. Someone else can keep that copy. It is not live sync. Doom Parlay already uses `#p=`, so this slab uses `#a=`.

## Feature Map (what it does today)

In-product **Feature Map** (collapsed in the footer) lists current capabilities, not a roadmap:

- Two to six legs. Names required. American odds optional (`-110`, `+180`, or unsigned `180`). A percent or a fraction does not cut. Markup stays text. Names are NFC-lowercased, not ASCII-stripped, so accents, non-Latin letters, and emoji stay. Word order inside a name does not matter, then the legs are order-normalized for the match.
- AUTOPSY card, cause of death, one roast, a tag, a corpse meter, and DEAD / CASHED from the marks you made. The page does not know the result. Stamps: LAST LEG, MIDDLE BLEED, TOTAL COLLAPSE, NEAR MISS, ONE-TICK. ONE-TICK is exactly one killer whose price sits from -130 through -100 or +100 through +130. A cashed juice price does not move the stamp. The first typed order sets the stamp. A later reorder reopens that card.
- Re-autopsy, Star, Undo. A toast Undo leaves when it can no longer work. A confirmation still shows beside it. A form error stays on the form and does not cover Undo.
- History of 24 autopsies, all / starred filters, open, remove, clear, toast Undo. Opening a row does not wipe a half-typed slip.
- At the cap, the oldest unstarred autopsy makes room. Starred autopsies are not dropped when another can go. A shelf of only stars refuses a new autopsy.
- Snapshot share via `#a=` or `?a=` — Copy link copies in one tap. The link does not carry the star. Keep recomputes the stamp, tag, meter, and roast, so a forged line does not survive. A shelf link keeps what fits and says so before you tap, including how many oldest unstarred autopsies it drops. If nothing fits, the offer stays up. Not live sync. A duplicate says it is already on this phone. A bad token toasts. Same-tab hash changes show the offer.
- Load sample
- Storage-blocked private-mode alert. A corrupt save is backed up under `parlay-autopsy-v1-corrupt` and a notice shows.
- Offline via service worker cache **`parlay-autopsy-v1`**. HTML is network-first. Scripts and styles are stale-while-revalidate. `?v=` and `?a=` are cached by pathname only.

**Is not:** betting advice, a book, real money, a pre-bet calculator, live odds, live scores, accounts, live sync, ads, or anything that phones home.

## Persistence

- `localStorage` key **`parlay-autopsy-v1`**
- Service worker cache **`parlay-autopsy-v1`**

## Check

```bash
node autopsy.test.js
```

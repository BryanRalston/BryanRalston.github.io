# Lock Panic

Fantasy lock-anxiety theater. Lineup locks soon. Name the questionable starter, optional backup, and optional minutes to lock, then tap Panic. The same starter and backup get the same stamp and roast until you hit Re-panic. The shelf stays on this device.

Entertainment only. Not fantasy advice. No money.

Live: [bryanralston.github.io/lock-panic](https://bryanralston.github.io/lock-panic/)

## The loop

1. The card starts empty. Name the questionable starter. A backup, minutes to lock, and a note are optional.
2. Tap **Panic**. A LOCK PANIC card, a stamp, a one-line roast, a tag, and an anxiety meter. The meter follows the stamp. It is theater, not a projection. The same starter and backup get the same card. Panicking a pair already on the shelf brings that card up, including a re-panicked roast, saves newly typed minutes or a note, and leaves the form as you typed it.
3. **Re-panic** keeps the stamp, the tag, and the anxiety meter, and rolls a new roast. It does not always open with the same phrase.
4. **Star** a panic you want to find later. **Undo** takes back the last panic, re-panic, or star.
5. Past panics stay on this phone, up to 24. Filter all or starred. Open one, remove one, or clear them. Undo puts a removal back. A new panic at the cap drops the oldest unstarred panic. Starred panics stay. If every panic is starred, the card refuses another.
6. **Copy link** packs the open panic into `#k=` (or `?k=`). **Copy shelf link** packs the shelf. Someone else can keep that copy. It is not live sync.

## Feature Map (what it does today)

In-product **Feature Map** (collapsed in the footer) lists current capabilities, not a roadmap:

- One questionable starter. Backup, minutes, and note are optional. Minutes are a whole number from 0 to 240. Names fold case, apostrophes, periods, and accents, so Ja'Marr and Jamarr match, A.J. Brown matches AJ Brown, and José Ramírez matches Jose Ramirez. The card shows the name as typed. Word order inside a name does not matter. The same player in both boxes is rejected. Swap the names and the stamp flips. Minutes and a note do not move the stamp.
- LOCK PANIC card, stamp, one roast, a tag, and an anxiety meter. Stamps: HOLD, LEAN HOLD, COIN FLIP, LEAN SWAP, PANIC. With no backup, LEAN SWAP is filed as LEAN HOLD and PANIC is filed as COIN FLIP. Most solo lines do not nag about the missing backup.
- Re-panic, Star, Undo. A toast Undo leaves when it can no longer work. The room Undo, from a panic that had to make room, leaves once that new card is starred or re-panicked. A confirmation still shows beside it. A form error stays on the form and does not cover Undo.
- History of 24 panics, all / starred filters, open, remove, clear, toast Undo. Opening a row does not wipe a half-typed starter.
- At the cap, the oldest unstarred panic in shelf order makes room. Re-entering a pair or keeping a shared card counts as a touch. Starred panics are not dropped when another can go. A shelf of only stars refuses a new panic.
- Snapshot share via `#k=` or `?k=` — Copy link copies in one tap. The link does not carry the star. Keep recomputes the stamp, tag, meter, and roast, so a forged line does not survive. A shelf link keeps what fits and says so before you tap, including how many oldest unstarred panics it drops. If nothing fits, the offer stays up. Not live sync. A duplicate says it is already on this phone. A keep that finds some already here says how many were new and how many were already here. An empty `#k=` is cleared. A bad token toasts. Same-tab hash changes show the offer.
- Load sample
- Storage-blocked private-mode alert. A card that fails validation is set aside under `lock-panic-v1-corrupt`. The rest of the shelf stays, and the notice says how many. A save that is not a shelf at all is backed up and the page starts fresh.
- Offline via service worker cache **`lock-panic-v3`**. HTML is network-first. Scripts and styles are stale-while-revalidate and tagged with `?v=`. Versioned JS and CSS are cached by the full URL. `?k=` stays off the HTML cache key.

**Is not:** fantasy advice, a start/sit ranking, betting, real money, live projections, accounts, live sync, ads, or anything that phones home.

## Persistence

- `localStorage` key **`lock-panic-v1`**
- Service worker cache **`lock-panic-v3`**

## Check

```bash
node panic.test.js
```

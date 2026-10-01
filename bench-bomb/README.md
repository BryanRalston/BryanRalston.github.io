# Bench Bomb

Fantasy bench regret board. Name the player you sat, the points they dropped, and who you started instead if you want the alibi on the card. Tap Bomb. The same sit gets the same energy and roast until you hit Re-bomb. The shelf stays on this device.

Entertainment only. For the group chat. Not fantasy advice. Not betting. No money.

Live: [bryanralston.github.io/bench-bomb](https://bryanralston.github.io/bench-bomb/)

## The loop

1. The board starts empty. Name who you benched and the points they dropped. A number or a rough range is enough. Who you started, and a week or league note, are optional.
2. Tap **Bomb**. A BOMB card, an energy from DUD through NUCLEAR, a one-line roast, a stamp, a fallout meter, and the sit. The meter is theater, not a projection. The same sit gets the same card. Bombing a sit already on the shelf brings that card up, including a re-bombed roast.
3. **Re-bomb** keeps the energy, the stamp, and the fallout, and rolls a new roast.
4. **Star** a bomb you want to find later. **Undo** takes back the last bomb, re-bomb, or star.
5. Past bombs stay on this phone, up to 24. Filter all or starred. Open one, remove one, or clear them. Undo puts a removal back. A new bomb at the cap drops the oldest unstarred bomb. Starred bombs stay. If every bomb is starred, the board refuses another.
6. **Copy link** packs the open bomb into `#n=` (or `?n=`). **Copy shelf link** packs the shelf. Someone else can keep that copy. It is not live sync. Beat Log already uses `#b=`, so this board uses `#n=`.

## Feature Map (what it does today)

In-product **Feature Map** (collapsed in the footer) lists current capabilities, not a roadmap:

- Benched name, optional starter, points as a number or a rough range, optional week or league note. Whitespace is trimmed. Names are order-normalized for the shelf. Markup stays text.
- BOMB card, energy, one-line roast, stamp, fallout meter, benched name, points, and starter. Stamps and meters follow the points.
- Same normalized sit shares one card. A range is the same forwards and backwards. About 32 and 32 share a card. Re-bomb changes the roast and keeps the energy. Bombing that sit again brings the re-bombed card back. The week note does not move the energy.
- Re-bomb, Star, Undo. A toast that still has Undo is not replaced by a later note.
- History of 24 bombs, all / starred filters, open, remove, clear, toast Undo. Opening a row does not wipe a half-typed sit.
- At the cap, the oldest unstarred bomb makes room. Starred bombs are not dropped when another can go. A shelf of only stars refuses a new bomb.
- Snapshot share via `#n=` or `?n=` — Copy link copies in one tap. The link does not carry the star. Keep recomputes the energy, stamp, meter, and roast, so a forged line does not survive. A shelf link keeps what fits and says so before you tap, including how many oldest unstarred bombs it drops. If nothing fits, the offer stays up. Not live sync. A duplicate says it is already on this phone. A bad token toasts. Same-tab hash changes show the offer.
- Load sample
- Storage-blocked private-mode alert. A corrupt save is backed up under `bench-bomb-v1-corrupt` and a notice shows.
- Offline via service worker cache **`bench-bomb-v1`**. HTML is network-first. Scripts and styles are stale-while-revalidate. `?v=` and `?n=` are cached by pathname only.

**Is not:** fantasy advice, betting, money, projections, news, live scores, accounts, live sync, ads, or anything that phones home.

## Persistence

- `localStorage` key **`bench-bomb-v1`**
- Service worker cache **`bench-bomb-v1`**

## Check

```bash
node bomb.test.js
```

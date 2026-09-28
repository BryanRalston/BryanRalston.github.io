# Spoiler Seal

A vault for scores and endings you have not seen yet. Name the game or the episode, optionally write the result, and pick when the bars can lift. Until then the result stays blacked out.

On this device. Entertainment, and personal spoiler hygiene. Not affiliated with any league or network.

Live: [bryanralston.github.io/spoiler-seal](https://bryanralston.github.io/spoiler-seal/)

## The loop

1. The vault starts dark. Seal a spoiler, or load the sample (Chiefs @ Bills, sealed until after the 4th).
2. While it is sealed, the card shows the title, an optional note, a countdown, and a redacted result under a SEALED stamp.
3. If this tab is open when the clock hits, the seal cracks on its own. Coming back later opens it too.
4. Break the seal if you are ready early. The card shows the time you broke it. Undo puts the bars back while the unlock is still ahead.
5. A blank result opens as ready for your notes. Edit can fill it in. A future unlock reseals the card.
6. Star a seal to pin it. Remove one, or clear all. Undo puts it back.
7. Copy a link. Someone else can keep that copy on their phone. It is not live sync.

## Feature Map (what it does today)

In-product **Feature Map** (collapsed in the footer) lists current capabilities, not a roadmap:

- Title, optional league or show tag, a visible note, and an optional result
- Presets: +1h, +3h, end of night, or an exact minute
- Sealed card: countdown, redaction bars, SEALED stamp
- Auto-crack when the clock lands
- Break the seal early, recording the time it was broken, with Undo
- Cracked card, or ready for your notes when the result was blank
- Edit. A sealed result stays out of the form. A future unlock reseals the card
- Star, shelf of 24, filters (all, sealed, cracked). Seal it stops when the shelf is full
- Remove and clear all, with Undo
- Snapshot share via `#v=` or `?v=` — the recipient follows the unlock time, even if the sender already broke the seal. Keep or Not now, not live sync
- Storage-blocked private-mode alert
- Offline via service worker cache **`spoiler-seal-v2`**

**Is not:** a score feed, a league or network app, accounts, ads, analytics, or live multi-device sync.

## Persistence

- `localStorage` key **`spoiler-seal-v1`**
- Soft reload keeps the vault, the filter, stars, and which seals have cracked
- Loud banner if storage is blocked (private mode or a browser setting)

## Share

- **Copy link** on the shelf packs every seal. **Copy link** on a card packs that seal.
- The token lives in `#v=`. `?v=` works if the token is moved into the query string.
- A friend can keep that copy or dismiss it. Duplicate seals say they are already on this phone. A seal you already broke still arrives sealed until the unlock time on their clock.
- The link has to carry the result so it can open later. The screen still hides it until the seal cracks.
- Nothing is uploaded.

## Offline / PWA

Service worker cache: **`spoiler-seal-v2`**. HTML is network-first. `?v=` links cache on the pathname. Installable via `manifest.webmanifest`. Relative `./` paths so GitHub Pages can serve `/spoiler-seal/`. Storage key stays **`spoiler-seal-v1`**.

## Tests

```
node spoiler-seal/vault.test.js
```

Covers seal with and without a result, presets, early break, auto-crack, reseal, star order, undo, the 24-seal cap, filters, the sample, duplicate keep, and snapshot round-trip.

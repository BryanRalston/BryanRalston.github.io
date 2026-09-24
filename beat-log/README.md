# Beat Log

A personal log for video games. Title, status (wishlist, playing, beaten, dropped), optional platform, optional half-star rating, optional one-line take.

The shelf stays on this device. A snapshot link is a copy, not live sync.

Live: [bryanralston.github.io/beat-log](https://bryanralston.github.io/beat-log/)

## Loop

1. Log a game. The shelf starts empty.
2. Filter by status. Sort recent or A–Z.
3. Open a game for the share card (title, status, stars, take).
4. Copy a shelf link or a card link. Someone else can keep that copy on their phone.

## Persistence

- `localStorage` key **`beat-log-v1`**
- Service worker cache **`beat-log-v1`**
- Snapshot token **`#b=`** (also `?b=`)
- 48 games on this device

## Tests

```
node beat-log/log.test.js
```

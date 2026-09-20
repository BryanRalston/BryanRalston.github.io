# Park Spot

Remember where you parked. After shopping or an appointment, open the app and read garage, level, section, and stall at a glance — plus an optional note and car-color chip. **Local-first:** the current spot and last eight parks live in this browser (`park-spot-v1`). Snapshot links encode a copy into the URL so someone picking you up can see the stall; they are not live sync, and nothing is sent to a server.

Live: [bryanralston.github.io/park-spot](https://bryanralston.github.io/park-spot/)

## Feature Map (what it does today)

In-product **Feature Map** lists current capabilities, not a roadmap:

- Save a current spot: venue (optional), garage, level, section/row, spot #, note, car color
- Big recall hero readable on a phone
- Clear the current spot
- Recent history (last 8) with restore
- Snapshot share via URL hash/query (`#p=` / `?p=`)
- Incoming share offers **Use this spot** — local save only
- Storage-blocked private-mode alert
- Offline via service worker cache **`park-spot-v1`**

**Is not:** accounts, a server, maps/GPS, analytics, or live multi-device sync.

## Persistence

- `localStorage` key **`park-spot-v1`**
- Soft reload keeps the current stall and history
- Loud banner if storage is blocked

## Offline / PWA

Service worker cache: **`park-spot-v1`**. Installable via `manifest.webmanifest`. Relative `./` paths so GitHub Pages can serve `/park-spot/`.

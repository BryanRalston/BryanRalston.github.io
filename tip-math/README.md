# Tip Math

The table is waiting while someone tip-maths the check. Enter a subtotal, pick a tip, split 1–20 seats. Pennies are dealt so the table still adds up. **Local-first:** the last ten checks live in this browser (`tip-math-v1`). Snapshot links encode a copy into the URL; they are not live sync, and nothing is sent to a server.

Live: [bryanralston.github.io/tip-math](https://bryanralston.github.io/tip-math/)

## Feature Map (what it does today)

In-product **Feature Map** lists current capabilities, not a roadmap:

- Bill subtotal plus optional tax
- Tip on subtotal or after tax
- Chips 15 / 18 / 20 / 22 / 25 and a custom %
- Split 1–20 with remainder penny fairness
- Optional round-up per person (extra becomes tip)
- History of the last 10 checks on this device
- Snapshot share via URL hash/query (`#t=` / `?t=`)
- Storage-blocked private-mode alert
- Offline via service worker cache **`tip-math-v1`**

**Is not:** accounts, a server, analytics, or live multi-device sync.

## Persistence

- `localStorage` key **`tip-math-v1`**
- Soft reload keeps the current pad and history
- Loud banner if storage is blocked

## Offline / PWA

Service worker cache: **`tip-math-v1`**. Installable via `manifest.webmanifest`. Relative `./` paths so GitHub Pages can serve `/tip-math/`.

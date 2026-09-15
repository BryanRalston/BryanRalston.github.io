# Form Stack

Local-first tracker for school and activity paper — permission slips, health forms, volunteer signups, library notices. Built for the backpack problem: kids bring home forms, due dates get missed.

Live: [bryanralston.github.io/form-stack](https://bryanralston.github.io/form-stack/)

## The loop

1. Add a form (title, kid, due date, category, status).
2. Optional photo of the paper — compressed, stored in this browser only.
3. Home list sorts by due soonest. Overdue lights up. Filter by kid or status.
4. Tap a status chip to move the slip. Delete asks first.

Empty state teaches the loop. **Load example forms** uses Kid A / Kid B — clearly fake sample data.

## Persistence

- `localStorage` key **`form-stack-v1`**
- Soft reload keeps data
- Loud banner if storage is blocked

## Share / print

- **Copy snapshot** packs forms (no photos) into a compressed URL hash. Opening the link loads that snapshot. It is **not** live sync.
- **Print this week** is a paper list of what’s due in the next 7 days (plus anything already overdue).

## Offline / PWA

Service worker cache: **`form-stack-v1`**. Installable via `manifest.webmanifest`. Relative `./` paths so GitHub Pages can serve `/form-stack/`.

## Privacy

No accounts, no server, no secrets in the repo. Photos never go in snapshot links.

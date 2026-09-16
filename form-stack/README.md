# Form Stack

Local-first tracker for school and activity paper — permission slips, health forms, volunteer signups, library notices. Built for the backpack problem: kids bring home forms, due dates get missed.

Live: [bryanralston.github.io/form-stack](https://bryanralston.github.io/form-stack/)

## The loop

1. Add a form (title, kid, due date, category, status).
2. Optional photo of the paper — compressed, stored in this browser only.
3. Home list sorts by due soonest. Overdue lights up. Filter by kid or status.
4. Tap a status chip to move the slip. Delete asks first.

Empty state teaches the loop. **Load example forms** uses Kid A / Kid B — clearly fake sample data. On a phone the empty-state **Add a form** button stays visible; the bottom CTA continues the same loop.

## Feature Map (what it does today)

In-product Feature Map / About lists current capabilities, not a roadmap:

- Add / edit / delete forms (title, kid, due date, category, notes)
- Status: need print → need signature → signed → turned in
- This-week due list, due-soon header, overdue highlight, filter by kid or status
- Optional photo of the paper (this device only; omitted from share URLs)
- Snapshot share in the URL — **not** live sync
- Print this week
- Clear device
- Offline via service worker cache **`form-stack-v1`**

**Is not:** accounts, a server, live family sync, or cloud photos.

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

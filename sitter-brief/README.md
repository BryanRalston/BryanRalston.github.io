# Sitter Brief

Local-first leave-with-babysitter / grandparent one-pager. Kids, bedtime, food, who to call, wifi, house notes, and when you’ll be back — one page on the counter.

Live: [bryanralston.github.io/sitter-brief](https://bryanralston.github.io/sitter-brief/)

This is **not** a form tracker (Form Stack), packing list (Practice Pack), potluck, budget, or shared board.

## The loop

1. First open is empty. **Write a brief** or **Load example briefs**.
2. Fill kids (name + age/notes), bedtime/routine, food/allergies, emergency contacts, wifi, house notes, return time.
3. Print the one-pager, copy a text summary, or copy a snapshot URL.

Empty state teaches fill → print/share. **Load example briefs** uses Kid A / Kid B and fake phones — clearly sample data.

## Feature Map (what it does today)

In-product Feature Map / About lists current capabilities, not a roadmap:

- Edit a leave-behind: kids, bedtime/routine, food/allergies, contacts, wifi, house notes, return time
- Multiple saved briefs (switch Saturday sitter vs Grandma)
- Printable / phone-readable one-pager
- One-tap copy summary text
- Snapshot share in the URL — **not** live sync (current brief only)
- Clear device
- Offline via service worker cache **`sitter-brief-v1`**

**Is not:** accounts, a server, live family sync, a packing list, form tracker, potluck, budget, or shared board.

## Persistence

- `localStorage` key **`sitter-brief-v1`**
- Soft reload keeps data
- Loud banner if storage is blocked

## Share / print

- **Copy snapshot** packs the current brief into a compressed URL hash (`#b=`). Opening the link loads that snapshot. It is **not** live sync. Other saved briefs stay on this device.
- **Copy summary** copies a plain-text version for a message.
- **Print brief** is a one-page leave-behind.

## Offline / PWA

Service worker cache: **`sitter-brief-v1`**. Installable via `manifest.webmanifest`. Relative `./` paths so GitHub Pages can serve `/sitter-brief/`.

## Privacy

No accounts, no server, no secrets in the repo. Example briefs use Kid A / Kid B — not a real family.

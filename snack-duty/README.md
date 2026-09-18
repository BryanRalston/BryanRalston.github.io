# Snack Duty

Local-first snack rotation for a team or class. Soccer, school, church — who brings snacks this week, who is next, and who has not gone in longest. Stays on this device.

Live: [bryanralston.github.io/snack-duty](https://bryanralston.github.io/snack-duty/)

This is **not** a one-off potluck signup (Potluck Plate) or a gear packing list (Practice Pack).

## The loop

1. First open seeds a generic **Soccer U8 · Fall 2026** example — Family A–E only, no real names.
2. Name the group (optional season). Add families with an optional dietary note.
3. Assign snack dates. Today / next-up sits at the top. Dietary flags ride on the date card.
4. Print the coach clipboard, or copy a snapshot URL.

Empty state after **Clear device** teaches name the group → add families → assign dates. **Load Soccer U8 example** uses labeled sample families only.

## Feature Map (what it does today)

In-product Feature Map / About lists current capabilities, not a roadmap:

- One group on this device (name + optional season)
- Families with optional dietary notes
- Date assignments (who brings)
- Today / next-up highlight
- Rotation suggestion (who has not brought in longest)
- Undo last assign
- Coach clipboard / print list
- Snapshot share in the URL — **not** live sync
- Clear device
- Offline via service worker cache **`snack-duty-v1`**

**Is not:** accounts, a server, live team sync, a potluck dish list, or a packing bag.

## Persistence

- `localStorage` key **`snack-duty-v1`**
- Soft reload keeps data
- Loud banner if storage is blocked

## Share / print

- **Copy snapshot** packs the group, families, and dates into a compressed URL hash (`#s=`). Opening the link loads that snapshot. It is **not** live sync.
- **Coach clipboard** is a clean list for a paper print or a phone held up on the sideline.

## Offline / PWA

Service worker cache: **`snack-duty-v1`**. Installable via `manifest.webmanifest`. Relative `./` paths so GitHub Pages can serve `/snack-duty/`.

## Privacy

No accounts, no server, no secrets in the repo. Starter data is Soccer U8 with Family A–E — not a real roster.

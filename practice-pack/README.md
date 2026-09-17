# Practice Pack

Local-first packing checklist for kids’ sports and activities. Parents forget cleats, water, shin guards, the snack. Name a bag, check it at the door, reset for next practice.

Live: [bryanralston.github.io/practice-pack](https://bryanralston.github.io/practice-pack/)

## The loop

1. First open seeds four starter bags — Soccer, Dance, Swimming, Scouts. Edit or delete any of them.
2. Each bag is a checklist. Mark items **always pack** or optional. Optional notes and an optional kid label live on the bag.
3. **Leaving now** is the door mode: large taps, a remaining count, and a quiet celebration when the always-pack list is done.
4. **Reset for next** keeps the items and clears the checkmarks. Always-pack rows stay listed at the top.

Empty state teaches the loop. **Load starter bags** uses activity names only — no family names.

## Feature Map (what it does today)

In-product Feature Map / About lists current capabilities, not a roadmap:

- Named bags / activities with optional day hint and kid label
- Checklist items, always-pack vs optional
- Leaving now: large tap targets, remaining count, packed celebration
- Reset for next practice (keeps items, clears checks)
- Starter templates: Soccer, Dance, Swimming, Scouts
- Optional notes per bag
- Snapshot share in the URL — **not** live sync
- Clear device
- Offline via service worker cache **`practice-pack-v1`**

**Is not:** accounts, a server, live family sync, or photos.

## Persistence

- `localStorage` key **`practice-pack-v1`**
- Soft reload keeps data
- Loud banner if storage is blocked

## Share

- **Copy snapshot** packs bags and checks into a compressed URL hash (`#k=`). Opening the link loads that snapshot. It is **not** live sync.
- No photos in v1, so nothing is omitted for that reason — still a copy, not a live board.

## Offline / PWA

Service worker cache: **`practice-pack-v1`**. Installable via `manifest.webmanifest`. Relative `./` paths so GitHub Pages can serve `/practice-pack/`.

## Privacy

No accounts, no server, no secrets in the repo. Starter bags are generic activity lists, not a real family’s dump.

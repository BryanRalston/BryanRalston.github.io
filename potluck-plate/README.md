# Potluck Plate

Local-first signup for **any gathering** — potluck, birthday, office lunch, cookout, baby/bridal shower, or a blank list you name yourself. Claim a category, say what you’re bringing, share a snapshot link.

## First visit

Pick a template → name the event → pick a theme → open the sheet. Under a minute. Demo data loads only if you tap **See a sample potluck** (or when this device is empty and you choose that path). Opening a `#p=` share link imports that snapshot and does **not** get wiped by the demo.

## Event types

Templates rewrite default categories and copy:

- Potluck / fellowship lunch
- Birthday party
- Office lunch / team meal
- BBQ / cookout
- Baby / bridal shower
- Custom (blank) — you name categories from scratch

The **headline** is the event name (e.g. “Maya’s birthday signup”). The product name **Potluck Plate** stays in the header kicker, footer, and About.

## Categories

Add, rename, remove, and reorder categories. Edit “needed” counts. Soft targets — go over if the crowd is big. Stored in `localStorage` and packed into the share hash.

## Themes

Host-picked accent, stored on the event and in the share hash:

- Warm paprika (default)
- Garden mint
- Coastal sky
- Midnight ink

## Share links

**Share link** packs the current event (theme, categories, claims, copy) into the URL hash. Opening that link loads the snapshot on another device. It is **not** live sync — later edits on one phone do not push to another unless you share a fresh link. The app says so in the toast, About, and footer.

## Privacy

Everything stays in this browser’s `localStorage` (`potluck-plate-v2`, migrated from `potluck-plate-v1`). No accounts, no server, no secrets in the repo. Demo names are fictional.

## Offline / PWA

Service worker cache: **`potluck-plate-v4`**. Installable via `manifest.webmanifest`. Storage key remains `potluck-plate-v2`.

## Pages

https://bryanralston.github.io/potluck-plate/

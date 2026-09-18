# Potluck Plate

Local-first signup for **any gathering** — potluck, birthday, office lunch, cookout, baby/bridal shower, or a blank list you name yourself. Claim a category, say what you’re bringing, share a snapshot link.

## First visit

Pick a template → name the event → pick a theme → open the sheet. Under a minute. Demo data loads only if you tap **See a sample potluck** (or when this device is empty and you choose that path). Opening a `#s=` or legacy `#p=` share link imports that snapshot and does **not** get wiped by the demo. A `#u=` update link merges one claim into the event already on this device.

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

**Share link** packs a snapshot of the current event into the URL hash — no server, no shortener. Copy writes a compact `#s=` link (short keys, category/claim tuples with ids, empty notes dropped, default template categories omitted, then zlib + base64url). Opening that link loads the snapshot on another device. Legacy uncompressed `#p=` JSON links still import. After copy, the toast shows the approximate URL length.

**Update links** (`#u=`) carry one claim only (person, dish, category, tags, notes, and claim id). After a guest adds or edits a claim, the app copies that update link; **Copy update** on a row does the same. The host opens the link or uses **Paste update** to merge by claim id (add or replace), then re-shares a fresh `#s=` snapshot with the group.

It is **not live sync** — guests send an update link; host opens it to merge, then re-shares. About, footer, and the sheet hint say so.

## Privacy

Everything stays in this browser’s `localStorage` (`potluck-plate-v2`, migrated from `potluck-plate-v1`). No accounts, no server, no secrets in the repo. Demo names are fictional.

## Offline / PWA

Service worker cache: **`potluck-plate-v5`**. Installable via `manifest.webmanifest`. Storage key remains `potluck-plate-v2`.

## Pages

https://bryanralston.github.io/potluck-plate/

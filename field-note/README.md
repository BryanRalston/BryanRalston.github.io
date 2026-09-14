# Field Note

A local-first practice and game day sheet for sports parents. Name the session, set arrive-by and the field, pack a bring list, and optionally give each kid their own check-off.

## First visit

The sheet opens on today’s date with a seeded bag: cleats, water, shin guards, snack, jersey, extra socks, ball, sunscreen. Change anything. Add or remove items. Add kid names only if you want per-bag checks or a short note.

Under a minute. Demo names load only if you tap **Load a sample Saturday**.

## Share links

**Copy snapshot** packs the current sheet into the URL hash (`#n=`). Opening that link loads the copy on another device. It is **not** live sync — later edits on one phone do not push to another unless you share a fresh link. The app says so in the header, toast, About, and footer.

Payloads are deflate-compressed when the browser supports it (`z.`), otherwise raw JSON (`j.`).

## New today

Keeps the bring list and kid names, unchecks every bag, and sets the date to today.

## Privacy

Everything stays in this browser’s `localStorage` (`field-note-v1`). No accounts, no server, no secrets in the repo. Sample names are fictional.

## Offline / PWA

Service worker cache: **`field-note-v1`**. Installable via `manifest.webmanifest`.

## Pages

https://bryanralston.github.io/field-note/

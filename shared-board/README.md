# Shared Board

A general household board for any items, notes, checkoffs, a calendar, and a local photo album.

There is **no server**. Everything stays in this browser unless you tap **Share update**, which encrypts text (titles, notes, checkoffs, recurrence, assignees, reminder times, and circle names) with your household passphrase (12+ characters) using Web Crypto (PBKDF2 + AES-GCM) and puts the ciphertext in a URL hash (`#u=…`). Anyone with the link and the passphrase can merge that update on their device.

**Share update links are text-only.** Photo bytes are never put in the link. Copy photos with **Export JSON** (full plaintext backup) or **Download photo pack** (same passphrase, AES-GCM, `.sbphotos.json`).

The board starts empty. There are no sample families.

## Honest limits

- Reminders use the Notification API only after you allow them, and only while this page (or an installed PWA window) stays open. There is no push server. A closed tab cannot wake itself.
- Private/incognito windows often block `localStorage` and IndexedDB. The red banner is the warning.
- Recurring items store one rule. The calendar expands occurrences for the day you are viewing. Done is per occurrence date. Monthly rules skip months that do not have that day-of-month (for example the 31st).
- Install as app is a shortcut to this same local page. It does not add an account or background sync.

Cache name: `shared-board-v8`.

# Clean Link

Paste a messy URL, strip tracking junk, copy a clean link. For people who hate `utm_*` / `fbclid` / `gclid` spam when sharing.

Live: [bryanralston.github.io/clean-link](https://bryanralston.github.io/clean-link/)

## The loop

1. Paste a URL — or a blob of text that contains one. The first `http(s)` link is pulled out.
2. Clean runs on paste, blur, or the **Clean** button.
3. Before / after shows which query tags were cut. Product ids and search `q` stay.
4. Copy the clean URL, copy it as markdown, or open it in a new tab.

Empty and error states stay honest: nothing pasted, not a URL, or already clean.

## Feature Map (what it does today)

In-product **What’s in this** lists current capabilities, not a roadmap:

- Detect the first http(s) URL in pasted text
- Auto-clean on paste / blur, plus a Clean button
- Before vs after with stripped params highlighted
- Copy clean URL · copy as markdown · open clean
- Toggle tracker families (persisted)
- Last 15 cleaned URLs on this device, clearable
- Offline via service worker cache **`clean-link-v1`**

**Is not:** accounts, a server, analytics that phone home, or live sync.

## Tracker families (on by default)

- `utm_*`
- Meta / Instagram (`fbclid`, `igshid`, …)
- Google ads (`gclid`, `gbraid`, `wbraid`, …)
- Analytics crumbs (`_ga`, `_gl`)
- Email / ESP (`mc_*`, HubSpot, Klaviyo, …)
- Other click IDs (`msclkid`, `twclid`, `li_fat_id`, …)
- Share leftovers (`si` on YouTube, `scm`, `spo_*`)
- `ref` / `source` when they look like tracking (social names, long tokens). Meaningful values like `ref=main` stay.

## Persistence

- `localStorage` key **`clean-link-v1`**
- Soft reload keeps toggles and history
- Loud banner if storage is blocked
- URLs never leave the browser

## Offline / PWA

Service worker cache: **`clean-link-v1`**. Installable via `manifest.webmanifest`. Relative `./` paths so GitHub Pages can serve `/clean-link/`.

## Tests

```
node clean-link/clean.test.js
```

Covers the sample `id=42` keep / tracker drop, blob extract, YouTube `si`, click IDs, tracking vs useful `ref`, family toggles, history cap, and markdown copy.

# Clean Link

Instant X utility: paste a messy URL (UTM, fbclid, igshid, tracking junk) and copy a clean shareable link. Strangers can try it in ten seconds.

Live: [bryanralston.github.io/clean-link](https://bryanralston.github.io/clean-link/)

## The loop

1. Paste or type a dirty URL.
2. **Clean** (also runs on paste).
3. See before / after and the trackers that got cut.
4. **Copy**, or **Copy and open**.

Last 10 washes stay on this device. Reload keeps them.

## Feature Map (what it does today)

Quiet in-product Feature Map (footer *What this can do*) — crew notes, not chrome:

- Paste / type → Clean → Copy
- Strip common trackers (`utm_*`, `fbclid`, `gclid`, `mc_eid`, `igshid`, `si`, `ref`, plus host extras) without breaking the real path or useful query
- Unwrap Facebook / Google / YouTube / LinkedIn redirect wrappers, then wash the inner link
- Before / after + cut chips
- Copy and open
- Last 10 cleans in this browser
- Offline via service worker cache **`clean-link-v1`**

**Is not:** accounts, a server, a short-link expander for `t.co`, or anyone else’s analytics.

## Persistence

- `localStorage` key **`clean-link-v1`**
- Soft reload keeps history
- Loud banner if storage is blocked — cleaning still works

## Offline / PWA

Service worker cache: **`clean-link-v1`**. Installable via `manifest.webmanifest`. Relative `./` paths so GitHub Pages can serve `/clean-link/`.

## Honesty

Client-side only. The URL never leaves this browser.

## Tests

```
node clean-link/clean.test.js
```

Covers dirty YouTube / Spotify / article / Amazon / X links, missing protocol, unwrap-then-strip, keep path + real query + hash, history cap of 10, reload normalize.

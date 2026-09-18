# T-Minus

A fun secret-mission retirement countdown. How many Mondays — the hero marker — until you are done working, plus Fridays, coffees, alarms, and any cadence you add. Original ops-board vibe. Not a studio franchise.

Live: [bryanralston.github.io/t-minus](https://bryanralston.github.io/t-minus/)

## The loop

1. First open seeds a sample dossier so the T-minus window already has a big Mondays number.
2. Lock birth + extraction date (or age) and a looking-forward mission line.
3. The board shows **armed markers only**. Mondays is the hero marker, not the product name. Toggle, edit, or remove every starter.
4. Add a custom cadence (name + count + period). Add an on-device goal. If the projected hit lands before extraction, use it as early extraction and every marker recalculates.
5. Copy a snapshot of the **board** (and early label). Goal balances never enter the URL.

## Feature Map (what it does today)

- Briefing: birth, done-working date or age, mission objective
- Dark-glass T-minus window with red/amber digits; **Mondays** as the hero marker
- Calendar starters: Mondays, Fridays, Weekends, Paychecks (biweekly), Summers, Holiday seasons
- Everyday starters: Coffees, Haircuts, Gym, Grocery, Laundry, Oil
- Disliked starters: Alarms, Commutes, Quick syncs, Password resets, DMV mornings, Perf-review seasons, Junk-mail weeks, Hold-music calls
- Custom cadence markers
- On-device goals with % and a projected hit date (estimate, not advice)
- Early extraction that recalculates the whole board
- Snapshot share — board / early label only, no $
- Clear device
- Offline via service worker cache **`t-minus-v1`**

**Is not:** accounts, a server, investment advice, live sync, or anyone else’s trademarks.

## Persistence

- `localStorage` key **`t-minus-v1`**
- Soft reload keeps the dossier
- Loud banner if storage is blocked

## Share

- **Copy snapshot** packs briefing + markers + early label into a compressed URL hash (`#t=`).
- Goals and dollar amounts are stripped before encode. The UI refuses to copy a link that contains `$`.

## Offline / PWA

Service worker cache: **`t-minus-v1`**. Installable via `manifest.webmanifest`. Relative `./` paths so GitHub Pages can serve `/t-minus/`.

## Tests

```
node t-minus/mission.test.js
```

Covers dates → board numbers → custom cadence → 401k goal → early shift updates Mondays → reload persists → share omits `$`.

# Pocket Ledger

A local-first envelope budget for a household month. Income in, every dollar assigned, spend logged, remaining live. Built to beat QuickBooks at the job QB is awkward at: personal envelopes, monthly assign, and privacy — not invoices or payroll.

Live: [bryanralston.github.io/pocket-ledger](https://bryanralston.github.io/pocket-ledger/)

## The loop

1. Pick a month.
2. Add income (paycheck, side gig).
3. Create envelopes and **assign every dollar**.
4. Log expenses. Remaining and progress bars update immediately.

Empty states teach that loop. Nothing leaves this browser.

## What it is / is not

**Is:** zero-based monthly envelopes, on-device, exportable.

**Is not:** bank sync, cloud accounts, double-entry, invoices, payroll, or tax forms. QuickBooks is business accounting. Pocket Ledger wins the kitchen-table month.

## Persistence

- `localStorage` key `pocket-ledger-v1`
- Export / import a JSON backup
- Optional CSV of transactions
- Loud banner if storage is blocked

## Offline / PWA

Service worker cache: **`pocket-ledger-v1`**. Installable via `manifest.webmanifest`.

## Stretch shipped

- Roll last month’s assigned amounts into the current month
- Spend-by-category report for the open month
- Recurring plan amounts on each envelope, plus **Fill plans**

# Repository Context

## Project

`test/` is a standalone take-home Next.js project for a Transactions Management Dashboard.

The hiring goal is part of the product goal: the result should be polished, small, explainable, and safe to modify during a live interview.

## Core workflow

- Show transaction history.
- Generate and download dummy PDF invoices with a visible 2-second generating state.
- Select failed transactions.
- Retry selected failed transactions concurrently.
- Show each row's own retry loading and resolved state.
- Narrate async command progress through the activity callout/popover.
- Prevent dark-theme flash on refresh by applying the saved theme before hydration.

## Important folders

```text
app/
  layout.tsx
  page.tsx

components/
  theme-sync-script.tsx
  ui/

modules/transactions-dashboard/
  api/
  commands/
  model/
  ui/
  index.ts
  index.client.ts
  index.server.ts

e2e/
test/
```

## Stable seams

- Server route: `app/page.tsx` imports `TransactionsPage` from `index.server`.
- Initial data: `api/get-transactions.ts`.
- Client command boundary: `commands/transactions-dashboard-actions.ts`.
- Pure state: `model/dashboard/dashboard-state.ts`.
- Retry policy: `model/payment/retry-payment.ts`.
- Invoice generation/download helpers: `model/invoice/invoice-download.ts`.
- Activity copy/tone builders: `model/activity/activity-log.ts`.
- Transaction contracts and fixtures: `model/transaction/`.
- Server dashboard shell: `ui/dashboard/TransactionsDashboard.tsx`.
- Client workflow island: `ui/dashboard/TransactionsDashboardClient.tsx`.
- Client workflow hook: `ui/dashboard/use-transactions-dashboard.ts`.
- Table shell: `ui/payment-history/PaymentHistoryTable.tsx`.
- Memoized table row: `ui/payment-history/PaymentHistoryRow.tsx`.
- Activity UI: `ui/activity/ActivityCallout.tsx`.

## Commands

```bash
npm run typecheck
npm run lint
npm run check:file-size
npm run test
npm run test:e2e
npm run build
npm run verify
npm audit --omit=dev
```

`npm run verify` is the standard local confidence command. `npm run test:e2e` is separate because it launches a browser. `npm run check:file-size` enforces the small-file rule used for this take-home.

## Next.js rule

This project has a local `AGENTS.md` rule: before changing Next.js App Router code, read the relevant file under `node_modules/next/dist/docs/`.

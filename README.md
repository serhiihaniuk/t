# Transactions Management Dashboard

Mock streaming-service billing dashboard for reviewing transaction history, downloading invoices, and retrying failed payments in bulk.

## AI Disclosure

I used AI as a pair programmer for scaffolding, test-shape review, and implementation acceleration. I remained the lead developer: I wrote the system design, made the architecture decisions, reviewed the generated code, and verified behavior with unit, component, E2E, typecheck, lint, and production build checks.

## Implemented Requirements

- Payment history table with transaction ID, amount, date/time, status, payment method, and invoice action.
- Seven failed mock transactions with row-level checkboxes.
- Bulk `Retry selected` flow that starts all selected retry requests concurrently.
- Independent per-row retry loading states; each row updates as its own simulated API call resolves.
- Random retry delays between 1 and 4 seconds with a 20% simulated failure rate.
- Per-transaction invoice download with a 2-second generating state, dummy PDF blob, browser download, and row-level feedback.
- Table-level retry and reset controls, plus a visible light/dark theme switcher.

## Tech Stack

- Next.js App Router + TypeScript
- Tailwind CSS v4
- shadcn/ui preset `b1Z5baiES`
- Vitest + React Testing Library
- Playwright

## Architecture

The app keeps the route surface small and puts the feature under `modules/transactions-dashboard`.

```text
app/
  page.tsx                         # Server route entry
  layout.tsx                       # Providers and metadata

modules/transactions-dashboard/
  api/get-transactions.ts          # Mock server-side data retrieval
  model/                           # Pure domain state, retry and invoice simulations
  ui/                              # Interactive dashboard client island
  index.server.ts                  # Server-safe public entry
  index.client.ts                  # Client/test public entry

components/ui/                     # shadcn/ui source components
```

The retry flow is intentionally reducer-driven: selecting rows, starting a batch, and resolving individual payment attempts are separate actions. That makes the concurrent behavior testable without relying on UI timing.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

## Verification

```bash
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
```

`npm run verify` runs typecheck, lint, unit/component tests, and production build in one command.

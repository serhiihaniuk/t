# Transactions Management Dashboard

Mock streaming-service billing dashboard for reviewing transaction history, downloading invoices, and retrying failed payments in bulk.

The assignment is intentionally small, so I treated the interesting part as product-quality execution: clear state transitions, visible per-row feedback, a polished table UI, and enough tests to make the concurrent retry behavior safe to change during an interview.

## AI Disclosure

I approached this task the same way I approach everyday engineering work. AI assisted with scaffolding, implementation speed, and review prompts, but every architectural decision, code review, refactor, and verification step was mine. This project is not blind AI generation.

1. **System design** - Designed the feature boundaries, data flow, state model, and test strategy before implementation. Documented in `SYSTEM-DESIGN.md`.
2. **Implementation** - Split the work into isolated slices: project setup, domain model, dashboard UI, invoice download, retry simulation, tests, and polish.
3. **Manual verification** - Ran the app locally, checked the table workflow in the browser, verified invoice download behavior, retry loading states, reset behavior, and light/dark theme switching.
4. **Code review and refactoring** - Reviewed the implementation file by file, removed unnecessary scaffold placeholders, replaced global toast feedback with inline table feedback, and kept the architecture small enough to explain clearly.

## Requirements Coverage

All core requirements are implemented:

- Next.js React project with TypeScript.
- Payment history page showing transaction ID, amount, date/time, status, payment method, and invoice action.
- Mock transaction data includes multiple failed payments by default.
- Per-transaction `Download invoice` action.
- Invoice download simulates a 2-second PDF generation state before triggering a browser download of a dummy PDF.
- Download completion is acknowledged inline in the table, close to the transaction that caused it.
- Failed rows have checkboxes for multi-select.
- `Retry selected` action supports bulk retry of failed payments.
- Selected retries are started concurrently.
- Each retrying row has its own independent loading state.
- Each row resolves independently after a random 1-4 second delay.
- Retry simulation uses an 80% success / 20% failure outcome.

Beyond the baseline:

- Seven failed transactions are present by default, making the bulk retry workflow easy to demonstrate.
- `Retry selected` and `Reset` controls live above the table where batch actions usually belong.
- Light/dark theme switcher is included and visible in the header.
- Inline row feedback replaces global notifications, so invoice/retry results stay tied to the relevant row.
- Reducer-driven state model keeps selection, retry progress, and transaction status explicit and testable.
- Playwright E2E tests cover the browser download and retry workflow.
- `npm audit --omit=dev` was kept clean by pinning patched transitive `postcss` through `overrides`.

Would be nice:

- Add search, status filters, date filters, and pagination for a larger transaction history.
- Move both mock boundaries behind Route Handlers if the exercise evolves into HTTP-level API simulation.
- Use MSW once HTTP boundaries exist, so UI tests can exercise request/response behavior without a real backend.
- Add optimistic analytics events for invoice downloads and retry attempts.
- Add accessible live-region announcements for row-level retry/download state changes.

## Architecture

Project follows a focused vertical-slice architecture inspired by Feature-Sliced Design, trimmed to the size of this assignment. The route layer stays thin, and the dashboard feature owns its own data contracts, mock API boundary, state reducer, UI, and tests.

`app/page.tsx` is a server route entry. It imports the server-safe dashboard page, retrieves mock transactions, and passes serializable data into the client dashboard.

`TransactionsDashboard.tsx` is the client island because it owns browser-only behavior: row selection, timers, retry promises, Blob download, object URLs, and theme-aware interactive controls.

`dashboard-state.ts` is the center of the feature. It models selection, retry progress, row status updates, reset behavior, and derived summary data with a pure reducer. Keeping this logic outside the component makes concurrent retry behavior easy to test without depending on animation or DOM timing.

TypeScript strict mode is used as a shift-left strategy. Domain constants are defined once and exported as const-derived types, reducer actions are discriminated unions, and invalid UI states are avoided through the state model:

- Successful rows are not selectable.
- Failed rows are selectable only while idle.
- Retrying rows cannot be toggled.
- A failed retry returns the row to `Failed`.
- A successful retry updates only that row to `Success`.

The mock API split is deliberate:

- `api/get-transactions.ts` represents the server-side retrieval boundary used by the initial page render.
- `model/retry-payment.ts` represents a client-side payment retry simulator because the assignment is about concurrent per-row UI behavior, not HTTP plumbing.

If the next requirement asks for real request/response semantics, `retry-payment.ts` can move behind a Next.js Route Handler without changing the reducer contract.

Testing is unit-heavy by design. The riskiest behavior is concurrent state transition, so reducer, retry timing, invoice generation, component behavior, and browser download paths all have focused coverage.

## Data Flow

Initial render:

```text
Browser requests /
  |
  +- app/page.tsx renders TransactionsPage
  |
  +- getTransactions()
  |    |
  |    +- returns realistic mock payment history
  |
  +- TransactionsDashboard receives initial transactions
  |
  +- reducer initializes:
       transactions, selectedIds = [], retryingIds = []
  |
  +- table renders history, failed-row checkboxes, invoice buttons, summary cards
```

Batch retry:

```text
User selects failed rows
  |
  +- reducer toggles selectedIds
  |
  +- Retry selected clicked
  |
  +- reducer marks selected IDs as retrying and clears selection
  |
  +- retryPayment(id) starts for every selected row immediately
  |    |
  |    +- random delay between 1 and 4 seconds
  |    +- random outcome: 80% Success, 20% Failed
  |
  +- each promise resolves independently
       |
       +- reducer updates only that transaction
       +- row leaves loading state
       +- inline result becomes "Retry recovered" or "Retry failed"
```

Invoice download:

```text
Download invoice clicked
  |
  +- row enters "Generating" state
  |
  +- wait 2 seconds
  |
  +- create dummy application/pdf Blob
  |
  +- create object URL and trigger hidden anchor download
  |
  +- revoke object URL
  |
  +- row shows "Invoice INV-... downloaded"
```

## Project Structure

```text
app/
├── globals.css                       # Tailwind v4 + shadcn preset tokens
├── layout.tsx                        # Metadata and theme provider
└── page.tsx                          # Server route entry

components/
├── theme-provider.tsx                # next-themes provider
└── ui/                               # shadcn/ui source components
    ├── badge.tsx
    ├── button.tsx
    ├── card.tsx
    ├── checkbox.tsx
    ├── spinner.tsx
    └── table.tsx

modules/
└── transactions-dashboard/
    ├── api/
    │   └── get-transactions.ts       # Mock server-side data retrieval
    ├── model/
    │   ├── dashboard-state.ts        # Pure reducer, selectors, reset/summary logic
    │   ├── dashboard-state.test.ts
    │   ├── formatters.ts             # Currency and stable date/time formatting
    │   ├── invoice-download.ts       # 2s invoice generation + PDF download helpers
    │   ├── invoice-download.test.ts
    │   ├── mock-transactions.ts      # Realistic mock billing history
    │   ├── retry-payment.ts          # Random delay + 20% failure simulation
    │   ├── retry-payment.test.ts
    │   └── types.ts                  # Domain constants and TypeScript contracts
    ├── ui/
    │   ├── TransactionsDashboard.tsx # Client island and interactive table
    │   ├── TransactionsDashboard.test.tsx
    │   └── TransactionsPage.tsx      # Server-compatible feature composition
    ├── index.ts                      # Shared public exports
    ├── index.client.ts               # Client/test public exports
    └── index.server.ts               # Server-safe public exports

e2e/
└── transactions.spec.ts              # Playwright browser coverage

test/
└── setup.ts                          # Vitest DOM setup

SYSTEM-DESIGN.md                      # Detailed design and tradeoffs
```

## Getting Started

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

## Tests

```bash
npm run typecheck   # TypeScript strict-mode check
npm run lint        # ESLint
npm run test        # Vitest unit/component tests
npm run test:e2e    # Playwright E2E tests
npm run build       # Production build
npm run verify      # typecheck + lint + test + build
npm audit --omit=dev
```

`npm run verify` is the main pre-submission command. `npm run test:e2e` is kept separate because it launches a browser.

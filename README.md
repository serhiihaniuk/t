# Transactions Management Dashboard

Mock streaming-service billing dashboard for reviewing transaction history, downloading invoices, and retrying failed payments in bulk.

The assignment is intentionally small, so I treated the interesting part as product-quality execution: clear state transitions, visible per-row feedback, a polished table UI, and enough tests to make the concurrent retry behavior safe to change during an interview.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

## How I Work With AI

I use AI as a structured engineering partner, not as an autopilot. My goal is to make the work more deliberate: design first, implementation second, verification always.

1. **Start with system design through Ralplan** - I begin with the requirements and run a Ralplan workflow, where separate AI roles such as an analytic planner, critic, and architect challenge the direction until there is a practical consensus. This helps reduce the confirmation bias that can happen when one assistant in one chat starts agreeing too easily with the original idea.
2. **Create the design artifact first** - The first durable output is a system design document. For this project, that is `SYSTEM-DESIGN.md`; it describes the feature boundaries, state model, data flow, tradeoffs, and test strategy before implementation starts.
3. **Implement from the design** - After the design is clear enough, I build the first version in small slices: transaction model, mock data retrieval, retry simulation, invoice generation, dashboard UI, activity feedback, tests, and polish.
4. **Add guardrails after the first version** - Once the app exists, I tighten it with tests, linting, project-specific scripts, and architecture checks. The file-size script is especially important because it stops AI-assisted work from drifting into long, hard-to-review files.
5. **Iterate against the design** - I keep comparing the implementation back to the system design and adjust both until the code, docs, tests, and product behavior match the intended shape.

## Requirements Coverage

All core requirements are implemented:

- Next.js React project with TypeScript.
- Payment history page showing transaction ID, amount, date/time, status, payment method, and invoice action.
- Mock data includes past transactions with a `Failed` status.
- Per-transaction `Download invoice` action.
- Invoice download simulates a 2-second PDF generation state before triggering a browser download of a dummy PDF.
- Download completion is acknowledged inline in the table, close to the transaction that caused it.
- Failed rows have checkboxes for multi-select.
- `Retry selected` action supports bulk retry of failed payments.
- Selected retries are started concurrently.
- Each retrying row has its own independent loading state.
- Each row resolves independently after a random 1-4 second delay.
- Retry simulation uses an 80% success / 20% failure outcome.
- A compact activity log narrates retry batches, individual retry outcomes, and invoice generation/download results.

## Architecture

The app uses a small vertical-slice structure around `modules/transactions-dashboard`. The route layer stays thin: `app/page.tsx` renders the server-safe page, loads mock transactions, and passes serializable data into a narrow client workflow island.

Inside the feature:

- `model/` contains the pure dashboard state, transaction contracts, retry policy, invoice helpers, and activity messages.
- `commands/transactions-dashboard-actions.ts` is the injected command boundary, so the UI does not care whether retry and invoice work is mock code, a Route Handler, or a real backend.
- `ui/` is grouped by responsibility: server dashboard shell, client workflow island, payment history table, activity callout, summary cards, theme toggle, and page wrapper.
- `api/get-transactions.ts` represents initial server-side data retrieval.

The riskiest behavior is concurrent retry state, so `dashboard-state.ts` keeps selection, retrying rows, reset, and summary logic in a pure reducer. Browser-only workflow state lives in `use-transactions-dashboard.ts`; rows get stable callbacks and set-backed lookup state so independent row updates stay cheap.

Tests focus on reducer behavior, retry/invoice timing, component interactions, browser downloads, and theme flash prevention. The longer tradeoffs and data-flow notes are in `SYSTEM-DESIGN.md`.

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
  +- server dashboard shell receives initial transactions
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
  +- activity log records the retry batch start
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
       +- activity log records that row's outcome
```

Invoice download:

```text
Download invoice clicked
  |
  +- row enters "Generating" state
  |
  +- activity log records invoice generation
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
  +- activity log records the download result
```

## Project Structure

```text
app/
|-- globals.css                       # Tailwind v4 + shadcn preset tokens
|-- layout.tsx                        # Metadata and theme bootstrap
|-- page.tsx                          # Server route entry

components/
|-- theme-sync-script.tsx             # Pre-hydration theme sync script
`-- ui/                               # shadcn/ui source components

modules/
`-- transactions-dashboard/
    |-- api/
    |   `-- get-transactions.ts       # Mock server-side data retrieval
    |-- commands/
    |   `-- transactions-dashboard-actions.ts
    |-- model/
    |   |-- activity/
    |   |   `-- activity-log.ts       # Async activity message builders
    |   |-- dashboard/
    |   |   |-- dashboard-state.ts     # Pure reducer, selectors, summary logic
    |   |   `-- dashboard-state.test.ts
    |   |-- invoice/
    |   |   |-- invoice-download.ts    # 2s PDF generation + browser download
    |   |   `-- invoice-download.test.ts
    |   |-- payment/
    |   |   |-- retry-payment.ts       # Random delay + 20% failure simulation
    |   |   `-- retry-payment.test.ts
    |   `-- transaction/
    |       |-- formatters.ts          # Currency and stable UTC date formatting
    |       |-- mock-transactions.ts   # Realistic mock billing history
    |       `-- transaction.ts        # Domain constants and contracts
    |-- ui/
    |   |-- activity/
    |   |   `-- ActivityCallout.tsx
    |   |-- dashboard/
    |   |   |-- TransactionsDashboard.tsx       # Server shell
    |   |   |-- TransactionsDashboardClient.tsx # Client workflow island
    |   |   |-- TransactionsDashboard.test.tsx
    |   |   |-- dashboard-feedback.ts
    |   |   `-- use-transactions-dashboard.ts
    |   |-- page/
    |   |   `-- TransactionsPage.tsx
    |   |-- payment-history/
    |   |   |-- PaymentHistoryRow.tsx
    |   |   `-- PaymentHistoryTable.tsx
    |   |-- summary/
    |   |   `-- SummaryCard.tsx
    |   `-- theme/
    |       `-- ThemeToggle.tsx
    |-- index.ts
    |-- index.client.ts
    `-- index.server.ts

scripts/
`-- check-file-size-limit.mjs        # Small-file architecture guard

.agents/skills/testing/               # Local testing guidance for agents

e2e/
`-- transactions.spec.ts              # Playwright browser coverage

test/
`-- setup.ts                          # Vitest DOM setup

SYSTEM-DESIGN.md                      # Detailed design and tradeoffs
```

## Tests

```bash
npm run typecheck   # TypeScript strict-mode check
npm run lint        # ESLint
npm run check:file-size # Guard against oversized files
npm run test        # Vitest unit/component tests
npm run test:e2e    # Playwright E2E tests
npm run build       # Production build
npm run verify      # file-size + typecheck + lint + test + build
npm audit --omit=dev
```

`npm run verify` is the main pre-submission command. `npm run test:e2e` is kept separate because it launches a browser. The file-size check follows the same rule as the chat codebase: split large source files instead of hiding complex behavior in one oversized module.

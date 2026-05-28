# Transactions Management Dashboard - System Design

## 1. Overview

This project is a take-home Transactions Management Dashboard for a streaming-service subscriber. The user can review past payments, download mock invoices, and retry failed payments in bulk.

The hiring goal matters as much as the feature list: the implementation should look like a polished product slice, while staying small enough to explain, test, and modify during a technical interview.

## 2. Requirements

| ID  | Requirement                     | Implementation                                                            |
| --- | ------------------------------- | ------------------------------------------------------------------------- |
| C1  | New React project using Next.js | Next.js App Router, React 19, TypeScript                                  |
| C2  | TypeScript                      | Strict TypeScript enabled, tests included                                 |
| C3  | Payment history page            | Table shows ID, amount, date/time, status, payment method, invoice action |
| C4  | Failed mock transactions        | Mock dataset includes 3 failed rows                                       |
| C5  | Download invoice per row        | Every transaction has a download button                                   |
| C6  | 2-second PDF generation state   | Per-row `Generating` state before download                                |
| C7  | Browser download                | Dummy PDF Blob downloaded via object URL                                  |
| C8  | Download notification           | Sonner success/error toast                                                |
| C9  | Failed row selection            | Only failed, idle rows render selectable checkboxes                       |
| C10 | Batch retry                     | `Retry selected` starts all selected retries immediately                  |
| C11 | Concurrent retry simulation     | Each retry call is fired independently                                    |
| C12 | Independent row loading         | Retrying rows show their own spinner/status                               |
| C13 | Independent row completion      | Each row updates as its own promise resolves                              |
| C14 | Retry timing/outcome            | Random 1-4s delay, 20% simulated failure rate                             |

## 3. Non-goals

- No real backend or payment provider.
- No authentication.
- No persistent database.
- No real invoice service.
- No pagination/filtering in the baseline.

These are deliberate exclusions. They keep the assignment focused on the requested subscriber workflow and make the result easier to present.

## 4. Technology Choices

| Concern              | Choice                                         | Rationale                                                              |
| -------------------- | ---------------------------------------------- | ---------------------------------------------------------------------- |
| Framework            | Next.js App Router                             | Modern React Server/Client Component model; good take-home signal      |
| Language             | TypeScript                                     | Required by task; reducer/actions are strongly typed                   |
| UI                   | Tailwind CSS v4 + shadcn/ui preset `b1Z5baiES` | Polished component primitives without custom design-system overhead    |
| State                | `useReducer`                                   | Retry workflow has real transitions, but no global app state is needed |
| Notifications        | Sonner via shadcn/ui                           | Lightweight toast feedback for invoice/retry outcomes                  |
| Unit/component tests | Vitest + React Testing Library                 | Fast deterministic coverage for timers, reducer, and interactions      |
| E2E                  | Playwright                                     | Verifies the actual browser download and retry flow                    |

## 5. Architecture

The app uses a thin route layer and a focused vertical module.

```text
app/
  layout.tsx                         # Metadata, theme provider, toast host
  page.tsx                           # Server route entry, renders TransactionsPage
  globals.css                        # Tailwind v4 + shadcn preset tokens

modules/transactions-dashboard/
  api/
    get-transactions.ts              # Mock server-side retrieval boundary
  model/
    dashboard-state.ts               # Reducer, selectors, summary derivation
    formatters.ts                    # Currency and stable UTC date formatting
    invoice-download.ts              # 2s invoice generation + PDF/blob helpers
    mock-transactions.ts             # Realistic mock dataset
    retry-payment.ts                 # Random delay + 20% failure simulation
    types.ts                         # Domain constants and contracts
  ui/
    TransactionsPage.tsx             # Server-compatible composition
    TransactionsDashboard.tsx        # Client island for interactive behavior
  index.ts                           # Shared public types/constants
  index.server.ts                    # Server-safe public entry
  index.client.ts                    # Client/test public entry

components/ui/                       # shadcn/ui source components
e2e/                                 # Playwright coverage
test/                                # Vitest setup
```

Boundary rules:

- `app/page.tsx` imports from `@/modules/transactions-dashboard/index.server`.
- `TransactionsPage` loads mock transactions on the server and passes serializable data to the client dashboard.
- Browser APIs (`window`, Blob download, timers for invoice generation) stay below the `"use client"` dashboard boundary.
- The reducer is pure and independently tested.
- Randomness and timer-sensitive behavior live behind small functions so tests can control outcomes.

## 6. State Model

Domain status and UI progress are separate. A transaction has a persisted-like status (`Success` or `Failed`), while retry progress is tracked in `retryingIds`.

```ts
export interface TransactionsDashboardState {
  readonly transactions: readonly Transaction[]
  readonly selectedIds: readonly string[]
  readonly retryingIds: readonly string[]
}
```

This prevents ambiguous states:

- Successful rows are never selectable.
- Failed rows are selectable only while idle.
- Retrying rows show a spinner and cannot be toggled.
- A failed retry returns the row to `Failed`, so the user can select it again.
- A successful retry updates only that row to `Success`.

## 7. Retry Flow

```text
User selects failed rows
  |
  v
Retry selected clicked
  |
  +- reducer marks selected IDs as retrying and clears selection
  |
  +- retryPayment(id) fired for every selected row immediately
  |    |
  |    +- random delay between 1 and 4 seconds
  |    +- random outcome: 80% Success, 20% Failed
  |
  +- each promise dispatches retry/resolved as it settles
       |
       +- only that row leaves loading state
       +- status becomes Success or Failed
```

The important point is that UI updates are not gated behind `Promise.all`. `Promise.all` is used only for the final summary toast after individual row updates have already happened.

## 8. Invoice Flow

```text
Download clicked on row
  |
  +- row enters Generating state
  |
  +- wait 2 seconds
  |
  +- create a minimal dummy PDF Blob
  |
  +- create object URL + hidden anchor click
  |
  +- show toast and clear Generating state
```

The PDF is intentionally dummy content but still uses `application/pdf` and includes invoice/transaction details.

## 9. Testing Strategy

| Layer              | Coverage                                                                                |
| ------------------ | --------------------------------------------------------------------------------------- |
| Reducer tests      | Failed-only selection, retry start, independent retry resolution, summary totals        |
| Retry policy tests | 1-4s delay window, 20% failure threshold, fake-timer resolution                         |
| Invoice tests      | File naming, PDF blob contents, 2-second generation delay                               |
| Component tests    | Concurrent selected retries, out-of-order row updates, invoice generating/download call |
| Playwright E2E     | Browser invoice download and real retry flow smoke test                                 |

Commands:

```bash
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
npm audit --omit=dev
```

## 10. Interview-Ready Tradeoffs

Rejected for the baseline:

- Route Handlers for fake APIs. They add HTTP ceremony without improving the mock-only assignment.
- Zustand/Redux/TanStack Query. The app has one screen and reducer-local state is easier to explain.
- Real PDF generation libraries. The task asks for a mock download; a minimal Blob keeps the dependency graph small.
- Pagination/filtering. Useful future work, but the core risk is concurrent retry behavior.

Likely follow-up changes are straightforward:

- Change `RETRY_FAILURE_RATE` in `retry-payment.ts`.
- Change retry timing constants in `retry-payment.ts`.
- Add new transaction statuses in `types.ts` and the reducer/status badge switch.
- Move mock boundaries to Route Handlers if a future requirement wants HTTP-level simulation.

# Transactions Management Dashboard - System Design

## Short Version

This project is a focused billing dashboard for a streaming-service customer.
The user can review past payments, download mock invoices, and retry failed
payments in bulk.

The main engineering challenge is not the table itself. The hard part is making
several slow async actions feel clear and trustworthy:

- invoice generation takes 2 seconds per row
- payment retries run at the same time
- each retry can finish in a different order
- each row must show its own loading and final result
- the user should always know what just happened

The design keeps that behavior easy to reason about. Server-rendered parts stay
on the server, browser-only work is isolated in one client island, and the retry
state is modeled with a small pure reducer that is covered by tests.

## Product Goal

The dashboard should feel like a real subscription billing page, not a demo
screen. It should help the customer answer three questions quickly:

1. What have I been charged for?
2. Which payments failed?
3. Can I recover failed payments and download invoices without guessing what the
   app is doing?

That is why the UI favors a clean table, row-level feedback, and a compact
activity popover over global toast spam.

## What Reviewers Should Notice

- **Server-first rendering:** the route, page wrapper, and static dashboard
  shell stay as Server Components. Only the interactive billing workflow is a
  Client Component.
- **Clear async state:** retrying, selected, and completed rows are separate
  states. There is no overloaded `status` field trying to mean everything.
- **Independent row updates:** retries are not blocked behind `Promise.all`.
  Every row resolves as soon as its own simulated API call finishes.
- **Replaceable commands:** the UI calls injected dashboard actions. The mock
  code can later be replaced with Route Handlers or a real payment service
  without rewriting the table.
- **Tests focus on risk:** the test suite spends most of its effort on
  concurrent retries, invoice generation, browser downloads, theme flash
  prevention, and popover behavior.
- **Small files by design:** the code is split at real boundaries and protected
  by a file-size check, so the project stays reviewable during an interview.

## Requirements Covered

| Requirement | How it is handled |
| --- | --- |
| Next.js + TypeScript | App Router, React 19, strict TypeScript |
| Payment history | Table shows transaction ID, amount, date/time, status, method, invoice action |
| Failed transactions | Mock data includes failed rows eligible for retry |
| Invoice download | Every row can generate and download a dummy PDF |
| 2-second invoice state | The clicked row shows `Generating` before download |
| Download feedback | The row shows a downloaded or failed message |
| Bulk retry | Failed rows can be selected and retried together |
| Concurrent retry | Each selected row starts its retry immediately |
| Independent loading | Each retrying row shows its own spinner |
| Independent result | Each row updates as its own retry finishes |
| Random retry outcome | Mock retry uses 1-4 second delay and 20% failure rate |
| Async activity | Toolbar activity records retry and invoice lifecycle events |
| Theme persistence | Dark/light choice is applied before hydration |

## Folder Shape

The feature lives in one module because this is one product slice. Inside that
module, files are grouped by responsibility:

```text
app/
  layout.tsx                         # metadata and theme bootstrap
  page.tsx                           # server route entry
  globals.css                        # Tailwind and shadcn tokens

components/
  theme-sync-script.tsx              # applies saved theme before hydration
  ui/                                # shadcn/ui primitives

modules/transactions-dashboard/
  api/
    get-transactions.ts              # server-side mock data retrieval
  commands/
    transactions-dashboard-actions.ts # retry/invoice actions used by the UI
  model/
    activity/
      activity-log.ts                # activity messages
    dashboard/
      dashboard-state.ts             # reducer, selectors, summary logic
    invoice/
      invoice-download.ts            # invoice PDF and browser download helpers
    payment/
      retry-payment.ts               # retry delay and failure simulation
    transaction/
      transaction.ts                 # transaction constants and types
      mock-transactions.ts           # mock billing history
      formatters.ts                  # money and date formatting
  ui/
    page/
      TransactionsPage.tsx           # server feature entry
    dashboard/
      TransactionsDashboard.tsx      # server shell
      TransactionsDashboardClient.tsx # client workflow island
      use-transactions-dashboard.ts  # browser workflow state
      dashboard-feedback.ts          # row feedback constants
    payment-history/
      PaymentHistoryTable.tsx        # table shell
      PaymentHistoryRow.tsx          # memoized row
    activity/
      ActivityCallout.tsx            # latest event + popover history
    summary/
      SummaryCard.tsx                # metric card
    theme/
      ThemeToggle.tsx                # small client theme control
```

## Render Boundary

The app starts on the server and only moves to the client where browser behavior
is required.

```text
Browser requests /
  |
  +- app/page.tsx
       |
       +- TransactionsPage
            |
            +- getTransactions() on the server
            |
            +- TransactionsDashboard server shell
                 |
                 +- static heading, copy, layout
                 |
                 +- TransactionsDashboardClient
                      |
                      +- row selection
                      +- retry actions
                      +- invoice generation/download
                      +- activity popover state
```

This keeps the page simple and avoids turning the whole screen into a Client
Component just because a few controls need browser APIs.

## Main Design Choices

### 1. The dashboard uses injected actions

The client dashboard receives a `TransactionsDashboardActions` object:

```ts
export interface TransactionsDashboardActions {
  readonly retryPayment: RetryPaymentAction
  readonly generateInvoice: GenerateInvoiceAction
  readonly downloadInvoice: DownloadInvoiceAction
  readonly buildInvoiceFileName: (transaction: Transaction) => string
}
```

The default implementation is mock code, but the UI does not know that. This is
useful during an interview because a follow-up change can replace the actions
with real HTTP calls while keeping the reducer, table, and feedback behavior.

### 2. Domain status is separate from UI progress

A transaction has a business status: `Success` or `Failed`.

The dashboard also tracks UI progress:

```ts
export interface TransactionsDashboardState {
  readonly transactions: readonly Transaction[]
  readonly selectedIds: readonly string[]
  readonly retryingIds: readonly string[]
}
```

This keeps the state honest:

- a successful transaction is never selectable
- a failed transaction is selectable only when it is not retrying
- a retrying transaction cannot be toggled
- a failed retry returns the row to `Failed`
- a successful retry updates only that row to `Success`

### 3. Concurrent retries resolve row by row

When the user clicks `Retry selected`, every selected retry starts immediately.
The app does not wait for all retries to finish before updating the UI.

```text
User selects failed rows
  |
  +- Retry selected
       |
       +- reducer moves selected IDs into retryingIds
       +- activity says "Retry started for N payments"
       |
       +- actions.retryPayment(id) starts for each row
            |
            +- row A may finish first
            +- row B may still be loading
            +- row C may fail and become selectable again
```

This matches the requirement and gives the user faster feedback.

### 4. Invoice generation is visible where it happens

Invoice download is row-level work, so the feedback stays in the row:

```text
Download invoice
  |
  +- clicked row shows "Generating"
  +- activity logs "Generating invoice INV-..."
  +- mock PDF is created after 2 seconds
  +- browser download starts
  +- row shows "Invoice INV-... downloaded"
```

The activity log also records the event, but the table remains the source of
truth for the specific row.

### 5. Theme is applied before React hydrates

The server reads the theme cookie and applies the first `<html>` class. A small
script in the document head then syncs localStorage and cookie before React
hydrates.

This avoids a dark-theme refresh briefly showing a light page. The theme toggle
is click-only; it has no hidden keyboard shortcut or page-wide listener.

## Performance Notes

This project is small, but the async table can still create unnecessary work if
every row re-renders for every event. The current structure keeps that under
control:

- `TransactionsDashboard.tsx` is a Server Component shell.
- `TransactionsDashboardClient.tsx` is the only large interactive boundary.
- `PaymentHistoryRow` is memoized so stable rows can skip re-rendering.
- selected, retrying, and invoice-generating IDs are converted to `Set`s for
  cheap lookup in the table.
- event handlers are stable where they are passed into memoized children.
- summary values are derived with `useMemo`.
- server data retrieval has no artificial delay.

The goal is not premature optimization. The goal is to keep the client boundary
small and make row updates predictable.

## Testing Strategy

The tests are aimed at the behavior most likely to break during a live coding
change.

| Layer | What it proves |
| --- | --- |
| Reducer tests | selection rules, retry start, retry resolution, reset, summary totals |
| Retry tests | random delay range, failure threshold, fake-timer behavior |
| Invoice tests | file names, PDF Blob content, 2-second generation delay |
| Component tests | injected actions, concurrent retries, row feedback, invoice state |
| Playwright tests | real browser download, retry flow, theme flash prevention, popover behavior |
| Static check | files stay small enough to review |

Main commands:

```bash
npm run check:file-size
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
npm run verify
```

`npm run verify` is the main confidence check. `npm run test:e2e` is separate
because it opens a browser.

## Tradeoffs

### Why no real backend?

The assignment asks for simulated data and simulated APIs. Adding a fake backend
route for every action would add ceremony without making the retry behavior more
correct. The injected actions give the same replacement path with less code.

### Why no global state library?

The app has one screen and one workflow. `useReducer` keeps the state local,
typed, and easy to test. A global store would be more code to explain without a
real benefit.

### Why no PDF library?

The requirement is a dummy invoice download, not a real invoice renderer. A
small PDF Blob proves the browser behavior without adding another dependency.

### Why no pagination or filtering?

Those are useful future features, but they are not the hard part of the task.
The hard part is concurrent retry state and trustworthy async feedback.

## Interview Follow-up Paths

This design leaves clear places to make common follow-up changes:

- Change retry timing in `model/payment/retry-payment.ts`.
- Change the retry failure rate in `model/payment/retry-payment.ts`.
- Add a new transaction status in `model/transaction/transaction.ts`.
- Add a filter bar above `PaymentHistoryTable`.
- Replace mock actions with calls to Next.js Route Handlers.
- Replace mock transactions with a server-side data source.
- Add pagination without touching retry/invoice command logic.
- Add more activity events in `model/activity/activity-log.ts`.

Each change has a natural home, which is the main reason the project is split
this way.

## Final Readiness Checklist

Before submission, the project should pass:

- app loads without console errors
- invoice download starts after the 2-second generating state
- selected failed payments retry concurrently
- each row resolves independently
- dark mode does not flash light on refresh
- `npm run verify`
- `npm run test:e2e`

The current design is intentionally modest: it solves the assignment cleanly,
keeps the code small, and shows how the mock implementation could grow into a
real billing feature.

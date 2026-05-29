---
name: testing
description: Use when writing, reviewing, or refactoring tests for the Transactions Management Dashboard take-home project. Covers Vitest model and component tests, React Testing Library interactions, Playwright E2E, Next.js App Router theme SSR checks, injected dashboard actions, invoice download simulation, concurrent retry behavior, activity popover behavior, deterministic timers, and interview-ready test strategy.
---

# Testing Skill

## Purpose

Use this skill to test the take-home `test/` project: a Next.js Transactions Management Dashboard for reviewing payment history, downloading invoices, and retrying failed payments in bulk.

The project is small on purpose. Tests should make it look professional: precise, behavior-focused, deterministic, and easy to explain during an interview.

## Always do this

1. Identify the user-visible behavior or architecture boundary being protected.
2. Choose the smallest honest test level:
   - model/unit
   - component
   - Playwright E2E
   - static architecture check
3. Use existing seams before inventing new ones:
   - pure model functions in `modules/transactions-dashboard/model`
   - injected `TransactionsDashboardActions`
   - `createMockTransactionsDashboardActions`
   - React Testing Library with `userEvent`
   - Playwright browser flows for downloads, SSR theme behavior, and popovers
4. Assert observable behavior, not component internals.
5. Keep async tests deterministic: use deferred promises, fake timers, mocked randomness, or Playwright events.
6. Run the narrowest useful check first, then `npm run verify`; run `npm run test:e2e` for browser behavior.
7. Use `npm run check:file-size` when refactoring files so the take-home stays small and reviewable.

## Hard constraints

- Read relevant Next.js docs from `node_modules/next/dist/docs/` before changing Next App Router code.
- Do not add new test libraries unless the user explicitly asks.
- Do not use real network calls.
- Do not test implementation details such as hook call order, reducer internals from component tests, or Radix internals.
- Do not use `page.waitForTimeout()` as a synchronization strategy.
- Do not snapshot the whole dashboard as a substitute for behavior assertions.
- Do not hide async behavior behind `Promise.all` in tests when the product requirement is independent row resolution.
- Do not call the injected command boundary a "port" in this project. Use `actions`, `commands`, or `command boundary`.
- Do not add file-size exceptions for ordinary source files. Split the file at a useful boundary.

## Test level decision

Use model/unit tests for pure behavior:

- reducer transitions in `dashboard-state.ts`
- retry delay and success/failure policy in `retry-payment.ts`
- invoice Blob contents, file naming, and generation delay in `invoice-download.ts`
- activity message builders in `activity-log.ts` if copy or tone mapping becomes risky

Use component tests for browser-like UI behavior without a real browser:

- failed-row selection
- retry button enable/disable behavior
- concurrent retry state with per-row spinners
- out-of-order retry resolution
- invoice generation state and inline feedback
- reset behavior
- action injection through `TransactionsDashboardActions`

Use Playwright E2E for behavior only a real browser proves:

- browser download event and suggested filename
- saved dark theme is present in raw server HTML before hydration
- console/page error guard
- Radix Popover outside-click and Escape behavior
- broad smoke flow across table, retry, reset, and theme toggle

Use static architecture checks sparingly for rules that are easy to regress:

- `layout.tsx` should render `ThemeSyncScript`, not contain the raw sync script.
- feature UI should receive `actions`, not import mock retry/download implementations directly.
- dashboard public imports should go through `index.server`, `index.client`, or feature-local paths as appropriate.

## Project-specific patterns

Component tests should render the client workflow island directly. The server
dashboard shell is intentionally thin and does not accept injected actions:

```tsx
function renderDashboard(ui: React.ReactElement) {
  return render(ui)
}
```

Use deferred promises to prove independent async row updates:

```tsx
const retryById = new Map<string, ReturnType<typeof deferred<RetryPaymentResult>>>()
const retryPayment = vi.fn((transactionId: string) => {
  const retry = deferred<RetryPaymentResult>()
  retryById.set(transactionId, retry)
  return retry.promise
})
```

Inject actions instead of importing mock command implementations into tests:

```tsx
<TransactionsDashboardClient
  initialTransactions={listMockTransactions()}
  actions={createMockTransactionsDashboardActions({ retryPayment })}
/>
```

For Playwright downloads, wait for the browser event:

```ts
const [download] = await Promise.all([
  page.waitForEvent("download"),
  row.getByRole("button", { name: /download invoice/i }).click(),
])
```

## Output contract

When generating or reviewing tests, use this shape unless the user asks for something else:

```text
Behavior to protect:
- ...

Recommended test level:
- model/unit | component | Playwright E2E | static architecture check

Seam/double to use:
- ...

Tests:
<code or file edits>

Why this is resilient:
- ...

Failure meaning:
- What user-visible behavior or boundary would be broken.

Repo checks to run:
- npm run test -- <target>
- npm run check:file-size
- npm run verify
- npm run test:e2e, when browser behavior is involved
```

Keep explanations short by default.

## Failure behavior

If behavior is unclear, write a small behavior matrix before editing tests.

If the test would require a missing seam, suggest the smallest production-code refactor. In this project that usually means injecting an action or moving pure logic into `model/`.

If a test becomes flaky, first remove sleeps and hidden real time. Use fake timers, controlled promises, Playwright events, or accessible state.

If the user asks for broad "coverage", prioritize the business risks: concurrent retries, invoice generation/download, theme flash prevention, and accessible popover behavior.

## References

Load these only when needed:

- `references/repo-context.md` for project architecture, commands, and acceptance criteria.
- `references/test-matrix.md` for behavior-to-test-level mapping.
- `references/testing-principles.md` for detailed rules and smells.
- `references/examples.md` for concrete test examples in this app.
- `references/quality-checklist.md` before claiming test coverage is complete.
- `references/validation-prompts.md` for prompts that check whether this skill is useful.

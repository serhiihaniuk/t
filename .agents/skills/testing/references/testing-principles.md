# Testing Principles

## Favor behavior over implementation

Good tests should fail when user-visible behavior or an architecture boundary breaks. They should not fail because a component was split, a helper was renamed, or a hook moved.

Prefer:

- accessible queries (`getByRole`, `getByLabelText`, visible text)
- injected actions
- pure model tests for reducers and policies
- Playwright events for browser-only behavior

Avoid:

- testing private state
- asserting hook call order
- relying on Tailwind classes as behavior
- full DOM snapshots
- arbitrary sleeps

## Async strategy

Use controlled async behavior.

- For component retries, use deferred promises keyed by transaction id.
- For timer policy, use Vitest fake timers.
- For invoice component tests, inject a deferred `generateInvoice`.
- For browser downloads, use `page.waitForEvent("download")`.
- For popovers, assert visible content after click and hidden content after outside click or Escape.

Do not use `page.waitForTimeout()` unless debugging locally and remove it before committing.

## User-event strategy

Use `userEvent.setup()` for component interactions. Do not fire low-level DOM events unless the behavior cannot be expressed as a user action.

Wrap promise resolution in `act` when resolving deferred promises used by React state updates.

## Theme flash tests

The theme flash prevention has two layers:

1. Server reads the theme cookie and renders `<html class="dark">` plus `color-scheme: dark`.
2. `ThemeSyncScript` runs before hydration and reconciles localStorage/cookie/system theme.

Use Playwright `request.get("/")` with a cookie header to inspect raw HTML. This catches regressions that component tests cannot.

## Command actions

`TransactionsDashboardActions` is the dashboard command boundary:

- `retryPayment`
- `generateInvoice`
- `downloadInvoice`
- `buildInvoiceFileName`

Tests should override only the action needed for the scenario and keep the default mock actions for the rest.

## Interview-readiness

A test in this project should be explainable in one sentence:

- "This proves retries are concurrent and rows update independently."
- "This proves the invoice button enters a generating state before download."
- "This proves dark mode is present before React hydrates."
- "This proves the activity popover behaves like a real popover."

If the explanation is about implementation mechanics, rewrite the test around behavior.

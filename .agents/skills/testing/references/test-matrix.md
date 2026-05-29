# Test Matrix

## Model/unit tests

Use for pure logic and deterministic policy.

| Area | File | Protect |
| --- | --- | --- |
| Dashboard reducer | `model/dashboard/dashboard-state.test.ts` | selection, retry start, independent retry resolution, reset, summary |
| Retry policy | `model/payment/retry-payment.test.ts` | 1-4s delay, 20% failure threshold, timer resolution |
| Invoice helpers | `model/invoice/invoice-download.test.ts` | dummy PDF contents, file name, 2-second generation |
| Activity copy | `model/activity/activity-log.ts` | message titles/descriptions and tone mapping, if changed |

## Component tests

Use for user-visible dashboard behavior with controlled actions.

| Behavior | Preferred seam | Notes |
| --- | --- | --- |
| Select failed rows | real component + mock transactions | successful rows should not be selectable |
| Retry selected | injected `retryPayment` action | use deferred promises, not real timers |
| Out-of-order retry resolution | deferred promises by transaction id | assert only the resolved row updates |
| Invoice generation | injected `generateInvoice` and `downloadInvoice` | assert disabled state, row feedback, activity copy |
| Reset | real reducer through UI | assert row status, feedback, selection, activity reset |
| Activity popover basics | component or Playwright | component can assert button/content; Playwright proves outside click |

## Playwright E2E

Use for real browser behavior.

| Behavior | Why browser-level |
| --- | --- |
| Invoice download | must observe browser download event and suggested filename |
| Saved dark theme before hydration | must inspect raw server HTML and hydrated DOM |
| Activity popover outside click | Radix dismissal is browser interaction/focus behavior |
| Console/page error guard | catches runtime browser failures |
| Broad smoke flow | proves app boots through Next and real DOM |

## Static architecture checks

Use only for high-value invariants that are cheap to verify.

- No raw theme sync script in `app/layout.tsx`.
- No empty scaffold folders.
- No `ports` terminology in this take-home app.
- UI should receive `actions`; it should not import mock command implementations directly.

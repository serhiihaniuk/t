# Quality Checklist

Use this checklist before claiming tests are complete.

- The test name describes user-visible behavior.
- The test fails for a real product regression.
- The test would survive a refactor that preserves behavior.
- Async behavior is deterministic.
- No real network is used.
- No arbitrary sleeps are used.
- Component tests render `TransactionsDashboardClient` when injected actions are needed.
- Command behavior is injected through `TransactionsDashboardActions`.
- Browser-only behavior is covered by Playwright.
- Source files pass `npm run check:file-size`.
- Relevant checks were run and reported.

# Validation Prompts

Use these prompts to check whether the skill guides agents toward the right tests.

## Prompt 1

Use `$testing` to add coverage for a new requirement: failed rows should remain selectable after a retry fails.

Expected direction:

- Prefer reducer test plus component behavior if UI changed.
- Do not use Playwright unless browser behavior is involved.
- Assert the failed row returns to `Failed` and can be selected again.

## Prompt 2

Use `$testing` to review a test that uses `page.waitForTimeout(4000)` after clicking `Retry selected`.

Expected direction:

- Flag the sleep.
- Replace with row-level visible state or disappearance of `Retrying`.
- Keep the concurrent behavior observable.

## Prompt 3

Use `$testing` to test that the activity menu closes when the user clicks outside it.

Expected direction:

- Use Playwright because this is real browser popover/focus behavior.
- Open Activity, assert `Activity log` visible, click an outside heading or table area, assert hidden.

## Prompt 4

Use `$testing` to test a refactor that moves the theme sync script.

Expected direction:

- Keep raw HTML Playwright request check.
- Assert server-rendered dark class and color scheme for the cookie case.
- Assert the script tag id still exists.

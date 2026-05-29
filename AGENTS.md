<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Agent skills

## Testing

Use this skill when writing, reviewing, or refactoring tests in this take-home
project. It covers Vitest model/component tests, React Testing Library
interactions, Playwright browser flows, injected dashboard actions, invoice
download simulation, concurrent retry behavior, activity popover behavior, and
theme flash prevention.

See `.agents/skills/testing/SKILL.md`.

# How to verify

- Run `npm run check:file-size` after moving or splitting files.
- Run targeted Vitest for the changed area while iterating.
- Run `npm run test:e2e` when browser, download, theme, or popover behavior changes.
- Run `npm run verify` before claiming the project is ready.

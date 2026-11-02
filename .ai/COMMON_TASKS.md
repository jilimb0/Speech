# Common Development Tasks: Speech

## 1. Standard Commands
- **Start dev:** `pnpm dev` — Starts development server.
- **Validate:** `pnpm validate` — Builds packages, runs typecheck, and runs Biome lint.
- **Typecheck:** `pnpm typecheck` — Runs TypeScript strict checks.
- **Run tests:** `pnpm test` — Executes test runner across all packages.
- **Lint:** `pnpm lint` — Checks code style with Biome.
- **Build Web:** `pnpm build:web` — Builds Telegram Mini App SPA.

## 2. Recipe: Adding a New Feature
1. Review requirements against invariants in `.ai/ARCHITECTURE.md`.
2. Write a failing test in test directory verifying expected behavior.
3. Implement minimal clean code to satisfy the test.
4. Run `pnpm typecheck` and `pnpm test`.
5. Run `pnpm lint` to ensure code style compliance.

## 3. Recipe: Fixing a Bug
1. Reproduce defect with an automated regression test.
2. Verify test failure matches reported symptoms.
3. Apply targeted fix without modifying unrelated code.
4. Verify all tests pass with `pnpm test`.

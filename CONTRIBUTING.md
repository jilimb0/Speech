# Contributing to Speech

## Setup

```bash
git clone <repo>
cd speech
pnpm install
pnpm build
pnpm test
```

## Structure

- `apps/api/` — Fastify HTTP + bot webhook
- `apps/bot/` — Standalone bot (dev polling)
- `apps/web-miniapp/` — React SPA with Telegram Mini App
- `services/analysis/` — Filler detection, scoring, speech rate
- `services/sessions/` — Session + user management
- `services/speech/` — STT abstraction layer (Whisper)
- `packages/shared/` — Types, env helpers, utilities

## Commands

- `pnpm lint` — Biome check
- `pnpm typecheck` — TypeScript across all packages
- `pnpm test` — Vitest (services)
- `pnpm --filter @speech/web-miniapp test` — Web component tests

## Conventions

- Biome for formatting/linting (2.5.1)
- Strict TypeScript — no `any`, no non-null assertions
- Russian-first product with `language: 'ru' | 'en'` support
- Provider pattern for STT abstraction
- Score system: 0-100 with 3 dimensions

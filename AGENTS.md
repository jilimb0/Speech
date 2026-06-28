# Speech

Telegram Mini App for speech filler-word analysis. Users send voice messages, bot transcribes via Whisper and analyzes filler words (Russian "ну", "как бы", "типа").

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Monorepo | pnpm workspaces (`@speech/*`) |
| API | Fastify 5 (TypeScript) |
| Bot | Telegram via `@jilimb0/tgwrapper` |
| Frontend | React 18 + Vite 6 + react-router-dom 6 + Tailwind CSS |
| Database | PostgreSQL (raw `postgres` driver) |
| STT | Whisper (provider pattern) |
| Tests | Vitest |
| Lint/Format | Biome |
| CI/CD | GitHub Actions (GitHub Pages) |

## Structure
- `apps/api` — Fastify HTTP + Telegram bot webhook
- `apps/bot` — Standalone bot (dev polling)
- `apps/web-miniapp` — React SPA (history, detail, progress)
- `services/analysis` — Filler detection, scoring, speech rate
- `services/sessions` — Session + user management
- `services/speech` — STT abstraction layer
- `packages/shared` — Types, env helpers, utilities

## Commands
- `pnpm validate` — typecheck + lint
- `pnpm test` — Vitest across all packages
- `pnpm lint` / `pnpm format` — Biome
- `pnpm build:web` — build web-miniapp

## Conventions
- Russian-first product (RU/UA/EN translations)
- Provider pattern for STT (abstract interface)
- Score system (0-100): fillers-per-minute, speech rate, filler dominance
- Premium via session limits

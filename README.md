# Speech — Filler Word Analysis

Telegram Mini App for speech filler-word analysis. Users send voice messages, bot transcribes via Whisper (managed API or local faster-whisper), analyzes filler words in Russian ("ну", "как бы", "типа"), and provides scoring and feedback.

## Architecture

| Package | Description | Tech |
|---------|-------------|------|
| `@speech/api` | Fastify HTTP server + Telegram bot webhook | Fastify 5, @tgwrapper |
| `@speech/bot` | Standalone bot (dev polling) | @tgwrapper |
| `@speech/web-miniapp` | React SPA (history, detail, progress) | React 18, Vite 6, Tailwind |
| `@speech/analysis` | Filler detection, scoring, speech rate | Core logic |
| `@speech/sessions` | Session + user management | PostgreSQL (raw) |
| `@speech/speech` | STT abstraction layer | Whisper provider pattern |
| `@speech/shared` | Types, env helpers, utilities | — |

## Quick Start

```bash
pnpm install
pnpm validate    # typecheck + lint
pnpm test        # run all tests
pnpm build:web   # build web-miniapp
```

## Scoring

- **Score**: 0-100, starts at 100
- **Penalties**: 8 pts per filler/min over 2 fpm, 5 for extreme speech rate, 5 for dominant filler >60%
- **Floor**: 20, **Ceiling**: 100

## Environment

Copy `.env.example` to `.env` and configure:
- `TELEGRAM_BOT_TOKEN` — bot token
- `SPEECH_PROVIDER` — `managed` (OpenAI) or `faster-whisper`
- `DATABASE_URL` — PostgreSQL connection string
- `WEB_APP_URL` — Mini App URL for Telegram

## Tests

20 tests across analysis (filler analysis + scoring). Run with `pnpm test`.

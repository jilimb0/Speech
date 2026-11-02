# Speech — Production Runbook

## Env Vars

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TELEGRAM_BOT_TOKEN` | Yes | — | Telegram bot token |
| `WEB_APP_URL` | Yes | — | Telegram Mini App URL |
| `API_URL` | Yes | — | Public API URL for webhook / bot |
| `OPENAI_API_KEY` | Yes* | — | OpenAI key (required if `SPEECH_PROVIDER=managed`) |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `TELEGRAM_BOT_USERNAME` | No | `clean_speech_bot` | Bot username |
| `SPEECH_PROVIDER` | No | `faster-whisper` | `faster-whisper` or `managed` |
| `FASTER_WHISPER_URL` | No | `http://localhost:8001` | URL for local faster-whisper microservice |
| `FREE_DAILY_SESSION_LIMIT` | No | `2` | Free speech analysis sessions per day |
| `MIN_AUDIO_DURATION_SEC` | No | `15` | Minimum voice message duration in seconds |
| `MAX_AUDIO_DURATION_SEC` | No | `90` | Maximum voice message duration in seconds |
| `PREMIUM_STAR_PRICE` | No | `50` | Telegram Stars price for Premium |
| `AI_BASE_URL` | No | `https://api.opencode.ai/v1` | LLM inference endpoint for AI speech coach |
| `AI_API_KEY` | No | — | LLM inference API key |
| `AI_MODEL` | No | `gpt-4o-mini` | LLM model for AI speech coach |
| `CORS_ORIGIN` | No | — | Allowed CORS origin |
| `LOG_LEVEL` | No | `info` | Fastify log level |
| `SENTRY_DSN` | No | — | Sentry error tracking DSN |
| `NODE_ENV` | No | `development` | `production` or `development` |

## Deployment (Raspberry Pi + Tailscale)

```bash
# Build all packages
pnpm install
pnpm build

# Run with PM2 or Docker
pnpm --filter @speech/api start
```

## Docker

```bash
docker-compose up -d --build
```

## Health Check

```bash
curl http://localhost:3000/health
# {"ok":true,"ts":"2026-06-30T..."}
```

## Monitoring

- **Sentry**: Error tracking at SENTRY_DSN
- **Logs**: `docker compose logs -f`

## Whisper Cost Analysis

- OpenAI Whisper API: $0.006/min of audio
- faster-whisper (self-hosted on Raspberry Pi): ~$0.001/min (electricity only)
- Switch provider via `SPEECH_PROVIDER` env var
- Break-even: ~100 min/day of audio

# Speech — Production Runbook

## Env Vars

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TELEGRAM_BOT_TOKEN` | Yes | — | Telegram bot token |
| `API_URL` | Yes | — | Public API URL for webhook |
| `OPENAI_API_KEY` | Yes* | — | OpenAI key (for managed-whisper) |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `CORS_ORIGIN` | No | — | Allowed CORS origin |
| `LOG_LEVEL` | No | `info` | Fastify log level |
| `SENTRY_DSN` | No | — | Sentry error tracking |
| `SPEECH_PROVIDER` | No | `managed-whisper` | `managed-whisper` or `faster-whisper` |
| `FREE_DAILY_LIMIT` | No | `5` | Free sessions per day |
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

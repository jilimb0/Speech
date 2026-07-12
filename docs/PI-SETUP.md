# Speech API — Raspberry Pi Setup Guide

Expose the Speech API publicly via Tailscale Funnel so the GitHub Pages frontend can reach it.

## Architecture

```
Browser (jilimb0.github.io/Speech)
  │
  ▼  HTTPS
Tailscale Funnel  ←  exposes :3000 to the internet
  │
  ▼
Docker: api  (:3000)
  ├── Docker: db  (postgres, :5432)
  └── Docker: faster-whisper  (:8001)
```

The API runs inside Docker on the Pi. Tailscale Funnel creates a public HTTPS endpoint that forwards to the API container.

---

## 1. Prerequisites

Already set up on the Pi:

| Item | Status |
|------|--------|
| Tailscale installed & authenticated | Done |
| Docker + Docker Compose installed | Done |
| PostgreSQL container running | Done |
| faster-whisper container running | Done |
| API code cloned to `/home/pi/speech` | Assume yes |

Verify before starting:

```bash
# SSH into the Pi first
ssh pi@<tailscale-ip>

# Check Tailscale status
tailscale status

# Check Docker containers
docker ps

# Check the API container specifically
docker ps --filter name=speech-api
```

---

## 2. Configure Port Mapping

The API container port mapping determines how Tailscale Funnel connects to it.

**Option A — Use host port 3000** (recommended, clean URL):

Edit `docker-compose.yml` on the Pi:

```bash
# On the Pi
cd /home/pi/speech
nano docker-compose.yml
```

Change the `api` service port mapping from `"3005:3000"` to `"3000:3000"`:

```yaml
  api:
    ports:
      - "3000:3000"    # ← was "3005:3000"
```

**Option B — Keep 3005, funnel 3005 instead**:

If port 3000 is already in use, use port 3005 throughout this guide instead.

---

## 3. Environment Configuration

Create or update `.env` on the Pi:

```bash
# On the Pi
cd /home/pi/speech
cp .env.example .env
nano .env
```

Set these values:

```env
# Required — your Telegram bot token
TELEGRAM_BOT_TOKEN=<your-bot-token>

# Database
POSTGRES_PASSWORD=<strong-password>

# CORS — allows the GitHub Pages frontend to call the API
CORS_ORIGIN=https://jilimb0.github.io

# Web App URL (used by Telegram Mini App)
WEB_APP_URL=https://jilimb0.github.io/Speech

# STT provider
SPEECH_PROVIDER=faster-whisper
FASTER_WHISPER_URL=http://faster-whisper:10300

# API binding
HOST=0.0.0.0
PORT=3000

# Production mode
NODE_ENV=production
LOG_LEVEL=info
```

> **CORS_ORIGIN** controls which origins the API accepts requests from. The default in `docker-compose.yml` is `https://jilimb0.github.io` — keep it unless your frontend URL changes.
>
> **NODE_ENV** is read by Sentry and other libraries. Set it to `production` on the Pi.

---

## 4. Restart the API

```bash
# On the Pi
cd /home/pi/speech

# Pull latest images (optional, for updates)
docker compose pull api

# Rebuild and restart with new config
docker compose up -d --build api

# Verify it started
docker compose ps

# Check logs
docker compose logs api --tail=20
```

Verify the API is responding locally:

```bash
# Inside the container network
curl -s http://localhost:3000/health

# Expected response:
# {"ok":true,"ts":"2026-07-11T12:00:00.000Z"}
```

If you get a connection refused error, check the port mapping from step 2:

```bash
# Check which host port maps to container port 3000
docker port speech-api-1
# Expected: 3000/tcp -> 0.0.0.0:3000  (or 0.0.0.0:3005 if you kept 3005)
```

---

## 5. Enable Tailscale Funnel

```bash
# On the Pi — expose port 3000 publicly
sudo tailscale funnel 3000
```

This creates a public URL:

```
https://<machine-name>.<tailnet-name>.ts.net
```

Find the exact URL:

```bash
# Get the funnel URL
tailscale status | head -1

# Or check the Funnel status
tailscale funnel status
```

The output looks like:

```
Machine: speech-pi           # ← machine name
Tailnet: your-tailnet.ts.net # ← tailnet domain
```

Your API URL is:

```
https://speech-pi.your-tailnet.ts.net
```

> **Tailscale Funnel** creates a TLS-terminated HTTPS endpoint. The Pi does NOT need a custom domain, certbot, or Cloudflare. Everything is handled by Tailscale.

---

## 6. Test the Public Endpoint

From your local machine (anywhere with internet):

```bash
# Health check
curl -s https://speech-pi.your-tailnet.ts.net/health

# Expected:
# {"ok":true,"ts":"2026-07-11T12:00:00.000Z"}
```

Test CORS headers:

```bash
curl -s -I -X OPTIONS \
  -H "Origin: https://jilimb0.github.io" \
  -H "Access-Control-Request-Method: GET" \
  https://speech-pi.your-tailnet.ts.net/health \
  | grep -i access-control
```

Expected output should include:

```
access-control-allow-origin: https://jilimb0.github.io
access-control-allow-methods: GET, POST, PUT, DELETE, OPTIONS
access-control-allow-headers: *
```

Test an authenticated endpoint:

```bash
# Replace with a real initData from Telegram (or just check it returns 401/400)
curl -s https://speech-pi.your-tailnet.ts.net/api/me \
  -H "x-telegram-init-data: test" \
  -H "Content-Type: application/json"
```

---

## 7. Configure GitHub Actions

The frontend needs `VITE_API_BASE_URL` injected at build time so it knows where the API lives.

### Set a repository variable

```bash
# Install gh CLI if you haven't
brew install gh     # macOS
# or use GitHub web UI

gh variable set API_BASE_URL \
  --repo jilimb0/Speech \
  --body "https://speech-pi.your-tailnet.ts.net"
```

Or via the GitHub web UI:

1. Open `https://github.com/jilimb0/Speech/settings/variables/actions`
2. Click **"New repository variable"**
3. Name: `API_BASE_URL`
4. Value: `https://speech-pi.your-tailnet.ts.net` (no trailing slash)

### How it flows in CI

The workflow in `.github/workflows/deploy-web-pages.yml` does:

```yaml
env:
  VITE_API_BASE_URL: ${{ vars.API_BASE_URL || secrets.API_BASE_URL || 'https://your-pi-domain.com' }}
```

It reads `vars.API_BASE_URL` first, falls back to `secrets.API_BASE_URL`, then a placeholder.

Vite injects this at build time into `import.meta.env.VITE_API_BASE_URL`. The frontend then prepends it to every API call (`/api/me`, `/api/sessions`, etc.).

### After setting the variable

Trigger a new deploy:

```bash
# Option 1: Push to master
git push origin master

# Option 2: Manual workflow dispatch
gh workflow run deploy-web-pages.yml --repo jilimb0/Speech
```

The next deploy will embed the correct API URL into the frontend bundle.

---

## 8. Verification Checklist

```bash
# 1. API health (local)
curl -s http://localhost:3000/health

# 2. API health (via Tailscale Funnel, from outside)
curl -s https://speech-pi.your-tailnet.ts.net/health

# 3. CORS preflight
curl -s -o /dev/null -w "%{http_code}" -X OPTIONS \
  -H "Origin: https://jilimb0.github.io" \
  -H "Access-Control-Request-Method: GET" \
  https://speech-pi.your-tailnet.ts.net/health
# Expected: 204

# 4. Frontend loads the API URL correctly
# Open https://jilimb0.github.io/Speech → browser DevTools → Network tab
# Verify requests go to https://speech-pi.your-tailnet.ts.net/api/...

# 5. Telegram Mini App works end-to-end
# Open the bot → tap "Open Mini App" → verify sessions load
```

---

## 9. Troubleshooting

### Port already in use

```bash
# Check what's using port 3000
sudo lsof -i :3000

# If it's the API container but mapped to 3005:
docker port speech-api-1

# Solution: use port 3005 with funnel instead
sudo tailscale funnel 3005

# Or stop the conflicting process and restart Docker on 3000
```

### Funnel not enabled / command not found

```bash
# Check Tailscale version (funnel requires v1.38+)
tailscale version

# Enable funnel feature
sudo tailscale set --accept-routes

# If still failing, check your plan:
# Funnel is free on personal plans, but some features
# require a Tailscale plan upgrade.
tailscale status --web

# Verify funnel is allowed:
tailscale funnel status
```

### Container won't start

```bash
# Check full logs
docker compose logs api

# Rebuild without cache
docker compose build --no-cache api
docker compose up -d api

# Check if postgres is healthy
docker compose ps db
# If db is unhealthy, check its logs:
docker compose logs db --tail=20
```

### CORS errors in browser

```
Access to fetch at '...' from origin 'https://jilimb0.github.io' has been blocked by CORS policy
```

Check these:

```bash
# 1. Verify CORS_ORIGIN env var on the Pi
docker compose exec api env | grep CORS_ORIGIN
# Should output: CORS_ORIGIN=https://jilimb0.github.io

# 2. Verify the frontend is using the correct API URL
# Open browser DevTools → Network tab → check request URLs
# They should start with: https://speech-pi.your-tailnet.ts.net

# 3. If you just updated the GitHub variable, you need to REDEPLOY
# The VITE_API_BASE_URL is baked into the JS bundle at build time
```

### Tailscale Funnel returns 404 / connection refused

```bash
# Check funnel is pointing to the right port
tailscale funnel status

# Verify the API is listening
curl -s http://localhost:3000/health

# Check Docker port mapping
docker port speech-api-1
# Must map to host port 3000 (or whatever funnel is using)

# Restart funnel
sudo tailscale funnel 3000
```

### Telegram bot not responding

```bash
# Check bot logs
docker compose logs api | grep -i telegram

# Check that WEB_APP_URL is set correctly
docker compose exec api env | grep WEB_APP_URL
# Should be: WEB_APP_URL=https://jilimb0.github.io/Speech

# Verify the Mini App URL in @BotFather matches:
# https://jilimb0.github.io/Speech
```

---

## 10. Quick Reference

| Action | Command |
|--------|---------|
| SSH into Pi | `ssh pi@<tailscale-ip>` |
| Restart API | `docker compose up -d --build api` |
| View API logs | `docker compose logs api --tail=50 -f` |
| Enable funnel | `sudo tailscale funnel 3000` |
| Check funnel URL | `tailscale status` |
| Health check | `curl http://localhost:3000/health` |
| Public health | `curl https://speech-pi.your-tailnet.ts.net/health` |
| Set GH variable | `gh variable set API_BASE_URL --repo jilimb0/Speech --body "https://..."` |
| Deploy frontend | `gh workflow run deploy-web-pages.yml --repo jilimb0/Speech` |

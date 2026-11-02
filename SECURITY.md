# Security Policy

## Reporting a Vulnerability

Report security issues to [your-email]. Do not open public issues.

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.x     | ✅        |

## Security Features

- **TMA HMAC-SHA256 Auth:** Cryptographic verification of Telegram Mini App `initData`; development authentication bypass is strictly blocked in production (`ADR-0002`).
- **Binary Audio Payload Inspection:** Strict magic-bytes verification for incoming audio containers (OGG `OggS`, WAV `RIFF`, MP3 `ID3`/sync frames, MP4/M4A `ftyp`, FLAC `fLaC`) and a 20 MB size limit (`ADR-0002`).
- **Zero Raw Audio Retention:** Ephemeral in-memory audio processing; raw voice recordings and microphone buffers are never persisted to disk or database (`ADR-0001`).
- **Secrets Isolation:** OpenAI API keys, AI coach credentials, and Telegram bot tokens are strictly maintained server-side and never exposed to the client.
- **Resource Protection:** Per-user daily session limits prevent abuse and compute exhaustion.
- **Client Security:** CSP headers configured in Vite, and external tracker/font leakage avoided.
- **Production Observability:** Sentry error tracking and structured logging without PII leakage.

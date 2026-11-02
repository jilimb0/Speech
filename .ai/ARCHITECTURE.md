# Architecture: Speech

## 1. Identity & Domain
Speech — Audio speech-to-text transcription notebook, voice journal, and voice command extractor.
- **Status:** active
- **Remote:** `git@github.com:jilimb0/Speech.git`
- **Default Branch:** `master`

## 2. Stack & Runtime
- **Runtime:** TypeScript, Node.js (>=26), Fastify 5, React 19, Vite 8, Tailwind CSS, PostgreSQL, Whisper STT (managed/faster-whisper), Biome, Vitest, Docker.
- **Directories:** `apps`, `packages`, `scripts`, `services`

## 3. Structural Invariants
- Raw microphone audio buffers must never be persisted after transcription is complete.
- Transcription pipelines in `apps/` must support offline local WebAssembly models.
- Audio payload processing must enforce strict file size limits and MIME validation.

## 4. Data Flows & External Boundaries
- Inbound requests are validated at perimeter boundaries using strict schemas.
- Outbound third-party calls must employ timeouts, retries with backoff, and circuit breakers.
- Zero secrets or unredacted customer PII in logs or storage snapshots.

## 5. Active ADRs
- **[ADR-0001](.ai/adr/0001-sha256-audio-deduplication-and-ephemeral-buffer-policy.md)** (`apps/**`, `packages/**`, `services/**`): `SHA-256(audioBuffer + language + model)` transcription cache (7d TTL), 30s `AbortController` Whisper timeout with Full Jitter, and zero raw audio buffer retention.
- **[ADR-0002](.ai/adr/0002-perimeter-tma-auth-and-magic-bytes-audio-validation.md)** (`apps/api/src/middleware/tma-auth.ts`, `apps/api/src/bot/handlers/voice.ts`): In the context of the Fastify API perimeter and Telegram voice webhook handlers, facing unauthorized access via development bypass leaks and malicious non-audio binary uploads, we decided for mandatory HMAC-SHA256 TMA auth verification with an unconditional production dev-bypass ban, coupled with 20MB file size limits and magic-bytes inspection for audio formats (OGG, WAV, MP3, MP4/M4A, FLAC), to achieve zero unauthenticated API access in production and robust perimeter filtering, accepting minimal CPU header parsing overhead.

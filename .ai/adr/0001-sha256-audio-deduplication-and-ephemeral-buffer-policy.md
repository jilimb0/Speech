# ADR-0001: SHA-256 Audio Buffer Deduplication, 30s Whisper Timeout & Zero Raw Audio Retention

**Status:** Accepted  
**Date:** 2026-10-30  
**Deciders:** Core Engineering Team  
**Applies-To:** `apps/**`, `packages/**`, `services/**`  
**Supersedes:** None  
**Overrides-Global:** None (`GLOBAL-RES-01`, `GLOBAL-PRIV-01`, `GLOBAL-TS-01`)  

## Y-Summary
In the context of speech-to-text transcription (`services/speech/**`, `apps/**`), facing high latency/cost on repeated voice payloads, hung Whisper API calls, and voice privacy requirements, we decided for **`SHA-256(audioBuffer + language + model)` transcription caching (7-day TTL), a 30,000ms `AbortController` timeout with 3 Full-Jitter retries, and immediate purging of raw microphone audio buffers after transcription**, to achieve <5ms repeat transcription lookup and zero raw voice storage, accepting a 30s upper bound per audio chunk.

## Context and Problem Statement
`Speech` transcribes voice notes and microphone streams via Whisper APIs and local WebAssembly models. Re-transcribing forwarded or retried audio buffers wasted inference quota and added 5–15s latency, while retaining raw voice recordings posed a privacy risk.

## Decision Drivers
- Eliminate duplicate Whisper inference costs and latency via content hashing
- Bound external ASR provider latency to 30,000ms (`GLOBAL-RES-01`)
- Zero persistent storage of raw user voice buffers after transcription (`GLOBAL-PRIV-01`)

## Imperative Constraints for AI Agents (MUST / MUST NOT)
- **MUST:** Hash incoming audio payloads with `SHA-256(audioBuffer + language + model)` in `transcribeBuffer` (`services/speech/src/speech-service.ts`) and check the 7-day transcription cache before calling Whisper.
- **MUST:** Enforce strict MIME type validation, file size limits, and a 30,000ms `AbortController` timeout with 3 Full-Jitter retries on `429/503` responses.
- **MUST NOT:** Never persist raw microphone or voice audio buffers to disk or database after transcription completes.

## Considered Options & Rejected Alternatives
1. **Option 1 (Chosen): SHA-256 Audio Buffer Cache + 30s Timeout with Full Jitter + Ephemeral Audio Buffers**
   - *Why chosen:* Cuts repeat transcription time from ~10s to <5ms while preserving strict voice privacy (64/64 Vitest tests passing).
2. **Option 2 (Rejected — DO NOT PROPOSE): Storing raw `.ogg`/`.wav` files permanently on disk**
   - *Why rejected:* Violates privacy invariants and consumes unbounded disk storage.

## Consequences & Trade-offs
- **Positive:** Instant deduplicated transcriptions and zero raw audio leakage surface.
- **Negative / Cost:** Long recordings must be chunked so each segment completes within the 30s timeout window.

## Verification Gate
- **Check Command:** `pnpm test && pnpm lint`
- **Code Anchors:** `services/speech/src/speech-service.ts`

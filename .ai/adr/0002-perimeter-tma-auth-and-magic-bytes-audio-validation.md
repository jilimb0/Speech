# ADR-0002: Perimeter TMA HMAC Authentication and Strict Magic-Bytes Audio Validation

**Status:** Accepted  
**Date:** 2026-11-02  
**Deciders:** Core Engineering Team  
**Applies-To:** `apps/api/src/middleware/tma-auth.ts`, `apps/api/src/bot/handlers/voice.ts`  
**Supersedes:** None  
**Overrides-Global:** None  

## Y-Summary
In the context of the Fastify API perimeter and Telegram voice webhook handlers, facing unauthorized access via development bypass leaks and malicious non-audio binary uploads, we decided for mandatory HMAC-SHA256 TMA auth verification with an unconditional production dev-bypass ban, coupled with 20MB file size limits and magic-bytes inspection for audio formats (OGG, WAV, MP3, MP4/M4A, FLAC), to achieve zero unauthenticated API access in production and robust perimeter filtering, accepting minimal CPU header parsing overhead.

## Context and Problem Statement
The Speech API accepts Telegram Mini App requests via Fastify and voice messages from Telegram. A development bypass token ('dev') previously created risks in production if misconfigured, and unvalidated media payloads risked feeding invalid or malicious binaries to transcription services.

## Decision Drivers
- Zero authorization bypass in production environments (GLOBAL-PRIV-01)
- Strict perimeter input and binary payload validation before STT processing (GLOBAL-TS-01)
- Prevent arbitrary binary uploads and malformed media from crashing Whisper workers

## Imperative Constraints for AI Agents (MUST / MUST NOT)
- **MUST:** Enforce HMAC-SHA256 signature verification on all non-public API routes using @tgwrapper/core/tma.
- **MUST:** Strictly reject initData === 'dev' or dev bypass tokens whenever NODE_ENV === 'production'.
- **MUST:** Validate audio file payloads against container magic bytes (OGG 'OggS', WAV 'RIFF', MP3 'ID3'/sync frame, MP4/M4A 'ftyp', FLAC 'fLaC') and enforce max size of 20MB before scheduling transcription.
- **MUST NOT:** MUST NOT permit mock authentication bypasses in production environments under any header or query configuration.
- **MUST NOT:** MUST NOT pass unvalidated or non-audio binary buffers to Whisper transcription services.

## Considered Options & Rejected Alternatives
1. **Option 1 (Chosen): Perimeter HMAC-SHA256 TMA Hook with strict NODE_ENV validation and Multi-format Magic-Bytes Audio Validator**
   - *Why chosen:* Satisfies all decision drivers and domain invariants.
2. **Option 2 (Rejected — DO NOT PROPOSE): Trusting client-reported MIME types exclusively**
   - *Why rejected:* MIME types reported by clients can easily be spoofed, resulting in parser failures or unexpected binary processing in Whisper.
3. **Option 3 (Rejected — DO NOT PROPOSE): Allowing development bypass via environment flags in production**
   - *Why rejected:* Leaves open a P2 authorization vulnerability allowing unauthorized session extraction.

## Consequences & Trade-offs
- **Positive:** Deterministic enforcement and zero architectural drift.
- **Negative / Cost:** Requires compliance across `apps/api/src/middleware/tma-auth.ts`, `apps/api/src/bot/handlers/voice.ts`.

## Verification Gate
- **Check Command:** `pnpm test`

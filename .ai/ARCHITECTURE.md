# Architecture: Speech

## 1. Identity & Domain
Speech — Audio speech-to-text transcription notebook, voice journal, and voice command extractor.
- **Status:** active
- **Remote:** `git@github.com:jilimb0/Speech.git`
- **Default Branch:** `master`

## 2. Stack & Runtime
- **Runtime:** TypeScript, Node.js, Web Speech API, Biome, Vitest, Docker.
- **Directories:** `apps`, `packages`, `scripts`, `services`

## 3. Structural Invariants
- Raw microphone audio buffers must never be persisted after transcription is complete.
- Transcription pipelines in `apps/` must support offline local WebAssembly models.
- Audio payload processing must enforce strict file size limits and MIME validation.

## 4. Data Flows & External Boundaries
- Inbound requests are validated at perimeter boundaries using strict schemas.
- Outbound third-party calls must employ timeouts, retries with backoff, and circuit breakers.
- Zero secrets or unredacted customer PII in logs or storage snapshots.

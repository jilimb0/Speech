import crypto from 'node:crypto';
import { existsSync } from 'node:fs';
import {
  InMemoryTranscriptionCache,
  type SpeechRecognitionProvider,
  SpeechService,
} from '@speech/speech';
import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerTmaAuth } from '../middleware/tma-auth.js';
import { b2bTranscribeRoutes, validateAudioMagicBytes } from './b2b-transcribe.js';

const TEST_SERVICE_KEY = 'b2b-internal-test-secret-key-32bytes';

function makeOggBuffer(payload = 'test-audio-data'): Buffer {
  return Buffer.concat([Buffer.from('OggS\x00\x02\x00\x00\x00\x00\x00\x00'), Buffer.from(payload)]);
}

function makeWavBuffer(payload = 'test-wav-data'): Buffer {
  return Buffer.concat([Buffer.from('RIFF\x24\x00\x00\x00WAVE'), Buffer.from(payload)]);
}

function makeMp3Id3Buffer(payload = 'test-mp3-data'): Buffer {
  return Buffer.concat([
    Buffer.from('ID3\x03\x00\x00\x00\x00\x00\x00\x00\x00'),
    Buffer.from(payload),
  ]);
}

function makeM4aBuffer(payload = 'test-m4a-data'): Buffer {
  return Buffer.concat([Buffer.from('\x00\x00\x00\x18ftypM4A '), Buffer.from(payload)]);
}

function makeFlacBuffer(payload = 'test-flac-data'): Buffer {
  return Buffer.concat([Buffer.from('fLaC\x00\x00\x00\x22\x10\x00\x10\x00'), Buffer.from(payload)]);
}

describe('validateAudioMagicBytes', () => {
  it('accepts OGG, WAV, MP3, MP4/M4A, and FLAC headers', () => {
    expect(validateAudioMagicBytes(makeOggBuffer())).toBe(true);
    expect(validateAudioMagicBytes(makeWavBuffer())).toBe(true);
    expect(validateAudioMagicBytes(makeMp3Id3Buffer())).toBe(true);
    expect(
      validateAudioMagicBytes(Buffer.from([0xff, 0xfb, 0x90, 0x00, 0, 0, 0, 0, 0, 0, 0, 0])),
    ).toBe(true);
    expect(validateAudioMagicBytes(makeM4aBuffer())).toBe(true);
    expect(validateAudioMagicBytes(makeFlacBuffer())).toBe(true);
  });

  it('rejects non-audio and too-short buffers', () => {
    expect(validateAudioMagicBytes(Buffer.from('OggS'))).toBe(false);
    expect(validateAudioMagicBytes(Buffer.from('{"hello":"world"}'))).toBe(false);
    expect(validateAudioMagicBytes(Buffer.from('\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR'))).toBe(false);
    expect(validateAudioMagicBytes(Buffer.from('%PDF-1.7\n0123456789'))).toBe(false);
  });
});

describe('POST /api/v1/b2b/transcribe', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.INTERNAL_SERVICE_KEY = TEST_SERVICE_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('rejects missing x-internal-service-key with 401', async () => {
    const app = Fastify();
    await app.register(b2bTranscribeRoutes);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/b2b/transcribe',
      headers: { 'content-type': 'audio/ogg' },
      payload: makeOggBuffer(),
    });

    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body)).toMatchObject({ ok: false });
  });

  it('rejects invalid x-internal-service-key with 403 using crypto.timingSafeEqual', async () => {
    const timingSpy = vi.spyOn(crypto, 'timingSafeEqual');
    const app = Fastify();
    await app.register(b2bTranscribeRoutes);

    const resSameLen = await app.inject({
      method: 'POST',
      url: '/api/v1/b2b/transcribe',
      headers: {
        'content-type': 'audio/ogg',
        'x-internal-service-key': 'x'.repeat(TEST_SERVICE_KEY.length),
      },
      payload: makeOggBuffer(),
    });

    expect(resSameLen.statusCode).toBe(403);
    expect(timingSpy).toHaveBeenCalled();

    const resDiffLen = await app.inject({
      method: 'POST',
      url: '/api/v1/b2b/transcribe',
      headers: {
        'content-type': 'audio/ogg',
        'x-internal-service-key': 'short-wrong-key',
      },
      payload: makeOggBuffer(),
    });

    expect(resDiffLen.statusCode).toBe(403);
  });

  it('works cleanly with registerTmaAuth in production without requiring TMA initData', async () => {
    process.env.NODE_ENV = 'production';
    process.env.TELEGRAM_BOT_TOKEN = 'test:token';

    const mockService = {
      transcribe: vi.fn().mockResolvedValue({
        rawTranscript: 'Hello B2B world',
        normalizedTranscript: 'hello b2b world',
        status: 'ok',
        processingTimeMs: 12,
        cached: false,
      }),
    };

    const app = Fastify();
    await registerTmaAuth(app);
    await app.register(b2bTranscribeRoutes, { speechService: mockService });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/b2b/transcribe',
      headers: {
        'content-type': 'audio/ogg',
        'x-internal-service-key': TEST_SERVICE_KEY,
      },
      payload: makeOggBuffer(),
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({
      ok: true,
      text: 'Hello B2B world',
      language: 'ru',
      cached: false,
    });
  });

  it('rejects binary payloads larger than 20MB with 413', async () => {
    const app = Fastify();
    await app.register(b2bTranscribeRoutes);

    const oversized = Buffer.alloc(20 * 1024 * 1024 + 1);
    Buffer.from('OggS').copy(oversized, 0);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/b2b/transcribe',
      headers: {
        'content-type': 'audio/ogg',
        'x-internal-service-key': TEST_SERVICE_KEY,
      },
      payload: oversized,
    });

    expect(res.statusCode).toBe(413);
  });

  it('rejects base64 JSON payloads larger than 20MB with 413', async () => {
    const app = Fastify();
    await app.register(b2bTranscribeRoutes);

    const oversized = Buffer.alloc(20 * 1024 * 1024 + 1);
    Buffer.from('OggS').copy(oversized, 0);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/b2b/transcribe',
      headers: {
        'content-type': 'application/json',
        'x-internal-service-key': TEST_SERVICE_KEY,
      },
      payload: JSON.stringify({ audio: oversized.toString('base64') }),
    });

    expect(res.statusCode).toBe(413);
  });

  it('rejects invalid non-audio magic bytes with 400 for binary and JSON payloads', async () => {
    const mockService = { transcribe: vi.fn() };
    const app = Fastify();
    await app.register(b2bTranscribeRoutes, { speechService: mockService });

    const binaryRes = await app.inject({
      method: 'POST',
      url: '/api/v1/b2b/transcribe',
      headers: {
        'content-type': 'application/octet-stream',
        'x-internal-service-key': TEST_SERVICE_KEY,
      },
      payload: Buffer.from('NOT_AUDIO_BINARY_PAYLOAD_123456'),
    });

    expect(binaryRes.statusCode).toBe(400);
    expect(mockService.transcribe).not.toHaveBeenCalled();

    const jsonRes = await app.inject({
      method: 'POST',
      url: '/api/v1/b2b/transcribe',
      headers: {
        'content-type': 'application/json',
        'x-internal-service-key': TEST_SERVICE_KEY,
      },
      payload: JSON.stringify({
        audio: Buffer.from('PNG_FAKE_NOT_AUDIO_DATA').toString('base64'),
      }),
    });

    expect(jsonRes.statusCode).toBe(400);
    expect(mockService.transcribe).not.toHaveBeenCalled();
  });

  it('accepts valid OGG/WAV/MP3/M4A/FLAC binary audio, invokes SpeechService.transcribe, and zeros out buffer', async () => {
    const seenPaths: string[] = [];
    const mockService = {
      transcribe: vi.fn(async (filePath: string) => {
        seenPaths.push(filePath);
        expect(existsSync(filePath)).toBe(true);
        return {
          rawTranscript: 'Распознанный текст',
          normalizedTranscript: 'распознанный текст',
          status: 'ok' as const,
          processingTimeMs: 42,
          cached: false,
        };
      }),
    };

    const app = Fastify();
    await app.register(b2bTranscribeRoutes, { speechService: mockService });

    const samples = [
      { contentType: 'audio/ogg', buf: makeOggBuffer() },
      { contentType: 'audio/wav', buf: makeWavBuffer() },
      { contentType: 'audio/mpeg', buf: makeMp3Id3Buffer() },
      { contentType: 'audio/mp4', buf: makeM4aBuffer() },
      { contentType: 'audio/flac', buf: makeFlacBuffer() },
    ];

    for (const sample of samples) {
      const fillSpy = vi.spyOn(Buffer.prototype, 'fill');
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/b2b/transcribe',
        headers: {
          'content-type': sample.contentType,
          'x-internal-service-key': TEST_SERVICE_KEY,
        },
        payload: sample.buf,
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual({
        ok: true,
        text: 'Распознанный текст',
        language: 'ru',
        cached: false,
      });
      expect(fillSpy).toHaveBeenCalledWith(0);
      fillSpy.mockRestore();
    }

    expect(mockService.transcribe).toHaveBeenCalledTimes(5);
    for (const tempPath of seenPaths) {
      expect(existsSync(tempPath)).toBe(false);
    }
  });

  it('accepts base64 JSON, leverages SHA-256 SpeechService cache, and zeros decoded buffer', async () => {
    const provider: SpeechRecognitionProvider = {
      transcribe: vi.fn().mockResolvedValue({
        rawTranscript: 'Cached transcription result',
        normalizedTranscript: 'cached transcription result',
        status: 'ok',
        processingTimeMs: 85,
      }),
    };
    const cache = new InMemoryTranscriptionCache();
    const speechService = new SpeechService(provider, { cache, timeoutMs: 30_000 });
    const transcribeSpy = vi.spyOn(speechService, 'transcribe');

    const app = Fastify();
    await app.register(b2bTranscribeRoutes, { speechService });

    const audioBase64 = makeOggBuffer('repeatable-b2b-audio').toString('base64');
    const fillSpy = vi.spyOn(Buffer.prototype, 'fill');

    const first = await app.inject({
      method: 'POST',
      url: '/api/v1/b2b/transcribe',
      headers: {
        'content-type': 'application/json',
        'x-internal-service-key': TEST_SERVICE_KEY,
      },
      payload: JSON.stringify({ audio: audioBase64, language: 'en' }),
    });

    expect(first.statusCode).toBe(200);
    expect(JSON.parse(first.body)).toEqual({
      ok: true,
      text: 'Cached transcription result',
      language: 'en',
      cached: false,
    });
    expect(fillSpy).toHaveBeenCalledWith(0);

    const second = await app.inject({
      method: 'POST',
      url: '/api/v1/b2b/transcribe',
      headers: {
        'content-type': 'application/json',
        'x-internal-service-key': TEST_SERVICE_KEY,
      },
      payload: JSON.stringify({ audio: audioBase64, language: 'en' }),
    });

    expect(second.statusCode).toBe(200);
    expect(JSON.parse(second.body)).toEqual({
      ok: true,
      text: 'Cached transcription result',
      language: 'en',
      cached: true,
    });
    expect(transcribeSpy).toHaveBeenCalledTimes(2);
    expect(provider.transcribe).toHaveBeenCalledTimes(1);
  });

  it('accepts multipart/form-data with Authorization Bearer token from Trader/MyPersFin clients', async () => {
    const mockService = {
      transcribe: vi.fn().mockResolvedValue({
        rawTranscript: 'Multipart transcription ok',
        normalizedTranscript: 'multipart transcription ok',
        status: 'ok' as const,
        processingTimeMs: 18,
        cached: false,
      }),
    };

    const app = Fastify();
    await app.register(b2bTranscribeRoutes, { speechService: mockService });

    const boundary = '----SpeechB2bTestBoundary98765';
    const wav = makeWavBuffer('multipart-wav-audio');
    const preamble = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\nen\r\n--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="voice.wav"\r\nContent-Type: audio/wav\r\n\r\n`,
      'utf8',
    );
    const epilogue = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
    const multipartBody = Buffer.concat([preamble, wav, epilogue]);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/b2b/transcribe',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
        authorization: `Bearer ${TEST_SERVICE_KEY}`,
      },
      payload: multipartBody,
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({
      ok: true,
      text: 'Multipart transcription ok',
      language: 'en',
      cached: false,
    });
  });
});

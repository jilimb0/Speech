import crypto from 'node:crypto';
import { rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  FasterWhisperProvider,
  InMemoryTranscriptionCache,
  SpeechService,
  type TranscriptionResult,
} from '@speech/speech';
import type { FastifyInstance } from 'fastify';

export const MAX_AUDIO_FILE_SIZE = 20 * 1024 * 1024; // 20MB limit (ADR-0002)
const MAX_JSON_BODY_SIZE = 30 * 1024 * 1024; // Accommodates 20MB base64-encoded JSON payload
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days (ADR-0001)
const TRANSCRIBE_TIMEOUT_MS = 30_000; // 30s (ADR-0001)
const DEFAULT_LANGUAGE = 'ru';

type AudioFormat = 'ogg' | 'wav' | 'mp3' | 'm4a' | 'flac';

export interface B2bSpeechService {
  transcribe(audioFilePath: string): Promise<TranscriptionResult>;
}

export interface B2bTranscribeRouteOptions {
  speechService?: B2bSpeechService;
  internalServiceKey?: string;
}

interface JsonTranscribeBody {
  audio?: unknown;
  audioBase64?: unknown;
  language?: unknown;
}

interface TranscribeQuery {
  language?: string;
}

function detectAudioFormat(buf: Buffer): AudioFormat | null {
  if (buf.length < 12) return null;

  const head4 = buf.toString('ascii', 0, 4);
  if (head4 === 'OggS') return 'ogg';
  if (head4 === 'fLaC') return 'flac';
  if (head4 === 'RIFF') {
    return buf.toString('ascii', 8, 12) === 'WEBP' ? null : 'wav';
  }
  if (buf.toString('ascii', 4, 8) === 'ftyp') return 'm4a';

  const isMp3Id3 = buf.toString('ascii', 0, 3) === 'ID3';
  const isMp3Sync = buf[0] === 0xff && ((buf[1] ?? 0) & 0xe0) === 0xe0;
  return isMp3Id3 || isMp3Sync ? 'mp3' : null;
}

/**
 * Validates audio buffer headers against recognized container magic bytes
 * (OGG, WAV, MP3, MP4/M4A, FLAC) per ADR-0002.
 */
export function validateAudioMagicBytes(buf: Buffer): boolean {
  return detectAudioFormat(buf) !== null;
}

function verifyServiceKey(provided: string, expected: string): boolean {
  const providedDigest = crypto.createHash('sha256').update(provided).digest();
  const expectedDigest = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(providedDigest, expectedDigest);
}

function resolveLanguage(bodyLang: unknown, queryLang: string | undefined): string {
  const candidate = typeof bodyLang === 'string' ? bodyLang : queryLang;
  if (!candidate) return DEFAULT_LANGUAGE;
  const trimmed = candidate.trim();
  return /^[a-zA-Z]{2,5}(-[a-zA-Z]{2,4})?$/.test(trimmed) ? trimmed : DEFAULT_LANGUAGE;
}

const HEADER_DELIMITER = Buffer.from('\r\n\r\n');
const CLOSING_DASHES = Buffer.from('--');

function parseMultipartPart(
  rawBody: Buffer,
  partStart: number,
  nextBoundary: number,
): { fileBuffer?: Buffer; language?: string } {
  const headerEnd = rawBody.indexOf(HEADER_DELIMITER, partStart);
  if (headerEnd === -1 || headerEnd >= nextBoundary) return {};

  const headersText = rawBody.subarray(partStart, headerEnd).toString('utf8');
  const contentStart = headerEnd + HEADER_DELIMITER.length;
  const hasCrlfSuffix = rawBody[nextBoundary - 2] === 0x0d && rawBody[nextBoundary - 1] === 0x0a;
  const contentEnd = hasCrlfSuffix ? nextBoundary - 2 : nextBoundary;
  const partContent = rawBody.subarray(contentStart, contentEnd);

  if (/name="file"|filename="/i.test(headersText)) {
    return { fileBuffer: Buffer.from(partContent) };
  }
  if (/name="language"/i.test(headersText)) {
    return { language: partContent.toString('utf8').trim() };
  }
  return {};
}

function extractMultipartAudio(
  rawBody: Buffer,
  contentType: string,
  queryLang: string | undefined,
): { buffer: Buffer; language: string } | { status: number; error: string } {
  const match = /boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(contentType);
  const boundary = match?.[1] ?? match?.[2];
  if (!boundary) {
    return { status: 400, error: 'Missing multipart boundary' };
  }

  const boundaryMarker = Buffer.from(`--${boundary}`);
  let fileBuffer: Buffer | null = null;
  let formLang: string | undefined;

  let cursor = rawBody.indexOf(boundaryMarker);
  while (cursor !== -1) {
    const partStart = cursor + boundaryMarker.length;
    if (rawBody.subarray(partStart, partStart + 2).equals(CLOSING_DASHES)) break;
    const nextBoundary = rawBody.indexOf(boundaryMarker, partStart);
    if (nextBoundary === -1) break;

    const parsedPart = parseMultipartPart(rawBody, partStart, nextBoundary);
    if (parsedPart.fileBuffer) fileBuffer = parsedPart.fileBuffer;
    if (parsedPart.language) formLang = parsedPart.language;
    cursor = nextBoundary;
  }

  if (!fileBuffer || fileBuffer.length === 0) {
    return { status: 400, error: 'Missing audio file part in multipart/form-data' };
  }

  return {
    buffer: fileBuffer,
    language: resolveLanguage(formLang, queryLang),
  };
}

function extractAudioBuffer(
  body: unknown,
  queryLang: string | undefined,
  contentType?: string,
): { buffer: Buffer; language: string } | { status: number; error: string } {
  if (Buffer.isBuffer(body)) {
    if (contentType && /^multipart\/form-data/i.test(contentType)) {
      return extractMultipartAudio(body, contentType, queryLang);
    }
    return { buffer: body, language: resolveLanguage(undefined, queryLang) };
  }

  if (!body || typeof body !== 'object') {
    return {
      status: 400,
      error: 'Unsupported request body: send binary audio, multipart/form-data, or JSON { audio }',
    };
  }

  const jsonBody = body as JsonTranscribeBody;
  const rawAudio = jsonBody.audio ?? jsonBody.audioBase64;
  if (typeof rawAudio !== 'string' || rawAudio.trim().length === 0) {
    return { status: 400, error: 'Missing base64 audio payload' };
  }

  const stripped = rawAudio.replace(/^data:[^;]+;base64,/, '').trim();
  return {
    buffer: Buffer.from(stripped, 'base64'),
    language: resolveLanguage(jsonBody.language, queryLang),
  };
}

function validateAudioBuffer(
  audioBuffer: Buffer,
): { format: AudioFormat } | { status: number; error: string } {
  if (audioBuffer.length > MAX_AUDIO_FILE_SIZE) {
    return {
      status: 413,
      error: 'Audio payload exceeds maximum permitted size of 20MB',
    };
  }
  const format = detectAudioFormat(audioBuffer);
  if (!format) {
    return {
      status: 400,
      error: 'Invalid audio format: unrecognized magic bytes',
    };
  }
  return { format };
}

function getErrorStatus(err: unknown): { status: number; message: string } {
  const message = err instanceof Error ? err.message : 'Transcription failed';
  const isTimeout = message.includes('timed out') || message.includes('Timeout');
  return { status: isTimeout ? 504 : 502, message };
}

export async function b2bTranscribeRoutes(
  app: FastifyInstance,
  options?: B2bTranscribeRouteOptions,
): Promise<void> {
  let defaultSpeechService: B2bSpeechService | undefined;

  function getSpeechService(): B2bSpeechService {
    if (options?.speechService) return options.speechService;
    if (!defaultSpeechService) {
      const provider = new FasterWhisperProvider({ timeoutMs: TRANSCRIBE_TIMEOUT_MS });
      const cache = new InMemoryTranscriptionCache(CACHE_TTL_MS);
      defaultSpeechService = new SpeechService(provider, {
        cache,
        timeoutMs: TRANSCRIBE_TIMEOUT_MS,
      });
    }
    return defaultSpeechService;
  }

  app.addContentTypeParser<Buffer>(
    /^audio\/.*/,
    { parseAs: 'buffer', bodyLimit: MAX_AUDIO_FILE_SIZE },
    (_request, payload, done) => done(null, payload),
  );

  app.addContentTypeParser<Buffer>(
    ['application/octet-stream', 'video/ogg', 'video/mp4'],
    { parseAs: 'buffer', bodyLimit: MAX_AUDIO_FILE_SIZE },
    (_request, payload, done) => done(null, payload),
  );

  app.addContentTypeParser<Buffer>(
    /^multipart\/form-data/i,
    { parseAs: 'buffer', bodyLimit: MAX_JSON_BODY_SIZE },
    (_request, payload, done) => done(null, payload),
  );

  app.addHook('onRequest', async (request, reply) => {
    const headerKey = request.headers['x-internal-service-key'];
    const authHeader = request.headers.authorization;
    const bearerKey =
      typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')
        ? authHeader.slice(7).trim()
        : undefined;
    const rawKey = typeof headerKey === 'string' && headerKey.length > 0 ? headerKey : bearerKey;
    if (typeof rawKey !== 'string' || rawKey.length === 0) {
      return reply.code(401).send({ ok: false, error: 'Missing x-internal-service-key header' });
    }

    const expectedKey = options?.internalServiceKey ?? process.env.INTERNAL_SERVICE_KEY;
    if (!expectedKey) {
      return reply
        .code(500)
        .send({ ok: false, error: 'Server misconfiguration: INTERNAL_SERVICE_KEY missing' });
    }

    if (!verifyServiceKey(rawKey, expectedKey)) {
      return reply.code(403).send({ ok: false, error: 'Invalid internal service key' });
    }
  });

  app.post<{ Querystring: TranscribeQuery }>(
    '/api/v1/b2b/transcribe',
    { bodyLimit: MAX_JSON_BODY_SIZE },
    async (request, reply) => {
      let audioBuffer: Buffer | null = null;
      let tempFilePath: string | null = null;

      try {
        const extracted = extractAudioBuffer(
          request.body,
          request.query.language,
          request.headers['content-type'],
        );
        if ('error' in extracted) {
          return reply.code(extracted.status).send({ ok: false, error: extracted.error });
        }

        audioBuffer = extracted.buffer;
        const validation = validateAudioBuffer(audioBuffer);
        if ('error' in validation) {
          return reply.code(validation.status).send({ ok: false, error: validation.error });
        }

        tempFilePath = join(tmpdir(), `b2b-speech-${crypto.randomUUID()}.${validation.format}`);
        await writeFile(tempFilePath, audioBuffer);

        const result = await getSpeechService().transcribe(tempFilePath);
        return {
          ok: true,
          text: result.rawTranscript,
          language: extracted.language,
          cached: Boolean(result.cached),
        };
      } catch (err) {
        request.log.error({ err }, 'B2B transcription failed');
        const { status, message } = getErrorStatus(err);
        return reply.code(status).send({ ok: false, error: message });
      } finally {
        audioBuffer?.fill(0);
        if (tempFilePath) {
          await rm(tempFilePath, { force: true }).catch(() => {});
        }
      }
    },
  );
}

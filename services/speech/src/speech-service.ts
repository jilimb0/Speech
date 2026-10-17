import { createHash } from 'node:crypto';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AudioSegment, TranscriptionStatus } from '@speech/shared';

export interface TranscriptionResult {
  rawTranscript: string;
  normalizedTranscript: string;
  status: TranscriptionStatus;
  processingTimeMs: number;
  segments?: AudioSegment[];
  cached?: boolean;
}

export interface SpeechRecognitionProvider {
  transcribe(audioFilePath: string): Promise<TranscriptionResult>;
}

export interface TranscriptionCache {
  get(hash: string): Promise<TranscriptionResult | null>;
  set(hash: string, result: TranscriptionResult): Promise<void>;
  has(hash: string): Promise<boolean>;
  clear?(): Promise<void>;
}

export interface SpeechServiceOptions {
  cache?: TranscriptionCache;
  timeoutMs?: number;
}

/**
 * Встроенный быстрый кэш транскрипций в памяти (с TTL и LRU-вытеснением).
 * Защищает от повторных затрат на Whisper API при повторной обработке аудио.
 */
export class InMemoryTranscriptionCache implements TranscriptionCache {
  private readonly store = new Map<string, { result: TranscriptionResult; expiresAt: number }>();

  constructor(
    private readonly ttlMs: number = 24 * 60 * 60 * 1000,
    private readonly maxSize: number = 1000,
  ) {}

  async get(hash: string): Promise<TranscriptionResult | null> {
    const entry = this.store.get(hash);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(hash);
      return null;
    }
    return entry.result;
  }

  async set(hash: string, result: TranscriptionResult): Promise<void> {
    if (this.store.size >= this.maxSize) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) this.store.delete(oldestKey);
    }
    this.store.set(hash, {
      result,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  async has(hash: string): Promise<boolean> {
    return (await this.get(hash)) !== null;
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

export class SpeechService {
  private readonly cache: TranscriptionCache | undefined;
  private readonly timeoutMs: number;

  constructor(
    private readonly provider: SpeechRecognitionProvider,
    cacheOrOptions?: TranscriptionCache | SpeechServiceOptions,
  ) {
    if (cacheOrOptions && 'get' in cacheOrOptions) {
      this.cache = cacheOrOptions;
      this.timeoutMs = 30_000;
    } else {
      this.cache = cacheOrOptions?.cache;
      this.timeoutMs = cacheOrOptions?.timeoutMs ?? 30_000;
    }
  }

  computeAudioHashFromBuffer(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  async computeAudioHash(audioFilePath: string): Promise<string> {
    const buffer = await readFile(audioFilePath);
    return this.computeAudioHashFromBuffer(buffer);
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Transcription timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then((res) => {
          clearTimeout(timer);
          resolve(res);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  async transcribe(audioFilePath: string): Promise<TranscriptionResult> {
    let audioHash: string | null = null;

    if (this.cache) {
      try {
        audioHash = await this.computeAudioHash(audioFilePath);
        const cached = await this.cache.get(audioHash);
        if (cached) {
          return {
            ...cached,
            cached: true,
            processingTimeMs: 0,
          };
        }
      } catch (err) {
        console.error('[UDPA-Handled]', err);
        // Если чтение или хэш не удались, продолжаем прямой вызов провайдера
      }
    }

    const result = await this.withTimeout(this.provider.transcribe(audioFilePath), this.timeoutMs);

    if (this.cache && audioHash && result.status !== 'failed') {
      await this.cache.set(audioHash, result);
    }

    return result;
  }

  async transcribeBuffer(buffer: Buffer, fileExt = 'ogg'): Promise<TranscriptionResult> {
    const audioHash = this.computeAudioHashFromBuffer(buffer);

    if (this.cache) {
      const cached = await this.cache.get(audioHash);
      if (cached) {
        return {
          ...cached,
          cached: true,
          processingTimeMs: 0,
        };
      }
    }

    const tempPath = join(tmpdir(), `speech-${Date.now()}-${audioHash.slice(0, 8)}.${fileExt}`);
    await writeFile(tempPath, buffer);

    try {
      const result = await this.withTimeout(this.provider.transcribe(tempPath), this.timeoutMs);
      if (this.cache && result.status !== 'failed') {
        await this.cache.set(audioHash, result);
      }
      return result;
    } finally {
      await rm(tempPath, { force: true });
    }
  }
}

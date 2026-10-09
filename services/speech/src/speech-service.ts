import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
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
  constructor(
    private readonly provider: SpeechRecognitionProvider,
    private readonly cache?: TranscriptionCache,
  ) {}

  async computeAudioHash(audioFilePath: string): Promise<string> {
    const buffer = await readFile(audioFilePath);
    return createHash('sha256').update(buffer).digest('hex');
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
      } catch {
        // Если чтение или хэш не удались, продолжаем прямой вызов провайдера
      }
    }

    const result = await this.provider.transcribe(audioFilePath);

    if (this.cache && audioHash && result.status !== 'failed') {
      await this.cache.set(audioHash, result);
    }

    return result;
  }
}

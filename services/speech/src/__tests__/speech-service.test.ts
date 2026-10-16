import { describe, expect, it, vi } from 'vitest';
import type { SpeechRecognitionProvider, TranscriptionResult } from '../speech-service.js';
import { InMemoryTranscriptionCache, SpeechService } from '../speech-service.js';

function createMockProvider(): SpeechRecognitionProvider {
  return {
    transcribe: vi.fn().mockResolvedValue({
      rawTranscript: 'тестовый текст',
      normalizedTranscript: 'тестовый текст',
      status: 'ok',
      processingTimeMs: 100,
    } as TranscriptionResult),
  };
}

describe('SpeechService', () => {
  it('transcribes via provider', async () => {
    const provider = createMockProvider();
    const service = new SpeechService(provider);
    const result = await service.transcribe('/test/path.ogg');
    expect(result.rawTranscript).toBe('тестовый текст');
    expect(result.status).toBe('ok');
  });

  it('forwards errors from provider', async () => {
    const provider: SpeechRecognitionProvider = {
      transcribe: vi.fn().mockRejectedValue(new Error('API error')),
    };
    const service = new SpeechService(provider);
    await expect(service.transcribe('/test/path.ogg')).rejects.toThrow('API error');
  });

  it('reports processing time', async () => {
    const provider: SpeechRecognitionProvider = {
      transcribe: vi.fn().mockResolvedValue({
        rawTranscript: 'test',
        normalizedTranscript: 'test',
        status: 'ok',
        processingTimeMs: 250,
      } as TranscriptionResult),
    };
    const service = new SpeechService(provider);
    const result = await service.transcribe('/test/path.ogg');
    expect(result.processingTimeMs).toBe(250);
  });

  it('handles uncertain transcription', async () => {
    const provider: SpeechRecognitionProvider = {
      transcribe: vi.fn().mockResolvedValue({
        rawTranscript: 'коротко',
        normalizedTranscript: 'коротко',
        status: 'uncertain',
        processingTimeMs: 50,
      } as TranscriptionResult),
    };
    const service = new SpeechService(provider);
    const result = await service.transcribe('/test/path.ogg');
    expect(result.status).toBe('uncertain');
  });

  it('кэширует результат транскрипции и не вызывает провайдер повторно', async () => {
    const provider = createMockProvider();
    const cache = new InMemoryTranscriptionCache();
    const service = new SpeechService(provider, cache);

    // Мокаем computeAudioHash чтобы не обращаться к диску
    vi.spyOn(service, 'computeAudioHash').mockResolvedValue('hash123');

    const result1 = await service.transcribe('/fake/audio.ogg');
    expect(result1.rawTranscript).toBe('тестовый текст');
    expect(provider.transcribe).toHaveBeenCalledTimes(1);

    const result2 = await service.transcribe('/fake/audio.ogg');
    expect(result2.rawTranscript).toBe('тестовый текст');
    expect(result2.cached).toBe(true);
    expect(provider.transcribe).toHaveBeenCalledTimes(1); // Провайдер НЕ вызывался повторно
  });

  it('computes consistent hash directly from audio buffer', () => {
    const service = new SpeechService(createMockProvider());
    const buf1 = Buffer.from('audio sample bytes 123');
    const buf2 = Buffer.from('audio sample bytes 123');
    const buf3 = Buffer.from('different audio sample');

    const hash1 = service.computeAudioHashFromBuffer(buf1);
    const hash2 = service.computeAudioHashFromBuffer(buf2);
    const hash3 = service.computeAudioHashFromBuffer(buf3);

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash1.length).toBe(64);
  });

  it('transcribes audio buffer and caches result without redundant provider invocations', async () => {
    const provider = createMockProvider();
    const cache = new InMemoryTranscriptionCache();
    const service = new SpeechService(provider, { cache, timeoutMs: 10_000 });

    const buffer = Buffer.from('test audio buffer payload');

    const res1 = await service.transcribeBuffer(buffer);
    expect(res1.rawTranscript).toBe('тестовый текст');
    expect(provider.transcribe).toHaveBeenCalledTimes(1);

    // Second call with same buffer should hit cache directly
    const res2 = await service.transcribeBuffer(buffer);
    expect(res2.rawTranscript).toBe('тестовый текст');
    expect(res2.cached).toBe(true);
    expect(provider.transcribe).toHaveBeenCalledTimes(1);
  });

  it('times out if provider takes longer than configured timeoutMs', async () => {
    const hangingProvider: SpeechRecognitionProvider = {
      transcribe: () =>
        new Promise<TranscriptionResult>((resolve) => {
          setTimeout(() => {
            resolve({
              rawTranscript: 'late',
              normalizedTranscript: 'late',
              status: 'ok',
              processingTimeMs: 500,
            });
          }, 500);
        }),
    };
    const service = new SpeechService(hangingProvider, { timeoutMs: 50 });

    await expect(service.transcribe('/dummy.ogg')).rejects.toThrow(
      'Transcription timed out after 50ms',
    );
  });
});

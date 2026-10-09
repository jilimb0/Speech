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
});

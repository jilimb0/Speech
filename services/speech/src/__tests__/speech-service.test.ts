import { describe, expect, it, vi } from 'vitest';
import type { SpeechRecognitionProvider, TranscriptionResult } from '../speech-service.js';
import { SpeechService } from '../speech-service.js';

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
});

import { requireEnv } from '@speech/shared';
import type { SpeechRecognitionProvider, TranscriptionResult } from '../speech-service.js';

/**
 * Провайдер транскрипции через локальный faster-whisper Python microservice.
 * Используется на следующем этапе для снижения стоимости и latency.
 */
export class FasterWhisperProvider implements SpeechRecognitionProvider {
  private readonly serviceUrl: string;

  constructor() {
    this.serviceUrl = requireEnv('FASTER_WHISPER_URL');
  }

  async transcribe(audioFilePath: string): Promise<TranscriptionResult> {
    const startTime = Date.now();

    const response = await fetch(`${this.serviceUrl}/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_path: audioFilePath, language: 'ru' }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`FasterWhisper service error ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as {
      text: string;
      confidence?: number;
    };

    const rawTranscript = data.text.trim();
    const normalizedTranscript = normalizeTranscript(rawTranscript);
    const processingTimeMs = Date.now() - startTime;

    const status =
      rawTranscript.length < 10 || (data.confidence !== undefined && data.confidence < 0.5)
        ? 'uncertain'
        : 'ok';

    return {
      rawTranscript,
      normalizedTranscript,
      status,
      processingTimeMs,
    };
  }
}

function normalizeTranscript(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,!?;:«»"'()\-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

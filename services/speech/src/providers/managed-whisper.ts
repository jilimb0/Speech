import { createReadStream } from 'node:fs';
import { requireEnv } from '@speech/shared';
import type { SpeechRecognitionProvider, TranscriptionResult } from '../speech-service.js';

/**
 * Провайдер транскрипции через OpenAI Whisper API.
 * Используется на старте MVP.
 */
export class ManagedWhisperProvider implements SpeechRecognitionProvider {
  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor() {
    this.apiKey = requireEnv('OPENAI_API_KEY');
    this.apiUrl = 'https://api.openai.com/v1/audio/transcriptions';
  }

  async transcribe(audioFilePath: string): Promise<TranscriptionResult> {
    const startTime = Date.now();

    const formData = new FormData();
    const fileStream = createReadStream(audioFilePath);

    // Node.js 18+ поддерживает FormData нативно, но для стримов нужен Blob
    const chunks: Buffer[] = [];
    for await (const chunk of fileStream) {
      chunks.push(chunk as Buffer);
    }
    const buffer = Buffer.concat(chunks);
    const blob = new Blob([buffer], { type: 'audio/ogg' });

    formData.append('file', blob, 'audio.ogg');
    formData.append('model', 'whisper-1');
    formData.append('language', 'ru');
    formData.append('response_format', 'json');

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Whisper API error ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as { text: string };
    const rawTranscript = data.text.trim();
    const normalizedTranscript = normalizeTranscript(rawTranscript);

    const processingTimeMs = Date.now() - startTime;

    // Помечаем как uncertain если транскрипт слишком короткий
    const status = rawTranscript.length < 10 ? 'uncertain' : 'ok';

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

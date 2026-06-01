import type { TranscriptionStatus } from '@speech/shared';

export interface TranscriptionResult {
  rawTranscript: string;
  normalizedTranscript: string;
  status: TranscriptionStatus;
  processingTimeMs: number;
}

/**
 * Абстракция STT-провайдера.
 * Сейчас: managed Whisper (внешний API).
 * Потом: faster-whisper Python microservice.
 */
export interface SpeechRecognitionProvider {
  transcribe(audioFilePath: string): Promise<TranscriptionResult>;
}

export class SpeechService {
  constructor(private readonly provider: SpeechRecognitionProvider) {}

  async transcribe(audioFilePath: string): Promise<TranscriptionResult> {
    return this.provider.transcribe(audioFilePath);
  }
}

export interface FillerCount {
  filler: string;
  count: number;
}

export interface RepeatedWord {
  word: string;
  count: number;
}

export type SpeechRate = 'slow' | 'moderate' | 'fast';

export type TranscriptionStatus = 'ok' | 'uncertain' | 'failed';

export interface Session {
  id: string;
  userId: string;
  source: 'telegram';
  audioDurationSec: number;
  rawTranscript: string;
  normalizedTranscript: string;
  transcriptionStatus: TranscriptionStatus;
  totalWords: number;
  totalFillers: number;
  fillersPerMinute: number;
  wordsPerMinute: number;
  speechRate: SpeechRate;
  topFillers: FillerCount[];
  repeatedWords: RepeatedWord[];
  sessionScore: number;
  summaryText: string;
  advice: string;
  createdAt: Date;
}

export interface CreateSessionInput {
  userId: string;
  audioDurationSec: number;
  rawTranscript: string;
  normalizedTranscript: string;
  transcriptionStatus: TranscriptionStatus;
  totalWords: number;
  totalFillers: number;
  fillersPerMinute: number;
  wordsPerMinute: number;
  speechRate: SpeechRate;
  topFillers: FillerCount[];
  repeatedWords: RepeatedWord[];
  sessionScore: number;
  summaryText: string;
  advice: string;
}

export interface SessionListItem {
  id: string;
  audioDurationSec: number;
  totalFillers: number;
  fillersPerMinute: number;
  sessionScore: number;
  topFiller: FillerCount | null;
  createdAt: Date;
}

export interface ProgressSummary {
  avgScore7d: number | null;
  avgFillersPerMinute7d: number | null;
  bestScore: number | null;
  totalSessions: number;
  lastSessionDelta: number | null;
}

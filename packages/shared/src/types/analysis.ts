import type { FillerCount, RepeatedWord, SpeechRate } from './session.js';

export interface FillerAnalysisInput {
  normalizedTranscript: string;
  audioDurationSec: number;
  customFillers?: string[];
}

export interface FillerAnalysisResult {
  totalWords: number;
  totalFillers: number;
  fillersPerMinute: number;
  wordsPerMinute: number;
  speechRate: SpeechRate;
  topFillers: FillerCount[];
  repeatedWords: RepeatedWord[];
}

export interface ScoringInput {
  audioDurationSec: number;
  totalFillers: number;
  fillersPerMinute: number;
  wordsPerMinute: number;
  speechRate: SpeechRate;
  topFillers: FillerCount[];
  repeatedWords: RepeatedWord[];
}

export interface ScoringResult {
  sessionScore: number;
  summaryText: string;
  advice: string;
}

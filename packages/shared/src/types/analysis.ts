import type { FillerCount, Language, RepeatedWord, SpeechRate } from './session.js';

export interface AudioSegment {
  start: number;
  end: number;
  text?: string | undefined;
}

export interface PauseMetrics {
  pauseCount: number;
  totalPauseDurationSec: number;
  longestPauseSec: number;
}

export interface OratorExercise {
  title: string;
  description: string;
  targetFiller?: string | undefined;
  practiceText?: string | undefined;
}

export interface AiCoachResult {
  feedback: string;
  exercises: OratorExercise[];
}

export interface FillerAnalysisInput {
  normalizedTranscript: string;
  audioDurationSec: number;
  customFillers?: string[] | undefined;
  language?: Language | undefined;
  segments?: AudioSegment[] | undefined;
}

export interface FillerAnalysisResult {
  totalWords: number;
  totalFillers: number;
  fillersPerMinute: number;
  wordsPerMinute: number;
  speechRate: SpeechRate;
  topFillers: FillerCount[];
  repeatedWords: RepeatedWord[];
  pauseMetrics: PauseMetrics;
}

export interface ScoringInput {
  audioDurationSec: number;
  totalFillers: number;
  fillersPerMinute: number;
  wordsPerMinute: number;
  speechRate: SpeechRate;
  topFillers: FillerCount[];
  repeatedWords: RepeatedWord[];
  pauseMetrics?: PauseMetrics | undefined;
}

export interface ScoringResult {
  sessionScore: number;
  summaryText: string;
  advice: string;
}

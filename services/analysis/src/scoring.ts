import type { ScoringInput, ScoringResult } from '@speech/shared';

/**
 * Формула score:
 * - Базовый score: 100
 * - Штраф за fillers per minute (основной фактор)
 * - Штраф за экстремальный темп речи
 * - Мягкий штраф за доминирование одного паразита
 * - Минимальный floor: 20 (чтобы не демотивировать)
 */

const BASE_SCORE = 100;
const SCORE_FLOOR = 20;

// Штраф за каждый filler per minute сверх порога
const FPM_PENALTY_PER_UNIT = 8;
const FPM_FREE_THRESHOLD = 2; // до 2 fpm — без штрафа

// Штраф за слишком быстрый или медленный темп
const SPEECH_RATE_PENALTY = 5;

// Штраф если один filler занимает >60% от всех
const DOMINANCE_PENALTY = 5;
const DOMINANCE_THRESHOLD = 0.6;

const SCORE_CATEGORIES = [
  { min: 85, label: 'Чистая речь' },
  { min: 70, label: 'Неплохо, но есть повторяющийся мусор' },
  { min: 50, label: 'Слова-паразиты уже заметны' },
  { min: 0, label: 'Речь заметно засорена' },
] as const;

function getScoreLabel(score: number): string {
  for (const category of SCORE_CATEGORIES) {
    if (score >= category.min) return category.label;
  }
  return SCORE_CATEGORIES[SCORE_CATEGORIES.length - 1].label;
}

function buildAdvice(input: ScoringInput): string {
  const { topFillers, speechRate, fillersPerMinute } = input;

  if (topFillers.length === 0) {
    return 'Отличная работа — слов-паразитов почти нет. Попробуй поработать над темпом и паузами.';
  }

  const topFiller = topFillers[0];

  if (fillersPerMinute > 6) {
    return `Попробуй в следующей записи сознательно убрать «${topFiller?.filler ?? ''}» — оно встречается чаще всего.`;
  }

  if (speechRate === 'fast') {
    return 'Темп немного высокий. Попробуй делать короткие паузы между мыслями.';
  }

  if (speechRate === 'slow') {
    return 'Темп немного медленный. Попробуй говорить чуть увереннее и без долгих пауз.';
  }

  return `Обрати внимание на «${topFiller?.filler ?? ''}» — оно встречается чаще всего. Попробуй заменить его паузой.`;
}

export function calculateScore(input: ScoringInput): ScoringResult {
  const { fillersPerMinute, speechRate, topFillers, totalFillers } = input;

  let score = BASE_SCORE;

  // Штраф за fillers per minute
  const fpmOverThreshold = Math.max(0, fillersPerMinute - FPM_FREE_THRESHOLD);
  score -= Math.round(fpmOverThreshold * FPM_PENALTY_PER_UNIT);

  // Штраф за экстремальный темп
  if (speechRate !== 'moderate') {
    score -= SPEECH_RATE_PENALTY;
  }

  // Штраф за доминирование одного паразита
  if (totalFillers > 0 && topFillers.length > 0) {
    const topCount = topFillers[0]?.count ?? 0;
    const dominance = topCount / totalFillers;
    if (dominance > DOMINANCE_THRESHOLD) {
      score -= DOMINANCE_PENALTY;
    }
  }

  const finalScore = Math.max(SCORE_FLOOR, Math.min(100, score));
  const summaryText = getScoreLabel(finalScore);
  const advice = buildAdvice(input);

  return {
    sessionScore: finalScore,
    summaryText,
    advice,
  };
}

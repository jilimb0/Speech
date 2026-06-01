import type { FillerAnalysisInput, FillerAnalysisResult } from '@speech/shared';
import type { FillerCount, RepeatedWord, SpeechRate } from '@speech/shared';
import { ALL_FILLERS } from './filler-dictionary.js';

const SLOW_WPM_THRESHOLD = 100;
const FAST_WPM_THRESHOLD = 160;

// Слова короче этой длины игнорируются при подсчёте повторов
const MIN_REPEATED_WORD_LENGTH = 4;
// Минимальное количество повторений, чтобы слово попало в repeated
const MIN_REPEAT_COUNT = 3;
// Топ N fillers в отчёте
const TOP_FILLERS_LIMIT = 5;
// Топ N повторяющихся слов
const TOP_REPEATED_LIMIT = 5;

/**
 * Нормализует текст: нижний регистр, убирает пунктуацию.
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,!?;:«»"'()\-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Токенизирует нормализованный текст в массив слов.
 */
function tokenize(text: string): string[] {
  return text.split(' ').filter((w) => w.length > 0);
}

/**
 * Определяет темп речи по словам в минуту.
 */
function classifySpeechRate(wpm: number): SpeechRate {
  if (wpm < SLOW_WPM_THRESHOLD) return 'slow';
  if (wpm > FAST_WPM_THRESHOLD) return 'fast';
  return 'moderate';
}

/**
 * Считает вхождения fillers в тексте.
 * Многословные fillers матчатся первыми, чтобы избежать двойного подсчёта.
 * Возвращает карту filler -> count и маску занятых позиций.
 */
function countFillers(
  normalizedText: string,
  customFillers: string[] = [],
): Map<string, number> {
  const fillers = [...customFillers, ...ALL_FILLERS];
  const counts = new Map<string, number>();

  // Работаем с текстом как со строкой для поиска multi-token fillers
  let workingText = normalizedText;

  for (const filler of fillers) {
    const pattern = new RegExp(`\\b${escapeRegex(filler)}\\b`, 'g');
    const matches = workingText.match(pattern);
    if (matches && matches.length > 0) {
      counts.set(filler, (counts.get(filler) ?? 0) + matches.length);
      // Заменяем найденные вхождения плейсхолдером, чтобы не считать дважды
      workingText = workingText.replace(pattern, ' '.repeat(filler.length));
    }
  }

  return counts;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Находит повторяющиеся слова, которые не входят в словарь fillers.
 */
function findRepeatedWords(
  tokens: string[],
  fillerSet: Set<string>,
): RepeatedWord[] {
  const wordCounts = new Map<string, number>();

  for (const token of tokens) {
    if (token.length < MIN_REPEATED_WORD_LENGTH) continue;
    if (fillerSet.has(token)) continue;
    wordCounts.set(token, (wordCounts.get(token) ?? 0) + 1);
  }

  return Array.from(wordCounts.entries())
    .filter(([, count]) => count >= MIN_REPEAT_COUNT)
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_REPEATED_LIMIT)
    .map(([word, count]) => ({ word, count }));
}

/**
 * Основная функция анализа fillers.
 */
export function analyzeFillers(input: FillerAnalysisInput): FillerAnalysisResult {
  const { normalizedTranscript, audioDurationSec, customFillers = [] } = input;

  const normalized = normalizeText(normalizedTranscript);
  const tokens = tokenize(normalized);
  const totalWords = tokens.length;

  const durationMinutes = audioDurationSec / 60;
  const wordsPerMinute = durationMinutes > 0 ? Math.round(totalWords / durationMinutes) : 0;
  const speechRate = classifySpeechRate(wordsPerMinute);

  const fillerCounts = countFillers(normalized, customFillers);

  let totalFillers = 0;
  const topFillers: FillerCount[] = [];

  for (const [filler, count] of fillerCounts.entries()) {
    totalFillers += count;
    topFillers.push({ filler, count });
  }

  topFillers.sort((a, b) => b.count - a.count);
  const limitedTopFillers = topFillers.slice(0, TOP_FILLERS_LIMIT);

  const fillersPerMinute =
    durationMinutes > 0 ? Math.round((totalFillers / durationMinutes) * 10) / 10 : 0;

  // Для repeated words используем все filler-слова как стоп-список
  const fillerTokenSet = new Set<string>(
    [...ALL_FILLERS, ...customFillers].flatMap((f) => f.split(' ')),
  );
  const repeatedWords = findRepeatedWords(tokens, fillerTokenSet);

  return {
    totalWords,
    totalFillers,
    fillersPerMinute,
    wordsPerMinute,
    speechRate,
    topFillers: limitedTopFillers,
    repeatedWords,
  };
}

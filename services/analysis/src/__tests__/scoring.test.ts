import { describe, expect, it } from 'vitest';
import { calculateScore } from '../scoring.js';

const baseInput = {
  audioDurationSec: 45,
  totalWords: 100,
  repeatedWords: [],
};

describe('calculateScore', () => {
  it('возвращает высокий score при чистой речи', () => {
    const result = calculateScore({
      ...baseInput,
      totalFillers: 1,
      fillersPerMinute: 1.3,
      wordsPerMinute: 130,
      speechRate: 'moderate',
      topFillers: [{ filler: 'ну', count: 1 }],
    });

    expect(result.sessionScore).toBeGreaterThanOrEqual(85);
  });

  it('снижает score при высоком fpm', () => {
    const result = calculateScore({
      ...baseInput,
      totalFillers: 15,
      fillersPerMinute: 10,
      wordsPerMinute: 130,
      speechRate: 'moderate',
      topFillers: [{ filler: 'ну', count: 15 }],
    });

    expect(result.sessionScore).toBeLessThan(70);
  });

  it('score не падает ниже floor (20)', () => {
    const result = calculateScore({
      ...baseInput,
      totalFillers: 100,
      fillersPerMinute: 50,
      wordsPerMinute: 200,
      speechRate: 'fast',
      topFillers: [{ filler: 'ну', count: 100 }],
    });

    expect(result.sessionScore).toBeGreaterThanOrEqual(20);
  });

  it('score не превышает 100', () => {
    const result = calculateScore({
      ...baseInput,
      totalFillers: 0,
      fillersPerMinute: 0,
      wordsPerMinute: 130,
      speechRate: 'moderate',
      topFillers: [],
    });

    expect(result.sessionScore).toBeLessThanOrEqual(100);
  });

  it('штрафует за быстрый темп', () => {
    const moderate = calculateScore({
      ...baseInput,
      totalFillers: 2,
      fillersPerMinute: 2,
      wordsPerMinute: 130,
      speechRate: 'moderate',
      topFillers: [{ filler: 'ну', count: 2 }],
    });

    const fast = calculateScore({
      ...baseInput,
      totalFillers: 2,
      fillersPerMinute: 2,
      wordsPerMinute: 200,
      speechRate: 'fast',
      topFillers: [{ filler: 'ну', count: 2 }],
    });

    expect(fast.sessionScore).toBeLessThan(moderate.sessionScore);
  });

  it('возвращает summaryText и advice', () => {
    const result = calculateScore({
      ...baseInput,
      totalFillers: 5,
      fillersPerMinute: 4,
      wordsPerMinute: 130,
      speechRate: 'moderate',
      topFillers: [{ filler: 'ну', count: 5 }],
    });

    expect(result.summaryText).toBeTruthy();
    expect(result.advice).toBeTruthy();
  });

  it('похожие записи дают близкий score (стабильность)', () => {
    const input = {
      ...baseInput,
      totalFillers: 5,
      fillersPerMinute: 3.5,
      wordsPerMinute: 125,
      speechRate: 'moderate' as const,
      topFillers: [{ filler: 'ну', count: 5 }],
    };

    const r1 = calculateScore(input);
    const r2 = calculateScore(input);

    expect(r1.sessionScore).toBe(r2.sessionScore);
  });
});

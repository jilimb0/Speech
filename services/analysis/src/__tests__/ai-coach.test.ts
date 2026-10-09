import { describe, expect, it } from 'vitest';
import { generateAiCoach, generateFallbackCoach } from '../ai-coach.js';

describe('AI Coach & Orator Exercises', () => {
  it('генерирует фолбэк-упражнение под слово «ну»', () => {
    const result = generateFallbackCoach({
      topFillers: [{ filler: 'ну', count: 5 }],
      wordsPerMinute: 120,
      speechRate: 'moderate',
    });

    expect(result.exercises.length).toBeGreaterThanOrEqual(1);
    expect(result.exercises[0]?.targetFiller).toBe('ну');
    expect(result.exercises[0]?.title).toContain('Вдох вместо слова');
    expect(result.feedback).toContain('ну');
  });

  it('генерирует упражнение под высокий темп речи', () => {
    const result = generateFallbackCoach({
      topFillers: [],
      wordsPerMinute: 180,
      speechRate: 'fast',
    });

    expect(result.exercises.some((e) => e.title.includes('Двойной ритм'))).toBe(true);
  });

  it('генерирует упражнение под частые паузы зависания', () => {
    const result = generateFallbackCoach({
      topFillers: [{ filler: 'как бы', count: 2 }],
      wordsPerMinute: 90,
      speechRate: 'slow',
      pauseMetrics: {
        pauseCount: 4,
        totalPauseDurationSec: 8.5,
        longestPauseSec: 3.2,
      },
    });

    expect(result.exercises.some((e) => e.title.includes('Мысленный мостик'))).toBe(true);
  });

  it('возвращает общее упражнение на дикцию если речь идеально чистая', () => {
    const result = generateFallbackCoach({
      topFillers: [],
      wordsPerMinute: 130,
      speechRate: 'moderate',
    });

    expect(result.exercises[0]?.title).toContain('Разминка оратора');
  });

  it('generateAiCoach возвращает валидный результат даже без внешнего API', async () => {
    const result = await generateAiCoach({
      topFillers: [{ filler: 'типа', count: 3 }],
      wordsPerMinute: 140,
      speechRate: 'moderate',
    });

    expect(result).toBeDefined();
    expect(result.feedback).toBeDefined();
    expect(result.exercises.length).toBeGreaterThanOrEqual(1);
  });
});

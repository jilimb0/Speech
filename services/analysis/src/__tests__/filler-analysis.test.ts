import { describe, expect, it } from 'vitest';
import { analyzeFillers } from '../filler-analysis.js';

describe('analyzeFillers', () => {
  it('считает однословные fillers', () => {
    const result = analyzeFillers({
      normalizedTranscript: 'ну я думаю ну это хорошо ну вот',
      audioDurationSec: 10,
    });

    const nuFiller = result.topFillers.find((f) => f.filler === 'ну');
    expect(nuFiller?.count).toBe(3);
    expect(result.totalFillers).toBeGreaterThanOrEqual(3);
  });

  it('считает многословные fillers без двойного подсчёта', () => {
    const result = analyzeFillers({
      normalizedTranscript: 'как бы это хорошо как бы понимаешь',
      audioDurationSec: 10,
    });

    const kakBy = result.topFillers.find((f) => f.filler === 'как бы');
    expect(kakBy?.count).toBe(2);

    // "как" и "бы" не должны считаться отдельно
    const kakSingle = result.topFillers.find((f) => f.filler === 'как');
    expect(kakSingle).toBeUndefined();
  });

  it('считает fillers per minute корректно', () => {
    // 6 fillers за 60 секунд = 6 fpm
    const result = analyzeFillers({
      normalizedTranscript: 'ну ну ну ну ну ну это хорошо',
      audioDurationSec: 60,
    });

    expect(result.fillersPerMinute).toBe(6);
  });

  it('возвращает пустые topFillers если fillers нет', () => {
    const result = analyzeFillers({
      normalizedTranscript: 'сегодня хорошая погода и я рад этому',
      audioDurationSec: 10,
    });

    expect(result.totalFillers).toBe(0);
    expect(result.topFillers).toHaveLength(0);
  });

  it('классифицирует медленный темп', () => {
    // 50 слов за 60 секунд = 50 wpm — медленно
    const words = Array.from({ length: 50 }, (_, i) => `слово${i}`).join(' ');
    const result = analyzeFillers({
      normalizedTranscript: words,
      audioDurationSec: 60,
    });

    expect(result.speechRate).toBe('slow');
  });

  it('классифицирует быстрый темп', () => {
    // 200 слов за 60 секунд = 200 wpm — быстро
    const words = Array.from({ length: 200 }, (_, i) => `слово${i}`).join(' ');
    const result = analyzeFillers({
      normalizedTranscript: words,
      audioDurationSec: 60,
    });

    expect(result.speechRate).toBe('fast');
  });

  it('классифицирует умеренный темп', () => {
    // 130 слов за 60 секунд = 130 wpm — умеренно
    const words = Array.from({ length: 130 }, (_, i) => `слово${i}`).join(' ');
    const result = analyzeFillers({
      normalizedTranscript: words,
      audioDurationSec: 60,
    });

    expect(result.speechRate).toBe('moderate');
  });

  it('учитывает кастомные fillers', () => {
    const result = analyzeFillers({
      normalizedTranscript: 'окей окей это хорошо окей',
      audioDurationSec: 10,
      customFillers: ['окей'],
    });

    const okFiller = result.topFillers.find((f) => f.filler === 'окей');
    expect(okFiller?.count).toBe(3);
  });

  it('находит повторяющиеся слова вне словаря', () => {
    const result = analyzeFillers({
      normalizedTranscript:
        'проект проект проект это важный проект для нашей команды',
      audioDurationSec: 10,
    });

    const repeated = result.repeatedWords.find((w) => w.word === 'проект');
    expect(repeated?.count).toBeGreaterThanOrEqual(3);
  });

  it('обрабатывает пустой транскрипт', () => {
    const result = analyzeFillers({
      normalizedTranscript: '',
      audioDurationSec: 30,
    });

    expect(result.totalWords).toBe(0);
    expect(result.totalFillers).toBe(0);
    expect(result.fillersPerMinute).toBe(0);
  });

  it('обрабатывает "то есть" как единый filler', () => {
    const result = analyzeFillers({
      normalizedTranscript: 'то есть это хорошо то есть понятно',
      audioDurationSec: 10,
    });

    const toEst = result.topFillers.find((f) => f.filler === 'то есть');
    expect(toEst?.count).toBe(2);
  });
});

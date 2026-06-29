import { describe, expect, it } from 'vitest';
import { analyzeFillers } from '../filler-analysis.js';

describe('analyzeFillers (EN)', () => {
  it('detects single-word English fillers', () => {
    const result = analyzeFillers({
      normalizedTranscript: 'like I think like this is um really good like you know',
      audioDurationSec: 10,
      language: 'en',
    });
    expect(result.totalFillers).toBeGreaterThanOrEqual(3);
    const likeFiller = result.topFillers.find((f) => f.filler === 'like');
    expect(likeFiller?.count).toBeGreaterThanOrEqual(3);
  });

  it('detects multi-word English fillers', () => {
    const result = analyzeFillers({
      normalizedTranscript: 'you know this is great you know I mean it',
      audioDurationSec: 10,
      language: 'en',
    });
    const youKnow = result.topFillers.find((f) => f.filler === 'you know');
    expect(youKnow?.count).toBe(2);
  });

  it('returns empty fillers for clean English speech', () => {
    const result = analyzeFillers({
      normalizedTranscript: 'this project delivers great value to our customers',
      audioDurationSec: 10,
      language: 'en',
    });
    expect(result.totalFillers).toBe(0);
  });

  it('classifies English speech rate', () => {
    const words = Array.from({ length: 200 }, (_, i) => `word${i}`).join(' ');
    const result = analyzeFillers({
      normalizedTranscript: words,
      audioDurationSec: 60,
      language: 'en',
    });
    expect(result.speechRate).toBe('fast');
  });
});

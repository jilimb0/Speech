import { describe, expect, it, vi } from 'vitest';

const mockSql = vi.fn();

vi.mock('../src/db.js', () => ({
  getDb: vi.fn(() => mockSql),
}));

import {
  countTodaySessions,
  createSession,
  getProgressSummary,
  getSessionById,
  getSessionsByUserId,
} from '../src/session-service.js';

const mockRow = {
  id: 's1',
  user_id: 'u1',
  source: 'telegram',
  audio_duration_sec: 30,
  raw_transcript: 'test',
  normalized_transcript: 'test',
  transcription_status: 'completed',
  total_words: 100,
  total_fillers: 5,
  fillers_per_minute: 10,
  words_per_minute: 200,
  speech_rate: 'moderate',
  top_fillers_json: JSON.stringify([{ filler: 'ну', count: 3 }]),
  repeated_words_json: JSON.stringify([]),
  session_score: 75,
  summary_text: 'Good',
  advice: 'Keep practicing',
  created_at: new Date(),
};

describe('createSession', () => {
  it('creates and returns a session', async () => {
    mockSql.mockResolvedValueOnce([mockRow]);
    const input = {
      userId: 'u1',
      audioDurationSec: 30,
      rawTranscript: 'test',
      normalizedTranscript: 'test',
      transcriptionStatus: 'ok' as const,
      totalWords: 100,
      totalFillers: 5,
      fillersPerMinute: 10,
      wordsPerMinute: 200,
      speechRate: 'moderate' as const,
      topFillers: [{ filler: 'ну', count: 3 }],
      repeatedWords: [],
      sessionScore: 75,
      summaryText: 'Good',
      advice: 'Keep practicing',
    };
    const session = await createSession(input);
    expect(session.id).toBe('s1');
    expect(session.sessionScore).toBe(75);
  });

  it('throws on empty result', async () => {
    mockSql.mockResolvedValueOnce([]);
    await expect(
      createSession({} as unknown as import('@speech/shared').CreateSessionInput),
    ).rejects.toThrow('Failed to create session');
  });
});

describe('getSessionById', () => {
  it('returns session when found', async () => {
    mockSql.mockResolvedValueOnce([mockRow]);
    const session = await getSessionById('s1');
    expect(session).not.toBeNull();
    expect(session?.id).toBe('s1');
  });

  it('returns null when not found', async () => {
    mockSql.mockResolvedValueOnce([]);
    expect(await getSessionById('nonexistent')).toBeNull();
  });
});

describe('getSessionsByUserId', () => {
  it('returns sessions list', async () => {
    mockSql.mockResolvedValueOnce([
      {
        id: 's1',
        audio_duration_sec: 30,
        total_fillers: 5,
        fillers_per_minute: 10,
        session_score: 75,
        top_fillers_json: JSON.stringify([{ filler: 'ну', count: 3 }]),
        created_at: new Date(),
      },
    ]);
    const sessions = await getSessionsByUserId('u1');
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.id).toBe('s1');
  });
});

describe('getProgressSummary', () => {
  it('returns progress with delta', async () => {
    mockSql.mockResolvedValueOnce([
      { avg_score_7d: 80, avg_fpm_7d: 5, best_score: 95, total_sessions: 10 },
    ]);
    mockSql.mockResolvedValueOnce([{ session_score: 85 }, { session_score: 75 }]);
    const summary = await getProgressSummary('u1');
    expect(summary.totalSessions).toBe(10);
    expect(summary.lastSessionDelta).toBe(10);
  });

  it('returns null delta with single session', async () => {
    mockSql.mockResolvedValueOnce([
      { avg_score_7d: null, avg_fpm_7d: null, best_score: 80, total_sessions: 1 },
    ]);
    mockSql.mockResolvedValueOnce([{ session_score: 80 }]);
    const summary = await getProgressSummary('u1');
    expect(summary.lastSessionDelta).toBeNull();
  });
});

describe('countTodaySessions', () => {
  it('returns count', async () => {
    mockSql.mockResolvedValueOnce([{ count: 3 }]);
    expect(await countTodaySessions('u1')).toBe(3);
  });

  it('returns 0 when no sessions', async () => {
    mockSql.mockResolvedValueOnce([{ count: 0 }]);
    expect(await countTodaySessions('u1')).toBe(0);
  });
});

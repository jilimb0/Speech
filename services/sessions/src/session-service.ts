import type { CreateSessionInput, ProgressSummary, Session, SessionListItem } from '@speech/shared';
import { getDb } from './db.js';

interface SessionRow {
  id: string;
  user_id: string;
  source: string;
  audio_duration_sec: number;
  raw_transcript: string;
  normalized_transcript: string;
  transcription_status: string;
  total_words: number;
  total_fillers: number;
  fillers_per_minute: number;
  words_per_minute: number;
  speech_rate: string;
  top_fillers_json: unknown;
  repeated_words_json: unknown;
  session_score: number;
  summary_text: string;
  advice: string;
  created_at: Date;
}

function rowToSession(row: SessionRow): Session {
  return {
    id: row.id,
    userId: row.user_id,
    source: 'telegram',
    audioDurationSec: row.audio_duration_sec,
    rawTranscript: row.raw_transcript,
    normalizedTranscript: row.normalized_transcript,
    transcriptionStatus: row.transcription_status as Session['transcriptionStatus'],
    totalWords: row.total_words,
    totalFillers: row.total_fillers,
    fillersPerMinute: row.fillers_per_minute,
    wordsPerMinute: row.words_per_minute,
    speechRate: row.speech_rate as Session['speechRate'],
    topFillers: row.top_fillers_json as Session['topFillers'],
    repeatedWords: row.repeated_words_json as Session['repeatedWords'],
    sessionScore: row.session_score,
    summaryText: row.summary_text,
    advice: row.advice,
    createdAt: row.created_at,
  };
}

export async function createSession(input: CreateSessionInput): Promise<Session> {
  const sql = getDb();

  const rows = await sql<SessionRow[]>`
    INSERT INTO sessions (
      user_id, source, audio_duration_sec,
      raw_transcript, normalized_transcript, transcription_status,
      total_words, total_fillers, fillers_per_minute, words_per_minute,
      speech_rate, top_fillers_json, repeated_words_json,
      session_score, summary_text, advice
    ) VALUES (
      ${input.userId}, 'telegram', ${input.audioDurationSec},
      ${input.rawTranscript}, ${input.normalizedTranscript}, ${input.transcriptionStatus},
      ${input.totalWords}, ${input.totalFillers}, ${input.fillersPerMinute}, ${input.wordsPerMinute},
      ${input.speechRate}, ${JSON.stringify(input.topFillers)}, ${JSON.stringify(input.repeatedWords)},
      ${input.sessionScore}, ${input.summaryText}, ${input.advice}
    )
    RETURNING *
  `;

  const row = rows[0];
  if (!row) throw new Error('Failed to create session');
  return rowToSession(row);
}

export async function getSessionById(id: string): Promise<Session | null> {
  const sql = getDb();

  const rows = await sql<SessionRow[]>`
    SELECT * FROM sessions WHERE id = ${id}
  `;

  const row = rows[0];
  return row ? rowToSession(row) : null;
}

export async function getSessionsByUserId(
  userId: string,
  limit = 20,
  offset = 0,
): Promise<SessionListItem[]> {
  const sql = getDb();

  const rows = await sql<
    {
      id: string;
      audio_duration_sec: number;
      total_fillers: number;
      fillers_per_minute: number;
      session_score: number;
      top_fillers_json: unknown;
      created_at: Date;
    }[]
  >`
    SELECT id, audio_duration_sec, total_fillers, fillers_per_minute,
           session_score, top_fillers_json, created_at
    FROM sessions
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  return rows.map((row) => {
    const topFillers = row.top_fillers_json as Session['topFillers'];
    return {
      id: row.id,
      audioDurationSec: row.audio_duration_sec,
      totalFillers: row.total_fillers,
      fillersPerMinute: row.fillers_per_minute,
      sessionScore: row.session_score,
      topFiller: topFillers[0] ?? null,
      createdAt: row.created_at,
    };
  });
}

export async function getProgressSummary(userId: string): Promise<ProgressSummary> {
  const sql = getDb();

  const [stats] = await sql<
    {
      avg_score_7d: number | null;
      avg_fpm_7d: number | null;
      best_score: number | null;
      total_sessions: number;
    }[]
  >`
    SELECT
      AVG(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN session_score END) AS avg_score_7d,
      AVG(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN fillers_per_minute END) AS avg_fpm_7d,
      MAX(session_score) AS best_score,
      COUNT(*) AS total_sessions
    FROM sessions
    WHERE user_id = ${userId}
  `;

  // Дельта между последними двумя сессиями
  const lastTwo = await sql<{ session_score: number }[]>`
    SELECT session_score FROM sessions
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT 2
  `;

  let lastSessionDelta: number | null = null;
  if (lastTwo.length === 2 && lastTwo[0] && lastTwo[1]) {
    lastSessionDelta = lastTwo[0].session_score - lastTwo[1].session_score;
  }

  return {
    avgScore7d: stats?.avg_score_7d ? Math.round(stats.avg_score_7d) : null,
    avgFillersPerMinute7d: stats?.avg_fpm_7d ? Math.round(stats.avg_fpm_7d * 10) / 10 : null,
    bestScore: stats?.best_score ?? null,
    totalSessions: Number(stats?.total_sessions ?? 0),
    lastSessionDelta,
  };
}

export async function countTodaySessions(userId: string): Promise<number> {
  const sql = getDb();

  const [row] = await sql<{ count: number }[]>`
    SELECT COUNT(*) AS count FROM sessions
    WHERE user_id = ${userId}
      AND created_at >= CURRENT_DATE
  `;

  return Number(row?.count ?? 0);
}

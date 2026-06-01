-- Migration 001: Initial schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users
CREATE TABLE IF NOT EXISTS users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id BIGINT UNIQUE NOT NULL,
  username         TEXT,
  first_name       TEXT,
  plan             TEXT NOT NULL DEFAULT 'free'
                     CHECK (plan IN ('free', 'premium', 'early_access')),
  first_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  custom_filler_list TEXT[] NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_users_telegram_user_id ON users (telegram_user_id);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source                 TEXT NOT NULL DEFAULT 'telegram',
  audio_duration_sec     NUMERIC(6,2) NOT NULL,
  raw_transcript         TEXT NOT NULL DEFAULT '',
  normalized_transcript  TEXT NOT NULL DEFAULT '',
  transcription_status   TEXT NOT NULL DEFAULT 'ok'
                           CHECK (transcription_status IN ('ok', 'uncertain', 'failed')),
  total_words            INTEGER NOT NULL DEFAULT 0,
  total_fillers          INTEGER NOT NULL DEFAULT 0,
  fillers_per_minute     NUMERIC(6,2) NOT NULL DEFAULT 0,
  words_per_minute       INTEGER NOT NULL DEFAULT 0,
  speech_rate            TEXT NOT NULL DEFAULT 'moderate'
                           CHECK (speech_rate IN ('slow', 'moderate', 'fast')),
  top_fillers_json       JSONB NOT NULL DEFAULT '[]',
  repeated_words_json    JSONB NOT NULL DEFAULT '[]',
  session_score          INTEGER NOT NULL DEFAULT 0
                           CHECK (session_score BETWEEN 0 AND 100),
  summary_text           TEXT NOT NULL DEFAULT '',
  advice                 TEXT NOT NULL DEFAULT '',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user_created ON sessions (user_id, created_at DESC);

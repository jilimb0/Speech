-- Migration 002: Add pause metrics and AI coach exercises to sessions
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS pause_metrics_json JSONB DEFAULT '{}';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS exercises_json JSONB DEFAULT '[]';

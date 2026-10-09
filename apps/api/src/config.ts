import { getEnv, requireEnv } from '@speech/shared';

export const config = {
  port: Number(getEnv('PORT', '3000')),
  host: getEnv('HOST', '0.0.0.0'),
  telegramBotToken: requireEnv('TELEGRAM_BOT_TOKEN'),
  telegramBotUsername: requireEnv('TELEGRAM_BOT_USERNAME'),
  webAppUrl: requireEnv('WEB_APP_URL'),
  freeDailySessionLimit: Number(getEnv('FREE_DAILY_SESSION_LIMIT', '2')),
  minAudioDurationSec: Number(getEnv('MIN_AUDIO_DURATION_SEC', '15')),
  maxAudioDurationSec: Number(getEnv('MAX_AUDIO_DURATION_SEC', '90')),
  speechProvider: getEnv('SPEECH_PROVIDER', 'managed'),
  fasterWhisperUrl: getEnv('FASTER_WHISPER_URL', 'http://localhost:8001'),
  premiumStarPrice: Number(getEnv('PREMIUM_STAR_PRICE', '50')),
  aiBaseUrl: getEnv('AI_BASE_URL', getEnv('OPENCODE_API_URL', 'https://api.opencode.ai/v1')),
  aiApiKey: getEnv('AI_API_KEY', getEnv('OPENCODE_API_KEY', '')),
  aiModel: getEnv('AI_MODEL', 'gpt-4o-mini'),
} as const;

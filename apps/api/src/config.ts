import { getEnv, requireEnv } from '@speech/shared';

export const config = {
  port: Number(getEnv('PORT', '3000')),
  host: getEnv('HOST', '0.0.0.0'),
  telegramBotToken: requireEnv('TELEGRAM_BOT_TOKEN'),
  webAppUrl: requireEnv('WEB_APP_URL'),
  freeDailySessionLimit: Number(getEnv('FREE_DAILY_SESSION_LIMIT', '2')),
  minAudioDurationSec: Number(getEnv('MIN_AUDIO_DURATION_SEC', '15')),
  maxAudioDurationSec: Number(getEnv('MAX_AUDIO_DURATION_SEC', '90')),
} as const;

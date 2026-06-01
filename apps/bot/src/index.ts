/**
 * Bot entry point для dev-режима (polling).
 * В production бот работает через webhook в apps/api.
 */
import { requireEnv } from '@speech/shared';

const _token = requireEnv('TELEGRAM_BOT_TOKEN');
const _apiUrl = requireEnv('API_URL');

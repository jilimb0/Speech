/**
 * Bot entry point для dev-режима (polling).
 * В production бот работает через webhook в apps/api.
 */
import { requireEnv } from '@speech/shared';

const token = requireEnv('TELEGRAM_BOT_TOKEN');
const apiUrl = requireEnv('API_URL');

console.log(`Bot dev mode: forwarding to API at ${apiUrl}`);
console.log(`Token: ${token.slice(0, 8)}...`);
console.log('In production, use webhook mode via apps/api');

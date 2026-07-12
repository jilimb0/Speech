import type { BotClient } from '@tgwrapper/core';
import { createBotClient } from '@tgwrapper/core';
import { config } from '../config.js';
import { log } from '../log.js';
import { registerPaymentHandlers } from './handlers/payments.js';
import { registerCallbackRouter } from './routers/callback-router.js';
import { registerMessageRouter } from './routers/message-router.js';

export type { BotClient };

export async function createBot(): Promise<BotClient> {
  const bot = createBotClient({
    token: config.telegramBotToken,
    mode: 'polling',
    polling: {
      timeoutSeconds: 30,
      limit: 100,
    },
  });

  registerMessageRouter(bot);
  registerCallbackRouter(bot);
  registerPaymentHandlers(bot);

  bot.start().catch((error) => {
    log.error({ err: error }, 'Bot polling failed');
  });
  return bot;
}

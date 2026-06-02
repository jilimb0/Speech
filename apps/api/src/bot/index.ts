import { createBotClient } from '@jilimb0/tgwrapper';
import type { BotClient } from '@jilimb0/tgwrapper';
import { config } from '../config.js';
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

  return bot;
}

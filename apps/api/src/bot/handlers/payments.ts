import { upsertUser } from '@speech/sessions';
import type { BotClient } from '@tgwrapper/core';
import { log } from '../../log.js';
import { getApiClient } from '../telegram-api.js';

export function registerPaymentHandlers(bot: BotClient): void {
  const api = getApiClient();

  bot.on('update', async (update) => {
    const pq = (update as Record<string, unknown>).pre_checkout_query;
    if (pq && typeof pq === 'object' && pq !== null) {
      const id = (pq as Record<string, unknown>).id;
      if (typeof id === 'string') {
        log.info({ preCheckoutQueryId: id }, 'Pre-checkout query received');
        await api.callApiUnsafe('answerPreCheckoutQuery', {
          pre_checkout_query_id: id,
          ok: true,
        });
      }
    }
  });

  bot.on('message', async (msg) => {
    const sp = (msg as Record<string, unknown>).successful_payment;
    if (sp && typeof sp === 'object' && sp !== null) {
      const payload = (sp as Record<string, unknown>).invoice_payload;
      const currency = (sp as Record<string, unknown>).currency;
      const totalAmount = (sp as Record<string, unknown>).total_amount;

      log.info({ payload, currency, totalAmount }, 'Successful payment received');

      const match = typeof payload === 'string' ? payload.match(/^premium_(\d+)_/) : null;
      if (match) {
        const telegramUserId = Number(match[1]);
        await upsertUser({
          telegramUserId,
          plan: 'premium',
        }).catch((err) => {
          log.error({ err, telegramUserId }, 'Failed to update user after payment');
        });
      }
    }
  });
}

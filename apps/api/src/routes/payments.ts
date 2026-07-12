import type { FastifyInstance } from 'fastify';
import { getApiClient } from '../bot/telegram-api.js';
import { config } from '../config.js';

export async function paymentRoutes(app: FastifyInstance): Promise<void> {
  app.post('/payments/create-invoice', async (request, _reply) => {
    const api = getApiClient();
    const invoice = await api.callApiUnsafe<{ result: string }>('createInvoiceLink', {
      title: 'Чище Премиум',
      description:
        'Безлимитный доступ ко всем функциям анализа речи, включая неограниченные сессии и расширенную статистику.',
      payload: `premium_${request.telegramUserId}_${Date.now()}`,
      currency: 'XTR',
      prices: [{ label: 'Премиум навсегда', amount: config.premiumStarPrice }],
      provider_token: '',
    });

    return { ok: true, data: { link: invoice.result } };
  });
}

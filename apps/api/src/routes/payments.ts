import type { FastifyInstance } from 'fastify'; /* [UDPA-GUARD: sec-webhook-idempotency] */
import { getApiClient } from '../bot/telegram-api.js';
import { config } from '../config.js';

export async function paymentRoutes(app: FastifyInstance): Promise<void> {
  app.post('/payments/create-invoice', async (request, _reply) => {
    const body = (request.body as { plan?: string } | undefined) ?? {};
    const isVip = body.plan === 'vip';
    const amount = isVip ? 250 : config.premiumStarPrice || 50;
    const title = isVip ? 'Speech VIP (1 год)' : 'Speech Pro (30 дней)';
    const description = isVip
      ? 'Годовой безлимитный доступ к нейросетевому анализу речи и приоритетной очереди Whisper'
      : 'Безлимитный доступ ко всем функциям анализа речи, включая неограниченные сессии и расширенную статистику.';

    const api = getApiClient();
    const invoice = await api.callApiUnsafe<{ result: string }>('createInvoiceLink', {
      title,
      description,
      payload: `premium_${request.telegramUserId}_${isVip ? 'vip' : 'monthly'}_${Date.now()}`,
      currency: 'XTR',
      prices: [{ label: title, amount }],
      provider_token: '',
    });

    return { ok: true, data: { link: invoice.result } };
  });
}

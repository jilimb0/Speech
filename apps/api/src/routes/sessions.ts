import {
  getProgressSummary,
  getSessionById,
  getSessionsByUserId,
  getUserByTelegramId,
} from '@speech/sessions';
import type { FastifyInstance } from 'fastify';

/**
 * Валидация Telegram initData для Mini App.
 * Проверяет HMAC-SHA256 подпись по алгоритму Telegram.
 */
async function validateTelegramInitData(
  initData: string,
  botToken: string,
): Promise<{ userId: number; username?: string | null } | null> {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;

  params.delete('hash');

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const encoder = new TextEncoder();
  const secretKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode('WebAppData'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const tokenKey = await crypto.subtle.sign('HMAC', secretKey, encoder.encode(botToken));

  const dataKey = await crypto.subtle.importKey(
    'raw',
    tokenKey,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign('HMAC', dataKey, encoder.encode(dataCheckString));

  const expectedHash = Buffer.from(signature).toString('hex');

  if (expectedHash !== hash) return null;

  const userStr = params.get('user');
  if (!userStr) return null;

  const userObj = JSON.parse(userStr) as { id: number; username?: string };
  return { userId: userObj.id, username: userObj.username ?? null };
}

export async function sessionRoutes(app: FastifyInstance): Promise<void> {
  // Middleware: проверяем Telegram initData
  app.addHook('preHandler', async (request, reply) => {
    const initData = request.headers['x-telegram-init-data'] as string | undefined;
    if (!initData) {
      return reply.code(401).send({ ok: false, error: 'Missing initData' });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return reply.code(500).send({ ok: false, error: 'Server misconfiguration' });
    }

    const telegramUser = await validateTelegramInitData(initData, botToken);
    if (!telegramUser) {
      return reply.code(401).send({ ok: false, error: 'Invalid initData' });
    }

    // Прикрепляем к request
    (request as typeof request & { telegramUserId: number }).telegramUserId = telegramUser.userId;
  });

  // GET /api/me
  app.get('/api/me', async (request, reply) => {
    const telegramUserId = (request as typeof request & { telegramUserId: number }).telegramUserId;
    const user = await getUserByTelegramId(telegramUserId);
    if (!user) return reply.code(404).send({ ok: false, error: 'User not found' });
    return { ok: true, data: user };
  });

  // GET /api/sessions
  app.get<{ Querystring: { limit?: string; offset?: string } }>(
    '/api/sessions',
    async (request, reply) => {
      const telegramUserId = (request as typeof request & { telegramUserId: number })
        .telegramUserId;
      const user = await getUserByTelegramId(telegramUserId);
      if (!user) return reply.code(404).send({ ok: false, error: 'User not found' });

      const limit = Math.min(Number(request.query.limit ?? 20), 50);
      const offset = Number(request.query.offset ?? 0);

      const sessions = await getSessionsByUserId(user.id, limit, offset);
      return { ok: true, data: sessions };
    },
  );

  // GET /api/sessions/:id
  app.get<{ Params: { id: string } }>('/api/sessions/:id', async (request, reply) => {
    const telegramUserId = (request as typeof request & { telegramUserId: number }).telegramUserId;
    const user = await getUserByTelegramId(telegramUserId);
    if (!user) return reply.code(404).send({ ok: false, error: 'User not found' });

    const session = await getSessionById(request.params.id);
    if (!session || session.userId !== user.id) {
      return reply.code(404).send({ ok: false, error: 'Session not found' });
    }

    return { ok: true, data: session };
  });

  // GET /api/progress/summary
  app.get('/api/progress/summary', async (request, reply) => {
    const telegramUserId = (request as typeof request & { telegramUserId: number }).telegramUserId;
    const user = await getUserByTelegramId(telegramUserId);
    if (!user) return reply.code(404).send({ ok: false, error: 'User not found' });

    const summary = await getProgressSummary(user.id);
    return { ok: true, data: summary };
  });
}

import {
  getProgressSummary,
  getSessionById,
  getSessionsByUserId,
  getUserByTelegramId,
} from '@speech/sessions';
import type { FastifyInstance } from 'fastify';

/**
 * Validates Telegram Mini App initData using HMAC-SHA256.
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
async function validateInitData(
  initData: string,
  botToken: string,
): Promise<{ telegramUserId: number } | null> {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;

  params.delete('hash');

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const encoder = new TextEncoder();

  const webAppDataKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode('WebAppData'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const tokenBytes = await crypto.subtle.sign('HMAC', webAppDataKey, encoder.encode(botToken));

  const secretKey = await crypto.subtle.importKey(
    'raw',
    tokenBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign('HMAC', secretKey, encoder.encode(dataCheckString));

  const expectedHash = Buffer.from(signature).toString('hex');
  if (expectedHash !== hash) return null;

  const userStr = params.get('user');
  if (!userStr) return null;

  const userObj = JSON.parse(userStr) as { id: number };
  return { telegramUserId: userObj.id };
}

// Extend Fastify request with auth context
declare module 'fastify' {
  interface FastifyRequest {
    telegramUserId: number;
  }
}

export async function sessionRoutes(app: FastifyInstance): Promise<void> {
  // Auth hook — validate Telegram initData on every request
  app.addHook('preHandler', async (request, reply) => {
    const initData = request.headers['x-telegram-init-data'];
    if (!initData || typeof initData !== 'string') {
      return reply.code(401).send({ ok: false, error: 'Missing initData' });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return reply.code(500).send({ ok: false, error: 'Server misconfiguration' });
    }

    const auth = await validateInitData(initData, botToken);
    if (!auth) {
      return reply.code(401).send({ ok: false, error: 'Invalid initData' });
    }

    request.telegramUserId = auth.telegramUserId;
  });

  // GET /api/me
  app.get('/api/me', async (request, reply) => {
    const user = await getUserByTelegramId(request.telegramUserId);
    if (!user) return reply.code(404).send({ ok: false, error: 'User not found' });
    return { ok: true, data: user };
  });

  // GET /api/sessions?limit=&offset=
  app.get<{ Querystring: { limit?: string; offset?: string } }>(
    '/api/sessions',
    async (request, reply) => {
      const user = await getUserByTelegramId(request.telegramUserId);
      if (!user) return reply.code(404).send({ ok: false, error: 'User not found' });

      const limit = Math.min(Number(request.query.limit ?? 20), 50);
      const offset = Number(request.query.offset ?? 0);

      const sessions = await getSessionsByUserId(user.id, limit, offset);
      return { ok: true, data: sessions };
    },
  );

  // GET /api/sessions/:id
  app.get<{ Params: { id: string } }>('/api/sessions/:id', async (request, reply) => {
    const user = await getUserByTelegramId(request.telegramUserId);
    if (!user) return reply.code(404).send({ ok: false, error: 'User not found' });

    const session = await getSessionById(request.params.id);
    if (!session || session.userId !== user.id) {
      return reply.code(404).send({ ok: false, error: 'Session not found' });
    }

    return { ok: true, data: session };
  });

  // GET /api/progress/summary
  app.get('/api/progress/summary', async (request, reply) => {
    const user = await getUserByTelegramId(request.telegramUserId);
    if (!user) return reply.code(404).send({ ok: false, error: 'User not found' });

    const summary = await getProgressSummary(user.id);
    return { ok: true, data: summary };
  });
}

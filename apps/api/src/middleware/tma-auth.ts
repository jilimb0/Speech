import type { FastifyInstance } from 'fastify';

const DEV_TELEGRAM_USER_ID = 387147568;

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

declare module 'fastify' {
  interface FastifyRequest {
    telegramUserId: number;
  }
}

export async function registerTmaAuth(app: FastifyInstance): Promise<void> {
  const isDev = process.env.NODE_ENV === 'development' || process.env.DEV_MODE === 'true';

  app.addHook('preHandler', async (request, reply) => {
    const initData = request.headers['x-telegram-init-data'];

    // Dev mode: allow hardcoded user for browser testing
    if (isDev && (!initData || initData === 'dev')) {
      request.telegramUserId = DEV_TELEGRAM_USER_ID;
      return;
    }

    if (!initData || typeof initData !== 'string') {
      return reply.status(401).send({ ok: false, error: 'Missing initData' });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return reply.status(500).send({ ok: false, error: 'Server misconfiguration' });
    }

    const auth = await validateInitData(initData, botToken);
    if (!auth) {
      return reply.status(401).send({ ok: false, error: 'Invalid initData' });
    }

    request.telegramUserId = auth.telegramUserId;
  });
}

import { parseAndValidateInitData, type TelegramUser } from '@tgwrapper/core/tma';
import type { FastifyInstance, FastifyRequest } from 'fastify';

const DEV_TELEGRAM_USER_ID = 387147568;

declare module 'fastify' {
  interface FastifyRequest {
    telegramUserId: number;
    telegramUser?: TelegramUser;
  }
}

function extractInitData(request: FastifyRequest): string | undefined {
  const rawHeader = request.headers['x-telegram-init-data'];
  if (typeof rawHeader === 'string') {
    return rawHeader;
  }
  const auth = request.headers.authorization;
  if (auth?.toLowerCase().startsWith('tma ')) {
    return auth.slice(4).trim();
  }
  return undefined;
}

function isPublicRoute(url: string): boolean {
  const pathname = url.split('?')[0];
  return pathname === '/health' || pathname === '/api/health';
}

function shouldAllowDevBypass(initData: string | undefined): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  if (process.env.NODE_ENV === 'test') return true;
  const isDev = process.env.NODE_ENV === 'development' || process.env.DEV_MODE === 'true';
  return isDev && (initData === 'dev' || process.env.ALLOW_DEV_AUTH_BYPASS === 'true');
}

/**
 * Registers TMA authentication hook on Fastify instance.
 * Uses official @tgwrapper/core/tma HMAC-SHA256 cryptographic verification.
 */
export async function registerTmaAuth(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', async (request, reply) => {
    if (isPublicRoute(request.url)) {
      return;
    }

    const initData = extractInitData(request);

    if (shouldAllowDevBypass(initData)) {
      request.telegramUserId = DEV_TELEGRAM_USER_ID;
      request.telegramUser = { id: DEV_TELEGRAM_USER_ID, firstName: 'DevUser' };
      return;
    }

    if (!initData) {
      return reply
        .status(401)
        .send({ ok: false, error: 'Missing Telegram Mini App initData in request headers' });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return reply
        .status(500)
        .send({ ok: false, error: 'Server misconfiguration: TELEGRAM_BOT_TOKEN missing' });
    }

    const result = parseAndValidateInitData(initData, botToken);
    if (!result.valid || !result.data?.user) {
      return reply
        .status(401)
        .send({ ok: false, error: `Invalid initData: ${result.error ?? 'UNAUTHORIZED'}` });
    }

    request.telegramUserId = result.data.user.id;
    request.telegramUser = result.data.user;
  });
}

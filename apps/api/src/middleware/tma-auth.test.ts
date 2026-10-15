import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { registerTmaAuth } from './tma-auth.js';

describe('TMA Auth Middleware', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('allows public health check endpoints without initData', async () => {
    process.env.NODE_ENV = 'production';
    const app = Fastify();
    await registerTmaAuth(app);
    app.get('/health', async () => ({ ok: true }));

    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ok: true });
  });

  it('blocks dev bypass when in production environment', async () => {
    process.env.NODE_ENV = 'production';
    process.env.TELEGRAM_BOT_TOKEN = 'test:token';
    const app = Fastify();
    await registerTmaAuth(app);
    app.get('/protected', async (req) => ({ user: req.telegramUserId }));

    const res = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { 'x-telegram-init-data': 'dev' },
    });

    expect(res.statusCode).toBe(401);
  });

  it('allows dev bypass in development when initData is dev', async () => {
    process.env.NODE_ENV = 'development';
    const app = Fastify();
    await registerTmaAuth(app);
    app.get('/protected', async (req) => ({ user: req.telegramUserId }));

    const res = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { 'x-telegram-init-data': 'dev' },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ user: 387147568 });
  });
});

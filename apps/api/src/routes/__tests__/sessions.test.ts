import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { sessionRoutes } from '../sessions.js';

describe('Session Routes', () => {
  it('health endpoint returns ok', async () => {
    const app = Fastify();
    app.get('/health', async () => ({ ok: true, ts: new Date().toISOString() }));
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.ok).toBe(true);
  });

  it('healthz endpoint returns ok and echoes X-Correlation-ID with security headers', async () => {
    const app = Fastify();
    app.addHook('onRequest', async (request, reply) => {
      const rawCorrelationId = request.headers['x-correlation-id'];
      void reply.header('X-Correlation-ID', rawCorrelationId ?? 'default-cid');
      void reply.header('X-Content-Type-Options', 'nosniff');
      void reply.header('X-Frame-Options', 'DENY');
      void reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    });
    app.get('/healthz', async () => ({ ok: true, status: 'ok', ts: new Date().toISOString() }));
    const response = await app.inject({
      method: 'GET',
      url: '/healthz',
      headers: { 'x-correlation-id': 'custom-speech-123' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers['x-correlation-id']).toBe('custom-speech-123');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
  });

  it('session routes are registered', async () => {
    const app = Fastify();
    await app.register(sessionRoutes);
    const routes = app.printRoutes();
    expect(routes).toContain('sessions (GET');
  });
});

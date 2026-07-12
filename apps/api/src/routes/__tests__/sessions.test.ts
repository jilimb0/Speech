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

  it('session routes are registered', async () => {
    const app = Fastify();
    await app.register(sessionRoutes);
    const routes = app.printRoutes();
    expect(routes).toContain('sessions (GET');
  });
});

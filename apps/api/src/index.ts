import cors from '@fastify/cors';
import Fastify from 'fastify';
import { config } from './config.js';
import { sessionRoutes } from './routes/sessions.js';
import { webhookRoutes } from './routes/webhook.js';

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
  },
});

await app.register(cors, {
  origin: process.env.CORS_ORIGIN ?? false,
});

await app.register(webhookRoutes);
await app.register(sessionRoutes);

// Health check
app.get('/health', async () => ({ ok: true, ts: new Date().toISOString() }));

try {
  await app.listen({ port: config.port, host: config.host });
  app.log.info(`API listening on ${config.host}:${config.port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

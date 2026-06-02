import cors from '@fastify/cors';
import Fastify from 'fastify';
import { createBot } from './bot/index.js';
import { config } from './config.js';
import { sessionRoutes } from './routes/sessions.js';

const logger = Fastify({
  logger: { level: process.env.LOG_LEVEL ?? 'info' },
});

await logger.register(cors, {
  origin: process.env.CORS_ORIGIN ?? false,
});

await logger.register(sessionRoutes);

logger.get('/health', async () => ({ ok: true, ts: new Date().toISOString() }));

// Start Telegram bot (polling)
await createBot();
logger.log.info('Telegram bot started (polling)');

// Start HTTP server (for Mini App API)
try {
  await logger.listen({ port: config.port, host: config.host });
  logger.log.info(`API listening on ${config.host}:${config.port}`);
} catch (err) {
  logger.log.error(err);
  process.exit(1);
}

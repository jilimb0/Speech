import { existsSync } from 'node:fs';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import * as Sentry from '@sentry/node';
import Fastify from 'fastify';
import { createBot } from './bot/index.js';
import { config } from './config.js';
import { sessionRoutes } from './routes/sessions.js';

const sentryDsn = process.env.SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: 0.1,
  });
}

const logger = Fastify({
  logger: { level: process.env.LOG_LEVEL ?? 'info' },
});

process.on('unhandledRejection', (reason) => {
  Sentry.captureException(reason);
});

await logger.register(cors, {
  origin: process.env.CORS_ORIGIN ?? false,
});

// Private Network Access: allow public→Tailscale requests
logger.addHook('onSend', async (_request, reply) => {
  void reply.header('Access-Control-Allow-Private-Network', 'true');
});

await logger.register(sessionRoutes);

logger.get('/health', async () => ({ ok: true, ts: new Date().toISOString() }));

logger.get('/debug', async (request) => ({
  initDataHeader: request.headers['x-telegram-init-data'] ?? '(empty)',
  initDataLength: String(request.headers['x-telegram-init-data'] ?? '').length,
  userAgent: request.headers['user-agent'] ?? '(unknown)',
}));

// Serve web-miniapp static files
const staticDir = '/app/web-miniapp';
if (existsSync(staticDir)) {
  await logger.register(fastifyStatic, {
    root: staticDir,
    wildcard: true,
  });
  logger.setNotFoundHandler(async (_request, reply) => {
    return reply.sendFile('index.html');
  });
  logger.log.info(`Serving static files from ${staticDir}`);
}

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

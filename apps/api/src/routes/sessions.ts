import {
  getProgressSummary,
  getSessionById,
  getSessionsByUserId,
  getUserByTelegramId,
} from '@speech/sessions';
import type { FastifyInstance } from 'fastify';

export async function sessionRoutes(app: FastifyInstance): Promise<void> {
  app.get('/me', async (request, reply) => {
    const user = await getUserByTelegramId(request.telegramUserId);
    if (!user) return reply.code(404).send({ ok: false, error: 'User not found' });
    return { ok: true, data: user };
  });

  app.get<{ Querystring: { limit?: string; offset?: string } }>(
    '/sessions',
    async (request, reply) => {
      const user = await getUserByTelegramId(request.telegramUserId);
      if (!user) return reply.code(404).send({ ok: false, error: 'User not found' });

      const limit = Math.min(Number(request.query.limit ?? 20), 50);
      const offset = Number(request.query.offset ?? 0);

      const sessions = await getSessionsByUserId(user.id, limit, offset);
      return { ok: true, data: sessions };
    },
  );

  app.get<{ Params: { id: string } }>('/sessions/:id', async (request, reply) => {
    const user = await getUserByTelegramId(request.telegramUserId);
    if (!user) return reply.code(404).send({ ok: false, error: 'User not found' });

    const session = await getSessionById(request.params.id);
    if (!session || session.userId !== user.id) {
      return reply.code(404).send({ ok: false, error: 'Session not found' });
    }

    return { ok: true, data: session };
  });

  app.get('/progress/summary', async (request, reply) => {
    const user = await getUserByTelegramId(request.telegramUserId);
    if (!user) return reply.code(404).send({ ok: false, error: 'User not found' });

    const summary = await getProgressSummary(user.id);
    return { ok: true, data: summary };
  });
}

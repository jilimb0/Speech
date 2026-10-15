import type { BotClient } from '@tgwrapper/core';
import { log } from '../../log.js';
import { getApiClient } from '../telegram-api.js';

export function registerInlineHandlers(bot: BotClient): void {
  const api = getApiClient();

  bot.on('update', async (update) => {
    const iq = (update as Record<string, unknown>).inline_query;
    if (iq && typeof iq === 'object' && iq !== null) {
      const id = (iq as Record<string, unknown>).id;
      if (typeof id === 'string') {
        log.info({ inlineQueryId: id }, 'Inline query received');
        await api
          .callApiUnsafe('answerInlineQuery', {
            inline_query_id: id,
            results: [
              {
                type: 'article',
                id: 'speech_tip_pause',
                title: '🎙 Тренировка пауз',
                description: 'Заменяй слова-паразиты осознанными паузами в 1-2 секунды',
                input_message_content: {
                  message_text:
                    '💡 *Совет для чистой речи:*\nДелай осознанную паузу вместо слов «эм», «как бы», «ну». Пауза придаёт веса твоим словам и даёт время подумать!',
                  parse_mode: 'Markdown',
                },
              },
              {
                type: 'article',
                id: 'speech_tip_pace',
                title: '⏱ Темп речи: 110-140 слов/мин',
                description: 'Оптимальный темп для идеального восприятия аудиторией',
                input_message_content: {
                  message_text:
                    '⏱ *Оптимальный темп речи:* 110–140 слов в минуту. Слишком быстрая речь ведёт к комканию фраз и потере нити повествования.',
                  parse_mode: 'Markdown',
                },
              },
              {
                type: 'article',
                id: 'speech_pro_stars',
                title: '⭐ Speech Pro — 50 Stars',
                description: 'Оформить подписку на нейросетевой разбор речи через Telegram Stars',
                input_message_content: {
                  message_text:
                    '🚀 *Speech Pro:* Безлимитный детальный разбор дикции, пауз и персональные рекомендации от ИИ-коуча в Telegram за Stars!',
                  parse_mode: 'Markdown',
                },
              },
            ],
            cache_time: 300,
          })
          .catch((err) => {
            log.error({ err, inlineQueryId: id }, 'Failed to answer inline query');
          });
      }
    }
  });
}

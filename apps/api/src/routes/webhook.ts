import { rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { analyzeFillers, calculateScore } from '@speech/analysis';
import { countTodaySessions, createSession, upsertUser } from '@speech/sessions';
import { ManagedWhisperProvider, SpeechService } from '@speech/speech';
import type { FastifyInstance } from 'fastify';
import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config.js';

const TELEGRAM_API = 'https://api.telegram.org';

const speechService = new SpeechService(new ManagedWhisperProvider());

export async function webhookRoutes(app: FastifyInstance): Promise<void> {
  const bot = new TelegramBot(config.telegramBotToken, { polling: false });

  app.post<{ Body: TelegramBot.Update }>(
    '/api/telegram/webhook',
    {
      config: { rawBody: true },
    },
    async (request, reply) => {
      // Проверка секрета webhook
      const secret = request.headers['x-telegram-bot-api-secret-token'];
      if (secret !== config.telegramWebhookSecret) {
        return reply.code(403).send({ ok: false });
      }

      const update = request.body;
      await handleUpdate(bot, update);

      return reply.code(200).send({ ok: true });
    },
  );
}

async function handleUpdate(bot: TelegramBot, update: TelegramBot.Update): Promise<void> {
  const message = update.message;
  if (!message) return;

  const chatId = message.chat.id;
  const from = message.from;
  if (!from) return;

  // Upsert пользователя
  const user = await upsertUser({
    telegramUserId: from.id,
    username: from.username ?? null,
    firstName: from.first_name ?? null,
  });

  // Команды
  if (message.text) {
    const text = message.text.trim();

    if (text === '/start') {
      await bot.sendMessage(
        chatId,
        'Привет! 👋\n\nЗапиши 30–60 секунд речи, и я покажу, какие слова-паразиты чаще всего тебе мешают.\n\nПросто отправь голосовое сообщение. Лучше всего — спонтанная речь, а не чтение текста.\n\n_Записи анализируются автоматически и не хранятся дольше необходимого._',
        { parse_mode: 'Markdown' },
      );
      return;
    }

    if (text === '/help') {
      await bot.sendMessage(
        chatId,
        '*Как пользоваться:*\n\n1. Отправь голосовое сообщение 30–60 секунд\n2. Получи отчёт по словам-паразитам\n3. Открой историю, чтобы отследить прогресс\n\n*Команды:*\n/start — начало\n/history — открыть историю\n/help — эта справка',
        { parse_mode: 'Markdown' },
      );
      return;
    }

    if (text === '/history') {
      await bot.sendMessage(chatId, 'Открой историю своих сессий:', {
        reply_markup: {
          inline_keyboard: [[{ text: '📊 Открыть историю', web_app: { url: config.webAppUrl } }]],
        },
      });
      return;
    }

    // Любой другой текст
    await bot.sendMessage(
      chatId,
      'Пришли голосовое сообщение, и я разберу речь. Текстовые сообщения не обрабатываются.',
    );
    return;
  }

  // Голосовое сообщение
  if (message.voice) {
    await handleVoiceMessage(bot, chatId, user.id, message.voice, user.customFillerList);
    return;
  }

  // Любой другой тип
  await bot.sendMessage(chatId, 'Пришли голосовое сообщение 30–60 секунд, и я разберу речь.');
}

async function handleVoiceMessage(
  bot: TelegramBot,
  chatId: number,
  userId: string,
  voice: TelegramBot.Voice,
  customFillers: string[],
): Promise<void> {
  const durationSec = voice.duration;

  // Проверка длины
  if (durationSec < config.minAudioDurationSec) {
    await bot.sendMessage(
      chatId,
      `Слишком коротко. Запиши хотя бы ${config.minAudioDurationSec}–30 секунд живой речи.`,
    );
    return;
  }

  if (durationSec > config.maxAudioDurationSec) {
    await bot.sendMessage(
      chatId,
      `Запись слишком длинная. Оптимально — 30–60 секунд, максимум ${config.maxAudioDurationSec} секунд.`,
    );
    return;
  }

  // Проверка лимита free-плана
  const todaySessions = await countTodaySessions(userId);
  if (todaySessions >= config.freeDailySessionLimit) {
    await bot.sendMessage(
      chatId,
      `На бесплатном плане доступно ${config.freeDailySessionLimit} сессии в день. Возвращайся завтра или открой историю, чтобы узнать о premium.`,
      {
        reply_markup: {
          inline_keyboard: [[{ text: '📊 Открыть историю', web_app: { url: config.webAppUrl } }]],
        },
      },
    );
    return;
  }

  // Статус обработки
  const statusMsg = await bot.sendMessage(
    chatId,
    'Слушаю запись и ищу слова-паразиты, повторы и общий темп речи…',
  );

  let tempFilePath: string | null = null;

  try {
    // Скачиваем файл
    const fileInfo = await bot.getFile(voice.file_id);
    if (!fileInfo.file_path) throw new Error('No file_path from Telegram');

    const fileUrl = `${TELEGRAM_API}/file/bot${config.telegramBotToken}/${fileInfo.file_path}`;
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) throw new Error(`Failed to download file: ${fileResponse.status}`);

    const buffer = Buffer.from(await fileResponse.arrayBuffer());
    tempFilePath = join(tmpdir(), `speech_${Date.now()}_${voice.file_id}.ogg`);
    await writeFile(tempFilePath, buffer);

    // Транскрипция
    const transcription = await speechService.transcribe(tempFilePath);

    if (transcription.status === 'failed' || transcription.rawTranscript.length < 5) {
      await bot.editMessageText(
        'Не удалось нормально разобрать запись. Попробуй в более тихом месте.',
        { chat_id: chatId, message_id: statusMsg.message_id },
      );
      return;
    }

    // Анализ
    const analysis = analyzeFillers({
      normalizedTranscript: transcription.normalizedTranscript,
      audioDurationSec: durationSec,
      customFillers,
    });

    const scoring = calculateScore({
      audioDurationSec: durationSec,
      totalFillers: analysis.totalFillers,
      fillersPerMinute: analysis.fillersPerMinute,
      wordsPerMinute: analysis.wordsPerMinute,
      speechRate: analysis.speechRate,
      topFillers: analysis.topFillers,
      repeatedWords: analysis.repeatedWords,
    });

    // Сохраняем сессию
    await createSession({
      userId,
      audioDurationSec: durationSec,
      rawTranscript: transcription.rawTranscript,
      normalizedTranscript: transcription.normalizedTranscript,
      transcriptionStatus: transcription.status,
      totalWords: analysis.totalWords,
      totalFillers: analysis.totalFillers,
      fillersPerMinute: analysis.fillersPerMinute,
      wordsPerMinute: analysis.wordsPerMinute,
      speechRate: analysis.speechRate,
      topFillers: analysis.topFillers,
      repeatedWords: analysis.repeatedWords,
      sessionScore: scoring.sessionScore,
      summaryText: scoring.summaryText,
      advice: scoring.advice,
    });

    // Формируем отчёт
    const rateLabelMap: Record<string, string> = {
      slow: 'медленный',
      moderate: 'умеренный',
      fast: 'быстрый',
    };
    const rateLabel = rateLabelMap[analysis.speechRate] ?? 'умеренный';

    const topFillersText =
      analysis.topFillers.length > 0
        ? analysis.topFillers
            .slice(0, 3)
            .map((f) => `«${f.filler}» — ${f.count}`)
            .join(', ')
        : 'не найдено';

    const report = `*Результат анализа*\n\n⏱ Длительность: ${durationSec} сек\n🔤 Слов-паразитов: ${analysis.totalFillers}\n📌 Чаще всего: ${topFillersText}\n🎙 Темп: ${rateLabel}\n⭐ Оценка: ${scoring.sessionScore}/100\n\n💡 ${scoring.advice}`;

    await bot.editMessageText(report, {
      chat_id: chatId,
      message_id: statusMsg.message_id,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🎙 Записать ещё раз', callback_data: 'retry' },
            { text: '📊 Открыть историю', web_app: { url: config.webAppUrl } },
          ],
        ],
      },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Voice processing error:', errorMessage);

    await bot
      .editMessageText('Сервис сейчас занят. Попробуй ещё раз через минуту.', {
        chat_id: chatId,
        message_id: statusMsg.message_id,
      })
      .catch(() => {
        // Игнорируем ошибку редактирования
      });
  } finally {
    // Удаляем временный файл
    if (tempFilePath) {
      await rm(tempFilePath, { force: true }).catch(() => {});
    }
  }
}

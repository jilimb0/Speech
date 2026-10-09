import { rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { analyzeFillers, calculateScore, generateAiCoach } from '@speech/analysis';
import {
  countTodaySessions,
  createSession,
  getUserByTelegramId,
  upsertUser,
} from '@speech/sessions';
import type { AiCoachResult, FillerAnalysisResult, ScoringResult } from '@speech/shared';
import {
  FasterWhisperProvider,
  InMemoryTranscriptionCache,
  ManagedWhisperProvider,
  SpeechService,
} from '@speech/speech';
import type { BotClient, Message } from '@tgwrapper/core';
import { config } from '../../config.js';
import { log } from '../../log.js';
import { getApiClient, TELEGRAM_FILE_BASE } from '../telegram-api.js';

export interface VoiceMessage {
  file_id: string;
  duration: number;
  mime_type?: string;
  file_size?: number;
}

interface GetFileResult {
  file_path?: string;
}

interface SendMessageResult {
  message_id: number;
}

const speechProvider =
  config.speechProvider === 'faster-whisper'
    ? new FasterWhisperProvider()
    : new ManagedWhisperProvider();

const transcriptionCache = new InMemoryTranscriptionCache();
const speechService = new SpeechService(speechProvider, transcriptionCache);

const RATE_LABELS: Record<string, string> = {
  slow: 'медленный 🐢',
  moderate: 'умеренный ✅',
  fast: 'быстрый ⚡',
};

function scoreEmoji(score: number): string {
  if (score >= 85) return '🟢';
  if (score >= 70) return '🟡';
  if (score >= 50) return '🟠';
  return '🔴';
}

function buildReport(
  durationSec: number,
  analysis: FillerAnalysisResult,
  scoring: ScoringResult,
  aiCoach?: AiCoachResult | null,
): string {
  const rateLabel = RATE_LABELS[analysis.speechRate] ?? 'умеренный';
  const topFillersText =
    analysis.topFillers.length > 0
      ? analysis.topFillers
          .slice(0, 3)
          .map((f) => `«${f.filler}» — ${f.count}`)
          .join(', ')
      : 'не найдено';

  let pausesText = '';
  if (analysis.pauseMetrics && analysis.pauseMetrics.pauseCount > 0) {
    pausesText = `\n⏸ Паузы зависания: ${analysis.pauseMetrics.pauseCount} (до ${analysis.pauseMetrics.longestPauseSec} сек)`;
  }

  let exerciseText = '';
  const firstExercise = aiCoach?.exercises[0];
  if (firstExercise) {
    exerciseText = `\n\n🎯 *Упражнение от коуча:*\n*${firstExercise.title}*\n${firstExercise.description}${firstExercise.practiceText ? `\n_Тренировка: ${firstExercise.practiceText}_` : ''}`;
  }

  return `*Результат анализа*\n\n⏱ Длительность: ${durationSec} сек\n🔤 Слов-паразитов: ${analysis.totalFillers}\n📌 Чаще всего: ${topFillersText}\n🎙 Темп: ${rateLabel}${pausesText}\n${scoreEmoji(scoring.sessionScore)} Оценка: ${scoring.sessionScore}/100\n\n💡 ${scoring.advice}${exerciseText}`;
}

async function downloadVoice(fileId: string): Promise<string> {
  const api = getApiClient();
  const fileInfo = (await api.callApiUnsafe('getFile', { file_id: fileId })) as {
    result?: GetFileResult;
  };
  const filePath = fileInfo.result?.file_path;
  if (!filePath) throw new Error('No file_path from Telegram API');

  const fileUrl = `${TELEGRAM_FILE_BASE}/${filePath}`;
  const res = await fetch(fileUrl);
  if (!res.ok) throw new Error(`Failed to download file: ${res.status}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  const tempPath = join(tmpdir(), `speech_${Date.now()}_${fileId}.ogg`);
  await writeFile(tempPath, buffer);
  return tempPath;
}

async function deleteStatusMessage(chatId: number, messageId: number): Promise<void> {
  await getApiClient()
    .callApiUnsafe('deleteMessage', { chat_id: chatId, message_id: messageId })
    .catch(() => {});
}

const processingChats = new Set<number>();

function isRateLimited(chatId: number): boolean {
  if (processingChats.has(chatId)) return true;
  processingChats.add(chatId);
  return false;
}

async function resolveUser(telegramUserId: number | undefined, msg: Message) {
  if (!telegramUserId) return null;
  let user = await getUserByTelegramId(telegramUserId);
  if (!user) {
    user = await upsertUser({
      telegramUserId,
      username: (msg.from as { username?: string })?.username ?? null,
      firstName: (msg.from as { first_name?: string })?.first_name ?? null,
    }).catch(() => null);
  }
  return user;
}

async function processAndSendResults(
  bot: BotClient,
  chatId: number,
  durationSec: number,
  voice: VoiceMessage,
  user: Awaited<ReturnType<typeof resolveUser>>,
  statusMessageId: number,
) {
  let tempFilePath: string | null = null;

  try {
    tempFilePath = await downloadVoice(voice.file_id);

    const transcription = await speechService.transcribe(tempFilePath);

    if (transcription.status === 'failed' || transcription.rawTranscript.length < 5) {
      await deleteStatusMessage(chatId, statusMessageId);
      await bot.sendMessage(
        chatId,
        'Не удалось нормально разобрать запись. Попробуй в более тихом месте.',
      );
      return;
    }

    const analysis = analyzeFillers({
      normalizedTranscript: transcription.normalizedTranscript,
      audioDurationSec: durationSec,
      segments: transcription.segments,
    });

    const scoring = calculateScore({
      audioDurationSec: durationSec,
      totalFillers: analysis.totalFillers,
      fillersPerMinute: analysis.fillersPerMinute,
      wordsPerMinute: analysis.wordsPerMinute,
      speechRate: analysis.speechRate,
      topFillers: analysis.topFillers,
      repeatedWords: analysis.repeatedWords,
      pauseMetrics: analysis.pauseMetrics,
    });

    const aiCoach = await generateAiCoach(
      {
        topFillers: analysis.topFillers,
        wordsPerMinute: analysis.wordsPerMinute,
        speechRate: analysis.speechRate,
        pauseMetrics: analysis.pauseMetrics,
        transcriptSnippet: transcription.rawTranscript,
      },
      {
        baseUrl: config.aiBaseUrl,
        apiKey: config.aiApiKey,
        model: config.aiModel,
      },
    );

    const session = user
      ? await createSession({
          userId: user.id,
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
          pauseMetrics: analysis.pauseMetrics,
          exercises: aiCoach.exercises,
        })
      : null;

    await deleteStatusMessage(chatId, statusMessageId);

    await bot.sendMessage(chatId, buildReport(durationSec, analysis, scoring, aiCoach), {
      parse_mode: 'Markdown',
      reply_markup: session
        ? {
            inline_keyboard: [
              [
                {
                  text: '📊 Открыть в Mini App',
                  web_app: { url: `${config.webAppUrl}#/session/${session.id}` },
                },
              ],
            ],
          }
        : undefined,
    });
  } finally {
    if (tempFilePath) {
      await rm(tempFilePath, { force: true }).catch(() => {});
    }
  }
}

export async function handleVoiceMessage(
  bot: BotClient,
  msg: Message,
  voice: VoiceMessage,
): Promise<void> {
  const chatId = msg.chat.id;
  const durationSec = voice.duration;
  const api = getApiClient();

  const fromUser = msg.from as { id?: number } | undefined;
  const telegramUserId = fromUser?.id;

  if (isRateLimited(chatId)) {
    await bot.sendMessage(chatId, 'Предыдущее сообщение ещё обрабатывается. Подожди немного.');
    return;
  }

  if (durationSec < config.minAudioDurationSec) {
    await bot.sendMessage(
      chatId,
      `Слишком коротко. Запиши хотя бы ${config.minAudioDurationSec}–30 секунд живой речи.`,
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

  const user = await resolveUser(telegramUserId, msg);

  if (
    user &&
    user.plan === 'free' &&
    (await countTodaySessions(user.id)) >= config.freeDailySessionLimit
  ) {
    await bot.sendMessage(
      chatId,
      `На бесплатном тарифе доступно ${config.freeDailySessionLimit} анализа в день. Оформи Pro подписку командой /pro (всего 50 Stars) для безлимита или возвращайся завтра!`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '⭐ Оформить Pro (50 Stars)', callback_data: 'buy_pro' }],
            [{ text: '📊 Открыть историю', web_app: { url: config.webAppUrl } }],
          ],
        },
      },
    );
    return;
  }

  const statusResult = (await api.callApiUnsafe('sendMessage', {
    chat_id: chatId,
    text: 'Слушаю запись и ищу слова-паразиты, повторы и общий темп речи…',
  })) as { result?: SendMessageResult };
  const statusMessageId = statusResult.result?.message_id ?? 0;

  try {
    await processAndSendResults(bot, chatId, durationSec, voice, user, statusMessageId);
  } catch (error) {
    await deleteStatusMessage(chatId, statusMessageId);
    await bot.sendMessage(chatId, 'Ошибка при обработке записи. Попробуй ещё раз чуть позже.');
    log.error({ err: error }, 'Voice processing failed');
  } finally {
    processingChats.delete(chatId);
  }
}

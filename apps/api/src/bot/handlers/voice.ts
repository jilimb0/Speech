import { rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { analyzeFillers, calculateScore } from '@speech/analysis';
import { countTodaySessions, createSession, getUserByTelegramId } from '@speech/sessions';
import type { FillerAnalysisResult, ScoringResult } from '@speech/shared';
import { FasterWhisperProvider, ManagedWhisperProvider, SpeechService } from '@speech/speech';
import type { BotClient, Message } from '@tgwrapper/core';
import { config } from '../../config.js';
import { getApiClient, TELEGRAM_FILE_BASE } from '../telegram-api.js';

export interface VoiceMessage {
  file_id: string;
  duration: number;
  mime_type?: string;
  file_size?: number;
}

interface GetFileResult {
  result: { file_path?: string };
}

interface SendMessageResult {
  result: { message_id: number };
}

const speechProvider =
  config.speechProvider === 'faster-whisper'
    ? new FasterWhisperProvider()
    : new ManagedWhisperProvider();

const speechService = new SpeechService(speechProvider);

const RATE_LABELS: Record<string, string> = {
  slow: 'медленный 🐢',
  moderate: 'умеренный ✅',
  fast: 'быстрый ⚡',
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
): string {
  const rateLabel = RATE_LABELS[analysis.speechRate] ?? 'умеренный';
  const topFillersText =
    analysis.topFillers.length > 0
      ? analysis.topFillers
          .slice(0, 3)
          .map((f) => `«${f.filler}» — ${f.count}`)
          .join(', ')
      : 'не найдено';

  return `*Результат анализа*\n\n⏱ Длительность: ${durationSec} сек\n🔤 Слов-паразитов: ${analysis.totalFillers}\n📌 Чаще всего: ${topFillersText}\n🎙 Темп: ${rateLabel}\n${scoreEmoji(scoring.sessionScore)} Оценка: ${scoring.sessionScore}/100\n\n💡 ${scoring.advice}`;
}

async function downloadVoice(fileId: string): Promise<string> {
  const api = getApiClient();
  const fileInfo = (await api.callApiUnsafe('getFile', { file_id: fileId })) as GetFileResult;
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

  const user = telegramUserId ? await getUserByTelegramId(telegramUserId) : null;

  if (user && (await countTodaySessions(user.id)) >= config.freeDailySessionLimit) {
    await bot.sendMessage(
      chatId,
      `На бесплатном плане доступно ${config.freeDailySessionLimit} сессии в день. Возвращайся завтра или открой историю, чтобы узнать о premium.`,
      {
        reply_markup: {
          inline_keyboard: [[{ text: '📊 Открыть историю', web_app: { url: config.webAppUrl } }]],
        },
      },
    );
    return;
  }

  const statusResult = (await api.callApiUnsafe('sendMessage', {
    chat_id: chatId,
    text: 'Слушаю запись и ищу слова-паразиты, повторы и общий темп речи…',
  })) as SendMessageResult;
  const statusMessageId = statusResult.result.message_id;

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
        })
      : null;

    await deleteStatusMessage(chatId, statusMessageId);

    await bot.sendMessage(chatId, buildReport(durationSec, analysis, scoring), {
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
  } catch (error) {
    await deleteStatusMessage(chatId, statusMessageId);
    await bot.sendMessage(chatId, 'Ошибка при обработке записи. Попробуй ещё раз чуть позже.');
    console.error('Voice processing failed:', error);
  } finally {
    if (tempFilePath) {
      await rm(tempFilePath, { force: true }).catch(() => {});
    }
  }
}

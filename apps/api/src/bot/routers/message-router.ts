import { updateUserPlan, upsertUser } from '@speech/sessions';
import type { BotClient, Message } from '@tgwrapper/core';
import { handleHelp, handleHistory, handlePro, handleStart } from '../handlers/commands.js';
import { handleVoiceMessage, type VoiceMessage } from '../handlers/voice.js';

function getText(msg: Message): string | null {
  const t = msg.text;
  return typeof t === 'string' ? t : null;
}

function getVoice(msg: Message): VoiceMessage | null {
  const v = msg.voice;
  if (v && typeof v === 'object' && 'file_id' in v) return v as VoiceMessage;
  return null;
}

function getFromUser(msg: Message): { id: number; username?: string; first_name?: string } | null {
  const f = msg.from;
  if (!f || typeof f !== 'object' || !('id' in f)) return null;
  return f as { id: number; username?: string; first_name?: string };
}

async function routeText(bot: BotClient, msg: Message, text: string): Promise<void> {
  const t = text.trim();
  if (t === '/start' || t.startsWith('/start ')) {
    await handleStart(bot, msg);
    return;
  }
  if (t === '/help') {
    await handleHelp(bot, msg);
    return;
  }
  if (t === '/history') {
    await handleHistory(bot, msg);
    return;
  }
  if (t === '/pro' || t === '/buy') {
    await handlePro(bot, msg);
    return;
  }
  await bot.sendMessage(
    msg.chat.id,
    'Пришли голосовое сообщение, и я разберу речь. Для оформления подписки используй команду /pro.',
  );
}

export function registerMessageRouter(bot: BotClient): void {
  bot.on('message', async (msg: Message) => {
    const from = getFromUser(msg);
    if (!from) return;

    await upsertUser({
      telegramUserId: from.id,
      username: from.username ?? null,
      firstName: from.first_name ?? null,
    }).catch(() => {});

    // Обработка успешного платежа через Telegram Stars
    const payment = (msg as { successful_payment?: { total_amount: number; currency: string } })
      .successful_payment;
    if (payment) {
      await updateUserPlan(from.id, 'premium').catch((err) =>
        console.error('Failed to upgrade user plan:', err),
      );
      await bot.sendMessage(
        msg.chat.id,
        '🎉 *Оплата получена! Подписка Speech Pro активирована.*\n\nТеперь у тебя безлимитный анализ речи и расширенные упражнения от ИИ-коуча.',
        { parse_mode: 'Markdown' },
      );
      return;
    }

    const text = getText(msg);
    if (text) {
      await routeText(bot, msg, text);
      return;
    }

    const voice = getVoice(msg);
    if (voice) {
      await handleVoiceMessage(bot, msg, voice);
      return;
    }

    await bot.sendMessage(
      msg.chat.id,
      'Пришли голосовое сообщение 30–60 секунд, и я разберу речь.',
    );
  });
}

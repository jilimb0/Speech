import type { BotClient, Message } from '@tgwrapper/core';
import { config } from '../../config.js';

export async function handleStart(bot: BotClient, msg: Message): Promise<void> {
  await bot.sendMessage(
    msg.chat.id,
    'Привет! 👋\n\nЗапиши 30–60 секунд речи, и я покажу, какие слова-паразиты чаще всего тебе мешают.\n\nПросто отправь голосовое сообщение. Лучше всего — спонтанная речь, а не чтение текста.\n\n_Записи анализируются автоматически и не хранятся дольше необходимого._',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: '📊 Открыть историю', web_app: { url: config.webAppUrl } }]],
      },
    },
  );
}

export async function handleHelp(bot: BotClient, msg: Message): Promise<void> {
  await bot.sendMessage(
    msg.chat.id,
    '*Как пользоваться:*\n\n1. Отправь голосовое сообщение 30–60 секунд\n2. Получи отчёт по словам-паразитам, темпу и паузам\n3. Выполняй упражнения от ИИ-коуча\n4. Открой историю, чтобы отследить прогресс\n\n*Команды:*\n/start — начало\n/history — открыть историю\n/pro — оформить подписку Pro через Telegram Stars\n/help — эта справка',
    { parse_mode: 'Markdown' },
  );
}

export async function handleHistory(bot: BotClient, msg: Message): Promise<void> {
  await bot.sendMessage(msg.chat.id, 'Открой историю своих сессий:', {
    reply_markup: {
      inline_keyboard: [[{ text: '📊 Открыть историю', web_app: { url: config.webAppUrl } }]],
    },
  });
}

export async function handlePro(bot: BotClient, msg: Message): Promise<void> {
  const from = msg.from as { id?: number } | undefined;
  if (!from?.id) return;

  const { getApiClient } = await import('../telegram-api.js');
  const api = getApiClient();

  try {
    await api.callApiUnsafe('sendInvoice', {
      chat_id: msg.chat.id,
      title: 'Speech Pro (30 дней)',
      description: 'Безлимитный анализ речи, расширенный персональный ИИ-коучинг и метрики пауз',
      payload: `pro_user_${from.id}_${Date.now()}`,
      currency: 'XTR',
      prices: [{ label: 'Подписка Speech Pro', amount: 50 }],
    });
  } catch (error) {
    console.error('Failed to send Stars invoice:', error);
    await bot.sendMessage(
      msg.chat.id,
      'Не удалось сформировать счет Telegram Stars. Попробуй чуть позже или используй бесплатные анализы.',
    );
  }
}

import type { BotClient, Message } from '@jilimb0/tgwrapper';
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
    '*Как пользоваться:*\n\n1. Отправь голосовое сообщение 30–60 секунд\n2. Получи отчёт по словам-паразитам\n3. Открой историю, чтобы отследить прогресс\n\n*Команды:*\n/start — начало\n/history — открыть историю\n/help — эта справка',
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

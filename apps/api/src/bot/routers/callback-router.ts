import type { BotClient, CallbackQuery } from '@tgwrapper/core';

export function registerCallbackRouter(bot: BotClient): void {
  bot.on('callback_query', async (query: CallbackQuery) => {
    const data = query.data ?? '';
    const chatId = query.message?.chat.id;

    if (!chatId) {
      await bot.answerCallbackQuery(query.id);
      return;
    }

    if (data === 'retry') {
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId, 'Запиши 30–60 секунд речи и отправь голосовое сообщение.');
      return;
    }

    if (data === 'buy_pro') {
      await bot.answerCallbackQuery(query.id);
      if (query.message) {
        const { handlePro } = await import('../handlers/commands.js');
        await handlePro(bot, query.message);
      }
      return;
    }

    await bot.answerCallbackQuery(query.id);
  });
}

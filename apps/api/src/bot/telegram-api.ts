import { ApiClient } from '@tgwrapper/core';
import { config } from '../config.js';

/**
 * Прямой ApiClient для операций, которые не входят в BotClient интерфейс
 * (удаление сообщений, скачивание файлов через getFile).
 */
let _apiClient: ApiClient | null = null;

export function getApiClient(): ApiClient {
  if (!_apiClient) {
    _apiClient = new ApiClient({ token: config.telegramBotToken });
  }
  return _apiClient;
}

export const TELEGRAM_FILE_BASE = `https://api.telegram.org/file/bot${config.telegramBotToken}`;

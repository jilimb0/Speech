import { useEffect, useState } from 'react';

interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
  };
  colorScheme: 'light' | 'dark';
  themeParams: TelegramThemeParams;
  expand(): void;
  ready(): void;
  close(): void;
  BackButton: {
    show(): void;
    hide(): void;
    onClick(fn: () => void): void;
    offClick(fn: () => void): void;
  };
  MainButton: {
    text: string;
    show(): void;
    hide(): void;
    onClick(fn: () => void): void;
    offClick(fn: () => void): void;
  };
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

function applyTheme(params: TelegramThemeParams): void {
  const root = document.documentElement;
  const map: [keyof TelegramThemeParams, string][] = [
    ['bg_color', '--tg-theme-bg-color'],
    ['text_color', '--tg-theme-text-color'],
    ['hint_color', '--tg-theme-hint-color'],
    ['link_color', '--tg-theme-link-color'],
    ['button_color', '--tg-theme-button-color'],
    ['button_text_color', '--tg-theme-button-text-color'],
    ['secondary_bg_color', '--tg-theme-secondary-bg-color'],
  ];
  for (const [key, cssVar] of map) {
    const val = params[key];
    if (val) root.style.setProperty(cssVar, val);
  }
}

export function useTelegram() {
  const tg = window.Telegram?.WebApp;
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!tg) {
      setIsReady(true);
      return;
    }
    tg.expand();
    tg.ready();
    applyTheme(tg.themeParams);
    setIsReady(true);
  }, [tg]);

  return {
    tg,
    isReady,
    initData: tg?.initData ?? '',
    user: tg?.initDataUnsafe.user,
    colorScheme: tg?.colorScheme ?? 'light',
  };
}

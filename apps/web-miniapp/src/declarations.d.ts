declare module '*.module.css' {
  const classes: { [className: string]: string };
  export default classes;
}

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
  version: string;
  platform: string;
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
  openTelegramLink?(url: string): void;
  openLink?(url: string): void;
  openInvoice?(url: string, callback?: (status: string) => void): void;
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

interface Window {
  Telegram?: { WebApp?: TelegramWebApp };
  webkit?: { messageHandlers?: Record<string, unknown> };
  TelegramWebviewProxy?: unknown;
}

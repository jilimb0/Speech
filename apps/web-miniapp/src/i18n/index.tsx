import type React from 'react';
import { createContext, useContext, useMemo, useState } from 'react';
import { en } from './en.js';
import { ru } from './ru.js';
import type { LanguageCode, Translations } from './types.js';
import { ua } from './ua.js';

const locales: Record<LanguageCode, Translations> = { ru, ua, en };

function detectLanguage(): LanguageCode {
  const tg = (window as unknown as Record<string, unknown>).Telegram as
    | { WebApp?: { initDataUnsafe?: { user?: { language_code?: string } } } }
    | undefined;
  const tgLang = tg?.WebApp?.initDataUnsafe?.user?.language_code;
  if (tgLang === 'uk' || tgLang === 'ru') return tgLang === 'uk' ? 'ua' : 'ru';

  const navLang = navigator.language?.slice(0, 2);
  if (navLang === 'uk' || navLang === 'ru') return navLang === 'uk' ? 'ua' : 'ru';

  return 'ru';
}

interface I18nCtx {
  t: Translations;
  lang: LanguageCode;
  setLang: (l: LanguageCode) => void;
}

const I18nContext = createContext<I18nCtx>({
  t: ru,
  lang: 'ru',
  setLang: () => {},
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<LanguageCode>(detectLanguage);
  const value = useMemo(() => ({ t: locales[lang], lang, setLang }), [lang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): I18nCtx {
  return useContext(I18nContext);
}

export type Language = 'ru' | 'en';

interface LanguageDictionary {
  multi: readonly string[];
  single: readonly string[];
}

const RU_FILLERS: LanguageDictionary = {
  multi: ['как бы', 'это самое', 'в общем', 'то есть', 'ну вот', 'ну как бы', 'ну то есть'],
  single: ['ну', 'короче', 'типа', 'вот', 'значит', 'блин', 'ладно', 'собственно'],
};

const EN_FILLERS: LanguageDictionary = {
  multi: ['you know', 'i mean', 'like um', 'sort of', 'kind of', 'you see', 'i guess'],
  single: [
    'like',
    'um',
    'uh',
    'well',
    'actually',
    'basically',
    'literally',
    'right',
    'okay',
    'so',
    'yeah',
  ],
};

const DICTIONARIES: Record<Language, LanguageDictionary> = {
  ru: RU_FILLERS,
  en: EN_FILLERS,
};

export function getFillers(language: Language): readonly string[] {
  const dict = DICTIONARIES[language];
  return [...dict.multi, ...dict.single];
}

export const ALL_FILLERS_RU: readonly string[] = [...RU_FILLERS.multi, ...RU_FILLERS.single];

export const ALL_FILLERS_EN: readonly string[] = [...EN_FILLERS.multi, ...EN_FILLERS.single];

export const MULTI_TOKEN_FILLERS: readonly string[] = RU_FILLERS.multi;
export const SINGLE_TOKEN_FILLERS: readonly string[] = RU_FILLERS.single;
export const ALL_FILLERS: readonly string[] = ALL_FILLERS_RU;

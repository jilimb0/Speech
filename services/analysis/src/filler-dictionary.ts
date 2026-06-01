/**
 * Стартовый словарь слов-паразитов для русского языка.
 * Многословные выражения идут первыми — они должны матчиться раньше однословных.
 */

export const MULTI_TOKEN_FILLERS: readonly string[] = [
  'как бы',
  'это самое',
  'в общем',
  'то есть',
  'ну вот',
  'ну как бы',
  'ну то есть',
] as const;

export const SINGLE_TOKEN_FILLERS: readonly string[] = [
  'ну',
  'короче',
  'типа',
  'вот',
  'значит',
  'блин',
  'ладно',
  'собственно',
] as const;

/** Все fillers в порядке приоритета матчинга (multi перед single) */
export const ALL_FILLERS: readonly string[] = [
  ...MULTI_TOKEN_FILLERS,
  ...SINGLE_TOKEN_FILLERS,
] as const;

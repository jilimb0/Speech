import { Button, Text } from '@ui-construction-library/core';
import { BackButton } from '../components/BackButton.js';
import { PageHeader } from '../components/PageHeader.js';

const FEATURES = [
  'Безлимитные сессии голосового анализа',
  'Детальная статистика по словам-паразитам',
  'Расширенные рекомендации',
  'Приоритетная обработка записей',
];

export function PremiumScreen() {
  return (
    <div className="min-h-dvh pb-10">
      <PageHeader title="Премиум" left={<BackButton />} />

      <div className="flex flex-col items-center px-6 pt-8 pb-6 gap-6 text-center">
        <div className="text-5xl">⭐</div>
        <Text className="text-2xl font-bold leading-tight">Чище Премиум</Text>
        <Text className="text-sm text-[var(--tg-theme-hint-color)] leading-relaxed">
          Полный доступ ко всем возможностям анализа речи
        </Text>
      </div>

      <section className="px-6 pb-6">
        <ul className="flex flex-col gap-3">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-3">
              <Text className="text-lg leading-none mt-0.5">✅</Text>
              <Text className="text-sm leading-relaxed">{f}</Text>
            </li>
          ))}
        </ul>
      </section>

      <section className="px-6">
        <Button
          className="w-full py-3 text-base font-semibold rounded-xl"
          onClick={() => {
            window.open('https://t.me/clean_speech_bot', '_blank');
          }}
        >
          Купить Премиум
        </Button>
        <Text className="text-xs text-center text-[var(--tg-theme-hint-color)] mt-3">
          Скоро — оплата через Telegram Stars
        </Text>
      </section>
    </div>
  );
}

import { Button, Text } from '@ui-construction-library/core';
import { useState } from 'react';
import { api } from '../api/client.js';
import { BackButton } from '../components/BackButton.js';
import { PageHeader } from '../components/PageHeader.js';
import { useTranslation } from '../i18n/index.js';

export function PremiumScreen() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleBuy() {
    setLoading(true);
    setError(null);
    try {
      const { link } = await api.createInvoice();
      window.open(link, '_blank');
    } catch (e) {
      setError(e instanceof Error ? e.message : t.premium.paymentError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh pb-10">
      <PageHeader title={t.premium.title} left={<BackButton />} />

      <div className="flex flex-col items-center px-6 pt-8 pb-6 gap-6 text-center">
        <div className="text-5xl">⭐</div>
        <Text className="text-2xl font-bold leading-tight">{t.premium.heading}</Text>
        <Text className="text-sm text-[var(--tg-theme-hint-color)] leading-relaxed">
          {t.premium.subtitle}
        </Text>
      </div>

      <section className="px-6 pb-6">
        <ul className="flex flex-col gap-3">
          {t.premium.features.map((f) => (
            <li key={f} className="flex items-start gap-3">
              <Text className="text-lg leading-none mt-0.5">✅</Text>
              <Text className="text-sm leading-relaxed">{f}</Text>
            </li>
          ))}
        </ul>
      </section>

      <section className="px-6 flex flex-col gap-3">
        <Button
          className="w-full py-3 text-base font-semibold rounded-xl"
          disabled={loading}
          onClick={handleBuy}
        >
          {loading ? t.premium.buying : t.premium.buy}
        </Button>
        {error && <Text className="text-xs text-center text-[#ff3b30]">{error}</Text>}
      </section>
    </div>
  );
}

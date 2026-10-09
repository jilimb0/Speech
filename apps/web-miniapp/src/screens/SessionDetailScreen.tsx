import type { Session } from '@speech/shared';
import { Badge, Button, Card, Skeleton, Text } from '@ui-construction-library/core';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { BackButton } from '../components/BackButton.js';
import { PageHeader } from '../components/PageHeader.js';
import { ScoreRing } from '../components/ScoreRing.js';
import { useTranslation } from '../i18n/index.js';

function MetricCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col gap-1 p-3 bg-[var(--tg-theme-secondary-bg-color)] rounded-xl">
      <Text className="text-xl font-semibold">{value}</Text>
      <Text className="text-xs text-[var(--tg-theme-hint-color)] leading-tight">{label}</Text>
    </div>
  );
}

export function SessionDetailScreen() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleShare = () => {
    if (!session) return;
    const text = `Моя чистота речи: ${session.sessionScore}/100! Проверь свою речь:`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent('https://t.me/SpeechAnalyzerBot')}&text=${encodeURIComponent(text)}`;
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, '_blank');
    }
  };

  useEffect(() => {
    if (!id) return;
    api
      .getSession(id)
      .then(setSession)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : t.session.loadError))
      .finally(() => setLoading(false));
  }, [id, t.session.loadError]);

  const rateLabels: Record<string, string> = {
    slow: t.session.slow,
    moderate: t.session.moderate,
    fast: t.session.fast,
  };

  if (loading) {
    return (
      <div className="min-h-dvh">
        <PageHeader title={t.session.title} left={<BackButton />} />
        <div className="p-4 flex flex-col gap-4">
          <Skeleton className="h-36 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-dvh">
        <PageHeader title={t.session.title} left={<BackButton />} />
        <div className="flex flex-col items-center justify-center min-h-[60dvh] p-6 gap-4 text-center">
          <Text className="text-[#ff3b30]">{error ?? t.session.notFound}</Text>
        </div>
      </div>
    );
  }

  const transcriptSnippet =
    session.normalizedTranscript.length > 250
      ? `${session.normalizedTranscript.slice(0, 250)}…`
      : session.normalizedTranscript;

  return (
    <div className="min-h-dvh pb-10">
      <PageHeader title={t.session.title} left={<BackButton />} />

      {/* Score block */}
      <div className="flex flex-col items-center py-6 gap-3">
        <ScoreRing score={session.sessionScore} size={128} />
        <Button variant="outline" size="sm" onClick={handleShare}>
          Поделиться результатом ↗
        </Button>
      </div>

      <hr className="mx-4 border-[var(--tg-theme-secondary-bg-color)]" />

      {/* Metrics grid */}
      <section className="p-4">
        <Text className="text-xs font-semibold uppercase tracking-wider text-[var(--tg-theme-hint-color)] mb-3">
          {t.session.metrics}
        </Text>
        <div className="grid grid-cols-2 gap-2.5">
          <MetricCard value={session.totalFillers} label={t.session.fillersTotal} />
          <MetricCard value={`${session.fillersPerMinute}/мин`} label={t.session.fillersPerMin} />
          <MetricCard value={`${session.wordsPerMinute}`} label={t.session.wordsPerMin} />
          <MetricCard
            value={rateLabels[session.speechRate] ?? t.session.moderate}
            label={t.session.speechRate}
          />
          {session.pauseMetrics && session.pauseMetrics.pauseCount > 0 && (
            <MetricCard
              value={`${session.pauseMetrics.pauseCount} (${session.pauseMetrics.longestPauseSec}с)`}
              label="Пауз зависания (макс)"
            />
          )}
        </div>
      </section>

      <hr className="mx-4 border-[var(--tg-theme-secondary-bg-color)]" />

      {session.topFillers.length > 0 && (
        <section className="p-4">
          <Text className="text-xs font-semibold uppercase tracking-wider text-[var(--tg-theme-hint-color)] mb-3">
            {t.session.topFillers}
          </Text>
          <div className="flex flex-col gap-2">
            {session.topFillers.map((f) => (
              <div
                key={f.filler}
                className="flex items-center justify-between px-3 py-2.5 bg-[var(--tg-theme-secondary-bg-color)] rounded-xl"
              >
                <Text className="font-medium">«{f.filler}»</Text>
                <Badge variant="default">
                  {f.count} {t.session.times}
                </Badge>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* AI Coach Exercises */}
      {session.exercises && session.exercises.length > 0 && (
        <>
          <hr className="mx-4 border-[var(--tg-theme-secondary-bg-color)]" />
          <section className="p-4">
            <Text className="text-xs font-semibold uppercase tracking-wider text-[var(--tg-theme-hint-color)] mb-3">
              🎯 Упражнения от ИИ-коуча
            </Text>
            <div className="flex flex-col gap-3">
              {session.exercises.map((ex) => (
                <Card
                  key={ex.title}
                  className="bg-[var(--tg-theme-secondary-bg-color)] border-0 rounded-2xl p-4 flex flex-col gap-1.5"
                >
                  <Text className="font-bold text-sm">{ex.title}</Text>
                  <Text className="text-xs text-[var(--tg-theme-hint-color)] leading-relaxed">
                    {ex.description}
                  </Text>
                  {ex.practiceText && (
                    <Text className="text-xs italic bg-[var(--tg-theme-bg-color)] p-2 rounded-lg mt-1 text-[var(--tg-theme-text-color)]">
                      {ex.practiceText}
                    </Text>
                  )}
                </Card>
              ))}
            </div>
          </section>
        </>
      )}

      {/* Transcript snippet */}
      {transcriptSnippet && (
        <>
          <hr className="mx-4 border-[var(--tg-theme-secondary-bg-color)]" />
          <section className="p-4">
            <Text className="text-xs font-semibold uppercase tracking-wider text-[var(--tg-theme-hint-color)] mb-3">
              {t.session.transcript}
            </Text>
            <Text className="text-sm text-[var(--tg-theme-hint-color)] italic leading-relaxed">
              {transcriptSnippet}
            </Text>
          </section>
        </>
      )}

      <hr className="mx-4 border-[var(--tg-theme-secondary-bg-color)]" />

      <section className="p-4">
        <div className="bg-[var(--tg-theme-secondary-bg-color)] rounded-2xl p-4">
          <Text className="text-[15px] leading-relaxed">💡 {session.advice}</Text>
        </div>
      </section>
    </div>
  );
}

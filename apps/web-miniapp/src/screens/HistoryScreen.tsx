import type { SessionListItem } from '@speech/shared';
import { Badge, Button, Skeleton, Text } from '@ui-construction-library/core';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { PageHeader } from '../components/PageHeader.js';
import { ScoreBadge } from '../components/ScoreBadge.js';
import { useTranslation } from '../i18n/index.js';

function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('ru', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function HistoryScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getSessions()
      .then(setSessions)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : t.history.loadError))
      .finally(() => setLoading(false));
  }, [t.history.loadError]);

  return (
    <div className="min-h-dvh pb-20">
      <PageHeader
        title={t.history.title}
        right={
          <Button variant="ghost" size="sm" onClick={() => navigate('/progress')}>
            {t.history.progress}
          </Button>
        }
      />

      {loading && (
        <div className="p-4 flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton list
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center justify-center min-h-[60dvh] p-6 gap-4 text-center">
          <Text className="text-[#ff3b30]">{error}</Text>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            {t.history.retry}
          </Button>
        </div>
      )}

      {!loading && !error && sessions.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[60dvh] p-6 gap-4 text-center">
          <svg
            width="80"
            height="80"
            viewBox="0 0 80 80"
            fill="none"
            role="img"
            aria-label="Нет сессий"
          >
            <rect width="80" height="80" rx="40" fill="var(--tg-theme-secondary-bg-color)" />
            <path
              d="M48 28c-8.8 0-16 7.2-16 16 0 3.6 1.2 6.8 3.2 9.6L32 58l6-3.2a15.6 15.6 0 0 0 10 3.6c8.8 0 16-7.2 16-16s-7.2-16-16-16zm0 28.8c-2.8 0-5.6-.8-8-2.4l-.4-.4-4.4 2 1.6-4-.4-.4A13.2 13.2 0 0 1 34.4 44C34.4 36.4 40.4 30.4 48 30.4S61.6 36.4 61.6 44 55.6 56.8 48 56.8zM43.6 44c0-.8-.4-1.2-1.2-1.2H42c-.8 0-1.2.4-1.2 1.2 0 .8.4 1.2 1.2 1.2h.4c.8 0 1.2-.4 1.2-1.2zm5.2 0c0-.8-.4-1.2-1.2-1.2s-1.2.4-1.2 1.2.4 1.2 1.2 1.2 1.2-.4 1.2-1.2zm5.2 0c0-.8-.4-1.2-1.2-1.2s-1.2.4-1.2 1.2.4 1.2 1.2 1.2 1.2-.4 1.2-1.2z"
              fill="var(--tg-theme-hint-color)"
              opacity="0.4"
            />
          </svg>
          <Text className="text-xl font-semibold">{t.history.empty}</Text>
          <Text className="text-[var(--tg-theme-hint-color)] text-sm leading-relaxed max-w-[260px]">
            {t.history.emptyHint}
          </Text>
          <Text className="text-[var(--tg-theme-hint-color)] text-xs mt-1">
            {t.history.emptyTip}
          </Text>
        </div>
      )}

      {!loading && !error && sessions.length > 0 && (
        <ul>
          {sessions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => navigate(`/session/${s.id}`)}
                className="w-full text-left px-4 py-3.5 border-b border-[var(--tg-theme-secondary-bg-color)] active:bg-[var(--tg-theme-secondary-bg-color)] transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <Text className="text-[15px]">{formatDate(s.createdAt)}</Text>
                  <ScoreBadge score={s.sessionScore} />
                </div>
                <div className="flex items-center gap-3">
                  <Text className="text-[13px] text-[var(--tg-theme-hint-color)]">
                    {s.audioDurationSec} {t.history.sec}
                  </Text>
                  <Text className="text-[13px] text-[var(--tg-theme-hint-color)]">
                    {s.totalFillers} {t.history.fillers}
                    {s.topFiller ? (
                      <>
                        {' '}
                        ·{' '}
                        <Badge variant="default" className="text-xs">
                          «{s.topFiller.filler}»
                        </Badge>
                      </>
                    ) : null}
                  </Text>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import type { SessionListItem } from '@speech/shared';
import { Badge, Button, Skeleton, Text } from '@ui-construction-library/core';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { PageHeader } from '../components/PageHeader.js';
import { ScoreBadge } from '../components/ScoreBadge.js';

function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('ru', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function HistoryScreen() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getSessions()
      .then(setSessions)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-dvh pb-20">
      <PageHeader
        title="История"
        right={
          <Button variant="ghost" size="sm" onClick={() => navigate('/progress')}>
            Прогресс
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
            Повторить
          </Button>
        </div>
      )}

      {!loading && !error && sessions.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[60dvh] p-6 gap-2 text-center">
          <Text>Сессий пока нет.</Text>
          <Text className="text-[var(--tg-theme-hint-color)] text-sm">
            Отправь голосовое сообщение боту, чтобы начать.
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
                    {s.audioDurationSec} сек
                  </Text>
                  <Text className="text-[13px] text-[var(--tg-theme-hint-color)]">
                    {s.totalFillers} паразитов
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

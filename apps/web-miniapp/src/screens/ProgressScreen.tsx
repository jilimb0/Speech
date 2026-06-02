import type { ProgressSummary } from '@speech/shared';
import { Button, Card, Divider, Skeleton, Text } from '@ui-construction-library/core';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { BackButton } from '../components/BackButton.js';
import { PageHeader } from '../components/PageHeader.js';

interface StatCardProps {
  value: string | number;
  label: string;
  valueColor?: string | undefined;
}

function StatCard({ value, label, valueColor }: StatCardProps) {
  return (
    <Card className="flex flex-col gap-1.5 p-4 bg-[var(--tg-theme-secondary-bg-color)] border-0 rounded-2xl">
      <Text
        className="text-3xl font-bold leading-none"
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </Text>
      <Text className="text-xs text-[var(--tg-theme-hint-color)] leading-snug">{label}</Text>
    </Card>
  );
}

function ProgressGrid({ progress }: { progress: ProgressSummary }) {
  const navigate = useNavigate();

  const deltaColor =
    progress.lastSessionDelta == null
      ? undefined
      : progress.lastSessionDelta >= 0
        ? '#34c759'
        : '#ff3b30';

  const deltaValue =
    progress.lastSessionDelta != null
      ? `${progress.lastSessionDelta > 0 ? '+' : ''}${progress.lastSessionDelta}`
      : '—';

  return (
    <>
      <div className="p-4 grid grid-cols-2 gap-2.5">
        <StatCard value={progress.avgScore7d ?? '—'} label="Средний score за 7 дней" />
        <StatCard value={progress.bestScore ?? '—'} label="Лучший результат" />
        <StatCard
          value={progress.avgFillersPerMinute7d ?? '—'}
          label="Паразитов в минуту (7 дней)"
        />
        <StatCard value={progress.totalSessions} label="Всего сессий" />
        <StatCard value={deltaValue} label="Изменение к прошлой сессии" valueColor={deltaColor} />
      </div>

      <Divider className="mx-4" />
      {progress.totalSessions === 0 ? (
        <div className="p-6 text-center">
          <Text className="text-[var(--tg-theme-hint-color)] text-sm">
            Данных пока нет. Сделай первую запись в боте.
          </Text>
        </div>
      ) : (
        <div className="p-4">
          <Button variant="outline" className="w-full" onClick={() => navigate('/')}>
            Посмотреть историю сессий
          </Button>
        </div>
      )}
    </>
  );
}

export function ProgressScreen() {
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getProgress()
      .then(setProgress)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-dvh pb-10">
      <PageHeader title="Прогресс" left={<BackButton />} />

      {loading && (
        <div className="p-4 grid grid-cols-2 gap-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
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

      {!loading && !error && progress && <ProgressGrid progress={progress} />}
    </div>
  );
}

import type { ProgressSummary } from '@speech/shared';
import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import styles from './ProgressScreen.module.css';

interface Props {
  onBack: () => void;
}

export function ProgressScreen({ onBack }: Props) {
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

  if (loading) {
    return (
      <div className={styles.center}>
        <p>Загружаем прогресс…</p>
      </div>
    );
  }

  if (error || !progress) {
    return (
      <div className={styles.center}>
        <p className={styles.error}>{error ?? 'Нет данных'}</p>
        <button type="button" className={styles.backBtn} onClick={onBack}>
          ← Назад
        </button>
      </div>
    );
  }

  const deltaSign = progress.lastSessionDelta !== null && progress.lastSessionDelta > 0 ? '+' : '';
  const deltaColor =
    progress.lastSessionDelta === null
      ? 'inherit'
      : progress.lastSessionDelta >= 0
        ? '#34c759'
        : '#ff3b30';

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={onBack}>
          ← Назад
        </button>
        <span className={styles.headerTitle}>Прогресс</span>
      </header>

      <div className={styles.grid}>
        <div className={styles.card}>
          <span className={styles.cardValue}>
            {progress.avgScore7d !== null ? progress.avgScore7d : '—'}
          </span>
          <span className={styles.cardLabel}>Средний score за 7 дней</span>
        </div>

        <div className={styles.card}>
          <span className={styles.cardValue}>
            {progress.bestScore !== null ? progress.bestScore : '—'}
          </span>
          <span className={styles.cardLabel}>Лучший результат</span>
        </div>

        <div className={styles.card}>
          <span className={styles.cardValue}>
            {progress.avgFillersPerMinute7d !== null ? progress.avgFillersPerMinute7d : '—'}
          </span>
          <span className={styles.cardLabel}>Паразитов в минуту (7 дней)</span>
        </div>

        <div className={styles.card}>
          <span className={styles.cardValue}>{progress.totalSessions}</span>
          <span className={styles.cardLabel}>Всего сессий</span>
        </div>

        {progress.lastSessionDelta !== null && (
          <div className={styles.card}>
            <span className={styles.cardValue} style={{ color: deltaColor }}>
              {deltaSign}{progress.lastSessionDelta}
            </span>
            <span className={styles.cardLabel}>Изменение к прошлой сессии</span>
          </div>
        )}
      </div>
    </div>
  );
}

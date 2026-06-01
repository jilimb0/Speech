import type { Session } from '@speech/shared';
import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import styles from './SessionDetailScreen.module.css';

interface Props {
  sessionId: string;
  onBack: () => void;
}

const RATE_LABELS = {
  slow: 'медленный',
  moderate: 'умеренный',
  fast: 'быстрый',
} as const;

export function SessionDetailScreen({ sessionId, onBack }: Props) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getSession(sessionId)
      .then(setSession)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className={styles.center}>
        <p>Загружаем сессию…</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className={styles.center}>
        <p className={styles.error}>{error ?? 'Сессия не найдена'}</p>
        <button type="button" className={styles.backBtn} onClick={onBack}>
          ← Назад
        </button>
      </div>
    );
  }

  const scoreColor =
    session.sessionScore >= 85
      ? '#34c759'
      : session.sessionScore >= 70
        ? '#ff9500'
        : session.sessionScore >= 50
          ? '#ff6b35'
          : '#ff3b30';

  const transcriptSnippet =
    session.normalizedTranscript.length > 200
      ? `${session.normalizedTranscript.slice(0, 200)}…`
      : session.normalizedTranscript;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={onBack}>
          ← Назад
        </button>
        <span className={styles.headerTitle}>Сессия</span>
      </header>

      <div className={styles.scoreBlock}>
        <span className={styles.scoreValue} style={{ color: scoreColor }}>
          {session.sessionScore}
        </span>
        <span className={styles.scoreLabel}>{session.summaryText}</span>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Метрики</h2>
        <div className={styles.metrics}>
          <div className={styles.metric}>
            <span className={styles.metricValue}>{session.totalFillers}</span>
            <span className={styles.metricLabel}>паразитов</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricValue}>{session.fillersPerMinute}</span>
            <span className={styles.metricLabel}>в минуту</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricValue}>{session.wordsPerMinute}</span>
            <span className={styles.metricLabel}>слов/мин</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricValue}>{RATE_LABELS[session.speechRate]}</span>
            <span className={styles.metricLabel}>темп</span>
          </div>
        </div>
      </div>

      {session.topFillers.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Топ паразитов</h2>
          <ul className={styles.fillerList}>
            {session.topFillers.map((f) => (
              <li key={f.filler} className={styles.fillerItem}>
                <span className={styles.fillerWord}>«{f.filler}»</span>
                <span className={styles.fillerCount}>{f.count} раз</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {transcriptSnippet && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Фрагмент записи</h2>
          <p className={styles.transcript}>{transcriptSnippet}</p>
        </div>
      )}

      <div className={styles.adviceBlock}>
        <p className={styles.advice}>💡 {session.advice}</p>
      </div>
    </div>
  );
}

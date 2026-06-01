import type { SessionListItem } from '@speech/shared';
import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import styles from './HistoryScreen.module.css';

interface Props {
  onSelectSession: (id: string) => void;
  onProgress: () => void;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ru', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 85 ? '#34c759' : score >= 70 ? '#ff9500' : score >= 50 ? '#ff6b35' : '#ff3b30';
  return (
    <span className={styles.score} style={{ color }}>
      {score}
    </span>
  );
}

export function HistoryScreen({ onSelectSession, onProgress }: Props) {
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

  if (loading) {
    return (
      <div className={styles.center}>
        <p className={styles.hint}>Загружаем историю…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.center}>
        <p className={styles.error}>{error}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>История</h1>
        <button type="button" className={styles.progressBtn} onClick={onProgress}>
          Прогресс
        </button>
      </header>

      {sessions.length === 0 ? (
        <div className={styles.empty}>
          <p>Сессий пока нет.</p>
          <p className={styles.hint}>Отправь голосовое сообщение боту, чтобы начать.</p>
        </div>
      ) : (
        <ul className={styles.list}>
          {sessions.map((s) => (
            <li key={s.id}>
              <button type="button" className={styles.card} onClick={() => onSelectSession(s.id)}>
                <div className={styles.cardTop}>
                  <span className={styles.date}>{formatDate(s.createdAt)}</span>
                  <ScoreBadge score={s.sessionScore} />
                </div>
                <div className={styles.cardBottom}>
                  <span className={styles.meta}>{s.audioDurationSec} сек</span>
                  <span className={styles.meta}>
                    {s.totalFillers} паразитов
                    {s.topFiller ? ` · «${s.topFiller.filler}»` : ''}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

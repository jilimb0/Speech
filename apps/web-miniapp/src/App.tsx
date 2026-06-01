import { useEffect, useState } from 'react';
import { HistoryScreen } from './screens/HistoryScreen.js';
import { ProgressScreen } from './screens/ProgressScreen.js';
import { SessionDetailScreen } from './screens/SessionDetailScreen.js';

type Screen =
  | { name: 'history' }
  | { name: 'session'; id: string }
  | { name: 'progress' };

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'history' });

  // Применяем тему Telegram
  useEffect(() => {
    const tg = (window as Window & { Telegram?: { WebApp?: { expand?: () => void; ready?: () => void } } }).Telegram;
    tg?.WebApp?.expand?.();
    tg?.WebApp?.ready?.();
  }, []);

  const navigate = (s: Screen) => setScreen(s);

  if (screen.name === 'session') {
    return (
      <SessionDetailScreen
        sessionId={screen.id}
        onBack={() => navigate({ name: 'history' })}
      />
    );
  }

  if (screen.name === 'progress') {
    return (
      <ProgressScreen onBack={() => navigate({ name: 'history' })} />
    );
  }

  return (
    <HistoryScreen
      onSelectSession={(id) => navigate({ name: 'session', id })}
      onProgress={() => navigate({ name: 'progress' })}
    />
  );
}

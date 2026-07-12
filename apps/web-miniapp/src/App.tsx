import { lazy, useEffect } from 'react';
import { Route, HashRouter as Router, Routes } from 'react-router-dom';
import { setInitData } from './api/client.js';
import { useTelegram } from './hooks/index.js';
import { HistoryScreen } from './screens/HistoryScreen.js';
import { PremiumScreen } from './screens/PremiumScreen.js';
import { ProgressScreen } from './screens/ProgressScreen.js';
import { SessionDetailScreen } from './screens/SessionDetailScreen.js';

const DebugScreen = import.meta.env.DEV
  ? lazy(() => import('./screens/DebugScreen.js').then((m) => ({ default: m.DebugScreen })))
  : null;

export function App() {
  const { initData } = useTelegram();

  useEffect(() => {
    setInitData(initData);
  }, [initData]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<HistoryScreen />} />
        <Route path="/session/:id" element={<SessionDetailScreen />} />
        <Route path="/progress" element={<ProgressScreen />} />
        <Route path="/premium" element={<PremiumScreen />} />
        {DebugScreen && <Route path="/debug" element={<DebugScreen />} />}
      </Routes>
    </Router>
  );
}

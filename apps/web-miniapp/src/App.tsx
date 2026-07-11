import { useEffect } from 'react';
import { Route, HashRouter as Router, Routes } from 'react-router-dom';
import { setInitData } from './api/client.js';
import { useTelegram } from './hooks/index.js';
import { DebugScreen } from './screens/DebugScreen.js';
import { HistoryScreen } from './screens/HistoryScreen.js';
import { ProgressScreen } from './screens/ProgressScreen.js';
import { SessionDetailScreen } from './screens/SessionDetailScreen.js';

export function App() {
  const { initData } = useTelegram();

  useEffect(() => {
    if (initData) setInitData(initData);
  }, [initData]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<HistoryScreen />} />
        <Route path="/session/:id" element={<SessionDetailScreen />} />
        <Route path="/progress" element={<ProgressScreen />} />
        <Route path="/debug" element={<DebugScreen />} />
      </Routes>
    </Router>
  );
}

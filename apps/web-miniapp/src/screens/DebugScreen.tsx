import { useEffect, useState } from 'react';
import { api, setInitData } from '../api/client.js';
import { useTelegram } from '../hooks/index.js';

export function DebugScreen() {
  const { tg, initData, user } = useTelegram();
  const [apiResult, setApiResult] = useState<string>('');

  useEffect(() => {
    if (initData) {
      setInitData(initData);
      api.getMe().then(
        (u) => setApiResult(`OK: ${u.firstName} (${u.plan})`),
        (e) => setApiResult(`Error: ${e.message}`),
      );
    } else {
      setApiResult('No initData — outside Telegram WebView');
    }
  }, [initData]);

  return (
    <div style={{ padding: 16, fontFamily: 'monospace', fontSize: 13 }}>
      <h2>Telegram Debug</h2>
      <pre>
        {JSON.stringify(
          {
            hasTg: !!tg,
            initData: initData ? `${initData.slice(0, 60)}...` : '(empty)',
            url: typeof window !== 'undefined' ? window.location.href : '(ssr)',
            user,
            apiResult,
          },
          null,
          2,
        )}
      </pre>
    </div>
  );
}

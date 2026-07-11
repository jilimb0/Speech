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
      setApiResult('No initData from Telegram.WebApp');
    }
  }, [initData]);

  const w = typeof window !== 'undefined' ? window : null;
  const bridges = {
    wk: !!(w as any)?.webkit?.messageHandlers?.TelegramWebviewProxy,
    android: !!(w as any)?.TelegramWebviewProxy,
    tgScript: !!(w as any)?.Telegram,
    tgApp: !!(w as any)?.Telegram?.WebApp,
  };

  return (
    <div style={{ padding: 16, fontFamily: 'monospace', fontSize: 13 }}>
      <h2>Telegram Debug</h2>
      <pre>
        {JSON.stringify(
          {
            bridges,
            tgVersion: tg?.version ?? '(none)',
            tgPlatform: tg?.platform ?? '(none)',
            initData: initData ? `${initData.slice(0, 60)}...` : '(empty)',
            url: window.location.href,
            params: Object.fromEntries(new URLSearchParams(window.location.search).entries()),
            user,
            apiResult,
          },
          null,
          2,
        )}
      </pre>
      <p style={{ fontSize: 11, color: '#999' }}>
        wk=iOS bridge · android=Android bridge · tgScript=window.Telegram · tgApp=WebApp object
      </p>
    </div>
  );
}

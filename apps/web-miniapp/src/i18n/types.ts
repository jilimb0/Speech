export interface Translations {
  premium: {
    title: string;
    heading: string;
    subtitle: string;
    features: string[];
    buy: string;
    buying: string;
    paymentError: string;
  };
  history: {
    title: string;
    progress: string;
    empty: string;
    emptyHint: string;
    emptyTip: string;
    sec: string;
    fillers: string;
    loadError: string;
    retry: string;
  };
  session: {
    title: string;
    notFound: string;
    metrics: string;
    fillersTotal: string;
    fillersPerMin: string;
    wordsPerMin: string;
    speechRate: string;
    topFillers: string;
    times: string;
    transcript: string;
    loadError: string;
    slow: string;
    moderate: string;
    fast: string;
  };
  progress: {
    title: string;
    avgScore7d: string;
    bestScore: string;
    fillersPerMin7d: string;
    totalSessions: string;
    delta: string;
    empty: string;
    viewHistory: string;
    loadError: string;
    retry: string;
  };
}

export type LanguageCode = 'ru' | 'ua' | 'en';

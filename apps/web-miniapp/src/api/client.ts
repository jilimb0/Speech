import type { ApiResult, ProgressSummary, Session, SessionListItem, User } from '@speech/shared';

let _initData = '';

export function setInitData(initData: string): void {
  _initData = initData;
}

async function apiFetch<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    headers: {
      'x-telegram-init-data': _initData,
      'Content-Type': 'application/json',
    },
  });

  const result = (await response.json()) as ApiResult<T>;

  if (!result.ok) {
    throw new Error(result.error);
  }

  return result.data;
}

export const api = {
  getMe: () => apiFetch<User>('/api/me'),

  getSessions: (limit = 20, offset = 0) =>
    apiFetch<SessionListItem[]>(`/api/sessions?limit=${limit}&offset=${offset}`),

  getSession: (id: string) => apiFetch<Session>(`/api/sessions/${id}`),

  getProgress: () => apiFetch<ProgressSummary>('/api/progress/summary'),
};

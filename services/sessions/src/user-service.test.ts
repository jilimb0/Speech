import { describe, expect, it, vi } from 'vitest';

const mockSql = vi.fn();

vi.mock('../src/db.js', () => ({
  getDb: vi.fn(() => mockSql),
}));

import { getUserById, getUserByTelegramId, upsertUser } from '../src/user-service.js';

describe('getUserByTelegramId', () => {
  it('returns null when user not found', async () => {
    mockSql.mockResolvedValueOnce([]);
    expect(await getUserByTelegramId(12345)).toBeNull();
  });

  it('returns user when found', async () => {
    mockSql.mockResolvedValueOnce([
      {
        id: 'u1',
        telegram_user_id: 12345,
        username: 'test',
        first_name: 'Test',
        plan: 'free',
        first_seen_at: new Date(),
        last_seen_at: new Date(),
        custom_filler_list: [],
      },
    ]);
    const user = await getUserByTelegramId(12345);
    expect(user).not.toBeNull();
    expect(user?.telegramUserId).toBe(12345);
  });
});

describe('getUserById', () => {
  it('returns null for non-existent user', async () => {
    mockSql.mockResolvedValueOnce([]);
    expect(await getUserById('nonexistent')).toBeNull();
  });
});

describe('upsertUser', () => {
  it('creates a new user', async () => {
    mockSql.mockResolvedValueOnce([
      {
        id: 'new-u1',
        telegram_user_id: 999,
        username: 'newuser',
        first_name: 'New',
        plan: 'free',
        first_seen_at: new Date(),
        last_seen_at: new Date(),
        custom_filler_list: [],
      },
    ]);
    const user = await upsertUser({ telegramUserId: 999, username: 'newuser', firstName: 'New' });
    expect(user.telegramUserId).toBe(999);
  });
});

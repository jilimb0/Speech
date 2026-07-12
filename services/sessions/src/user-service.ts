import type { CreateUserInput, User } from '@speech/shared';
import { getDb } from './db.js';

interface UserRow {
  id: string;
  telegram_user_id: number;
  username: string | null;
  first_name: string | null;
  plan: string;
  first_seen_at: Date;
  last_seen_at: Date;
  custom_filler_list: string[];
}

function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    telegramUserId: row.telegram_user_id,
    username: row.username,
    firstName: row.first_name,
    plan: row.plan as User['plan'],
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    customFillerList: row.custom_filler_list ?? [],
  };
}

export async function upsertUser(input: CreateUserInput): Promise<User> {
  const sql = getDb();

  const rows = await sql<UserRow[]>`
    INSERT INTO users (telegram_user_id, username, first_name, plan)
    VALUES (${input.telegramUserId}, ${input.username ?? null}, ${input.firstName ?? null}, ${input.plan ?? 'free'})
    ON CONFLICT (telegram_user_id) DO UPDATE
      SET username = EXCLUDED.username,
          first_name = EXCLUDED.first_name,
          last_seen_at = NOW(),
          plan = CASE WHEN ${input.plan ?? 'free'} = 'premium' THEN 'premium' ELSE users.plan END
    RETURNING *
  `;

  const row = rows[0];
  if (!row) throw new Error('Failed to upsert user');
  return rowToUser(row);
}

export async function getUserByTelegramId(telegramUserId: number): Promise<User | null> {
  const sql = getDb();

  const rows = await sql<UserRow[]>`
    SELECT * FROM users WHERE telegram_user_id = ${telegramUserId}
  `;

  const row = rows[0];
  return row ? rowToUser(row) : null;
}

export async function getUserById(id: string): Promise<User | null> {
  const sql = getDb();

  const rows = await sql<UserRow[]>`
    SELECT * FROM users WHERE id = ${id}
  `;

  const row = rows[0];
  return row ? rowToUser(row) : null;
}

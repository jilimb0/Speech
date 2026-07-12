export type Plan = 'free' | 'premium' | 'early_access';

export interface User {
  id: string;
  telegramUserId: number;
  username: string | null;
  firstName: string | null;
  plan: Plan;
  firstSeenAt: Date;
  lastSeenAt: Date;
  customFillerList: string[];
}

export interface CreateUserInput {
  telegramUserId: number;
  username?: string | null;
  firstName?: string | null;
  plan?: Plan;
}

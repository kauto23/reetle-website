export interface DailyUsage {
  used: number;
  limit: number;
  resets_at: string;
}

export interface SubscriptionDailyUsage {
  articles: DailyUsage;
  audio: DailyUsage;
  practice: DailyUsage;
}

export interface SubscriptionStatus {
  is_premium: boolean;
  platform: 'stripe' | 'apple' | 'google' | 'referral' | null;
  expiration_date: string | null;
  daily_usage: SubscriptionDailyUsage | null;
}

export interface ReferralInfo {
  code: string;
  referrals_made: number;
  referrals_rewarded: number;
}

export interface ReferralApplyResponse {
  status: 'ok' | 'error';
  message: string;
}

export interface CancelSubscriptionResponse {
  status: 'ok';
  platform: 'stripe' | 'apple' | 'google';
  cancellation_effective_date: string;
  is_premium_until: string;
  requires_user_action: boolean;
  management_url?: string;
  message?: string;
}

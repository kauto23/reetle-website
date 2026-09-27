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

export type SubscriptionPlatform = 'stripe' | 'apple' | 'google' | 'referral' | 'complimentary';

/**
 * A failed renewal payment the store is still retrying.
 * grace_period: still premium until access_until. billing_retry: premium paused.
 */
export interface BillingIssue {
  state: 'grace_period' | 'billing_retry';
  platform: 'stripe' | 'apple' | 'google';
  since: string | null;
  access_until: string | null;
}

export interface SubscriptionStatus {
  is_premium: boolean;
  platform: SubscriptionPlatform | null;
  expiration_date: string | null;
  /** Auto-renew on at period end. Older cached blocks may not have it. */
  will_renew?: boolean;
  cancelled_at?: string | null;
  billing_issue?: BillingIssue | null;
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

export interface ResumeSubscriptionResponse {
  status: 'ok';
  platform: 'stripe' | 'apple' | 'google';
  will_renew: boolean;
  requires_user_action: boolean;
  renews_on?: string;
  management_url?: string;
  already_renewing?: boolean;
}

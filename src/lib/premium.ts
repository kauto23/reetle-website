import type { BillingIssue, SubscriptionPlatform } from '@/types/subscription';

/**
 * Shared wording and links for the Premium, payment and profile pages.
 * House style: British English, short plain sentences, no em dashes, no
 * exclamation marks.
 */

const APPLE_PAYMENT_DETAILS_URL = 'https://apps.apple.com/account/billing';
const GOOGLE_PAYMENT_DETAILS_URL = 'https://play.google.com/store/paymentmethods';
const APPLE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';
const GOOGLE_SUBSCRIPTIONS_URL = 'https://play.google.com/store/account/subscriptions';

/** "12 October 2026". */
export function formatLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** "12 October", with the year only when it isn't this year. */
export function formatShortDate(iso: string): string {
  const date = new Date(iso);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

export function planLabel(platform: SubscriptionPlatform | null): string {
  switch (platform) {
    case 'stripe':
      return 'Monthly, reetle.co';
    case 'apple':
      return 'Monthly, App Store';
    case 'google':
      return 'Monthly, Google Play';
    case 'referral':
      return 'Referral reward';
    case 'complimentary':
      return 'Complimentary';
    default:
      return 'Reetle Premium';
  }
}

/** Where a store subscriber updates a declined card. Stripe uses the billing portal. */
export function storePaymentDetailsUrl(platform: BillingIssue['platform']): string | null {
  if (platform === 'apple') return APPLE_PAYMENT_DETAILS_URL;
  if (platform === 'google') return GOOGLE_PAYMENT_DETAILS_URL;
  return null;
}

export function storeSubscriptionsUrl(platform: SubscriptionPlatform | null): string | null {
  if (platform === 'apple') return APPLE_SUBSCRIPTIONS_URL;
  if (platform === 'google') return GOOGLE_SUBSCRIPTIONS_URL;
  return null;
}

export function storeName(platform: SubscriptionPlatform | null): string {
  if (platform === 'apple') return 'the App Store';
  if (platform === 'google') return 'Google Play';
  return 'reetle.co';
}

export function billingIssueCopy(issue: BillingIssue): { title: string; body: string; action: string } {
  const where =
    issue.platform === 'stripe'
      ? 'Update your card'
      : `Update your payment details in ${storeName(issue.platform)}`;
  if (issue.state === 'grace_period') {
    const until = issue.access_until ? ` before ${formatShortDate(issue.access_until)}` : '';
    return {
      title: 'Your last payment didn\'t go through',
      body: `${where}${until} to keep Premium.`,
      action: 'Update payment details',
    };
  }
  return {
    title: 'Premium is paused',
    body: `Your last payment didn't go through. ${where} and Premium switches back on.`,
    action: 'Update payment details',
  };
}

/** Plain messages for the API codes the pages can hit. */
export function subscriptionErrorMessage(code: string): string {
  switch (code) {
    case 'no_active_subscription':
      return 'There\'s no active subscription on this account.';
    case 'billing_portal_unavailable':
      return 'Billing settings aren\'t available right now. Try again in a moment.';
    case 'no_stripe_customer':
      return 'This account doesn\'t have a reetle.co subscription.';
    default:
      return 'Something went wrong. Try again in a moment.';
  }
}

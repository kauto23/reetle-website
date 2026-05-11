/**
 * Helpers for building a shareable referral URL and validating incoming
 * `?ref=` codes.
 */

const DEFAULT_SITE_URL = 'https://reetle.co';

/** Origin used as the base for the shareable referral URL. */
function getSiteOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL;
}

/**
 * Canonical public URL a user sends to friends. Lands on the home page so new
 * visitors can explore the product as a guest; the site-wide banner captures
 * the `?ref=` code and prefills Premium when the user is ready to upgrade.
 */
export function buildReferralUrl(code: string, origin?: string): string {
  const base = origin ?? getSiteOrigin();
  const encoded = encodeURIComponent(code);
  return `${base}/?ref=${encoded}`;
}

/** Normalise a referral code from a URL search param. Returns null if unusable. */
export function normaliseReferralCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().toUpperCase();
  if (!trimmed) return null;
  if (!/^[A-Z0-9-]{3,32}$/.test(trimmed)) return null;
  return trimmed;
}

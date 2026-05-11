/**
 * Sidebar App Store card and `apple-itunes-app` (Safari smart banner).
 * Set to `true` when the iOS app is available on the App Store again.
 */
export const SHOW_APP_STORE_PROMO = false;

/**
 * Slice end used by the hero + sidebar row (index 0 hero, then sidebar slice).
 * Each visible CTA in the sidebar takes the slot of one article.
 */
export function heroRowArticleCount(
  hasApp: boolean,
  showReferralCta: boolean = false,
): number {
  const showAppStore = !hasApp && SHOW_APP_STORE_PROMO;
  const ctaCount = (showAppStore ? 1 : 0) + (showReferralCta ? 1 : 0);
  return 5 - ctaCount;
}

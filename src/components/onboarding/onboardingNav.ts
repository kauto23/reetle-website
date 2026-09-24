export const ONBOARDING_NAV_KEY = 'reetle-onboarding-nav';

export type OnboardingDirection = 'forward' | 'back';

const EXIT_MS = 240;

export function markOnboardingNav(direction: OnboardingDirection) {
  sessionStorage.setItem(ONBOARDING_NAV_KEY, direction);
}

/** How long to let the exit animation play before navigating. */
export function onboardingExitDelay() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : EXIT_MS;
}

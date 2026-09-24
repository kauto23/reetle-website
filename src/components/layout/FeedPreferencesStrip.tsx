'use client';

import { ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useGuestPreferences } from '@/contexts/GuestPreferencesContext';
import {
  OPEN_PREFERENCES_EVENT,
  flagForLanguage,
  formatLevel,
  languageName,
} from '@/components/onboarding/onboardingData';

/** Guest-only: signed-in users change language and level in Profile. */
export default function FeedPreferencesStrip() {
  const { isAuthenticated, isLoading } = useAuth();
  const { preferences, isHydrated } = useGuestPreferences();

  if (isLoading || isAuthenticated || !isHydrated) return null;

  const language = preferences.targetLanguage;
  const level = preferences.cefrLevel;

  return (
    <div className="mb-[16px] flex items-center justify-between gap-[12px] border border-border bg-ui-card px-[14px] py-[10px]">
      <p className="min-w-0 text-body-md text-ui-muted-foreground">
        Reading in{' '}
        <span className="whitespace-nowrap font-medium text-ui-foreground">
          <span aria-hidden className="mr-[4px]">{flagForLanguage(language)}</span>
          {languageName(language)}
        </span>
        <span aria-hidden className="mx-[6px] text-ui-muted-foreground/50">·</span>
        <span className="whitespace-nowrap font-medium text-ui-foreground">{formatLevel(level)}</span>
      </p>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent(OPEN_PREFERENCES_EVENT))}
        className="inline-flex shrink-0 items-center gap-[2px] text-label-lg font-medium text-ui-primary hover:underline underline-offset-4 cursor-pointer bg-transparent border-none p-0"
      >
        Change
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

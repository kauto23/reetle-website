'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { flushSync } from 'react-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getTargetLanguages } from '@/services/api';
import OnboardingScaffold from '@/components/onboarding/OnboardingScaffold';
import OnboardingOption from '@/components/onboarding/OnboardingOption';
import {
  markOnboardingNav,
  onboardingExitDelay,
  type OnboardingDirection,
} from '@/components/onboarding/onboardingNav';
import { CEFR_LEVELS } from '@/components/onboarding/onboardingData';
import { cn } from '@/lib/utils';

function LevelSelection() {
  const [languageName, setLanguageName] = useState<string | null>(null);
  const [exiting, setExiting] = useState<OnboardingDirection | null>(null);
  const navigating = useRef(false);
  const { user, isAuthenticated, isLoading: authLoading, updateCefrLevel, updateLocalUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const languageFromQuery = searchParams.get('language');

  useEffect(() => {
    if (navigating.current) return;
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (!authLoading && isAuthenticated && user && !user.targetLanguage) {
      router.replace('/onboarding/language');
    }
  }, [isAuthenticated, authLoading, user, router]);

  useEffect(() => {
    router.prefetch('/onboarding/ready');
    router.prefetch('/onboarding/language');
  }, [router]);

  useEffect(() => {
    if (languageFromQuery) {
      setLanguageName(languageFromQuery);
      return;
    }
    if (!user?.targetLanguage) return;

    let cancelled = false;
    getTargetLanguages()
      .then((languages) => {
        if (cancelled) return;
        const match = languages.find((language) => language.code === user.targetLanguage);
        setLanguageName(match?.name ?? 'language');
      })
      .catch(() => {
        if (!cancelled) setLanguageName('language');
      });

    return () => {
      cancelled = true;
    };
  }, [languageFromQuery, user?.targetLanguage]);

  const leave = (direction: OnboardingDirection, href: string) => {
    navigating.current = true;
    setExiting(direction);
    markOnboardingNav(direction);
    window.setTimeout(() => router.push(href), onboardingExitDelay());
  };

  const handleSelect = (levelCode: string) => {
    if (!user || navigating.current) return;

    flushSync(() => {
      updateLocalUser({ cefrLevel: levelCode });
    });
    void updateCefrLevel(levelCode);

    const params = new URLSearchParams({ level: levelCode });
    if (languageName && languageName !== 'language') params.set('language', languageName);
    leave('forward', `/onboarding/ready?${params.toString()}`);
  };

  const handleBack = () => {
    if (navigating.current) return;
    leave('back', '/onboarding/language');
  };

  if (authLoading || !isAuthenticated || (user && !user.targetLanguage)) {
    return <div className="fixed inset-0 bg-primary" style={{ zIndex: 'var(--z-onboarding)' }} />;
  }

  const resolvedName = languageName ?? languageFromQuery ?? 'language';

  return (
    <OnboardingScaffold
      title={`What's your\n${resolvedName} level?`}
      subtitle="We'll match articles to your ability. Pick your level."
      showBackButton
      onBack={handleBack}
      exiting={exiting}
    >
      <div className="flex flex-col gap-2">
        {CEFR_LEVELS.map((level, index) => (
          <OnboardingOption
            key={level.code}
            index={index}
            disabled={!level.available}
            showChevron={level.available}
            badge={level.available ? null : 'Soon'}
            leading={
              <span
                className={cn(
                  'text-body-lg font-bold',
                  level.available ? 'text-ui-foreground' : 'text-ui-muted-foreground'
                )}
              >
                {level.code}
              </span>
            }
            title={level.name}
            subtitle={level.description}
            onSelect={level.available ? () => handleSelect(level.code) : undefined}
          />
        ))}
      </div>
    </OnboardingScaffold>
  );
}

export default function CefrLevelSelectionPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-primary" style={{ zIndex: 'var(--z-onboarding)' }} />}>
      <LevelSelection />
    </Suspense>
  );
}

'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getTargetLanguages } from '@/services/api';
import OnboardingScaffold from '@/components/onboarding/OnboardingScaffold';
import OnboardingOption from '@/components/onboarding/OnboardingOption';
import { onboardingExitDelay } from '@/components/onboarding/onboardingNav';
import { CEFR_LEVELS, flagForLanguage } from '@/components/onboarding/onboardingData';
import { Button } from '@/components/ui/button';

function PreferencesReady() {
  const [languageName, setLanguageName] = useState<string | null>(null);
  const [exiting, setExiting] = useState(false);
  const navigating = useRef(false);
  const { user, isAuthenticated, isLoading: authLoading, needsOnboarding } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const languageFromQuery = searchParams.get('language');

  useEffect(() => {
    if (authLoading || navigating.current) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    const step = needsOnboarding();
    if (step === 'language') router.replace('/onboarding/language');
    else if (step === 'level') router.replace('/onboarding/level');
  }, [authLoading, isAuthenticated, needsOnboarding, router]);

  useEffect(() => {
    router.prefetch('/');
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
        setLanguageName(match?.name ?? user.targetLanguage);
      })
      .catch(() => {
        if (!cancelled) setLanguageName(user.targetLanguage);
      });

    return () => {
      cancelled = true;
    };
  }, [languageFromQuery, user?.targetLanguage]);

  const handleStart = () => {
    if (navigating.current) return;
    navigating.current = true;
    setExiting(true);
    window.setTimeout(() => router.push('/'), onboardingExitDelay());
  };

  if (authLoading || !isAuthenticated || !user?.targetLanguage || !user.cefrLevel) {
    return <div className="fixed inset-0 bg-primary" style={{ zIndex: 'var(--z-onboarding)' }} />;
  }

  const levelCode = user.cefrLevel;
  const level = CEFR_LEVELS.find((item) => item.code === levelCode);
  const resolvedLanguage = languageName ?? languageFromQuery ?? '';

  return (
    <OnboardingScaffold
      title="You're all set"
      subtitle={`We'll write your ${resolvedLanguage ? `${resolvedLanguage} ` : ''}articles to match your level.`}
      exiting={exiting ? 'forward' : null}
    >
      <div className="flex flex-col gap-2">
        <OnboardingOption
          interactive={false}
          index={0}
          leading={
            <span className="text-headline-sm leading-none" aria-hidden>
              {flagForLanguage(user.targetLanguage)}
            </span>
          }
          title={resolvedLanguage || 'Your language'}
          subtitle="Learning language"
        />
        <OnboardingOption
          interactive={false}
          index={1}
          leading={<span className="text-body-lg font-bold text-ui-foreground">{levelCode}</span>}
          title={level?.name ?? levelCode}
          subtitle="Reading level"
        />
      </div>

      <p
        className="onboarding-item mt-4 text-body-md text-ui-muted-foreground"
        style={{ animationDelay: '400ms' }}
      >
        You can change your language or level any time in your Profile.
      </p>

      <div className="onboarding-item mt-6" style={{ animationDelay: '460ms' }}>
        <Button onClick={handleStart} size="xl" className="w-full">
          Start reading
        </Button>
      </div>
    </OnboardingScaffold>
  );
}

export default function PreferencesReadyPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-primary" style={{ zIndex: 'var(--z-onboarding)' }} />}>
      <PreferencesReady />
    </Suspense>
  );
}

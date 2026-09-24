'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { flushSync } from 'react-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getTargetLanguages } from '@/services/api';
import type { TargetLanguage } from '@/types/user';
import OnboardingScaffold from '@/components/onboarding/OnboardingScaffold';
import OnboardingOption from '@/components/onboarding/OnboardingOption';
import { markOnboardingNav, onboardingExitDelay } from '@/components/onboarding/onboardingNav';
import { flagForLanguage } from '@/components/onboarding/onboardingData';

function sortLanguages(languages: TargetLanguage[]) {
  return [...languages].sort((a, b) => {
    if (a.code === 'es') return -1;
    if (b.code === 'es') return 1;
    return a.name.localeCompare(b.name);
  });
}

export default function LanguageSelectionPage() {
  const [languages, setLanguages] = useState<TargetLanguage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exiting, setExiting] = useState(false);
  const navigating = useRef(false);
  const { user, isAuthenticated, isLoading: authLoading, updateLanguage, updateLocalUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    router.prefetch('/onboarding/level');
  }, [router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;

    async function fetchLanguages() {
      try {
        const langs = await getTargetLanguages();
        if (!cancelled) {
          setLanguages(sortLanguages(langs));
          setError(null);
        }
      } catch {
        if (!cancelled) setError('Failed to load languages. Please try again.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    setIsLoading(true);
    fetchLanguages();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const retry = () => {
    setError(null);
    setIsLoading(true);
    getTargetLanguages()
      .then((langs) => {
        setLanguages(sortLanguages(langs));
        setError(null);
      })
      .catch(() => setError('Failed to load languages. Please try again.'))
      .finally(() => setIsLoading(false));
  };

  const handleSelect = (language: TargetLanguage) => {
    if (!user || navigating.current) return;
    navigating.current = true;

    const browserLang = navigator.language.split('-')[0];
    const familiarLanguage = browserLang === 'en' ? 'en' : browserLang;

    flushSync(() => {
      updateLocalUser({
        familiarLanguage,
        targetLanguage: language.code,
      });
    });

    void updateLanguage(familiarLanguage, language.code);
    setExiting(true);
    markOnboardingNav('forward');
    window.setTimeout(() => {
      router.push(`/onboarding/level?language=${encodeURIComponent(language.name)}`);
    }, onboardingExitDelay());
  };

  if (authLoading || !isAuthenticated) {
    return <div className="fixed inset-0 bg-primary" style={{ zIndex: 'var(--z-onboarding)' }} />;
  }

  return (
    <OnboardingScaffold
      title={'What would you like\nto learn?'}
      subtitle="Choose the language you want to master through reading."
      exiting={exiting ? 'forward' : null}
    >
      <div className="flex flex-col gap-2">
        {error && (
          <div className="mb-1 border border-incorrect/30 bg-incorrect-bg px-[14px] py-3">
            <p className="text-body-md text-incorrect-text">{error}</p>
            <button
              type="button"
              onClick={retry}
              className="mt-3 text-title-md text-ui-primary"
            >
              Retry
            </button>
          </div>
        )}

        {isLoading && !error &&
          Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-[68px] bg-background" />
          ))}

        {!isLoading && !error && languages.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-title-lg text-ui-foreground">No languages available</p>
            <p className="mt-2 text-body-md text-ui-muted-foreground">
              Please check your connection and try again.
            </p>
            <button type="button" onClick={retry} className="mt-6 text-title-md text-ui-primary">
              Retry
            </button>
          </div>
        )}

        {!isLoading &&
          languages.map((language, index) => (
            <OnboardingOption
              key={language.code}
              index={index}
              leading={
                <span className="text-headline-sm leading-none" aria-hidden>
                  {flagForLanguage(language.code)}
                </span>
              }
              title={language.name}
              subtitle={language.native_name}
              onSelect={() => handleSelect(language)}
            />
          ))}
      </div>
    </OnboardingScaffold>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface CefrLevel {
  code: string;
  name: string;
  description: string;
  available: boolean;
}

const CEFR_LEVELS: CefrLevel[] = [
  { code: 'A1', name: 'Beginner', description: 'Basic phrases and greetings', available: true },
  { code: 'A2', name: 'Elementary', description: 'Simple conversations', available: true },
  { code: 'B1', name: 'Intermediate', description: 'Everyday topics and travel', available: true },
  { code: 'B2', name: 'Upper Intermediate', description: 'Fluent with native speakers', available: true },
  { code: 'C1', name: 'Advanced', description: 'Complex texts and speech', available: false },
  { code: 'C2', name: 'Proficiency', description: 'Near-native fluency', available: false },
];

export default function CefrLevelSelectionPage() {
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated, isLoading: authLoading, updateCefrLevel } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
      return;
    }
    // If user doesn't have a target language yet, send them back
    if (!authLoading && isAuthenticated && user && !user.targetLanguage) {
      router.replace('/onboarding/language');
    }
  }, [isAuthenticated, authLoading, user, router]);

  const handleContinue = async () => {
    if (!selectedLevel || !user) return;

    setIsSaving(true);
    setError(null);

    try {
      const success = await updateCefrLevel(selectedLevel);
      if (success) {
        router.push('/articles');
      } else {
        setError('Failed to save level. Please try again.');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <section className="py-2xl">
      <div className="max-w-[500px] mx-auto px-md">
        {/* Header */}
        <div className="text-center mb-xl">
          <h1 className="text-display-md text-primary mb-sm">What&apos;s your level?</h1>
          <p className="text-body-lg text-text-secondary">
            Select your current proficiency level. This helps us personalise your articles.
          </p>
        </div>

        {/* Level list */}
        <div className="flex flex-col gap-[8px] mb-lg">
          {CEFR_LEVELS.map((level, index) => (
            <button
              key={level.code}
              onClick={() => level.available && setSelectedLevel(level.code)}
              disabled={!level.available}
              className={`
                flex items-center gap-md p-md rounded-xl border transition-all duration-200 text-left w-full
                ${!level.available
                  ? 'opacity-50 cursor-not-allowed border-border bg-gray-50'
                  : selectedLevel === level.code
                    ? 'border-primary bg-white shadow-md cursor-pointer'
                    : 'border-border bg-surface hover:border-primary-light hover:bg-white cursor-pointer'
                }
              `}
              style={{
                animation: `fadeInUp 0.4s ease ${index * 0.05}s both`,
              }}
            >
              {/* Level badge */}
              <div className={`
                w-[48px] h-[48px] rounded-lg flex items-center justify-center font-semibold text-[16px] shrink-0
                ${selectedLevel === level.code
                  ? 'bg-primary text-white'
                  : !level.available
                    ? 'bg-gray-200 text-gray-400'
                    : 'bg-background text-primary'
                }
              `}>
                {level.code}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-title-md text-primary">{level.name}</p>
                <p className="text-body-md text-text-secondary">{level.description}</p>
              </div>

              {/* Status indicator */}
              {!level.available ? (
                <span className="text-[12px] font-medium text-text-secondary bg-gray-200 px-[8px] py-[2px] rounded-full shrink-0">
                  Soon
                </span>
              ) : (
                <div className={`
                  w-[24px] h-[24px] rounded-full border-2 flex items-center justify-center transition-all duration-200 shrink-0
                  ${selectedLevel === level.code ? 'border-primary bg-primary' : 'border-border'}
                `}>
                  {selectedLevel === level.code && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Assessment option */}
        <Link
          href="/assessment"
          className="block text-center py-md text-primary-light hover:text-primary text-body-lg font-medium transition-colors mb-lg"
        >
          Not sure? Take a quick quiz (~1 minute)
        </Link>

        {error && (
          <div className="mb-md p-md bg-incorrect-bg rounded-lg">
            <p className="text-body-md text-incorrect-text text-center">{error}</p>
          </div>
        )}

        {/* Continue button */}
        <button
          onClick={handleContinue}
          disabled={!selectedLevel || isSaving}
          className={`
            btn-primary w-full flex items-center justify-center gap-sm
            ${(!selectedLevel || isSaving) ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {isSaving ? (
            <>
              <div className="loading-spinner !w-[18px] !h-[18px] !border-white !border-t-transparent" />
              Saving...
            </>
          ) : (
            'Continue'
          )}
        </button>

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="w-full text-center mt-md text-body-md text-text-secondary hover:text-primary transition-colors cursor-pointer bg-transparent border-none"
        >
          ← Back to language selection
        </button>
      </div>
    </section>
  );
}

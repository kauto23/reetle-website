'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getTargetLanguages } from '@/services/api';
import type { TargetLanguage } from '@/types/user';

// Flag emoji map for languages
const FLAG_MAP: Record<string, string> = {
  spanish: '🇪🇸',
  french: '🇫🇷',
  german: '🇩🇪',
  italian: '🇮🇹',
  portuguese: '🇵🇹',
  dutch: '🇳🇱',
  russian: '🇷🇺',
  japanese: '🇯🇵',
  chinese: '🇨🇳',
  korean: '🇰🇷',
};

export default function LanguageSelectionPage() {
  const [languages, setLanguages] = useState<TargetLanguage[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated, isLoading: authLoading, updateLanguage } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
      return;
    }

    async function fetchLanguages() {
      try {
        const langs = await getTargetLanguages();
        // Sort: Spanish first, then alphabetically
        const sorted = [...langs].sort((a, b) => {
          if (a.code === 'spanish') return -1;
          if (b.code === 'spanish') return 1;
          return a.name.localeCompare(b.name);
        });
        setLanguages(sorted);
      } catch {
        setError('Failed to load languages. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }

    if (isAuthenticated) {
      fetchLanguages();
    }
  }, [isAuthenticated, authLoading, router]);

  const handleContinue = async () => {
    if (!selectedLanguage || !user) return;

    setIsSaving(true);
    setError(null);

    try {
      // Detect browser language as familiar language
      const browserLang = navigator.language.split('-')[0];
      const familiarLanguage = browserLang === 'en' ? 'english' : browserLang;

      const success = await updateLanguage(familiarLanguage, selectedLanguage);
      if (success) {
        router.push('/onboarding/level');
      } else {
        setError('Failed to save language preference. Please try again.');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading) {
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
          <h1 className="text-display-md text-primary mb-sm">What language are you learning?</h1>
          <p className="text-body-lg text-text-secondary">
            Choose the language you want to practice reading in.
          </p>
        </div>

        {/* Language list */}
        <div className="flex flex-col gap-[8px] mb-xl">
          {languages.map((lang, index) => (
            <button
              key={lang.code}
              onClick={() => setSelectedLanguage(lang.code)}
              className={`
                flex items-center gap-md p-md rounded-xl border transition-all duration-200 cursor-pointer text-left w-full
                ${selectedLanguage === lang.code
                  ? 'border-primary bg-white shadow-md'
                  : 'border-border bg-surface hover:border-primary-light hover:bg-white'
                }
              `}
              style={{
                animation: `fadeInUp 0.4s ease ${index * 0.05}s both`,
              }}
            >
              <span className="text-[32px] leading-none">
                {FLAG_MAP[lang.code] || '🏳️'}
              </span>
              <div className="flex-1">
                <p className="text-title-md text-primary">{lang.name}</p>
                <p className="text-body-md text-text-secondary">{lang.native_name}</p>
              </div>
              {/* Selection indicator */}
              <div className={`
                w-[24px] h-[24px] rounded-full border-2 flex items-center justify-center transition-all duration-200
                ${selectedLanguage === lang.code ? 'border-primary bg-primary' : 'border-border'}
              `}>
                {selectedLanguage === lang.code && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-md p-md bg-incorrect-bg rounded-lg">
            <p className="text-body-md text-incorrect-text text-center">{error}</p>
          </div>
        )}

        {/* Continue button */}
        <button
          onClick={handleContinue}
          disabled={!selectedLanguage || isSaving}
          className={`
            btn-primary w-full flex items-center justify-center gap-sm
            ${(!selectedLanguage || isSaving) ? 'opacity-50 cursor-not-allowed' : ''}
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
      </div>
    </section>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getTargetLanguages } from '@/services/api';
import type { TargetLanguage } from '@/types/user';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
          if (a.code === 'es') return -1;
          if (b.code === 'es') return 1;
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
      const familiarLanguage = browserLang === 'en' ? 'en' : browserLang;

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
        <Loader2 className="h-9 w-9 animate-spin text-ui-primary" />
      </div>
    );
  }

  return (
    <section className="py-12 sm:py-16">
      <div className="max-w-[500px] mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-display-md tracking-tight text-ui-foreground mb-2">
            What language are you learning?
          </h1>
          <p className="text-body-lg text-ui-muted-foreground">
            Choose the language you want to practice reading in.
          </p>
        </div>

        <div className="flex flex-col gap-2 mb-8">
          {languages.map((lang, index) => {
            const selected = selectedLanguage === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => setSelectedLanguage(lang.code)}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 cursor-pointer text-left w-full',
                  selected
                    ? 'border-ui-primary bg-ui-card shadow-md'
                    : 'border-ui-border bg-ui-card hover:border-primary-light hover:shadow-sm'
                )}
                style={{ animation: `fadeInUp 0.4s ease ${index * 0.05}s both` }}
              >
                <span className="text-[32px] leading-none">
                  {FLAG_MAP[lang.code] || '🏳️'}
                </span>
                <div className="flex-1">
                  <p className="text-[16px] font-medium text-ui-foreground">{lang.name}</p>
                  <p className="text-[13px] text-ui-muted-foreground">{lang.native_name}</p>
                </div>
                <div className={cn(
                  'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200',
                  selected ? 'border-ui-primary bg-ui-primary' : 'border-ui-border'
                )}>
                  {selected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mb-4 p-4 bg-incorrect-bg rounded-md border border-incorrect/30">
            <p className="text-[14px] text-incorrect-text text-center">{error}</p>
          </div>
        )}

        <Button
          onClick={handleContinue}
          disabled={!selectedLanguage || isSaving}
          size="lg"
          className="w-full"
        >
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSaving ? 'Saving...' : 'Continue'}
        </Button>
      </div>
    </section>
  );
}

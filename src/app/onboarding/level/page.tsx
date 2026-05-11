'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
        <Loader2 className="h-9 w-9 animate-spin text-ui-primary" />
      </div>
    );
  }

  return (
    <section className="py-12 sm:py-16">
      <div className="max-w-[500px] mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-[28px] font-semibold tracking-tight text-ui-foreground mb-2">
            What&apos;s your level?
          </h1>
          <p className="text-[15px] text-ui-muted-foreground">
            Select your current proficiency level. This helps us personalise your articles.
          </p>
        </div>

        <div className="flex flex-col gap-2 mb-6">
          {CEFR_LEVELS.map((level, index) => {
            const selected = selectedLevel === level.code;
            return (
              <button
                key={level.code}
                onClick={() => level.available && setSelectedLevel(level.code)}
                disabled={!level.available}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 text-left w-full',
                  !level.available && 'opacity-50 cursor-not-allowed border-ui-border bg-ui-muted/30',
                  level.available && selected && 'border-ui-primary bg-ui-card shadow-md cursor-pointer',
                  level.available && !selected && 'border-ui-border bg-ui-card hover:border-primary-light hover:shadow-sm cursor-pointer'
                )}
                style={{ animation: `fadeInUp 0.4s ease ${index * 0.05}s both` }}
              >
                <div className={cn(
                  'w-12 h-12 rounded-lg flex items-center justify-center font-semibold text-[16px] shrink-0',
                  selected
                    ? 'bg-ui-primary text-white'
                    : !level.available
                      ? 'bg-ui-muted text-ui-muted-foreground'
                      : 'bg-ui-background text-ui-foreground'
                )}>
                  {level.code}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[16px] font-medium text-ui-foreground">{level.name}</p>
                  <p className="text-[13px] text-ui-muted-foreground">{level.description}</p>
                </div>

                {!level.available ? (
                  <Badge variant="muted">Soon</Badge>
                ) : (
                  <div className={cn(
                    'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 shrink-0',
                    selected ? 'border-ui-primary bg-ui-primary' : 'border-ui-border'
                  )}>
                    {selected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <Link
          href="/assessment"
          className="block text-center py-3 text-primary-light hover:text-ui-primary text-[15px] font-medium transition-colors mb-6"
        >
          Not sure? Take a quick quiz (~1 minute)
        </Link>

        {error && (
          <div className="mb-4 p-4 bg-incorrect-bg rounded-md border border-incorrect/30">
            <p className="text-[14px] text-incorrect-text text-center">{error}</p>
          </div>
        )}

        <Button
          onClick={handleContinue}
          disabled={!selectedLevel || isSaving}
          size="lg"
          className="w-full"
        >
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSaving ? 'Saving...' : 'Continue'}
        </Button>

        <Button
          onClick={() => router.back()}
          variant="ghost"
          size="sm"
          className="w-full mt-3 text-ui-muted-foreground"
        >
          ← Back to language selection
        </Button>
      </div>
    </section>
  );
}

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import AuthGuard from '@/components/layout/AuthGuard';
import { getMasteredWordsStats } from '@/services/api';
import type { MasteredWordsStatsResponse, MasteredWordEntry } from '@/types/stats';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface FlatMasteredWord extends MasteredWordEntry {
  date: string;
}

export default function MasteredWordsPage() {
  const router = useRouter();
  const [data, setData] = useState<MasteredWordsStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchWords() {
      try {
        const stats = await getMasteredWordsStats('all');
        setData(stats);
      } catch {
        // Silently fail
      } finally {
        setIsLoading(false);
      }
    }
    fetchWords();
  }, []);

  const words = useMemo<FlatMasteredWord[]>(() => {
    if (!data?.breakdown) return [];
    const flat: FlatMasteredWord[] = [];
    for (const day of data.breakdown) {
      for (const word of day.mastered_words) {
        flat.push({ ...word, date: day.date });
      }
    }
    return flat;
  }, [data]);

  const grouped = useMemo(() => {
    const map: Record<string, FlatMasteredWord[]> = {};
    for (const word of words) {
      const key = word.date;
      if (!map[key]) map[key] = [];
      map[key].push(word);
    }
    return map;
  }, [words]);

  const sortedDates = useMemo(
    () => Object.keys(grouped).sort((a, b) => b.localeCompare(a)),
    [grouped]
  );

  return (
    <AuthGuard>
      <section className="py-12 sm:py-16">
        <div className="max-w-[600px] mx-auto px-4">
          <Button
            onClick={() => router.back()}
            variant="ghost"
            size="sm"
            className="mb-6 text-ui-muted-foreground hover:text-ui-foreground -ml-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Progress
          </Button>

          <h1 className="text-display-md tracking-tight text-ui-foreground mb-1">Mastered Words</h1>
          {data && (
            <p className="text-[14px] text-ui-muted-foreground mb-8">
              {data.total_mastered} words mastered in total
            </p>
          )}

          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))}
            </div>
          )}

          {!isLoading && words.length === 0 && (
            <div className="text-center py-12">
              <p className="text-body-lg text-ui-muted-foreground">
                No mastered words yet. Keep practising to master your vocabulary!
              </p>
            </div>
          )}

          {!isLoading && sortedDates.map(date => (
            <div key={date} className="mb-6">
              <p className="text-[14px] text-ui-muted-foreground font-medium mb-2">
                {new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <div className="flex flex-col gap-1">
                {grouped[date].map((word, i) => (
                  <div
                    key={`${word.target_word}-${i}`}
                    className="flex items-center justify-between p-4 bg-ui-card border border-ui-border rounded-xl"
                  >
                    <span className="text-[16px] text-ui-foreground font-medium">{word.target_word}</span>
                    <span className="text-[14px] text-ui-muted-foreground">{word.familiar_word}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </AuthGuard>
  );
}

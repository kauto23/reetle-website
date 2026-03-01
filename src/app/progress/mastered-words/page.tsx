'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/layout/AuthGuard';
import { getMasteredWordsStats } from '@/services/api';
import type { MasteredWordsStatsResponse, MasteredWordEntry } from '@/types/stats';

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
      <section className="py-2xl">
        <div className="max-w-[600px] mx-auto px-md">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-xs text-body-md text-text-secondary hover:text-primary mb-lg cursor-pointer bg-transparent border-none transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to Progress
          </button>

          <h1 className="text-display-md text-primary mb-sm">Mastered Words</h1>
          {data && (
            <p className="text-body-md text-text-secondary mb-xl">
              {data.total_mastered} words mastered in total
            </p>
          )}

          {isLoading && (
            <div className="space-y-md animate-pulse">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-[56px] bg-gray-200 rounded-xl" />
              ))}
            </div>
          )}

          {!isLoading && words.length === 0 && (
            <div className="text-center py-xl">
              <p className="text-body-lg text-text-secondary">
                No mastered words yet. Keep practising to master your vocabulary!
              </p>
            </div>
          )}

          {!isLoading && sortedDates.map(date => (
            <div key={date} className="mb-lg">
              <p className="text-body-md text-text-secondary font-medium mb-sm">
                {new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <div className="flex flex-col gap-[4px]">
                {grouped[date].map((word, i) => (
                  <div
                    key={`${word.target_word}-${i}`}
                    className="flex items-center justify-between p-md bg-surface border border-border rounded-xl"
                  >
                    <span className="text-title-md text-primary font-medium">{word.target_word}</span>
                    <span className="text-body-md text-text-secondary">{word.familiar_word}</span>
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

import type { PracticeQuestion } from '@/types/practice';

interface CacheEntry {
  articleId: string;
  promise: Promise<PracticeQuestion[]>;
}

let cached: CacheEntry | null = null;

export function prefetchQuiz(articleId: string, fetcher: () => Promise<PracticeQuestion[]>) {
  if (cached?.articleId === articleId) return;
  cached = { articleId, promise: fetcher() };
}

export function consumeQuizCache(articleId: string): Promise<PracticeQuestion[]> | null {
  if (cached?.articleId === articleId) {
    const p = cached.promise;
    cached = null;
    return p;
  }
  return null;
}

import { getNextPracticeQuestion } from './api';
import type { PracticeQuestion } from '@/types/practice';

let cachedQuestion: PracticeQuestion | null = null;
let isFetching = false;

/**
 * Silently prefetch a practice question in the background.
 * Safe to call multiple times — will no-op if already fetching or cached.
 */
export function prefetchPracticeQuestion(): void {
  if (cachedQuestion || isFetching) return;
  isFetching = true;

  getNextPracticeQuestion()
    .then((q) => {
      cachedQuestion = q;
    })
    .catch(() => {
      cachedQuestion = null;
    })
    .finally(() => {
      isFetching = false;
    });
}

/**
 * Consume the cached question (returns it and clears the cache).
 * Returns null if nothing was prefetched or prefetch failed.
 */
export function consumeCachedPracticeQuestion(): PracticeQuestion | null {
  const q = cachedQuestion;
  cachedQuestion = null;
  return q;
}

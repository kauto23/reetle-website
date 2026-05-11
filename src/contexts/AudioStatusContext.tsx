'use client';

/**
 * Tracks per-article audio state across the session so the UI can update
 * immediately when a user asks for audio, without waiting for a refetch of
 * `article-summaries` to reflect generation.
 *
 * - `not_requested`: no local action yet. UI should fall back to the summary's
 *   `audio_generated` flag to decide if playback is possible.
 * - `preparing`: client is polling the audio endpoint; both detail + card
 *   should show a preparing affordance.
 * - `ready`: audio is available. If a non-expired signed URL is cached, play
 *   can reuse it without triggering another listen against the daily allowance.
 * - `failed`: generation/polling stopped unsuccessfully. A `quotaExceeded`
 *   flag distinguishes free-tier limits from other failures.
 *
 * Each successful GET that returns audio (HTTP 200) counts as one listen for
 * free-tier users, so we avoid calling GET speculatively. Playback reuses the
 * cached signed URL for its 15-minute lifetime.
 */

import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import {
  getArticleAudio,
  generateArticleAudio,
  FreeTierQuotaError,
  RateLimitError,
  TokenExpiredError,
} from '@/services/api';

export type AudioStatus = 'not_requested' | 'preparing' | 'ready' | 'failed';

export interface AudioEntry {
  status: AudioStatus;
  contentId?: string;
  signedUrl?: string;
  /** Epoch milliseconds at which the cached signed URL stops being reusable. */
  signedUrlExpiresAt?: number;
  /** Human-readable error for the `failed` state. */
  error?: string;
  /** True when `failed` is specifically due to the daily audio quota. */
  quotaExceeded?: boolean;
}

interface AudioStatusContextType {
  getEntry(articleId: string): AudioEntry | undefined;
  /** Starts on-demand generation + polling for an article. Safe to call repeatedly. */
  prepareAudio(articleId: string, contentId: string): Promise<void>;
  /**
   * Returns a signed audio URL ready for playback. Reuses a cached URL when
   * available; otherwise calls GET (which counts as one listen) and caches
   * the result. If the server responds 202 the entry is flipped to
   * `preparing` and polling starts; the returned promise rejects so the
   * caller can show a preparing UI rather than an error.
   */
  fetchPlaybackUrl(articleId: string, contentId: string): Promise<string>;
  /** Clears a `failed` entry so the UI can offer a fresh attempt. */
  resetAudio(articleId: string): void;
}

const AudioStatusContext = createContext<AudioStatusContextType | null>(null);

const SIGNED_URL_LIFETIME_MS = 15 * 60 * 1000;
// Refresh the signed URL a minute before real expiry so playback never stalls.
const URL_REUSE_BUFFER_MS = 60 * 1000;
const POLL_INTERVAL_MS = 4000;
// Stop polling after roughly 2 minutes. Generation typically completes within
// ~30s, but we allow headroom for slow TTS jobs before surfacing a retry.
const MAX_POLL_DURATION_MS = 120 * 1000;

interface ActivePoll {
  stop: () => void;
}

export function AudioStatusProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<Record<string, AudioEntry>>({});
  // Keep a ref mirror so async callbacks don't require the latest closure to
  // decide whether an entry is already preparing/ready.
  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  const pollsRef = useRef<Record<string, ActivePoll>>({});

  const updateEntry = useCallback((articleId: string, patch: Partial<AudioEntry>) => {
    setEntries(prev => {
      const current = prev[articleId] ?? { status: 'not_requested' as AudioStatus };
      return { ...prev, [articleId]: { ...current, ...patch } };
    });
  }, []);

  const stopPoll = useCallback((articleId: string) => {
    const poll = pollsRef.current[articleId];
    if (poll) {
      poll.stop();
      delete pollsRef.current[articleId];
    }
  }, []);

  useEffect(() => {
    // Capture the current polls map so cleanup uses a stable reference.
    const polls = pollsRef.current;
    return () => {
      for (const key of Object.keys(polls)) {
        polls[key]?.stop();
      }
    };
  }, []);

  const startPolling = useCallback((articleId: string, contentId: string) => {
    stopPoll(articleId);

    const startedAt = Date.now();
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      if (cancelled) return;

      if (Date.now() - startedAt > MAX_POLL_DURATION_MS) {
        updateEntry(articleId, {
          status: 'failed',
          error: 'Audio is taking longer than expected. Please try again in a moment.',
        });
        stopPoll(articleId);
        return;
      }

      try {
        const result = await getArticleAudio(contentId);
        if (cancelled) return;

        if (result.status === 'ready' && result.audioUrl) {
          updateEntry(articleId, {
            status: 'ready',
            contentId,
            signedUrl: result.audioUrl,
            signedUrlExpiresAt: Date.now() + SIGNED_URL_LIFETIME_MS,
            error: undefined,
            quotaExceeded: undefined,
          });
          stopPoll(articleId);
          return;
        }

        // 202 (preparing) or 404 (not yet generated) – keep waiting.
        timeoutId = setTimeout(tick, POLL_INTERVAL_MS);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof FreeTierQuotaError) {
          updateEntry(articleId, {
            status: 'failed',
            quotaExceeded: true,
            error: err.detail,
          });
          stopPoll(articleId);
          return;
        }
        if (err instanceof RateLimitError) {
          // Back off to at least the server-advised retry window.
          const delay = Math.max(err.retryAfter * 1000, POLL_INTERVAL_MS);
          timeoutId = setTimeout(tick, delay);
          return;
        }
        if (err instanceof TokenExpiredError) {
          stopPoll(articleId);
          return;
        }
        updateEntry(articleId, {
          status: 'failed',
          error: 'We could not check on your audio. Please try again.',
        });
        stopPoll(articleId);
      }
    };

    pollsRef.current[articleId] = {
      stop: () => {
        cancelled = true;
        if (timeoutId) clearTimeout(timeoutId);
      },
    };

    timeoutId = setTimeout(tick, POLL_INTERVAL_MS);
  }, [stopPoll, updateEntry]);

  const prepareAudio = useCallback(async (articleId: string, contentId: string) => {
    const existing = entriesRef.current[articleId];
    if (existing?.status === 'preparing') return;
    const now = Date.now();
    if (
      existing?.status === 'ready' &&
      existing.contentId === contentId &&
      existing.signedUrl &&
      existing.signedUrlExpiresAt &&
      existing.signedUrlExpiresAt > now + URL_REUSE_BUFFER_MS
    ) {
      return;
    }

    updateEntry(articleId, {
      status: 'preparing',
      contentId,
      signedUrl: existing?.contentId === contentId ? existing?.signedUrl : undefined,
      signedUrlExpiresAt: existing?.contentId === contentId ? existing?.signedUrlExpiresAt : undefined,
      error: undefined,
      quotaExceeded: undefined,
    });

    try {
      await generateArticleAudio(contentId);
    } catch (err) {
      if (err instanceof FreeTierQuotaError) {
        updateEntry(articleId, {
          status: 'failed',
          quotaExceeded: true,
          error: err.detail,
        });
        return;
      }
      if (err instanceof TokenExpiredError) {
        return;
      }
      if (!(err instanceof RateLimitError)) {
        updateEntry(articleId, {
          status: 'failed',
          error: 'We could not start preparing your audio. Please try again.',
        });
        return;
      }
      // RateLimitError: generation may still be in progress server-side, so
      // we fall through to polling.
    }

    startPolling(articleId, contentId);
  }, [startPolling, updateEntry]);

  const fetchPlaybackUrl = useCallback(async (articleId: string, contentId: string): Promise<string> => {
    const existing = entriesRef.current[articleId];
    const now = Date.now();
    if (
      existing?.signedUrl &&
      existing.contentId === contentId &&
      existing.signedUrlExpiresAt &&
      existing.signedUrlExpiresAt > now + URL_REUSE_BUFFER_MS
    ) {
      return existing.signedUrl;
    }

    try {
      const result = await getArticleAudio(contentId);
      if (result.status === 'ready' && result.audioUrl) {
        updateEntry(articleId, {
          status: 'ready',
          contentId,
          signedUrl: result.audioUrl,
          signedUrlExpiresAt: Date.now() + SIGNED_URL_LIFETIME_MS,
          error: undefined,
          quotaExceeded: undefined,
        });
        return result.audioUrl;
      }

      if (result.status === 'preparing') {
        updateEntry(articleId, { status: 'preparing', contentId });
        startPolling(articleId, contentId);
        throw new Error('Audio is still being prepared.');
      }

      // 404 – caller should invoke prepareAudio first.
      throw new Error('Audio has not been prepared for this article yet.');
    } catch (err) {
      if (err instanceof FreeTierQuotaError) {
        updateEntry(articleId, {
          status: 'failed',
          quotaExceeded: true,
          error: err.detail,
        });
      }
      throw err;
    }
  }, [startPolling, updateEntry]);

  const resetAudio = useCallback((articleId: string) => {
    stopPoll(articleId);
    updateEntry(articleId, {
      status: 'not_requested',
      error: undefined,
      quotaExceeded: undefined,
    });
  }, [stopPoll, updateEntry]);

  const value: AudioStatusContextType = {
    getEntry: (articleId: string) => entries[articleId],
    prepareAudio,
    fetchPlaybackUrl,
    resetAudio,
  };

  return <AudioStatusContext.Provider value={value}>{children}</AudioStatusContext.Provider>;
}

export function useAudioStatus() {
  const ctx = useContext(AudioStatusContext);
  if (!ctx) {
    throw new Error('useAudioStatus must be used within an AudioStatusProvider');
  }
  return ctx;
}

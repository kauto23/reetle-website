'use client';

import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import { getArticles, getGuestArticles } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useGuestPreferences } from '@/contexts/GuestPreferencesContext';
import type { ArticlesResponse } from '@/types/article';

interface ArticlesContextType {
  articlesData: ArticlesResponse | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  fetchArticles: () => void;
}

const ArticlesContext = createContext<ArticlesContextType | null>(null);

export function ArticlesProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { preferences: guestPrefs } = useGuestPreferences();
  const [articlesData, setArticlesData] = useState<ArticlesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchTrigger, setFetchTrigger] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  // Ref so the fetch effect reads the latest guest prefs without them being
  // full effect dependencies (level changes should NOT trigger re-fetches).
  const guestPrefsRef = useRef(guestPrefs);
  guestPrefsRef.current = guestPrefs;

  // Language changes require a re-fetch (headlines, topics, geography are
  // language-specific), but level changes do not (all levels already returned).
  const languageKey = isAuthenticated
    ? (user?.targetLanguage || '')
    : guestPrefs.targetLanguage;

  useEffect(() => {
    if (authLoading) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    let cancelled = false;

    const doFetch = async () => {
      // Initial load: full skeleton. Language-switch refresh: shimmer over text only.
      if (articlesData) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        let data: ArticlesResponse;
        if (isAuthenticated) {
          data = await getArticles();
        } else {
          const prefs = guestPrefsRef.current;
          const opts: { targetLanguage?: string; familiarLanguage?: string; cefrLevel?: string } = {};
          if (prefs.targetLanguage !== 'spanish') opts.targetLanguage = prefs.targetLanguage;
          if (prefs.cefrLevel !== 'A2') opts.cefrLevel = prefs.cefrLevel;
          if (opts.targetLanguage || opts.cefrLevel) opts.familiarLanguage = 'english';
          data = await getGuestArticles(Object.keys(opts).length > 0 ? opts : undefined);
        }

        if (!cancelled) {
          setArticlesData(data);
        }
      } catch {
        if (!cancelled && !articlesData) {
          setError('Failed to load articles. Please try again.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    doFetch();

    return () => {
      cancelled = true;
      controller.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, languageKey, fetchTrigger]);

  // Manual re-fetch trigger for pull-to-refresh / retry
  const fetchArticles = useCallback(() => {
    setFetchTrigger(n => n + 1);
  }, []);

  return (
    <ArticlesContext.Provider value={{ articlesData, isLoading, isRefreshing, error, fetchArticles }}>
      {children}
    </ArticlesContext.Provider>
  );
}

export function useArticles() {
  const context = useContext(ArticlesContext);
  if (!context) {
    throw new Error('useArticles must be used within an ArticlesProvider');
  }
  return context;
}

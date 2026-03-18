'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const STORAGE_KEY_LANGUAGE = 'reetle-guest-language';
const STORAGE_KEY_LEVEL = 'reetle-guest-level';

const DEFAULT_LANGUAGE = 'es';
const DEFAULT_FAMILIAR_LANGUAGE = 'en';
const DEFAULT_LEVEL = 'A2';

interface GuestPreferences {
  targetLanguage: string;
  familiarLanguage: string;
  cefrLevel: string;
}

interface GuestPreferencesContextType {
  preferences: GuestPreferences;
  setTargetLanguage: (lang: string) => void;
  setCefrLevel: (level: string) => void;
  hasCustomised: boolean;
}

const GuestPreferencesContext = createContext<GuestPreferencesContextType | null>(null);

export function GuestPreferencesProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [preferences, setPreferences] = useState<GuestPreferences>({
    targetLanguage: DEFAULT_LANGUAGE,
    familiarLanguage: DEFAULT_FAMILIAR_LANGUAGE,
    cefrLevel: DEFAULT_LEVEL,
  });
  const [hasCustomised, setHasCustomised] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const storedLang = localStorage.getItem(STORAGE_KEY_LANGUAGE);
    const storedLevel = localStorage.getItem(STORAGE_KEY_LEVEL);
    if (storedLang || storedLevel) {
      setPreferences({
        targetLanguage: storedLang || DEFAULT_LANGUAGE,
        familiarLanguage: DEFAULT_FAMILIAR_LANGUAGE,
        cefrLevel: storedLevel || DEFAULT_LEVEL,
      });
      setHasCustomised(true);
    }
  }, []);

  const setTargetLanguage = useCallback((lang: string) => {
    setPreferences(prev => ({ ...prev, targetLanguage: lang }));
    localStorage.setItem(STORAGE_KEY_LANGUAGE, lang);
    setHasCustomised(true);
  }, []);

  const setCefrLevel = useCallback((level: string) => {
    setPreferences(prev => ({ ...prev, cefrLevel: level }));
    localStorage.setItem(STORAGE_KEY_LEVEL, level);
    setHasCustomised(true);
  }, []);

  // Don't expose preferences for authenticated users (they have their own settings)
  if (isAuthenticated) {
    return (
      <GuestPreferencesContext.Provider value={{
        preferences: { targetLanguage: DEFAULT_LANGUAGE, familiarLanguage: DEFAULT_FAMILIAR_LANGUAGE, cefrLevel: DEFAULT_LEVEL },
        setTargetLanguage: () => {},
        setCefrLevel: () => {},
        hasCustomised: false,
      }}>
        {children}
      </GuestPreferencesContext.Provider>
    );
  }

  return (
    <GuestPreferencesContext.Provider value={{ preferences, setTargetLanguage, setCefrLevel, hasCustomised }}>
      {children}
    </GuestPreferencesContext.Provider>
  );
}

export function useGuestPreferences() {
  const context = useContext(GuestPreferencesContext);
  if (!context) {
    throw new Error('useGuestPreferences must be used within a GuestPreferencesProvider');
  }
  return context;
}

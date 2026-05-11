'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { normaliseReferralCode } from '@/lib/referralShare';

/**
 * Captures a referral code from `?ref=<CODE>` on any page load, persists it in
 * localStorage with a 7-day expiry, and exposes actions for dismissing the
 * site-wide banner (session-only) and clearing the code entirely.
 */

const STORAGE_KEY = 'reetle.referralCode';
const DISMISS_KEY = 'reetle.referralBanner.dismissed';
const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

interface StoredReferral {
  code: string;
  expiresAt: number;
}

interface ReferralContextType {
  code: string | null;
  isBannerDismissed: boolean;
  dismissBanner: () => void;
  clearCode: () => void;
  setCode: (code: string) => void;
}

const ReferralContext = createContext<ReferralContextType | null>(null);

function readStoredReferral(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredReferral;
    if (!parsed.code || typeof parsed.expiresAt !== 'number') return null;
    if (Date.now() > parsed.expiresAt) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return normaliseReferralCode(parsed.code);
  } catch {
    return null;
  }
}

function writeStoredReferral(code: string): void {
  if (typeof window === 'undefined') return;
  const payload: StoredReferral = { code, expiresAt: Date.now() + EXPIRY_MS };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Storage full / disabled — fail silently.
  }
}

function clearStoredReferral(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Remove `ref` from the current URL without a navigation/reload. */
function stripRefFromUrl(): void {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('ref')) return;
    url.searchParams.delete('ref');
    const newQs = url.searchParams.toString();
    const newUrl = url.pathname + (newQs ? `?${newQs}` : '') + url.hash;
    window.history.replaceState(window.history.state, '', newUrl);
  } catch {
    // ignore
  }
}

export function ReferralProvider({ children }: { children: ReactNode }) {
  const [code, setCodeState] = useState<string | null>(null);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);

  // Hydrate from storage + capture from URL on mount.
  useEffect(() => {
    const stored = readStoredReferral();
    if (stored) setCodeState(stored);

    try {
      if (typeof window !== 'undefined' && window.sessionStorage.getItem(DISMISS_KEY) === '1') {
        setIsBannerDismissed(true);
      }
    } catch {
      // ignore
    }

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = normaliseReferralCode(params.get('ref'));
      if (fromUrl) {
        writeStoredReferral(fromUrl);
        setCodeState(fromUrl);
        // A fresh link should re-show the banner even if previously dismissed.
        try {
          window.sessionStorage.removeItem(DISMISS_KEY);
        } catch {
          // ignore
        }
        setIsBannerDismissed(false);
        stripRefFromUrl();
      }
    }
  }, []);

  const dismissBanner = useCallback(() => {
    setIsBannerDismissed(true);
    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(DISMISS_KEY, '1');
      }
    } catch {
      // ignore
    }
  }, []);

  const clearCode = useCallback(() => {
    setCodeState(null);
    clearStoredReferral();
  }, []);

  const setCode = useCallback((next: string) => {
    const normalised = normaliseReferralCode(next);
    if (!normalised) return;
    writeStoredReferral(normalised);
    setCodeState(normalised);
  }, []);

  return (
    <ReferralContext.Provider
      value={{ code, isBannerDismissed, dismissBanner, clearCode, setCode }}
    >
      {children}
    </ReferralContext.Provider>
  );
}

export function useReferral() {
  const ctx = useContext(ReferralContext);
  if (!ctx) {
    throw new Error('useReferral must be used within a ReferralProvider');
  }
  return ctx;
}

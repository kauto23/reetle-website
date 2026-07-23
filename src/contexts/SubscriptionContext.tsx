'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getSubscriptionStatus, getSavedSubscription, saveSubscription } from '@/services/api';
import type { SubscriptionStatus, SubscriptionDailyUsage } from '@/types/subscription';

interface SubscriptionContextType {
  isPremium: boolean;
  platform: SubscriptionStatus['platform'];
  expirationDate: string | null;
  dailyUsage: SubscriptionDailyUsage | null;
  isLoading: boolean;
  refreshStatus: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

// Subscription state is seeded from the `subscription` block that every auth
// endpoint returns (persisted to localStorage at sign-in, see AuthContext).
// No polling and no fetch on mount — the status endpoint is only hit when a
// consumer explicitly calls refreshStatus (payment success polling, manual
// refresh on the profile page, post-cancellation).
export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Rethrows on failure so callers (e.g. the profile refresh button) can
  // surface an error; callers that don't care should catch.
  const refreshStatus = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setIsLoading(true);
      const data = await getSubscriptionStatus();
      setStatus(data);
      saveSubscription(data);
    } catch (err) {
      console.error('Failed to fetch subscription status:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setStatus(null);
      return;
    }
    const saved = getSavedSubscription();
    if (saved) {
      setStatus(saved);
    } else {
      // Sessions created before subscription state was persisted at sign-in
      // have no saved block; fetch once to migrate them, then rely on storage.
      refreshStatus().catch(() => {});
    }
  }, [isAuthenticated, refreshStatus]);

  return (
    <SubscriptionContext.Provider
      value={{
        isPremium: status?.is_premium ?? false,
        platform: status?.platform ?? null,
        expirationDate: status?.expiration_date ?? null,
        dailyUsage: status?.daily_usage ?? null,
        isLoading,
        refreshStatus,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

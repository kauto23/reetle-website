'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getSubscriptionStatus } from '@/services/api';
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

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setIsLoading(true);
      const data = await getSubscriptionStatus();
      setStatus(data);
    } catch (err) {
      console.error('Failed to fetch subscription status:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setStatus(null);
      return;
    }

    fetchStatus();

    intervalRef.current = setInterval(fetchStatus, REFRESH_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAuthenticated, fetchStatus]);

  return (
    <SubscriptionContext.Provider
      value={{
        isPremium: status?.is_premium ?? false,
        platform: status?.platform ?? null,
        expirationDate: status?.expiration_date ?? null,
        dailyUsage: status?.daily_usage ?? null,
        isLoading,
        refreshStatus: fetchStatus,
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

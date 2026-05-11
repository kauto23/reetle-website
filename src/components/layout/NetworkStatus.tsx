'use client';

import { useState, useEffect } from 'react';
import { Check, WifiOff } from 'lucide-react';

export default function NetworkStatus() {
  const [isOffline, setIsOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    };

    if (typeof window !== 'undefined' && !navigator.onLine) {
      setIsOffline(true);
    }

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!isOffline && !showReconnected) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 animate-fadeIn"
      style={{ zIndex: 'var(--z-network-status)' }}
    >
      {isOffline && (
        <div className="bg-incorrect text-white px-5 py-2 rounded-xl shadow-lg flex items-center gap-2 text-[14px] font-medium">
          <WifiOff className="w-4 h-4" />
          No internet connection
        </div>
      )}
      {showReconnected && !isOffline && (
        <div className="bg-correct text-white px-5 py-2 rounded-xl shadow-lg flex items-center gap-2 text-[14px] font-medium">
          <Check className="w-4 h-4" strokeWidth={2.5} />
          Back online
        </div>
      )}
    </div>
  );
}

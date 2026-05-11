'use client';

import { useState, useEffect } from 'react';

/**
 * Client-only coarse device class: phones and tablets vs desktop/laptop.
 * Uses user agent plus iPad-on-desktop-Safari heuristics. Returns null until
 * measured after mount (avoids SSR/hydration mismatch).
 */
export function useIsMobileDevice(): boolean | null {
  const [mobile, setMobile] = useState<boolean | null>(null);

  useEffect(() => {
    setMobile(computeIsMobileDevice());
  }, []);

  return mobile;
}

function computeIsMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    return true;
  }
  if (/iPad/i.test(ua)) {
    return true;
  }
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) {
    return true;
  }
  return false;
}

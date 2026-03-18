'use client';

import { useState, useEffect } from 'react';

/**
 * Returns true when the primary pointing device supports hover (e.g. mouse/trackpad).
 * Falls back to true during SSR so the first paint matches the desktop-hover path,
 * then corrects on hydration for touch-only devices.
 */
export function useHasHover(): boolean {
  const [hasHover, setHasHover] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover)');
    setHasHover(mq.matches);

    const onChange = (e: MediaQueryListEvent) => setHasHover(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return hasHover;
}

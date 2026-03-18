'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useHasHover } from '@/hooks/useHasHover';

const DEMO_DISMISSED_KEY = 'reetle-translation-demo-dismissed';

interface TranslationDemoBannerProps {
  hasInteracted?: boolean;
}

export default function TranslationDemoBanner({ hasInteracted }: TranslationDemoBannerProps) {
  const [visible, setVisible] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const hasAutoDismissed = useRef(false);
  const hasHover = useHasHover();

  useEffect(() => {
    if (!localStorage.getItem(DEMO_DISMISSED_KEY)) {
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    if (hasInteracted && visible && !hasAutoDismissed.current) {
      hasAutoDismissed.current = true;
      localStorage.setItem(DEMO_DISMISSED_KEY, 'true');
      setVisible(false);
    }
  }, [hasInteracted, visible]);

  const dismiss = useCallback(() => {
    localStorage.setItem(DEMO_DISMISSED_KEY, 'true');
    setVisible(false);
  }, []);

  const openVideo = useCallback(() => setShowVideo(true), []);

  const closeVideo = useCallback(() => {
    setShowVideo(false);
    localStorage.setItem(DEMO_DISMISSED_KEY, 'true');
    setVisible(false);
  }, []);

  useEffect(() => {
    if (!showVideo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeVideo();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showVideo, closeVideo]);

  if (!visible && !showVideo) return null;

  return (
    <>
      {visible && (
        <div className="flex items-center gap-[10px] bg-primary/[0.06] rounded-lg px-[14px] py-[10px] mb-md animate-fadeIn">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary/60 flex-shrink-0"
          >
            <path d="m4 4 7.07 17 2.51-7.39L21 11.07z" />
          </svg>

          <p className="flex-1 text-[14px] text-primary leading-snug">
            {hasHover
              ? 'Click any word or highlight a phrase to translate. '
              : 'Tap any word or highlight a phrase to translate. '
            }
            <button
              onClick={openVideo}
              className="text-primary font-semibold underline underline-offset-2 decoration-primary/40 bg-transparent border-none cursor-pointer p-0 text-[14px] hover:decoration-primary transition-colors"
            >
              Show me
            </button>
          </p>

          <button
            onClick={dismiss}
            className="w-[24px] h-[24px] flex-shrink-0 flex items-center justify-center rounded-full bg-transparent hover:bg-primary/10 border-none cursor-pointer transition-colors"
            aria-label="Dismiss tip"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary/40">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {showVideo && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-md">
          <div
            className="absolute inset-0 bg-black/60 animate-fadeIn"
            onClick={closeVideo}
          />

          <div className="relative w-full max-w-[640px] overflow-hidden rounded-lg border-2 border-primary/30 shadow-2xl bg-background animate-translationPopIn">
            <button
              onClick={closeVideo}
              className="absolute top-[8px] right-[8px] z-10 w-[28px] h-[28px] flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 border-none cursor-pointer transition-colors"
              aria-label="Close video"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <video
              src="/videos/translation-demo.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-auto block"
            />
          </div>
        </div>
      )}
    </>
  );
}

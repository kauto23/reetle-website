'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Translation } from '@/types/translation';
import { getTranslation, getGuestTranslation, GuestQuotaError } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import SignUpPrompt from '@/components/SignUpPrompt';

interface TranslationSheetProps {
  selectedText: string;
  context: string;
  extendedContext?: string;
  onClose: () => void;
  /** When true, show a "Translate" button instead of auto-fetching */
  pending?: boolean;
  /** Called when the user clicks the Translate button in pending mode */
  onTranslateRequest?: () => void;
}

export default function TranslationSheet({ selectedText, context, extendedContext, onClose, pending, onTranslateRequest }: TranslationSheetProps) {
  const { isAuthenticated } = useAuth();
  const [translation, setTranslation] = useState<Translation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(onClose, 200);
  }, [onClose]);

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  // Clear previous results when entering pending mode or when text changes while pending
  useEffect(() => {
    if (pending) {
      setTranslation(null);
      setIsLoading(false);
      setError(null);
      setQuotaExceeded(false);
    }
  }, [pending, selectedText]);

  // Auto-fetch when not in pending mode
  useEffect(() => {
    if (pending) return;

    let cancelled = false;

    async function fetchTranslation() {
      setIsLoading(true);
      setError(null);
      setQuotaExceeded(false);
      try {
        const result = isAuthenticated
          ? await getTranslation(selectedText, context, extendedContext)
          : await getGuestTranslation(selectedText, context, extendedContext);
        if (!cancelled) {
          setTranslation(result);
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof GuestQuotaError) {
            setQuotaExceeded(true);
          } else {
            setError('Could not translate. Please try again.');
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchTranslation();

    return () => {
      cancelled = true;
    };
  }, [selectedText, context, extendedContext, isAuthenticated, pending]);

  return (
    <div data-overlay className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-none">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 pointer-events-auto transition-opacity duration-200 ${
          isClosing ? 'bg-transparent' : 'bg-black/10'
        }`}
        onClick={handleClose}
      />

      {/* Floating card */}
      <div
        className={`relative pointer-events-auto w-full max-w-[480px] mx-md mb-lg
          bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.08)]
          border border-border/60
          overflow-hidden
          transition-all duration-200 ease-out
          ${isClosing
            ? 'opacity-0 translate-y-4 scale-[0.98]'
            : 'animate-translationPopIn'
          }`}
      >
        {/* Content */}
        <div className="px-lg pb-lg pt-md max-h-[280px] overflow-y-auto">
          {pending && (
            <div className="flex items-center gap-sm py-xs">
              <button
                onClick={onTranslateRequest}
                className="flex-1 bg-primary text-white text-body-md font-medium
                  py-[8px] rounded-lg border-none cursor-pointer
                  hover:bg-primary-dark transition-colors"
              >
                Translate
              </button>
              <button
                onClick={handleClose}
                className="w-[28px] h-[28px] flex-shrink-0 flex items-center justify-center
                  rounded-full bg-transparent hover:bg-black/5 border-none cursor-pointer transition-colors"
                aria-label="Close"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}

          {isLoading && !pending && (
            <div className="flex items-center gap-sm py-xs">
              <div className="flex gap-[4px]">
                <span className="w-[6px] h-[6px] rounded-full bg-primary/40 animate-bounce [animation-delay:0ms]" />
                <span className="w-[6px] h-[6px] rounded-full bg-primary/40 animate-bounce [animation-delay:150ms]" />
                <span className="w-[6px] h-[6px] rounded-full bg-primary/40 animate-bounce [animation-delay:300ms]" />
              </div>
              <p className="text-body-md text-text-secondary">Translating...</p>
              {/* Close button */}
              <button
                onClick={handleClose}
                className="ml-auto w-[28px] h-[28px] flex-shrink-0 flex items-center justify-center
                  rounded-full bg-transparent hover:bg-black/5 border-none cursor-pointer transition-colors"
                aria-label="Close translation"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}

          {quotaExceeded && !isLoading && !pending && (
            <div className="relative">
              <button
                onClick={handleClose}
                className="absolute top-0 right-0 w-[28px] h-[28px] flex-shrink-0 flex items-center justify-center
                  rounded-full bg-transparent hover:bg-black/5 border-none cursor-pointer transition-colors"
                aria-label="Close translation"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              <SignUpPrompt
                variant="inline"
                heading="Translation limit reached"
                message="Create a free account for unlimited translations."
              />
            </div>
          )}

          {error && !quotaExceeded && !pending && (
            <div className="flex items-center gap-sm py-xs">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-incorrect flex-shrink-0">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <p className="text-body-md text-incorrect">{error}</p>
              {/* Close button */}
              <button
                onClick={handleClose}
                className="ml-auto w-[28px] h-[28px] flex-shrink-0 flex items-center justify-center
                  rounded-full bg-transparent hover:bg-black/5 border-none cursor-pointer transition-colors"
                aria-label="Close translation"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}

          {translation && !isLoading && !quotaExceeded && !pending && (
            <div className="animate-fadeIn">
              <div className="flex items-start justify-between gap-sm mb-[6px]">
                <p className="text-title-lg text-primary font-semibold">
                  {translation.text}
                </p>
                {/* Close button */}
                <button
                  onClick={handleClose}
                  className="w-[28px] h-[28px] flex-shrink-0 flex items-center justify-center
                    rounded-full bg-transparent hover:bg-black/5 border-none cursor-pointer transition-colors mt-[2px]"
                  aria-label="Close translation"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <p className="text-body-md text-text-secondary leading-relaxed">
                {translation.explanation}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

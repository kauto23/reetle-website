'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Translation, GrammarNote } from '@/types/translation';
import { getTranslation, getGuestTranslation, GuestQuotaError } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useGuestPreferences } from '@/contexts/GuestPreferencesContext';
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

type Segment = { text: string; note: GrammarNote | null };

/**
 * Splits the explanation text into plain and annotated segments.
 * Each grammar note's `label` is guaranteed by the API to be a verbatim
 * substring of `explanation`, so we match it directly without any heuristics.
 * Longer labels are matched first to prevent partial overlaps.
 */
function buildAnnotatedSegments(explanation: string, notes: GrammarNote[]): Segment[] {
  if (!notes.length) return [{ text: explanation, note: null }];

  const sorted = [...notes].sort((a, b) => b.label.length - a.label.length);

  const escaped = sorted.map(n => n.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi');

  const labelToNote = new Map(sorted.map(n => [n.label.toLowerCase(), n]));

  const segments: Segment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(explanation)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: explanation.slice(lastIndex, match.index), note: null });
    }
    segments.push({ text: match[0], note: labelToNote.get(match[0].toLowerCase()) ?? null });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < explanation.length) {
    segments.push({ text: explanation.slice(lastIndex), note: null });
  }

  return segments;
}

export default function TranslationSheet({ selectedText, context, extendedContext, onClose, pending, onTranslateRequest }: TranslationSheetProps) {
  const { isAuthenticated } = useAuth();
  const { preferences: guestPrefs } = useGuestPreferences();
  const [translation, setTranslation] = useState<Translation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [activeNote, setActiveNote] = useState<GrammarNote | null>(null);
  const [view, setView] = useState<'main' | 'note'>('main');

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(onClose, 200);
  }, [onClose]);

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (view === 'note') {
          setView('main');
          setTimeout(() => setActiveNote(null), 300);
        } else {
          handleClose();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, view]);

  // Reset panels when translation changes
  useEffect(() => {
    setActiveNote(null);
    setView('main');
  }, [translation]);

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
          : await getGuestTranslation(selectedText, context, extendedContext, guestPrefs.targetLanguage, guestPrefs.familiarLanguage);
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

  function handleNoteClick(note: GrammarNote) {
    setActiveNote(note);
    setView('note');
  }

  function handleBack() {
    setView('main');
    setTimeout(() => setActiveNote(null), 300);
  }

  const segments = translation?.grammar_notes?.length
    ? buildAnnotatedSegments(translation.explanation, translation.grammar_notes)
    : null;

  const closeButton = (
    <button
      onClick={handleClose}
      className="w-[28px] h-[28px] flex-shrink-0 flex items-center justify-center
        rounded-full bg-transparent hover:bg-black/5 border-none cursor-pointer transition-colors"
      aria-label="Close translation"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  );

  return (
    <div data-overlay className="fixed inset-0 z-[10000] flex items-end justify-center pointer-events-none">
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
        {/* Two-panel slider */}
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{
            width: '200%',
            transform: view === 'note' ? 'translateX(-50%)' : 'translateX(0)',
          }}
        >
          {/* Panel 0: Main translation */}
          <div className="w-1/2 px-lg pb-lg pt-md max-h-[280px] overflow-y-auto">
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
                {closeButton}
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
                <div className="ml-auto">{closeButton}</div>
              </div>
            )}

            {quotaExceeded && !isLoading && !pending && (
              <div className="relative">
                <div className="absolute top-0 right-0">{closeButton}</div>
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
                <div className="ml-auto">{closeButton}</div>
              </div>
            )}

            {translation && !isLoading && !quotaExceeded && !pending && (
              <div className="animate-fadeIn">
                <div className="flex items-start justify-between gap-sm mb-[6px]">
                  <p className="text-title-lg text-primary font-semibold">
                    {translation.text}
                  </p>
                  <div className="mt-[2px]">{closeButton}</div>
                </div>
                <p className="text-body-md text-text-secondary leading-relaxed">
                  {segments
                    ? segments.map((seg, i) =>
                        seg.note ? (
                          <button
                            key={i}
                            onClick={() => handleNoteClick(seg.note!)}
                            className="inline text-primary underline decoration-dotted underline-offset-2
                              bg-transparent border-none p-0 cursor-pointer font-[inherit] text-[inherit] leading-[inherit]
                              hover:text-primary-dark transition-colors"
                          >
                            {seg.text}
                          </button>
                        ) : (
                          <span key={i}>{seg.text}</span>
                        )
                      )
                    : translation.explanation}
                </p>
              </div>
            )}
          </div>

          {/* Panel 1: Grammar note deep-dive */}
          <div className="w-1/2 px-lg pb-lg pt-md max-h-[280px] overflow-y-auto">
            {activeNote && (
              <div className="animate-fadeIn">
                <div className="flex items-center gap-sm mb-sm">
                  <button
                    onClick={handleBack}
                    className="w-[28px] h-[28px] flex-shrink-0 flex items-center justify-center
                      rounded-full bg-transparent hover:bg-black/5 border-none cursor-pointer transition-colors"
                    aria-label="Back to translation"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  <p className="text-title-lg font-semibold text-text-primary flex-1">
                    {activeNote.title}
                  </p>
                  {closeButton}
                </div>
                <p className="text-body-md text-text-primary leading-relaxed">
                  {activeNote.why}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Translation, GrammarNote } from '@/types/translation';
import { getTranslation, getGuestTranslation, GuestQuotaError } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useGuestPreferences } from '@/contexts/GuestPreferencesContext';
import SignUpPrompt from '@/components/SignUpPrompt';

import { X, ChevronLeft, Globe, CircleX } from 'lucide-react';

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

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(onClose, 200);
  }, [onClose]);

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeNote) {
          setActiveNote(null);
        } else {
          handleClose();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, activeNote]);

  // Reset note panel when translation changes
  useEffect(() => {
    setActiveNote(null);
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
  }

  function handleBack() {
    setActiveNote(null);
  }

  const segments = translation?.grammar_notes?.length
    ? buildAnnotatedSegments(translation.explanation, translation.grammar_notes)
    : null;

  const closeButton = (
    <button
      onClick={handleClose}
      className="w-[36px] h-[36px] flex-shrink-0 flex items-center justify-center
        rounded-lg border border-border bg-white text-text-secondary
        shadow-[0_1px_2px_rgba(45,24,50,0.04)]
        hover:bg-background hover:text-text-primary
        active:scale-[0.98]
        transition-all duration-150"
      aria-label="Close translation"
    >
      <X size={14} strokeWidth={2.25} aria-hidden="true" />
    </button>
  );

  const pendingCloseButton = (
    <button
      onClick={handleClose}
      className="w-[44px] h-[44px] flex-shrink-0 flex items-center justify-center
        rounded-xl border border-border bg-background text-text-secondary
        shadow-[0_1px_2px_rgba(45,24,50,0.04)]
        hover:bg-white hover:text-text-primary
        active:scale-[0.98]
        transition-all duration-150"
      aria-label="Close translation"
    >
      <X size={16} strokeWidth={2.25} />
    </button>
  );

  return (
    <>
      {/* Backdrop — below handles (10001) so touch-dragging handles works through it */}
      <div
        data-overlay
        className={`fixed inset-0 transition-opacity duration-200 ${
          isClosing ? 'bg-transparent' : 'bg-black/10'
        }`}
        style={{ zIndex: 9998 }}
        onClick={handleClose}
      />

      {/* Floating card — above handles so it renders on top */}
      <div
        className={`fixed bottom-0 left-0 right-0 flex items-end justify-center pointer-events-none`}
        style={{ zIndex: 10010 }}
      >
        <div
          className={`pointer-events-auto w-full ${pending ? 'max-w-[720px]' : 'max-w-[480px]'} mx-md mb-lg
            bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.08)]
            border border-border/60
            overflow-y-auto
            transition-all duration-200 ease-out
            ${isClosing
              ? 'opacity-0 translate-y-4 scale-[0.98]'
              : 'animate-translationPopIn'
            }`}
          style={{ maxHeight: activeNote ? 'calc(100vh - 120px)' : '60vh' }}
        >
          {activeNote ? (
            <div className="px-lg pb-lg pt-md animate-fadeIn">
              <div className="flex items-center gap-sm mb-sm">
                <button
                  onClick={handleBack}
                  className="w-[28px] h-[28px] flex-shrink-0 flex items-center justify-center
                    rounded-full bg-transparent hover:bg-black/5 border-none cursor-pointer transition-colors"
                  aria-label="Back to translation"
                >
                  <ChevronLeft size={14} strokeWidth={2.5} className="text-text-secondary" />
                </button>
                <p className="text-title-lg font-semibold text-primary flex-1">
                  {activeNote.title}
                </p>
                {closeButton}
              </div>
              <div className="text-body-md text-text-secondary leading-relaxed">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => <p className="mb-[0.4em] last:mb-0">{children}</p>,
                    strong: ({ children }) => (
                      <strong className="font-semibold text-primary">{children}</strong>
                    ),
                    table: ({ children }) => (
                      <table className="w-full my-[0.5em] text-body-sm border-collapse">{children}</table>
                    ),
                    th: ({ children }) => (
                      <th className="text-left font-semibold text-primary px-[8px] py-[4px] border-b border-border">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="text-left px-[8px] py-[4px] border-b border-border/50">{children}</td>
                    ),
                    ul: ({ children }) => <ul className="list-disc pl-[1.2em] mb-[0.4em]">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-[1.2em] mb-[0.4em]">{children}</ol>,
                    li: ({ children }) => <li className="mb-[0.15em]">{children}</li>,
                  }}
                >
                  {activeNote.why}
                </ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className={pending ? 'p-sm' : 'px-lg pb-lg pt-md'}>
              {pending && (
                <div className="flex items-center gap-sm">
                  <button
                    onClick={onTranslateRequest}
                    className="flex h-[44px] flex-1 items-center justify-center gap-[10px]
                      rounded-xl bg-primary px-md text-body-md font-semibold text-white
                      border-none cursor-pointer shadow-[0_6px_18px_rgba(74,36,98,0.22)]
                      hover:bg-primary-dark active:scale-[0.99]
                      transition-all duration-150 disabled:cursor-default disabled:opacity-60"
                    disabled={!onTranslateRequest}
                  >
                    <Globe size={16} strokeWidth={2} aria-hidden="true" />
                    <span>Translate selection</span>
                  </button>
                  {pendingCloseButton}
                </div>
              )}

              {isLoading && !pending && (
                <div className="flex items-center gap-sm py-xs">
                  <div className="flex gap-[4px]">
                    <span className="w-[6px] h-[6px] rounded-full bg-primary animate-bounceDot [animation-delay:0ms]" />
                    <span className="w-[6px] h-[6px] rounded-full bg-primary animate-bounceDot [animation-delay:150ms]" />
                    <span className="w-[6px] h-[6px] rounded-full bg-primary animate-bounceDot [animation-delay:300ms]" />
                  </div>
                  <p className="text-body-md text-primary font-medium">Translating...</p>
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
                  <CircleX size={16} strokeWidth={2} className="text-incorrect flex-shrink-0" />
                  <p className="text-body-md text-incorrect">{error}</p>
                  <div className="ml-auto">{closeButton}</div>
                </div>
              )}

              {translation && !isLoading && !quotaExceeded && !pending && (
                <div className="animate-fadeIn">
                  <div className="flex items-center justify-between gap-sm mb-[6px]">
                    <p className="text-title-lg text-primary font-semibold">
                      {translation.text}
                    </p>
                    {closeButton}
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
          )}
        </div>
      </div>
    </>
  );
}

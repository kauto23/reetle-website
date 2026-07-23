'use client';

/**
 * Home-page Play All audio module.
 *
 * Wraps {@link usePlayAllAudio} (root provider) and renders the right state per access
 * tier:
 *
 * - Guest → locked CTA inviting sign-in (no audio API calls).
 * - Logged-in idle → no inline module (sessions start from article ▶ controls).
 * - Playing/paused → mini-player with track info, transport controls, and a
 *   scrubber styled to match the per-article audio panel.
 * - Preparing-next badge appears subtly when a one-ahead generation is in
 *   flight (premium only). It is informational and never blocks playback.
 * - Limit reached (free tier) → Premium upsell, no further playback or
 *   generation triggered.
 * - Empty / finished → friendly status; users can dismiss with `Stop`.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Headphones, Play, Pause, SkipForward, SkipBack, RotateCcw, RotateCw, X, ListVideo, GripVertical } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayAllAudio, type QueueItem } from '@/contexts/PlayAllAudioContext';
import { useLoginUrl } from '@/hooks/useLoginUrl';
import { AUDIO_PREPARING_DETAIL_MESSAGES } from '@/lib/audioPreparingMessages';
import type { Article } from '@/types/article';
import { Button } from '@/components/ui/button';

const PREPARING_MESSAGE_ROTATE_MS = 5000;

function WaveSpinner() {
  return (
    <div className="flex items-center gap-[3px]" aria-hidden>
      <span className="w-[3px] h-[10px] bg-primary rounded-full animate-audioWave" style={{ animationDelay: '0ms' }} />
      <span className="w-[3px] h-[16px] bg-primary rounded-full animate-audioWave" style={{ animationDelay: '120ms' }} />
      <span className="w-[3px] h-[10px] bg-primary rounded-full animate-audioWave" style={{ animationDelay: '240ms' }} />
      <span className="w-[3px] h-[18px] bg-primary rounded-full animate-audioWave" style={{ animationDelay: '360ms' }} />
      <span className="w-[3px] h-[10px] bg-primary rounded-full animate-audioWave" style={{ animationDelay: '480ms' }} />
    </div>
  );
}

function AnimatedSkipButton({
  direction,
  onClick,
  disabled,
  className,
  'aria-label': ariaLabel,
}: {
  direction: 'forward' | 'backward';
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}) {
  const [isAnimating, setIsAnimating] = useState(false);
  const Icon = direction === 'forward' ? RotateCw : RotateCcw;

  const handleClick = () => {
    if (disabled) return;
    setIsAnimating(true);
    onClick();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={className}
      aria-label={ariaLabel}
    >
      <Icon
        size={22}
        className={isAnimating ? (direction === 'forward' ? 'animate-spin-fast-cw' : 'animate-spin-fast-ccw') : ''}
        onAnimationEnd={() => setIsAnimating(false)}
      />
    </button>
  );
}

// SSR-safe layout effect.
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Single-line text that scrolls right→left when it would otherwise be
 * truncated. Pixels-per-second is constant so longer titles take longer to
 * scroll. When the text fits, no animation is rendered.
 */
function MarqueeText({ text, className = '' }: { text: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [duration, setDuration] = useState(12);

  useIsoLayoutEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    const update = () => {
      const containerWidth = container.clientWidth;
      const textWidth = measure.scrollWidth;
      const isOverflowing = textWidth > containerWidth + 1;
      setOverflowing(isOverflowing);
      if (isOverflowing) {
        // ~50px/s feels readable; cap to 6s minimum for short overflows.
        setDuration(Math.max(6, Math.round((textWidth + containerWidth) / 50)));
      }
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(container);
    ro.observe(measure);
    return () => ro.disconnect();
  }, [text]);

  return (
    <div ref={containerRef} className={`relative overflow-hidden whitespace-nowrap ${className}`}>
      <span ref={measureRef} aria-hidden className="invisible pointer-events-none absolute top-0 left-0 whitespace-nowrap">
        {text}
      </span>
      {overflowing ? (
        <div className="inline-flex animate-marquee" style={{ ['--marquee-duration' as string]: `${duration}s` }}>
          <span className="pr-[40px]">{text}</span>
          <span aria-hidden className="pr-[40px]">{text}</span>
        </div>
      ) : (
        <span className="inline-block">{text}</span>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

const BASE_WRAPPER_BASE = 'border border-border bg-ui-card px-[12px] py-[10px] sm:px-[14px] sm:py-[12px]';

interface PlayAllAudioProps {
  articles?: Article[];
  /** Primary title shown in the idle CTA. */
  playAllLabel?: string;
  /** Subtitle shown on sm+ screens in the idle CTA. Hidden on mobile. */
  playAllSubtext?: string;
  /** Extra classes for the inline (idle/empty/finished/etc.) wrapper. */
  inlineClassName?: string;
}

export default function PlayAllAudio({
  articles,
  playAllLabel = 'Audio feed',
  playAllSubtext = 'Recent articles narrated at your level, back-to-back.',
  inlineClassName = '',
}: PlayAllAudioProps) {
  const { isAuthenticated } = useAuth();
  const loginUrl = useLoginUrl();
  const queue = usePlayAllAudio();
  const [mounted, setMounted] = useState(false);
  const [showQueue, setShowQueue] = useState(false);

  // Drag-to-reorder state — queue indices (`queue[currentIndex + 1 + …]` not section-relative).
  const [draggingAbsIdx, setDraggingAbsIdx] = useState<number | null>(null);
  const [dragOverAbsIdx, setDragOverAbsIdx] = useState<number | null>(null);
  const draggingAbsIdxRef = useRef<number | null>(null);
  const dragOverAbsIdxRef = useRef<number | null>(null);
  const queueListRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // While audio for a user-requested article is still being generated
  // (pendingPlayback set), the "Now playing" label is replaced with rotating
  // preparing microcopy, matching the article page's preparing panel.
  const isPreparingPending =
    queue.pendingPlayback != null && (queue.mode === 'loading' || queue.mode === 'awaiting_next');
  const [preparingMessageIndex, setPreparingMessageIndex] = useState(0);

  useEffect(() => {
    if (!isPreparingPending) {
      setPreparingMessageIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setPreparingMessageIndex(prev => (prev + 1) % AUDIO_PREPARING_DETAIL_MESSAGES.length);
    }, PREPARING_MESSAGE_ROTATE_MS);
    return () => clearInterval(interval);
  }, [isPreparingPending]);

  const BASE_WRAPPER_CLASS = `${BASE_WRAPPER_BASE} ${inlineClassName}`.trim();

  // Guests: locked CTA, no audio API calls behind the scenes.
  if (!isAuthenticated || queue.mode === 'guest_locked') {
    return (
      <div className={`${BASE_WRAPPER_CLASS} flex items-center gap-[10px] sm:gap-[12px]`}>
        <div className="w-[36px] h-[36px] rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <Headphones size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-body-md font-medium text-primary">{playAllLabel}</div>
          <div className="hidden sm:block text-label-md text-ui-muted-foreground mt-[2px]">
            Sign in to play recent articles back-to-back at your level.
          </div>
        </div>
        <Button asChild variant="default" size="sm" className="rounded-sm px-[12px] sm:px-[14px] py-2 h-auto shrink-0 whitespace-nowrap">
          <Link href={loginUrl} className="inline-flex items-center gap-[6px]">
            <Headphones size={14} />
            Sign in
          </Link>
        </Button>
      </div>
    );
  }

  if (queue.mode === 'limit_reached') {
    return (
      <div className={`${BASE_WRAPPER_CLASS} flex items-start gap-[12px]`}>
        <div className="w-[36px] h-[36px] rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <Headphones size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-body-md font-medium text-primary mb-[2px]">
            You&apos;ve reached today&apos;s audio limit
          </div>
          <div className="text-label-md text-ui-muted-foreground mb-[8px]">
            Upgrade to Premium for unlimited listening, or come back tomorrow.
          </div>
          <Link
            href="/premium"
            className="inline-flex items-center gap-[6px] text-body-sm font-medium text-primary-light hover:text-primary transition-colors"
          >
            Upgrade for unlimited audio
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" /><path d="M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>
        <button
          type="button"
          onClick={queue.stop}
          className="text-ui-muted-foreground hover:text-primary transition-colors p-[4px] shrink-0"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  // Free user tapped ▶ on an article without generated audio: the bottom bar
  // already popped up in its loading state, so it morphs in place into the
  // Premium upsell instead of a separate toast.
  if (queue.mode === 'requires_premium') {
    const premiumBar = (
      <div className="fixed inset-x-0 bottom-0 z-[1000]">
        <div className="border-t border-border bg-ui-card px-[12px] pt-[10px] pb-[calc(10px+env(safe-area-inset-bottom))] shadow-[0_-4px_18px_rgba(35,17,49,0.10)]">
          <div className="max-w-[1280px] mx-auto flex items-center gap-[10px] sm:gap-[12px]">
            <div className="hidden sm:flex w-[40px] h-[40px] rounded-full bg-primary/10 items-center justify-center text-primary shrink-0">
              <Headphones size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-body-md font-medium text-primary">
                On-demand audio is a Premium feature
              </div>
              <div className="text-label-md text-ui-muted-foreground mt-[2px]">
                This article isn&apos;t narrated yet. Premium members can generate audio for any article instantly.
              </div>
            </div>
            <Button asChild variant="default" size="sm" className="rounded-sm px-[12px] sm:px-[14px] py-2 h-auto shrink-0 whitespace-nowrap">
              <Link href="/premium">Upgrade</Link>
            </Button>
            <button
              type="button"
              onClick={queue.stop}
              className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-ui-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors shrink-0"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>
    );
    return mounted ? createPortal(premiumBar, document.body) : null;
  }

  if (queue.mode === 'empty') {
    return (
      <div className={`${BASE_WRAPPER_CLASS} flex items-center gap-[12px]`}>
        <div className="w-[36px] h-[36px] rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <Headphones size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-body-md font-medium text-primary">No audio ready yet</div>
          <div className="text-label-md text-ui-muted-foreground">
            We&apos;re preparing more audio for your level. Check back shortly.
          </div>
        </div>
        <button
          type="button"
          onClick={queue.stop}
          className="text-ui-muted-foreground hover:text-primary transition-colors p-[4px] shrink-0"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  if (queue.mode === 'finished') {
    return (
      <div className={`${BASE_WRAPPER_CLASS} flex items-center gap-[12px]`}>
        <div className="w-[36px] h-[36px] rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <Headphones size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-body-md font-medium text-primary">All caught up</div>
          <div className="text-label-md text-ui-muted-foreground">
            You&apos;ve listened to all available audio. New articles arrive throughout the day.
          </div>
        </div>
        <Button
          type="button"
          variant="default"
          size="sm"
          className="rounded-sm px-[14px] py-2 h-auto inline-flex items-center gap-[6px] shrink-0"
          onClick={() => queue.start(articles)}
        >
          <Play size={14} fill="currentColor" strokeWidth={0} />
          Restart
        </Button>
      </div>
    );
  }

  // ── Active states (idle, loading, playing, paused) ─────────────────────────

  const showMiniPlayer =
    queue.mode === 'playing'
    || queue.mode === 'paused'
    || queue.mode === 'loading'
    || queue.mode === 'awaiting_next';

  if (!showMiniPlayer) {
    const scopedReadyArticleIds = articles
      ?.filter(article => article.audioGenerated && article.contentId)
      .map(article => article.articleId);
    const hasListenedBefore = scopedReadyArticleIds
      ? scopedReadyArticleIds.some(articleId => queue.listenedArticleIds.has(articleId))
      : queue.listenedArticleIds.size > 0;
    const canResume = scopedReadyArticleIds
      ? scopedReadyArticleIds.some(articleId => !queue.listenedArticleIds.has(articleId))
      : queue.canResumePlayAll;
    const allHeardNoResume = !canResume && hasListenedBefore;

    if (allHeardNoResume) {
      return (
        <div className={`${BASE_WRAPPER_CLASS} flex items-center gap-[12px]`}>
          <div className="w-[36px] h-[36px] rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Headphones size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-body-md font-medium text-primary">You&apos;re up to date</div>
            <div className="text-label-md text-ui-muted-foreground">
              You&apos;ve already heard the articles in this Play all queue. New audio will appear as more articles are ready.
            </div>
          </div>
        </div>
      );
    }

    // Idle / error — no inline "Play all" CTA; sessions start from per-article ▶ controls.
    return null;
  }

  // Active playback becomes app chrome, so it stays clear of sticky topic headers.
  // `pendingPlayback` wins while set: when the user taps ▶ on an unprepared
  // article mid-session, `queue.current` still points at the previous track
  // until real playback starts, which would show the wrong headline.
  const currentDisplay = queue.pendingPlayback ?? queue.current;
  const articleLink =
    queue.current && queue.mode !== 'loading' && queue.mode !== 'awaiting_next'
      ? `/?article=${encodeURIComponent(queue.current.articleId)}`
      : null;

  // Upcoming items (everything after the current index).
  const upcomingItems = queue.queue.slice(queue.currentIndex + 1);
  const userUpcoming = upcomingItems.filter(i => i.source === 'user');
  const autoplayUpcoming = upcomingItems.filter(i => i.source === 'autoplay');
  const showNextUpSection = autoplayUpcoming.length > 0 || queue.preparingNext != null;
  const hasQueueTail = upcomingItems.length > 0 || queue.preparingNext != null;

  const renderDraggableQueueRow = (item: QueueItem, absIdx: number, muted: boolean) => {
    const isDragging = draggingAbsIdx === absIdx;
    const isDropTarget = dragOverAbsIdx === absIdx && draggingAbsIdx !== null && draggingAbsIdx !== absIdx;
    const showDropAbove = isDropTarget && dragOverAbsIdx! < draggingAbsIdx!;
    const showDropBelow = isDropTarget && dragOverAbsIdx! > draggingAbsIdx!;
    return (
      <li
        key={item.articleId}
        data-absidx={String(absIdx)}
        className={[
          'flex items-center gap-[8px] rounded-lg px-[10px] py-[8px] group transition-colors select-none',
          isDragging ? 'opacity-40 bg-primary/5' : 'hover:bg-primary/5',
          isDropTarget ? 'bg-primary/5' : '',
          showDropAbove ? 'border-t-2 border-primary' : '',
          showDropBelow ? 'border-b-2 border-primary' : '',
        ].filter(Boolean).join(' ')}
      >
        <button
          type="button"
          aria-label="Drag to reorder"
          className="shrink-0 text-ui-muted-foreground/30 hover:text-ui-muted-foreground/70 transition-colors cursor-grab active:cursor-grabbing touch-none"
          style={{ touchAction: 'none' }}
          onPointerDown={(e) => {
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            draggingAbsIdxRef.current = absIdx;
            dragOverAbsIdxRef.current = absIdx;
            setDraggingAbsIdx(absIdx);
            setDragOverAbsIdx(absIdx);
          }}
          onPointerMove={(e) => {
            if (draggingAbsIdxRef.current === null) return;
            const list = queueListRef.current;
            if (!list) return;
            const els = list.querySelectorAll<HTMLElement>('[data-absidx]');
            let newOver = draggingAbsIdxRef.current;
            for (const elRow of Array.from(els)) {
              const rect = elRow.getBoundingClientRect();
              const parsed = parseInt(elRow.dataset.absidx ?? '', 10);
              if (!Number.isFinite(parsed)) continue;
              if (e.clientY < rect.top + rect.height / 2) {
                newOver = parsed;
                break;
              }
              newOver = parsed;
            }
            if (newOver !== dragOverAbsIdxRef.current) {
              dragOverAbsIdxRef.current = newOver;
              setDragOverAbsIdx(newOver);
            }
          }}
          onPointerUp={() => {
            const from = draggingAbsIdxRef.current;
            const to = dragOverAbsIdxRef.current;
            if (from !== null && to !== null && from !== to) {
              queue.reorderQueue(from, to);
            }
            draggingAbsIdxRef.current = null;
            dragOverAbsIdxRef.current = null;
            setDraggingAbsIdx(null);
            setDragOverAbsIdx(null);
          }}
          onPointerCancel={() => {
            draggingAbsIdxRef.current = null;
            dragOverAbsIdxRef.current = null;
            setDraggingAbsIdx(null);
            setDragOverAbsIdx(null);
          }}
        >
          <GripVertical size={14} />
        </button>

        <button
          type="button"
          onClick={() => { queue.jumpToQueue(absIdx); setShowQueue(false); }}
          className="min-w-0 flex-1 text-left"
          aria-label={`Play ${item.headline}`}
        >
          <div className={`text-body-sm font-medium leading-snug truncate ${muted ? 'text-ui-muted-foreground' : 'text-primary'}`}>
            {item.headline}
          </div>
          {item.topic && (
            <div className={`text-label-sm truncate mt-[1px] ${muted ? 'text-ui-muted-foreground/80' : 'text-ui-muted-foreground'}`}>
              {item.topic}
            </div>
          )}
        </button>
        <button
          type="button"
          onClick={() => queue.removeFromQueue(item.articleId)}
          className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-ui-muted-foreground/50 hover:text-primary hover:bg-primary/10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100 transition-all shrink-0"
          aria-label={`Remove ${item.headline} from queue`}
        >
          <X size={14} strokeWidth={2} />
        </button>
      </li>
    );
  };

  const activePlayer = (
    <div className="fixed inset-x-0 bottom-0 z-[1000] flex flex-col">
      <style jsx global>{`
        @keyframes spin-fast-cw {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes spin-fast-ccw {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(-360deg); }
        }
        .animate-spin-fast-cw {
          animation: spin-fast-cw 0.3s ease-in-out;
        }
        .animate-spin-fast-ccw {
          animation: spin-fast-ccw 0.3s ease-in-out;
        }
      `}</style>
      {/* Queue panel — slides open above the transport bar */}
      {showQueue && (
        <div className="bg-ui-card border-t border-border shadow-[0_-4px_18px_rgba(35,17,49,0.10)]">
          <div className="max-w-[1280px] mx-auto">
            {/* Panel header */}
            <div className="flex items-center justify-between px-[14px] pt-[14px] pb-[10px] border-b border-border">
              <span className="text-body-sm font-semibold text-primary uppercase tracking-wide">
                Queue
              </span>
              <button
                type="button"
                onClick={() => setShowQueue(false)}
                className="w-[28px] h-[28px] rounded-full flex items-center justify-center text-ui-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                aria-label="Close queue"
              >
                <X size={14} />
              </button>
            </div>

            {/* Scrollable list */}
            <div className="overflow-y-auto max-h-[min(50vh,360px)] px-[14px] py-[8px]">
              {/* Now Playing */}
              {currentDisplay && (
                <div className="mb-[6px]">
                  <div className="text-[10px] font-semibold text-ui-muted-foreground uppercase tracking-wider mb-[6px] px-[2px]">
                    Now Playing
                  </div>
                  <div className="flex items-center gap-[10px] rounded-lg bg-primary/5 px-[10px] py-[9px]">
                    <div className="w-[28px] h-[28px] rounded-full bg-primary/15 flex items-center justify-center text-primary shrink-0">
                      <WaveSpinner />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-body-sm font-medium text-primary leading-snug truncate">
                        {currentDisplay.headline}
                      </div>
                      {currentDisplay.topic && (
                        <div className="text-label-sm text-ui-muted-foreground truncate mt-[1px]">
                          {currentDisplay.topic}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {hasQueueTail ? (
                <ul ref={queueListRef} className="space-y-[2px] list-none m-0 p-0">
                  {userUpcoming.length > 0 && (
                    <li key="section-next-in-queue" className="list-none px-[2px] pt-[10px] pb-[6px] pointer-events-none">
                      <div className="text-[10px] font-semibold text-ui-muted-foreground uppercase tracking-wider">
                        Next in queue · {userUpcoming.length}
                      </div>
                    </li>
                  )}
                  {userUpcoming.map(item => {
                    const absIdx = queue.queue.findIndex(q => q.articleId === item.articleId);
                    return renderDraggableQueueRow(item, absIdx, false);
                  })}

                  {showNextUpSection && (
                    <li key="section-next-up" className="list-none px-[2px] pt-[10px] pb-[6px] pointer-events-none">
                      <div className="text-[10px] font-semibold text-ui-muted-foreground uppercase tracking-wider">
                        Next up
                        {autoplayUpcoming.length > 0 ? ` · ${autoplayUpcoming.length}` : ''}
                      </div>
                    </li>
                  )}
                  {autoplayUpcoming.map(item => {
                    const absIdx = queue.queue.findIndex(q => q.articleId === item.articleId);
                    return renderDraggableQueueRow(item, absIdx, true);
                  })}
                  {queue.preparingNext && (
                    <li
                      key={`preparing-${queue.preparingNext.articleId}`}
                      className="flex items-center gap-[10px] rounded-lg px-[10px] py-[8px] text-ui-muted-foreground"
                    >
                      <div className="shrink-0 w-[28px] flex justify-center">
                        <WaveSpinner />
                      </div>
                      <div className="min-w-0 flex-1 text-label-md leading-snug">
                        <span className="font-medium text-ui-muted-foreground">Getting ready</span>
                        <span className="text-ui-muted-foreground/90"> · {queue.preparingNext.headline}</span>
                      </div>
                    </li>
                  )}
                </ul>
              ) : (
                <div className="py-[16px] text-center text-body-sm text-ui-muted-foreground">
                  Nothing else in the queue.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transport bar */}
      <div className="border-t border-border bg-ui-card px-[12px] pt-[10px] pb-[calc(10px+env(safe-area-inset-bottom))] shadow-[0_-4px_18px_rgba(35,17,49,0.10)]">
      <div className="max-w-[1280px] mx-auto">
        <div className="flex items-start sm:items-center gap-[10px] sm:gap-[12px]">
          <div className="hidden sm:flex w-[40px] h-[40px] rounded-full bg-primary/10 items-center justify-center text-primary shrink-0">
            {queue.mode === 'loading' || queue.mode === 'awaiting_next' ? <WaveSpinner /> : <Headphones size={20} />}
          </div>

          <div className="min-w-0 flex-1">
            {isPreparingPending ? (
              <div
                key={preparingMessageIndex}
                className="text-label-sm sm:text-label-md font-medium text-ui-muted-foreground tracking-wide leading-none mb-[4px] truncate animate-fadeIn"
              >
                {AUDIO_PREPARING_DETAIL_MESSAGES[preparingMessageIndex]}
              </div>
            ) : (
              <div className="text-label-sm sm:text-label-md font-medium text-ui-muted-foreground uppercase tracking-wide leading-none mb-[4px]">
                Now playing
              </div>
            )}
            {articleLink ? (
              <Link
                href={articleLink}
                scroll={false}
                className="text-body-lg sm:text-body-md leading-[1.25] font-medium text-primary block hover:underline text-left w-full"
              >
                <MarqueeText text={currentDisplay?.headline ?? 'Preparing audio'} />
              </Link>
            ) : (
              <div className="text-body-lg sm:text-body-md leading-[1.25] font-medium text-primary">
                <MarqueeText text={currentDisplay?.headline ?? 'Preparing audio'} />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={queue.stop}
            className="sm:hidden w-[30px] h-[30px] rounded-full flex items-center justify-center text-ui-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors shrink-0"
            aria-label="Stop and close"
          >
            <X size={14} />
          </button>

          <div className="hidden sm:flex items-center gap-[6px] shrink-0">
            <button
              type="button"
              onClick={queue.previous}
              disabled={queue.currentIndex <= 0 && queue.currentTime < 1}
              className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-primary hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
              aria-label="Previous article"
            >
              <SkipBack size={16} fill="currentColor" />
            </button>
            <AnimatedSkipButton
              direction="backward"
              onClick={() => queue.seek(Math.max(0, queue.currentTime - 10))}
              disabled={queue.mode === 'loading' || queue.mode === 'awaiting_next' || !queue.duration}
              className="w-[36px] h-[36px] rounded-full flex items-center justify-center text-primary hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
              aria-label="Rewind 10 seconds"
            />
            <button
              type="button"
              onClick={queue.togglePlayback}
              className="w-[46px] h-[46px] rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-dark transition-colors"
              aria-label={queue.isPlaying ? 'Pause' : 'Play'}
            >
              {queue.isPlaying ? <Pause size={18} fill="currentColor" strokeWidth={0} /> : <Play size={18} fill="currentColor" strokeWidth={0} />}
            </button>
            <AnimatedSkipButton
              direction="forward"
              onClick={() => queue.seek(queue.duration > 0 ? Math.min(queue.currentTime + 10, queue.duration) : queue.currentTime + 10)}
              disabled={queue.mode === 'loading' || queue.mode === 'awaiting_next' || !queue.duration}
              className="w-[36px] h-[36px] rounded-full flex items-center justify-center text-primary hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
              aria-label="Forward 10 seconds"
            />
            <button
              type="button"
              onClick={queue.next}
              disabled={queue.currentIndex >= queue.queue.length - 1}
              className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-primary hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
              aria-label="Next article"
            >
              <SkipForward size={16} fill="currentColor" />
            </button>
            <button
              type="button"
              onClick={() => setShowQueue(v => !v)}
              className={`relative w-[34px] h-[34px] rounded-full flex items-center justify-center transition-colors ${showQueue ? 'text-primary bg-primary/10' : 'text-ui-muted-foreground hover:text-primary hover:bg-primary/10'}`}
              aria-label={showQueue ? 'Hide queue' : 'Show queue'}
              aria-pressed={showQueue}
            >
              <ListVideo size={16} strokeWidth={showQueue ? 2.5 : 2} />
              {userUpcoming.length > 0 && (
                <span className="absolute -top-[2px] -right-[2px] w-[14px] h-[14px] rounded-full bg-primary text-white text-[8px] font-bold flex items-center justify-center leading-none">
                  {userUpcoming.length > 9 ? '9+' : userUpcoming.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={queue.stop}
              className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-ui-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors ml-[2px]"
              aria-label="Stop and close"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="sm:hidden mt-[8px] flex items-center justify-center gap-[8px]">
          <button
            type="button"
            onClick={queue.previous}
            disabled={queue.currentIndex <= 0 && queue.currentTime < 1}
            className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-primary hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
            aria-label="Previous article"
          >
            <SkipBack size={16} fill="currentColor" />
          </button>
          <AnimatedSkipButton
            direction="backward"
            onClick={() => queue.seek(Math.max(0, queue.currentTime - 10))}
            disabled={queue.mode === 'loading' || queue.mode === 'awaiting_next' || !queue.duration}
            className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-primary hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
            aria-label="Rewind 10 seconds"
          />
          <button
            type="button"
            onClick={queue.togglePlayback}
            className="w-[46px] h-[46px] rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-dark transition-colors"
            aria-label={queue.isPlaying ? 'Pause' : 'Play'}
          >
            {queue.isPlaying ? <Pause size={18} fill="currentColor" strokeWidth={0} /> : <Play size={18} fill="currentColor" strokeWidth={0} />}
          </button>
          <AnimatedSkipButton
            direction="forward"
            onClick={() => queue.seek(queue.duration > 0 ? Math.min(queue.currentTime + 10, queue.duration) : queue.currentTime + 10)}
            disabled={queue.mode === 'loading' || queue.mode === 'awaiting_next' || !queue.duration}
            className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-primary hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
            aria-label="Forward 10 seconds"
          />
          <button
            type="button"
            onClick={queue.next}
            disabled={queue.currentIndex >= queue.queue.length - 1}
            className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-primary hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
            aria-label="Next article"
          >
            <SkipForward size={16} fill="currentColor" />
          </button>
          <button
            type="button"
            onClick={() => setShowQueue(v => !v)}
            className={`relative w-[34px] h-[34px] rounded-full flex items-center justify-center transition-colors ${showQueue ? 'text-primary bg-primary/10' : 'text-ui-muted-foreground hover:text-primary hover:bg-primary/10'}`}
            aria-label={showQueue ? 'Hide queue' : 'Show queue'}
            aria-pressed={showQueue}
          >
            <ListVideo size={16} strokeWidth={showQueue ? 2.5 : 2} />
            {userUpcoming.length > 0 && (
              <span className="absolute -top-[2px] -right-[2px] w-[14px] h-[14px] rounded-full bg-primary text-white text-[8px] font-bold flex items-center justify-center leading-none">
                {userUpcoming.length > 9 ? '9+' : userUpcoming.length}
              </span>
            )}
          </button>
        </div>

        <div className="hidden sm:flex mt-[8px] items-center gap-[10px]">
          <span className="text-label-md tabular-nums text-ui-muted-foreground whitespace-nowrap min-w-[36px]">
            {formatTime(queue.currentTime)}
          </span>
          <input
            type="range"
            min="0"
            max={queue.duration || 0}
            step="0.1"
            value={Math.min(queue.currentTime, queue.duration || queue.currentTime || 0)}
            onChange={(e) => queue.seek(Number(e.target.value))}
            disabled={!queue.duration}
            className="w-full h-[4px] cursor-pointer disabled:cursor-not-allowed"
            style={{ accentColor: 'hsl(var(--primary))' }}
            aria-label="Audio playback position"
          />
          <span className="text-label-md tabular-nums text-ui-muted-foreground whitespace-nowrap min-w-[36px] text-right">
            {formatTime(queue.duration)}
          </span>
        </div>
      </div>
      </div>
    </div>
  );

  return mounted ? createPortal(activePlayer, document.body) : null;
}

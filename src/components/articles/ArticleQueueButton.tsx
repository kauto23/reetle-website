'use client';

/**
 * Per-card audio actions: a tight two-button cluster that sits beside the
 * translate icon in the metadata row. **Play now** starts (or jumps ahead
 * to) this article; **Add to queue** appends to the end of the running
 * queue. Each button reflects its own per-state visual (idle, waveform,
 * spinner, queued check) so the user can see exactly what's happening.
 *
 * Inline status labels ("Playing", rotating prep hints, "In queue") replace
 * the old floating toast confirmations for transient states so feedback
 * appears immediately adjacent to the button the user tapped.
 */

import { useCallback, useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Play, ListPlus, ListChecks } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayAllAudio } from '@/contexts/PlayAllAudioContext';
import { useLoginUrl } from '@/hooks/useLoginUrl';
import {
  AUDIO_PREPARING_INLINE_MESSAGES,
  AUDIO_PREPARING_INLINE_ROTATE_MS,
} from '@/lib/audioPreparingMessages';
import type { Article } from '@/types/article';
import { cn } from '@/lib/utils';

type ButtonSize = 'sm' | 'md';
type ButtonLayout = 'row' | 'mobile-column' | 'column';

interface ArticleQueueButtonProps {
  article: Article;
  size?: ButtonSize;
  className?: string;
  layout?: ButtonLayout;
}

// Mobile-first sizing: bigger on touch screens, shrinks to the original
// compact size on `sm:` and up via Tailwind responsive classes.
function NowPlayingWave({ responsiveSize }: { responsiveSize: ButtonSize }) {
  const sizeClass =
    responsiveSize === 'md'
      ? 'w-[22px] h-[22px] sm:w-[18px] sm:h-[18px]'
      : 'w-[20px] h-[20px] sm:w-[14px] sm:h-[14px]';
  return (
    <span
      className={`inline-flex items-end justify-center gap-[2px] ${sizeClass}`}
      aria-hidden
    >
      <span className="bg-current rounded-full animate-audioWave w-[3px]" style={{ height: '40%', animationDelay: '0ms' }} />
      <span className="bg-current rounded-full animate-audioWave w-[3px]" style={{ height: '70%', animationDelay: '160ms' }} />
      <span className="bg-current rounded-full animate-audioWave w-[3px]" style={{ height: '55%', animationDelay: '320ms' }} />
    </span>
  );
}

function PrepareSpinner({ responsiveSize }: { responsiveSize: ButtonSize }) {
  const sizeClass =
    responsiveSize === 'md'
      ? 'w-[22px] h-[22px] sm:w-[18px] sm:h-[18px] border-[3px]'
      : 'w-[20px] h-[20px] sm:w-[14px] sm:h-[14px] border-2';
  return (
    <span
      className={`inline-block rounded-full animate-spin ${sizeClass}`}
      style={{
        borderStyle: 'solid',
        borderColor: 'currentColor',
        borderTopColor: 'transparent',
      }}
      aria-hidden
    />
  );
}

type ActionKind = 'play_now' | 'append';

export default function ArticleQueueButton({
  article,
  size = 'sm',
  className = '',
  layout = 'row',
}: ArticleQueueButtonProps) {
  const isColumn = layout === 'column';
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const loginUrl = useLoginUrl();
  const playAll = usePlayAllAudio();

  // Tracks which button the user most recently tapped so we can place the
  // spinner on the correct icon while the context-level pending flag is true.
  const [lastAction, setLastAction] = useState<ActionKind | null>(null);
  const [submitting, setSubmitting] = useState<ActionKind | null>(null);
  const [showAdded, setShowAdded] = useState(false);
  const showAddedTimer = useRef<NodeJS.Timeout | null>(null);
  const [preparingMessageIndex, setPreparingMessageIndex] = useState(0);

  useEffect(() => {
    return () => {
      if (showAddedTimer.current) clearTimeout(showAddedTimer.current);
    };
  }, []);

  const isCurrentTrack = playAll.isCurrentArticleInPlayAll(article.articleId);
  const isLoadingThis = isCurrentTrack && (playAll.mode === 'loading' || playAll.mode === 'awaiting_next');
  // Treat loading as "playing" for the inline status so the user sees a
  // single, stable label after they tap ▶ rather than Loading… → Playing.
  const isPlayingThis = isCurrentTrack && (playAll.isPlaying || isLoadingThis);
  const isPausedThis = isCurrentTrack && !playAll.isPlaying && !isLoadingThis;
  const isQueued = playAll.isArticleUserQueued(article.articleId) && !isCurrentTrack;
  const isPending = playAll.isArticlePending(article.articleId);

  const needsPrepRotate =
    (lastAction === 'play_now' && (isPending || submitting === 'play_now'))
    || (lastAction === 'append' && !showAdded && (isPending || submitting === 'append'));

  useEffect(() => {
    if (!needsPrepRotate) {
      setPreparingMessageIndex(0);
      return;
    }
    setPreparingMessageIndex(0);
    const id = window.setInterval(() => {
      setPreparingMessageIndex(
        i => (i + 1) % AUDIO_PREPARING_INLINE_MESSAGES.length,
      );
    }, AUDIO_PREPARING_INLINE_ROTATE_MS);
    return () => window.clearInterval(id);
  }, [needsPrepRotate]);

  // Mobile-first icon size; CSS class below shrinks Lucide's inline
  // width/height attributes back down on `sm:` and up so desktop keeps
  // the original compact look while mobile gets a 44px+ tap target.
  const iconPx = size === 'md' ? 22 : 20;
  const iconSizeClass =
    size === 'md'
      ? 'sm:w-[18px] sm:h-[18px]'
      : 'sm:w-[14px] sm:h-[14px]';

  const showSignUp = useCallback(() => {
    toast('Sign up free to listen to articles', {
      action: { label: 'Sign up', onClick: () => router.push(loginUrl) },
      duration: 5000,
      id: 'guest-locked',
    });
  }, [loginUrl, router]);

  const applyResult = useCallback(
    (result: Awaited<ReturnType<typeof playAll.queueArticle>>, action: ActionKind) => {
      switch (result.status) {
        // Inline label handles these — no toast needed.
        case 'started':
        case 'queued':
        case 'preparing':
        case 'already_queued':
        case 'now_playing':
          break;

        case 'guest_locked':
          showSignUp();
          break;

        case 'requires_premium':
          // For "play now" the bottom player itself shows the Premium upsell
          // (mode === 'requires_premium'), so only queue-adds need a toast.
          if (action === 'append') {
            toast('On-demand audio is a Premium feature', {
              action: { label: 'Upgrade', onClick: () => router.push('/premium') },
              duration: 5000,
              id: 'requires-premium',
            });
          }
          break;

        case 'limit_reached':
          toast.warning("You've reached today's audio limit", {
            action: { label: 'Upgrade', onClick: () => router.push('/premium') },
            duration: 5500,
            id: 'limit-reached',
          });
          break;

        case 'error':
          toast.error(result.message ?? "Couldn't add to queue. Try again.", {
            duration: 4000,
          });
          break;
      }
    },
    [router, showSignUp],
  );

  const runAction = useCallback(
    async (e: React.MouseEvent, action: ActionKind) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isAuthenticated) {
        showSignUp();
        return;
      }
      if (submitting || isPending) return;
      setSubmitting(action);
      setLastAction(action);
      
      if (action === 'append') {
        setShowAdded(true);
        if (showAddedTimer.current) clearTimeout(showAddedTimer.current);
        showAddedTimer.current = setTimeout(() => setShowAdded(false), 2500);
      }
      
      try {
        const result = await playAll.queueArticle(article, { action });
        applyResult(result, action);
      } finally {
        setSubmitting(null);
      }
    },
    [applyResult, article, isAuthenticated, isPending, playAll, showSignUp, submitting],
  );

  const playButtonClick = useCallback(
    (e: React.MouseEvent) => {
      if (isPlayingThis) {
        e.preventDefault();
        e.stopPropagation();
        playAll.togglePlayback();
        return;
      }
      if (isPausedThis) {
        e.preventDefault();
        e.stopPropagation();
        playAll.togglePlayback();
        return;
      }
      void runAction(e, 'play_now');
    },
    [isPlayingThis, isPausedThis, playAll, runAction],
  );

  const queueButtonClick = useCallback(
    (e: React.MouseEvent) => {
      if (isQueued) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      void runAction(e, 'append');
    },
    [isQueued, runAction],
  );

  // Per-button visual: each can independently render idle, waveform, check,
  // or spinner so the user sees the result of their tap immediately.
  const playSpinning = isPending && lastAction === 'play_now';
  const queueSpinning = isPending && lastAction === 'append' && !showAdded;

  let playContent: React.ReactNode;
  let playLabel: string;
  let playColor: string;
  if (isPlayingThis) {
    playContent = <NowPlayingWave responsiveSize={size} />;
    playLabel = 'Playing this article';
    playColor = 'text-primary';
  } else if (playSpinning || submitting === 'play_now') {
    playContent = <PrepareSpinner responsiveSize={size} />;
    playLabel = 'Preparing audio';
    playColor = 'text-primary';
  } else {
    playContent = (
      <Play
        size={iconPx}
        className={iconSizeClass}
        fill="currentColor"
        strokeWidth={0}
      />
    );
    playLabel = isPausedThis ? 'Resume' : (playAll.isSessionActive ? 'Play now' : 'Play this article');
    playColor = isPausedThis ? 'text-primary' : 'text-ui-muted-foreground/55 hover:text-primary';
  }

  let queueContent: React.ReactNode;
  let queueLabel: string;
  let queueColor: string;
  if (showAdded || isQueued) {
    queueContent = <ListChecks size={iconPx} className={iconSizeClass} />;
    queueLabel = 'In your queue';
    queueColor = 'text-primary/85';
  } else if (queueSpinning || (submitting === 'append' && !showAdded)) {
    queueContent = <PrepareSpinner responsiveSize={size} />;
    queueLabel = 'Preparing audio';
    queueColor = 'text-primary';
  } else {
    queueContent = <ListPlus size={iconPx} className={iconSizeClass} />;
    queueLabel = 'Add to queue';
    queueColor = 'text-ui-muted-foreground/55 hover:text-primary';
  }

  // Only surface "Add to queue" while audio is actively playing/loading.
  // While this article is the current track, queueing is a no-op so we hide it.
  const isAudioActive = playAll.isPlaying || playAll.mode === 'loading' || playAll.mode === 'awaiting_next';
  const showQueueButton = isAudioActive && !isCurrentTrack;

  // Inline status label — shows immediately on state change, right next to
  // the icons the user just tapped.
  let statusLabel: string | null = null;
  if (isPlayingThis) statusLabel = 'Playing';
  else if (showAdded) statusLabel = 'Added to queue';
  else if (needsPrepRotate) statusLabel = AUDIO_PREPARING_INLINE_MESSAGES[preparingMessageIndex];
  else if (isQueued) statusLabel = 'In queue';

  const compactStatusLabel =
    statusLabel === 'Added to queue' ? 'Queued'
      : needsPrepRotate ? 'Preparing'
        : statusLabel;

  // iOS spec: fixed 34×30px headline action targets (Play / Translate match).
  const baseBtn =
    'flex-shrink-0 inline-flex items-center justify-center w-[34px] h-[30px] p-0 bg-transparent border-none cursor-pointer transition-colors duration-150 rounded-md';

  const containerClass = isColumn
    ? `inline-flex flex-col items-center shrink-0 ${className}`
    : layout === 'mobile-column'
      ? `inline-flex flex-col items-center shrink-0 sm:flex-row ${className}`
      : `inline-flex items-center shrink-0 ${className}`;

  return (
    <span className={containerClass}>
      {statusLabel && !isColumn && (
        <span
          key={statusLabel}
          className={`text-label-sm font-medium text-primary animate-fadeIn ${
            layout === 'mobile-column'
              ? 'max-w-[48px] text-center leading-[1.1] sm:max-w-none sm:whitespace-nowrap sm:text-left'
              : 'whitespace-nowrap'
          }`}
        >
          {compactStatusLabel}
        </span>
      )}
      <button
        type="button"
        onClick={playButtonClick}
        disabled={!!submitting}
        title={playLabel}
        aria-label={playLabel}
        className={cn(
          baseBtn,
          playColor,
          submitting === 'play_now' ? 'opacity-70' : '',
          isColumn && 'transition-transform duration-300 ease-out',
        )}
      >
        {playContent}
      </button>
      {isColumn ? (
        // Always mounted so height can animate open/closed; siblings re-center
        // in the fixed column as this slot grows or shrinks.
        <span
          className={cn(
            'flex w-[34px] shrink-0 items-center justify-center overflow-hidden',
            'transition-[height,opacity,transform] duration-300 ease-out',
            showQueueButton
              ? 'h-[30px] opacity-100 scale-100'
              : 'h-0 opacity-0 scale-90 pointer-events-none',
          )}
          aria-hidden={!showQueueButton}
        >
          <button
            type="button"
            onClick={queueButtonClick}
            disabled={!showQueueButton || !!submitting}
            tabIndex={showQueueButton ? 0 : -1}
            title={queueLabel}
            aria-label={queueLabel}
            className={cn(baseBtn, queueColor, submitting === 'append' ? 'opacity-70' : '')}
          >
            {queueContent}
          </button>
        </span>
      ) : (
        showQueueButton && (
          <button
            type="button"
            onClick={queueButtonClick}
            disabled={!!submitting}
            title={queueLabel}
            aria-label={queueLabel}
            className={cn(
              baseBtn,
              queueColor,
              submitting === 'append' ? 'opacity-70' : '',
              'animate-in fade-in slide-in-from-right-2 duration-300',
            )}
          >
            {queueContent}
          </button>
        )
      )}
    </span>
  );
}

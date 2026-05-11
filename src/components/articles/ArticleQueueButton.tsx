'use client';

/**
 * Per-card audio actions: a tight two-button cluster that sits beside the
 * translate icon in the metadata row. **Play now** starts (or jumps ahead
 * to) this article; **Add to queue** appends to the end of the running
 * queue. Each button reflects its own per-state visual (idle, waveform,
 * spinner, queued check) so the user can see exactly what's happening.
 *
 * Inline status labels ("Playing", "Getting ready…", "In queue") replace
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
import type { Article } from '@/types/article';

type ButtonSize = 'sm' | 'md';

interface ArticleQueueButtonProps {
  article: Article;
  size?: ButtonSize;
  className?: string;
}

function NowPlayingWave({ size }: { size: number }) {
  const barW = Math.max(2, Math.round(size * 0.16));
  return (
    <span
      className="inline-flex items-end justify-center gap-[2px]"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span className="bg-current rounded-full animate-audioWave" style={{ width: barW, height: '40%', animationDelay: '0ms' }} />
      <span className="bg-current rounded-full animate-audioWave" style={{ width: barW, height: '70%', animationDelay: '160ms' }} />
      <span className="bg-current rounded-full animate-audioWave" style={{ width: barW, height: '55%', animationDelay: '320ms' }} />
    </span>
  );
}

function PrepareSpinner({ size }: { size: number }) {
  const ring = Math.max(2, Math.round(size * 0.14));
  return (
    <span
      className="inline-block rounded-full animate-spin"
      style={{
        width: size,
        height: size,
        borderWidth: ring,
        borderStyle: 'solid',
        borderColor: 'currentColor',
        borderTopColor: 'transparent',
      }}
      aria-hidden
    />
  );
}

type ActionKind = 'play_now' | 'append';

export default function ArticleQueueButton({ article, size = 'sm', className = '' }: ArticleQueueButtonProps) {
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

  const iconPx = size === 'md' ? 18 : 14;

  const showSignUp = useCallback(() => {
    toast('Sign up free to listen to articles', {
      action: { label: 'Sign up', onClick: () => router.push(loginUrl) },
      duration: 5000,
      id: 'guest-locked',
    });
  }, [loginUrl, router]);

  const applyResult = useCallback(
    (result: Awaited<ReturnType<typeof playAll.queueArticle>>) => {
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
          toast('On-demand audio is a Premium feature', {
            action: { label: 'Upgrade', onClick: () => router.push('/premium') },
            duration: 5000,
            id: 'requires-premium',
          });
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
        applyResult(result);
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
    playContent = <NowPlayingWave size={iconPx} />;
    playLabel = 'Playing this article';
    playColor = 'text-primary';
  } else if (playSpinning || submitting === 'play_now') {
    playContent = <PrepareSpinner size={iconPx} />;
    playLabel = 'Preparing audio';
    playColor = 'text-primary';
  } else {
    playContent = <Play size={iconPx} fill="currentColor" />;
    playLabel = isPausedThis ? 'Resume' : (playAll.isSessionActive ? 'Play now' : 'Play this article');
    playColor = isPausedThis ? 'text-primary' : 'text-text-secondary/55 hover:text-primary';
  }

  let queueContent: React.ReactNode;
  let queueLabel: string;
  let queueColor: string;
  if (showAdded || isQueued) {
    queueContent = <ListChecks size={iconPx} />;
    queueLabel = 'In your queue';
    queueColor = 'text-primary/85';
  } else if (queueSpinning || (submitting === 'append' && !showAdded)) {
    queueContent = <PrepareSpinner size={iconPx} />;
    queueLabel = 'Preparing audio';
    queueColor = 'text-primary';
  } else {
    queueContent = <ListPlus size={iconPx} />;
    queueLabel = 'Add to queue';
    queueColor = 'text-text-secondary/55 hover:text-primary';
  }

  // Only surface "Add to queue" once a Play All session is actually live;
  // otherwise the only useful action is ▶ Play. While this article is the
  // current track, queueing is a no-op so we hide it as well.
  const showQueueButton = playAll.isSessionActive && !isCurrentTrack;

  // Inline status label — shows immediately on state change, right next to
  // the icons the user just tapped.
  let statusLabel: string | null = null;
  if (isPlayingThis) statusLabel = 'Playing';
  else if ((isPending || submitting === 'play_now') && lastAction === 'play_now') statusLabel = 'Getting ready…';
  else if (showAdded) statusLabel = 'Added to queue';
  else if (isQueued) statusLabel = 'In queue';

  const baseBtn = 'flex-shrink-0 inline-flex items-center justify-center bg-transparent border-none cursor-pointer transition-colors duration-150 p-2 rounded-md';

  return (
    <span className={`inline-flex items-center shrink-0 ${className}`}>
      {statusLabel && (
        <span key={statusLabel} className="text-[10px] font-medium text-primary animate-fadeIn whitespace-nowrap">
          {statusLabel}
        </span>
      )}
      <button
        type="button"
        onClick={playButtonClick}
        disabled={!!submitting}
        title={playLabel}
        aria-label={playLabel}
        className={`${baseBtn} ${playColor} ${submitting === 'play_now' ? 'opacity-70' : ''}`}
      >
        {playContent}
      </button>
      {showQueueButton && (
        <button
          type="button"
          onClick={queueButtonClick}
          disabled={!!submitting}
          title={queueLabel}
          aria-label={queueLabel}
          className={`${baseBtn} ${queueColor} ${submitting === 'append' ? 'opacity-70' : ''}`}
        >
          {queueContent}
        </button>
      )}
    </span>
  );
}

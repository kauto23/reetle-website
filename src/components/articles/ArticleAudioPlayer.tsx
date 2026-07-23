'use client';

/**
 * Inline audio module for an article. This module never plays audio itself —
 * all playback happens in the global bottom player (PlayAllAudioContext).
 * States:
 *
 * - `unavailable`: we do not have a `contentId` yet (still loading content) –
 *   we render a disabled placeholder so the layout is stable.
 * - `ready`: either the summary says `audio_generated` or our local state is
 *   already `ready`. Shows a Listen button; tapping it hands the article to
 *   the bottom player via `queueArticle('play_now')`.
 * - `not_requested`: no audio exists and the user hasn't asked for one. Shows
 *   a Prepare button. Tapping it fires POST + starts polling; the module then
 *   flips to `preparing` with rotating microcopy while the user keeps reading.
 * - `preparing`: polling in progress; staged progress bar that never stops.
 *   When audio arrives the bar sprints to 100% and playback starts in the
 *   bottom player automatically.
 * - `failed` with `quotaExceeded`: free-tier daily audio limit reached. Shows
 *   an Upgrade CTA consistent with the rest of the article UI.
 * - `failed` otherwise: retry affordance.
 * - When this article is the current bottom-player track (or pending
 *   playback), the module renders nothing — one player only.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Check, ChevronDown, Headphones, Play } from 'lucide-react';
import { useAudioStatus } from '@/contexts/AudioStatusContext';
import { usePlayAllAudio } from '@/contexts/PlayAllAudioContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { AUDIO_PREPARING_DETAIL_MESSAGES } from '@/lib/audioPreparingMessages';
import type { Article } from '@/types/article';
import { Button } from '@/components/ui/button';

const MESSAGE_ROTATE_INTERVAL_MS = 5000;

/**
 * Staged fill targets for the preparing bar. Deliberately non-linear so it
 * reads like real work. Each entry is a target the bar *eases toward* over
 * the whole gap since the previous step (strong ease-out), so motion never
 * fully stops: it leaps toward each target, then decelerates into a crawl
 * until the next target kicks in.
 */
const PREPARE_PROGRESS_STEPS: Array<{ atMs: number; pct: number }> = [
  { atMs: 1200, pct: 14 },
  { atMs: 2600, pct: 28 },
  { atMs: 4400, pct: 42 },
  { atMs: 6600, pct: 54 },
  { atMs: 9400, pct: 64 },
  { atMs: 13000, pct: 72 },
  { atMs: 18000, pct: 79 },
  { atMs: 25000, pct: 85 },
  { atMs: 34000, pct: 89 },
  { atMs: 45000, pct: 92 },
];

/** After the last step, keep creeping toward this for a very long time. */
const PREPARE_TAIL = { pct: 97.5, durationMs: 90000 };

/** How long the final sprint to 100% is shown before playback starts. */
const PREPARE_FINISH_MS = 450;

/** How long the "Ready — playing below" confirmation is held before collapse. */
const PREPARE_READY_HOLD_MS = 1200;

/** Duration of the collapse (height + fade) that removes the box. */
const PREPARE_COLLAPSE_MS = 320;

/**
 * Hand-off choreography once audio arrives:
 * `sprint` — bar races to 100%; `ready` — title morphs to a confirmation
 * pointing at the bottom player (which starts now); `collapsing` — the box
 * eases closed so the article text reflows smoothly instead of jumping.
 */
type FinishPhase = 'idle' | 'sprint' | 'ready' | 'collapsing';

/** Ease-out: fast start, long deceleration — keeps the bar visibly moving. */
const PREPARE_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';

interface ProgressTarget {
  pct: number;
  durationMs: number;
}

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

interface ArticleAudioPlayerProps {
  article: Article;
  /** From the content response. `null` while the article body is still loading. */
  contentId: string | null;
}

export default function ArticleAudioPlayer({ article, contentId }: ArticleAudioPlayerProps) {
  const articleId = article.articleId;
  const summaryAudioAvailable = article.audioGenerated;

  const { getEntry, prepareAudio, resetAudio } = useAudioStatus();
  const playAll = usePlayAllAudio();
  const { isPremium, dailyUsage } = useSubscription();

  const entry = getEntry(articleId);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [progressTarget, setProgressTarget] = useState<ProgressTarget>({ pct: 0, durationMs: 0 });
  // Keeps the preparing UI mounted while the ready hand-off plays out.
  const [finishPhase, setFinishPhase] = useState<FinishPhase>('idle');
  const wasPreparingRef = useRef(false);

  useEffect(() => {
    if (entry?.status !== 'preparing') {
      setMessageIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % AUDIO_PREPARING_DETAIL_MESSAGES.length);
    }, MESSAGE_ROTATE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [entry?.status]);

  // Drive the staged progress bar while preparing. Each timeout retargets
  // the bar at the *next* milestone with a transition covering the whole gap,
  // so the bar is always mid-transition and never parks.
  useEffect(() => {
    if (entry?.status !== 'preparing') return;

    setProgressTarget({ pct: 0, durationMs: 0 });
    const timeouts: Array<ReturnType<typeof setTimeout>> = [];

    // Small delay so the 0% width paints first and the transition animates.
    timeouts.push(setTimeout(() => {
      setProgressTarget({ pct: PREPARE_PROGRESS_STEPS[0].pct, durationMs: PREPARE_PROGRESS_STEPS[0].atMs });
    }, 60));

    for (let i = 1; i < PREPARE_PROGRESS_STEPS.length; i++) {
      const prev = PREPARE_PROGRESS_STEPS[i - 1];
      const step = PREPARE_PROGRESS_STEPS[i];
      timeouts.push(setTimeout(() => {
        setProgressTarget({ pct: step.pct, durationMs: step.atMs - prev.atMs });
      }, prev.atMs));
    }

    const last = PREPARE_PROGRESS_STEPS[PREPARE_PROGRESS_STEPS.length - 1];
    timeouts.push(setTimeout(() => {
      setProgressTarget({ pct: PREPARE_TAIL.pct, durationMs: PREPARE_TAIL.durationMs });
    }, last.atMs));

    return () => timeouts.forEach(clearTimeout);
  }, [entry?.status]);

  // When polling flips preparing → ready, sprint the bar to 100%, then hand
  // the article to the bottom player and start playback there.
  useEffect(() => {
    const status = entry?.status;
    if (status === 'preparing') {
      wasPreparingRef.current = true;
      return;
    }
    if (wasPreparingRef.current && status === 'ready') {
      wasPreparingRef.current = false;
      setFinishPhase('sprint');
      setProgressTarget({ pct: 100, durationMs: PREPARE_FINISH_MS });
      const timeouts: Array<ReturnType<typeof setTimeout>> = [];
      // Bar full → confirmation morph + playback starts in the bottom player.
      timeouts.push(setTimeout(() => {
        setFinishPhase('ready');
        void playAll.queueArticle(article, { action: 'play_now' });
      }, PREPARE_FINISH_MS));
      // Hold the confirmation, then ease the box closed.
      timeouts.push(setTimeout(() => {
        setFinishPhase('collapsing');
      }, PREPARE_FINISH_MS + PREPARE_READY_HOLD_MS));
      timeouts.push(setTimeout(() => {
        setFinishPhase('idle');
      }, PREPARE_FINISH_MS + PREPARE_READY_HOLD_MS + PREPARE_COLLAPSE_MS));
      return () => timeouts.forEach(clearTimeout);
    }
    if (wasPreparingRef.current && status === 'failed') {
      // Preparation failed: release the silent keep-alive audio session that
      // was primed on the Prepare tap.
      playAll.releasePrimedSession();
    }
    wasPreparingRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.status]);

  // If the user navigates away mid-preparation the ready→autoplay handoff
  // above can no longer run, so stop the primed silent loop rather than
  // leaving it running invisibly.
  useEffect(() => {
    return () => {
      if (wasPreparingRef.current) {
        playAll.releasePrimedSession();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const status = entry?.status ?? 'not_requested';
  const quotaExceeded = status === 'failed' && entry?.quotaExceeded === true;
  const errorMessage = status === 'failed' ? entry?.error ?? 'Something went wrong.' : null;

  // Free users: surface remaining listens. `dailyUsage.audio` is present only
  // for authenticated users; we keep the module visible for guests of the
  // future but guard behind `dailyUsage` so no UI breaks.
  const audioUsage = dailyUsage?.audio;
  const audioRemaining = audioUsage ? Math.max(audioUsage.limit - audioUsage.used, 0) : null;
  const freeTierExhausted = !isPremium && audioRemaining !== null && audioRemaining <= 0;

  // If the summary says audio is ready but we have no local entry yet, treat
  // it as ready so we show a Listen button without preemptively fetching the
  // signed URL (which would consume a listen).
  const effectiveReady = status === 'ready' || (status === 'not_requested' && summaryAudioAvailable);

  const isCurrentTrack = playAll.isCurrentArticleInPlayAll(articleId);
  const isPendingPlayback = playAll.pendingPlayback?.articleId === articleId;

  const handlePrepare = useCallback(() => {
    if (!contentId) return;
    if (freeTierExhausted) return;
    // Keep the browser's autoplay permission alive across the generation
    // wait so playback can start in the bottom player without another tap.
    playAll.primeAudioSession();
    void prepareAudio(articleId, contentId);
  }, [articleId, contentId, freeTierExhausted, playAll, prepareAudio]);

  const handleListen = useCallback(async () => {
    if (!contentId) return;
    if (freeTierExhausted) return;

    setFetchError(null);
    setIsStarting(true);
    try {
      const result = await playAll.queueArticle(article, { action: 'play_now' });
      switch (result.status) {
        case 'limit_reached':
          toast.warning("You've reached today's audio limit", {
            duration: 5500,
            id: 'limit-reached',
          });
          break;
        case 'error':
          setFetchError(result.message ?? 'We could not start playback. Please try again.');
          break;
        default:
          break;
      }
    } finally {
      setIsStarting(false);
    }
  }, [article, contentId, freeTierExhausted, playAll]);

  const handleRetry = useCallback(() => {
    setFetchError(null);
    resetAudio(articleId);
  }, [articleId, resetAudio]);

  // ── Rendering ────────────────────────────────────────────────────────────

  const wrapperClass = 'mb-md rounded-md border border-border bg-ui-card px-[14px] py-[12px]';

  const showPreparing = status === 'preparing' || finishPhase !== 'idle';

  // The bottom player is the single playback surface. When it owns this
  // article (playing, paused, or about to start), the inline module gets out
  // of the way entirely — except while the ready hand-off is still showing.
  if ((isCurrentTrack || isPendingPlayback) && !showPreparing) {
    return null;
  }

  if (!contentId) {
    return (
      <div className={`${wrapperClass} flex items-center gap-[10px] opacity-70`}>
        <div className="w-[36px] h-[36px] rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <Headphones size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-body-md font-medium text-primary">Audio</div>
          <div className="text-label-md text-ui-muted-foreground">Loading article…</div>
        </div>
      </div>
    );
  }

  if (quotaExceeded || freeTierExhausted) {
    return (
      <div className={`${wrapperClass} flex items-start gap-[12px]`}>
        <div className="w-[36px] h-[36px] rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <Headphones size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-body-md font-medium text-primary mb-[2px]">
            You&apos;ve reached today&apos;s audio limit
          </div>
          <div className="text-label-md text-ui-muted-foreground mb-[8px]">
            {entry?.error || 'Upgrade to Premium for unlimited listens, or come back tomorrow.'}
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
      </div>
    );
  }

  if (showPreparing) {
    const message = AUDIO_PREPARING_DETAIL_MESSAGES[messageIndex];
    const isConfirming = finishPhase === 'ready' || finishPhase === 'collapsing';
    const isCollapsing = finishPhase === 'collapsing';
    return (
      // Grid-rows collapse: 1fr → 0fr animates the box closed without
      // measuring heights, so the article text reflows instead of jumping.
      <div
        style={{
          display: 'grid',
          gridTemplateRows: isCollapsing ? '0fr' : '1fr',
          opacity: isCollapsing ? 0 : 1,
          transition: `grid-template-rows ${PREPARE_COLLAPSE_MS}ms ease, opacity ${PREPARE_COLLAPSE_MS}ms ease`,
        }}
        aria-hidden={isCollapsing}
      >
        <div className="min-h-0 overflow-hidden">
          <div className={`${wrapperClass} flex items-start gap-[12px]`}>
            <div className="w-[36px] h-[36px] rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
              {isConfirming ? (
                <Check size={18} strokeWidth={2.5} className="animate-fadeIn" />
              ) : (
                <WaveSpinner />
              )}
            </div>
            <div className="flex-1 min-w-0">
              {isConfirming ? (
                <div key="ready-title" className="flex items-center gap-[4px] text-body-md font-medium text-primary mb-[2px] animate-fadeIn">
                  Ready — playing below
                  <ChevronDown size={16} strokeWidth={2.25} className="translate-y-[1px]" />
                </div>
              ) : (
                <div key="preparing-title" className="text-body-md font-medium text-primary mb-[2px]">
                  Preparing audio…
                </div>
              )}
              {isConfirming ? (
                <div key="ready-detail" className="text-label-md text-ui-muted-foreground leading-[1.5] animate-fadeIn">
                  Your audio has started in the player at the bottom of the screen.
                </div>
              ) : (
                <div
                  key={messageIndex}
                  className="text-label-md text-ui-muted-foreground leading-[1.5] animate-fadeIn"
                >
                  {message}
                </div>
              )}
              <div className="mt-[8px] w-full h-[3px] bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{
                    width: `${progressTarget.pct}%`,
                    transitionProperty: 'width',
                    transitionDuration: `${progressTarget.durationMs}ms`,
                    transitionTimingFunction: finishPhase !== 'idle' ? 'ease-out' : PREPARE_EASING,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'failed' && !quotaExceeded) {
    return (
      <div className={`${wrapperClass} flex items-start gap-[12px]`}>
        <div className="w-[36px] h-[36px] rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <Headphones size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-body-md font-medium text-primary mb-[2px]">Audio unavailable</div>
          <div className="text-label-md text-ui-muted-foreground mb-[8px]">
            {errorMessage}
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center gap-[6px] text-body-sm font-medium text-primary-light hover:text-primary transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10" />
              <path d="M20.49 15a9 9 0 01-14.85 3.36L1 14" />
            </svg>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (effectiveReady) {
    return (
      <div className={wrapperClass}>
        <div className="flex items-center gap-[12px]">
          <div className="w-[36px] h-[36px] rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Headphones size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-body-md font-medium text-primary">Listen to this article</div>
          </div>
          <Button
            type="button"
            variant="default"
            size="sm"
            className="rounded-sm px-[14px] py-2 h-auto inline-flex items-center gap-[6px] disabled:opacity-60"
            onClick={handleListen}
            disabled={isStarting}
          >
            {isStarting ? (
              <>
                <span className="inline-block w-[12px] h-[12px] border-2 border-white/50 border-t-white rounded-full animate-spin" />
                Loading…
              </>
            ) : (
              <>
                <Play size={14} fill="currentColor" strokeWidth={0} />
                Listen
              </>
            )}
          </Button>
        </div>
        {fetchError && (
          <div className="mt-[8px] text-body-sm text-red-600">{fetchError}</div>
        )}
      </div>
    );
  }

  // status === 'not_requested' and summary says no audio yet → prepare CTA.
  return (
    <div className={`${wrapperClass} flex items-center gap-[12px]`}>
      <div className="w-[36px] h-[36px] rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
        <Headphones size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-body-md font-medium text-primary">Listen to this article</div>
        <div className="text-label-md text-ui-muted-foreground">
          Preparation should take no more than 10 seconds.
        </div>
      </div>
      <Button
        type="button"
        variant="default"
        size="sm"
        className="rounded-sm px-[14px] py-2 h-auto inline-flex items-center gap-[6px]"
        onClick={handlePrepare}
      >
        <Headphones size={14} />
        Prepare audio
      </Button>
    </div>
  );
}

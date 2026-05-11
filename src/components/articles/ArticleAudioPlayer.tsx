'use client';

/**
 * Inline audio module for an article. States:
 *
 * - `unavailable`: we do not have a `contentId` yet (still loading content) –
 *   we render a disabled placeholder so the layout is stable.
 * - `ready`: either the summary says `audio_generated` or our local state is
 *   already `ready`. Shows a Listen button; on tap we fetch (or reuse) a
 *   signed URL and start native playback.
 * - `not_requested`: no audio exists and the user hasn't asked for one. Shows
 *   a Prepare button. Tapping it fires POST + starts polling; the module then
 *   flips to `preparing` with rotating microcopy while the user keeps reading.
 * - `preparing`: polling in progress.
 * - `failed` with `quotaExceeded`: free-tier daily audio limit reached. Shows
 *   an Upgrade CTA consistent with the rest of the article UI.
 * - `failed` otherwise: retry affordance.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Headphones, Play, Pause, RotateCcw, RotateCw, X } from 'lucide-react';
import { useAudioStatus } from '@/contexts/AudioStatusContext';
import { usePlayAllAudio } from '@/contexts/PlayAllAudioContext';
import { useSubscription } from '@/contexts/SubscriptionContext';

const AUDIO_PREPARING_MESSAGES = [
  'We’re preparing the audio for this article.',
  'Recording the article at a pace suited to your level.',
  'Adjusting the pacing to match your level.',
  'Tuning the audio to the right level for you.',
  'Preparing narration with pacing suited to this article.',
  'Getting the audio ready at a pace appropriate for you.',
  'Tailoring the narration to your language level.',
  'Fine-tuning pronunciation and pacing for your level.',
  'Almost ready. You can keep reading while we finish it.',
  'Adding the final touches to your audio.',
];

const MESSAGE_ROTATE_INTERVAL_MS = 5000;

interface ArticleAudioPlayerProps {
  articleId: string;
  /** From the content response. `null` while the article body is still loading. */
  contentId: string | null;
  /** Summary-level flag from the articles API; seeds the initial ready state. */
  summaryAudioAvailable: boolean;
  /**
   * When true, parent layouts may pin the player (e.g. sticky under the header).
   * Fires for single-article playback and Play All while audio is actively playing.
   */
  onPlaybackStickyChange?: (sticky: boolean) => void;
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

function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
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

export default function ArticleAudioPlayer({
  articleId,
  contentId,
  summaryAudioAvailable,
  onPlaybackStickyChange,
}: ArticleAudioPlayerProps) {
  const { getEntry, prepareAudio, fetchPlaybackUrl, resetAudio } = useAudioStatus();
  const playAll = usePlayAllAudio();
  const { isPremium, dailyUsage } = useSubscription();

  const entry = getEntry(articleId);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(entry?.signedUrl ?? null);
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [messageIndex, setMessageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Keep local playback URL in sync with the cached signed URL whenever the
  // context updates it (e.g. polling transitioned to ready).
  useEffect(() => {
    if (entry?.signedUrl && entry.signedUrl !== playbackUrl) {
      setPlaybackUrl(entry.signedUrl);
    }
  }, [entry?.signedUrl, playbackUrl]);

  useEffect(() => {
    if (entry?.status !== 'preparing') {
      setMessageIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % AUDIO_PREPARING_MESSAGES.length);
    }, MESSAGE_ROTATE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [entry?.status]);

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

  const isPlayAllTrack = playAll.isCurrentArticleInPlayAll(articleId);
  const shouldStickWhilePlaying = isPlayAllTrack
    ? playAll.isPlaying
    : Boolean(playbackUrl && isPlaying);

  useEffect(() => {
    onPlaybackStickyChange?.(shouldStickWhilePlaying);
    return () => {
      onPlaybackStickyChange?.(false);
    };
  }, [shouldStickWhilePlaying, onPlaybackStickyChange]);

  const handlePrepare = useCallback(() => {
    if (!contentId) return;
    if (freeTierExhausted) return;
    void prepareAudio(articleId, contentId);
  }, [articleId, contentId, freeTierExhausted, prepareAudio]);

  const handleListen = useCallback(async () => {
    if (!contentId) return;
    if (freeTierExhausted) return;

    setFetchError(null);

    // Reuse a cached signed URL without hitting the API again.
    if (playbackUrl && entry?.signedUrl === playbackUrl) {
      audioRef.current?.play().catch(() => {/* autoplay blocked; user can press play on the native control */});
      return;
    }

    setIsFetchingUrl(true);
    try {
      const url = await fetchPlaybackUrl(articleId, contentId);
      setPlaybackUrl(url);
      // Next tick: ensure <audio> has mounted with the new src before play.
      setTimeout(() => {
        audioRef.current?.play().catch(() => {/* user-gesture required on some browsers */});
      }, 0);
    } catch {
      // `fetchPlaybackUrl` will have flipped the entry to `preparing` on 202,
      // or to `failed`/`quotaExceeded` on error. Nothing extra to do here
      // beyond showing a retry hint if we aren't already in a known state.
      if (entry?.status !== 'preparing' && entry?.status !== 'failed') {
        setFetchError('We could not start playback. Please try again.');
      }
    } finally {
      setIsFetchingUrl(false);
    }
  }, [articleId, contentId, entry?.signedUrl, entry?.status, fetchPlaybackUrl, freeTierExhausted, playbackUrl]);

  const handleRetry = useCallback(() => {
    setFetchError(null);
    resetAudio(articleId);
  }, [articleId, resetAudio]);

  const handleTogglePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      audio.play().catch(() => {
        setFetchError('We could not start playback. Please try again.');
      });
    } else {
      audio.pause();
    }
  }, []);

  const handleSkip = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    const nextTime = Math.min(Math.max(audio.currentTime + seconds, 0), duration || audio.duration || 0);
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  }, [duration]);

  const handleSeek = useCallback((value: string) => {
    const nextTime = Number(value);
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(nextTime)) return;

    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  }, []);

  // ── Rendering ────────────────────────────────────────────────────────────

  const wrapperClass = 'mb-0 rounded-md border border-border bg-white px-[14px] py-[12px]';

  if (isPlayAllTrack) {
    const t = playAll.currentTime;
    const d = playAll.duration;
    const loading = playAll.mode === 'loading' || playAll.mode === 'awaiting_next';
    return (
      <div className={wrapperClass}>
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
        <div className="flex items-center gap-[10px] min-h-[44px]">
            <AnimatedSkipButton
              direction="backward"
              onClick={() => playAll.seek(Math.max(0, t - 10))}
              disabled={loading || !d}
              className="w-[36px] h-[36px] rounded-full flex items-center justify-center text-primary hover:bg-primary/10 transition-colors shrink-0 disabled:opacity-40"
              aria-label="Rewind 10 seconds"
            />
          <button
            type="button"
            onClick={() => { playAll.togglePlayback(); }}
            disabled={playAll.mode === 'limit_reached' || loading}
            className="w-[42px] h-[42px] rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-dark transition-colors shrink-0 disabled:opacity-50"
            aria-label={playAll.isPlaying ? 'Pause article audio' : 'Play article audio'}
          >
            {loading ? (
              <span className="inline-block w-[14px] h-[14px] border-2 border-white/50 border-t-white rounded-full animate-spin" />
            ) : playAll.isPlaying ? (
              <Pause size={18} fill="currentColor" />
            ) : (
              <Play size={18} fill="currentColor" className="translate-x-[1px]" />
            )}
          </button>
            <AnimatedSkipButton
              direction="forward"
              onClick={() => playAll.seek(d > 0 ? Math.min(t + 10, d) : t + 10)}
              disabled={loading || !d}
              className="w-[36px] h-[36px] rounded-full flex items-center justify-center text-primary hover:bg-primary/10 transition-colors shrink-0 disabled:opacity-40"
              aria-label="Forward 10 seconds"
            />
          <div className="flex-1 min-w-0 flex items-center gap-[10px]">
            <span className="text-[12px] tabular-nums text-text-secondary whitespace-nowrap min-w-[36px]">
              {formatAudioTime(t)}
            </span>
            <input
              type="range"
              min="0"
              max={d || 0}
              step="0.1"
              value={Math.min(t, d || t || 0)}
              onChange={(e) => playAll.seek(Number(e.target.value))}
              disabled={!d}
              className="w-full h-[4px] cursor-pointer disabled:cursor-not-allowed"
              style={{ accentColor: '#4A2462' }}
              aria-label="Audio playback position"
            />
            <span className="text-[12px] tabular-nums text-text-secondary whitespace-nowrap min-w-[36px] text-right">
              {formatAudioTime(d)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (!contentId) {
    return (
      <div className={`${wrapperClass} flex items-center gap-[10px] opacity-70`}>
        <div className="w-[36px] h-[36px] rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <Headphones size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-medium text-primary">Audio</div>
          <div className="text-[12px] text-text-secondary">Loading article…</div>
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
          <div className="text-[14px] font-medium text-primary mb-[2px]">
            You&apos;ve reached today&apos;s audio limit
          </div>
          <div className="text-[12px] text-text-secondary mb-[8px]">
            {entry?.error || 'Upgrade to Premium for unlimited listens, or come back tomorrow.'}
          </div>
          <Link
            href="/premium"
            className="inline-flex items-center gap-[6px] text-[13px] font-medium text-primary-light hover:text-primary transition-colors"
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

  if (status === 'preparing') {
    const message = AUDIO_PREPARING_MESSAGES[messageIndex];
    return (
      <div className={`${wrapperClass} flex items-start gap-[12px]`}>
        <div className="w-[36px] h-[36px] rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <WaveSpinner />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-medium text-primary mb-[2px]">
            Preparing audio…
          </div>
          <div
            key={messageIndex}
            className="text-[12px] text-text-secondary leading-[1.5] animate-fadeIn"
          >
            {message}
          </div>
          <div className="mt-[8px] w-full h-[3px] bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full w-0 bg-primary rounded-full origin-left animate-audioPrepareProgress" />
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
          <div className="text-[14px] font-medium text-primary mb-[2px]">Audio unavailable</div>
          <div className="text-[12px] text-text-secondary mb-[8px]">
            {errorMessage}
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center gap-[6px] text-[13px] font-medium text-primary-light hover:text-primary transition-colors"
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
        {playbackUrl ? (
          <div className="flex items-center gap-[10px] min-h-[44px]">
            <audio
              ref={audioRef}
              src={playbackUrl}
              preload="metadata"
              className="hidden"
              aria-label="Article audio"
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            />
            <AnimatedSkipButton
              direction="backward"
              onClick={() => handleSkip(-10)}
              className="w-[36px] h-[36px] rounded-full flex items-center justify-center text-primary hover:bg-primary/10 transition-colors shrink-0"
              aria-label="Rewind 10 seconds"
            />
            <button
              type="button"
              onClick={handleTogglePlayback}
              className="w-[42px] h-[42px] rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-dark transition-colors shrink-0"
              aria-label={isPlaying ? 'Pause article audio' : 'Play article audio'}
            >
              {isPlaying ? (
                <Pause size={18} fill="currentColor" />
              ) : (
                <Play size={18} fill="currentColor" className="translate-x-[1px]" />
              )}
            </button>
            <AnimatedSkipButton
              direction="forward"
              onClick={() => handleSkip(10)}
              className="w-[36px] h-[36px] rounded-full flex items-center justify-center text-primary hover:bg-primary/10 transition-colors shrink-0"
              aria-label="Forward 10 seconds"
            />
            <div className="flex-1 min-w-0 flex items-center gap-[10px]">
              <span className="text-[12px] tabular-nums text-text-secondary whitespace-nowrap min-w-[36px]">
                {formatAudioTime(currentTime)}
              </span>
              <input
                type="range"
                min="0"
                max={duration || 0}
                step="0.1"
                value={Math.min(currentTime, duration || currentTime || 0)}
                onChange={(e) => handleSeek(e.target.value)}
                className="w-full h-[4px] cursor-pointer"
                style={{ accentColor: '#4A2462' }}
                aria-label="Audio playback position"
              />
              <span className="text-[12px] tabular-nums text-text-secondary whitespace-nowrap min-w-[36px] text-right">
                {formatAudioTime(duration)}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-[12px]">
            <div className="w-[36px] h-[36px] rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Headphones size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-medium text-primary">Listen to this article</div>
              {!isPremium && audioRemaining !== null && (
                <div className="text-[12px] text-text-secondary">
                  {audioRemaining === 1
                    ? '1 listen remaining today'
                    : `${audioRemaining} of ${audioUsage?.limit} listens remaining today`}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleListen}
              disabled={isFetchingUrl}
              className="btn-primary text-[13px] px-[14px] py-[8px] inline-flex items-center gap-[6px] disabled:opacity-60"
            >
              {isFetchingUrl ? (
                <>
                  <span className="inline-block w-[12px] h-[12px] border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  Loading…
                </>
              ) : (
                <>
                  <Play size={14} fill="currentColor" />
                  Listen
                </>
              )}
            </button>
          </div>
        )}
        {fetchError && (
          <div className="mt-[8px] text-[12px] text-red-600">{fetchError}</div>
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
        <div className="text-[14px] font-medium text-primary">Listen to this article</div>
        <div className="text-[12px] text-text-secondary">
          Audio isn&apos;t recorded yet. Preparation should take no more than 10 seconds.
        </div>
      </div>
      <button
        type="button"
        onClick={handlePrepare}
        className="btn-primary text-[13px] px-[14px] py-[8px] inline-flex items-center gap-[6px]"
      >
        <Headphones size={14} />
        Prepare audio
      </button>
    </div>
  );
}

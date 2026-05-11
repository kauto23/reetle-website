'use client';

/**
 * App-wide Play All audio session. The hidden `<audio>` element lives here so
 * playback survives navigation to `/?article=...`. The home `PlayAllAudio`
 * module and `ArticleAudioPlayer` read this context to drive or mirror
 * transport controls and progress.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useAudioStatus, type AudioEntry } from '@/contexts/AudioStatusContext';
import { useArticles } from '@/contexts/ArticlesContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import {
  getArticleContent,
  generateArticleAudio,
  FreeTierQuotaError,
  RateLimitError,
  TokenExpiredError,
} from '@/services/api';
import type { Article } from '@/types/article';

export type PlayAllMode =
  | 'guest_locked'
  | 'idle'
  | 'empty'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'awaiting_next'
  | 'finished'
  | 'limit_reached'
  | 'error';

export type QueueItemSource = 'user' | 'autoplay';

export interface QueueItem {
  articleId: string;
  contentId: string;
  headline: string;
  topic: string;
  createdAt: string | null;
  imageUrl: string | null;
  /** Whether the user explicitly queued this item or the feed auto-filled it. */
  source: QueueItemSource;
}

export interface PreparingNextInfo {
  articleId: string;
  headline: string;
  status: 'resolving_content' | 'generating';
}

/**
 * Outcome of a user-initiated queue action (tap "Play" or "Add to queue"
 * on a card). The button surfaces a toast based on this result so the
 * user always gets confirmation that their tap did something, plus
 * context-appropriate calls to action when an action is blocked
 * (sign-up for guests, upgrade for free users without audio access).
 */
export type QueueActionResult =
  | { status: 'started' }
  | { status: 'queued'; position: number; total: number }
  | { status: 'preparing'; willPlay: boolean }
  | { status: 'already_queued'; position: number }
  | { status: 'now_playing' }
  | { status: 'guest_locked' }
  | { status: 'requires_premium' }
  | { status: 'limit_reached' }
  | { status: 'error'; message?: string };

interface PendingAdd {
  article: Article;
  /** How to integrate this article once `AudioStatusContext` reports `ready`. */
  intent: 'append' | 'start_session' | 'append_idle' | 'play_now';
}

export interface PlayAllAudioValue {
  mode: PlayAllMode;
  queue: QueueItem[];
  currentIndex: number;
  current: QueueItem | null;
  upNextCount: number;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  preparingNext: PreparingNextInfo | null;
  errorMessage: string | null;
  limitReached: boolean;
  start: (articles?: Article[]) => void;
  togglePlayback: () => void;
  next: () => void;
  previous: () => void;
  stop: () => void;
  seek: (seconds: number) => void;
  /**
   * True when the given article is the current Play All track and the session
   * is actively playing or paused (or loading/awaiting next segment).
   */
  isCurrentArticleInPlayAll: (articleId: string | null | undefined) => boolean;
  /** True if the article is the current track or is still up-next (index >= currentIndex). Already-played items return false. */
  isArticleInQueue: (articleId: string | null | undefined) => boolean;
  /** True if the article is up-next AND was explicitly added by the user (source === 'user'). */
  isArticleUserQueued: (articleId: string | null | undefined) => boolean;
  /** Remove an upcoming (not currently-playing) item from the queue by articleId. */
  removeFromQueue: (articleId: string) => void;
  /** Move an upcoming queue item from one absolute index to another. Both must be > currentIndex. */
  reorderQueue: (fromAbsIdx: number, toAbsIdx: number) => void;
  /** Jump to and play a specific queue item by its absolute index. */
  jumpToQueue: (index: number) => void;
  /** True while we are generating audio for a user-requested queue add. */
  isArticlePending: (articleId: string | null | undefined) => boolean;
  /** True when a Play All session is currently active (anywhere from loading → finished playback). */
  isSessionActive: boolean;
  /**
   * Add an article to the playlist or jump the queue. Use `action`:
   * `"append"` — end of queue (or build a paused queue when idle); `"play_now"`
   * — play immediately (idle: start session with this first; active: next up).
   */
  queueArticle: (article: Article, options?: { action: 'append' | 'play_now' }) => Promise<QueueActionResult>;
  /** Heard-only-on-end articles for this session; used to skip on resume. */
  listenedArticleIds: ReadonlySet<string>;
  /** `start()` can play at least one article not in `listenedArticleIds`. */
  canResumePlayAll: boolean;
}

const PlayAllAudioContext = createContext<PlayAllAudioValue | null>(null);

const SESSION_LISTENED_KEY = 'reetle-play-all-listened-ids';

function loadListenedFromSession(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = sessionStorage.getItem(SESSION_LISTENED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === 'string' && x.length > 0));
  } catch {
    return new Set();
  }
}

function saveListenedToSession(ids: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SESSION_LISTENED_KEY, JSON.stringify(Array.from(ids)));
  } catch { /* full */ }
}

const RECENCY_WINDOWS_MS = [
  60 * 60 * 1000,
  3 * 60 * 60 * 1000,
  24 * 60 * 60 * 1000,
  Number.POSITIVE_INFINITY,
];

/**
 * Target number of ready tracks to keep queued ahead of the currently
 * playing one. Modelled after the "Up Next" slot in podcast/music players:
 * as soon as the buffer dips below this, we kick off generation for the
 * next candidate so it's ready well before the user reaches it. With a
 * target of 2 and typical article durations, the next-track audio is
 * effectively always primed long before TTS generation could complete.
 */
const READY_AHEAD_TARGET = 2;

function compareNewestFirst(a: Article, b: Article): number {
  const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  if (tb !== ta) return tb - ta;
  return a.articleId.localeCompare(b.articleId);
}

function buildReadyQueue(articles: Article[]): QueueItem[] {
  const readyArticles = articles.filter(
    a => a.audioGenerated && a.contentId && a.contentId.length > 0
  );
  if (readyArticles.length === 0) return [];

  const now = Date.now();
  const sorted = [...readyArticles].sort(compareNewestFirst);

  for (const windowMs of RECENCY_WINDOWS_MS) {
    const subset = sorted.filter(a => {
      if (!a.createdAt) return windowMs === Number.POSITIVE_INFINITY;
      const ageMs = now - new Date(a.createdAt).getTime();
      return ageMs <= windowMs;
    });
    if (subset.length >= 3 || windowMs === Number.POSITIVE_INFINITY) {
      return subset.map(a => toQueueItem(a));
    }
  }
  return sorted.map(a => toQueueItem(a));
}

function toQueueItem(article: Article, source: QueueItemSource = 'autoplay'): QueueItem {
  return {
    articleId: article.articleId,
    contentId: article.contentId as string,
    headline: article.headline,
    topic: article.topic,
    createdAt: article.createdAt,
    imageUrl: article.imageLinks[0] ?? null,
    source,
  };
}

/** Insert `item` immediately after the current track, removing any other queue entry with the same article id. */
function insertPlayNext(queueItems: QueueItem[], currentIndex: number, item: QueueItem): { next: QueueItem[]; playIndex: number } {
  const playingId = queueItems[currentIndex]?.articleId;
  const without = queueItems.filter(q => q.articleId !== item.articleId);
  let curIdx = playingId ? without.findIndex(q => q.articleId === playingId) : -1;
  if (curIdx < 0) {
    curIdx = Math.max(0, Math.min(currentIndex, Math.max(0, without.length - 1)));
  }
  const insertAt = curIdx + 1;
  const next = [...without.slice(0, insertAt), item, ...without.slice(insertAt)];
  return { next, playIndex: insertAt };
}

/**
 * Stable identity for the audio resource loaded into the `<audio>` element.
 * We compare against the current queue item to detect the "stale src" race
 * where auto-advance assigned a new src but the element kept playing the
 * previous track (Safari/iOS sometimes need an explicit `load()` to swap
 * the buffer; autoplay rejection can also leave the element in an unclear
 * state).
 */
function itemKey(item: { articleId: string; contentId: string }): string {
  return `${item.articleId}::${item.contentId}`;
}

/**
 * Tiny looped silent track played between articles while we wait for the
 * next one to be generated. The `<audio>` element must keep "actively
 * playing" something for browsers to treat the eventual `src` swap to the
 * real next track as a continuation of the user's original Play All
 * gesture; otherwise autoplay policy blocks `play()` and the user has to
 * tap Play to continue. Generated with ffmpeg as 1s of silence and looped.
 */
const SILENCE_AUDIO_SRC = '/audio/silence.mp3';
const TRANSITION_AUDIO_SRC = '/audio/transition.mp3';
const DEFAULT_MEDIA_ARTWORK = '/images/reetle_facebook_cover.png';

function resolveMediaArtwork(imageUrl: string | null): MediaImage[] {
  const src = imageUrl && imageUrl.length > 0 ? imageUrl : DEFAULT_MEDIA_ARTWORK;
  return [{ src }];
}

function setMediaSessionAction(action: MediaSessionAction, handler: MediaSessionActionHandler | null) {
  try {
    navigator.mediaSession.setActionHandler(action, handler);
  } catch {
    // Some WebKit versions expose Media Session but not every action.
  }
}

function findGenerationCandidate(
  articles: Article[],
  excludeIds: Set<string>
): { article: Article; needsContent: boolean } | null {
  const sorted = [...articles].sort(compareNewestFirst);
  const preferred = sorted.find(
    a => !a.audioGenerated && a.contentGenerated && a.contentId && !excludeIds.has(a.articleId)
  );
  if (preferred) return { article: preferred, needsContent: false };
  const fallback = sorted.find(a => !a.audioGenerated && !excludeIds.has(a.articleId));
  if (fallback) {
    return { article: fallback, needsContent: !fallback.contentGenerated || !fallback.contentId };
  }
  return null;
}

function usePlayAllQueueState(): PlayAllAudioValue & { bindAudio: (el: HTMLAudioElement | null) => void } {
  const { isAuthenticated, user } = useAuth();
  const { isPremium, dailyUsage } = useSubscription();
  const { articlesData } = useArticles();
  const { fetchPlaybackUrl, prepareAudio, getEntry } = useAudioStatus();

  const [mode, setMode] = useState<PlayAllMode>(() => (isAuthenticated ? 'idle' : 'guest_locked'));
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [preparingNext, setPreparingNext] = useState<PreparingNextInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [listenedIds, setListenedIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    return loadListenedFromSession();
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const queueRef = useRef(queue);
  const indexRef = useRef(currentIndex);
  const modeRef = useRef(mode);
  const preparingNextRef = useRef(preparingNext);
  const generationStartedRef = useRef(false);
  const sourceArticlesRef = useRef<Article[]>([]);
  // Tracks which queue item is currently loaded into the `<audio>` element.
  // Used by `togglePlayback` to recover from auto-advance failures where the
  // shown headline and the audio buffer have drifted out of sync.
  const loadedItemKeyRef = useRef<string | null>(null);
  // Articles the user explicitly asked to queue but whose audio is still
  // being generated. Indexed by articleId. The pending-effect below watches
  // these and appends them to the queue (and optionally starts playback)
  // once their audio entry transitions to `ready`.
  const [pendingAdds, setPendingAdds] = useState<Map<string, PendingAdd>>(() => new Map());
  const pendingAddsRef = useRef(pendingAdds);
  pendingAddsRef.current = pendingAdds;
  // True when the `<audio>` element is currently looping the silent buffer
  // used to bridge the gap between articles. Native audio events (play /
  // pause / timeupdate) are ignored while this is true so the UI stays in
  // its `awaiting_next` state instead of flipping to `playing` for silence.
  const isPlayingSilenceRef = useRef(false);
  const isPlayingTransitionRef = useRef(false);
  // URL pre-fetched for the article that should play after the current
  // transition jingle finishes. Populated in `playTransition` and read
  // synchronously in the `ended` handler so the swap to the next track
  // can happen inside the same tick (autoplay permission stays alive).
  const prefetchedNextUrlRef = useRef<{ articleId: string; contentId: string; url: string } | null>(null);

  // Tracks the user's learning preferences so we can detect mid-session
  // changes (level/language) made on the profile page. The signature is
  // hashed into a single string so React effect equality is cheap. We
  // initialise to `null` on the first run so the effect can no-op
  // until the very first pref snapshot is captured (otherwise every
  // sign-in would look like a "language change" and clear the queue).
  const userPrefSignatureRef = useRef<string | null>(null);
  // Set to true when a level change arrives while a track is actively
  // playing. The `ended` and `pause` handlers consume this flag to
  // perform the deferred queue reset without interrupting the user
  // mid-sentence. See the pref-change effect below for the full
  // rationale.
  const pendingPrefResetRef = useRef(false);

  // Track the current route so the queue's auto-advance behaviour can
  // adapt to where the user is. We only autoplay the next article when
  // the user is on the home screen list (where the Play All UI lives)
  // or when the page is hidden (mobile lock screen / background tab,
  // i.e. the user is interacting with the audio session via OS controls
  // rather than a foreground tab). The article detail view is rendered
  // at `/?article=<id>` so we explicitly exclude that case even though
  // the pathname is still `/`.
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isOnHomeListRef = useRef(false);
  isOnHomeListRef.current = pathname === '/' && !searchParams?.get('article');

  const shouldAutoplayNextRef = useRef(() => false);
  shouldAutoplayNextRef.current = () => {
    if (typeof document === 'undefined') return false;
    // Lock screen / background tab — always keep the queue moving.
    if (document.visibilityState === 'hidden') {
      return true;
    }
    // iOS WebKit sometimes leaves visibility as "visible" while the device is
    // locked or Safari is backgrounded; the document usually loses focus then.
    // Without this, we would incorrectly take the "pause after transition"
    // path meant for foreground article reading on /?article=….
    try {
      if (typeof document.hasFocus === 'function' && !document.hasFocus()) {
        return true;
      }
    } catch {
      // ignore
    }
    return isOnHomeListRef.current;
  };

  queueRef.current = queue;
  indexRef.current = currentIndex;
  modeRef.current = mode;
  preparingNextRef.current = preparingNext;

  const addListened = useCallback((articleId: string) => {
    setListenedIds(prev => {
      if (prev.has(articleId)) return prev;
      const next = new Set(prev);
      next.add(articleId);
      saveListenedToSession(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setMode('guest_locked');
      setQueue([]);
      setCurrentIndex(0);
      setIsPlaying(false);
      setPreparingNext(null);
      generationStartedRef.current = false;
      setListenedIds(new Set());
      // The pref signature must reset alongside auth state, otherwise
      // signing back in with the same prefs would look like a "change"
      // to the next effect run and falsely trigger a queue reset.
      userPrefSignatureRef.current = null;
      pendingPrefResetRef.current = false;
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.removeItem(SESSION_LISTENED_KEY);
        } catch { /* */ }
      }
      return;
    }
    setMode(prev => (prev === 'guest_locked' ? 'idle' : prev));
  }, [isAuthenticated]);

  const stopAudioElement = useCallback(() => {
    loadedItemKeyRef.current = null;
    isPlayingSilenceRef.current = false;
    isPlayingTransitionRef.current = false;
    const el = audioRef.current;
    if (!el) return;
    try {
      el.loop = false;
      el.pause();
      el.removeAttribute('src');
      el.load();
    } catch {
      // ignore
    }
  }, []);

  /**
   * Start looping silent audio in the main `<audio>` element. This is the
   * bridge that keeps the audio session "active" between articles while the
   * next track is being generated, so when we eventually swap `src` to the
   * real next track the browser does not require a fresh user gesture.
   *
   * Called from `handleEnded` when the queue is exhausted but a generation
   * is in flight. Safe to call repeatedly – it no-ops if silence is
   * already playing.
   */
  const playSilence = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlayingSilenceRef.current) return;
    isPlayingSilenceRef.current = true;
    isPlayingTransitionRef.current = false;
    try { el.pause(); } catch { /* ignore */ }
    el.loop = true;
    el.src = SILENCE_AUDIO_SRC;
    try { el.load(); } catch { /* ignore */ }
    el.play().catch(() => {
      // If even silence can't play, the audio session is gone. Nothing we
      // can do without a user gesture; togglePlayback's recovery path will
      // restart the next track when the user taps play.
      isPlayingSilenceRef.current = false;
    });
  }, []);

  /**
   * Swap the `<audio>` element to the next track and start playback.
   *
   * We pause + `load()` after assigning `src` because some browsers
   * (notably WebKit) keep the previously-decoded buffer when `src` is
   * reassigned mid-session, which can cause the element to keep playing the
   * old track even though `src` points at the new URL. Calling `load()`
   * forces the resource selection algorithm to pick up the new source.
   *
   * If `play()` is rejected (typically autoplay policy on auto-advance
   * after audio ended), we flip the mode to `paused` instead of leaving it
   * stuck on the optimistic `playing` state. That way the UI shows a Play
   * button and `togglePlayback` (a real user gesture) can resume cleanly.
   */
  const setSourceAndPlay = useCallback((url: string, item: QueueItem, autoplay = true) => {
    const el = audioRef.current;
    if (!el) return;
    // Clear the silence-bridge state before swapping in the real track.
    // The element keeps its "actively playing" status across this swap,
    // which is what allows `play()` to succeed without a fresh gesture.
    isPlayingSilenceRef.current = false;
    isPlayingTransitionRef.current = false;
    el.loop = false;
    try { el.pause(); } catch { /* ignore */ }
    el.src = url;
    try { el.load(); } catch { /* ignore */ }
    loadedItemKeyRef.current = itemKey(item);
    if (autoplay) {
      el.play().catch(() => {
        setIsPlaying(false);
        if (modeRef.current !== 'limit_reached' && modeRef.current !== 'error') {
          setMode('paused');
        }
      });
    } else {
      setIsPlaying(false);
      if (modeRef.current !== 'limit_reached' && modeRef.current !== 'error') {
        setMode('paused');
      }
    }
  }, []);

  const playItemAt = useCallback(
    async (index: number, opts: { playFromGesture?: boolean; autoplay?: boolean } = {}) => {
      const items = queueRef.current;
      if (index < 0 || index >= items.length) return;
      const item = items[index];
      const autoplay = opts.autoplay !== false;

      setCurrentIndex(index);
      setMode('loading');
      setErrorMessage(null);
      setCurrentTime(0);
      setDuration(0);

      try {
        const url = await fetchPlaybackUrl(item.articleId, item.contentId);
        if (indexRef.current !== index) return;
        // Mode flips to `playing` from the audio element's `play` event
        // handler (or to `paused` if autoplay is blocked) so the UI stays
        // consistent with what the audio element is actually doing.
        setSourceAndPlay(url, item, autoplay);
      } catch (err) {
        if (indexRef.current !== index) return;
        if (err instanceof FreeTierQuotaError) {
          setMode('limit_reached');
          stopAudioElement();
          generationStartedRef.current = true;
          return;
        }
        if (err instanceof TokenExpiredError) {
          setMode('error');
          setErrorMessage('Please sign in again to keep listening.');
          return;
        }
        if (err instanceof RateLimitError) {
          setMode('error');
          setErrorMessage('Too many requests. Try again in a moment.');
          return;
        }
        if (index + 1 < items.length) {
          void playItemAt(index + 1, opts);
          return;
        }
        setMode('finished');
      }
    },
    [fetchPlaybackUrl, setSourceAndPlay, stopAudioElement]
  );

  const playTransition = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlayingTransitionRef.current) return;
    isPlayingTransitionRef.current = true;
    isPlayingSilenceRef.current = false;
    try { el.pause(); } catch { /* ignore */ }
    el.loop = false;
    el.src = TRANSITION_AUDIO_SRC;
    try { el.load(); } catch { /* ignore */ }

    // Pre-fetch the next article's playback URL while the jingle plays.
    // We store the resolved URL in a ref so the `ended` handler can do a
    // synchronous swap inside the same tick, which is what preserves
    // autoplay permission across the transition. If the fetch hasn't
    // completed by the time the jingle ends, we fall back to a silence
    // bridge to keep the audio session active until the URL arrives.
    prefetchedNextUrlRef.current = null;
    const idx = indexRef.current;
    const items = queueRef.current;
    if (idx + 1 < items.length) {
      const nextItem = items[idx + 1];
      fetchPlaybackUrl(nextItem.articleId, nextItem.contentId)
        .then(url => {
          // Only adopt the prefetch if the queue position hasn't moved
          // and the same item is still up next.
          const stillRelevant =
            indexRef.current === idx && queueRef.current[idx + 1]?.articleId === nextItem.articleId;
          if (stillRelevant) {
            prefetchedNextUrlRef.current = {
              articleId: nextItem.articleId,
              contentId: nextItem.contentId,
              url,
            };
          }
        })
        .catch(() => {
          // Errors will surface (and be handled) when playItemAt runs for
          // real after the jingle. Nothing to do here.
        });
    }

    el.play().catch(() => {
      isPlayingTransitionRef.current = false;
      const idx = indexRef.current;
      const items = queueRef.current;
      if (idx + 1 < items.length) {
        void playItemAt(idx + 1);
      } else if (preparingNextRef.current) {
        setMode('awaiting_next');
        playSilence();
      } else {
        setMode('finished');
      }
    });
  }, [fetchPlaybackUrl, playItemAt, playSilence]);

  const start = useCallback((sourceArticles?: Article[]) => {
    if (!isAuthenticated) {
      setMode('guest_locked');
      return;
    }
    const articles = sourceArticles ?? articlesData?.articles ?? [];
    const base = buildReadyQueue(articles);
    if (base.length === 0) {
      setQueue([]);
      sourceArticlesRef.current = articles;
      setMode('empty');
      return;
    }
    const built = base.filter(q => !listenedIds.has(q.articleId));
    if (built.length === 0) {
      setQueue([]);
      sourceArticlesRef.current = articles;
      setMode('finished');
      return;
    }
    setQueue(built);
    sourceArticlesRef.current = articles;
    setCurrentIndex(0);
    generationStartedRef.current = false;
    setPreparingNext(null);
    setErrorMessage(null);
    queueRef.current = built;
    indexRef.current = 0;
    void playItemAt(0, { playFromGesture: true });
  }, [articlesData, isAuthenticated, listenedIds, playItemAt]);

  const togglePlayback = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (modeRef.current === 'limit_reached') return;

    // Recover from a stale-src race: if auto-advance updated the displayed
    // headline but the audio element is still loaded with the previous
    // track's data (autoplay was rejected, or the buffer didn't swap),
    // re-run the playback flow so the user always hears the article they
    // see. This call happens inside a real user gesture, so `play()` will
    // not be blocked.
    const items = queueRef.current;
    const idx = indexRef.current;
    const currentItem = idx >= 0 && idx < items.length ? items[idx] : null;
    if (currentItem && loadedItemKeyRef.current !== itemKey(currentItem)) {
      void playItemAt(idx);
      return;
    }

    if (el.paused) {
      el.play().catch(() => setIsPlaying(false));
    } else {
      el.pause();
    }
  }, [playItemAt]);

  const next = useCallback(() => {
    const items = queueRef.current;
    const idx = indexRef.current;
    if (idx + 1 >= items.length) return;
    void playItemAt(idx + 1);
  }, [playItemAt]);

  const previous = useCallback(() => {
    const idx = indexRef.current;
    if (idx <= 0) {
      const el = audioRef.current;
      if (el) el.currentTime = 0;
      return;
    }
    void playItemAt(idx - 1);
  }, [playItemAt]);

  const stop = useCallback(() => {
    stopAudioElement();
    setIsPlaying(false);
    setQueue([]);
    setCurrentIndex(0);
    setPreparingNext(null);
    setPendingAdds(new Map());
    setMode('idle');
    generationStartedRef.current = false;
  }, [stopAudioElement]);

  /**
   * Tear the session down to a clean idle state. Used by the pref-change
   * effect (and the `ended`/`pause` handlers when a deferred reset is
   * pending) so the user's queue, prepared-but-not-yet-queued audio, and
   * generation state never carry stale level/language assumptions across
   * a preference change.
   *
   * Listened-IDs are cleared too: the new content set is effectively a
   * fresh feed for the user, and we don't want previously-heard articles
   * (which now reference different content rows) to silently filter the
   * resumed queue.
   */
  const clearSessionForPrefChange = useCallback(() => {
    stopAudioElement();
    setIsPlaying(false);
    setQueue([]);
    setCurrentIndex(0);
    setPreparingNext(null);
    setPendingAdds(new Map());
    setMode('idle');
    generationStartedRef.current = false;
    pendingPrefResetRef.current = false;
    setListenedIds(new Set());
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(SESSION_LISTENED_KEY);
      } catch { /* */ }
    }
  }, [stopAudioElement]);

  /**
   * Watches the authenticated user's learning preferences (target
   * language + CEFR level) and reconciles the live audio session with
   * any change saved elsewhere in the app (typically Profile).
   *
   * Why this matters: every queue item carries a `contentId` resolved
   * for the user's prefs at the moment it was added. The audio endpoint
   * is keyed only by `contentId`, so without this effect a user who
   * switches B2 → A1 would keep hearing B2 narrations from the queue
   * that was built before the change.
   *
   * Behaviour by current mode:
   * - **Language change** (any mode): tear the session down immediately.
   *   Switching language is a hard context shift; continuing to play a
   *   track in the previous language is almost certainly wrong.
   * - **Level change while idle / paused / loading / awaiting_next /
   *   finished / empty / error**: clear immediately. The user is not
   *   actively listening, so there's nothing to interrupt.
   * - **Level change while `playing`**: defer the reset until the
   *   current track ends (or the user pauses). Cutting off a sentence
   *   the user is currently following is jarring and they already paid
   *   the listen cost. We trim everything queued *after* the current
   *   track right away so up-next entries from the old level disappear,
   *   and stop replenishing so no new old-level candidates get prepared.
   *
   * The first run captures a baseline signature without taking any
   * action so an initial prefs snapshot is not mistaken for a change.
   */
  useEffect(() => {
    if (!isAuthenticated) return;

    const signature = `${user?.targetLanguage ?? ''}::${user?.cefrLevel ?? ''}`;
    const previous = userPrefSignatureRef.current;
    userPrefSignatureRef.current = signature;
    if (previous === null || previous === signature) return;

    const [prevLang] = previous.split('::');
    const [nextLang] = signature.split('::');
    const languageChanged = prevLang !== nextLang;

    if (languageChanged) {
      clearSessionForPrefChange();
      return;
    }

    const m = modeRef.current;
    const activelyPlaying = m === 'playing' || m === 'loading' || m === 'awaiting_next';

    if (activelyPlaying) {
      pendingPrefResetRef.current = true;
      setPreparingNext(null);
      generationStartedRef.current = false;
      const idx = indexRef.current;
      const items = queueRef.current;
      if (items.length > idx + 1) {
        const trimmed = items.slice(0, idx + 1);
        queueRef.current = trimmed;
        setQueue(trimmed);
      }
      setPendingAdds(new Map());
      return;
    }

    clearSessionForPrefChange();
  }, [isAuthenticated, user?.targetLanguage, user?.cefrLevel, clearSessionForPrefChange]);

  const seek = useCallback((seconds: number) => {
    const el = audioRef.current;
    if (!el || !Number.isFinite(seconds)) return;
    el.currentTime = Math.max(0, Math.min(seconds, el.duration || seconds));
    setCurrentTime(el.currentTime);
  }, []);

  /** True when there is an active Play All session the user is engaged with. */
  const isSessionActive = mode === 'playing'
    || mode === 'paused'
    || mode === 'loading'
    || mode === 'awaiting_next';

  const isArticleInQueue = useCallback(
    (articleId: string | null | undefined) => {
      if (!articleId) return false;
      // Only count items at or after the current index — past items have been played.
      return queue.some((q, i) => q.articleId === articleId && i >= indexRef.current);
    },
    [queue],
  );

  const isArticleUserQueued = useCallback(
    (articleId: string | null | undefined) => {
      if (!articleId) return false;
      return queue.some((q, i) => q.articleId === articleId && i >= indexRef.current && q.source === 'user');
    },
    [queue],
  );

  const isArticlePending = useCallback(
    (articleId: string | null | undefined) => {
      if (!articleId) return false;
      return pendingAdds.has(articleId);
    },
    [pendingAdds],
  );

  const removeFromQueue = useCallback((articleId: string) => {
    const items = queueRef.current;
    const idx = items.findIndex(q => q.articleId === articleId);
    // Nothing to do if not found, or if it's the currently-playing item.
    if (idx < 0 || idx === indexRef.current) return;
    const next = items.filter((_, i) => i !== idx);
    queueRef.current = next;
    setQueue(next);
    // Keep currentIndex pointing at the same item if we removed something before it.
    if (idx < indexRef.current) {
      const newIdx = indexRef.current - 1;
      indexRef.current = newIdx;
      setCurrentIndex(newIdx);
    }
  }, []);

  const reorderQueue = useCallback((fromAbsIdx: number, toAbsIdx: number) => {
    const items = queueRef.current;
    const currentIdx = indexRef.current;
    // Only allow reordering items strictly ahead of the currently playing one.
    if (fromAbsIdx <= currentIdx || toAbsIdx <= currentIdx) return;
    if (fromAbsIdx === toAbsIdx) return;
    if (fromAbsIdx < 0 || fromAbsIdx >= items.length) return;
    if (toAbsIdx < 0 || toAbsIdx >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(fromAbsIdx, 1);
    next.splice(toAbsIdx, 0, moved);
    queueRef.current = next;
    setQueue(next);
  }, []);

  const jumpToQueue = useCallback(
    (idx: number) => {
      void playItemAt(idx, { playFromGesture: true });
    },
    [playItemAt],
  );

  /**
   * Build a `QueueItem` from an article that already has audio generated.
   * Returns null if the article is missing the prerequisites (no contentId
   * or audio not yet generated) and therefore can't be queued directly.
   */
  const queueItemFromReadyArticle = (article: Article, source: QueueItemSource = 'user'): QueueItem | null => {
    if (!article.audioGenerated || !article.contentId) return null;
    return {
      articleId: article.articleId,
      contentId: article.contentId,
      headline: article.headline,
      topic: article.topic,
      createdAt: article.createdAt,
      imageUrl: article.imageLinks[0] ?? null,
      source,
    };
  };

  /**
   * The user's primary entry point from a card. Use `options.action`:
   * `"play_now"` — start or jump ahead to this article; `"append"` — add to
   * the end (or build a paused queue when nothing is playing).
   */
  const queueArticle = useCallback(
    async (article: Article, options?: { action: 'append' | 'play_now' }): Promise<QueueActionResult> => {
      const action = options?.action ?? 'play_now';
      if (!isAuthenticated) {
        return { status: 'guest_locked' };
      }

      if (!article || !article.articleId) {
        return { status: 'error', message: 'Invalid article.' };
      }

      const articleId = article.articleId;

      const currentItem = queueRef.current[indexRef.current] ?? null;
      const isCurrent = currentItem?.articleId === articleId
        && (modeRef.current === 'playing'
          || modeRef.current === 'paused'
          || modeRef.current === 'loading'
          || modeRef.current === 'awaiting_next');
      if (isCurrent) return { status: 'now_playing' };

      // Capture the user gesture immediately for playback actions so the
      // async URL fetch (or generation) doesn't cause the gesture token to
      // expire in Safari.
      if (action === 'play_now') {
        playSilence();
      }

      const sessionActive = modeRef.current === 'playing'
        || modeRef.current === 'paused'
        || modeRef.current === 'loading'
        || modeRef.current === 'awaiting_next';

      if (action === 'append') {
        const existingIdx = queueRef.current.findIndex(q => q.articleId === articleId);
        if (existingIdx >= 0) {
          // If it's already in the queue, but it's an autoplay item, we should upgrade its source to 'user'
          // and move it to the end of the user queue (or just upgrade it in place if it's already ahead of us).
          // For simplicity, if it's already in the queue, we'll just upgrade its source to 'user' and let it play where it is.
          const positionAhead = Math.max(0, existingIdx - indexRef.current);
          const currentItem = queueRef.current[existingIdx];
          if (currentItem && currentItem.source === 'autoplay') {
            const nextQueue = [...queueRef.current];
            nextQueue[existingIdx] = { ...currentItem, source: 'user' };
            queueRef.current = nextQueue;
            setQueue(nextQueue);
            return { status: 'queued', position: positionAhead, total: nextQueue.length };
          }
          return { status: 'already_queued', position: positionAhead };
        }
      }

      if (pendingAddsRef.current.has(articleId)) {
        const pending = pendingAddsRef.current.get(articleId);
        const willPlay = pending?.intent === 'start_session' || pending?.intent === 'play_now';
        return { status: 'preparing', willPlay };
      }

      if (!isPremium && modeRef.current === 'limit_reached') {
        if (action === 'play_now') stopAudioElement();
        return { status: 'limit_reached' };
      }
      if (!isPremium && dailyUsage?.audio) {
        const remaining = dailyUsage.audio.limit - dailyUsage.audio.used;
        if (remaining <= 0) {
          if (action === 'play_now') stopAudioElement();
          return { status: 'limit_reached' };
        }
      }

      const readyItem = queueItemFromReadyArticle(article, 'user');
      if (readyItem) {
        if (action === 'play_now') {
          if (sessionActive) {
            const { next, playIndex } = insertPlayNext(queueRef.current, indexRef.current, readyItem);
            setQueue(next);
            queueRef.current = next;
            sourceArticlesRef.current = articlesData?.articles ?? sourceArticlesRef.current;
            setPreparingNext(null);
            setErrorMessage(null);
            generationStartedRef.current = false;
            indexRef.current = playIndex;
            setCurrentIndex(playIndex);
            void playItemAt(playIndex, { playFromGesture: true });
            return { status: 'started' };
          }
          const allArticles = articlesData?.articles ?? [];
          const others = buildReadyQueue(allArticles)
            .filter(q => q.articleId !== readyItem.articleId
              && !listenedIds.has(q.articleId));
          const nextQueue = [readyItem, ...others];
          setQueue(nextQueue);
          sourceArticlesRef.current = allArticles;
          setCurrentIndex(0);
          setPreparingNext(null);
          setErrorMessage(null);
          generationStartedRef.current = false;
          queueRef.current = nextQueue;
          indexRef.current = 0;
          void playItemAt(0, { playFromGesture: true });
          return { status: 'started' };
        }
        if (sessionActive) {
          const nextQueue = [...queueRef.current, readyItem];
          queueRef.current = nextQueue;
          setQueue(nextQueue);
          const positionAhead = nextQueue.length - indexRef.current - 1;
          return { status: 'queued', position: positionAhead, total: nextQueue.length };
        }
        const nextQueue = [readyItem];
        setQueue(nextQueue);
        sourceArticlesRef.current = articlesData?.articles ?? [];
        setCurrentIndex(0);
        setPreparingNext(null);
        setErrorMessage(null);
        generationStartedRef.current = false;
        queueRef.current = nextQueue;
        indexRef.current = 0;
        void playItemAt(0, { autoplay: false });
        return { status: 'queued', position: 0, total: 1 };
      }

      if (!isPremium) {
        if (action === 'play_now') stopAudioElement();
        return { status: 'requires_premium' };
      }

      let intent: PendingAdd['intent'];
      if (action === 'play_now') {
        intent = sessionActive ? 'play_now' : 'start_session';
      } else {
        intent = sessionActive ? 'append' : 'append_idle';
      }

      setPendingAdds(prev => {
        const next = new Map(prev);
        next.set(articleId, { article, intent });
        return next;
      });

      try {
        let resolvedContentId = article.contentId ?? null;
        if (!resolvedContentId || !article.contentGenerated) {
          const result = await getArticleContent(articleId);
          if (!result.contentId) {
            setPendingAdds(prev => {
              const n = new Map(prev);
              n.delete(articleId);
              return n;
            });
            if (action === 'play_now') stopAudioElement();
            return { status: 'error', message: 'Could not fetch article content.' };
          }
          resolvedContentId = result.contentId;
        }
        await prepareAudio(articleId, resolvedContentId);
      } catch (err) {
        setPendingAdds(prev => {
          const n = new Map(prev);
          n.delete(articleId);
          return n;
        });
        if (action === 'play_now') stopAudioElement();
        if (err instanceof FreeTierQuotaError) return { status: 'limit_reached' };
        if (err instanceof TokenExpiredError) return { status: 'guest_locked' };
        if (err instanceof RateLimitError) {
          return { status: 'error', message: 'Too many requests. Try again in a moment.' };
        }
        return { status: 'error', message: 'Could not prepare audio for this article.' };
      }

      const willPlay = intent === 'start_session' || intent === 'play_now';
      return { status: 'preparing', willPlay };
    },
    [
      articlesData,
      dailyUsage,
      isAuthenticated,
      isPremium,
      listenedIds,
      playItemAt,
      prepareAudio,
    ],
  );

  const bindAudio = useCallback((el: HTMLAudioElement | null) => {
    audioRef.current = el;
    setAudioEl(el);
  }, []);

  const tryStartOneAhead = useCallback(async () => {
    if (generationStartedRef.current) return;
    if (!isPremium) return;
    if (modeRef.current === 'limit_reached') return;

    const articles = sourceArticlesRef.current.length > 0
      ? sourceArticlesRef.current
      : articlesData?.articles ?? [];
    const exclude = new Set(queueRef.current.map(q => q.articleId));
    const candidate = findGenerationCandidate(articles, exclude);
    if (!candidate) return;

    generationStartedRef.current = true;
    const { article, needsContent } = candidate;

    setPreparingNext({
      articleId: article.articleId,
      headline: article.headline,
      status: needsContent ? 'resolving_content' : 'generating',
    });

    let resolvedContentId = article.contentId;

    try {
      if (needsContent) {
        const result = await getArticleContent(article.articleId);
        if (!result.contentId) {
          generationStartedRef.current = false;
          setPreparingNext(null);
          return;
        }
        resolvedContentId = result.contentId;
        setPreparingNext({
          articleId: article.articleId,
          headline: article.headline,
          status: 'generating',
        });
      }

      if (!resolvedContentId) {
        generationStartedRef.current = false;
        setPreparingNext(null);
        return;
      }

      await prepareAudio(article.articleId, resolvedContentId);
    } catch (err) {
      if (err instanceof FreeTierQuotaError) {
        setPreparingNext(null);
        return;
      }
      if (err instanceof RateLimitError) {
        try {
          if (resolvedContentId) {
            await generateArticleAudio(resolvedContentId).catch(() => undefined);
          }
        } catch {
          // ignore
        }
        return;
      }
      if (err instanceof TokenExpiredError) {
        setPreparingNext(null);
        return;
      }
      setPreparingNext(null);
      generationStartedRef.current = false;
    }
  }, [articlesData, isPremium, prepareAudio]);

  const inFlightArticleId = preparingNext?.articleId ?? null;
  useEffect(() => {
    if (!inFlightArticleId) return;
    const entry: AudioEntry | undefined = getEntry(inFlightArticleId);
    if (!entry) return;
    if (entry.status === 'ready' && entry.contentId) {
      const articles = articlesData?.articles ?? [];
      const article = articles.find(a => a.articleId === inFlightArticleId);
      if (article) {
        const item: QueueItem = {
          articleId: article.articleId,
          contentId: entry.contentId,
          headline: article.headline,
          topic: article.topic,
          createdAt: article.createdAt,
          imageUrl: article.imageLinks[0] ?? null,
          source: 'autoplay',
        };
        const currentQueue = queueRef.current;
        if (!currentQueue.some(i => i.articleId === item.articleId)) {
          const nextQueue = [...currentQueue, item];
          queueRef.current = nextQueue;
          setQueue(nextQueue);
          if (modeRef.current === 'awaiting_next') {
            void playItemAt(nextQueue.length - 1);
          }
        }
      }
      setPreparingNext(null);
      generationStartedRef.current = false;
    } else if (entry.status === 'failed') {
      setPreparingNext(null);
      generationStartedRef.current = false;
    }
  }, [articlesData, getEntry, inFlightArticleId, playItemAt]);

  /**
   * Watches the audio status entries for any article the user has asked
   * to queue (via `queueArticle`) whose audio is still being generated.
   * When an entry flips to `ready` we append it to the live queue and –
   * for taps that happened on an idle session – kick off playback.
   * Failed generations are quietly cleared so the card UI returns to its
   * default state and the user can try again.
   */
  useEffect(() => {
    if (pendingAdds.size === 0) return;
    let mutated = false;
    const nextPending = new Map(pendingAdds);
    pendingAdds.forEach((pending, articleId) => {
      const entry = getEntry(articleId);
      if (!entry) return;
      if (entry.status === 'ready' && entry.contentId) {
        const item: QueueItem = {
          articleId,
          contentId: entry.contentId,
          headline: pending.article.headline,
          topic: pending.article.topic,
          createdAt: pending.article.createdAt,
          imageUrl: pending.article.imageLinks[0] ?? null,
          source: 'user',
        };
        nextPending.delete(articleId);
        mutated = true;

        if (pending.intent === 'play_now') {
          const { next, playIndex } = insertPlayNext(queueRef.current, indexRef.current, item);
          queueRef.current = next;
          setQueue(next);
          indexRef.current = playIndex;
          setCurrentIndex(playIndex);
          void playItemAt(playIndex, { playFromGesture: true });
        } else if (pending.intent === 'append_idle') {
          const currentQueue = queueRef.current;
          let updatedQueue = currentQueue;
          if (!currentQueue.some(i => i.articleId === item.articleId)) {
            updatedQueue = [...currentQueue, item];
            queueRef.current = updatedQueue;
            setQueue(updatedQueue);
          }
          if (updatedQueue.length === 1) {
            indexRef.current = 0;
            setCurrentIndex(0);
            void playItemAt(0, { autoplay: false });
          }
        } else if (pending.intent === 'append') {
          const currentQueue = queueRef.current;
          let updatedQueue = currentQueue;
          if (!currentQueue.some(i => i.articleId === item.articleId)) {
            updatedQueue = [...currentQueue, item];
            queueRef.current = updatedQueue;
            setQueue(updatedQueue);
          }
          if (modeRef.current === 'awaiting_next') {
            const idx = updatedQueue.findIndex(i => i.articleId === articleId);
            if (idx >= 0) void playItemAt(idx);
          }
        } else if (pending.intent === 'start_session') {
          const currentQueue = queueRef.current;
          let updatedQueue = currentQueue;
          if (!currentQueue.some(i => i.articleId === item.articleId)) {
            updatedQueue = [...currentQueue, item];
            queueRef.current = updatedQueue;
            setQueue(updatedQueue);
          }
          const idx = updatedQueue.findIndex(i => i.articleId === articleId);
          if (idx >= 0) {
            indexRef.current = idx;
            setCurrentIndex(idx);
            void playItemAt(idx, { playFromGesture: true });
          }
        }
      } else if (entry.status === 'failed') {
        nextPending.delete(articleId);
        mutated = true;
      }
    });
    if (mutated) setPendingAdds(nextPending);
  }, [pendingAdds, getEntry, playItemAt]);

  /**
   * Keep the queue topped up like a music app's "Up Next". Whenever the
   * number of tracks ahead of the currently-playing one falls below
   * `READY_AHEAD_TARGET` and no preparation is currently in flight, kick
   * off generation for the next candidate. As soon as it lands the
   * inFlight effect appends it to the queue, this effect re-evaluates,
   * and another generation is started if we're still under target. The
   * net effect is a self-replenishing playlist: by the time the user
   * reaches any given track, the next one is already there.
   */
  useEffect(() => {
    if (!isPremium) return;
    if (mode !== 'playing' && mode !== 'paused' && mode !== 'loading' && mode !== 'awaiting_next') return;
    if (preparingNext) return;
    if (generationStartedRef.current) return;
    const aheadCount = Math.max(0, queue.length - currentIndex - 1);
    if (aheadCount >= READY_AHEAD_TARGET) return;
    void tryStartOneAhead();
  }, [currentIndex, isPremium, mode, preparingNext, queue.length, tryStartOneAhead]);

  useEffect(() => {
    const el = audioEl;
    if (!el) return;

    const handleLoaded = () => {
      if (isPlayingSilenceRef.current || isPlayingTransitionRef.current) return;
      setDuration(Number.isFinite(el.duration) ? el.duration : 0);
    };
    const handleTime = () => {
      if (isPlayingSilenceRef.current || isPlayingTransitionRef.current) return;
      setCurrentTime(el.currentTime);
    };
    const handlePlay = () => {
      if (isPlayingSilenceRef.current || isPlayingTransitionRef.current) return;
      setIsPlaying(true);
      if (modeRef.current !== 'limit_reached') setMode('playing');
    };
    const handlePause = () => {
      if (isPlayingSilenceRef.current || isPlayingTransitionRef.current) return;
      setIsPlaying(false);
      // If a level change came in while this track was playing, the
      // user has now stepped away (paused) — finish the deferred
      // teardown here instead of waiting for `ended`, so the next time
      // they hit Play we don't resume an old-level article.
      if (pendingPrefResetRef.current) {
        clearSessionForPrefChange();
        toast('Queue cleared for your new level', { duration: 4000 });
        return;
      }
      if (modeRef.current === 'playing') setMode('paused');
    };
    const handleEnded = () => {
      if (isPlayingSilenceRef.current) return; // silence loops, never ends

      // A pref change arrived mid-track: the article we just heard was
      // the last old-level audio we'll play. Clear the session before
      // any transition jingle / autoplay logic kicks in so the user
      // doesn't get a B2 → A1 hand-off in the same listening flow.
      if (pendingPrefResetRef.current && !isPlayingTransitionRef.current) {
        clearSessionForPrefChange();
        toast('Queue cleared for your new level', { duration: 4000 });
        return;
      }

      if (isPlayingTransitionRef.current) {
        isPlayingTransitionRef.current = false;
        const idx = indexRef.current;
        const items = queueRef.current;

        // Only autoplay the next article when the Play All UI is
        // visible (home screen) or the page is hidden (lock screen /
        // background tab). Anywhere else, the transition jingle still
        // plays as an "end of article" indicator but the queue then
        // pauses so the user isn't surprised by the next article
        // starting while they're reading something else.
        const autoplay = shouldAutoplayNextRef.current();

        if (!autoplay) {
          prefetchedNextUrlRef.current = null;
          if (idx + 1 < items.length) {
            // Move on to the next track in the queue but don't load or
            // play it yet. The player UI will show it as paused and the
            // user can hit ▶ (or return to the home screen and resume)
            // to continue.
            setCurrentIndex(idx + 1);
            setCurrentTime(0);
            setDuration(0);
            loadedItemKeyRef.current = null;
            const el = audioRef.current;
            if (el) {
              try { el.pause(); } catch { /* ignore */ }
              try { el.removeAttribute('src'); el.load(); } catch { /* ignore */ }
            }
            setIsPlaying(false);
            setMode('paused');
          } else {
            setMode('finished');
          }
          return;
        }

        if (idx + 1 < items.length) {
          const nextItem = items[idx + 1];
          const prefetched = prefetchedNextUrlRef.current;
          prefetchedNextUrlRef.current = null;

          if (
            prefetched &&
            prefetched.articleId === nextItem.articleId &&
            prefetched.contentId === nextItem.contentId
          ) {
            // URL is already in hand – swap synchronously inside the
            // ended-handler tick. This is the path browsers reliably
            // treat as a continuation of the original Play All gesture.
            setCurrentIndex(idx + 1);
            setErrorMessage(null);
            setCurrentTime(0);
            setDuration(0);
            setMode('loading');
            setSourceAndPlay(prefetched.url, nextItem, true);
          } else {
            // Prefetch wasn't ready in time – bridge with looped silence
            // so the audio session stays "actively playing" while the
            // URL fetch completes. setSourceAndPlay then swaps from
            // silence to the article without needing a fresh gesture.
            playSilence();
            void playItemAt(idx + 1);
          }
        } else if (preparingNextRef.current) {
          setMode('awaiting_next');
          playSilence();
        } else {
          setMode('finished');
        }
        return;
      }

      setIsPlaying(false);
      const idx = indexRef.current;
      const items = queueRef.current;
      if (idx < 0 || idx >= items.length) return;
      const justFinished = items[idx];
      addListened(justFinished.articleId);

      if (idx + 1 < items.length || preparingNextRef.current) {
        playTransition();
      } else {
        setMode('finished');
      }
    };

    el.addEventListener('loadedmetadata', handleLoaded);
    el.addEventListener('timeupdate', handleTime);
    el.addEventListener('play', handlePlay);
    el.addEventListener('pause', handlePause);
    el.addEventListener('ended', handleEnded);
    return () => {
      el.removeEventListener('loadedmetadata', handleLoaded);
      el.removeEventListener('timeupdate', handleTime);
      el.removeEventListener('play', handlePlay);
      el.removeEventListener('pause', handlePause);
      el.removeEventListener('ended', handleEnded);
    };
  }, [audioEl, playItemAt, addListened, playSilence, playTransition, setSourceAndPlay, clearSessionForPrefChange]);

  const current = queue[currentIndex] ?? null;
  const upNextCount = useMemo(() => Math.max(queue.length - currentIndex - 1, 0), [queue, currentIndex]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    if (typeof window === 'undefined' || !('MediaMetadata' in window)) return;

    if (!current) {
      navigator.mediaSession.metadata = null;
      return;
    }

    navigator.mediaSession.metadata = new window.MediaMetadata({
      title: current.headline,
      artist: 'Reetle',
      album: current.topic,
      artwork: resolveMediaArtwork(current.imageUrl),
    });
  }, [current]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    if (!('setPositionState' in navigator.mediaSession)) return;
    if (!Number.isFinite(duration) || duration <= 0) return;

    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: audioRef.current?.playbackRate ?? 1,
        position: Math.min(Math.max(currentTime, 0), duration),
      });
    } catch {
      // Ignore invalid transient states while the audio element is loading.
    }
  }, [currentTime, duration]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    setMediaSessionAction('play', () => {
      if (!audioRef.current || !audioRef.current.paused) return;
      togglePlayback();
    });
    setMediaSessionAction('pause', () => {
      if (!audioRef.current || audioRef.current.paused) return;
      togglePlayback();
    });
    setMediaSessionAction('seekbackward', () => {
      const nextTime = Math.max(0, (audioRef.current?.currentTime ?? currentTime) - 10);
      seek(nextTime);
    });
    setMediaSessionAction('seekforward', () => {
      const baseTime = audioRef.current?.currentTime ?? currentTime;
      const nextTime = duration > 0 ? Math.min(baseTime + 10, duration) : baseTime + 10;
      seek(nextTime);
    });
    setMediaSessionAction('previoustrack', previous);
    setMediaSessionAction('nexttrack', next);
    setMediaSessionAction('stop', stop);

    return () => {
      setMediaSessionAction('play', null);
      setMediaSessionAction('pause', null);
      setMediaSessionAction('seekbackward', null);
      setMediaSessionAction('seekforward', null);
      setMediaSessionAction('previoustrack', null);
      setMediaSessionAction('nexttrack', null);
      setMediaSessionAction('stop', null);
    };
  }, [currentTime, duration, next, previous, seek, stop, togglePlayback]);

  const canResumePlayAll = useMemo(() => {
    const articles = articlesData?.articles ?? [];
    const base = buildReadyQueue(articles);
    return base.some(q => !listenedIds.has(q.articleId));
  }, [articlesData, listenedIds]);

  const isCurrentArticleInPlayAll = useCallback(
    (articleId: string | null | undefined) => {
      if (articleId == null || !current) return false;
      if (current.articleId !== articleId) return false;
      return (
        mode === 'playing' ||
        mode === 'paused' ||
        mode === 'loading' ||
        mode === 'awaiting_next'
      );
    },
    [current, mode]
  );

  return {
    mode,
    queue,
    currentIndex,
    current,
    upNextCount,
    currentTime,
    duration,
    isPlaying,
    preparingNext,
    errorMessage,
    limitReached: mode === 'limit_reached',
    start,
    togglePlayback,
    next,
    previous,
    stop,
    seek,
    isCurrentArticleInPlayAll,
    isArticleInQueue,
    isArticleUserQueued,
    isArticlePending,
    isSessionActive,
    queueArticle,
    listenedArticleIds: listenedIds,
    canResumePlayAll,
    removeFromQueue,
    reorderQueue,
    jumpToQueue,
    bindAudio,
  };
}

export function PlayAllAudioProvider({ children }: { children: ReactNode }) {
  const state = usePlayAllQueueState();
  const { bindAudio, ...value } = state;

  return (
    <PlayAllAudioContext.Provider value={value}>
      <audio
        ref={bindAudio}
        preload="auto"
        className="hidden"
        aria-label="Play all article audio"
        playsInline
      />
      {children}
    </PlayAllAudioContext.Provider>
  );
}

export function usePlayAllAudio(): PlayAllAudioValue {
  const ctx = useContext(PlayAllAudioContext);
  if (!ctx) {
    throw new Error('usePlayAllAudio must be used within a PlayAllAudioProvider');
  }
  return ctx;
}

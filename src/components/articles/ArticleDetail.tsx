'use client';

import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import Link from 'next/link';
import TranslationSheet from '@/components/articles/TranslationSheet';
import TranslationDemoBanner from '@/components/articles/TranslationDemoBanner';
import OpenInBrowserBanner from '@/components/articles/OpenInBrowserBanner';
import SelectionHandles from '@/components/articles/SelectionHandles';
import ArticleAudioPlayer from '@/components/articles/ArticleAudioPlayer';
import { useArticles } from '@/contexts/ArticlesContext';
import { useAuth } from '@/contexts/AuthContext';
import { useGuestPreferences } from '@/contexts/GuestPreferencesContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { getArticleContent, getGuestArticleContent, getArticleQuestions, getGuestArticleQuestions, GuestQuotaError, FreeTierQuotaError } from '@/services/api';
import { prefetchQuiz } from '@/services/quizCache';
import type { Article } from '@/types/article';
import { useHasHover } from '@/hooks/useHasHover';
import { useLoginUrl } from '@/hooks/useLoginUrl';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, MessageCircleQuestion, PenLine, BookOpen, Check, Layers } from 'lucide-react';

// ── Highlight types & helpers ────────────────────────────────────────────────

interface HRange { start: number; end: number }

function mergeRanges(ranges: HRange[]): HRange[] {
  if (!ranges.length) return [];
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const out: HRange[] = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const last = out[out.length - 1];
    if (sorted[i].start <= last.end) {
      last.end = Math.max(last.end, sorted[i].end);
    } else {
      out.push({ ...sorted[i] });
    }
  }
  return out;
}

/**
 * Renders `text` with:
 *   - `lockedRanges`: ranges the user has already translated (persist after
 *     the translation sheet closes)
 *   - `activeRange`: the currently-selected range (what the TranslationSheet
 *     is showing and what SelectionHandles should position over)
 *
 * The active range is always rendered as its OWN <mark> (tagged with
 * `data-active-mark`) — even when it overlaps/sits inside a locked range.
 * Locked ranges are split around the active range so a wider locked mark
 * never swallows the narrower active mark.
 */
function renderHighlighted(text: string, lockedRanges: HRange[], activeRange?: HRange | null): ReactNode {
  type Seg = { start: number; end: number; isActive: boolean };
  const mergedLocked = mergeRanges(lockedRanges);
  const segments: Seg[] = [];

  if (activeRange) {
    segments.push({ start: activeRange.start, end: activeRange.end, isActive: true });
    for (const r of mergedLocked) {
      const overlaps = r.start < activeRange.end && r.end > activeRange.start;
      if (!overlaps) {
        segments.push({ start: r.start, end: r.end, isActive: false });
        continue;
      }
      if (r.start < activeRange.start) {
        segments.push({ start: r.start, end: activeRange.start, isActive: false });
      }
      if (r.end > activeRange.end) {
        segments.push({ start: activeRange.end, end: r.end, isActive: false });
      }
    }
  } else {
    for (const r of mergedLocked) {
      segments.push({ start: r.start, end: r.end, isActive: false });
    }
  }

  if (!segments.length) return text;

  segments.sort((a, b) => a.start - b.start);

  // Fuse adjacent/overlapping NON-active segments so we don't emit adjacent
  // <mark>s that would render as a visible seam. We never fuse the active
  // segment with anything.
  const collapsed: Seg[] = [];
  for (const seg of segments) {
    const last = collapsed[collapsed.length - 1];
    if (last && !last.isActive && !seg.isActive && seg.start <= last.end) {
      last.end = Math.max(last.end, seg.end);
    } else {
      collapsed.push({ ...seg });
    }
  }

  const parts: ReactNode[] = [];
  let cur = 0;
  for (const seg of collapsed) {
    if (seg.start > cur) parts.push(text.slice(cur, seg.start));
    parts.push(
      <mark
        key={seg.start}
        className="bg-primary/[0.14] text-primary"
        style={{ textDecoration: 'none', padding: 0, borderRadius: 0 }}
        {...(seg.isActive ? { 'data-active-mark': '' } : {})}
      >
        {text.slice(seg.start, seg.end)}
      </mark>,
    );
    cur = seg.end;
  }
  if (cur < text.length) parts.push(text.slice(cur));
  return parts;
}

// ── Word-boundary helper ─────────────────────────────────────────────────────

function getWordAt(text: string, offset: number): { word: string; start: number; end: number } | null {
  if (!text || offset < 0 || offset >= text.length) return null;
  let start = offset;
  let end = offset;
  while (start > 0 && /\S/.test(text[start - 1])) start--;
  while (end < text.length && /\S/.test(text[end])) end++;
  // eslint-disable-next-line no-misleading-character-class
  const wordTrimRegex = new RegExp('^[^\\p{L}\\p{N}]+|[^\\p{L}\\p{N}]+$', 'gu');
  const word = text.slice(start, end).replace(wordTrimRegex, '');
  if (!word) return null;
  const trimStart = text.indexOf(word, start);
  return { word, start: trimStart, end: trimStart + word.length };
}

// ── Sentence context helpers ─────────────────────────────────────────────────

const SENTENCE_BOUNDARY = /(?<=[.!?…¿¡])\s+/;

/**
 * Given a paragraph's text and a word/phrase within it, returns:
 * - `sentence`: the sentence containing the selection
 * - `extended`: that sentence plus up to 2 preceding sentences (empty string if
 *   there's nothing extra beyond the sentence itself)
 */
function getSentenceContext(paragraphText: string, selectedText: string): { sentence: string; extended: string } {
  const sentences = paragraphText.split(SENTENCE_BOUNDARY).filter(Boolean);
  if (sentences.length <= 1) return { sentence: paragraphText.trim(), extended: '' };

  const idx = sentences.findIndex(s => s.includes(selectedText));
  if (idx < 0) return { sentence: paragraphText.trim(), extended: '' };

  const sentence = sentences[idx].trim();
  const start = Math.max(0, idx - 2);
  const extendedSlice = sentences.slice(start, idx + 1).map(s => s.trim()).join(' ');

  return { sentence, extended: extendedSlice !== sentence ? extendedSlice : '' };
}

// ── Generating messages ─────────────────────────────────────────────────────

const GENERATING_MESSAGES = [
  "We're tailoring this article so it's just right for you.",
  'Adjusting vocabulary and grammar to match your level.',
  'Nearly there - putting the finishing touches on your article.',
];

// ── Main component ───────────────────────────────────────────────────────────

interface ArticleDetailProps {
  articleId: string;
}

export default function ArticleDetail({ articleId }: ArticleDetailProps) {
  const { articlesData } = useArticles();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { preferences: guestPrefs } = useGuestPreferences();
  const { isPremium, dailyUsage } = useSubscription();
  const loginUrl = useLoginUrl();

  // Try to find article in existing context data
  const contextArticle = articlesData?.articles.find(a => a.articleId === articleId) || null;

  const [article, setArticle] = useState<Article | null>(contextArticle);
  const [content, setContent] = useState<string | null>(null);
  const [articleViewId, setArticleViewId] = useState<number | undefined>();
  const [contentId, setContentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!contextArticle);
  const [contentLoading, setContentLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [freeTierQuota, setFreeTierQuota] = useState<{ detail: string; resetsAt: string } | null>(null);
  const [showHeadlineTranslation, setShowHeadlineTranslation] = useState(false);
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [selectionContext, setSelectionContext] = useState<string>('');
  const [selectionExtendedContext, setSelectionExtendedContext] = useState<string>('');
  const [hasPassedHalf, setHasPassedHalf] = useState(false);
  const [highlightsByPara, setHighlightsByPara] = useState<Record<number, HRange[]>>({});
  const [activeSelection, setActiveSelection] = useState<{ paraIdx: number; range: HRange } | null>(null);
  const [translationPending, setTranslationPending] = useState(false);
  const [showGeneratingMsg, setShowGeneratingMsg] = useState(false);
  const [generatingMsgIdx, setGeneratingMsgIdx] = useState(0);
  const [isContentRefreshing, setIsContentRefreshing] = useState(false);
  const [showRefreshMsg, setShowRefreshMsg] = useState(false);
  const [refreshMsgIdx, setRefreshMsgIdx] = useState(0);
  /** Sticky audio bar only while playback is active; otherwise keep player in document flow under the headline. */
  const [audioPinnedWhilePlaying, setAudioPinnedWhilePlaying] = useState(false);

  const hasHover = useHasHover();
  const contentRef = useRef<HTMLDivElement>(null);
  const headlineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mouseStart = useRef<{ x: number; y: number } | null>(null);
  const wasDrag = useRef(false);
  const paragraphRefs = useRef<Record<number, HTMLParagraphElement | null>>({});
  // Ref mirror of activeSelection so callbacks can read the latest value
  // without being re-created every time the selection changes.
  const activeSelectionRef = useRef<{ paraIdx: number; range: HRange } | null>(null);
  const activeLang = isAuthenticated ? user?.targetLanguage : guestPrefs.targetLanguage;
  const activeLevel = isAuthenticated ? user?.cefrLevel : guestPrefs.cefrLevel;
  const prevLangRef = useRef(activeLang);
  const prevLevelRef = useRef(activeLevel);

  const paragraphs = content ? content.split('\n\n') : [];

  // Update article if context data arrives later (e.g. page refresh)
  useEffect(() => {
    if (!article && contextArticle) {
      setArticle(contextArticle);
      setIsLoading(false);
    }
  }, [contextArticle, article]);

  // ── Fetch article content ──────────────────────────────────────────────────

  useEffect(() => {
    if (!articleId || authLoading) return;
    let cancelled = false;
    const controller = new AbortController();

    const langChanged = prevLangRef.current !== activeLang;
    const levelChanged = prevLevelRef.current !== activeLevel;
    prevLangRef.current = activeLang;
    prevLevelRef.current = activeLevel;

    const isRefresh = (langChanged || levelChanged) && !!content;

    if (isRefresh) {
      setIsContentRefreshing(true);
      setHighlightsByPara({});
      activeSelectionRef.current = null;
      setActiveSelection(null);
      setSelectedText(null);
      setSelectionContext('');
      setSelectionExtendedContext('');
      window.getSelection()?.removeAllRanges();
    } else {
      setContentLoading(true);
      // Clear the previous article's content_id so the audio module cannot
      // briefly associate the new article with stale audio state.
      setContentId(null);
    }

    setQuotaExceeded(false);

    async function fetchContent() {
      try {
        if (isAuthenticated) {
          const result = await getArticleContent(articleId);
          if (cancelled) return;
          if (result.error) setError(result.content);
          else {
            setContent(result.content);
            setArticleViewId(result.articleViewId);
            setContentId(result.contentId ?? null);
          }
        } else {
          const result = await getGuestArticleContent(articleId, guestPrefs.targetLanguage, guestPrefs.cefrLevel);
          if (cancelled) return;
          if (result.error) setError(result.content);
          else { setContent(result.content); }
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof GuestQuotaError) {
          setQuotaExceeded(true);
        } else if (err instanceof FreeTierQuotaError) {
          setFreeTierQuota({ detail: err.detail, resetsAt: err.resetsAt });
        } else {
          setError('Failed to load article content.');
        }
      } finally {
        if (!cancelled) {
          setContentLoading(false);
          setIsContentRefreshing(false);
          setHighlightsByPara({});
          activeSelectionRef.current = null;
          setActiveSelection(null);
        }
      }
    }
    fetchContent();
    return () => { cancelled = true; controller.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId, isAuthenticated, authLoading, activeLang, activeLevel]);

  // ── "Writing to your level" message for on-demand generation ───────────────

  useEffect(() => {
    if (!contentLoading) {
      setShowGeneratingMsg(false);
      return;
    }
    if (article && !article.contentGenerated) {
      setShowGeneratingMsg(true);
      return;
    }
    if (!article) {
      const timer = setTimeout(() => setShowGeneratingMsg(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [contentLoading, article]);

  useEffect(() => {
    if (!showGeneratingMsg) {
      setGeneratingMsgIdx(0);
      return;
    }
    const interval = setInterval(() => {
      setGeneratingMsgIdx(prev => (prev + 1) % GENERATING_MESSAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [showGeneratingMsg]);

  // ── Refresh overlay message (1s delay, then cycle) ─────────────────────────

  useEffect(() => {
    if (!isContentRefreshing) {
      setShowRefreshMsg(false);
      setRefreshMsgIdx(0);
      return;
    }
    const timer = setTimeout(() => setShowRefreshMsg(true), 1000);
    return () => clearTimeout(timer);
  }, [isContentRefreshing]);

  useEffect(() => {
    if (!showRefreshMsg) return;
    const interval = setInterval(() => {
      setRefreshMsgIdx(prev => (prev + 1) % GENERATING_MESSAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [showRefreshMsg]);

  // ── Scroll tracking for quiz button ────────────────────────────────────────

  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current || hasPassedHalf) return;
      const rect = contentRef.current.getBoundingClientRect();
      const scrolled = window.scrollY + window.innerHeight - rect.top;
      if (scrolled > contentRef.current.scrollHeight * 0.5) setHasPassedHalf(true);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasPassedHalf]);

  // ── Prefetch quiz questions when button becomes visible ─────────────────────

  useEffect(() => {
    if (!hasPassedHalf || contentLoading || quotaExceeded || !articleId) return;
    prefetchQuiz(articleId, () =>
      isAuthenticated
        ? getArticleQuestions(articleId, articleViewId)
        : getGuestArticleQuestions(articleId, undefined, guestPrefs.targetLanguage, guestPrefs.familiarLanguage, guestPrefs.cefrLevel),
    );
  }, [hasPassedHalf, contentLoading, quotaExceeded, articleId, isAuthenticated, articleViewId, guestPrefs.targetLanguage, guestPrefs.familiarLanguage, guestPrefs.cefrLevel]);

  // ── Headline translation: hover on desktop, button on mobile ────────────────

  const handleHeadlineMouseEnter = useCallback(() => {
    if (!hasHover || !article?.headlineFamiliar) return;
    headlineTimerRef.current = setTimeout(() => {
      setShowHeadlineTranslation(true);
    }, 500);
  }, [hasHover, article?.headlineFamiliar]);

  const handleHeadlineMouseLeave = useCallback(() => {
    if (headlineTimerRef.current) {
      clearTimeout(headlineTimerRef.current);
      headlineTimerRef.current = null;
    }
    setShowHeadlineTranslation(false);
  }, []);

  const toggleHeadlineTranslation = useCallback(() => {
    if (!article?.headlineFamiliar) return;
    setShowHeadlineTranslation(prev => !prev);
  }, [article?.headlineFamiliar]);

  // ── Commit a selection: save highlight + open translation ──────────────────
  //
  // `highlightsByPara` stores "locked" ranges (previously-translated, no
  // longer active). `activeSelection` is the currently-selected range.
  // Together they render as the visible highlights. When the user commits a
  // NEW selection (tap/click/native drag) we push the previous active range
  // into the locked set so it stays highlighted alongside the new one.

  const lockActive = useCallback((active: { paraIdx: number; range: HRange } | null) => {
    if (!active) return;
    setHighlightsByPara(prev => ({
      ...prev,
      [active.paraIdx]: mergeRanges([...(prev[active.paraIdx] || []), active.range]),
    }));
  }, []);

  const commitSelection = useCallback((text: string, ctx: string, paraIdx?: number, range?: HRange) => {
    lockActive(activeSelectionRef.current);

    const nextActive = (paraIdx !== undefined && range) ? { paraIdx, range } : null;
    activeSelectionRef.current = nextActive;
    setActiveSelection(nextActive);

    setTranslationPending(false);
    setSelectedText(text);

    const { sentence, extended } = getSentenceContext(ctx, text);
    setSelectionContext(sentence);
    setSelectionExtendedContext(extended);

    window.getSelection()?.removeAllRanges();
  }, [lockActive]);

  // ── Handle-driven selection change (drag to expand/contract) ────────────────
  // The user is live-editing the current active range, so we only update
  // activeSelection. We do NOT lock the previous active range — that would
  // leave phantom highlights behind as the selection grows/shrinks.

  const handleSelectionChange = useCallback((text: string, paraIdx: number, range: HRange) => {
    const next = { paraIdx, range };
    activeSelectionRef.current = next;
    setActiveSelection(next);
    setSelectedText(text);

    const paraText = paragraphs[paraIdx] || text;
    const { sentence, extended } = getSentenceContext(paraText, text);
    setSelectionContext(sentence);
    setSelectionExtendedContext(extended);

    window.getSelection()?.removeAllRanges();
  }, [paragraphs]);

  const handleDragStart = useCallback(() => {
    setTranslationPending(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    // Keep pending — user must press Translate
  }, []);

  const handleTranslateRequest = useCallback(() => {
    setTranslationPending(false);
  }, []);

  // ── Compute the character offset of a text node within its paragraph ───────

  const charOffsetInPara = useCallback((textNode: Node, paraEl: HTMLElement): number => {
    const walker = document.createTreeWalker(paraEl, NodeFilter.SHOW_TEXT);
    let offset = 0;
    let cur: Node | null;
    while ((cur = walker.nextNode())) {
      if (cur === textNode) return offset;
      offset += (cur.textContent || '').length;
    }
    return offset;
  }, []);

  // ── Mouse handlers: click = select word, drag = native selection ───────────

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    mouseStart.current = { x: e.clientX, y: e.clientY };
    wasDrag.current = false;
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!mouseStart.current) return;
    const dx = Math.abs(e.clientX - mouseStart.current.x);
    const dy = Math.abs(e.clientY - mouseStart.current.y);
    if (dx > 5 || dy > 5) wasDrag.current = true;
  }, []);

  const onMouseUp = useCallback(() => {
    mouseStart.current = null;

    if (wasDrag.current) {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;
      const text = sel.toString().trim();
      if (!text || text.length > 200) return;

      const anchor = sel.anchorNode;
      const pEl = (anchor?.nodeType === Node.TEXT_NODE ? anchor.parentElement : anchor as HTMLElement)?.closest?.('[data-pidx]') as HTMLElement | null;
      const ctx = pEl?.textContent || text;
      const pidx = pEl ? parseInt(pEl.dataset.pidx || '-1', 10) : -1;

      if (pidx >= 0 && paragraphs[pidx]) {
        const pText = paragraphs[pidx];
        const idx = pText.indexOf(text);
        if (idx >= 0) {
          commitSelection(text, ctx, pidx, { start: idx, end: idx + text.length });
          return;
        }
      }
      commitSelection(text, ctx);
    }
  }, [paragraphs, commitSelection]);

  // Single-click handler on each paragraph
  const onWordClick = useCallback((e: React.MouseEvent) => {
    if (wasDrag.current) return;

    const existingSel = window.getSelection();
    if (existingSel && !existingSel.isCollapsed && existingSel.toString().trim()) {
      const text = existingSel.toString().trim();
      if (text.length > 200) return;
      const anchor = existingSel.anchorNode;
      const pEl = (anchor?.nodeType === Node.TEXT_NODE ? anchor.parentElement : anchor as HTMLElement)?.closest?.('[data-pidx]') as HTMLElement | null;
      const ctx = pEl?.textContent || text;
      const pidx = pEl ? parseInt(pEl.dataset.pidx || '-1', 10) : -1;
      if (pidx >= 0 && paragraphs[pidx]) {
        const pText = paragraphs[pidx];
        const idx = pText.indexOf(text);
        if (idx >= 0) {
          commitSelection(text, ctx, pidx, { start: idx, end: idx + text.length });
          return;
        }
      }
      commitSelection(text, ctx);
      return;
    }

    const range = document.caretRangeFromPoint?.(e.clientX, e.clientY);
    if (!range || range.startContainer.nodeType !== Node.TEXT_NODE) return;

    const textNode = range.startContainer as Text;
    const nodeText = textNode.textContent || '';
    const result = getWordAt(nodeText, range.startOffset);
    if (!result) return;

    const selRange = document.createRange();
    selRange.setStart(textNode, result.start);
    selRange.setEnd(textNode, result.end);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(selRange);

    const pEl = (e.target as HTMLElement).closest('[data-pidx]') as HTMLElement | null;
    const ctx = pEl?.textContent || result.word;
    const pidx = pEl ? parseInt(pEl.dataset.pidx || '-1', 10) : -1;

    if (pidx >= 0 && pEl) {
      const base = charOffsetInPara(textNode, pEl);
      const globalStart = base + result.start;
      const globalEnd = base + result.end;
      commitSelection(result.word, ctx, pidx, { start: globalStart, end: globalEnd });
    } else {
      commitSelection(result.word, ctx);
    }
  }, [paragraphs, commitSelection, charOffsetInPara]);

  // ── Listen for selection expansion via native handles ──────────────────────

  useEffect(() => {
    if (!selectedText) return;
    let timer: ReturnType<typeof setTimeout>;

    const onChange = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) return;
        const text = sel.toString().trim();
        if (!text || text.length > 200 || text === selectedText) return;

        const anchor = sel.anchorNode;
        const pEl = (anchor?.nodeType === Node.TEXT_NODE ? anchor.parentElement : anchor as HTMLElement)?.closest?.('[data-pidx]') as HTMLElement | null;
        const ctx = pEl?.textContent || text;
        const pidx = pEl ? parseInt(pEl.dataset.pidx || '-1', 10) : -1;

        if (pidx >= 0 && paragraphs[pidx]) {
          const pText = paragraphs[pidx];
          const idx = pText.indexOf(text);
          if (idx >= 0) {
            commitSelection(text, ctx, pidx, { start: idx, end: idx + text.length });
            return;
          }
        }
        commitSelection(text, ctx);
      }, 400);
    };

    document.addEventListener('selectionchange', onChange);
    return () => { clearTimeout(timer); document.removeEventListener('selectionchange', onChange); };
  }, [selectedText, paragraphs, commitSelection]);

  // ── Close translation ──────────────────────────────────────────────────────

  const closeTranslation = useCallback(() => {
    lockActive(activeSelectionRef.current);
    activeSelectionRef.current = null;
    setSelectedText(null);
    setSelectionContext('');
    setSelectionExtendedContext('');
    setActiveSelection(null);
    setTranslationPending(false);
    window.getSelection()?.removeAllRanges();
  }, [lockActive]);

  const imageUrl = article?.imageLinks?.[0];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <OpenInBrowserBanner />
      <section className="py-lg">
        <div className="max-w-[800px] mx-auto px-md">
          {isLoading && (
            <div className="animate-pulse">
              <div className="h-[200px] bg-gray-200 mb-lg" />
              <div className="h-[28px] bg-gray-200 rounded w-3/4 mb-md" />
              <div className="h-[16px] bg-gray-200 rounded w-1/4" />
            </div>
          )}

          {error && !isLoading && !quotaExceeded && (
            <div className="text-center py-xl">
              <p className="text-body-lg text-text-secondary mb-md">{error}</p>
            </div>
          )}

          {article && !error && (
            <>
              {imageUrl && (
                <div className="relative overflow-hidden mb-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt="" className="w-full h-auto" />
                </div>
              )}

              <div className="flex items-start gap-[8px] mb-sm">
                <h1
                  className={`relative flex-1 text-display-md select-none transition-colors duration-300 overflow-hidden ${hasHover ? 'cursor-pointer' : ''} ${showHeadlineTranslation ? 'text-primary-light' : 'text-primary'}`}
                  onMouseEnter={hasHover ? handleHeadlineMouseEnter : undefined}
                  onMouseLeave={hasHover ? handleHeadlineMouseLeave : undefined}
                  title={hasHover && !showHeadlineTranslation ? (article.headlineFamiliar || undefined) : undefined}
                >
                  <span className={showHeadlineTranslation ? 'invisible' : ''} aria-hidden={showHeadlineTranslation}>
                    {article.headline}
                  </span>
                  {showHeadlineTranslation && (
                    <span className="absolute inset-0">{article.headlineFamiliar}</span>
                  )}
                </h1>
                {!hasHover && article.headlineFamiliar && (
                  <button
                    onClick={toggleHeadlineTranslation}
                    className={`flex-shrink-0 mt-[6px] bg-transparent border-none cursor-pointer transition-colors duration-200 ${showHeadlineTranslation ? 'text-primary' : 'text-text-secondary/50'}`}
                    aria-label={showHeadlineTranslation ? 'Show original headline' : 'Translate headline'}
                  >
                    <MessageCircleQuestion size={22} strokeWidth={2} />
                  </button>
                )}
              </div>

              <div className={`flex items-center gap-md text-body-md text-text-secondary ${(quotaExceeded || freeTierQuota) ? 'mb-md' : 'mb-md'}`}>
                {article.publishedDate && <span>{article.publishedDate}</span>}
                {article.cefrLevelHeadline && (
                  <span className="bg-background px-[8px] py-[2px] rounded text-[12px] font-medium">
                    {article.cefrLevelHeadline}
                  </span>
                )}
              </div>

              {isAuthenticated && !quotaExceeded && !freeTierQuota && !error && (
                <div
                  className={
                    audioPinnedWhilePlaying
                      ? 'sticky top-[101px] z-40 -mx-4 px-4 py-2 mb-md sm:mx-0 sm:px-0 bg-background/95 backdrop-blur-sm'
                      : '-mx-4 px-4 py-2 mb-md sm:mx-0 sm:px-0'
                  }
                >
                  <ArticleAudioPlayer
                    articleId={articleId}
                    contentId={contentId}
                    summaryAudioAvailable={article.audioGenerated}
                    onPlaybackStickyChange={setAudioPinnedWhilePlaying}
                  />
                </div>
              )}

              {isAuthenticated && !isPremium && dailyUsage?.articles && !freeTierQuota && !contentLoading && content && (
                <div className="flex items-center gap-[6px] mb-md">
                  <span className="text-[12px] text-text-secondary">
                    {dailyUsage.articles.limit - dailyUsage.articles.used > 0
                      ? `${dailyUsage.articles.limit - dailyUsage.articles.used} of ${dailyUsage.articles.limit} articles remaining today`
                      : 'No articles remaining today'
                    }
                  </span>
                  <Link href="/premium" className="text-[12px] font-medium text-primary-light hover:text-primary transition-colors">
                    Upgrade
                  </Link>
                </div>
              )}

              {!quotaExceeded && !contentLoading && content && (
                <TranslationDemoBanner hasInteracted={!!selectedText} />
              )}

              <div
                ref={contentRef}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onTouchEnd={onMouseUp}
              >
                {isContentRefreshing && content ? (
                  <div className="relative overflow-hidden">
                    <div
                      className="space-y-md select-none pointer-events-none transition-[filter] duration-300"
                      style={{ filter: 'blur(4px)', WebkitFilter: 'blur(4px)' }}
                    >
                      {paragraphs.map((paragraph, index) => (
                        <p
                          key={index}
                          className="text-[18px] leading-[1.7] text-primary font-outfit"
                        >
                          {paragraph}
                        </p>
                      ))}
                    </div>
                    {showRefreshMsg && (
                      <div className="absolute inset-0 flex items-start justify-center pt-xl animate-fadeIn">
                        <div className="flex flex-col items-center text-center">
                          <div className="w-[56px] h-[56px] bg-primary/10 rounded-full flex items-center justify-center mb-lg">
                            <PenLine size={26} strokeWidth={1.5} className="text-primary animate-writing" />
                          </div>
                          <h2 className="text-display-sm text-primary mb-sm">
                            Writing your article to your level
                          </h2>
                          <p
                            key={refreshMsgIdx}
                            className="text-body-lg text-text-secondary max-w-[520px] mx-auto leading-[1.6] mb-lg animate-fadeIn"
                          >
                            {GENERATING_MESSAGES[refreshMsgIdx]}
                          </p>
                          <div className="w-full max-w-[240px] h-[4px] bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full animate-progress" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : contentLoading ? (
                  showGeneratingMsg ? (
                    <div className="flex flex-col items-center text-center py-xl animate-fadeIn select-none pointer-events-none">
                      <div className="w-[56px] h-[56px] bg-primary/10 rounded-full flex items-center justify-center mb-lg">
                        <PenLine size={26} strokeWidth={1.5} className="text-primary animate-writing" />
                      </div>
                      <h2 className="text-display-sm text-primary mb-sm">
                        Writing your article to your level
                      </h2>
                      <p
                        key={generatingMsgIdx}
                        className="text-body-lg text-text-secondary max-w-[520px] mx-auto leading-[1.6] mb-lg animate-fadeIn"
                      >
                        {GENERATING_MESSAGES[generatingMsgIdx]}
                      </p>
                      
                      <div className="w-full max-w-[240px] h-[4px] bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full animate-progress" />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-md animate-pulse">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i}>
                          <div className="h-[16px] bg-gray-200 rounded w-full mb-[6px]" />
                          <div className="h-[16px] bg-gray-200 rounded w-5/6 mb-[6px]" />
                          <div className="h-[16px] bg-gray-200 rounded w-4/6" />
                        </div>
                      ))}
                    </div>
                  )
                ) : quotaExceeded ? (
                  <div className="relative overflow-hidden">
                    {/* Fake blurred article text beneath the overlay */}
                    <div
                      className="select-none pointer-events-none text-[18px] leading-[1.7] text-primary/70 font-outfit"
                      aria-hidden="true"
                      style={{ filter: 'blur(4px)', WebkitFilter: 'blur(4px)' }}
                    >
                      <p className="mb-md">La situación actual ha generado una serie de reacciones entre los principales actores del sector, quienes han expresado su preocupación por las posibles consecuencias a largo plazo de estas medidas implementadas recientemente por las autoridades competentes.</p>
                      <p className="mb-md">Según los expertos consultados, las nuevas regulaciones podrían tener un impacto significativo en la economía regional durante los próximos meses. Los analistas financieros han señalado que es necesario adoptar un enfoque más cauteloso ante la incertidumbre que rodea estas decisiones políticas.</p>
                      <p className="mb-md">El portavoz del gobierno ha declarado que las medidas fueron diseñadas para proteger los intereses de los ciudadanos y garantizar la estabilidad económica del país. Sin embargo, varios sectores de la oposición han cuestionado la efectividad de estas políticas.</p>
                      <p className="mb-md">Los mercados internacionales han reaccionado de manera mixta ante estos acontecimientos, con algunos inversores optando por adoptar una posición más conservadora mientras otros ven oportunidades de crecimiento en medio de la volatilidad actual.</p>
                      <p className="mb-md">Mientras tanto, las organizaciones no gubernamentales han pedido una mayor transparencia en el proceso de toma de decisiones y han instado a las autoridades a considerar el impacto social de estas medidas antes de proceder con su implementación completa.</p>
                    </div>

                    {/* Gradient fade + blocker overlay */}
                    <div
                      className="absolute inset-0 flex flex-col items-center animate-fadeIn"
                      style={{
                        background: 'linear-gradient(to bottom, rgba(248,247,250,0) 0%, rgba(248,247,250,0.7) 8%, rgba(248,247,250,0.95) 18%, rgba(248,247,250,1) 28%)',
                      }}
                    >
                      <div className="mt-[80px] w-full text-center px-[16px]">
                        {/* Icon */}
                        <div className="w-[56px] h-[56px] bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-lg">
                          <BookOpen size={26} strokeWidth={1.5} color="#4A2462" />
                        </div>

                        <h2 className="text-display-sm text-primary mb-sm">
                          Keep reading for free
                        </h2>
                        <p className="text-body-lg text-text-secondary mb-lg max-w-[360px] mx-auto leading-[1.6]">
                          You&apos;ve previewed your daily articles. Create a free account to unlock this story and read without limits.
                        </p>

                        {/* Value props */}
                        <div className="flex flex-col gap-[10px] mb-xl text-left max-w-[300px] mx-auto">
                          {[
                            'Unlimited article reading',
                            'Tap-to-translate any word or phrase',
                            'Practice quizzes after every article',
                            'Track your vocabulary & progress',
                          ].map((feature) => (
                            <div key={feature} className="flex items-start gap-[10px]">
                              <Check size={20} strokeWidth={2.5} className="mt-[1px] flex-shrink-0 text-correct" />
                              <span className="text-body-md text-primary">{feature}</span>
                            </div>
                          ))}
                        </div>

                        {/* CTA */}
                        <div className="flex justify-center">
                          <Button asChild size="lg" className="w-full max-w-[320px]">
                            <Link href={loginUrl}>Sign up free — takes 10 seconds</Link>
                          </Button>
                        </div>

                        {/* Login link */}
                        <p className="text-body-md text-text-secondary mt-lg">
                          Already have an account?{' '}
                          <Link href={loginUrl} className="text-primary font-medium hover:underline">
                            Log in
                          </Link>
                        </p>
                      </div>
                    </div>
                  </div>
                ) : freeTierQuota ? (
                  <div className="relative overflow-hidden">
                    <div
                      className="select-none pointer-events-none text-[18px] leading-[1.7] text-primary/70 font-outfit"
                      aria-hidden="true"
                      style={{ filter: 'blur(4px)', WebkitFilter: 'blur(4px)' }}
                    >
                      <p className="mb-md">La situación actual ha generado una serie de reacciones entre los principales actores del sector, quienes han expresado su preocupación por las posibles consecuencias a largo plazo.</p>
                      <p className="mb-md">Según los expertos consultados, las nuevas regulaciones podrían tener un impacto significativo en la economía regional durante los próximos meses.</p>
                      <p className="mb-md">El portavoz del gobierno ha declarado que las medidas fueron diseñadas para proteger los intereses de los ciudadanos y garantizar la estabilidad económica.</p>
                    </div>
                    <div
                      className="absolute inset-0 flex flex-col items-center animate-fadeIn"
                      style={{
                        background: 'linear-gradient(to bottom, rgba(248,247,250,0) 0%, rgba(248,247,250,0.7) 8%, rgba(248,247,250,0.95) 18%, rgba(248,247,250,1) 28%)',
                      }}
                    >
                      <div className="mt-[80px] w-full text-center px-[16px]">
                        <div className="w-[56px] h-[56px] bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-lg">
                          <Layers size={26} strokeWidth={1.5} color="#4A2462" />
                        </div>
                        <h2 className="text-display-sm text-primary mb-sm">Daily limit reached</h2>
                        <p className="text-body-lg text-text-secondary mb-lg max-w-[360px] mx-auto leading-[1.6]">
                          {freeTierQuota.detail}
                        </p>
                        <div className="flex justify-center">
                          <Button asChild size="lg" className="w-full max-w-[320px]">
                            <Link href="/premium">Go Premium — Unlimited access</Link>
                          </Button>
                        </div>
                        {freeTierQuota.resetsAt && (
                          <p className="text-body-md text-text-secondary mt-md">
                            Or come back tomorrow — limits reset at midnight.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : content ? (
                  <div className="space-y-md">
                    {paragraphs.map((paragraph, index) => {
                      const locked = highlightsByPara[index] || [];
                      const isActiveHere = activeSelection?.paraIdx === index;
                      return (
                        <p
                          key={index}
                          ref={(el) => { paragraphRefs.current[index] = el; }}
                          data-pidx={index}
                          className="text-[18px] leading-[1.7] text-primary font-outfit cursor-text"
                          style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                          onClick={onWordClick}
                        >
                          {renderHighlighted(
                            paragraph,
                            locked,
                            isActiveHere ? activeSelection.range : null,
                          )}
                        </p>
                      );
                    })}
                  </div>
                ) : null}

                {activeSelection && (
                  <SelectionHandles
                    paragraphIndex={activeSelection.paraIdx}
                    paragraphText={paragraphs[activeSelection.paraIdx]}
                    selectionRange={activeSelection.range}
                    onSelectionChange={handleSelectionChange}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  />
                )}
              </div>

              {hasPassedHalf && !contentLoading && !quotaExceeded && !freeTierQuota && (
                <div className="mt-xl pt-lg border-t border-ui-border">
                  <Button asChild size="lg" className="w-full">
                    <Link href={`/practice/quiz?articleId=${articleId}${articleViewId ? `&viewId=${articleViewId}` : ''}${!isAuthenticated ? '&guest=1' : ''}`}>
                      <ClipboardCheck className="w-5 h-5" />
                      Article Quiz
                    </Link>
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {selectedText && (
        <TranslationSheet
          selectedText={selectedText}
          context={selectionContext}
          extendedContext={selectionExtendedContext || undefined}
          onClose={closeTranslation}
          pending={translationPending}
          onTranslateRequest={handleTranslateRequest}
        />
      )}
    </>
  );
}

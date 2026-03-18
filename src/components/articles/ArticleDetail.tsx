'use client';

import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import Link from 'next/link';
import TranslationSheet from '@/components/articles/TranslationSheet';
import TranslationDemoBanner from '@/components/articles/TranslationDemoBanner';
import SelectionHandles from '@/components/articles/SelectionHandles';
import { useArticles } from '@/contexts/ArticlesContext';
import { useAuth } from '@/contexts/AuthContext';
import { useGuestPreferences } from '@/contexts/GuestPreferencesContext';
import { getArticleContent, getGuestArticleContent, getArticleQuestions, getGuestArticleQuestions, GuestQuotaError } from '@/services/api';
import { prefetchQuiz } from '@/services/quizCache';
import type { Article } from '@/types/article';
import { useHasHover } from '@/hooks/useHasHover';

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

function renderHighlighted(text: string, ranges: HRange[], activeRange?: HRange | null): ReactNode {
  const merged = mergeRanges(ranges);
  if (!merged.length) return text;
  const parts: ReactNode[] = [];
  let cur = 0;
  for (const r of merged) {
    if (r.start > cur) parts.push(text.slice(cur, r.start));
    const isActive = activeRange && r.start === activeRange.start && r.end === activeRange.end;
    parts.push(
      <mark
        key={r.start}
        className="bg-primary/[0.14] text-primary rounded-[2px] px-[1px]"
        style={{ textDecoration: 'none' }}
        {...(isActive ? { 'data-active-mark': '' } : {})}
      >
        {text.slice(r.start, r.end)}
      </mark>
    );
    cur = r.end;
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

  // Try to find article in existing context data
  const contextArticle = articlesData?.articles.find(a => a.articleId === articleId) || null;

  const [article, setArticle] = useState<Article | null>(contextArticle);
  const [content, setContent] = useState<string | null>(null);
  const [articleViewId, setArticleViewId] = useState<number | undefined>();
  const [isLoading, setIsLoading] = useState(!contextArticle);
  const [contentLoading, setContentLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [showHeadlineTranslation, setShowHeadlineTranslation] = useState(false);
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [selectionContext, setSelectionContext] = useState<string>('');
  const [hasPassedHalf, setHasPassedHalf] = useState(false);
  const [highlightsByPara, setHighlightsByPara] = useState<Record<number, HRange[]>>({});
  const [activeSelection, setActiveSelection] = useState<{ paraIdx: number; range: HRange } | null>(null);
  const [translationPending, setTranslationPending] = useState(false);
  const [showGeneratingMsg, setShowGeneratingMsg] = useState(false);
  const [generatingMsgIdx, setGeneratingMsgIdx] = useState(0);
  const [isContentRefreshing, setIsContentRefreshing] = useState(false);
  const [showRefreshMsg, setShowRefreshMsg] = useState(false);
  const [refreshMsgIdx, setRefreshMsgIdx] = useState(0);

  const hasHover = useHasHover();
  const contentRef = useRef<HTMLDivElement>(null);
  const headlineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mouseStart = useRef<{ x: number; y: number } | null>(null);
  const wasDrag = useRef(false);
  const paragraphRefs = useRef<Record<number, HTMLParagraphElement | null>>({});
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
      setActiveSelection(null);
      setSelectedText(null);
      setSelectionContext('');
      window.getSelection()?.removeAllRanges();
    } else {
      setContentLoading(true);
    }

    setQuotaExceeded(false);

    async function fetchContent() {
      try {
        if (isAuthenticated) {
          const result = await getArticleContent(articleId);
          if (cancelled) return;
          if (result.error) setError(result.content);
          else { setContent(result.content); setArticleViewId(result.articleViewId); }
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
        } else {
          setError('Failed to load article content.');
        }
      } finally {
        if (!cancelled) {
          setContentLoading(false);
          setIsContentRefreshing(false);
          setHighlightsByPara({});
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

  const commitSelection = useCallback((text: string, ctx: string, paraIdx?: number, range?: HRange) => {
    if (paraIdx !== undefined && range) {
      setHighlightsByPara(prev => ({
        ...prev,
        [paraIdx]: [...(prev[paraIdx] || []), range],
      }));
      setActiveSelection({ paraIdx, range });
    } else {
      setActiveSelection(null);
    }
    setTranslationPending(false);
    setSelectedText(text);
    setSelectionContext(ctx);
  }, []);

  // ── Handle-driven selection change (drag to expand/contract) ────────────────

  const handleSelectionChange = useCallback((text: string, paraIdx: number, range: HRange) => {
    setActiveSelection({ paraIdx, range });
    setHighlightsByPara(prev => ({
      ...prev,
      [paraIdx]: [range],
    }));
    setSelectedText(text);
    setSelectionContext(paragraphs[paraIdx] || text);
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
    setSelectedText(null);
    setSelectionContext('');
    setActiveSelection(null);
    setTranslationPending(false);
    window.getSelection()?.removeAllRanges();
  }, []);

  const imageUrl = article?.imageLinks?.[0];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
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
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                      <path d="M12 17h.01" />
                    </svg>
                  </button>
                )}
              </div>

              <div className={`flex items-center gap-md text-body-md text-text-secondary ${quotaExceeded ? 'mb-md' : 'mb-xl'}`}>
                {article.publishedDate && <span>{article.publishedDate}</span>}
                {article.cefrLevelHeadline && (
                  <span className="bg-background px-[8px] py-[2px] rounded text-[12px] font-medium">
                    {article.cefrLevelHeadline}
                  </span>
                )}
              </div>

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
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary animate-writing">
                              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                              <path d="m15 5 4 4" />
                            </svg>
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
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary animate-writing">
                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                          <path d="m15 5 4 4" />
                        </svg>
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
                          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4A2462" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                          </svg>
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
                              <svg className="w-[20px] h-[20px] mt-[1px] flex-shrink-0 text-correct" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                              <span className="text-body-md text-primary">{feature}</span>
                            </div>
                          ))}
                        </div>

                        {/* CTA */}
                        <div className="flex justify-center">
                          <Link
                            href="/login"
                            className="btn-primary max-w-[320px] flex items-center justify-center gap-sm text-[16px]"
                          >
                            Sign Up Free — Takes 10 Seconds
                          </Link>
                        </div>

                        {/* Login link */}
                        <p className="text-body-md text-text-secondary mt-lg">
                          Already have an account?{' '}
                          <Link href="/login" className="text-primary font-medium hover:underline">
                            Log in
                          </Link>
                        </p>
                      </div>
                    </div>
                  </div>
                ) : content ? (
                  <div className="space-y-md">
                    {paragraphs.map((paragraph, index) => (
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
                          highlightsByPara[index] || [],
                          activeSelection?.paraIdx === index ? activeSelection.range : null,
                        )}
                      </p>
                    ))}
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

              {hasPassedHalf && !contentLoading && !quotaExceeded && (
                <div className="mt-xl pt-lg border-t border-border">
                  <Link
                    href={`/practice/quiz?articleId=${articleId}${articleViewId ? `&viewId=${articleViewId}` : ''}${!isAuthenticated ? '&guest=1' : ''}`}
                    className="btn-primary w-full flex items-center justify-center gap-sm"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 11l3 3L22 4" />
                      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                    </svg>
                    Article Quiz
                  </Link>
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
          onClose={closeTranslation}
          pending={translationPending}
          onTranslateRequest={handleTranslateRequest}
        />
      )}
    </>
  );
}

'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import type { Article } from '@/types/article';
import { useHasHover } from '@/hooks/useHasHover';

interface ArticleCardProps {
  article: Article;
  featured?: boolean;
  variant?: 'hero' | 'sidebar' | 'grid' | 'featured';
  topicMap?: Record<string, string>;
  subtopicMap?: Record<string, string>;
  geographyMap?: Record<string, string>;
  onArticleClick?: (articleId: string) => void;
  showTranslationHint?: boolean;
  onDismissTranslationHint?: () => void;
  hideTopicLabel?: boolean;
  isRefreshing?: boolean;
}

const refreshBlur = 'blur-[3px] select-none pointer-events-none';

export default function ArticleCard({ article, variant = 'grid', topicMap = {}, subtopicMap = {}, geographyMap = {}, onArticleClick, showTranslationHint, onDismissTranslationHint, hideTopicLabel = false, isRefreshing = false }: ArticleCardProps) {
  const [showTranslation, setShowTranslation] = useState(false);
  const [imgError, setImgError] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasHover = useHasHover();

  const imageUrl = article.imageLinks?.[0] || null;
  const topicLabel = article.topic
    ? (topicMap[article.topic] || topicMap[article.topic.toLowerCase()] || article.topic.charAt(0).toUpperCase() + article.topic.slice(1))
    : null;
  const metaText = article.subtopic
    ? (subtopicMap[article.subtopic] || article.subtopic)
    : article.geography
      ? (geographyMap[article.geography] || article.geography)
      : null;

  const handleHeadlineMouseEnter = useCallback(() => {
    if (!hasHover || !article.headlineFamiliar) return;
    hoverTimerRef.current = setTimeout(() => {
      setShowTranslation(true);
    }, 500);
  }, [hasHover, article.headlineFamiliar]);

  const handleHeadlineMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setShowTranslation(false);
  }, []);

  const toggleTranslation = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!article.headlineFamiliar) return;
    setShowTranslation(prev => !prev);
  }, [article.headlineFamiliar]);

  const showImage = imageUrl && !imgError;

  // Click handler for article navigation
  const handleClick = onArticleClick
    ? (e: React.MouseEvent) => { e.preventDefault(); onArticleClick(article.articleId); }
    : undefined;

  // HERO variant - large lead story
  if (variant === 'hero') {
    return (
      <Link
        href={`/article?id=${article.articleId}`}
        className="block no-underline group"
        onClick={handleClick}
      >
        <article className={`bg-white overflow-hidden border border-border ${article.read ? 'opacity-70' : ''}`}>
          <div className={`relative overflow-hidden h-[220px] sm:h-[300px] lg:h-[360px] ${!showImage ? 'bg-gradient-to-br from-primary/10 to-primary/5' : ''}`}>
            {showImage ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="eager"
                  onError={() => setImgError(true)}
                />
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4A2462" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="opacity-20">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
            )}
            {article.read && (
              <div className="absolute top-[10px] right-[10px] bg-correct text-white text-[11px] font-semibold px-[8px] py-[3px] rounded-full flex items-center gap-[4px]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Read
              </div>
            )}
            {showTranslationHint && (
              <div className="absolute bottom-0 left-0 right-0 flex items-center gap-[8px] px-[16px] sm:px-[20px] py-[8px] bg-primary/90 backdrop-blur-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/90 shrink-0">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                <span className="text-[12px] sm:text-[13px] text-white/90 font-medium flex-1">
                  {hasHover
                    ? 'Hover over a headline to see its translation'
                    : <>Tap <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block align-[-2px]"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></svg> next to a headline to see its translation</>
                  }
                </span>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDismissTranslationHint?.();
                  }}
                  className="p-[4px] rounded-full hover:bg-white/20 transition-colors duration-150 cursor-pointer shrink-0"
                  aria-label="Dismiss hint"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/70">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          <div className="p-[16px] sm:p-[20px]">
            <div className="flex items-center gap-[8px] mb-[8px]">
              {topicLabel && (
                <span className={`text-[11px] font-bold uppercase tracking-wider text-primary bg-primary/8 px-[8px] py-[2px] rounded ${isRefreshing ? refreshBlur : ''}`}>
                  {topicLabel}
                </span>
              )}
              {metaText && (
                <span className={`text-[11px] font-medium text-text-secondary ${isRefreshing ? refreshBlur : ''}`}>
                  {metaText}
                </span>
              )}
              {article.hoursSinceMostRecent && (
                <span className="text-[11px] text-text-secondary">{article.hoursSinceMostRecent}</span>
              )}
              {!hasHover && article.headlineFamiliar && !isRefreshing && (
                <button
                  onClick={toggleTranslation}
                  className={`ml-auto flex-shrink-0 bg-transparent border-none cursor-pointer transition-colors duration-200 ${showTranslation ? 'text-primary' : 'text-text-secondary/50'}`}
                  aria-label={showTranslation ? 'Show original' : 'Translate headline'}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <path d="M12 17h.01" />
                  </svg>
                </button>
              )}
            </div>
            <h2
              className={`relative text-[20px] sm:text-[24px] font-semibold leading-[1.25] transition-colors duration-300 overflow-hidden ${showTranslation ? 'text-primary-light' : 'text-primary'} ${isRefreshing ? refreshBlur : ''}`}
              onMouseEnter={hasHover && !isRefreshing ? handleHeadlineMouseEnter : undefined}
              onMouseLeave={hasHover && !isRefreshing ? handleHeadlineMouseLeave : undefined}
              title={hasHover && !showTranslation ? (article.headlineFamiliar || undefined) : undefined}
            >
              <span className={`line-clamp-3 ${showTranslation && !isRefreshing ? 'invisible' : ''}`} aria-hidden={showTranslation && !isRefreshing}>
                {article.headline}
              </span>
              {showTranslation && !isRefreshing && (
                <span className="absolute inset-0 line-clamp-3">{article.headlineFamiliar}</span>
              )}
            </h2>
          </div>
        </article>
      </Link>
    );
  }

  // SIDEBAR variant - horizontal compact card
  if (variant === 'sidebar') {
    return (
      <Link
        href={`/article?id=${article.articleId}`}
        className="block no-underline group flex-1"
        onClick={handleClick}
      >
        <article className={`bg-white overflow-hidden border border-border flex h-full ${article.read ? 'opacity-70' : ''}`}>
          <div className={`relative w-[130px] sm:w-[160px] shrink-0 overflow-hidden ${!showImage ? 'bg-gradient-to-br from-primary/10 to-primary/5' : ''}`}>
            {showImage ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={() => setImgError(true)}
                />
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center min-h-[100px]">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4A2462" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="opacity-20">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
            )}
            {article.read && (
              <div className="absolute top-[6px] right-[6px] w-[22px] h-[22px] bg-correct rounded-full flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            )}
          </div>
          <div className="p-[12px] flex flex-col justify-center flex-1 min-w-0">
            <div className="flex items-center gap-[6px] mb-[4px]">
              {topicLabel && (
                <span className={`text-[10px] font-bold uppercase tracking-wider text-primary ${isRefreshing ? refreshBlur : ''}`}>
                  {topicLabel}
                </span>
              )}
              {article.hoursSinceMostRecent && (
                <span className="text-[10px] text-text-secondary">{article.hoursSinceMostRecent}</span>
              )}
              {!hasHover && article.headlineFamiliar && !isRefreshing && (
                <button
                  onClick={toggleTranslation}
                  className={`ml-auto flex-shrink-0 bg-transparent border-none cursor-pointer transition-colors duration-200 ${showTranslation ? 'text-primary' : 'text-text-secondary/50'}`}
                  aria-label={showTranslation ? 'Show original' : 'Translate headline'}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <path d="M12 17h.01" />
                  </svg>
                </button>
              )}
            </div>
            <h3
              className={`relative text-[14px] sm:text-[15px] font-semibold leading-[1.3] transition-colors duration-300 overflow-hidden ${showTranslation ? 'text-primary-light' : 'text-primary'} ${isRefreshing ? refreshBlur : ''}`}
              onMouseEnter={hasHover && !isRefreshing ? handleHeadlineMouseEnter : undefined}
              onMouseLeave={hasHover && !isRefreshing ? handleHeadlineMouseLeave : undefined}
              title={hasHover && !showTranslation ? (article.headlineFamiliar || undefined) : undefined}
            >
              <span className={`line-clamp-3 ${showTranslation && !isRefreshing ? 'invisible' : ''}`} aria-hidden={showTranslation && !isRefreshing}>
                {article.headline}
              </span>
              {showTranslation && !isRefreshing && (
                <span className="absolute inset-0 line-clamp-3">{article.headlineFamiliar}</span>
              )}
            </h3>
          </div>
        </article>
      </Link>
    );
  }

  // FEATURED variant - larger card for section hero/feature layouts
  if (variant === 'featured') {
    return (
      <Link
        href={`/article?id=${article.articleId}`}
        className="block no-underline group h-full"
        onClick={handleClick}
      >
        <article className={`bg-white overflow-hidden border border-border h-full flex flex-col ${article.read ? 'opacity-70' : ''}`}>
          <div className={`relative overflow-hidden flex-1 min-h-[240px] ${!showImage ? 'bg-gradient-to-br from-primary/10 to-primary/5' : ''}`}>
            {showImage ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={() => setImgError(true)}
                />
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4A2462" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="opacity-20">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
            )}
            {article.read && (
              <div className="absolute top-[8px] right-[8px] bg-correct text-white text-[10px] font-semibold px-[6px] py-[2px] rounded-full flex items-center gap-[3px]">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Read
              </div>
            )}
          </div>
          <div className="p-[16px] flex flex-col">
            <div className="flex items-center gap-[6px] mb-[6px]">
              {hideTopicLabel ? (
                article.geography && (
                  <span className={`text-[11px] font-bold uppercase tracking-wider text-primary ${isRefreshing ? refreshBlur : ''}`}>
                    {geographyMap[article.geography] || article.geography}
                  </span>
                )
              ) : (
                topicLabel && (
                  <span className={`text-[11px] font-bold uppercase tracking-wider text-primary ${isRefreshing ? refreshBlur : ''}`}>
                    {topicLabel}
                  </span>
                )
              )}
              {article.hoursSinceMostRecent && (
                <span className="text-[11px] text-text-secondary">{article.hoursSinceMostRecent}</span>
              )}
              {!hasHover && article.headlineFamiliar && !isRefreshing && (
                <button
                  onClick={toggleTranslation}
                  className={`ml-auto flex-shrink-0 bg-transparent border-none cursor-pointer transition-colors duration-200 ${showTranslation ? 'text-primary' : 'text-text-secondary/50'}`}
                  aria-label={showTranslation ? 'Show original' : 'Translate headline'}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <path d="M12 17h.01" />
                  </svg>
                </button>
              )}
            </div>
            <h3
              className={`relative text-[16px] font-semibold leading-[1.3] transition-colors duration-300 overflow-hidden ${showTranslation ? 'text-primary-light' : 'text-primary'} ${isRefreshing ? refreshBlur : ''}`}
              onMouseEnter={hasHover && !isRefreshing ? handleHeadlineMouseEnter : undefined}
              onMouseLeave={hasHover && !isRefreshing ? handleHeadlineMouseLeave : undefined}
              title={hasHover && !showTranslation ? (article.headlineFamiliar || undefined) : undefined}
            >
              <span className={`line-clamp-3 ${showTranslation && !isRefreshing ? 'invisible' : ''}`} aria-hidden={showTranslation && !isRefreshing}>
                {article.headline}
              </span>
              {showTranslation && !isRefreshing && (
                <span className="absolute inset-0 line-clamp-3">{article.headlineFamiliar}</span>
              )}
            </h3>
            {!hideTopicLabel && metaText && (
              <span className={`text-[11px] mt-auto pt-[8px] text-text-secondary ${isRefreshing ? refreshBlur : ''}`}>
                {metaText}
              </span>
            )}
          </div>
        </article>
      </Link>
    );
  }

  // GRID variant - standard card
  return (
    <Link
      href={`/article?id=${article.articleId}`}
      className="block no-underline group"
      onClick={handleClick}
    >
      <article className={`bg-white overflow-hidden border border-border h-full flex flex-col ${article.read ? 'opacity-70' : ''}`}>
        <div className={`relative overflow-hidden h-[160px] ${!showImage ? 'bg-gradient-to-br from-primary/10 to-primary/5' : ''}`}>
          {showImage ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
                onError={() => setImgError(true)}
              />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4A2462" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="opacity-20">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
          )}
          {article.read && (
            <div className="absolute top-[8px] right-[8px] bg-correct text-white text-[10px] font-semibold px-[6px] py-[2px] rounded-full flex items-center gap-[3px]">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Read
            </div>
          )}
        </div>
        <div className="p-[12px] flex-1 flex flex-col">
          <div className="flex items-center gap-[6px] mb-[4px]">
            {hideTopicLabel ? (
              article.geography && (
                <span className={`text-[10px] font-bold uppercase tracking-wider text-primary ${isRefreshing ? refreshBlur : ''}`}>
                  {geographyMap[article.geography] || article.geography}
                </span>
              )
            ) : (
              topicLabel && (
                <span className={`text-[10px] font-bold uppercase tracking-wider text-primary ${isRefreshing ? refreshBlur : ''}`}>
                  {topicLabel}
                </span>
              )
            )}
            {article.hoursSinceMostRecent && (
              <span className="text-[10px] text-text-secondary">{article.hoursSinceMostRecent}</span>
            )}
            {!hasHover && article.headlineFamiliar && !isRefreshing && (
              <button
                onClick={toggleTranslation}
                className={`ml-auto flex-shrink-0 bg-transparent border-none cursor-pointer transition-colors duration-200 ${showTranslation ? 'text-primary' : 'text-text-secondary/50'}`}
                aria-label={showTranslation ? 'Show original' : 'Translate headline'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <path d="M12 17h.01" />
                </svg>
              </button>
            )}
          </div>
          <h3
            className={`relative text-[14px] font-semibold leading-[1.3] transition-colors duration-300 overflow-hidden ${showTranslation ? 'text-primary-light' : 'text-primary'} ${isRefreshing ? refreshBlur : ''}`}
            onMouseEnter={hasHover && !isRefreshing ? handleHeadlineMouseEnter : undefined}
            onMouseLeave={hasHover && !isRefreshing ? handleHeadlineMouseLeave : undefined}
            title={hasHover && !showTranslation ? (article.headlineFamiliar || undefined) : undefined}
          >
            <span className={`line-clamp-3 ${showTranslation && !isRefreshing ? 'invisible' : ''}`} aria-hidden={showTranslation && !isRefreshing}>
              {article.headline}
            </span>
            {showTranslation && !isRefreshing && (
              <span className="absolute inset-0 line-clamp-3">{article.headlineFamiliar}</span>
            )}
          </h3>
          {!hideTopicLabel && metaText && (
            <span className={`text-[10px] mt-auto pt-[8px] text-text-secondary ${isRefreshing ? refreshBlur : ''}`}>
              {metaText}
            </span>
          )}
        </div>
      </article>
    </Link>
  );
}

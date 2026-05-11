'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Check, Image as ImageIcon, MessageCircleQuestion, X } from 'lucide-react';
import type { Article } from '@/types/article';
import { useHasHover } from '@/hooks/useHasHover';
import { labelFromMap } from '@/lib/translationMap';
import ArticleQueueButton from '@/components/articles/ArticleQueueButton';
import { usePlayAllAudio } from '@/contexts/PlayAllAudioContext';
import { cn } from '@/lib/utils';

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

const cardBase =
  'bg-ui-card overflow-hidden border border-ui-border rounded-lg transition-shadow duration-200 hover:shadow-md';

function ImagePlaceholder({ size = 32 }: { size?: number }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-ui-primary/10 to-ui-primary/5">
      <ImageIcon className="text-ui-primary opacity-20" style={{ width: size, height: size }} strokeWidth={1} />
    </div>
  );
}

function ReadBadge({ size = 'md' }: { size?: 'sm' | 'md' }) {
  if (size === 'sm') {
    return (
      <div className="absolute top-[8px] right-[8px] bg-correct text-white text-[10px] font-semibold px-[6px] py-[2px] rounded-full flex items-center gap-[3px]">
        <Check className="w-2.5 h-2.5" strokeWidth={3} />
        Read
      </div>
    );
  }
  return (
    <div className="absolute top-[10px] right-[10px] bg-correct text-white text-[11px] font-semibold px-[8px] py-[3px] rounded-full flex items-center gap-[4px]">
      <Check className="w-3 h-3" strokeWidth={3} />
      Read
    </div>
  );
}

function TopicLabel({ label, size = 'sm', isRefreshing }: { label: string; size?: 'xs' | 'sm'; isRefreshing?: boolean }) {
  return (
    <span className={cn(
      'font-bold uppercase tracking-wider text-ui-primary',
      size === 'xs' ? 'text-[10px]' : 'text-[11px]',
      size === 'sm' && 'bg-ui-primary/10 px-2 py-0.5 rounded',
      isRefreshing && refreshBlur
    )}>
      {label}
    </span>
  );
}

function HeadlineRow({
  article,
  showTranslation,
  toggleTranslation,
  isRefreshing,
  iconSize = 14,
}: {
  article: Article;
  showTranslation: boolean;
  toggleTranslation: (e: React.MouseEvent) => void;
  isRefreshing: boolean;
  iconSize?: number;
}) {
  if (isRefreshing) return null;
  return (
    <span className="ml-auto flex items-center gap-1 shrink-0">
      <ArticleQueueButton article={article} size={iconSize >= 18 ? 'md' : 'sm'} />
      {article.headlineFamiliar && (
        <button
          onClick={toggleTranslation}
          className={cn(
            'flex-shrink-0 inline-flex items-center justify-center bg-transparent border-none cursor-pointer transition-colors duration-200 hover:text-ui-primary p-2 rounded-md',
            showTranslation ? 'text-ui-primary' : 'text-ui-muted-foreground/60'
          )}
          aria-label={showTranslation ? 'Show original' : 'Translate headline'}
        >
          <MessageCircleQuestion style={{ width: iconSize, height: iconSize }} />
        </button>
      )}
    </span>
  );
}

export default function ArticleCard({
  article,
  variant = 'grid',
  topicMap,
  subtopicMap,
  geographyMap,
  onArticleClick,
  showTranslationHint,
  onDismissTranslationHint,
  hideTopicLabel = false,
  isRefreshing = false,
}: ArticleCardProps) {
  const [showTranslation, setShowTranslation] = useState(false);
  const [imgError, setImgError] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasHover = useHasHover();
  const playAll = usePlayAllAudio();
  const isNowPlaying = playAll.isCurrentArticleInPlayAll(article.articleId) && playAll.isPlaying;
  const nowPlayingClass = isNowPlaying ? 'border-primary animate-nowPlayingGlow [animation-duration:2.5s]' : '';

  const imageUrl = article.imageLinks?.[0] || null;
  const topicLabel = labelFromMap(topicMap, article.topic);
  const metaText = article.subtopic
    ? labelFromMap(subtopicMap, article.subtopic)
    : labelFromMap(geographyMap, article.geography);
  const geoLabel = labelFromMap(geographyMap, article.geography);

  const handleHeadlineMouseEnter = useCallback(() => {
    if (!hasHover || !article.headlineFamiliar) return;
    hoverTimerRef.current = setTimeout(() => setShowTranslation(true), 500);
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
  const handleClick = onArticleClick
    ? (e: React.MouseEvent) => { e.preventDefault(); onArticleClick(article.articleId); }
    : undefined;

  const headlineProps = {
    onMouseEnter: hasHover && !isRefreshing ? handleHeadlineMouseEnter : undefined,
    onMouseLeave: hasHover && !isRefreshing ? handleHeadlineMouseLeave : undefined,
    title: hasHover && !showTranslation ? (article.headlineFamiliar || undefined) : undefined,
  };

  const headlineColor = showTranslation ? 'text-primary-light' : 'text-primary';

  if (variant === 'hero') {
    return (
      <Link href={`/article?id=${article.articleId}`} className="block no-underline group" onClick={handleClick}>
        <article className={cn(cardBase, article.read && 'opacity-70', nowPlayingClass)}>
          <div className="relative overflow-hidden h-[220px] sm:h-[300px] lg:h-[360px]">
            {showImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl!} alt="" className="w-full h-full object-cover" loading="eager" onError={() => setImgError(true)} />
            ) : (
              <ImagePlaceholder size={48} />
            )}
            {article.read && <ReadBadge />}
            {showTranslationHint && (
              <div className="absolute bottom-0 left-0 right-0 flex items-center gap-2 px-4 sm:px-5 py-2 bg-ui-primary/90 backdrop-blur-sm">
          <MessageCircleQuestion className="w-4 h-4 text-white/90 shrink-0" />
                <span className="text-[12px] sm:text-[13px] text-white/90 font-medium flex-1">
                  {hasHover
                    ? 'Hover over a headline to see its translation'
                    : <>Tap <MessageCircleQuestion className="inline w-3 h-3 align-[-2px]" /> next to a headline to see its translation</>}
                </span>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDismissTranslationHint?.(); }}
                  className="p-2 -m-1 rounded-full hover:bg-white/20 transition-colors duration-150 cursor-pointer shrink-0 inline-flex items-center justify-center"
                  aria-label="Dismiss hint"
                >
                  <X className="w-3.5 h-3.5 text-white/70" />
                </button>
              </div>
            )}
          </div>
          <div className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-2 min-w-0">
              <div className="article-card-meta-left flex min-w-0 flex-1 items-center gap-2">
                {topicLabel && <TopicLabel label={topicLabel} isRefreshing={isRefreshing} />}
                {metaText && (
                  <span className={cn('text-[11px] font-medium text-ui-muted-foreground truncate', isRefreshing && refreshBlur)}>
                    {metaText}
                  </span>
                )}
                {article.hoursSinceMostRecent && (
                  <span className="article-time-label shrink-0 whitespace-nowrap text-[11px] text-ui-muted-foreground hidden sm:inline">
                    {article.hoursSinceMostRecent}
                  </span>
                )}
              </div>
              <HeadlineRow article={article} showTranslation={showTranslation} toggleTranslation={toggleTranslation} isRefreshing={isRefreshing} iconSize={18} />
            </div>
            <h2
              className={cn(
                'relative text-[20px] sm:text-[24px] font-semibold leading-[1.25] transition-colors duration-300 overflow-hidden',
                headlineColor,
                isRefreshing && refreshBlur
              )}
              {...headlineProps}
            >
              <span className={cn('line-clamp-3', showTranslation && !isRefreshing && 'invisible')} aria-hidden={showTranslation && !isRefreshing}>
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

  if (variant === 'sidebar') {
    return (
      <Link href={`/article?id=${article.articleId}`} className="block no-underline group flex-1" onClick={handleClick}>
        <article className={cn(cardBase, 'flex h-full', article.read && 'opacity-70', nowPlayingClass)}>
          <div className="relative w-[130px] sm:w-[160px] shrink-0 overflow-hidden">
            {showImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl!} alt="" className="w-full h-full object-cover" loading="lazy" onError={() => setImgError(true)} />
            ) : (
              <ImagePlaceholder size={28} />
            )}
            {article.read && (
              <div className="absolute top-1.5 right-1.5 w-[22px] h-[22px] bg-correct rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-white" strokeWidth={3} />
              </div>
            )}
          </div>
          <div className="p-3 flex flex-col justify-center flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1 min-w-0">
              <div className="article-card-meta-left flex min-w-0 flex-1 items-center gap-1.5">
                {topicLabel && <TopicLabel label={topicLabel} size="xs" isRefreshing={isRefreshing} />}
                {article.hoursSinceMostRecent && (
                  <span className="article-time-label shrink-0 whitespace-nowrap text-[10px] text-ui-muted-foreground hidden sm:inline">
                    {article.hoursSinceMostRecent}
                  </span>
                )}
              </div>
              <HeadlineRow article={article} showTranslation={showTranslation} toggleTranslation={toggleTranslation} isRefreshing={isRefreshing} iconSize={14} />
            </div>
            <h3
              className={cn(
                'relative text-[14px] sm:text-[15px] font-semibold leading-[1.3] transition-colors duration-300 overflow-hidden',
                headlineColor,
                isRefreshing && refreshBlur
              )}
              {...headlineProps}
            >
              <span className={cn('line-clamp-3', showTranslation && !isRefreshing && 'invisible')} aria-hidden={showTranslation && !isRefreshing}>
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

  if (variant === 'featured') {
    return (
      <Link href={`/article?id=${article.articleId}`} className="block no-underline group h-full" onClick={handleClick}>
        <article className={cn(cardBase, 'h-full flex flex-col', article.read && 'opacity-70', nowPlayingClass)}>
          <div className="relative overflow-hidden flex-1 min-h-[240px]">
            {showImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl!} alt="" className="w-full h-full object-cover" loading="lazy" onError={() => setImgError(true)} />
            ) : (
              <ImagePlaceholder size={40} />
            )}
            {article.read && <ReadBadge size="sm" />}
          </div>
          <div className="p-4 flex flex-col">
            <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
              <div className="article-card-meta-left flex min-w-0 flex-1 items-center gap-1.5">
                {hideTopicLabel
                  ? geoLabel && <TopicLabel label={geoLabel} size="xs" isRefreshing={isRefreshing} />
                  : topicLabel && <TopicLabel label={topicLabel} size="xs" isRefreshing={isRefreshing} />}
                {article.hoursSinceMostRecent && (
                  <span className="article-time-label shrink-0 whitespace-nowrap text-[11px] text-ui-muted-foreground hidden sm:inline">
                    {article.hoursSinceMostRecent}
                  </span>
                )}
              </div>
              <HeadlineRow article={article} showTranslation={showTranslation} toggleTranslation={toggleTranslation} isRefreshing={isRefreshing} iconSize={14} />
            </div>
            <h3
              className={cn(
                'relative text-[16px] font-semibold leading-[1.3] transition-colors duration-300 overflow-hidden',
                headlineColor,
                isRefreshing && refreshBlur
              )}
              {...headlineProps}
            >
              <span className={cn('line-clamp-3', showTranslation && !isRefreshing && 'invisible')} aria-hidden={showTranslation && !isRefreshing}>
                {article.headline}
              </span>
              {showTranslation && !isRefreshing && (
                <span className="absolute inset-0 line-clamp-3">{article.headlineFamiliar}</span>
              )}
            </h3>
            {!hideTopicLabel && metaText && (
              <span className={cn('text-[11px] mt-auto pt-2 text-ui-muted-foreground truncate', isRefreshing && refreshBlur)}>
                {metaText}
              </span>
            )}
          </div>
        </article>
      </Link>
    );
  }

  return (
    <Link href={`/article?id=${article.articleId}`} className="block no-underline group" onClick={handleClick}>
      <article className={cn(cardBase, 'h-full flex flex-col', article.read && 'opacity-70', nowPlayingClass)}>
        <div className="relative overflow-hidden h-[160px]">
          {showImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl!} alt="" className="w-full h-full object-cover" loading="lazy" onError={() => setImgError(true)} />
          ) : (
            <ImagePlaceholder />
          )}
          {article.read && <ReadBadge size="sm" />}
        </div>
        <div className="p-3 flex-1 flex flex-col">
            <div className="flex items-center gap-1.5 mb-1 min-w-0">
              <div className="article-card-meta-left flex min-w-0 flex-1 items-center gap-1.5">
                {hideTopicLabel
                  ? geoLabel && <TopicLabel label={geoLabel} size="xs" isRefreshing={isRefreshing} />
                  : topicLabel && <TopicLabel label={topicLabel} size="xs" isRefreshing={isRefreshing} />}
                {article.hoursSinceMostRecent && (
                  <span className="article-time-label shrink-0 whitespace-nowrap text-[10px] text-ui-muted-foreground hidden sm:inline">
                    {article.hoursSinceMostRecent}
                  </span>
                )}
              </div>
            <HeadlineRow article={article} showTranslation={showTranslation} toggleTranslation={toggleTranslation} isRefreshing={isRefreshing} iconSize={14} />
          </div>
          <h3
            className={cn(
              'relative text-[14px] font-semibold leading-[1.3] transition-colors duration-300 overflow-hidden',
              headlineColor,
              isRefreshing && refreshBlur
            )}
            {...headlineProps}
          >
            <span className={cn('line-clamp-3', showTranslation && !isRefreshing && 'invisible')} aria-hidden={showTranslation && !isRefreshing}>
              {article.headline}
            </span>
            {showTranslation && !isRefreshing && (
              <span className="absolute inset-0 line-clamp-3">{article.headlineFamiliar}</span>
            )}
          </h3>
          {!hideTopicLabel && metaText && (
            <span className={cn('text-[10px] mt-auto pt-2 text-ui-muted-foreground', isRefreshing && refreshBlur)}>
              {metaText}
            </span>
          )}
        </div>
      </article>
    </Link>
  );
}

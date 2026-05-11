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

/** Shared text block: topic/geography top row, headline left, actions stacked on the right. */
function CardTextStack({
  article,
  hideTopicLabel,
  topicLabel,
  geoLabel,
  isRefreshing,
  showTranslation,
  toggleTranslation,
  iconSize,
  headlineSizeClass,
  headlineClampClass = 'line-clamp-3',
  onHeadlineMouseEnter,
  onHeadlineMouseLeave,
}: {
  article: Article;
  hideTopicLabel: boolean;
  topicLabel: string | null;
  geoLabel: string | null;
  isRefreshing: boolean;
  showTranslation: boolean;
  toggleTranslation: (e: React.MouseEvent) => void;
  iconSize: number;
  headlineSizeClass: string;
  headlineClampClass?: string;
  onHeadlineMouseEnter?: () => void;
  onHeadlineMouseLeave?: () => void;
}) {
  const primaryLeft = hideTopicLabel ? article.hoursSinceMostRecent : topicLabel;

  return (
    <div className="flex flex-1 min-w-0 flex-col">
      <div className={cn('mb-1 flex items-start justify-between gap-3 text-[11px]', isRefreshing && refreshBlur)}>
        {primaryLeft ? (
          <span
            className={cn(
              hideTopicLabel
                ? 'font-medium text-ui-muted-foreground'
                : 'font-bold uppercase tracking-wider text-ui-primary',
            )}
          >
            {primaryLeft}
          </span>
        ) : (
          <span />
        )}
        {geoLabel && (
          <span className="text-right font-medium uppercase tracking-wider text-ui-muted-foreground">
            {geoLabel}
          </span>
        )}
      </div>

      <div className="flex flex-1 min-w-0 items-center gap-2">
        <h3
          className={cn(
            'relative min-w-0 flex-1 font-semibold leading-[1.25] transition-colors duration-300',
            headlineSizeClass,
            showTranslation ? 'text-primary-light' : 'text-primary',
            isRefreshing && refreshBlur,
          )}
          title={showTranslation ? undefined : (article.headlineFamiliar || undefined)}
          onMouseEnter={onHeadlineMouseEnter}
          onMouseLeave={onHeadlineMouseLeave}
        >
          <span className={cn(headlineClampClass, showTranslation && !isRefreshing && 'invisible')} aria-hidden={showTranslation && !isRefreshing}>
            {article.headline}
          </span>
          {showTranslation && !isRefreshing && (
            <span className={cn('absolute inset-0', headlineClampClass)}>{article.headlineFamiliar}</span>
          )}
        </h3>

        <HeadlineRow
          article={article}
          showTranslation={showTranslation}
          toggleTranslation={toggleTranslation}
          isRefreshing={isRefreshing}
          iconSize={iconSize}
          layout="column"
        />
      </div>
    </div>
  );
}

function HeadlineRow({
  article,
  showTranslation,
  toggleTranslation,
  isRefreshing,
  iconSize = 14,
  layout = 'row',
}: {
  article: Article;
  showTranslation: boolean;
  toggleTranslation: (e: React.MouseEvent) => void;
  isRefreshing: boolean;
  iconSize?: number;
  layout?: 'row' | 'mobile-column' | 'column';
}) {
  if (isRefreshing) return null;
  // Mobile-first sizing for the translate icon so the tap target is at
  // least ~44px on touch screens, while desktop keeps the compact size
  // that matches the surrounding metadata text.
  const isHero = iconSize >= 18;
  const translateIconClass = isHero
    ? 'w-[20px] h-[20px]'
    : 'w-[18px] h-[18px]';
  
  const isColumn = layout === 'column';

  return (
    <span className={cn(
      'flex shrink-0 items-center',
      isColumn
        ? 'h-[96px] flex-col justify-center gap-0'
        : layout === 'mobile-column'
          ? 'ml-0 flex-col gap-0 sm:ml-auto sm:flex-row sm:gap-1'
          : 'ml-auto gap-1',
    )}>
      <ArticleQueueButton article={article} size={isHero ? 'md' : 'sm'} layout={layout} />
      {article.headlineFamiliar && (
        <button
          onClick={toggleTranslation}
          className={cn(
            'flex-shrink-0 inline-flex items-center justify-center bg-transparent border-none cursor-pointer transition-colors duration-200 hover:text-ui-primary rounded-md',
            isColumn ? 'p-1.5' : (layout === 'mobile-column' ? 'p-2.5' : 'p-3 sm:p-2'),
            showTranslation ? 'text-ui-primary' : 'text-ui-muted-foreground/60'
          )}
          aria-label={showTranslation ? 'Show original' : 'Translate headline'}
        >
          <MessageCircleQuestion className={translateIconClass} />
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
          <div className="p-3.5 sm:p-4 flex flex-col">
            <CardTextStack
              article={article}
              hideTopicLabel={hideTopicLabel}
              topicLabel={topicLabel}
              geoLabel={geoLabel}
              isRefreshing={isRefreshing}
              showTranslation={showTranslation}
              toggleTranslation={toggleTranslation}
              iconSize={18}
              headlineSizeClass="text-[20px] sm:text-[24px]"
              onHeadlineMouseEnter={headlineProps.onMouseEnter}
              onHeadlineMouseLeave={headlineProps.onMouseLeave}
            />
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
          <div className="p-2.5 flex flex-1 min-w-0 flex-col">
            <CardTextStack
              article={article}
              hideTopicLabel={hideTopicLabel}
              topicLabel={topicLabel}
              geoLabel={geoLabel}
              isRefreshing={isRefreshing}
              showTranslation={showTranslation}
              toggleTranslation={toggleTranslation}
              iconSize={14}
              headlineSizeClass="text-[14px] sm:text-[15px]"
              headlineClampClass="line-clamp-4"
              onHeadlineMouseEnter={headlineProps.onMouseEnter}
              onHeadlineMouseLeave={headlineProps.onMouseLeave}
            />
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
          <div className="p-3.5 flex flex-col flex-1">
            <CardTextStack
              article={article}
              hideTopicLabel={hideTopicLabel}
              topicLabel={topicLabel}
              geoLabel={geoLabel}
              isRefreshing={isRefreshing}
              showTranslation={showTranslation}
              toggleTranslation={toggleTranslation}
              iconSize={14}
              headlineSizeClass="text-[16px]"
              onHeadlineMouseEnter={headlineProps.onMouseEnter}
              onHeadlineMouseLeave={headlineProps.onMouseLeave}
            />
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
        <div className="p-2.5 flex-1 flex flex-col">
          <CardTextStack
            article={article}
            hideTopicLabel={hideTopicLabel}
            topicLabel={topicLabel}
            geoLabel={geoLabel}
            isRefreshing={isRefreshing}
            showTranslation={showTranslation}
            toggleTranslation={toggleTranslation}
            iconSize={14}
            headlineSizeClass="text-[16px]"
            onHeadlineMouseEnter={headlineProps.onMouseEnter}
            onHeadlineMouseLeave={headlineProps.onMouseLeave}
          />
        </div>
      </article>
    </Link>
  );
}

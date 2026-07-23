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

type CardVariant = 'hero' | 'sidebar' | 'grid' | 'featured' | 'carousel';

interface CardTypography {
  headline: string;
  headlineClamp?: string;
  meta: string;
}

/** Single typography scale for article cards — one font family, three headline tiers. */
const CARD_TYPOGRAPHY: Record<CardVariant, CardTypography> = {
  hero: {
    headline: 'text-headline-sm sm:text-display-sm lg:text-display-md',
    meta: 'text-label-sm',
  },
  featured: {
    headline: 'text-title-lg sm:text-headline-md',
    headlineClamp: 'line-clamp-4',
    meta: 'text-label-sm',
  },
  sidebar: {
    headline: 'text-title-md',
    headlineClamp: 'line-clamp-4',
    meta: 'text-label-sm',
  },
  grid: {
    headline: 'text-title-md',
    meta: 'text-label-sm',
  },
  carousel: {
    headline: 'text-title-md',
    headlineClamp: 'line-clamp-2',
    meta: 'text-label-sm',
  },
};

/** Desktop-only: larger clamp headline for tall featured text wells (hero-left/right, Entertainment). */
const FEATURED_DESKTOP_FILL_TYPOGRAPHY: CardTypography = {
  headline: 'text-title-lg sm:text-headline-md lg:text-[clamp(24px,2vw,32px)] lg:leading-[1.18]',
  headlineClamp: 'line-clamp-4',
  meta: 'text-label-sm',
};

interface ArticleCardProps {
  article: Article;
  featured?: boolean;
  variant?: CardVariant;
  topicMap?: Record<string, string>;
  subtopicMap?: Record<string, string>;
  geographyMap?: Record<string, string>;
  onArticleClick?: (articleId: string) => void;
  showTranslationHint?: boolean;
  onDismissTranslationHint?: () => void;
  hideTopicLabel?: boolean;
  isRefreshing?: boolean;
  /** Desktop-only: scale headline to fill a tall featured-card text well. */
  featuredDesktopFill?: boolean;
  /** When set, disables outer Link (e.g. carousel slide parent handles navigation). */
  disableLink?: boolean;
  /** Optional className on the interactive wrapper (card root). */
  className?: string;
}

const refreshBlur = 'blur-[3px] select-none pointer-events-none';

/** Squared corners; subtle border/shadow match app chrome. */
const cardBase =
  'bg-ui-card overflow-hidden border border-ui-border rounded-none shadow-[0_2px_4px_rgba(0,0,0,0.04)] transition-colors duration-200 hover:border-primary/25 antialiased';

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
      <div className="absolute top-[8px] right-[8px] bg-correct text-white text-label-sm px-[6px] py-[2px] rounded-full flex items-center gap-[3px] pointer-events-none">
        <Check className="w-2.5 h-2.5" strokeWidth={3} />
        Read
      </div>
    );
  }
  return (
    <div className="absolute top-[10px] right-[10px] bg-correct text-white text-label-sm px-[8px] py-[3px] rounded-full flex items-center gap-[4px] pointer-events-none">
      <Check className="w-3 h-3" strokeWidth={3} />
      Read
    </div>
  );
}

/** Shared text block: meta row, headline left, actions column on the right. */
function CardTextStack({
  article,
  hideTopicLabel,
  topicLabel,
  rightMetaLabel,
  isRefreshing,
  showTranslation,
  toggleTranslation,
  queueButtonSize,
  typography,
  fillTextArea = false,
  onHeadlineMouseEnter,
  onHeadlineMouseLeave,
}: {
  article: Article;
  hideTopicLabel: boolean;
  topicLabel: string | null;
  rightMetaLabel: string | null;
  isRefreshing: boolean;
  showTranslation: boolean;
  toggleTranslation: (e: React.MouseEvent) => void;
  queueButtonSize: 'md' | 'sm';
  typography: CardTypography;
  fillTextArea?: boolean;
  onHeadlineMouseEnter?: () => void;
  onHeadlineMouseLeave?: () => void;
}) {
  const primaryLeft = hideTopicLabel ? article.hoursSinceMostRecent : topicLabel;
  const headlineClampClass = typography.headlineClamp ?? 'line-clamp-3';

  return (
    <div className="flex shrink-0 min-w-0 flex-col">
      <div
        className={cn(
          'mb-[6px] flex shrink-0 items-center justify-between gap-2 overflow-hidden leading-none',
          'min-h-[12px]',
          typography.meta,
          isRefreshing && refreshBlur,
        )}
      >
        {primaryLeft ? (
          <span
            className={cn(
              'min-w-0 flex-1 truncate',
              hideTopicLabel
                ? 'normal-case font-normal text-ui-muted-foreground'
                : 'uppercase font-semibold tracking-[0.06em] text-ui-primary',
            )}
          >
            {primaryLeft}
          </span>
        ) : (
          <span className="min-w-0 flex-1 shrink" />
        )}
        {rightMetaLabel ? (
          <span
            className="max-w-[55%] min-w-0 shrink-0 truncate text-right uppercase font-medium tracking-[0.06em] text-ui-muted-foreground"
            title={rightMetaLabel}
          >
            {rightMetaLabel}
          </span>
        ) : null}
      </div>

      <div className="flex min-w-0 items-center gap-2">
        <h3
          className={cn(
            'relative min-w-0 flex-1 font-semibold transition-colors duration-300',
            typography.headline,
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
          queueButtonSize={queueButtonSize}
          layout="column"
          fillTextArea={fillTextArea}
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
  queueButtonSize = 'sm',
  layout = 'row',
  fillTextArea = false,
}: {
  article: Article;
  showTranslation: boolean;
  toggleTranslation: (e: React.MouseEvent) => void;
  isRefreshing: boolean;
  queueButtonSize?: 'md' | 'sm';
  layout?: 'row' | 'mobile-column' | 'column';
  fillTextArea?: boolean;
}) {
  if (isRefreshing) return null;

  const isHeroIcons = queueButtonSize === 'md';
  const translateIconClass = isHeroIcons ? 'w-[22px] h-[22px]' : 'w-[20px] h-[20px]';

  const isColumn = layout === 'column';

  // Fixed 3-slot column (play / queue / translate). Content is vertically
  // centered so 2-button and 3-button states share the same card height;
  // the queue slot animates open/closed and the siblings ease with it.
  return (
    <span className={cn(
      'flex shrink-0 items-center',
      isColumn
        ? 'h-[90px] flex-col justify-center gap-0'
        : layout === 'mobile-column'
          ? 'ml-0 flex-col gap-0 sm:ml-auto sm:flex-row sm:gap-1'
          : 'ml-auto gap-1',
    )}>
      <ArticleQueueButton article={article} size={queueButtonSize === 'md' ? 'md' : 'sm'} layout={layout} />
      {article.headlineFamiliar && (
        <button
          onClick={toggleTranslation}
          className={cn(
            'flex-shrink-0 inline-flex items-center justify-center w-[34px] h-[30px] bg-transparent border-none cursor-pointer rounded-md p-0',
            'transition-[color,transform] duration-300 ease-out',
            showTranslation ? 'text-ui-primary' : 'text-ui-muted-foreground/60',
            'hover:text-ui-primary',
          )}
          aria-label={showTranslation ? 'Show original' : 'Translate headline'}
        >
          <MessageCircleQuestion className={translateIconClass} strokeWidth={1.75} />
        </button>
      )}
    </span>
  );
}

function CardChrome({
  children,
  className,
  article,
  nowPlayingClass,
}: {
  children: React.ReactNode;
  className?: string;
  article: Article;
  nowPlayingClass?: string;
}) {
  return (
    <article
      className={cn(cardBase, className, article.read && 'opacity-70', nowPlayingClass)}
    >
      {children}
    </article>
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
  featuredDesktopFill = false,
  disableLink = false,
  className,
}: ArticleCardProps) {
  const [showTranslation, setShowTranslation] = useState(false);
  const [imgError, setImgError] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasHover = useHasHover();
  const playAll = usePlayAllAudio();
  const isNowPlaying = playAll.isCurrentArticleInPlayAll(article.articleId) && playAll.isPlaying;
  // Outline (not border) so the playing card's layout stays pixel-identical
  // to its siblings; negative offset draws the ring just inside the card edge.
  const nowPlayingClass = isNowPlaying
    ? 'outline outline-2 -outline-offset-2 outline-primary animate-nowPlayingGlow [animation-duration:2.5s]'
    : '';

  const imageUrl = article.imageLinks?.[0] || null;
  const topicLabel = labelFromMap(topicMap, article.topic);
  const geoLabel = labelFromMap(geographyMap, article.geography);
  const subtopicLabel = labelFromMap(subtopicMap, article.subtopic);
  const rightMetaLabel = subtopicLabel || geoLabel;

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

  const heroTypography = CARD_TYPOGRAPHY.hero;
  const featuredTypography = featuredDesktopFill
    ? FEATURED_DESKTOP_FILL_TYPOGRAPHY
    : CARD_TYPOGRAPHY.featured;
  const sidebarTypography = CARD_TYPOGRAPHY.sidebar;
  const gridTypography = CARD_TYPOGRAPHY.grid;
  const carouselTypography = CARD_TYPOGRAPHY.carousel;

  const sharedTextStackProps = {
    article,
    hideTopicLabel,
    topicLabel,
    rightMetaLabel,
    isRefreshing,
    showTranslation,
    toggleTranslation,
    onHeadlineMouseEnter: headlineProps.onMouseEnter,
    onHeadlineMouseLeave: headlineProps.onMouseLeave,
  };

  const inner = variant === 'hero' ? (
    <>
      <div className="relative overflow-hidden h-[220px] sm:h-[300px] lg:flex-[1_1_auto] lg:min-h-0 lg:h-auto">
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
                <span className="text-label-md sm:text-body-sm text-white/90 font-medium flex-1">
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
          <div className="p-[14px] sm:p-4 lg:p-[18px] flex flex-col shrink-0 lg:shrink-0">
            <CardTextStack
              {...sharedTextStackProps}
              queueButtonSize="md"
              typography={heroTypography}
            />
          </div>
    </>
  ) : variant === 'sidebar' ? (
    <>
      <div className="relative h-[132px] w-[130px] shrink-0 overflow-hidden lg:w-[160px]">
            {showImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl!} alt="" className="h-full w-full object-cover" loading="lazy" onError={() => setImgError(true)} />
            ) : (
              <ImagePlaceholder size={28} />
            )}
            {article.read && <ReadBadge size="sm" />}
          </div>
          <div className="flex flex-1 min-w-0 flex-col justify-center p-[10px] sm:p-[10px]">
            <CardTextStack
              {...sharedTextStackProps}
              queueButtonSize="sm"
              typography={sidebarTypography}
            />
          </div>
    </>
  ) : variant === 'featured' ? (
    <>
          <div className={cn(
            'relative shrink-0 overflow-hidden',
            featuredDesktopFill
              ? 'h-[240px] lg:min-h-[280px] lg:flex-1 lg:h-auto'
              : 'h-[240px] min-h-[240px] lg:flex-none',
          )}>
            {showImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl!} alt="" className="w-full h-full object-cover" loading="lazy" onError={() => setImgError(true)} />
            ) : (
              <ImagePlaceholder size={40} />
            )}
            {article.read && <ReadBadge size="sm" />}
          </div>
          <div className="flex shrink-0 flex-col justify-center p-[12px] sm:p-[14px] lg:min-h-[112px] lg:p-[14px]">
            <CardTextStack
              {...sharedTextStackProps}
              queueButtonSize="sm"
              typography={featuredTypography}
              fillTextArea={featuredDesktopFill}
            />
          </div>
    </>
  ) : variant === 'carousel' ? (
    <>
          <div className="relative h-[140px] shrink-0 overflow-hidden">
            {showImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl!} alt="" className="h-full w-full object-cover" loading="lazy" onError={() => setImgError(true)} />
            ) : (
              <ImagePlaceholder />
            )}
            {article.read && <ReadBadge size="sm" />}
          </div>
          <div className="flex flex-1 flex-col p-[10px]">
            <CardTextStack
              {...sharedTextStackProps}
              queueButtonSize="sm"
              typography={carouselTypography}
            />
          </div>
    </>
  ) : (
    <>
        <div className="relative h-[160px] lg:h-[192px] shrink-0 overflow-hidden">
          {showImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl!} alt="" className="h-full w-full object-cover" loading="lazy" onError={() => setImgError(true)} />
          ) : (
            <ImagePlaceholder />
          )}
          {article.read && <ReadBadge size="sm" />}
        </div>
        <div className="flex shrink-0 flex-col justify-center p-[10px] lg:min-h-[112px] lg:p-[12px]">
          <CardTextStack
            {...sharedTextStackProps}
            queueButtonSize="sm"
            typography={gridTypography}
          />
        </div>
    </>
  );

  const chromeClass =
    variant === 'hero'
      ? cn('lg:flex lg:h-full lg:flex-col', className)
      : variant === 'sidebar'
        ? cn('flex h-full', className)
        : variant === 'featured'
          ? cn('flex h-full flex-col', featuredDesktopFill && 'lg:h-full lg:min-h-0', className)
          : variant === 'carousel'
            ? cn('flex h-full flex-col', className)
            : cn('flex h-full flex-col lg:h-auto', className);

  if (disableLink) {
    return (
      <div className={cn(
        'block no-underline group',
        variant === 'hero' && 'lg:h-full',
        featuredDesktopFill && variant === 'featured' && 'lg:h-full',
      )}>
        <CardChrome article={article} nowPlayingClass={nowPlayingClass} className={chromeClass}>
          {inner}
        </CardChrome>
      </div>
    );
  }

  return (
    <Link href={`/article?id=${article.articleId}`} className={cn('block no-underline group', variant === 'hero' && 'lg:h-full', variant === 'sidebar' && 'flex-1', featuredDesktopFill && variant === 'featured' && 'lg:h-full')} onClick={handleClick}>
      <CardChrome article={article} nowPlayingClass={nowPlayingClass} className={chromeClass}>
        {inner}
      </CardChrome>
    </Link>
  );
}

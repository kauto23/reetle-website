'use client';

import { useState, useEffect, useMemo, useCallback, useRef, Suspense, type CSSProperties } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ArticleCard from '@/components/articles/ArticleCard';
import ArticleDetail from '@/components/articles/ArticleDetail';
import AppStoreCTA from '@/components/layout/AppStoreCTA';
import ReferralCTA from '@/components/layout/ReferralCTA';
import ScrollableNav from '@/components/layout/ScrollableNav';
import TopicNav from '@/components/layout/TopicNav';
import { CATEGORY_ORDER } from '@/config/categories';
import { SHOW_APP_STORE_PROMO, heroRowArticleCount } from '@/config/site-promos';
import { useArticles } from '@/contexts/ArticlesContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useReferral } from '@/contexts/ReferralContext';
import { prefetchPracticeQuestion } from '@/services/practiceCache';
import { labelFromMap } from '@/lib/translationMap';
import type { Article } from '@/types/article';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TRANSLATION_HINT_KEY = 'reetle-translation-hint-dismissed';

export default function HomePage() {
  return (
    <Suspense>
      <HomePageContent />
    </Suspense>
  );
}

function HomePageContent() {
  const { articlesData, isLoading, isRefreshing, error, fetchArticles } = useArticles();
  const { isAuthenticated, hasApp } = useAuth();
  const { isPremium } = useSubscription();
  const { code: referralCode, isBannerDismissed: referralDismissed } = useReferral();
  const showReferralCta = Boolean(referralCode) && !isPremium && !referralDismissed;
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedArticleId = searchParams.get('article');
  const [translationHintDismissed, setTranslationHintDismissed] = useState(true);
  const [sectionSubtopicFilters, setSectionSubtopicFilters] = useState<Record<string, string | null>>({});
  const [activeSectionTopic, setActiveSectionTopic] = useState<string | null>(null);

  const MAX_ARTICLES_PER_SECTION = 8;

  useEffect(() => {
    const dismissed = localStorage.getItem(TRANSLATION_HINT_KEY);
    setTranslationHintDismissed(!!dismissed);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || isLoading || !articlesData) return;
    const schedule = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 200));
    const id = schedule(() => prefetchPracticeQuestion());
    return () => {
      if (window.cancelIdleCallback) window.cancelIdleCallback(id as number);
    };
  }, [isAuthenticated, isLoading, articlesData]);

  const showTranslationHint = !isAuthenticated && !translationHintDismissed;

  const handleDismissTranslationHint = useCallback(() => {
    localStorage.setItem(TRANSLATION_HINT_KEY, 'true');
    setTranslationHintDismissed(true);
  }, []);

  const openArticle = useCallback((articleId: string) => {
    router.push(`/?article=${encodeURIComponent(articleId)}`, { scroll: false });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [router]);

  const allArticles = useMemo(() => articlesData?.articles ?? [], [articlesData]);
  const heroCount = heroRowArticleCount(hasApp, showReferralCta);
  const showAppStoreCta = !hasApp && SHOW_APP_STORE_PROMO;
  const heroSidebarArticles = allArticles.slice(1, heroCount);
  const heroSidebarSlotCount = heroSidebarArticles.length + (showReferralCta ? 1 : 0) + (showAppStoreCta ? 1 : 0);
  const heroRowDesktopStyle = heroSidebarSlotCount > 1
    ? ({ '--hero-row-height': `${heroSidebarSlotCount * 132 + (heroSidebarSlotCount - 1) * 16}px` } as CSSProperties)
    : undefined;

  const articlesByTopic = useMemo(() => {
    // Keep in sync with the sidebar slice: when the referral CTA takes a
    // sidebar slot, the displaced article should promote into its topic
    // section instead of disappearing. When the CTA is dismissed, the same
    // article flows back into the sidebar.
    const remaining = allArticles.slice(heroCount);
    const grouped: Record<string, Article[]> = {};
    for (const article of remaining) {
      const topicKey = CATEGORY_ORDER.find(
        c => c.toLowerCase() === article.topic.toLowerCase()
      ) || article.topic;
      if (!grouped[topicKey]) grouped[topicKey] = [];
      grouped[topicKey].push(article);
    }
    return CATEGORY_ORDER
      .filter(cat => grouped[cat] && grouped[cat].length > 0)
      .map(cat => {
        const articles = grouped[cat];
        const subSet = new Set(articles.map(a => a.subtopic).filter(Boolean) as string[]);
        const subs = Array.from(subSet).sort();
        return { topic: cat, articles, subtopics: subs };
      });
  }, [allArticles, heroCount]);

  // Track which topic section is currently sticky at the top of the viewport so
  // we can mirror the underline in the sticky TopicNav as the user scrolls.
  useEffect(() => {
    if (selectedArticleId) {
      setActiveSectionTopic(null);
      return;
    }

    let rafId: number | null = null;

    const computeActive = () => {
      rafId = null;
      const sections = document.querySelectorAll<HTMLElement>('.topic-section[data-topic]');
      if (sections.length === 0) {
        setActiveSectionTopic(null);
        return;
      }

      // The TopicNav sits at top:48px with height ~48px, so sticky section
      // headers begin at ~93px. Treat a section as "active" once its top
      // has crossed the sticky boundary but its bottom hasn't yet.
      const threshold = 94;
      let current: string | null = null;

      for (const section of Array.from(sections)) {
        const rect = section.getBoundingClientRect();
        if (rect.top <= threshold && rect.bottom > threshold) {
          current = section.getAttribute('data-topic');
          break;
        }
      }

      setActiveSectionTopic(current);
    };

    const onScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(computeActive);
    };

    computeActive();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [selectedArticleId, articlesData]);

  const scrollSectionIntoView = useCallback((topic: string, sectionRefs: Record<string, HTMLDivElement | null>) => {
    requestAnimationFrame(() => {
      const sectionEl = sectionRefs[topic];
      if (!sectionEl) return;
      const headerOffset = 94;
      const elementPosition = sectionEl.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: elementPosition - headerOffset,
        behavior: 'smooth',
      });
    });
  }, []);

  return (
    <>
      <TopicNav activeSectionTopic={activeSectionTopic} />

      {selectedArticleId ? (
        <ArticleDetail
          key={selectedArticleId}
          articleId={selectedArticleId}
        />
      ) : (
        <section className="py-[24px]">
          <div className="max-w-[1280px] mx-auto px-md">
            {(isLoading || !articlesData) && !error && (
              <div className="space-y-[24px] max-h-[calc(100vh-140px)] overflow-hidden select-none opacity-60">
                {/* Hero + sidebar skeleton (no text — awaiting API) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-[24px]">
                  <div className="lg:col-span-7">
                    <div className="bg-ui-card overflow-hidden border border-border">
                      <div className="relative overflow-hidden h-[220px] sm:h-[300px] lg:h-[360px] bg-gradient-to-br from-gray-300 via-gray-200 to-gray-300 blur-[8px] scale-[1.05]" />
                      <div className="p-[16px] sm:p-[20px] blur-[5px]">
                        <div className="flex items-center gap-[8px] mb-[8px]">
                          <span className="h-[12px] w-[48px] rounded-sm bg-primary/20" />
                          <span className="h-[12px] w-[72px] rounded-sm bg-text-secondary/20" />
                          <span className="h-[10px] w-[22px] rounded-sm bg-text-secondary/20" />
                        </div>
                        <div className="space-y-[6px]">
                          <div className="h-[20px] w-full max-w-[95%] rounded-sm bg-primary/10" />
                          <div className="h-[20px] w-[60%] rounded-sm bg-primary/10" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="lg:col-span-5">
                    <div className="flex flex-col gap-[16px] h-full">
                      {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="bg-ui-card overflow-hidden border border-border flex h-full flex-1">
                          <div className="relative w-[130px] sm:w-[160px] shrink-0 overflow-hidden bg-gradient-to-br from-gray-300 via-gray-200 to-gray-300 blur-[8px] scale-[1.05]" />
                          <div className="p-[12px] flex flex-col justify-center flex-1 min-w-0 blur-[5px]">
                            <div className="flex items-center gap-[6px] mb-[4px]">
                              <span className="h-[9px] w-[36px] rounded-sm bg-primary/20" />
                              <span className="h-[9px] w-[18px] rounded-sm bg-text-secondary/20" />
                            </div>
                            <div className="space-y-[4px]">
                              <div className="h-[13px] w-full max-w-[100%] rounded-sm bg-primary/10" />
                              <div className="h-[13px] w-[85%] rounded-sm bg-primary/10" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="pt-[24px] pb-[12px]">
                    <div className="h-[20px] w-[120px] rounded-sm bg-primary/15 blur-[5px]" />
                    <div className="h-[2px] bg-primary w-full mt-[8px]" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[20px] pt-[8px]">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="bg-ui-card overflow-hidden border border-border h-full flex flex-col">
                        <div className="relative overflow-hidden h-[160px] bg-gradient-to-br from-gray-300 via-gray-200 to-gray-300 blur-[8px] scale-[1.05]" />
                        <div className="p-[12px] flex-1 flex flex-col blur-[5px]">
                          <div className="flex items-center gap-[6px] mb-[4px]">
                            <span className="h-[9px] w-[40px] rounded-sm bg-primary/20" />
                            <span className="h-[9px] w-[18px] rounded-sm bg-text-secondary/20" />
                          </div>
                          <div className="space-y-[4px]">
                            <div className="h-[13px] w-full rounded-sm bg-primary/10" />
                            <div className="h-[13px] w-[80%] rounded-sm bg-primary/10" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {error && !isLoading && (
              <div className="text-center py-20">
                <p className="text-body-lg text-ui-muted-foreground mb-4">{error}</p>
                <Button onClick={fetchArticles}>Try again</Button>
              </div>
            )}

            {!isLoading && !error && allArticles.length > 0 && (
              <>
                <div className="flex flex-col gap-[16px] lg:gap-[24px]">
                {/* Hero band: mobile = stacked Hero + Sidebars with 16px gap; lg = two-column */}
                <div
                  className="flex flex-col gap-[16px] lg:grid lg:min-h-[var(--hero-row-height)] lg:grid-cols-12 lg:gap-[24px] lg:items-stretch"
                  style={heroRowDesktopStyle}
                >
                  <div className="lg:col-span-7 lg:h-full">
                    <ArticleCard
                      article={allArticles[0]}
                      variant="hero"
                      topicMap={articlesData?.topicMap}
                      subtopicMap={articlesData?.subtopicMap}
                      geographyMap={articlesData?.geographyMap}
                      onArticleClick={openArticle}
                      showTranslationHint={showTranslationHint}
                      onDismissTranslationHint={handleDismissTranslationHint}
                      isRefreshing={isRefreshing}
                    />
                  </div>
                  <div className="lg:col-span-5">
                    <div className="flex flex-col gap-[16px] h-full">
                      {heroSidebarArticles.map(article => (
                        <ArticleCard
                          key={article.articleId}
                          article={article}
                          variant="sidebar"
                          topicMap={articlesData?.topicMap}
                          subtopicMap={articlesData?.subtopicMap}
                          geographyMap={articlesData?.geographyMap}
                          onArticleClick={openArticle}
                          isRefreshing={isRefreshing}
                        />
                      ))}
                      {showReferralCta && <ReferralCTA />}
                      {showAppStoreCta && <AppStoreCTA />}
                    </div>
                  </div>
                </div>

                {/* Topic-grouped sections */}
                {articlesByTopic.length > 0 && (
                  <TopicSections
                    articlesByTopic={articlesByTopic}
                    articlesData={articlesData}
                    readMoreLabel={articlesData?.readMoreTranslation ?? ''}
                    sectionSubtopicFilters={sectionSubtopicFilters}
                    setSectionSubtopicFilters={setSectionSubtopicFilters}
                    openArticle={openArticle}
                    scrollSectionIntoView={scrollSectionIntoView}
                    maxArticlesPerSection={MAX_ARTICLES_PER_SECTION}
                    isRefreshing={isRefreshing}
                  />
                )}
                </div>
              </>
            )}

            {!isLoading && !error && articlesData && allArticles.length === 0 && (
              <div className="text-center py-20">
                <p className="text-body-lg text-ui-muted-foreground">
                  No articles found for this category.
                </p>
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}

type SectionLayout = 'grid' | 'hero-left' | 'hero-right' | 'row-2' | 'featured-top' | 'feature-right-stack-left' | 'row-3';

/** Matches app-style “READ MORE POLITICS →” with thin rules on either side. */
  function TopicSectionReadMoreBreak({
  hrefTopicSlug,
  readMorePhrase,
  topicDisplayTitle,
  isRefreshing,
}: {
  hrefTopicSlug: string;
  readMorePhrase: string;
  topicDisplayTitle: string;
  isRefreshing?: boolean;
}) {
  const phrase = readMorePhrase.trim();
  const title = topicDisplayTitle.trim();
  const text =
    phrase && title ? `${phrase} ${title}`
      : (title || phrase || 'Read more');

  return (
    <div className="flex w-full max-w-full items-center gap-[10px] sm:gap-3 pt-3 pb-0">
      <span className="h-px min-w-[8px] flex-1 bg-ui-border shrink" aria-hidden />
      <Link
        href={`/topic/${hrefTopicSlug}`}
        className={cn(
          'shrink-0 text-center text-label-md font-medium uppercase tracking-[0.04em] text-ui-primary px-2',
          'underline-offset-[3px] hover:underline decoration-ui-primary',
          isRefreshing && 'blur-[3px] select-none pointer-events-none'
        )}
      >
        {text} →
      </Link>
      <span className="h-px min-w-[8px] flex-1 bg-ui-border shrink" aria-hidden />
    </div>
  );
}

const TOPIC_LAYOUTS: Record<string, SectionLayout> = {
  'Politics': 'grid',
  'Sport': 'hero-left',
  'Business': 'hero-right',
  'Crime': 'grid',
  'Entertainment': 'feature-right-stack-left',
  'Health': 'row-3',
  'Environment': 'row-2',
  'Culture': 'hero-left',
  'Science': 'hero-right',
};

const LAYOUT_CYCLE: SectionLayout[] = ['hero-left', 'grid', 'hero-right', 'row-3', 'featured-top', 'row-2'];

function TopicSections({
  articlesByTopic,
  articlesData,
  readMoreLabel,
  sectionSubtopicFilters,
  setSectionSubtopicFilters,
  openArticle,
  scrollSectionIntoView,
  maxArticlesPerSection,
  isRefreshing,
}: {
  articlesByTopic: { topic: string; articles: Article[]; subtopics: string[] }[];
  articlesData: {
    topicMap: Record<string, string>;
    subtopicMap: Record<string, string>;
    geographyMap: Record<string, string>;
    allTranslation: string;
  } | null;
  readMoreLabel: string;
  sectionSubtopicFilters: Record<string, string | null>;
  setSectionSubtopicFilters: React.Dispatch<React.SetStateAction<Record<string, string | null>>>;
  openArticle: (articleId: string) => void;
  scrollSectionIntoView: (topic: string, refs: Record<string, HTMLDivElement | null>) => void;
  maxArticlesPerSection: number;
  isRefreshing: boolean;
}) {
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const sharedCardProps = {
    topicMap: articlesData?.topicMap,
    subtopicMap: articlesData?.subtopicMap,
    geographyMap: articlesData?.geographyMap,
    onArticleClick: openArticle,
    hideTopicLabel: true as const,
    isRefreshing,
  };

  const renderCard = (
    article: Article,
    variant: 'grid' | 'featured' | 'sidebar' | 'carousel' = 'grid',
    options?: { featuredDesktopFill?: boolean },
  ) => (
    <ArticleCard
      key={`${variant}-${article.articleId}`}
      article={article}
      variant={variant}
      featuredDesktopFill={options?.featuredDesktopFill}
      {...sharedCardProps}
    />
  );

  const renderCarouselSlide = (article: Article) => (
    <Link
      key={article.articleId}
      href={`/article?id=${article.articleId}`}
      className="block shrink-0 w-[min(272px,calc(100vw-2rem))] snap-start snap-always no-underline"
      onClick={(e) => {
        e.preventDefault();
        openArticle(article.articleId);
      }}
    >
      <ArticleCard
        article={article}
        variant="carousel"
        {...sharedCardProps}
        disableLink
      />
    </Link>
  );

  /** iOS-aligned mobile feed (< lg): Featured + carousel (Sport) or Featured + stacked Sidebars + footer link. */
  const renderIosTopicSectionArticles = (topic: string, articles: Article[]) => {
    if (articles.length === 0) return null;

    const topicTitle = labelFromMap(articlesData?.topicMap, topic) ?? topic;
    const footer = (
      <TopicSectionReadMoreBreak
        hrefTopicSlug={topic.toLowerCase()}
        readMorePhrase={readMoreLabel}
        topicDisplayTitle={topicTitle}
        isRefreshing={isRefreshing}
      />
    );

    const [featuredArt, ...rest] = articles;

    if (topic === 'Sport') {
      const carouselArts = rest.slice(0, 6);
      return (
        <div className="flex flex-col gap-[16px] lg:hidden">
          {renderCard(featuredArt, 'featured')}
          <div className="flex gap-[16px] overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden after:content-[''] after:shrink-0 after:w-[1px]">
            {carouselArts.map(renderCarouselSlide)}
          </div>
          {footer}
        </div>
      );
    }

    const sidebars = rest.slice(0, 3);
    return (
      <div className="flex flex-col gap-[16px] lg:hidden">
        {renderCard(featuredArt, 'featured')}
        {sidebars.map(a => renderCard(a, 'sidebar'))}
        {footer}
      </div>
    );
  };

  const renderStandardGrid = (articles: Article[]) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[20px]">
      {articles.map(a => renderCard(a))}
    </div>
  );

  const renderArticles = (layout: SectionLayout, articles: Article[]) => {
    if (articles.length === 0) return null;

    if (layout === 'hero-left' && articles.length >= 2) {
      const [featured, ...rest] = articles;
      const gridArticles = rest.slice(0, 4);
      return (
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[20px] lg:items-stretch">
            {renderCard(featured, 'featured', { featuredDesktopFill: true })}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[20px] lg:items-start">
              {gridArticles.map(a => renderCard(a))}
            </div>
          </div>
        </div>
      );
    }

    if (layout === 'hero-right' && articles.length >= 2) {
      const [featured, ...rest] = articles;
      const gridArticles = rest.slice(0, 4);
      return (
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[20px] lg:items-stretch">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[20px] lg:items-start">
              {gridArticles.map(a => renderCard(a))}
            </div>
            {renderCard(featured, 'featured', { featuredDesktopFill: true })}
          </div>
        </div>
      );
    }

    if (layout === 'row-2') {
      const topArticles = articles.slice(0, 2);
      return (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[20px]">
            {topArticles.map(a => renderCard(a, 'featured'))}
          </div>
        </div>
      );
    }

    if (layout === 'feature-right-stack-left' && articles.length >= 2) {
      const [featured, ...rest] = articles;
      const sidebarArticles = rest.slice(0, 3);
      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[20px] lg:items-stretch">
          <div className="flex flex-col gap-[16px]">
            {sidebarArticles.map(a => renderCard(a, 'sidebar'))}
          </div>
          <div className="lg:h-full">
            {renderCard(featured, 'featured', { featuredDesktopFill: true })}
          </div>
        </div>
      );
    }

    if (layout === 'featured-top' && articles.length >= 2) {
      const [featured, ...rest] = articles;
      const gridArticles = rest.slice(0, 4);
      return (
        <div className="space-y-[20px]">
          {renderCard(featured, 'featured')}
          {gridArticles.length > 0 && renderStandardGrid(gridArticles)}
        </div>
      );
    }

    if (layout === 'row-3') {
      const topArticles = articles.slice(0, 3);
      return (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[20px]">
            {topArticles.map(a => renderCard(a, 'featured'))}
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[20px]">
        {articles.map(a => renderCard(a))}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-[16px] lg:gap-[12px]">
      {articlesByTopic.map(({ topic, articles, subtopics: sectionSubtopics }, topicIndex) => {
        const activeSubFilter = sectionSubtopicFilters[topic] || null;
        const filteredBySubtopic = activeSubFilter
          ? articles.filter(a => a.subtopic === activeSubFilter)
          : articles;
        const displayArticles = filteredBySubtopic.slice(0, maxArticlesPerSection);
        const hasSubtopics = sectionSubtopics.length > 0;
        const layout = TOPIC_LAYOUTS[topic] || LAYOUT_CYCLE[topicIndex % LAYOUT_CYCLE.length];

        return (
          <div
            key={topic}
            ref={(el) => { sectionRefs.current[topic] = el; }}
            data-topic={topic}
            className="topic-section"
          >
            <div className="sticky top-[93px] z-[800] bg-background">
              <div className="min-h-[52px] flex flex-col justify-end pt-2 pb-3 lg:pt-3 lg:min-h-0">
                <div className={cn(
                  'pb-2 border-b-2 border-ui-primary flex items-end justify-between gap-3 min-h-[1.5rem] lg:min-h-0',
                  isRefreshing && 'blur-[3px]',
                )}
                >
                  <h2 className={cn('text-headline-md lg:text-display-sm text-ui-foreground min-w-0', isRefreshing && 'select-none')}>
                    {labelFromMap(articlesData?.topicMap, topic) ?? '\u00A0'}
                  </h2>
                </div>
              </div>

              {hasSubtopics && (
                <ScrollableNav className="pb-[8px]" borderOffset={2}>
                  <button
                    onClick={() => {
                      setSectionSubtopicFilters(prev => ({ ...prev, [topic]: null }));
                      scrollSectionIntoView(topic, sectionRefs.current);
                    }}
                    className={`
                      px-[12px] py-[6px] text-label-md font-semibold tracking-wide uppercase transition-all duration-200 border-b-[2px] border-transparent cursor-pointer bg-transparent whitespace-nowrap
                      ${!activeSubFilter
                        ? 'border-b-primary text-primary'
                        : 'text-ui-muted-foreground hover:text-primary hover:border-b-primary/30'
                      }
                    `}
                  >
                    {articlesData?.allTranslation?.trim() ? articlesData.allTranslation : '\u00A0'}
                  </button>
                  {sectionSubtopics.map(sub => (
                    <button
                      key={sub}
                      onClick={() => {
                        setSectionSubtopicFilters(prev => ({ ...prev, [topic]: sub }));
                        scrollSectionIntoView(topic, sectionRefs.current);
                      }}
                      className={`
                        px-[12px] py-[6px] text-label-md font-semibold tracking-wide uppercase transition-all duration-200 border-b-[2px] border-transparent cursor-pointer bg-transparent whitespace-nowrap
                        ${activeSubFilter === sub
                          ? 'border-b-primary text-primary'
                          : 'text-ui-muted-foreground hover:text-primary hover:border-b-primary/30'
                        }
                        ${isRefreshing ? 'blur-[3px] select-none pointer-events-none' : ''}
                      `}
                    >
                      {labelFromMap(articlesData?.subtopicMap, sub) ?? '\u00A0'}
                    </button>
                  ))}
                </ScrollableNav>
              )}
            </div>

            {renderIosTopicSectionArticles(topic, displayArticles)}
            <div className="hidden lg:block">
              {renderArticles(layout, displayArticles)}
              <TopicSectionReadMoreBreak
                hrefTopicSlug={topic.toLowerCase()}
                readMorePhrase={readMoreLabel}
                topicDisplayTitle={labelFromMap(articlesData?.topicMap, topic) ?? topic}
                isRefreshing={isRefreshing}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

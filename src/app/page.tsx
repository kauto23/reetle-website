'use client';

import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
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

  const articlesByTopic = useMemo(() => {
    // Keep in sync with the sidebar slice: when the referral CTA takes a
    // sidebar slot, the displaced article should promote into its topic
    // section instead of disappearing. When the CTA is dismissed, the same
    // article flows back into the sidebar.
    const heroCount = heroRowArticleCount(hasApp, showReferralCta);
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
  }, [allArticles, hasApp, showReferralCta]);

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
                    <div className="bg-white overflow-hidden border border-border">
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
                        <div key={i} className="bg-white overflow-hidden border border-border flex h-full flex-1">
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
                      <div key={i} className="bg-white overflow-hidden border border-border h-full flex flex-col">
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
                <p className="text-[16px] text-ui-muted-foreground mb-4">{error}</p>
                <Button onClick={fetchArticles}>Try again</Button>
              </div>
            )}

            {!isLoading && !error && allArticles.length > 0 && (
              <>
                <div className="space-y-[32px]">
                {/* Hero section */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-[24px]">
                  <div className="lg:col-span-7">
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
                      {allArticles.slice(1, heroRowArticleCount(hasApp, showReferralCta)).map(article => (
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
                      {!hasApp && SHOW_APP_STORE_PROMO && <AppStoreCTA />}
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
                <p className="text-[16px] text-ui-muted-foreground">
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

type SectionLayout = 'grid' | 'hero-left' | 'hero-right' | 'row-2' | 'featured-top' | 'row-3';

const TOPIC_LAYOUTS: Record<string, SectionLayout> = {
  'Politics': 'grid',
  'Sport': 'hero-left',
  'Business': 'hero-right',
  'Crime': 'grid',
  'Entertainment': 'featured-top',
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

  const renderCard = (article: Article, variant: 'grid' | 'featured' = 'grid') => (
    <ArticleCard
      key={article.articleId}
      article={article}
      variant={variant}
      topicMap={articlesData?.topicMap}
      subtopicMap={articlesData?.subtopicMap}
      geographyMap={articlesData?.geographyMap}
      onArticleClick={openArticle}
      hideTopicLabel
      isRefreshing={isRefreshing}
    />
  );

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
        <div className="pb-[16px]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[20px]">
            {renderCard(featured, 'featured')}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[20px]">
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
        <div className="pb-[16px]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[20px]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[20px]">
              {gridArticles.map(a => renderCard(a))}
            </div>
            {renderCard(featured, 'featured')}
          </div>
        </div>
      );
    }

    if (layout === 'row-2') {
      const topArticles = articles.slice(0, 2);
      return (
        <div className="pb-[16px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[20px]">
            {topArticles.map(a => renderCard(a, 'featured'))}
          </div>
        </div>
      );
    }

    if (layout === 'featured-top' && articles.length >= 2) {
      const [featured, ...rest] = articles;
      const gridArticles = rest.slice(0, 4);
      return (
        <div className="pb-[16px] space-y-[20px]">
          {renderCard(featured, 'featured')}
          {gridArticles.length > 0 && renderStandardGrid(gridArticles)}
        </div>
      );
    }

    if (layout === 'row-3') {
      const topArticles = articles.slice(0, 3);
      return (
        <div className="pb-[16px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[20px]">
            {topArticles.map(a => renderCard(a, 'featured'))}
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[20px] pb-[16px]">
        {articles.map(a => renderCard(a))}
      </div>
    );
  };

  return (
    <div className="space-y-0">
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
              <div className="pt-6 pb-3">
                <div className="pb-2 border-b-2 border-ui-primary flex items-end justify-between gap-3 min-h-[1.5rem]">
                  <h2 className={cn('text-[18px] font-semibold text-ui-foreground min-w-0', isRefreshing && 'blur-[3px] select-none')}>
                    {labelFromMap(articlesData?.topicMap, topic) ?? '\u00A0'}
                  </h2>
                  {readMoreLabel.trim() ? (
                    <Link
                      href={`/topic/${topic.toLowerCase()}`}
                      className={cn('shrink-0 text-[15px] font-semibold text-ui-primary leading-tight hover:underline underline-offset-2 whitespace-nowrap', isRefreshing && 'blur-[3px] select-none pointer-events-none')}
                    >
                      {readMoreLabel}
                    </Link>
                  ) : null}
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
                      px-[12px] py-[6px] text-[12px] font-semibold tracking-wide uppercase transition-all duration-200 border-b-[2px] border-transparent cursor-pointer bg-transparent whitespace-nowrap
                      ${!activeSubFilter
                        ? 'border-b-primary text-primary'
                        : 'text-text-secondary hover:text-primary hover:border-b-primary/30'
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
                        px-[12px] py-[6px] text-[12px] font-semibold tracking-wide uppercase transition-all duration-200 border-b-[2px] border-transparent cursor-pointer bg-transparent whitespace-nowrap
                        ${activeSubFilter === sub
                          ? 'border-b-primary text-primary'
                          : 'text-text-secondary hover:text-primary hover:border-b-primary/30'
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

            {renderArticles(layout, displayArticles)}
          </div>
        );
      })}
    </div>
  );
}

'use client';

import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ArticleCard from '@/components/articles/ArticleCard';
import ArticleDetail from '@/components/articles/ArticleDetail';
import AppStoreCTA from '@/components/layout/AppStoreCTA';
import ScrollableNav from '@/components/layout/ScrollableNav';
import TopicNav from '@/components/layout/TopicNav';
import { CATEGORY_ORDER } from '@/config/categories';
import { useArticles } from '@/contexts/ArticlesContext';
import { useAuth } from '@/contexts/AuthContext';
import { prefetchPracticeQuestion } from '@/services/practiceCache';
import type { Article } from '@/types/article';

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedArticleId = searchParams.get('article');
  const [translationHintDismissed, setTranslationHintDismissed] = useState(true);
  const [sectionSubtopicFilters, setSectionSubtopicFilters] = useState<Record<string, string | null>>({});

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
    const heroCount = hasApp ? 5 : 4;
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
  }, [allArticles, hasApp]);

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
      <TopicNav />

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
                {/* Hero + sidebar skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-[24px]">
                  <div className="lg:col-span-7">
                    <div className="bg-white overflow-hidden border border-border">
                      <div className="relative overflow-hidden h-[220px] sm:h-[300px] lg:h-[360px] bg-gradient-to-br from-gray-300 via-gray-200 to-gray-300 blur-[8px] scale-[1.05]" />
                      <div className="p-[16px] sm:p-[20px] blur-[5px]">
                        <div className="flex items-center gap-[8px] mb-[8px]">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-primary bg-primary/8 px-[8px] py-[2px] rounded">Politics</span>
                          <span className="text-[11px] font-medium text-text-secondary">United Kingdom</span>
                          <span className="text-[11px] text-text-secondary">2h</span>
                        </div>
                        <p className="text-[20px] sm:text-[24px] font-semibold leading-[1.25] text-primary">Breaking news headline placeholder text goes here today</p>
                      </div>
                    </div>
                  </div>
                  <div className="lg:col-span-5">
                    <div className="flex flex-col gap-[16px] h-full">
                      {['World leaders meet at summit', 'Local team wins championship', 'New policy announcement made', 'Scientists discover high energy source'].map((text, i) => (
                        <div key={i} className="bg-white overflow-hidden border border-border flex h-full flex-1">
                          <div className="relative w-[130px] sm:w-[160px] shrink-0 overflow-hidden bg-gradient-to-br from-gray-300 via-gray-200 to-gray-300 blur-[8px] scale-[1.05]" />
                          <div className="p-[12px] flex flex-col justify-center flex-1 min-w-0 blur-[5px]">
                            <div className="flex items-center gap-[6px] mb-[4px]">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Sport</span>
                              <span className="text-[10px] text-text-secondary">4h</span>
                            </div>
                            <p className="text-[14px] sm:text-[15px] font-semibold leading-[1.3] text-primary">{text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Topic section skeleton */}
                <div>
                  <div className="pt-[24px] pb-[12px]">
                    <span className="text-[18px] font-semibold text-primary blur-[5px] inline-block">Politics</span>
                    <div className="h-[2px] bg-primary w-full mt-[8px]" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[20px] pt-[8px]">
                    {['Economy report shows growth', 'Election results finalised', 'Parliament debates new bill', 'Trade agreement signed'].map((text, i) => (
                      <div key={i} className="bg-white overflow-hidden border border-border h-full flex flex-col">
                        <div className="relative overflow-hidden h-[160px] bg-gradient-to-br from-gray-300 via-gray-200 to-gray-300 blur-[8px] scale-[1.05]" />
                        <div className="p-[12px] flex-1 flex flex-col blur-[5px]">
                          <div className="flex items-center gap-[6px] mb-[4px]">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Business</span>
                            <span className="text-[10px] text-text-secondary">1h</span>
                          </div>
                          <p className="text-[14px] font-semibold leading-[1.3] text-primary">{text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {error && !isLoading && (
              <div className="text-center py-[80px]">
                <p className="text-[16px] text-text-secondary mb-md">{error}</p>
                <button onClick={fetchArticles} className="btn-primary">
                  Try Again
                </button>
              </div>
            )}

            {!isLoading && !error && allArticles.length > 0 && (
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
                      {allArticles.slice(1, hasApp ? 5 : 4).map(article => (
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
                      {!hasApp && <AppStoreCTA />}
                    </div>
                  </div>
                </div>

                {/* Topic-grouped sections */}
                {articlesByTopic.length > 0 && (
                  <TopicSections
                    articlesByTopic={articlesByTopic}
                    articlesData={articlesData}
                    sectionSubtopicFilters={sectionSubtopicFilters}
                    setSectionSubtopicFilters={setSectionSubtopicFilters}
                    openArticle={openArticle}
                    scrollSectionIntoView={scrollSectionIntoView}
                    maxArticlesPerSection={MAX_ARTICLES_PER_SECTION}
                    isRefreshing={isRefreshing}
                  />
                )}
              </div>
            )}

            {!isLoading && !error && articlesData && allArticles.length === 0 && (
              <div className="text-center py-[80px]">
                <p className="text-[16px] text-text-secondary">
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
  sectionSubtopicFilters,
  setSectionSubtopicFilters,
  openArticle,
  scrollSectionIntoView,
  maxArticlesPerSection,
  isRefreshing,
}: {
  articlesByTopic: { topic: string; articles: Article[]; subtopics: string[] }[];
  articlesData: { topicMap: Record<string, string>; subtopicMap: Record<string, string>; geographyMap: Record<string, string> } | null;
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
              <div className="pt-[24px] pb-[12px]">
                <div className="pb-[8px] border-b-[2px] border-primary">
                  <h2 className={`text-[18px] font-semibold text-primary ${isRefreshing ? 'blur-[3px] select-none' : ''}`}>
                    {articlesData?.topicMap[topic.toLowerCase()] || articlesData?.topicMap[topic] || topic}
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
                      px-[12px] py-[6px] text-[12px] font-semibold tracking-wide uppercase transition-all duration-200 border-b-[2px] border-transparent cursor-pointer bg-transparent whitespace-nowrap
                      ${!activeSubFilter
                        ? 'border-b-primary text-primary'
                        : 'text-text-secondary hover:text-primary hover:border-b-primary/30'
                      }
                    `}
                  >
                    All
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
                      {articlesData?.subtopicMap[sub] || sub}
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

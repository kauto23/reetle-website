'use client';

import { useState, useMemo, useCallback, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import ArticleCard from '@/components/articles/ArticleCard';
import ArticleDetail from '@/components/articles/ArticleDetail';
import AppStoreCTA from '@/components/layout/AppStoreCTA';
import TopicNav from '@/components/layout/TopicNav';
import { CATEGORY_ORDER } from '@/config/categories';
import { useArticles } from '@/contexts/ArticlesContext';
import { useAuth } from '@/contexts/AuthContext';

export default function TopicPageClient() {
  return (
    <Suspense>
      <TopicPageContent />
    </Suspense>
  );
}

function TopicPageContent() {
  const params = useParams();
  const slug = typeof params.slug === 'string' ? params.slug : '';
  const { articlesData, isLoading, isRefreshing, error, fetchArticles } = useArticles();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedSubtopic, setSelectedSubtopic] = useState<string | null>(null);
  const selectedArticleId = searchParams.get('article');

  useEffect(() => {
    setSelectedSubtopic(null);
  }, [slug]);

  const allArticles = useMemo(() => articlesData?.articles ?? [], [articlesData]);

  const topicName = useMemo(() => {
    return CATEGORY_ORDER.find(c => c.toLowerCase() === slug.toLowerCase()) || slug;
  }, [slug]);

  const { filteredArticles, subtopics } = useMemo(() => {
    const topicLower = slug.toLowerCase();
    const topicFiltered = allArticles.filter(a => a.topic.toLowerCase() === topicLower);
    const subSet = new Set(topicFiltered.map(a => a.subtopic).filter(Boolean) as string[]);
    const subs = Array.from(subSet).sort();
    const filtered = selectedSubtopic
      ? topicFiltered.filter(a => a.subtopic === selectedSubtopic)
      : topicFiltered;
    return { filteredArticles: filtered, subtopics: subs };
  }, [slug, selectedSubtopic, allArticles]);

  const openArticle = useCallback((articleId: string) => {
    router.push(`/topic/${encodeURIComponent(slug)}?article=${encodeURIComponent(articleId)}`, { scroll: false });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [router, slug]);

  const topicLabel = articlesData?.topicMap[slug.toLowerCase()] || articlesData?.topicMap[topicName] || topicName;
  const heroCount = isAuthenticated ? 5 : 4;

  return (
    <>
      <TopicNav
        selectedSubtopic={selectedSubtopic}
        onSubtopicChange={setSelectedSubtopic}
        subtopics={subtopics}
      />

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
                      {['World leaders meet at summit', 'Local team wins championship', 'New policy announcement made'].map((text, i) => (
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

                {/* Grid section skeleton */}
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

            {!isLoading && !error && filteredArticles.length > 0 && (
              <div className="space-y-[32px]">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-[24px]">
                  <div className="lg:col-span-7">
                    <ArticleCard
                      article={filteredArticles[0]}
                      variant="hero"
                      topicMap={articlesData?.topicMap}
                      subtopicMap={articlesData?.subtopicMap}
                      geographyMap={articlesData?.geographyMap}
                      onArticleClick={openArticle}
                      isRefreshing={isRefreshing}
                    />
                  </div>
                  <div className="lg:col-span-5">
                    <div className="flex flex-col gap-[16px] h-full">
                      {filteredArticles.slice(1, heroCount).map(article => (
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
                      {!isAuthenticated && <AppStoreCTA />}
                    </div>
                  </div>
                </div>

                {filteredArticles.length > heroCount && (
                  <>
                    <div className="border-t-[2px] border-primary/10" />
                    <div>
                      <div className="mb-[16px] pb-[8px] border-b-[2px] border-primary">
                        <h2 className={`text-[18px] font-semibold text-primary ${isRefreshing ? 'blur-[3px] select-none' : ''}`}>
                          {topicLabel}
                        </h2>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[20px]">
                        {filteredArticles.slice(heroCount).map(article => (
                          <ArticleCard
                            key={article.articleId}
                            article={article}
                            variant="grid"
                            topicMap={articlesData?.topicMap}
                            subtopicMap={articlesData?.subtopicMap}
                            geographyMap={articlesData?.geographyMap}
                            onArticleClick={openArticle}
                            isRefreshing={isRefreshing}
                          />
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {!isLoading && !error && articlesData && filteredArticles.length === 0 && (
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

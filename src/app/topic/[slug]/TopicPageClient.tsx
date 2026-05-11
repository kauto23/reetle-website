'use client';

import { useState, useMemo, useCallback, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import ArticleCard from '@/components/articles/ArticleCard';
import ArticleDetail from '@/components/articles/ArticleDetail';
import AppStoreCTA from '@/components/layout/AppStoreCTA';
import TopicNav from '@/components/layout/TopicNav';
import { useArticles } from '@/contexts/ArticlesContext';
import { useAuth } from '@/contexts/AuthContext';
import { SHOW_APP_STORE_PROMO, heroRowArticleCount } from '@/config/site-promos';
import { Button } from '@/components/ui/button';

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
  const { hasApp } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedSubtopic, setSelectedSubtopic] = useState<string | null>(null);
  const selectedArticleId = searchParams.get('article');

  useEffect(() => {
    setSelectedSubtopic(null);
  }, [slug]);

  const allArticles = useMemo(() => articlesData?.articles ?? [], [articlesData]);

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

  const heroCount = heroRowArticleCount(hasApp);

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
                      {[0, 1, 2].map((i) => (
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[20px]">
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

            {!isLoading && !error && filteredArticles.length > 0 && (
              <>
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
                      {!hasApp && SHOW_APP_STORE_PROMO && <AppStoreCTA />}
                    </div>
                  </div>
                </div>

                {filteredArticles.length > heroCount && (
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
                )}
                </div>
              </>
            )}

            {!isLoading && !error && articlesData && filteredArticles.length === 0 && (
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

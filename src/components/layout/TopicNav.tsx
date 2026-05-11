'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import ScrollableNav from './ScrollableNav';
import { useArticles } from '@/contexts/ArticlesContext';
import { useMemo } from 'react';

import { CATEGORY_ORDER } from '@/config/categories';
import { labelFromMap } from '@/lib/translationMap';

const loadingBlur = 'blur-[5px] select-none pointer-events-none opacity-60';
const refreshBlur = 'blur-[3px] select-none pointer-events-none';
const NAV_PLACEHOLDER = '\u00A0';

interface TopicNavProps {
  selectedSubtopic?: string | null;
  onSubtopicChange?: (subtopic: string | null) => void;
  subtopics?: string[];
  /**
   * When rendered on the home page, mirrors the underline to the topic whose
   * sticky section header is currently pinned. Uses the same active logic as
   * the "all" topic tab when no section is highlighted.
   */
  activeSectionTopic?: string | null;
}

function allTopicsLabel(articlesData: { allTranslation: string } | null | undefined): string {
  if (!articlesData?.allTranslation?.trim()) return NAV_PLACEHOLDER;
  return articlesData.allTranslation;
}

function topicLinkLabel(
  cat: string,
  articlesData: { topicMap: Record<string, string> } | null | undefined
): string {
  if (!articlesData) return NAV_PLACEHOLDER;
  return labelFromMap(articlesData.topicMap, cat) ?? NAV_PLACEHOLDER;
}

export default function TopicNav({ selectedSubtopic, onSubtopicChange, subtopics = [], activeSectionTopic = null }: TopicNavProps) {
  const pathname = usePathname();
  const { articlesData, isRefreshing } = useArticles();
  const allArticles = useMemo(() => articlesData?.articles ?? [], [articlesData]);

  const categories = useMemo(() => {
    const topicSet = new Set(allArticles.map(a => a.topic));
    return CATEGORY_ORDER.filter(c => topicSet.has(c.toLowerCase()) || topicSet.has(c));
  }, [allArticles]);

  const isHome = pathname === '/';
  const topicSlug = pathname.startsWith('/topic/') ? decodeURIComponent(pathname.split('/')[2]) : null;

  const matchedSectionTopic = isHome && activeSectionTopic
    ? categories.find(c => c.toLowerCase() === activeSectionTopic.toLowerCase()) || null
    : null;

  const activeTopic = isHome
    ? (matchedSectionTopic ?? 'all')
    : (topicSlug ? categories.find(c => c.toLowerCase() === topicSlug.toLowerCase()) || null : null);

  const isInitialLoad = !articlesData;

  const btnBase = 'px-4 py-3 text-[13px] font-semibold tracking-wide uppercase transition-all duration-200 border-b-[3px] border-transparent cursor-pointer bg-transparent whitespace-nowrap';
  const btnActive = 'border-b-ui-primary text-ui-primary';
  const btnInactive = 'text-ui-muted-foreground hover:text-ui-primary hover:border-b-ui-primary/30';

  const displayCategories = categories;

  const btnStyle = (isActive: boolean) => {
    if (isInitialLoad) return loadingBlur;
    const base = isActive ? btnActive : btnInactive;
    return isRefreshing ? `${base} ${refreshBlur}` : base;
  };

  return (
    <div className="bg-ui-card border-b border-ui-border sticky top-[48px]" style={{ zIndex: 'var(--z-topic-nav)' }}>
      <div className="max-w-[1280px] mx-auto px-md">
        <ScrollableNav>
          <div className="flex items-center gap-0">
            <Link
              href="/"
              className={`${btnBase} ${btnStyle(activeTopic === 'all')}`}
            >
              {allTopicsLabel(articlesData)}
            </Link>
            {displayCategories.map(cat => (
              <Link
                key={cat}
                href={`/topic/${cat.toLowerCase()}`}
                className={`${btnBase} ${btnStyle(activeTopic === cat)}`}
              >
                {topicLinkLabel(cat, articlesData)}
              </Link>
            ))}
          </div>
        </ScrollableNav>

        {subtopics.length > 0 && onSubtopicChange && (
          <ScrollableNav>
            <button
              onClick={() => onSubtopicChange(null)}
              className={`${btnBase} ${!selectedSubtopic ? btnActive : btnInactive}`}
            >
              {allTopicsLabel(articlesData)}
            </button>
            {subtopics.map(sub => (
              <button
                key={sub}
                onClick={() => onSubtopicChange(sub)}
                className={`${btnBase} ${btnStyle(selectedSubtopic === sub)}`}
              >
                {labelFromMap(articlesData?.subtopicMap, sub) ?? NAV_PLACEHOLDER}
              </button>
            ))}
          </ScrollableNav>
        )}
      </div>
    </div>
  );
}

export { CATEGORY_ORDER } from '@/config/categories';

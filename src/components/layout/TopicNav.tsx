'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import ScrollableNav from './ScrollableNav';
import { useArticles } from '@/contexts/ArticlesContext';
import { useMemo } from 'react';

import { CATEGORY_ORDER } from '@/config/categories';

const loadingBlur = 'blur-[5px] select-none pointer-events-none opacity-60';
const refreshBlur = 'blur-[3px] select-none pointer-events-none';

interface TopicNavProps {
  selectedSubtopic?: string | null;
  onSubtopicChange?: (subtopic: string | null) => void;
  subtopics?: string[];
}

export default function TopicNav({ selectedSubtopic, onSubtopicChange, subtopics = [] }: TopicNavProps) {
  const pathname = usePathname();
  const { articlesData, isRefreshing } = useArticles();
  const allArticles = useMemo(() => articlesData?.articles ?? [], [articlesData]);

  const categories = useMemo(() => {
    const topicSet = new Set(allArticles.map(a => a.topic));
    return CATEGORY_ORDER.filter(c => topicSet.has(c.toLowerCase()) || topicSet.has(c));
  }, [allArticles]);

  const isHome = pathname === '/';
  const topicSlug = pathname.startsWith('/topic/') ? decodeURIComponent(pathname.split('/')[2]) : null;

  const activeTopic = isHome ? 'all' : (topicSlug ? categories.find(c => c.toLowerCase() === topicSlug.toLowerCase()) || null : null);

  const isInitialLoad = !articlesData;

  const btnBase = 'px-[16px] py-[12px] text-[13px] font-semibold tracking-wide uppercase transition-all duration-200 border-b-[3px] border-transparent cursor-pointer bg-transparent whitespace-nowrap';
  const btnActive = 'border-b-primary text-primary';
  const btnInactive = 'text-text-secondary hover:text-primary hover:border-b-primary/30';

  const displayCategories = categories.length > 0 ? categories : (isInitialLoad ? CATEGORY_ORDER : []);

  const btnStyle = (isActive: boolean) => {
    if (isInitialLoad) return loadingBlur;
    const base = isActive ? btnActive : btnInactive;
    return isRefreshing ? `${base} ${refreshBlur}` : base;
  };

  return (
    <div className="bg-white border-b border-border sticky top-[48px] z-[900]">
      <div className="max-w-[1280px] mx-auto px-md">
        <ScrollableNav>
          <div className="flex items-center gap-0">
            <Link
              href="/"
              className={`${btnBase} ${btnStyle(activeTopic === 'all')}`}
            >
              {articlesData?.allTranslation || 'All'}
            </Link>
            {displayCategories.map(cat => (
              <Link
                key={cat}
                href={`/topic/${cat.toLowerCase()}`}
                className={`${btnBase} ${btnStyle(activeTopic === cat)}`}
              >
                {articlesData?.topicMap[cat.toLowerCase()] || articlesData?.topicMap[cat] || cat}
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
              All
            </button>
            {subtopics.map(sub => (
              <button
                key={sub}
                onClick={() => onSubtopicChange(sub)}
                className={`${btnBase} ${btnStyle(selectedSubtopic === sub)}`}
              >
                {articlesData?.subtopicMap[sub] || sub}
              </button>
            ))}
          </ScrollableNav>
        )}
      </div>
    </div>
  );
}

export { CATEGORY_ORDER } from '@/config/categories';

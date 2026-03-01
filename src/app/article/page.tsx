'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

/**
 * Standalone article page — redirects to the home page with inline article view.
 * This preserves backward compatibility for any existing links to /article?id=...
 */
function ArticleRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const articleId = searchParams.get('id') || '';

  useEffect(() => {
    if (articleId) {
      router.replace(`/?article=${articleId}`);
    } else {
      router.replace('/');
    }
  }, [articleId, router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="loading-spinner" />
    </div>
  );
}

export default function ArticlePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="loading-spinner" />
      </div>
    }>
      <ArticleRedirect />
    </Suspense>
  );
}

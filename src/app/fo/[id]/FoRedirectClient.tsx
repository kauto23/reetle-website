'use client';

import { useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function FoRedirectClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    // Extract ID from route params or fallback to parsing the current window pathname
    let rawId = params?.id;
    if (!rawId && typeof window !== 'undefined') {
      const parts = window.location.pathname.split('/').filter(Boolean);
      const foIndex = parts.indexOf('fo');
      if (foIndex !== -1 && parts[foIndex + 1]) {
        rawId = parts[foIndex + 1];
      }
    }

    const id = Array.isArray(rawId) ? rawId[0] : (rawId as string | undefined);

    // Validate that id is a valid positive numeric article ID
    if (!id || !/^[1-9]\d*$/.test(id)) {
      router.replace('/');
      return;
    }

    // Preserve incoming query parameters (e.g. fbclid) and apply required tracking params
    const currentSearch = typeof window !== 'undefined' ? window.location.search : searchParams.toString();
    const targetParams = new URLSearchParams(currentSearch);

    targetParams.set('article', id);
    targetParams.set('utm_source', 'facebook');
    targetParams.set('utm_medium', 'social_organic');
    targetParams.set('utm_campaign', 'daily_news');
    targetParams.set('utm_content', `article_${id}`);

    const destination = `/?${targetParams.toString()}`;
    router.replace(destination);
  }, [params, searchParams, router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-9 w-9 animate-spin text-ui-primary" />
    </div>
  );
}

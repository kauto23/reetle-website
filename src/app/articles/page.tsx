'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ArticlesRedirect() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const articleParam = params.get('article');
    if (articleParam) {
      router.replace(`/?article=${articleParam}`);
    } else {
      router.replace('/');
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="loading-spinner" />
    </div>
  );
}

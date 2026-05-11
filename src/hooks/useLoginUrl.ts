'use client';

import { usePathname, useSearchParams } from 'next/navigation';

export function useLoginUrl(): string {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qs = searchParams.toString();
  const currentUrl = qs ? `${pathname}?${qs}` : pathname;
  return `/login?redirect=${encodeURIComponent(currentUrl)}`;
}

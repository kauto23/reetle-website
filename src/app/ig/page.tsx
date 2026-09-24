'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { applyDefaultUtms, captureAcquisitionFromUrl, syncAcquisitionSession } from '@/lib/acquisition';

function IgBioRedirectClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const currentSearch = typeof window !== 'undefined' ? window.location.search : searchParams.toString();
    const targetParams = new URLSearchParams(currentSearch);

    applyDefaultUtms(targetParams, {
      utm_source: 'instagram',
      utm_medium: 'social_organic',
      utm_campaign: 'bio',
    });

    const acq = captureAcquisitionFromUrl('/ig', targetParams.toString());
    if (acq) syncAcquisitionSession(acq);

    router.replace(`/?${targetParams.toString()}`);
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-9 w-9 animate-spin text-ui-primary" />
    </div>
  );
}

export default function IgBioRedirectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-9 w-9 animate-spin text-ui-primary" />
        </div>
      }
    >
      <IgBioRedirectClient />
    </Suspense>
  );
}

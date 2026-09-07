'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function FoIndexRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-9 w-9 animate-spin text-ui-primary" />
    </div>
  );
}

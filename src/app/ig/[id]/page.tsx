import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import IgRedirectClient from './IgRedirectClient';

export function generateStaticParams() {
  return [{ id: '0' }];
}

export default function IgArticleRedirectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-9 w-9 animate-spin text-ui-primary" />
        </div>
      }
    >
      <IgRedirectClient />
    </Suspense>
  );
}

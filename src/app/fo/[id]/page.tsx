import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import FoRedirectClient from './FoRedirectClient';

export function generateStaticParams() {
  return [{ id: '0' }];
}

export default function FoArticleRedirectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-9 w-9 animate-spin text-ui-primary" />
        </div>
      }
    >
      <FoRedirectClient />
    </Suspense>
  );
}

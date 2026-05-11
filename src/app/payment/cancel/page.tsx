'use client';

import Link from 'next/link';
import { XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PaymentCancelPage() {
  return (
    <section className="py-12 sm:py-16">
      <div className="max-w-[500px] mx-auto px-4 text-center">
        <div className="w-20 h-20 bg-ui-muted rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-10 h-10 text-ui-muted-foreground" />
        </div>
        <h1 className="text-[26px] font-semibold tracking-tight text-ui-foreground mb-2">
          Payment cancelled
        </h1>
        <p className="text-[15px] text-ui-muted-foreground mb-10 max-w-md mx-auto">
          No worries — you can upgrade to Premium any time.
        </p>
        <div className="flex flex-col gap-2 max-w-[300px] mx-auto">
          <Button asChild>
            <Link href="/premium">Try again</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Continue reading</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

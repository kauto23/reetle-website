'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import AuthGuard from '@/components/layout/AuthGuard';
import { Button } from '@/components/ui/button';

export default function PaymentSuccessPage() {
  const { isPremium, refreshStatus } = useSubscription();
  const [polling, setPolling] = useState(!isPremium);
  const pollCount = useRef(0);

  useEffect(() => {
    if (isPremium || !polling) {
      setPolling(false);
      return;
    }

    const poll = async () => {
      pollCount.current += 1;
      await refreshStatus();
      if (pollCount.current >= 6) {
        setPolling(false);
      }
    };

    const timer = setInterval(poll, 2000);
    poll();

    return () => clearInterval(timer);
  }, [isPremium, polling, refreshStatus]);

  return (
    <AuthGuard>
      <section className="py-12 sm:py-16">
        <div className="max-w-[500px] mx-auto px-4 text-center">
          {isPremium ? (
            <div className="animate-fadeIn">
              <div className="w-20 h-20 bg-correct-bg rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-correct" />
              </div>
              <h1 className="text-[28px] font-semibold tracking-tight text-ui-foreground mb-2">
                Welcome to Premium!
              </h1>
              <p className="text-[15px] text-ui-muted-foreground mb-10 max-w-md mx-auto">
                You now have unlimited access to articles, audio, and practice. Happy learning.
              </p>
              <Button asChild size="lg">
                <Link href="/">Continue reading</Link>
              </Button>
            </div>
          ) : polling ? (
            <>
              <div className="w-20 h-20 bg-ui-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-9 h-9 animate-spin text-ui-primary" />
              </div>
              <h1 className="text-[26px] font-semibold tracking-tight text-ui-foreground mb-2">
                Confirming your payment...
              </h1>
              <p className="text-[15px] text-ui-muted-foreground">
                This usually takes just a moment.
              </p>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-ui-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-9 h-9 text-ui-muted-foreground" />
              </div>
              <h1 className="text-[26px] font-semibold tracking-tight text-ui-foreground mb-2">
                Payment received
              </h1>
              <p className="text-[15px] text-ui-muted-foreground mb-6 max-w-md mx-auto">
                Your payment is being processed. It may take a minute for your premium access to activate.
              </p>
              <div className="flex flex-col gap-2 max-w-[300px] mx-auto">
                <Button onClick={() => { pollCount.current = 0; setPolling(true); }}>
                  Check again
                </Button>
                <Button asChild variant="outline">
                  <Link href="/">Continue reading</Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </section>
    </AuthGuard>
  );
}

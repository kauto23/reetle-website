'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { CheckCircle2, CircleAlert, Loader2 } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import AuthGuard from '@/components/layout/AuthGuard';
import { Button } from '@/components/ui/button';
import { reportPurchaseProblem, takeCheckoutStarted } from '@/services/api';

/** How long "Confirming your payment" shows before the standard message. */
const CONFIRM_POLLS = 10;
const CONFIRM_INTERVAL_MS = 2000;
/**
 * After that the page keeps checking quietly, so it turns into the welcome by
 * itself when Stripe's confirmation arrives.
 */
const BACKGROUND_INTERVAL_MS = 10000;
const BACKGROUND_POLLS = 60;

export default function PaymentSuccessPage() {
  const { isPremium, refreshStatus } = useSubscription();
  const [waiting, setWaiting] = useState(!isPremium);
  const pollCount = useRef(0);
  const reported = useRef(false);
  const startedAt = useRef(Date.now());
  // Only a visit straight back from Stripe checkout is worth reporting.
  const cameFromCheckout = useRef(false);

  useEffect(() => {
    cameFromCheckout.current = takeCheckoutStarted();
  }, []);

  // "Confirming your payment" while Stripe's webhook normally lands.
  useEffect(() => {
    if (isPremium || !waiting) {
      setWaiting(false);
      return;
    }

    const poll = async () => {
      pollCount.current += 1;
      await refreshStatus().catch(() => {});
      if (pollCount.current >= CONFIRM_POLLS) {
        setWaiting(false);
      }
    };

    const timer = setInterval(poll, CONFIRM_INTERVAL_MS);
    poll();

    return () => clearInterval(timer);
  }, [isPremium, waiting, refreshStatus]);

  // Not confirmed in time: tell #reetle-issues once, and keep checking.
  useEffect(() => {
    if (isPremium || waiting) return;

    if (!reported.current && cameFromCheckout.current) {
      reported.current = true;
      void reportPurchaseProblem('purchase_delayed', {
        intent: 'subscribe',
        store_accepted: true,
        error_code: 'not_confirmed',
        elapsed_ms: Date.now() - startedAt.current,
      });
    }

    let polls = 0;
    const timer = setInterval(() => {
      polls += 1;
      void refreshStatus().catch(() => {});
      if (polls >= BACKGROUND_POLLS) clearInterval(timer);
    }, BACKGROUND_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isPremium, waiting, refreshStatus]);

  return (
    <AuthGuard>
      <section className="py-12 sm:py-16">
        <div className="max-w-[500px] mx-auto px-4 text-center">
          {isPremium ? (
            <div className="animate-fadeIn">
              <div className="w-20 h-20 bg-correct-bg flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-correct" />
              </div>
              <h1 className="text-display-md tracking-tight text-ui-foreground mb-2">
                Welcome to Premium
              </h1>
              <p className="text-body-lg text-ui-muted-foreground mb-10 max-w-md mx-auto">
                No more daily limits. Read, listen and practise as much as you like.
              </p>
              <Button asChild size="lg">
                <Link href="/">Start reading</Link>
              </Button>
            </div>
          ) : waiting ? (
            <>
              <div className="w-20 h-20 bg-ui-muted flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-9 h-9 animate-spin text-ui-primary" />
              </div>
              <h1 className="text-headline-lg tracking-tight text-ui-foreground mb-2">
                Confirming your payment
              </h1>
              <p className="text-body-lg text-ui-muted-foreground">
                This usually takes a few seconds.
              </p>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-ui-muted flex items-center justify-center mx-auto mb-6">
                <CircleAlert className="w-9 h-9 text-ui-muted-foreground" />
              </div>
              <h1 className="text-headline-lg tracking-tight text-ui-foreground mb-2">
                Something went wrong
              </h1>
              <p className="text-body-lg text-ui-muted-foreground mb-6 max-w-md mx-auto">
                We couldn&apos;t finish setting up Premium just now. This issue has been passed to
                our technical team. Please try again later. You won&apos;t be charged twice.
              </p>
              <div className="flex flex-col gap-2 max-w-[300px] mx-auto">
                <Button asChild>
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

'use client';

import { useState, Suspense, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Headphones,
  GraduationCap,
  Languages,
  TrendingUp,
  CheckCircle2,
  CreditCard,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useReferral } from '@/contexts/ReferralContext';
import {
  createBillingPortalSession,
  createCheckoutSession,
  applyReferralCode,
  resumeSubscription,
} from '@/services/api';
import { useLoginUrl } from '@/hooks/useLoginUrl';
import {
  billingIssueCopy,
  formatShortDate,
  storeName,
  storePaymentDetailsUrl,
  storeSubscriptionsUrl,
  subscriptionErrorMessage,
} from '@/lib/premium';
import type { BillingIssue } from '@/types/subscription';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const LIMITED_FEATURES = [
  { name: 'Read articles', free: '3 a day', premium: 'Unlimited', Icon: BookOpen },
  { name: 'Listen to audio', free: '1 a day', premium: 'Unlimited', Icon: Headphones },
  { name: 'Practice questions', free: '5 a day', premium: 'Unlimited', Icon: GraduationCap },
];

const FEATURES = [
  ...LIMITED_FEATURES,
  { name: 'Translate words', free: 'Included', premium: 'Included', Icon: Languages },
  { name: 'Track progress', free: 'Included', premium: 'Included', Icon: TrendingUp },
];

export default function PremiumPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-ui-primary" />
      </div>
    }>
      <PremiumPageContent />
    </Suspense>
  );
}

function PremiumPageContent() {
  const { isAuthenticated } = useAuth();
  const { isPremium, platform, expirationDate, willRenew, billingIssue } = useSubscription();

  if (isAuthenticated && billingIssue) {
    return <BillingIssueView issue={billingIssue} />;
  }
  if (isAuthenticated && isPremium && willRenew === false) {
    return <EndingView platform={platform} expirationDate={expirationDate} />;
  }
  if (isAuthenticated && isPremium) {
    return (
      <StatusView
        icon={<CheckCircle2 className="w-9 h-9 text-correct" />}
        iconClassName="bg-correct-bg"
        title="You're on Premium"
        body="Thanks for supporting Reetle. Reading, listening and practice have no daily limits."
      >
        <Button asChild size="xl" className="w-full max-w-[400px]">
          <Link href="/">Continue reading</Link>
        </Button>
      </StatusView>
    );
  }
  return <Paywall />;
}

// ---- new and returning subscribers ----

function Paywall() {
  const { isAuthenticated } = useAuth();
  const loginUrl = useLoginUrl();
  const { isPremium } = useSubscription();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    setCheckoutError(null);
    try {
      const { checkout_url } = await createCheckoutSession();
      window.location.href = checkout_url;
    } catch {
      setCheckoutError('Couldn\'t open checkout. Try again in a moment.');
      setIsCheckingOut(false);
    }
  };

  return (
    <section className="py-12 sm:py-16">
      <div className="max-w-[680px] mx-auto px-4">
        <div className="text-center mb-10">
          <h1 className="text-display-lg font-semibold tracking-tight text-ui-foreground mb-3 leading-tight">
            No daily limits
          </h1>
          <p className="text-body-lg text-ui-muted-foreground max-w-[480px] mx-auto">
            Read, listen and practise as much as you like with Reetle Premium.
          </p>
        </div>

        <Card className="mb-8">
          <CardContent className="p-0">
            <div className="grid grid-cols-[1fr_90px_90px] gap-2 px-5 py-3 border-b border-ui-border">
              <div />
              <div className="text-label-sm text-ui-muted-foreground uppercase text-center">Free</div>
              <div className="text-label-sm text-ui-primary uppercase text-center">Premium</div>
            </div>
            {FEATURES.map((feature, idx) => (
              <div
                key={feature.name}
                className={`grid grid-cols-[1fr_90px_90px] gap-2 items-center px-5 py-4 ${idx < FEATURES.length - 1 ? 'border-b border-ui-border' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <feature.Icon className="w-5 h-5 text-primary-light shrink-0" />
                  <span className="text-label-lg text-ui-foreground">{feature.name}</span>
                </div>
                <div className="text-body-sm text-ui-muted-foreground text-center">{feature.free}</div>
                <div className="text-body-sm text-ui-primary font-semibold text-center">{feature.premium}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="text-center mb-8">
          {isAuthenticated ? (
            <>
              <Button
                onClick={handleCheckout}
                disabled={isCheckingOut}
                size="xl"
                className="w-full max-w-[400px]"
              >
                {isCheckingOut && <Loader2 className="h-4 w-4 animate-spin" />}
                {isCheckingOut ? 'Opening checkout...' : 'Subscribe to Premium'}
              </Button>
              <p className="text-body-sm text-ui-muted-foreground mt-3">
                Renews monthly until you cancel. Cancel any time from your profile.
              </p>
              {checkoutError && (
                <p className="text-body-sm text-incorrect mt-2">{checkoutError}</p>
              )}
            </>
          ) : (
            <Button asChild size="xl" className="w-full max-w-[400px]">
              <Link href={loginUrl}>Log in to subscribe</Link>
            </Button>
          )}
        </div>

        {isAuthenticated && !isPremium && <ReferralCard />}
      </div>
    </section>
  );
}

function ReferralCard() {
  const { code: storedReferralCode, clearCode: clearStoredReferral } = useReferral();
  const [referralCode, setReferralCode] = useState(storedReferralCode ?? '');
  const [referralApplied, setReferralApplied] = useState(false);
  const [referralError, setReferralError] = useState<string | null>(null);
  const [isApplyingCode, setIsApplyingCode] = useState(false);
  const [referralPrefilled, setReferralPrefilled] = useState(Boolean(storedReferralCode));

  useEffect(() => {
    if (storedReferralCode && !referralCode && !referralApplied) {
      setReferralCode(storedReferralCode);
      setReferralPrefilled(true);
    }
  }, [storedReferralCode, referralCode, referralApplied]);

  const handleApplyReferral = async () => {
    const trimmed = referralCode.trim();
    if (!trimmed) return;
    setIsApplyingCode(true);
    setReferralError(null);
    try {
      const result = await applyReferralCode(trimmed);
      if (result.status === 'ok') {
        setReferralApplied(true);
        setReferralCode('');
        setReferralPrefilled(false);
        clearStoredReferral();
      } else {
        setReferralError(result.message);
      }
    } catch {
      setReferralError('Couldn\'t add that code. Check it and try again.');
    } finally {
      setIsApplyingCode(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-title-md font-semibold">
          {referralApplied ? 'Referral code added' : 'Got a referral code?'}
        </CardTitle>
        {!referralApplied && (
          <CardDescription>
            Add a friend&apos;s code before you subscribe and you&apos;ll both get 30 days free.
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {referralApplied ? (
          <p className="text-body-sm text-correct-text">
            You and your friend both get 30 days free when you subscribe.
          </p>
        ) : (
          <>
            {referralPrefilled && (
              <p className="text-label-md text-correct-text mb-2.5">
                Your friend&apos;s code is filled in. Press Apply to use it.
              </p>
            )}
            <div className="flex gap-2">
              <Input
                type="text"
                value={referralCode}
                onChange={(e) => {
                  setReferralCode(e.target.value.toUpperCase());
                  setReferralError(null);
                  setReferralPrefilled(false);
                }}
                placeholder="X7KQ3M9P"
                maxLength={16}
                className="font-mono tracking-wider"
              />
              <Button
                onClick={handleApplyReferral}
                disabled={isApplyingCode || !referralCode.trim()}
              >
                {isApplyingCode && <Loader2 className="h-4 w-4 animate-spin" />}
                {isApplyingCode ? 'Applying...' : 'Apply'}
              </Button>
            </div>
            {referralError && (
              <p className="text-body-sm text-incorrect mt-2">{referralError}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ---- auto-renew off, Premium still active ----

function EndingView({
  platform,
  expirationDate,
}: {
  platform: ReturnType<typeof useSubscription>['platform'];
  expirationDate: string | null;
}) {
  const { refreshStatus } = useSubscription();
  const [isResuming, setIsResuming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumed, setResumed] = useState(false);

  const endDate = expirationDate ? formatShortDate(expirationDate) : null;
  const canResumeHere = platform === 'stripe';
  const storeUrl = storeSubscriptionsUrl(platform);

  const handleResume = async () => {
    setIsResuming(true);
    setError(null);
    try {
      const result = await resumeSubscription();
      if (result.requires_user_action && result.management_url) {
        window.open(result.management_url, '_blank', 'noopener,noreferrer');
      } else {
        setResumed(true);
      }
      await refreshStatus().catch(() => {});
    } catch (err) {
      setError(subscriptionErrorMessage(err instanceof Error ? err.message : ''));
    } finally {
      setIsResuming(false);
    }
  };

  if (resumed) {
    return (
      <StatusView
        icon={<CheckCircle2 className="w-9 h-9 text-correct" />}
        iconClassName="bg-correct-bg"
        title="You're keeping Premium"
        body={endDate ? `Auto-renew is back on. Your next payment is on ${endDate}.` : 'Auto-renew is back on.'}
      >
        <Button asChild size="xl" className="w-full max-w-[400px]">
          <Link href="/">Continue reading</Link>
        </Button>
      </StatusView>
    );
  }

  const body = canResumeHere
    ? 'Auto-renew is off. Turn it back on to keep reading, listening and practising without limits.'
    : `It's billed through ${storeName(platform)}. Turn auto-renew back on there to keep it.`;

  return (
    <section className="py-12 sm:py-16">
      <div className="max-w-[680px] mx-auto px-4">
        <div className="text-center mb-10">
          <h1 className="text-display-lg font-semibold tracking-tight text-ui-foreground mb-3 leading-tight">
            {endDate ? `Your Premium ends on ${endDate}` : 'Your Premium is ending'}
          </h1>
          <p className="text-body-lg text-ui-muted-foreground max-w-[480px] mx-auto">{body}</p>
        </div>

        <Card className="mb-8">
          <CardContent className="p-0">
            <div className="px-5 py-3 border-b border-ui-border text-label-sm text-ui-muted-foreground uppercase">
              {endDate ? `What changes on ${endDate}` : 'What changes when it ends'}
            </div>
            {LIMITED_FEATURES.map((feature, idx) => (
              <div
                key={feature.name}
                className={`flex items-center gap-3 px-5 py-4 ${idx < LIMITED_FEATURES.length - 1 ? 'border-b border-ui-border' : ''}`}
              >
                <feature.Icon className="w-5 h-5 text-primary-light shrink-0" />
                <span className="text-label-lg text-ui-foreground flex-1">{feature.name}</span>
                <span className="text-body-sm text-ui-muted-foreground line-through">{feature.premium}</span>
                <span className="text-body-sm text-ui-foreground font-semibold">{feature.free}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="text-center">
          {canResumeHere ? (
            <>
              <Button
                onClick={handleResume}
                disabled={isResuming}
                size="xl"
                className="w-full max-w-[400px]"
              >
                {isResuming && <Loader2 className="h-4 w-4 animate-spin" />}
                Keep Premium
              </Button>
              {endDate && (
                <p className="text-body-sm text-ui-muted-foreground mt-3">
                  You won&apos;t be charged before {endDate}.
                </p>
              )}
            </>
          ) : storeUrl ? (
            <Button asChild size="xl" className="w-full max-w-[400px]">
              <a href={storeUrl} target="_blank" rel="noopener noreferrer">
                Open {storeName(platform)}
              </a>
            </Button>
          ) : (
            <Button asChild size="xl" className="w-full max-w-[400px]">
              <Link href="/">Continue reading</Link>
            </Button>
          )}
          {error && <p className="text-body-sm text-incorrect mt-2">{error}</p>}
        </div>
      </div>
    </section>
  );
}

// ---- a renewal payment failed ----

function BillingIssueView({ issue }: { issue: BillingIssue }) {
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = billingIssueCopy(issue);
  const storeUrl = storePaymentDetailsUrl(issue.platform);

  const handleStripe = async () => {
    setIsOpening(true);
    setError(null);
    try {
      const { url } = await createBillingPortalSession();
      window.location.href = url;
    } catch (err) {
      setError(subscriptionErrorMessage(err instanceof Error ? err.message : ''));
      setIsOpening(false);
    }
  };

  return (
    <StatusView
      icon={<CreditCard className="w-9 h-9 text-incorrect" />}
      iconClassName="bg-incorrect-bg"
      title={copy.title}
      body={copy.body}
    >
      <div className="flex flex-col gap-2 w-full max-w-[400px] mx-auto">
        {storeUrl ? (
          <Button asChild size="xl">
            <a href={storeUrl} target="_blank" rel="noopener noreferrer">{copy.action}</a>
          </Button>
        ) : (
          <Button onClick={handleStripe} disabled={isOpening} size="xl">
            {isOpening && <Loader2 className="h-4 w-4 animate-spin" />}
            {copy.action}
          </Button>
        )}
        <Button asChild variant="outline" size="lg">
          <Link href="/">Continue reading</Link>
        </Button>
        {error && <p className="text-body-sm text-incorrect mt-1">{error}</p>}
      </div>
    </StatusView>
  );
}

function StatusView({
  icon,
  iconClassName,
  title,
  body,
  children,
}: {
  icon: ReactNode;
  iconClassName: string;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <section className="py-12 sm:py-16">
      <div className="max-w-[680px] mx-auto px-4 text-center">
        <div className={`w-[72px] h-[72px] flex items-center justify-center mx-auto mb-6 ${iconClassName}`}>
          {icon}
        </div>
        <h1 className="text-display-md tracking-tight text-ui-foreground mb-3">{title}</h1>
        <p className="text-body-lg text-ui-muted-foreground mb-9 max-w-[480px] mx-auto">{body}</p>
        {children}
      </div>
    </section>
  );
}

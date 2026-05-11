'use client';

import { useState, Suspense, useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Headphones,
  HelpCircle,
  Languages,
  BarChart3,
  CheckCircle2,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useReferral } from '@/contexts/ReferralContext';
import { createCheckoutSession, applyReferralCode, cancelSubscription } from '@/services/api';
import { useLoginUrl } from '@/hooks/useLoginUrl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const FEATURES = [
  { name: 'Read articles', free: '3 per day', premium: 'Unlimited', Icon: BookOpen },
  { name: 'Listen to audio', free: '1 per day', premium: 'Unlimited', Icon: Headphones },
  { name: 'Practice questions', free: '5 per day', premium: 'Unlimited', Icon: HelpCircle },
  { name: 'Translate words', free: 'Included', premium: 'Included', Icon: Languages },
  { name: 'Track progress', free: 'Included', premium: 'Included', Icon: BarChart3 },
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
  const loginUrl = useLoginUrl();
  const { isPremium, platform, expirationDate, refreshStatus } = useSubscription();
  const { code: storedReferralCode, clearCode: clearStoredReferral } = useReferral();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState<{
    message: string;
    requiresUserAction: boolean;
    managementUrl?: string;
  } | null>(null);

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

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    setCheckoutError(null);
    try {
      const { checkout_url } = await createCheckoutSession();
      window.location.href = checkout_url;
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setIsCheckingOut(false);
    }
  };

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
      setReferralError('Failed to apply code. Please try again.');
    } finally {
      setIsApplyingCode(false);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const handleCancelSubscription = async () => {
    setIsCancelling(true);
    setCancelError(null);
    try {
      const result = await cancelSubscription();
      const endDate = formatDate(result.is_premium_until);
      if (result.requires_user_action && result.management_url) {
        window.open(result.management_url, '_blank', 'noopener,noreferrer');
        setCancelSuccess({
          message: result.message || `Apple subscriptions must be cancelled in Apple's subscription settings. We've opened it for you. Premium remains active until ${endDate}.`,
          requiresUserAction: true,
          managementUrl: result.management_url,
        });
      } else {
        setCancelSuccess({
          message: `Your premium access will end on ${endDate}.`,
          requiresUserAction: false,
        });
      }
      await refreshStatus();
    } catch (err) {
      const code = err instanceof Error ? err.message : 'unknown_error';
      let friendly = 'Could not cancel your subscription. Please try again.';
      if (code === 'no_active_subscription') friendly = 'No active subscription found.';
      else if (code === 'not_user_cancellable') friendly = 'This subscription is managed externally and cannot be cancelled here.';
      setCancelError(friendly);
    } finally {
      setIsCancelling(false);
    }
  };

  if (isAuthenticated && isPremium) {
    return (
      <section className="py-12 sm:py-16">
        <div className="max-w-[600px] mx-auto px-4 text-center">
          <div className="w-16 h-16 bg-correct-bg rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-correct" />
          </div>
          <h1 className="text-[28px] font-semibold tracking-tight text-ui-foreground mb-2">You&apos;re on Premium</h1>
          <p className="text-[15px] text-ui-muted-foreground mb-8 max-w-md mx-auto">
            Enjoy unlimited articles, audio, and practice.
          </p>

          <Card className="text-left">
            <CardContent className="p-5">
              <div className="flex items-center justify-between py-2">
                <span className="text-[13px] text-ui-muted-foreground">Plan</span>
                <span className="text-[15px] text-ui-foreground font-medium capitalize">{platform || 'Premium'}</span>
              </div>
              {expirationDate && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between py-2">
                    <span className="text-[13px] text-ui-muted-foreground">Renews</span>
                    <span className="text-[15px] text-ui-foreground font-medium">{formatDate(expirationDate)}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {cancelSuccess && (
            <div className="mt-6 rounded-md border border-ui-border bg-ui-muted/30 p-4 text-left space-y-2">
              <p className="text-[13px] text-ui-foreground">{cancelSuccess.message}</p>
              {cancelSuccess.requiresUserAction && cancelSuccess.managementUrl && (
                <Button asChild size="sm" variant="outline">
                  <a href={cancelSuccess.managementUrl} target="_blank" rel="noopener noreferrer">
                    Open Apple subscription settings
                  </a>
                </Button>
              )}
            </div>
          )}

          {cancelError && (
            <p className="text-[13px] text-incorrect mt-4">{cancelError}</p>
          )}

          <div className="mt-8 flex flex-col items-center gap-3">
            <Button asChild size="lg">
              <Link href="/">Continue Reading</Link>
            </Button>

            {platform !== 'referral' && !cancelSuccess && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-ui-muted-foreground">
                    Cancel subscription
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {expirationDate ? (
                        <>You&apos;ll keep premium access until {formatDate(expirationDate)}, then your account will switch to the free tier.</>
                      ) : (
                        <>You&apos;ll keep premium access until the end of your current billing period, then your account will switch to the free tier.</>
                      )}
                      {platform === 'apple' && (
                        <>{' '}Apple subscriptions are cancelled in Apple&apos;s subscription settings. We&apos;ll open the page for you.</>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isCancelling}>Keep subscription</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={isCancelling}
                      onClick={handleCancelSubscription}
                    >
                      {isCancelling ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Cancelling...
                        </>
                      ) : (
                        'Cancel subscription'
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 sm:py-16">
      <div className="max-w-[680px] mx-auto px-4">
        <div className="text-center mb-10">
          <Badge variant="accent" className="mb-3">
            <Sparkles className="w-3 h-3 mr-1" />
            Premium
          </Badge>
          <h1 className="text-[36px] sm:text-[40px] font-semibold tracking-tight text-ui-foreground mb-3 leading-tight">
            Unlimited Learning
          </h1>
          <p className="text-[16px] text-ui-muted-foreground max-w-[480px] mx-auto">
            Remove daily limits and get the most out of Reetle.
          </p>
        </div>

        <Card className="mb-8">
          <CardContent className="p-0">
            <div className="grid grid-cols-[1fr_90px_90px] gap-2 px-5 py-3 border-b border-ui-border">
              <div />
              <div className="text-[11px] font-semibold text-ui-muted-foreground uppercase tracking-wider text-center">Free</div>
              <div className="text-[11px] font-semibold text-ui-primary uppercase tracking-wider text-center">Premium</div>
            </div>
            {FEATURES.map((feature, idx) => (
              <div
                key={feature.name}
                className={`grid grid-cols-[1fr_90px_90px] gap-2 items-center px-5 py-4 ${idx < FEATURES.length - 1 ? 'border-b border-ui-border' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <feature.Icon className="w-5 h-5 text-primary-light shrink-0" />
                  <span className="text-[14px] text-ui-foreground font-medium">{feature.name}</span>
                </div>
                <div className="text-[13px] text-ui-muted-foreground text-center">{feature.free}</div>
                <div className="text-[13px] text-ui-primary font-semibold text-center">{feature.premium}</div>
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
                {isCheckingOut ? 'Redirecting to checkout...' : 'Subscribe to Premium'}
              </Button>
              {checkoutError && (
                <p className="text-[13px] text-incorrect mt-3">{checkoutError}</p>
              )}
            </>
          ) : (
            <Button asChild size="xl" className="w-full max-w-[400px]">
              <Link href={loginUrl}>Log in to Subscribe</Link>
            </Button>
          )}
        </div>

        {isAuthenticated && !isPremium && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-[16px]">
                {referralApplied ? 'Referral applied' : 'Have a referral code?'}
              </CardTitle>
              {!referralApplied && (
                <CardDescription>
                  Enter a friend&apos;s code to both get 30 days free when you upgrade.
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {referralApplied ? (
                <p className="text-[13px] text-correct-text">
                  Referral code applied. You and your friend will both be rewarded when you upgrade to Premium.
                </p>
              ) : (
                <>
                  {referralPrefilled && (
                    <p className="text-[12px] text-correct-text mb-2.5">
                      Referral code ready. Tap Apply to use it.
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
                      placeholder="e.g. X7KQ3M9P"
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
                    <p className="text-[13px] text-incorrect mt-2">{referralError}</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}

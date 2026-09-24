'use client';

import { useState, Suspense, useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Headphones,
  GraduationCap,
  Languages,
  TrendingUp,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useReferral } from '@/contexts/ReferralContext';
import { createCheckoutSession, applyReferralCode } from '@/services/api';
import { useLoginUrl } from '@/hooks/useLoginUrl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
const FEATURES = [
  { name: 'Read articles', free: '3 / day', premium: 'Unlimited', Icon: BookOpen },
  { name: 'Listen to audio', free: '1 / day', premium: 'Unlimited', Icon: Headphones },
  { name: 'Practice questions', free: '5 / day', premium: 'Unlimited', Icon: GraduationCap },
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
  const loginUrl = useLoginUrl();
  const { isPremium } = useSubscription();
  const { code: storedReferralCode, clearCode: clearStoredReferral } = useReferral();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

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

  if (isAuthenticated && isPremium) {
    return (
      <section className="py-12 sm:py-16">
        <div className="max-w-[680px] mx-auto px-4 text-center">
          <div className="w-[72px] h-[72px] bg-correct-bg flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-9 h-9 text-correct" />
          </div>
          <h1 className="text-display-md tracking-tight text-ui-foreground mb-3">You&apos;re on Premium</h1>
          <p className="text-body-lg text-ui-muted-foreground mb-9 max-w-[480px] mx-auto">
            Thanks for supporting Reetle. Enjoy unlimited reading, listening and practice.
          </p>
          <Button asChild size="xl" className="w-full max-w-[400px]">
            <Link href="/">Continue reading</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 sm:py-16">
      <div className="max-w-[680px] mx-auto px-4">
        <div className="text-center mb-10">
          <h1 className="text-display-lg font-semibold tracking-tight text-ui-foreground mb-3 leading-tight">
            Unlimited Learning
          </h1>
          <p className="text-body-lg text-ui-muted-foreground max-w-[480px] mx-auto">
            Remove daily limits and get the most out of Reetle.
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
                {isCheckingOut ? 'Redirecting to checkout...' : 'Subscribe to Premium'}
              </Button>
              {checkoutError && (
                <p className="text-body-sm text-incorrect mt-3">{checkoutError}</p>
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
              <CardTitle className="text-title-md font-semibold">
                {referralApplied ? 'Referral applied' : 'Have a referral code?'}
              </CardTitle>
              {!referralApplied && (
                <CardDescription>
                  Enter a friend&apos;s code before subscribing — you&apos;ll both earn 30 free days when you upgrade.
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {referralApplied ? (
                <p className="text-body-sm text-correct-text">
                  Referral code applied. You and your friend will both be rewarded when you upgrade to Premium.
                </p>
              ) : (
                <>
                  {referralPrefilled && (
                    <p className="text-label-md text-correct-text mb-2.5">
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
        )}
      </div>
    </section>
  );
}

'use client';

import Link from 'next/link';
import { ChevronRight, Gift, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useReferral } from '@/contexts/ReferralContext';

/**
 * Referral offer card for the hero-row sidebar slot.
 *
 * Mirrors the sidebar variant of `ArticleCard` so it reads as a card in the
 * column rather than a standalone promo. The thumbnail is replaced with a
 * brand-purple panel and a gift glyph.
 */
export default function ReferralCTA() {
  const { isAuthenticated } = useAuth();
  const { isPremium } = useSubscription();
  const { code, isBannerDismissed, dismissBanner } = useReferral();

  if (!code) return null;
  if (isPremium) return null;
  if (isBannerDismissed) return null;

  const ctaHref = isAuthenticated ? '/premium' : '/login?redirect=%2Fpremium';
  const ctaLabel = isAuthenticated ? 'Redeem now' : 'Sign up to redeem';

  return (
    <div className="relative bg-ui-card overflow-hidden border border-ui-border rounded-none flex h-full flex-1 transition-shadow hover:shadow-md">
      <button
        onClick={dismissBanner}
        aria-label="Dismiss referral offer"
        title="Dismiss"
        className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center rounded-full text-ui-muted-foreground hover:text-ui-foreground bg-ui-card/70 hover:bg-ui-card border-none cursor-pointer transition-colors z-10"
      >
        <X className="w-3 h-3" />
      </button>

      <div className="relative h-[132px] w-[130px] lg:w-[160px] shrink-0 overflow-hidden bg-ui-primary flex items-center justify-center">
        <Gift className="w-10 h-10 text-white opacity-95" strokeWidth={1.6} />
      </div>

      <div className="p-3 flex flex-col justify-center flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-label-sm uppercase text-ui-primary">
            Referral offer
          </span>
        </div>
        <h3 className="text-title-sm text-ui-foreground mb-1">
          1 free month of Premium
        </h3>
        <p className="text-label-md text-ui-muted-foreground mb-2">
          Code{' '}
          <span className="font-mono font-semibold text-ui-primary tracking-wider">
            {code}
          </span>
          {' '}saved for you
        </p>
        <Link
          href={ctaHref}
          className="group inline-flex items-center gap-1 text-label-md font-semibold text-ui-primary hover:text-primary-light transition-colors no-underline w-fit"
        >
          <span>{ctaLabel}</span>
          <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
}

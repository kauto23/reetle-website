'use client';

import { useLayoutEffect, useState, type ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ONBOARDING_NAV_KEY, type OnboardingDirection } from '@/components/onboarding/onboardingNav';

interface OnboardingScaffoldProps {
  title: string;
  subtitle: string;
  showBackButton?: boolean;
  onBack?: () => void;
  /** Set while leaving the screen so the content fades out before navigation. */
  exiting?: OnboardingDirection | null;
  children: ReactNode;
}

/**
 * Full-screen onboarding shell matching the Flutter app:
 * purple header, white sheet of options at the bottom.
 * The purple backdrop stays put between steps; only the content moves.
 */
export default function OnboardingScaffold({
  title,
  subtitle,
  showBackButton = false,
  onBack,
  exiting = null,
  children,
}: OnboardingScaffoldProps) {
  const [direction, setDirection] = useState<OnboardingDirection>('forward');

  useLayoutEffect(() => {
    const stored = sessionStorage.getItem(ONBOARDING_NAV_KEY);
    sessionStorage.removeItem(ONBOARDING_NAV_KEY);
    if (stored === 'back') setDirection('back');
  }, []);

  const motionClass = exiting
    ? exiting === 'back'
      ? 'onboarding-exit-back'
      : 'onboarding-exit-forward'
    : direction === 'back'
      ? 'onboarding-route-back'
      : 'onboarding-route-forward';

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden bg-primary pt-[env(safe-area-inset-top)]"
      style={{ zIndex: 'var(--z-onboarding)' }}
    >
      <div
        className={cn(
          'mx-auto flex h-full w-full max-w-[480px] min-h-0 flex-col',
          motionClass,
          exiting && 'pointer-events-none'
        )}
      >
        <header className="flex min-h-[132px] flex-1 flex-col justify-center px-6">
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="onboarding-title whitespace-pre-line text-headline-lg leading-[1.2] text-white">
                {title}
              </h1>
              <p className="onboarding-subtitle mt-1.5 text-body-md leading-[1.4] text-white/85">
                {subtitle}
              </p>
            </div>
            {showBackButton && (
              <button
                type="button"
                onClick={onBack}
                aria-label="Back"
                className="flex h-10 w-10 shrink-0 items-center justify-center bg-white/15 text-white transition-transform active:scale-90"
              >
                <ArrowLeft className="h-[22px] w-[22px]" strokeWidth={2} />
              </button>
            )}
          </div>
        </header>

        <div className="onboarding-sheet min-h-0 max-h-[calc(100%-132px)] shrink overflow-y-auto  bg-white">
          <div className="px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

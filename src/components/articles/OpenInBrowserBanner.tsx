'use client';

import { useCallback, useState, useEffect } from 'react';
import { ExternalLink, MoreHorizontal, X, MousePointer2 } from 'lucide-react';
import { useInAppBrowser } from '@/hooks/useInAppBrowser';
import { useIsMobileDevice } from '@/hooks/useIsMobileDevice';
import { useAuth } from '@/contexts/AuthContext';

type Step = 'browser' | 'translate' | null;

const ONBOARDING_DISMISSED_KEY = 'reetle-mobile-onboarding-dismissed';

/**
 * Multi-step onboarding on phones and tablets (any mobile browser, including
 * in-app WebViews and Safari/Chrome).
 *
 * Step 1 – Full-page overlay: "Tap any word to translate".
 * Step 2 – Inline banner: "Open in external browser" (in-app WebViews only; skipped in
 *   Safari/Chrome and other standalone mobile browsers).
 *
 * Frequency:
 *   - Logged-in users: shown once ever (localStorage).
 *   - Guests: shown once per browser session (sessionStorage).
 *
 * On Android in-app, step 2 offers a direct intent-based redirect.
 */
export default function OpenInBrowserBanner() {
  const inAppBrowser = useInAppBrowser();
  const isMobileDevice = useIsMobileDevice();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [step, setStep] = useState<Step>(null);

  useEffect(() => {
    if (isMobileDevice !== true || authLoading) return;

    const alreadyDismissed = isAuthenticated
      ? localStorage.getItem(ONBOARDING_DISMISSED_KEY)
      : sessionStorage.getItem(ONBOARDING_DISMISSED_KEY);

    if (alreadyDismissed) return;

    setStep('translate');
  }, [isMobileDevice, isAuthenticated, authLoading]);

  useEffect(() => {
    if (step === 'browser' && !inAppBrowser) setStep(null);
  }, [step, inAppBrowser]);

  const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);

  const markDismissed = useCallback(() => {
    if (isAuthenticated) {
      localStorage.setItem(ONBOARDING_DISMISSED_KEY, 'true');
    } else {
      sessionStorage.setItem(ONBOARDING_DISMISSED_KEY, 'true');
    }
  }, [isAuthenticated]);

  const dismissTranslate = useCallback(() => {
    markDismissed();
    setStep(inAppBrowser ? 'browser' : null);
  }, [inAppBrowser, markDismissed]);
  const dismissBrowser = useCallback(() => setStep(null), []);

  const openInBrowser = useCallback(() => {
    const url = window.location.href;
    const stripped = url.replace(/^https?:\/\//, '');
    window.location.href =
      `intent://${stripped}#Intent;scheme=https;package=com.android.chrome;end;`;
    setTimeout(() => {
      window.location.href =
        `intent://${stripped}#Intent;scheme=https;action=android.intent.action.VIEW;end;`;
    }, 500);
  }, []);

  // Lock scroll while an overlay is visible
  useEffect(() => {
    if (step === 'translate') {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [step]);

  if (isMobileDevice !== true || !step) return null;

  const appName =
    inAppBrowser === 'facebook' ? 'Facebook'
    : inAppBrowser === 'instagram' ? 'Instagram'
    : inAppBrowser === 'tiktok' ? 'TikTok'
    : inAppBrowser === 'linkedin' ? 'LinkedIn'
    : null;

  // ── Step 2: inline banner (in-app WebViews only) ────────────────────────────
  if (step === 'browser') {
    if (!inAppBrowser) return null;

    return (
      <div className="max-w-[800px] mx-auto px-md">
      <div className="flex items-start gap-[10px] bg-primary/[0.06] rounded-lg px-[14px] py-[10px] mb-md animate-fadeIn">
        <ExternalLink size={18} strokeWidth={2} className="text-primary/60 flex-shrink-0 mt-[2px]" />

        <div className="flex-1 min-w-0">
          {isAndroid ? (
            <p className="text-[14px] text-primary leading-snug">
              For the best experience,{' '}
              <button
                onClick={openInBrowser}
                className="text-primary font-semibold underline underline-offset-2 decoration-primary/40
                  bg-transparent border-none cursor-pointer p-0 text-[14px]
                  hover:decoration-primary transition-colors"
              >
                open in your browser
              </button>
              .
            </p>
          ) : (
            <p className="text-[14px] text-primary leading-snug">
              {`You're viewing this inside ${appName}. For the best experience, tap `}
              <span className="inline-flex items-center align-middle mx-[2px]">
                <MoreHorizontal size={14} fill="currentColor" className="text-primary" />
              </span>
              {' then '}
              <span className="font-semibold">&ldquo;Open in external browser&rdquo;</span>.
            </p>
          )}
        </div>

        <button
          onClick={dismissBrowser}
          className="w-[24px] h-[24px] flex-shrink-0 flex items-center justify-center rounded-full
            bg-transparent hover:bg-primary/10 border-none cursor-pointer transition-colors mt-[2px]"
          aria-label="Dismiss"
        >
          <X size={14} strokeWidth={2.5} className="text-primary/40" />
        </button>
      </div>
      </div>
    );
  }

  // ── Step 1: full-page overlay — tap to translate ───────────────────────────
  if (step === 'translate') {
    return (
      <div className="fixed inset-0 z-[2000]">
        <div className="absolute inset-0 bg-primary-dark/80 backdrop-blur-sm" />

        <div className="absolute inset-x-[16px] top-[50%] -translate-y-1/2 bg-white rounded-xl p-[24px] shadow-2xl animate-fadeIn">
          <div className="flex flex-col items-center text-center gap-[16px]">
            <div className="w-[56px] h-[56px] rounded-full bg-primary/10 flex items-center justify-center">
              <MousePointer2 size={28} strokeWidth={2} color="#4A2462" />
            </div>

            <div>
              <h2 className="text-[18px] font-semibold text-primary mb-[6px]">
                Tap to translate
              </h2>
              <p className="text-[14px] text-ui-muted-foreground leading-[1.5]">
                Tap any <strong className="text-primary">word</strong> or highlight
                a <strong className="text-primary">phrase</strong> in the article to translate it.
              </p>
            </div>

            <button
              onClick={dismissTranslate}
              className="w-full bg-primary text-white font-medium py-[14px] rounded-lg text-[15px] cursor-pointer border-none transition-colors hover:bg-primary-dark active:bg-primary-dark"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

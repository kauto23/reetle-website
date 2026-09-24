'use client';

import { useCallback, useState, useEffect } from 'react';
import { ExternalLink, MoreHorizontal, X } from 'lucide-react';
import { useInAppBrowser } from '@/hooks/useInAppBrowser';

const DISMISSED_KEY = 'reetle-open-in-browser-dismissed';

const APP_NAMES = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
} as const;

/**
 * Inline banner shown inside in-app WebViews (Instagram, Facebook, TikTok,
 * LinkedIn) nudging the reader to open the article in their real browser.
 * Dismissal lasts for the browser session. On Android the link fires an
 * intent straight into Chrome.
 */
export default function OpenInBrowserBanner() {
  const inAppBrowser = useInAppBrowser();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(!!sessionStorage.getItem(DISMISSED_KEY));
  }, []);

  const dismiss = useCallback(() => {
    sessionStorage.setItem(DISMISSED_KEY, 'true');
    setDismissed(true);
  }, []);

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

  if (!inAppBrowser || dismissed) return null;

  const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
  const appName = APP_NAMES[inAppBrowser];

  return (
    <div className="max-w-[800px] mx-auto px-md">
      <div className="flex items-start gap-[10px] bg-primary/[0.06] px-[14px] py-[10px] mb-md animate-fadeIn">
        <ExternalLink size={18} strokeWidth={2} className="text-primary/60 flex-shrink-0 mt-[2px]" />

        <div className="flex-1 min-w-0">
          {isAndroid ? (
            <p className="text-body-md text-primary leading-snug">
              For the best experience,{' '}
              <button
                onClick={openInBrowser}
                className="text-body-md text-primary font-semibold underline underline-offset-2 decoration-primary/40
                  bg-transparent border-none cursor-pointer p-0 hover:decoration-primary transition-colors"
              >
                open in your browser
              </button>
              .
            </p>
          ) : (
            <p className="text-body-md text-primary leading-snug">
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
          onClick={dismiss}
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

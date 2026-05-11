'use client';

import { useState, useEffect } from 'react';

type InAppBrowser = 'facebook' | 'instagram' | 'tiktok' | 'linkedin' | null;

/**
 * Detects whether the page is being viewed inside a social app's
 * in-app browser (WebView). Returns the app name or null.
 */
export function useInAppBrowser(): InAppBrowser {
  const [browser, setBrowser] = useState<InAppBrowser>(null);

  useEffect(() => {
    const ua = navigator.userAgent || '';

    if (/FBAN|FBAV|FB_IAB|FBIOS|FBANDROID/i.test(ua)) {
      setBrowser('facebook');
    } else if (/Instagram/i.test(ua)) {
      setBrowser('instagram');
    } else if (/musical_ly|Bytedance|TikTok/i.test(ua)) {
      setBrowser('tiktok');
    } else if (/LinkedInApp/i.test(ua)) {
      setBrowser('linkedin');
    }
  }, []);

  return browser;
}

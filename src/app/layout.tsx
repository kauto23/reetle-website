import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { Outfit } from 'next/font/google';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ErrorBoundary from '@/components/layout/ErrorBoundary';
import NetworkStatus from '@/components/layout/NetworkStatus';
import MobileGuestNudge from '@/components/layout/MobileGuestNudge';
import { AuthProvider } from '@/contexts/AuthContext';
import { GuestPreferencesProvider } from '@/contexts/GuestPreferencesContext';
import { ArticlesProvider } from '@/contexts/ArticlesContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { ReferralProvider } from '@/contexts/ReferralContext';
import { AudioStatusProvider } from '@/contexts/AudioStatusContext';
import { PlayAllAudioProvider } from '@/contexts/PlayAllAudioContext';
import { Toaster } from '@/components/ui/sonner';
import { SHOW_APP_STORE_PROMO } from '@/config/site-promos';
import { API_ORIGIN } from '@/config/environment';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-outfit',
  // Wait for the font to load before showing text (up to ~3s). Prevents the
  // first-tap "stale handle position" bug in article selection, where text
  // measured with the fallback font reflowed after Outfit swapped in.
  display: 'block',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://reetle.co';
const DEFAULT_OG_IMAGE = '/images/reetle_facebook_cover.png';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Reetle - Learn Languages Through Reading',
  description: 'Improve your language skills by reading real articles in your target language. Reetle adapts to your CEFR level with personalised content, translations, and practice.',
  keywords: ['language learning', 'CEFR', 'reading', 'vocabulary', 'translations', 'practice', 'Reetle'],
  openGraph: {
    title: 'Reetle - Learn Languages Through Reading',
    description: 'Read real articles, translate words on-the-fly, and practice vocabulary — all personalised to your level.',
    type: 'website',
    siteName: 'Reetle',
    url: SITE_URL,
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Reetle — Learn languages through reading',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Reetle - Learn Languages Through Reading',
    description: 'Read real articles, translate words on-the-fly, and practice vocabulary — all personalised to your level.',
    images: [DEFAULT_OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
  },
  other: {
    ...(SHOW_APP_STORE_PROMO ? { 'apple-itunes-app': 'app-id=6747426043' } : {}),
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#4A2462',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={outfit.variable}>
      <head>
        <link rel="preconnect" href={API_ORIGIN} />
        <link rel="dns-prefetch" href={API_ORIGIN} />
      </head>
      <body className="font-outfit bg-background text-primary min-h-screen flex flex-col">
        <ErrorBoundary>
          <AuthProvider>
            <SubscriptionProvider>
              <ReferralProvider>
                <GuestPreferencesProvider>
                  <ArticlesProvider>
                    <AudioStatusProvider>
                        <PlayAllAudioProvider>
                        <Suspense><Header /></Suspense>
                        <MobileGuestNudge />
                        <main className="flex-1">
                          {children}
                        </main>
                        <Footer />
                        <NetworkStatus />
                        <Toaster position="bottom-right" offset={16} richColors />
                        </PlayAllAudioProvider>
                    </AudioStatusProvider>
                  </ArticlesProvider>
                </GuestPreferencesProvider>
              </ReferralProvider>
            </SubscriptionProvider>
          </AuthProvider>
      </ErrorBoundary>
      </body>
    </html>
  );
}

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
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: 'Reetle - Learn Languages Through Reading',
  description: 'Improve your language skills by reading real articles in your target language. Reetle adapts to your CEFR level with personalised content, translations, and practice.',
  keywords: ['language learning', 'CEFR', 'reading', 'vocabulary', 'translations', 'practice', 'Reetle'],
  openGraph: {
    title: 'Reetle - Learn Languages Through Reading',
    description: 'Read real articles, translate words on-the-fly, and practice vocabulary — all personalised to your level.',
    type: 'website',
    siteName: 'Reetle',
  },
  robots: {
    index: true,
    follow: true,
  },
  other: {
    'apple-itunes-app': 'app-id=6747426043',
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
        <link rel="preconnect" href="https://reetle-api-production-507485624349.us-central1.run.app" />
        <link rel="dns-prefetch" href="https://reetle-api-production-507485624349.us-central1.run.app" />
      </head>
      <body className="font-outfit bg-background text-primary min-h-screen flex flex-col">
        <ErrorBoundary>
          <AuthProvider>
            <GuestPreferencesProvider>
              <ArticlesProvider>
                <Suspense><Header /></Suspense>
                <MobileGuestNudge />
                <main className="flex-1">
                  {children}
                </main>
                <Footer />
                <NetworkStatus />
              </ArticlesProvider>
            </GuestPreferencesProvider>
          </AuthProvider>
      </ErrorBoundary>
      </body>
    </html>
  );
}

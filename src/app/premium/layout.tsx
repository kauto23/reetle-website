import type { Metadata } from 'next';

const PREMIUM_OG_IMAGE = '/images/reetle_facebook_cover.png';

export const metadata: Metadata = {
  title: 'Reetle Premium — Unlimited Language Learning',
  description: 'Unlock unlimited articles, audio, and practice on Reetle. Use a friend\u2019s referral code and you both get 30 days free.',
  openGraph: {
    title: 'Reetle Premium — Unlimited Language Learning',
    description: 'Unlock unlimited articles, audio, and practice on Reetle. Use a friend\u2019s referral code and you both get 30 days free.',
    type: 'website',
    siteName: 'Reetle',
    images: [
      {
        url: PREMIUM_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Reetle Premium — Unlimited language learning',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Reetle Premium — Unlimited Language Learning',
    description: 'Unlock unlimited articles, audio, and practice on Reetle. Use a friend\u2019s referral code and you both get 30 days free.',
    images: [PREMIUM_OG_IMAGE],
  },
};

export default function PremiumLayout({ children }: { children: React.ReactNode }) {
  return children;
}

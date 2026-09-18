'use client';

import Image from 'next/image';
import { ChevronRight } from 'lucide-react';

const APP_STORE_URL = 'https://apps.apple.com/app/reetle/id6747426043';

function AppleIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

/**
 * Editorial App Store spotlight card for the hero-row sidebar slot.
 *
 * Matches the dimensions and structure of the sidebar `ArticleCard` (132px height)
 * with responsive behavior:
 * - Desktop (lg): Shows scannable QR code for instant camera scan on iPhone.
 * - Mobile (< lg): Shows iOS app icon with direct 1-tap download link.
 */
export default function AppStoreCTA() {
  return (
    <a
      href={APP_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="relative bg-primary text-white overflow-hidden border border-ui-border rounded-none flex h-full flex-1 transition-all duration-200 hover:shadow-md hover:border-primary/40 group no-underline"
      aria-label="Download Reetle on the Apple App Store"
    >
      {/* Thumbnail area (App Icon on Mobile, QR Code on Desktop) */}
      <div className="relative h-[132px] w-[130px] lg:w-[160px] shrink-0 overflow-hidden bg-black/15 flex flex-col items-center justify-center p-2">
        {/* Mobile: App Icon */}
        <div className="lg:hidden flex items-center justify-center">
          <Image
            src="/images/AppIcon1024.png"
            alt="Reetle iOS App"
            width={64}
            height={64}
            className="rounded-[14px] shadow-md border border-white/10"
          />
        </div>

        {/* Desktop: Scannable QR Code */}
        <div className="hidden lg:flex flex-col items-center justify-center">
          <div className="bg-white p-1 rounded-md shadow-sm group-hover:scale-105 transition-transform">
            <Image
              src="/images/appstore-qr.svg"
              alt="Scan to download on App Store"
              width={76}
              height={76}
              className="block"
            />
          </div>
          <span className="text-[10px] text-white/80 font-medium tracking-wide mt-1">
            Scan with iPhone
          </span>
        </div>
      </div>

      {/* Content area */}
      <div className="p-3 flex flex-col justify-center flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1 text-white/80">
          <AppleIcon className="w-3 h-3 shrink-0" />
          <span className="text-label-sm uppercase tracking-wider font-semibold">
            Official App
          </span>
        </div>
        <h3 className="text-title-sm text-white mb-1 font-semibold leading-snug">
          Reetle for iOS
        </h3>
        <p className="text-label-md text-white/80 mb-2 leading-tight line-clamp-2">
          Read articles, translate words & practice on the go.
        </p>
        <div className="inline-flex items-center gap-1 text-label-md font-semibold text-white group-hover:text-white/90 transition-colors w-fit">
          <span className="underline underline-offset-4 decoration-white/40 group-hover:decoration-white">
            Download on App Store
          </span>
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </a>
  );
}

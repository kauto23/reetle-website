'use client';

import Image from 'next/image';

const APP_STORE_URL = 'https://apps.apple.com/app/reetle/id6747426043';

export default function AppStoreCTA() {
  return (
    <a
      href={APP_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="block no-underline group flex-1"
    >
      <div className="bg-primary overflow-hidden flex items-stretch h-full">
        {/* App icon side */}
        <div className="relative w-[130px] sm:w-[160px] shrink-0 flex items-center justify-center">
          <Image
            src="/images/AppIcon1024.png"
            alt="Reetle App"
            width={72}
            height={72}
            className="rounded-[14px] shadow-lg"
          />
        </div>

        {/* Text content */}
        <div className="p-[14px] flex flex-col justify-center flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white mb-[4px]">
            Free on the App Store
          </p>
          <p className="text-[14px] sm:text-[15px] font-semibold leading-[1.3] text-white mb-[8px]">
            Get the Reetle iOS app
          </p>
          <div className="flex items-center gap-[6px] text-[11px] font-medium text-white group-hover:text-white/80 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            <span>Download for iPhone</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-[2px] transition-transform">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </div>
      </div>
    </a>
  );
}

import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="bg-primary text-white">
      <div className="max-w-[1280px] mx-auto px-md py-[32px]">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-[20px]">
          {/* Logo */}
          <div className="flex items-center gap-[10px]">
            <Image
              src="/images/AppIcon1024.png"
              alt="Reetle"
              width={28}
              height={28}
              className="rounded-[5px]"
            />
            <span className="text-title-md font-semibold text-white">Reetle</span>
          </div>

          {/* Links */}
          <nav>
            <ul className="flex flex-wrap justify-center gap-[20px] sm:gap-[28px] list-none">
              <li>
                <a
                  href="https://apps.apple.com/app/reetle/id6747426043"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-body-sm text-white/70 hover:text-white transition-colors"
                >
                  iOS App
                </a>
              </li>
              <li>
                <Link href="/terms" className="text-body-sm text-white/70 hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-body-sm text-white/70 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/support" className="text-body-sm text-white/70 hover:text-white transition-colors">
                  Support
                </Link>
              </li>
            </ul>
          </nav>

          {/* Copyright */}
          <p className="text-label-md text-white/50">
            &copy; {new Date().getFullYear()} Reetle
          </p>
        </div>
      </div>
    </footer>
  );
}

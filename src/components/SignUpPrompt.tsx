'use client';

import Link from 'next/link';
import { useLoginUrl } from '@/hooks/useLoginUrl';
import { Button } from '@/components/ui/button';

interface SignUpPromptProps {
  variant: 'modal' | 'inline';
  heading?: string;
  message?: string;
  onClose?: () => void;
}

export default function SignUpPrompt({
  variant,
  heading = "You've reached your daily limit",
  message = 'Sign up for free to get unlimited access.',
  onClose,
}: SignUpPromptProps) {
  const loginUrl = useLoginUrl();
  if (variant === 'inline') {
    return (
      <div className="animate-fadeIn">
        <div className="flex flex-col items-center text-center py-xs">
          <div className="w-[40px] h-[40px] bg-primary/10 rounded-full flex items-center justify-center mb-[12px]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-primary" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
              <path d="M12 8v4" />
              <circle cx="12" cy="16" r="0.5" />
            </svg>
          </div>
          <p className="text-body-lg font-semibold text-primary mb-[4px]">
            {heading}
          </p>
          <p className="text-body-sm text-ui-muted-foreground mb-[12px] leading-[1.5]">
            {message}
          </p>
          <Button asChild variant="default" size="sm" className="rounded-lg px-[20px] py-2 h-auto font-semibold">
            <Link href={loginUrl}>
              Sign Up Free
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-md animate-fadeIn">
      <div
        className="fixed inset-0 bg-black/40"
        onClick={onClose}
      />

      <div className="relative bg-ui-card rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] max-w-[420px] w-full p-[32px] text-center">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-[12px] right-[12px] w-[28px] h-[28px] flex items-center justify-center rounded-full bg-transparent hover:bg-black/5 border-none cursor-pointer transition-colors"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-ui-muted-foreground">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}

        <div className="w-[56px] h-[56px] bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-[16px]">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-primary" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            <path d="M12 8v4" />
            <circle cx="12" cy="16" r="0.5" />
          </svg>
        </div>

        <h2 className="text-headline-md text-primary mb-[8px]">
          {heading}
        </h2>
        <p className="text-body-lg text-ui-muted-foreground mb-[24px] leading-[1.6]">
          {message}
        </p>

        <div className="flex flex-col gap-[10px]">
          <Button asChild variant="default" size="lg" className="w-full rounded-lg font-semibold">
            <Link href={loginUrl}>Sign Up Free</Link>
          </Button>
          <p className="text-label-md text-ui-muted-foreground">
            It&apos;s free! No credit card required.
          </p>
        </div>
      </div>
    </div>
  );
}

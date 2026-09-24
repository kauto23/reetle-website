'use client';

import type { ReactNode } from 'react';
import { Check, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingOptionProps {
  leading: ReactNode;
  title: string;
  subtitle?: string | null;
  badge?: string | null;
  showChevron?: boolean;
  disabled?: boolean;
  /** Render as a static summary row instead of a tappable option. */
  interactive?: boolean;
  /** Current choice: primary border and a check instead of the chevron. */
  selected?: boolean;
  /** Choice is being saved: spinner instead of the chevron. */
  loading?: boolean;
  /** Staggered entrance animation (onboarding screens only). */
  animate?: boolean;
  index?: number;
  onSelect?: () => void;
}

export default function OnboardingOption({
  leading,
  title,
  subtitle,
  badge,
  showChevron = true,
  disabled = false,
  interactive = true,
  selected = false,
  loading = false,
  animate = true,
  index = 0,
  onSelect,
}: OnboardingOptionProps) {
  const className = cn(
    'flex w-full items-center border-[1.5px] px-[14px] py-3 text-left',
    animate && 'onboarding-item',
    selected ? 'border-primary' : 'border-border',
    // Hover border only on real pointers. A tap on the language list otherwise
    // sticks :hover onto whichever level card sits under that same spot.
    disabled
      ? 'cursor-not-allowed bg-background opacity-50'
      : interactive
        ? 'cursor-pointer bg-white transition-colors duration-200 [@media(hover:hover)_and_(pointer:fine)]:hover:border-primary'
        : 'bg-white'
  );
  const style = animate ? { animationDelay: `${280 + index * 60}ms` } : undefined;

  const trailing = loading ? (
    <Loader2 className="ml-2 h-5 w-5 shrink-0 animate-spin text-primary" />
  ) : selected ? (
    <Check className="ml-2 h-5 w-5 shrink-0 text-primary" strokeWidth={2.5} />
  ) : interactive && showChevron && !disabled ? (
    <ChevronRight className="ml-2 h-6 w-6 shrink-0 text-ui-muted-foreground/40" />
  ) : null;

  const content = (
    <>
      <div
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center',
          disabled ? 'bg-border/50' : 'bg-background'
        )}
      >
        {leading}
      </div>
      <div className="ml-3 min-w-0 flex-1">
        <p className={cn('text-title-md', disabled ? 'text-ui-muted-foreground' : 'text-ui-foreground')}>
          {title}
          {badge && (
            <span className="text-body-sm text-ui-muted-foreground/60"> · {badge}</span>
          )}
        </p>
        {subtitle && (
          <p className="mt-0.5 truncate text-body-md text-ui-muted-foreground">{subtitle}</p>
        )}
      </div>
      {trailing}
    </>
  );

  if (!interactive) {
    return (
      <div className={className} style={style}>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-disabled={disabled || undefined}
      aria-pressed={selected || undefined}
      tabIndex={disabled ? -1 : 0}
      onClick={() => {
        if (disabled || loading) return;
        onSelect?.();
      }}
      className={className}
      style={style}
    >
      {content}
    </button>
  );
}

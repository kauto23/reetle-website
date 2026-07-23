'use client';

import { useRef, useState, useEffect, useCallback, type ReactNode } from 'react';

interface ScrollableNavProps {
  children: ReactNode;
  className?: string;
  /** Bottom border height (px) used by tab items — arrows will be offset upward by this amount so they align with the text, not the underline. Defaults to 3. */
  borderOffset?: number;
}

export default function ScrollableNav({ children, className = '', borderOffset = 3 }: ScrollableNavProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    checkScroll();

    el.addEventListener('scroll', checkScroll, { passive: true });
    const resizeObserver = new ResizeObserver(checkScroll);
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener('scroll', checkScroll);
      resizeObserver.disconnect();
    };
  }, [checkScroll, children]);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.6;
    el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  return (
    <div className="relative group/scroll">
      {/* Left arrow */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          aria-label="Scroll left"
          style={{ bottom: borderOffset }}
          className="absolute left-0 top-0 z-10 flex items-center justify-center w-[32px] bg-gradient-to-r from-white via-white/90 to-transparent cursor-pointer border-none"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-ui-muted-foreground hover:text-primary transition-colors">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      {/* Scrollable content */}
      <div
        ref={scrollRef}
        className={`flex items-center gap-0 overflow-x-auto scrollbar-hide ${canScrollLeft ? 'pl-[28px]' : ''} ${canScrollRight ? 'pr-[28px]' : ''} ${className}`}
      >
        {children}
      </div>

      {/* Right arrow */}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          aria-label="Scroll right"
          style={{ bottom: borderOffset }}
          className="absolute right-0 top-0 z-10 flex items-center justify-center w-[32px] bg-gradient-to-l from-white via-white/90 to-transparent cursor-pointer border-none"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-ui-muted-foreground hover:text-primary transition-colors">
            <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </div>
  );
}

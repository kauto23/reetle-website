'use client';

import { useMemo } from 'react';

interface MasteryOverlayProps {
  word: string;
}

const CONFETTI_COLORS = ['#F2C94C', '#8C5FB3', '#34D399', '#C9A227'];

function CrownSvg() {
  return (
    <svg width="30" height="22" viewBox="0 0 30 22" style={{ display: 'block', margin: '0 auto' }}>
      <path
        d="M2 7l6 5 7-9 7 9 6-5-3 13H5z"
        fill="#F2C94C"
        stroke="#C9A227"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function MasteryOverlay({ word }: MasteryOverlayProps) {
  const confetti = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        left: `${(i * 37) % 100}%`,
        delay: `${(0.45 + ((i * 7) % 12) * 0.14).toFixed(2)}s`,
        dur: `${(1.7 + ((i * 5) % 8) * 0.22).toFixed(2)}s`,
        size: `${6 + ((i * 3) % 6)}px`,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        radius: i % 2 ? '50%' : '2px',
      })),
    []
  );

  return (
    <div className="absolute inset-0 pointer-events-none z-[4] overflow-hidden flex items-start justify-center pt-[120px] box-border">
      {/* Spinning conic rays */}
      <div
        className="absolute left-1/2 top-[180px] w-[520px] h-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full animate-practice-mastery-spin"
        style={{
          background:
            'repeating-conic-gradient(rgba(242,201,76,0.16) 0deg 9deg, transparent 9deg 24deg)',
          WebkitMask: 'radial-gradient(circle, #000 0%, transparent 68%)',
          mask: 'radial-gradient(circle, #000 0%, transparent 68%)',
        }}
      />
      {/* Radial glow */}
      <div
        className="absolute left-1/2 top-[180px] w-[320px] h-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full animate-practice-mastery-glow"
        style={{
          background: 'radial-gradient(circle, rgba(242,201,76,0.5), rgba(242,201,76,0) 65%)',
        }}
      />
      {/* Confetti */}
      {confetti.map((cf, i) => (
        <div
          key={i}
          className="absolute top-0 animate-practice-confetti"
          style={{
            left: cf.left,
            width: cf.size,
            height: cf.size,
            background: cf.color,
            borderRadius: cf.radius,
            opacity: 0,
            animationDelay: cf.delay,
            animationDuration: cf.dur,
          }}
        />
      ))}
      {/* Mastered card */}
      <div
        className="relative animate-practice-mastery-pop text-center"
        style={{
          background: 'rgba(255,255,255,0.92)',
          border: '2px solid #F2C94C',
          borderRadius: '20px',
          padding: '18px 30px',
          boxShadow: '0 12px 40px rgba(201,162,39,0.35), 0 0 0 6px rgba(242,201,76,0.18)',
        }}
      >
        <CrownSvg />
        <div
          className="mt-[6px] uppercase font-bold text-[#C9A227]"
          style={{ fontSize: '11px', letterSpacing: '2.5px' }}
        >
          Word Mastered
        </div>
        <div className="text-[32px] font-bold text-[#4A2462] mt-[2px]">{word}</div>
      </div>
    </div>
  );
}

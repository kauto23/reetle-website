'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type PracticePhase = 'idle' | 'feedback' | 'rolling';

interface PracticeRatingTrackerProps {
  /** Currently displayed rating (already tweened by the session). */
  displayRating: number;
  win: number;
  loss: number;
  phase: PracticePhase;
  /** True while the flyer/count-up celebration runs (concurrent with feedback). */
  flying: boolean;
  correct: boolean | null;
}

const DIGIT_HEIGHT = 31;
const STRIP = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const SPARK_COLORS = ['#F2C94C', '#C9A227', '#8C5FB3'];

function ratingColor(phase: PracticePhase, flying: boolean, correct: boolean | null): string {
  if (flying) return correct ? '#C9A227' : '#991B1B';
  if (phase === 'feedback') return correct ? '#34D399' : '#991B1B';
  return '#4A2462';
}

function buildSparks(count: number, oneShot: boolean) {
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2 - Math.PI / 2 + (((i * 7) % 5) - 2) * 0.3;
    const d = 30 + ((i * 13) % 25);
    const delay = oneShot ? 0.5 + ((i * 11) % 7) * 0.035 : ((i * 11) % 7) * 0.12;
    const dur = oneShot ? 0.9 : 0.9 + ((i * 3) % 4) * 0.18;
    const dx = oneShot ? 60 + ((i * 17) % 90) : 44 + ((i * 17) % 110);
    const dy = oneShot ? d : 12 + ((i * 13) % 22);
    return {
      sx: Math.round(Math.cos(a) * dx),
      sy: Math.round(Math.sin(a) * dy),
      delay: `${delay.toFixed(2)}s`,
      dur: `${dur.toFixed(2)}s`,
      size: `${9 + ((i * 5) % 8)}px`,
      color: SPARK_COLORS[i % SPARK_COLORS.length],
      oneShot,
    };
  });
}

export default function PracticeRatingTracker({
  displayRating,
  win,
  loss,
  phase,
  flying,
  correct,
}: PracticeRatingTrackerProps) {
  const fb = phase === 'feedback';
  const rolling = phase === 'rolling';
  const isCorrect = correct === true;
  const isWrong = correct === false;

  const digits = String(displayRating).split('');
  const color = ratingColor(phase, flying, correct);
  const digitTransition = flying
    ? 'transform 0.12s linear'
    : 'transform 0.25s ease-out';

  // Rating container transform (grow / pulse / sad / shrink)
  let ratingAnimate: { scale: number | number[]; y?: number | number[]; rotate?: number | number[] } = { scale: 1 };
  let ratingTransition: Record<string, unknown> = { duration: 0.3, ease: 'easeOut' };
  if (rolling) {
    ratingAnimate = { scale: 1 };
    ratingTransition = { duration: 0.4, ease: 'easeOut' };
  } else if (flying) {
    // Prototype ratingGrow: reach 1.45x at 35% of the duration, then hold.
    ratingAnimate = { scale: [1, 1.45, 1.45] };
    ratingTransition = {
      duration: isCorrect ? 1.8 : 1.55,
      times: [0, 0.35, 1],
      ease: [0.22, 1, 0.36, 1],
    };
  } else if (fb && isCorrect) {
    ratingAnimate = { scale: [1.45, 1.58, 1.54, 1.45] };
    ratingTransition = { duration: 1, ease: 'easeInOut', repeat: Infinity };
  } else if (fb && isWrong) {
    ratingAnimate = {
      scale: [1.45, 1.38, 1.41, 1.44, 1.45],
      y: [0, 5, 3, 1, 0],
      rotate: [0, -2.5, -1, 0, 0],
    };
    ratingTransition = { duration: 2.4, ease: 'easeInOut', repeat: Infinity };
  }

  const sparks = flying && isCorrect
    ? buildSparks(20, true)
    : fb && isCorrect && !rolling
      ? buildSparks(10, false)
      : [];

  const showBurst = flying && isCorrect;
  const showSad = fb && isWrong && !flying && !rolling;
  const showShimmer = fb && isCorrect && !flying && !rolling;
  const showShake = flying && isWrong;
  const labelOpacity = (flying || fb) && !rolling ? 0 : 1;

  const headerBg = fb && !rolling
    ? (isCorrect ? 'bg-[#ECF7ED]' : 'bg-[#FEE2E2]')
    : 'bg-white';
  const headerBorder = fb && !rolling
    ? (isCorrect ? 'border-[#34D399]' : 'border-[#F87171]')
    : 'border-[#E5E3E8]';

  return (
    <div
      className={cn(
        'relative overflow-hidden border-b transition-colors duration-300 px-md py-sm',
        headerBg,
        headerBorder
      )}
    >
      {showShimmer && (
        <div className="absolute inset-0 pointer-events-none animate-practice-shimmer" style={{
          background:
            'linear-gradient(105deg, transparent 38%, rgba(242,201,76,0.3) 50%, transparent 62%)',
        }} />
      )}

      <div
        className={cn(
          'grid grid-cols-[1fr_auto_1fr] items-center gap-sm min-h-[48px]',
          showShake && 'animate-practice-shake'
        )}
      >
        {/* Left: loss */}
        <div className="text-left">
          <span
            className="inline-block text-center transition-opacity duration-300"
            style={{ opacity: fb ? 0 : 0.8 }}
          >
            <div className="text-title-md font-semibold text-[#666276] leading-tight">−{loss}</div>
            <div className="text-label-sm text-[#666276]">wrong answer</div>
          </span>
        </div>

        {/* Center: rating */}
        <div className="text-center relative">
          {/* Flyer */}
          {flying && (
            <div className="absolute left-0 right-0 -top-1 flex justify-center pointer-events-none z-[2]">
              <motion.div
                initial={{ x: isCorrect ? 120 : -120, opacity: 0 }}
                animate={{ x: 0, opacity: [0, 1, 1, 0] }}
                transition={{ duration: isCorrect ? 0.7 : 0.55, ease: [0.3, 0.6, 0.3, 1] }}
              >
                <motion.div
                  initial={{ y: 30, scale: 0.7 }}
                  animate={{ y: [30, -30, 8], scale: [0.7, 1.5, 0.4] }}
                  transition={{ duration: isCorrect ? 0.7 : 0.55, ease: [0.45, 0, 0.55, 1] }}
                  className="text-title-lg font-bold"
                  style={{ color: isCorrect ? '#34D399' : '#991B1B' }}
                >
                  {isCorrect ? `+${win}` : `−${loss}`}
                </motion.div>
              </motion.div>
            </div>
          )}

          <motion.div
            className="relative flex justify-center"
            style={{ transformOrigin: 'center top' }}
            animate={ratingAnimate}
            transition={ratingTransition}
          >
            {/* Sad drops */}
            {showSad && (
              <>
                <div className="absolute left-[22%] top-[78%] pointer-events-none text-[9px] text-[#F87171] animate-practice-sad-drop z-[3]">▾</div>
                <div className="absolute left-1/2 top-[84%] -translate-x-1/2 pointer-events-none text-[11px] text-[#F87171] animate-practice-sad-drop z-[3]" style={{ animationDelay: '0.9s' }}>▾</div>
                <div className="absolute left-[78%] top-[78%] pointer-events-none text-[9px] text-[#F87171] animate-practice-sad-drop z-[3]" style={{ animationDelay: '1.4s' }}>▾</div>
              </>
            )}

            {/* Burst */}
            {showBurst && (
              <>
                <div className="absolute left-1/2 top-1/2 w-[44px] h-[44px] border-[3px] rounded-full pointer-events-none z-[2] animate-practice-burst-ring" style={{ borderColor: '#F2C94C' }} />
                <div className="absolute left-1/2 top-1/2 w-[36px] h-[36px] rounded-full pointer-events-none z-[1] animate-practice-burst-flash" style={{ background: 'radial-gradient(circle, rgba(242,201,76,0.85), rgba(242,201,76,0) 70%)' }} />
              </>
            )}

            {/* Sparks */}
            {sparks.map((sp, i) => (
              <div
                key={i}
                className={cn(
                  'absolute left-1/2 top-1/2 pointer-events-none z-[3]',
                  sp.oneShot ? 'animate-practice-spark-once' : 'animate-practice-spark'
                )}
                style={{
                  fontSize: sp.size,
                  color: sp.color,
                  ['--sx' as string]: `${sp.sx}px`,
                  ['--sy' as string]: `${sp.sy}px`,
                  animationDelay: sp.delay,
                  animationDuration: sp.dur,
                }}
              >
                ✦
              </div>
            ))}

            {/* Slot-machine digits */}
            <div className="flex">
              {digits.map((ch, di) => (
                <div key={di} style={{ height: DIGIT_HEIGHT, overflow: 'hidden', display: 'flex' }}>
                  <div
                    style={{
                      transform: `translateY(-${parseInt(ch, 10) * DIGIT_HEIGHT}px)`,
                      transition: digitTransition,
                      willChange: 'transform',
                    }}
                  >
                    {STRIP.map((d, i) => (
                      <div
                        key={i}
                        className="font-bold flex items-center justify-center"
                        style={{
                          fontSize: '28px',
                          height: DIGIT_HEIGHT,
                          width: '0.62em',
                          color,
                          fontVariantNumeric: 'lining-nums tabular-nums',
                          transition: 'color 0.3s',
                        }}
                      >
                        {d}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <div
            className="uppercase font-semibold text-[#666276] transition-opacity duration-200"
            style={{ fontSize: '11px', letterSpacing: '0.8px', opacity: labelOpacity }}
          >
            your rating
          </div>
        </div>

        {/* Right: win */}
        <div className="text-right">
          <span
            className="inline-block text-center transition-opacity duration-300"
            style={{ opacity: fb ? 0 : 0.8 }}
          >
            <div className="text-title-md font-semibold text-[#666276] leading-tight">+{win}</div>
            <div className="text-label-sm text-[#666276]">right answer</div>
          </span>
        </div>
      </div>
    </div>
  );
}

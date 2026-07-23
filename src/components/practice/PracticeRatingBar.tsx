'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import type { PracticeForecast } from '@/types/practice';

interface PracticeRatingBarProps {
  rating: number;
  forecast?: PracticeForecast;
}

function AnimatedRating({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    if (from === to) return;

    const start = performance.now();
    const duration = 900;

    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      setDisplay(Math.round(from + (to - from) * eased));
      if (p < 1) requestAnimationFrame(step);
      else prevRef.current = to;
    };

    requestAnimationFrame(step);
  }, [value]);

  return (
    <motion.span
      className="text-title-sm font-semibold text-ui-primary tabular-nums"
      animate={value !== prevRef.current ? { scale: [1, 1.12, 1] } : {}}
      transition={{ duration: 0.4 }}
    >
      {display}
    </motion.span>
  );
}

export default function PracticeRatingBar({ rating, forecast }: PracticeRatingBarProps) {
  const winChange = forecast ? Math.round(forecast.ifCorrect.change) : 0;
  const lossChange = forecast ? Math.round(Math.abs(forecast.ifIncorrect.change)) : 0;
  const winProb = forecast ? Math.round(forecast.expectedScore * 100) : 0;

  return (
    <div className="mb-md">
      <div className="flex items-center justify-center gap-xs mb-sm">
        <TrendingUp className="w-4 h-4 text-ui-primary" />
        <span className="text-title-sm text-ui-primary font-semibold">
          Practice Rating: <AnimatedRating value={Math.round(rating)} />
        </span>
      </div>

      {forecast && (
        <motion.div
          className="bg-surface border border-ui-border rounded-2xl px-md py-sm flex items-center justify-between"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div>
            <p className="text-label-sm text-ui-muted-foreground uppercase tracking-wider mb-xs">Stakes</p>
            <div className="flex items-center gap-sm">
              <span className="text-title-md font-semibold text-correct-text">▲ +{winChange}</span>
              <span className="text-title-md font-semibold text-incorrect-text">▼ -{lossChange}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-label-sm text-ui-muted-foreground uppercase tracking-wider mb-xs">Win Probability</p>
            <p className="text-title-md font-semibold text-ui-primary">{winProb}%</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import AuthGuard from '@/components/layout/AuthGuard';
import { useSubscription } from '@/contexts/SubscriptionContext';
import PracticeSession from '@/components/practice/PracticeSession';
import Link from 'next/link';
import { AlertCircle, HelpCircle, Loader2, Sparkles } from 'lucide-react';
import {
  getNextPracticeQuestion,
  NoPracticeQuestionsError,
  FreeTierQuotaError,
} from '@/services/api';
import { consumeCachedPracticeQuestion } from '@/services/practiceCache';
import type { PracticeQuestion } from '@/types/practice';
import { Button } from '@/components/ui/button';

export default function PracticePage() {
  const { isPremium, dailyUsage } = useSubscription();
  const [question, setQuestion] = useState<PracticeQuestion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noQuestionsReason, setNoQuestionsReason] = useState<string | null>(null);
  const [freeTierQuota, setFreeTierQuota] = useState<{ detail: string; resetsAt: string } | null>(null);
  const sessionKeyRef = useRef(0);

  const fetchQuestion = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setNoQuestionsReason(null);
    setFreeTierQuota(null);
    try {
      const q = await getNextPracticeQuestion();
      setQuestion(q);
      sessionKeyRef.current += 1;
    } catch (err) {
      if (err instanceof FreeTierQuotaError) {
        setFreeTierQuota({ detail: err.detail, resetsAt: err.resetsAt });
      } else if (err instanceof NoPracticeQuestionsError) {
        setNoQuestionsReason(
          'No vocabulary practice questions available right now. Keep reading articles to build your vocabulary.'
        );
      } else {
        setError('Failed to load practice question. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const cached = consumeCachedPracticeQuestion();
    if (cached) {
      setQuestion(cached);
      sessionKeyRef.current += 1;
      setIsLoading(false);
      return;
    }
    fetchQuestion();
  }, [fetchQuestion]);

  const handleQuotaExhausted = useCallback((e: FreeTierQuotaError) => {
    setFreeTierQuota({ detail: e.detail, resetsAt: e.resetsAt });
    setQuestion(null);
  }, []);

  const handleNoQuestions = useCallback(() => {
    setNoQuestionsReason(
      'No vocabulary practice questions available right now. Keep reading articles to build your vocabulary.'
    );
    setQuestion(null);
  }, []);

  const handleError = useCallback((msg: string) => {
    setError(msg);
    setQuestion(null);
  }, []);

  return (
    <AuthGuard>
      <section className="min-h-[calc(100dvh-80px)] relative">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-primary/[0.03] pointer-events-none" />

        {!isPremium && dailyUsage?.practice && !freeTierQuota && !isLoading && question && (
          <div className="max-w-[600px] mx-auto px-md pt-sm flex items-center justify-center gap-xs relative">
            <span className="text-label-md text-ui-muted-foreground">
              {dailyUsage.practice.limit - dailyUsage.practice.used > 0
                ? `${dailyUsage.practice.limit - dailyUsage.practice.used} of ${dailyUsage.practice.limit} questions remaining today`
                : 'No questions remaining today'}
            </span>
            <Link href="/premium" className="text-label-md font-medium text-primary-light hover:text-ui-primary transition-colors">
              Upgrade
            </Link>
          </div>
        )}

        {question && !isLoading && !error && !noQuestionsReason && !freeTierQuota && (
          <div className="relative">
            <PracticeSession
              key={sessionKeyRef.current}
              initialQuestion={question}
              onQuotaExhausted={handleQuotaExhausted}
              onNoQuestions={handleNoQuestions}
              onError={handleError}
            />
          </div>
        )}

        {isLoading && (
          <motion.div
            className="flex flex-col items-center justify-center py-16 gap-md relative"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            <Loader2 className="w-9 h-9 text-ui-primary animate-spin" />
            <p className="text-body-md text-ui-muted-foreground">Loading question...</p>
          </motion.div>
        )}

        {error && !isLoading && (
          <motion.div className="text-center py-12 relative" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="w-14 h-14 bg-incorrect-bg rounded-2xl flex items-center justify-center mx-auto mb-md">
              <AlertCircle className="w-7 h-7 text-incorrect-text" />
            </div>
            <p className="text-body-lg text-ui-muted-foreground mb-md">{error}</p>
            <Button onClick={fetchQuestion}>Try again</Button>
          </motion.div>
        )}

        {noQuestionsReason && !isLoading && (
          <motion.div className="text-center py-12 relative" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="w-14 h-14 bg-ui-muted rounded-2xl flex items-center justify-center mx-auto mb-md border border-ui-border">
              <HelpCircle className="w-7 h-7 text-ui-muted-foreground" />
            </div>
            <p className="text-body-lg text-ui-muted-foreground mb-md max-w-[400px] mx-auto">{noQuestionsReason}</p>
          </motion.div>
        )}

        {freeTierQuota && !isLoading && (
          <motion.div className="text-center py-12 relative" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="w-14 h-14 bg-ui-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-md">
              <Sparkles className="w-7 h-7 text-ui-primary" />
            </div>
            <h2 className="text-display-sm text-ui-foreground mb-xs">Daily limit reached</h2>
            <p className="text-body-lg text-ui-muted-foreground mb-md max-w-[400px] mx-auto">{freeTierQuota.detail}</p>
            <Button asChild>
              <Link href="/premium">Go Premium — Unlimited practice</Link>
            </Button>
            {freeTierQuota.resetsAt && (
              <p className="text-body-md text-ui-muted-foreground mt-md">
                Or come back tomorrow — limits reset at midnight.
              </p>
            )}
          </motion.div>
        )}
      </section>
    </AuthGuard>
  );
}

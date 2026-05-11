'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AuthGuard from '@/components/layout/AuthGuard';
import { useSubscription } from '@/contexts/SubscriptionContext';
import QuestionCard from '@/components/practice/QuestionCard';
import Link from 'next/link';
import { AlertCircle, HelpCircle, Loader2, Sparkles } from 'lucide-react';
import { getPracticeQuestion, submitPracticeAnswer, NoPracticeQuestionsError, FreeTierQuotaError } from '@/services/api';
import { consumeCachedPracticeQuestion } from '@/services/practiceCache';
import type { PracticeQuestion } from '@/types/practice';
import { Button } from '@/components/ui/button';

const PRACTICE_HINT_KEY = 'reetle-practice-hint-dismissed';

export default function PracticePage() {
  const { isPremium, dailyUsage } = useSubscription();
  const [question, setQuestion] = useState<PracticeQuestion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noQuestionsReason, setNoQuestionsReason] = useState<string | null>(null);
  const [freeTierQuota, setFreeTierQuota] = useState<{ detail: string; resetsAt: string } | null>(null);
  const [hintDismissed, setHintDismissed] = useState(true);
  const [questionKey, setQuestionKey] = useState(0);
  const nextQuestionRef = useRef<PracticeQuestion | null>(null);
  const prefetchingRef = useRef(false);

  useEffect(() => {
    setHintDismissed(!!localStorage.getItem(PRACTICE_HINT_KEY));
  }, []);

  const fetchQuestion = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setNoQuestionsReason(null);
    setFreeTierQuota(null);
    try {
      const q = await getPracticeQuestion();
      setQuestion(q);
      setQuestionKey(prev => prev + 1);
    } catch (err) {
      if (err instanceof FreeTierQuotaError) {
        setFreeTierQuota({ detail: err.detail, resetsAt: err.resetsAt });
      } else if (err instanceof NoPracticeQuestionsError) {
        if (err.reason === 'no_unsure_words') {
          setNoQuestionsReason('You haven\'t translated any words yet. Read some articles and tap words you don\'t know to build your practice queue.');
        } else if (err.reason === 'all_words_mastered') {
          setNoQuestionsReason('Amazing! You\'ve mastered all your practice words. Keep reading to discover new vocabulary.');
        } else {
          setNoQuestionsReason('No practice questions available right now. Read more articles to generate new practice material.');
        }
      } else {
        setError('Failed to load practice question. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const prefetchNextQuestion = useCallback(async () => {
    if (prefetchingRef.current) return;
    prefetchingRef.current = true;
    try {
      const q = await getPracticeQuestion();
      nextQuestionRef.current = q;
    } catch {
      nextQuestionRef.current = null;
    } finally {
      prefetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const cached = consumeCachedPracticeQuestion();
    if (cached) {
      setQuestion(cached);
      setQuestionKey(prev => prev + 1);
      setIsLoading(false);
      return;
    }
    fetchQuestion();
  }, [fetchQuestion]);

  const handleAnswer = (isCorrect: boolean) => {
    if (!question) return;
    submitPracticeAnswer(question.practiceQuestionId, isCorrect, question.unsureWordId).catch(() => {});
    prefetchNextQuestion();
  };

  const handleNext = async () => {
    if (nextQuestionRef.current) {
      setQuestion(nextQuestionRef.current);
      setQuestionKey(prev => prev + 1);
      nextQuestionRef.current = null;
    } else if (prefetchingRef.current) {
      setIsLoading(true);
      const waitForPrefetch = () => new Promise<void>((resolve) => {
        const check = () => {
          if (!prefetchingRef.current) return resolve();
          setTimeout(check, 50);
        };
        check();
      });
      await waitForPrefetch();
      if (nextQuestionRef.current) {
        setQuestion(nextQuestionRef.current);
        setQuestionKey(prev => prev + 1);
        nextQuestionRef.current = null;
        setIsLoading(false);
      } else {
        fetchQuestion();
      }
    } else {
      setQuestion(null);
      fetchQuestion();
    }
  };

  const handleDismissHint = useCallback(() => {
    localStorage.setItem(PRACTICE_HINT_KEY, 'true');
    setHintDismissed(true);
  }, []);

  return (
    <AuthGuard>
      <section className="min-h-[calc(100dvh-80px)] py-md relative">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-primary/[0.03] pointer-events-none" />

        <div className="max-w-[600px] mx-auto px-md relative">
          {!isPremium && dailyUsage?.practice && !freeTierQuota && !isLoading && question && (
            <div className="flex items-center justify-center gap-1.5 mb-4">
              <span className="text-[12px] text-ui-muted-foreground">
                {dailyUsage.practice.limit - dailyUsage.practice.used > 0
                  ? `${dailyUsage.practice.limit - dailyUsage.practice.used} of ${dailyUsage.practice.limit} questions remaining today`
                  : 'No questions remaining today'
                }
              </span>
              <Link href="/premium" className="text-[12px] font-medium text-primary-light hover:text-ui-primary transition-colors">
                Upgrade
              </Link>
            </div>
          )}

          {isLoading && (
            <motion.div
              className="flex flex-col items-center justify-center py-16 gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
            >
              <Loader2 className="w-9 h-9 text-ui-primary animate-spin" />
              <p className="text-[14px] text-ui-muted-foreground">Loading question...</p>
            </motion.div>
          )}

          {error && !isLoading && (
            <motion.div
              className="text-center py-12"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="w-14 h-14 bg-incorrect-bg rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-7 h-7 text-incorrect-text" />
              </div>
              <p className="text-[15px] text-ui-muted-foreground mb-6">{error}</p>
              <Button onClick={fetchQuestion}>Try again</Button>
            </motion.div>
          )}

          {noQuestionsReason && !isLoading && (
            <motion.div
              className="text-center py-12"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="w-14 h-14 bg-ui-muted rounded-2xl flex items-center justify-center mx-auto mb-4 border border-ui-border">
                <HelpCircle className="w-7 h-7 text-ui-muted-foreground" />
              </div>
              <p className="text-[15px] text-ui-muted-foreground mb-6 max-w-[400px] mx-auto">{noQuestionsReason}</p>
            </motion.div>
          )}

          {freeTierQuota && !isLoading && (
            <motion.div
              className="text-center py-12"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="w-14 h-14 bg-ui-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-7 h-7 text-ui-primary" />
              </div>
              <h2 className="text-[24px] font-semibold text-ui-foreground mb-2">Daily limit reached</h2>
              <p className="text-[15px] text-ui-muted-foreground mb-6 max-w-[400px] mx-auto">
                {freeTierQuota.detail}
              </p>
              <Button asChild>
                <Link href="/premium">Go Premium — Unlimited practice</Link>
              </Button>
              {freeTierQuota.resetsAt && (
                <p className="text-[14px] text-ui-muted-foreground mt-4">
                  Or come back tomorrow — limits reset at midnight.
                </p>
              )}
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {question && !isLoading && (
              <QuestionCard
                key={questionKey}
                question={question}
                onAnswer={handleAnswer}
                onNext={handleNext}
                showHint={!hintDismissed}
                onDismissHint={handleDismissHint}
              />
            )}
          </AnimatePresence>
        </div>
      </section>
    </AuthGuard>
  );
}

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AuthGuard from '@/components/layout/AuthGuard';
import QuestionCard from '@/components/practice/QuestionCard';
import { getPracticeQuestion, submitPracticeAnswer, NoPracticeQuestionsError } from '@/services/api';
import { consumeCachedPracticeQuestion } from '@/services/practiceCache';
import type { PracticeQuestion } from '@/types/practice';

const PRACTICE_HINT_KEY = 'reetle-practice-hint-dismissed';

export default function PracticePage() {
  const [question, setQuestion] = useState<PracticeQuestion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noQuestionsReason, setNoQuestionsReason] = useState<string | null>(null);
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
    try {
      const q = await getPracticeQuestion();
      setQuestion(q);
      setQuestionKey(prev => prev + 1);
    } catch (err) {
      if (err instanceof NoPracticeQuestionsError) {
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
      <section className="min-h-[calc(100dvh-80px)] py-md relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-primary/[0.03] pointer-events-none" />

        <div className="max-w-[600px] mx-auto px-md relative">
          {isLoading && (
            <motion.div
              className="flex flex-col items-center justify-center py-2xl gap-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
            >
              <div className="relative w-[40px] h-[40px]">
                <div className="absolute inset-0 rounded-full border-2 border-primary/10" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
              </div>
              <p className="text-body-md text-text-secondary">Loading question...</p>
            </motion.div>
          )}

          {error && !isLoading && (
            <motion.div
              className="text-center py-xl"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="w-[56px] h-[56px] bg-incorrect-bg rounded-2xl flex items-center justify-center mx-auto mb-md">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#991B1B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <p className="text-body-lg text-text-secondary mb-lg">{error}</p>
              <motion.button
                onClick={fetchQuestion}
                className="btn-primary"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Try Again
              </motion.button>
            </motion.div>
          )}

          {noQuestionsReason && !isLoading && (
            <motion.div
              className="text-center py-xl"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="w-[56px] h-[56px] bg-background rounded-2xl flex items-center justify-center mx-auto mb-md border border-border">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#666276" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <p className="text-body-lg text-text-secondary mb-lg max-w-[400px] mx-auto">{noQuestionsReason}</p>
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

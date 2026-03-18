'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import QuestionCard from '@/components/practice/QuestionCard';
import { useAuth } from '@/contexts/AuthContext';
import { useGuestPreferences } from '@/contexts/GuestPreferencesContext';
import { getArticleQuestions, getGuestArticleQuestions, submitPracticeAnswer } from '@/services/api';
import { consumeQuizCache } from '@/services/quizCache';
import type { PracticeQuestion } from '@/types/practice';

const PRACTICE_HINT_KEY = 'reetle-practice-hint-dismissed';

function ArticleQuizContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { preferences: guestPrefs } = useGuestPreferences();
  const articleId = searchParams.get('articleId') || '';
  const viewIdStr = searchParams.get('viewId');
  const articleViewId = viewIdStr ? parseInt(viewIdStr, 10) : undefined;
  const isGuestQuiz = searchParams.get('guest') === '1' || !isAuthenticated;

  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(true);

  useEffect(() => {
    setHintDismissed(!!localStorage.getItem(PRACTICE_HINT_KEY));
  }, []);

  const fetchQuestions = useCallback(async () => {
    if (!articleId) {
      router.replace('/');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const cached = consumeQuizCache(articleId);
      const qs = cached
        ? await cached
        : isGuestQuiz
          ? await getGuestArticleQuestions(articleId, undefined, guestPrefs.targetLanguage, guestPrefs.familiarLanguage, guestPrefs.cefrLevel)
          : await getArticleQuestions(articleId, articleViewId);
      setQuestions(qs);
    } catch {
      setError('Failed to load quiz questions.');
    } finally {
      setIsLoading(false);
    }
  }, [articleId, articleViewId, router, isGuestQuiz, guestPrefs.targetLanguage, guestPrefs.familiarLanguage, guestPrefs.cefrLevel]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const handleAnswer = useCallback(async (isCorrect: boolean) => {
    const currentQuestion = questions[currentIndex];
    if (isCorrect) setCorrectCount(prev => prev + 1);

    if (!isGuestQuiz) {
      try {
        await submitPracticeAnswer(currentQuestion.practiceQuestionId, isCorrect, currentQuestion.unsureWordId);
      } catch {
        // Non-critical
      }
    }
  }, [questions, currentIndex, isGuestQuiz]);

  const handleNext = useCallback(() => {
    if (currentIndex + 1 >= questions.length) {
      setIsComplete(true);
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, questions.length]);

  const handleDismissHint = useCallback(() => {
    localStorage.setItem(PRACTICE_HINT_KEY, 'true');
    setHintDismissed(true);
  }, []);

  const totalQuestions = questions.length;

  return (
    <section className="min-h-[calc(100dvh-80px)] py-md relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-primary/[0.03] pointer-events-none" />

      <div className="max-w-[600px] mx-auto px-md relative">
        {/* Loading */}
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
            <p className="text-body-md text-text-secondary">Loading quiz...</p>
          </motion.div>
        )}

        {/* Error */}
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
            <div className="flex flex-col sm:flex-row gap-md justify-center">
              <motion.button
                onClick={fetchQuestions}
                className="btn-primary"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Try Again
              </motion.button>
              <Link href="/" className="btn-secondary">Back to Articles</Link>
            </div>
          </motion.div>
        )}

        {/* Completion */}
        {isComplete && (
          <div className="text-center py-xl animate-fadeIn">
            <div className="w-[80px] h-[80px] bg-correct rounded-full flex items-center justify-center mx-auto mb-lg">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1 className="text-display-md text-primary mb-sm">Quiz Complete!</h1>
            <p className="text-body-lg text-text-secondary mb-lg">
              You got {correctCount} out of {totalQuestions} correct.
            </p>

            {/* Score bar */}
            <div className="w-full bg-gray-200 rounded-full h-[8px] mb-xl">
              <div
                className="bg-correct h-[8px] rounded-full transition-all duration-500"
                style={{ width: `${totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0}%` }}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-md">
              <Link href="/" className="btn-primary flex-1">
                Continue Reading
              </Link>
              {isAuthenticated ? (
                <Link href="/practice" className="btn-secondary flex-1">
                  More Practice
                </Link>
              ) : (
                <Link href="/login" className="btn-secondary flex-1">
                  Sign Up Free
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Quiz in progress */}
        {!isLoading && !error && !isComplete && questions.length > 0 && (
          <>
            {/* Progress bar */}
            <div className="mb-lg">
              <div className="flex justify-between text-body-md text-text-secondary mb-sm">
                <span>Question {currentIndex + 1} of {totalQuestions}</span>
                <span className="text-correct-text">{correctCount} correct</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-[4px]">
                <div
                  className="bg-primary h-[4px] rounded-full transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
                />
              </div>
            </div>

            <AnimatePresence mode="wait">
              <QuestionCard
                key={currentIndex}
                question={questions[currentIndex]}
                onAnswer={handleAnswer}
                onNext={handleNext}
                nextLabel={currentIndex + 1 >= questions.length ? 'See Results' : 'Next Question'}
                showHint={!hintDismissed}
                onDismissHint={handleDismissHint}
              />
            </AnimatePresence>
          </>
        )}
      </div>
    </section>
  );
}

export default function ArticleQuizPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative w-[40px] h-[40px]">
          <div className="absolute inset-0 rounded-full border-2 border-primary/10" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
        </div>
      </div>
    }>
      <ArticleQuizContent />
    </Suspense>
  );
}

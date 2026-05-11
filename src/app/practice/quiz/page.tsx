'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Check, Loader2 } from 'lucide-react';
import QuestionCard from '@/components/practice/QuestionCard';
import { useAuth } from '@/contexts/AuthContext';
import { useGuestPreferences } from '@/contexts/GuestPreferencesContext';
import { getArticleQuestions, getGuestArticleQuestions, submitPracticeAnswer } from '@/services/api';
import { consumeQuizCache } from '@/services/quizCache';
import { useLoginUrl } from '@/hooks/useLoginUrl';
import type { PracticeQuestion } from '@/types/practice';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

const PRACTICE_HINT_KEY = 'reetle-practice-hint-dismissed';

function ArticleQuizContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { preferences: guestPrefs } = useGuestPreferences();
  const loginUrl = useLoginUrl();
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
    <section className="min-h-[calc(100dvh-80px)] py-md relative">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-primary/[0.03] pointer-events-none" />

      <div className="max-w-[600px] mx-auto px-md relative">
        {/* Loading */}
        {isLoading && (
          <motion.div
            className="flex flex-col items-center justify-center py-16 gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            <Loader2 className="w-9 h-9 text-ui-primary animate-spin" />
            <p className="text-[14px] text-ui-muted-foreground">Loading quiz...</p>
          </motion.div>
        )}

        {/* Error */}
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
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={fetchQuestions}>Try again</Button>
              <Button variant="outline" asChild>
                <Link href="/">Back to articles</Link>
              </Button>
            </div>
          </motion.div>
        )}

        {/* Completion */}
        {isComplete && (
          <div className="text-center py-12 animate-fadeIn">
            <div className="w-20 h-20 bg-correct rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-[28px] font-semibold tracking-tight text-ui-foreground mb-2">Quiz complete!</h1>
            <p className="text-[15px] text-ui-muted-foreground mb-6">
              You got {correctCount} out of {totalQuestions} correct.
            </p>

            <Progress
              value={totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0}
              className="mb-8 [&>div]:bg-correct"
            />

            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild className="flex-1">
                <Link href="/">Continue reading</Link>
              </Button>
              {isAuthenticated ? (
                <Button asChild variant="outline" className="flex-1">
                  <Link href="/practice">More practice</Link>
                </Button>
              ) : (
                <Button asChild variant="outline" className="flex-1">
                  <Link href={loginUrl}>Sign up free</Link>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Quiz in progress */}
        {!isLoading && !error && !isComplete && questions.length > 0 && (
          <>
            <div className="mb-6">
              <div className="flex justify-between text-[13px] text-ui-muted-foreground mb-2">
                <span>Question {currentIndex + 1} of {totalQuestions}</span>
                <span className="text-correct-text">{correctCount} correct</span>
              </div>
              <Progress value={((currentIndex + 1) / totalQuestions) * 100} className="h-1" />
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
        <Loader2 className="h-9 w-9 animate-spin text-ui-primary" />
      </div>
    }>
      <ArticleQuizContent />
    </Suspense>
  );
}

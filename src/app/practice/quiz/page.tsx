'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import QuestionCard from '@/components/practice/QuestionCard';
import { useAuth } from '@/contexts/AuthContext';
import { getArticleQuestions, getGuestArticleQuestions, submitPracticeAnswer } from '@/services/api';
import type { PracticeQuestion } from '@/types/practice';

const PRACTICE_HINT_KEY = 'reetle-practice-hint-dismissed';

function ArticleQuizContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
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

  useEffect(() => {
    if (!articleId) {
      router.replace('/');
      return;
    }

    async function fetchQuestions() {
      try {
        const qs = isGuestQuiz
          ? await getGuestArticleQuestions(articleId)
          : await getArticleQuestions(articleId, articleViewId);
        setQuestions(qs);
      } catch {
        setError('Failed to load quiz questions.');
      } finally {
        setIsLoading(false);
      }
    }
    fetchQuestions();
  }, [articleId, articleViewId, router, isGuestQuiz]);

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
    <section className="py-2xl">
      <div className="max-w-[600px] mx-auto px-md">
        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-xl gap-md">
            <div className="loading-spinner" />
            <p className="text-body-md text-text-secondary">Loading quiz...</p>
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <div className="text-center py-xl">
            <p className="text-body-lg text-text-secondary mb-md">{error}</p>
            <Link href="/" className="btn-primary">Back to Articles</Link>
          </div>
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

            <QuestionCard
              key={currentIndex}
              question={questions[currentIndex]}
              onAnswer={handleAnswer}
              onNext={handleNext}
              nextLabel={currentIndex + 1 >= questions.length ? 'See Results' : 'Next Question'}
              showHint={!hintDismissed}
              onDismissHint={handleDismissHint}
            />
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
        <div className="loading-spinner" />
      </div>
    }>
      <ArticleQuizContent />
    </Suspense>
  );
}

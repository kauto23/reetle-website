'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/layout/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { startAssessment, submitAssessmentAnswer, cancelAssessment } from '@/services/api';
import type { AssessmentQuestion, AssessmentSummary } from '@/types/assessment';

type AssessmentState = 'intro' | 'loading' | 'question' | 'complete' | 'error';

export default function AssessmentPage() {
  const router = useRouter();
  const { updateLocalUser } = useAuth();

  const [state, setState] = useState<AssessmentState>('intro');
  const [assessmentId, setAssessmentId] = useState<number | null>(null);
  const [question, setQuestion] = useState<AssessmentQuestion | null>(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [summary, setSummary] = useState<AssessmentSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStart = useCallback(async () => {
    setState('loading');
    try {
      const result = await startAssessment();
      setAssessmentId(result.assessmentId);
      setQuestion(result.question);
      setQuestionNumber(result.questionNumber);
      setState('question');
    } catch {
      setError('Failed to start assessment. Please try again.');
      setState('error');
    }
  }, []);

  const handleSelectAnswer = useCallback(async (answerIndex: number) => {
    if (hasAnswered || !assessmentId) return;

    setSelectedAnswer(answerIndex);
    setHasAnswered(true);

    try {
      const result = await submitAssessmentAnswer(assessmentId, answerIndex);

      if (result.complete && result.summary) {
        setWasCorrect(null);
        setSummary(result.summary);
        updateLocalUser({ cefrLevel: result.summary.cefrLevel, hasCompletedAssessment: true });

        setTimeout(() => setState('complete'), 1500);
      } else {
        setWasCorrect(result.wasCorrect ?? null);
        setCorrectIndex(result.correctIndex ?? null);
        setExplanation(result.explanation ?? null);

        // Advance to next question after a delay
        setTimeout(() => {
          if (result.question) {
            setQuestion(result.question);
            setQuestionNumber(result.questionNumber || questionNumber + 1);
          }
          setSelectedAnswer(null);
          setHasAnswered(false);
          setWasCorrect(null);
          setCorrectIndex(null);
          setExplanation(null);
        }, 2500);
      }
    } catch {
      setError('Failed to submit answer. Please try again.');
      setState('error');
    }
  }, [hasAnswered, assessmentId, questionNumber, updateLocalUser]);

  const handleCancel = useCallback(async () => {
    if (assessmentId) {
      try {
        await cancelAssessment(assessmentId);
      } catch {
        // Non-critical
      }
    }
    router.back();
  }, [assessmentId, router]);

  return (
    <AuthGuard>
      <section className="py-2xl">
        <div className="max-w-[600px] mx-auto px-md">
          {/* Intro */}
          {state === 'intro' && (
            <div className="text-center animate-fadeIn">
              <div className="w-[64px] h-[64px] bg-primary rounded-2xl flex items-center justify-center mx-auto mb-lg">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                </svg>
              </div>
              <h1 className="text-display-md text-primary mb-sm">Level Assessment</h1>
              <p className="text-body-lg text-text-secondary mb-xl">
                This quick quiz takes about 1 minute and helps us determine your CEFR level
                so we can personalise your reading content.
              </p>
              <button onClick={handleStart} className="btn-primary w-full mb-md">
                Start Assessment
              </button>
              <button
                onClick={() => router.back()}
                className="text-body-md text-text-secondary hover:text-primary cursor-pointer bg-transparent border-none transition-colors"
              >
                ← Go back
              </button>
            </div>
          )}

          {/* Loading */}
          {state === 'loading' && (
            <div className="flex flex-col items-center justify-center py-xl gap-md">
              <div className="loading-spinner" />
              <p className="text-body-md text-text-secondary">Preparing your assessment...</p>
            </div>
          )}

          {/* Question */}
          {state === 'question' && question && (
            <div className="animate-fadeIn">
              {/* Progress */}
              <div className="flex items-center justify-between mb-lg">
                <span className="text-body-md text-text-secondary">Question {questionNumber}</span>
                <button
                  onClick={handleCancel}
                  className="text-body-md text-text-secondary hover:text-incorrect cursor-pointer bg-transparent border-none transition-colors"
                >
                  Cancel
                </button>
              </div>

              {/* Question */}
              <div className="card hover:transform-none mb-lg" style={{ animation: 'none' }}>
                <p className="text-[18px] font-medium text-primary leading-relaxed">
                  {question.question}
                </p>
              </div>

              {/* Options */}
              <div className="flex flex-col gap-[8px]">
                {question.options.map((option, index) => {
                  const isSelected = selectedAnswer === index;
                  const showCorrect = hasAnswered && correctIndex === index;
                  const showIncorrect = hasAnswered && isSelected && correctIndex !== index && correctIndex !== null;
                  const showSelectedCorrect = hasAnswered && isSelected && (wasCorrect === true || correctIndex === null);

                  return (
                    <button
                      key={index}
                      onClick={() => handleSelectAnswer(index)}
                      disabled={hasAnswered}
                      className={`
                        p-md rounded-xl border text-left transition-all duration-300 w-full cursor-pointer
                        ${!hasAnswered
                          ? 'border-border bg-surface hover:border-primary-light hover:bg-white'
                          : showCorrect || showSelectedCorrect
                            ? 'border-correct bg-correct-bg'
                            : showIncorrect
                              ? 'border-incorrect bg-incorrect-bg'
                              : 'border-border bg-surface opacity-50'
                        }
                        ${hasAnswered ? 'cursor-default' : ''}
                      `}
                    >
                      <p className={`text-[16px] font-medium ${
                        showCorrect || showSelectedCorrect ? 'text-correct-text'
                        : showIncorrect ? 'text-incorrect-text'
                        : 'text-primary'
                      }`}>
                        {option}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Explanation */}
              {hasAnswered && explanation && (
                <div className={`mt-lg p-md rounded-xl animate-fadeIn ${wasCorrect ? 'bg-correct-bg' : 'bg-incorrect-bg'}`}>
                  <p className={`text-body-md ${wasCorrect ? 'text-correct-text' : 'text-incorrect-text'}`}>
                    {explanation}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Complete */}
          {state === 'complete' && summary && (
            <div className="text-center animate-fadeIn">
              <div className="w-[80px] h-[80px] bg-correct rounded-full flex items-center justify-center mx-auto mb-lg">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>

              <h1 className="text-display-md text-primary mb-sm">Assessment Complete!</h1>
              <p className="text-body-lg text-text-secondary mb-lg">
                Based on your answers, your level is:
              </p>

              <div className="card hover:transform-none mb-xl" style={{ animation: 'none' }}>
                <p className="text-[48px] font-bold text-primary mb-sm">{summary.cefrLevel}</p>
                {summary.justification && (
                  <p className="text-body-md text-text-secondary">{summary.justification}</p>
                )}
                {summary.stats && (
                  <p className="text-body-md text-text-secondary mt-md">
                    {summary.stats.correct} / {summary.stats.totalQuestions} correct
                  </p>
                )}
              </div>

              <button
                onClick={() => router.push('/articles')}
                className="btn-primary w-full"
              >
                Start Reading
              </button>
            </div>
          )}

          {/* Error */}
          {state === 'error' && (
            <div className="text-center py-xl">
              <p className="text-body-lg text-text-secondary mb-md">{error}</p>
              <button onClick={handleStart} className="btn-primary">Try Again</button>
            </div>
          )}
        </div>
      </section>
    </AuthGuard>
  );
}

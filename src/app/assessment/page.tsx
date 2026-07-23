'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ClipboardCheck, Loader2 } from 'lucide-react';
import AuthGuard from '@/components/layout/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { startAssessment, submitAssessmentAnswer, cancelAssessment } from '@/services/api';
import type { AssessmentQuestion, AssessmentSummary } from '@/types/assessment';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
      try { await cancelAssessment(assessmentId); } catch { /* non-critical */ }
    }
    router.back();
  }, [assessmentId, router]);

  return (
    <AuthGuard>
      <section className="py-12 sm:py-16">
        <div className="max-w-[600px] mx-auto px-4">
          {state === 'intro' && (
            <div className="text-center animate-fadeIn">
              <div className="w-16 h-16 bg-ui-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
                <ClipboardCheck className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-display-md tracking-tight text-ui-foreground mb-2">Level Assessment</h1>
              <p className="text-body-lg text-ui-muted-foreground mb-8 max-w-md mx-auto">
                A 1-minute quiz that helps us determine your CEFR level so we can personalise your reading.
              </p>
              <Button onClick={handleStart} size="lg" className="w-full mb-3">Start assessment</Button>
              <Button onClick={() => router.back()} variant="ghost" size="sm">← Go back</Button>
            </div>
          )}

          {state === 'loading' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-9 h-9 animate-spin text-ui-primary" />
              <p className="text-[14px] text-ui-muted-foreground">Preparing your assessment...</p>
            </div>
          )}

          {state === 'question' && question && (
            <div className="animate-fadeIn">
              <div className="flex items-center justify-between mb-6">
                <span className="text-[14px] text-ui-muted-foreground">Question {questionNumber}</span>
                <Button onClick={handleCancel} variant="ghost" size="sm" className="text-ui-muted-foreground hover:text-incorrect">
                  Cancel
                </Button>
              </div>

              <Card className="mb-6">
                <CardContent className="p-5">
                  <p className="text-[18px] font-medium text-ui-foreground leading-relaxed">
                    {question.question}
                  </p>
                </CardContent>
              </Card>

              <div className="flex flex-col gap-2">
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
                      className={cn(
                        'p-4 rounded-xl border text-left transition-all duration-300 w-full',
                        !hasAnswered && 'border-ui-border bg-ui-card hover:border-primary-light hover:shadow-sm cursor-pointer',
                        hasAnswered && (showCorrect || showSelectedCorrect) && 'border-correct bg-correct-bg cursor-default',
                        hasAnswered && showIncorrect && 'border-incorrect bg-incorrect-bg cursor-default',
                        hasAnswered && !showCorrect && !showSelectedCorrect && !showIncorrect && 'border-ui-border bg-ui-card opacity-50 cursor-default'
                      )}
                    >
                      <p className={cn(
                        'text-[16px] font-medium',
                        (showCorrect || showSelectedCorrect) && 'text-correct-text',
                        showIncorrect && 'text-incorrect-text',
                        !showCorrect && !showSelectedCorrect && !showIncorrect && 'text-ui-foreground'
                      )}>
                        {option}
                      </p>
                    </button>
                  );
                })}
              </div>

              {hasAnswered && explanation && (
                <div className={cn(
                  'mt-6 p-4 rounded-xl animate-fadeIn',
                  wasCorrect ? 'bg-correct-bg' : 'bg-incorrect-bg'
                )}>
                  <p className={cn('text-[14px]', wasCorrect ? 'text-correct-text' : 'text-incorrect-text')}>
                    {explanation}
                  </p>
                </div>
              )}
            </div>
          )}

          {state === 'complete' && summary && (
            <div className="text-center animate-fadeIn">
              <div className="w-20 h-20 bg-correct rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-white" strokeWidth={2.5} />
              </div>

              <h1 className="text-display-md tracking-tight text-ui-foreground mb-2">Assessment Complete!</h1>
              <p className="text-body-lg text-ui-muted-foreground mb-6">
                Based on your answers, your level is:
              </p>

              <Card className="mb-8">
                <CardContent className="p-6">
                  <p className="text-[48px] font-bold text-ui-primary mb-2">{summary.cefrLevel}</p>
                  {summary.justification && (
                    <p className="text-[14px] text-ui-muted-foreground">{summary.justification}</p>
                  )}
                  {summary.stats && (
                    <p className="text-[14px] text-ui-muted-foreground mt-3">
                      {summary.stats.correct} / {summary.stats.totalQuestions} correct
                    </p>
                  )}
                </CardContent>
              </Card>

              <Button onClick={() => router.push('/articles')} size="lg" className="w-full">
                Start reading
              </Button>
            </div>
          )}

          {state === 'error' && (
            <div className="text-center py-12">
              <p className="text-body-lg text-ui-muted-foreground mb-4">{error}</p>
              <Button onClick={handleStart}>Try again</Button>
            </div>
          )}
        </div>
      </section>
    </AuthGuard>
  );
}

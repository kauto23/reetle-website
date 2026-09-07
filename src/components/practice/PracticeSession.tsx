'use client';

import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import type { PracticeQuestion, PracticeSubmitResult } from '@/types/practice';
import {
  getNextPracticeQuestion,
  submitPracticeAnswer,
  ratePracticeQuestion,
  FreeTierQuotaError,
  NoPracticeQuestionsError,
} from '@/services/api';
import PracticeQuestionPanel, { type FeedbackLevel, type PracticePhase } from '@/components/practice/PracticeQuestionPanel';

const ROLL_MS = 500;

interface PracticeSessionProps {
  initialQuestion: PracticeQuestion;
  onQuotaExhausted: (e: FreeTierQuotaError) => void;
  onNoQuestions: () => void;
  onError: (msg: string) => void;
}

export default function PracticeSession({
  initialQuestion,
  onQuotaExhausted,
  onNoQuestions,
  onError,
}: PracticeSessionProps) {
  const [question, setQuestion] = useState<PracticeQuestion>(initialQuestion);
  const [nextQuestion, setNextQuestion] = useState<PracticeQuestion | null>(null);
  const [phase, setPhase] = useState<PracticePhase>('idle');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [submitResult, setSubmitResult] = useState<PracticeSubmitResult | null>(null);
  const [fbLevel, setFbLevel] = useState<FeedbackLevel>('short');
  const [fbDismissed, setFbDismissed] = useState(false);
  const [rollY, setRollY] = useState<string>('0%');
  const [rolling, setRolling] = useState(false);
  const [ratingState, setRatingState] = useState<'none' | 'bad' | 'good'>('none');

  const nextQuestionRef = useRef<PracticeQuestion | null>(null);
  const prefetchingRef = useRef(false);
  const questionStartRef = useRef<number>(Date.now());

  const prefetchNext = useCallback(async () => {
    if (prefetchingRef.current) return;
    prefetchingRef.current = true;
    try {
      const q = await getNextPracticeQuestion();
      nextQuestionRef.current = q;
      setNextQuestion(q);
    } catch (err) {
      nextQuestionRef.current = null;
      setNextQuestion(null);
      if (err instanceof FreeTierQuotaError) onQuotaExhausted(err);
      else if (err instanceof NoPracticeQuestionsError) onNoQuestions();
      else onError('Failed to load next question.');
    } finally {
      prefetchingRef.current = false;
    }
  }, [onQuotaExhausted, onNoQuestions, onError]);

  const handleSelect = useCallback(
    (index: number) => {
      if (phase !== 'idle') return;
      const choice = question.questionData.answerChoices[index];
      const isCorrect = choice.text === question.questionData.correctAnswer;

      // Show Next/? by default; explanation via "?".
      setSelectedIndex(index);
      setCorrect(isCorrect);
      setPhase('feedback');
      setFbLevel('short');
      setFbDismissed(true);
      setRatingState('none');

      const responseTimeMs = Date.now() - questionStartRef.current;
      void (async () => {
        if (question.domain) {
          try {
            const result = await submitPracticeAnswer({
              domain: question.domain,
              questionId: question.questionId,
              selectedIndex: index,
              responseTimeMs,
            });
            setSubmitResult(result);
          } catch {
            // Still try to load the next question.
          }
        }
        await prefetchNext();
      })();
    },
    [phase, question, prefetchNext]
  );

  const applyQuestion = useCallback((q: PracticeQuestion) => {
    setQuestion(q);
    questionStartRef.current = Date.now();
    if (q.createdAt) {
      const createdDate = new Date(q.createdAt);
      const ageMs = Date.now() - createdDate.getTime();
      const ageMin = ageMs / 60000;
      let ageStr: string;
      if (Number.isNaN(ageMs)) {
        ageStr = '(unparseable timestamp)';
      } else if (ageMin < 1) {
        ageStr = `${Math.round(ageMs / 1000)}s ago`;
      } else if (ageMin < 60) {
        ageStr = `${Math.round(ageMin)}m ago`;
      } else if (ageMin < 60 * 24) {
        ageStr = `${Math.round(ageMin / 60)}h ago`;
      } else {
        ageStr = `${Math.round(ageMin / 60 / 24)}d ago`;
      }
      // eslint-disable-next-line no-console
      console.log(
        `[practice] question ${q.questionId} (${q.domain ?? '?'}) created at ${q.createdAt} — ${ageStr}`,
        Number.isNaN(ageMs) ? '' : createdDate.toLocaleString()
      );
    } else {
      // eslint-disable-next-line no-console
      console.log(`[practice] question ${q.questionId} (${q.domain ?? '?'}) — no created_at returned by API`);
    }
  }, []);

  const handleNext = useCallback(() => {
    setPhase('rolling');
    setRolling(true);
    setRollY('-50%');

    setTimeout(() => {
      const cached = nextQuestionRef.current;
      if (cached) {
        applyQuestion(cached);
        nextQuestionRef.current = null;
        setNextQuestion(null);
      }
      setRollY('0%');
      setSelectedIndex(null);
      setCorrect(null);
      setSubmitResult(null);
      setFbLevel('short');
      setFbDismissed(false);
      setPhase('idle');
      setRolling(false);
      setRatingState('none');
    }, ROLL_MS);
  }, [applyQuestion]);

  const handleRate = useCallback(
    (feedback: 'good' | 'bad') => {
      if (!question.domain) return;
      const prev = ratingState;
      setRatingState(feedback === 'bad' ? 'bad' : 'good');
      ratePracticeQuestion({
        domain: question.domain,
        questionId: question.questionId,
        feedback,
      }).catch(() => {
        setRatingState(prev);
      });
    },
    [question, ratingState]
  );

  const showMastery =
    correct === true &&
    !!(submitResult?.vocabContext?.mastered ?? question.vocabContext?.willMaster);
  const masteryWord = question.questionData.correctAnswer;

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 80px)' }}>
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <motion.div
          className="h-[200%] flex flex-col"
          animate={{ y: rollY }}
          transition={
            rolling
              ? { duration: ROLL_MS / 1000, ease: [0.65, 0, 0.35, 1] }
              : { duration: 0 }
          }
        >
          <div className="h-1/2 min-h-0">
            <PracticeQuestionPanel
              question={question}
              submitResult={submitResult}
              phase={phase}
              selectedIndex={selectedIndex}
              correct={correct}
              fbLevel={fbLevel}
              fbDismissed={fbDismissed}
              showMastery={showMastery}
              masteryWord={masteryWord}
              onSelect={handleSelect}
              onNext={handleNext}
              onSetFbLevel={setFbLevel}
              onDismissFb={() => setFbDismissed(true)}
              onReopenFb={() => setFbDismissed(false)}
              onRate={handleRate}
              ratingState={ratingState}
            />
          </div>
          <div className="h-1/2 min-h-0">
            {nextQuestion ? (
              <PracticeQuestionPanel
                question={nextQuestion}
                submitResult={null}
                phase="idle"
                selectedIndex={null}
                correct={null}
                fbLevel="short"
                fbDismissed={false}
                showMastery={false}
                onSelect={() => {}}
                onNext={() => {}}
                onSetFbLevel={() => {}}
                onDismissFb={() => {}}
                onReopenFb={() => {}}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-ui-muted-foreground text-body-md">
                Loading next...
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { PracticeQuestion, PracticeSubmitResult } from '@/types/practice';
import {
  getNextPracticeQuestion,
  submitPracticeAnswer,
  ratePracticeQuestion,
  FreeTierQuotaError,
  NoPracticeQuestionsError,
} from '@/services/api';
import PracticeRatingTracker, { type PracticePhase } from '@/components/practice/PracticeRatingTracker';
import PracticeQuestionPanel, { type FeedbackLevel } from '@/components/practice/PracticeQuestionPanel';

const ROLL_MS = 500;
const TWEEN_MS = 900;
const IDLE_HINT_MS = 4000;
/* Prototype: count-up starts at 75% of the flyer flight, and the header stays
   in its "flying" celebration until the count settles (+150ms). */
const flightMs = (correct: boolean) => (correct ? 700 : 550);

interface PracticeSessionProps {
  initialQuestion: PracticeQuestion;
  onQuotaExhausted: (e: FreeTierQuotaError) => void;
  onNoQuestions: () => void;
  onError: (msg: string) => void;
}

function tweenRating(
  from: number,
  to: number,
  duration: number,
  onUpdate: (v: number) => void,
  onDone?: () => void
): () => void {
  const start = performance.now();
  let raf = 0;
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    // ease-in-out cubic, matching the prototype's count-up
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    onUpdate(from + (to - from) * eased);
    if (t < 1) raf = requestAnimationFrame(tick);
    else onDone?.();
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
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
  const [flying, setFlying] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [displayRating, setDisplayRating] = useState<number>(initialQuestion.userRating ?? 0);
  const [submitResult, setSubmitResult] = useState<PracticeSubmitResult | null>(null);
  const [fbLevel, setFbLevel] = useState<FeedbackLevel>('short');
  const [fbDismissed, setFbDismissed] = useState(false);
  const [idleHint, setIdleHint] = useState(false);
  const [rollY, setRollY] = useState<string>('0%');
  const [rolling, setRolling] = useState(false);

  const [ratingState, setRatingState] = useState<'none' | 'bad' | 'good'>('none');

  const nextQuestionRef = useRef<PracticeQuestion | null>(null);
  const prefetchingRef = useRef(false);
  const questionStartRef = useRef<number>(Date.now());
  const tweenCancelRef = useRef<(() => void) | null>(null);
  const ratingTweenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flyingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Authoritative rating from /submit; wins over the optimistic forecast tween. */
  const settledRatingRef = useRef<number | null>(null);
  const displayRatingRef = useRef(displayRating);

  const forecast = question.forecast;
  const win = Math.trunc(forecast?.ifCorrect.change ?? 0);
  const loss = Math.trunc(Math.abs(forecast?.ifIncorrect.change ?? 0));

  useEffect(() => {
    displayRatingRef.current = displayRating;
  }, [displayRating]);

  const cancelRatingTween = useCallback(() => {
    if (tweenCancelRef.current) {
      tweenCancelRef.current();
      tweenCancelRef.current = null;
    }
  }, []);

  const startRatingTween = useCallback(
    (from: number, to: number, duration: number) => {
      cancelRatingTween();
      tweenCancelRef.current = tweenRating(from, to, duration, setDisplayRating);
    },
    [cancelRatingTween]
  );

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

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const startIdleTimer = useCallback(() => {
    clearIdleTimer();
    setIdleHint(false);
    idleTimerRef.current = setTimeout(() => setIdleHint(true), IDLE_HINT_MS);
  }, [clearIdleTimer]);

  useEffect(() => () => {
    cancelRatingTween();
    if (ratingTweenTimerRef.current) clearTimeout(ratingTweenTimerRef.current);
    if (flyingTimerRef.current) clearTimeout(flyingTimerRef.current);
    clearIdleTimer();
  }, [cancelRatingTween, clearIdleTimer]);

  const handleSelect = useCallback(
    (index: number) => {
      if (phase !== 'idle') return;
      const choice = question.questionData.answerChoices[index];
      const isCorrect = choice.text === question.questionData.correctAnswer;
      const startRating = question.userRating ?? displayRatingRef.current;
      // Match the ±N labels (trunc'd change). Do not use forecast.ratingAfter —
      // it can disagree with change and caused a double-penalty flash.
      const optimisticTarget = isCorrect ? startRating + win : startRating - loss;
      settledRatingRef.current = null;

      // Prototype behavior: feedback UI appears immediately; the header
      // "flying" celebration runs concurrently rather than as a prior stage.
      setSelectedIndex(index);
      setCorrect(isCorrect);
      setPhase('feedback');
      setFlying(true);
      setFbLevel('short');
      setFbDismissed(false);
      setRatingState('none');
      startIdleTimer();

      const flight = flightMs(isCorrect);
      if (ratingTweenTimerRef.current) clearTimeout(ratingTweenTimerRef.current);
      ratingTweenTimerRef.current = setTimeout(() => {
        const target = settledRatingRef.current ?? optimisticTarget;
        startRatingTween(startRating, target, TWEEN_MS);
      }, flight * 0.75);

      if (flyingTimerRef.current) clearTimeout(flyingTimerRef.current);
      flyingTimerRef.current = setTimeout(
        () => setFlying(false),
        flight * 0.75 + TWEEN_MS + 150
      );

      const responseTimeMs = Date.now() - questionStartRef.current;
      void (async () => {
        // Prefetch only after submit so /next sees the updated Elo.
        if (question.domain) {
          try {
            const result = await submitPracticeAnswer({
              domain: question.domain,
              questionId: question.questionId,
              selectedIndex: index,
              responseTimeMs,
            });
            setSubmitResult(result);
            settledRatingRef.current = result.ratingAfter;
            if (Math.round(result.ratingAfter) !== Math.round(optimisticTarget)) {
              startRatingTween(displayRatingRef.current, result.ratingAfter, 500);
            }
          } catch {
            // Keep optimistic rating; still try to load the next question.
          }
        }
        await prefetchNext();
      })();
    },
    [phase, question, win, loss, prefetchNext, startIdleTimer, startRatingTween]
  );

  const applyQuestion = useCallback((q: PracticeQuestion) => {
    setQuestion(q);
    setDisplayRating(q.userRating ?? 0);
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
    clearIdleTimer();
    setPhase('rolling');
    setFlying(false);
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
      setIdleHint(false);
      setPhase('idle');
      setRolling(false);
    }, ROLL_MS);
  }, [applyQuestion, clearIdleTimer]);

  const handleRate = useCallback(
    (feedback: 'good' | 'bad') => {
      if (!question.domain) return;
      // Optimistically flip the icon immediately; revert on failure.
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
      <PracticeRatingTracker
        displayRating={Math.round(displayRating)}
        win={win}
        loss={loss}
        phase={phase}
        flying={flying}
        correct={correct}
      />

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
              idleHint={idleHint}
              showMastery={showMastery}
              masteryWord={masteryWord}
              onSelect={handleSelect}
              onNext={handleNext}
              onSetFbLevel={setFbLevel}
              onDismissFb={() => { setFbDismissed(true); clearIdleTimer(); }}
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
                idleHint={false}
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

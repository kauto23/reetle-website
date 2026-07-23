'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PracticeQuestion, PracticeSubmitResult, GrammarFeedbackIncorrect } from '@/types/practice';
import { feedbackText, hasGrammarDeepFeedback } from '@/types/practice';
import { useHasHover } from '@/hooks/useHasHover';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { Flag, HelpCircle, Lightbulb, List } from 'lucide-react';
import { ratePracticeQuestion } from '@/services/api';
import MarkdownBlock from '@/components/practice/MarkdownBlock';

interface QuestionCardProps {
  question: PracticeQuestion;
  mode?: 'practice' | 'quiz';
  onAnswer: (selectedIndex: number, isCorrect: boolean) => void;
  onNext?: () => void;
  nextLabel?: string;
  showHint?: boolean;
  onDismissHint?: () => void;
  submitResult?: PracticeSubmitResult | null;
}

const easeOut = [0.25, 0.46, 0.45, 0.94] as const;

const MASTERY_MESSAGES = [
  'This word is locked in. On to the next one!',
  'Another one down! Your vocabulary keeps growing.',
  'Nailed it! This word won\'t forget you.',
  'That\'s one more word in your arsenal.',
  'Solid work! This one\'s yours for good.',
  'You own this word now. Keep it up!',
  'Boom! One less word to worry about.',
  'That word just graduated. Well done!',
  'Fluency, one word at a time. Nice work!',
  'Committed to memory. You\'re on a roll!',
];

function ConfettiBurst() {
  const particles = Array.from({ length: 50 }, (_, i) => {
    const angle = (i / 50) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    const velocity = 200 + Math.random() * 300;
    return {
      id: i,
      x: Math.cos(angle) * velocity,
      y: Math.sin(angle) * velocity - 150,
      rotation: Math.random() * 720 - 360,
      delay: Math.random() * 0.15,
      duration: 0.9 + Math.random() * 0.5,
      color: ['#34D399', '#4A2462', '#FF6B6B', '#FBBF24', '#60A5FA', '#A78BFA'][Math.floor(Math.random() * 6)],
      size: 5 + Math.random() * 5,
      shape: Math.random() > 0.5 ? 'circle' : 'rect',
    };
  });

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute left-1/2 top-1/2"
          style={{
            width: p.size,
            height: p.shape === 'circle' ? p.size : p.size * 0.6,
            backgroundColor: p.color,
            borderRadius: p.shape === 'circle' ? '50%' : '2px',
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
          animate={{
            x: p.x,
            y: p.y,
            opacity: [1, 1, 0],
            scale: [1, 0.8, 0.4],
            rotate: p.rotation,
          }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

type FeedbackLevel = 'short' | 'why' | 'how';

export default function QuestionCard({
  question,
  mode = 'practice',
  onAnswer,
  onNext,
  nextLabel = 'Next Question',
  showHint,
  onDismissHint,
  submitResult,
}: QuestionCardProps) {
  const qd = question.questionData;
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [feedbackLevel, setFeedbackLevel] = useState<FeedbackLevel>('short');
  const [feedbackDismissed, setFeedbackDismissed] = useState(false);
  const [rated, setRated] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasHover = useHasHover();
  const masteryMessage = useMemo(() => MASTERY_MESSAGES[Math.floor(Math.random() * MASTERY_MESSAGES.length)], []);

  const willMaster = question.vocabContext?.willMaster ?? false;
  const mastered = submitResult?.vocabContext?.mastered ?? false;

  const handleQuestionMouseEnter = useCallback(() => {
    if (!hasHover || !qd.questionFamiliar) return;
    hoverTimerRef.current = setTimeout(() => setShowTranslation(true), 500);
  }, [hasHover, qd.questionFamiliar]);

  const handleQuestionMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setShowTranslation(false);
  }, []);

  const toggleTranslation = useCallback(() => {
    if (!qd.questionFamiliar) return;
    setShowTranslation((prev) => !prev);
  }, [qd.questionFamiliar]);

  const handleSelect = (index: number) => {
    if (hasAnswered) return;
    setSelectedIndex(index);
    setHasAnswered(true);
    const isCorrect = qd.answerChoices[index]?.text === qd.correctAnswer;
    onAnswer(index, isCorrect);

    if (isCorrect && (willMaster || mastered)) {
      setTimeout(() => setShowConfetti(true), 350);
    }
  };

  const isCorrect = selectedIndex != null && qd.answerChoices[selectedIndex]?.text === qd.correctAnswer;
  const showMastery = isCorrect && (willMaster || mastered);

  const displayQuestion =
    hasAnswered && qd.questionComplete ? qd.questionComplete : qd.question;

  const serverFeedback = submitResult?.feedback;
  const localFeedback = isCorrect ? qd.feedback.correct : qd.feedback.incorrect;
  const activeFeedback = serverFeedback ?? localFeedback;
  const deepFeedback = hasGrammarDeepFeedback(activeFeedback) ? activeFeedback : null;

  const handleRate = async (feedback: 'good' | 'bad') => {
    if (rated || !question.domain) return;
    setRated(true);
    try {
      await ratePracticeQuestion({
        domain: question.domain,
        questionId: question.questionId,
        feedback,
      });
    } catch {
      setRated(false);
    }
  };

  const showNextBar = hasAnswered && !!onNext;

  return (
    <motion.div
      className="max-w-[600px] mx-auto relative"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16, transition: { duration: 0.2 } }}
      transition={{ duration: 0.45, ease: easeOut }}
    >
      {/* Question card */}
      <motion.div layout transition={{ layout: { duration: 0.3, ease: easeOut } }}>
        <motion.div
          className={cn(
            'relative bg-surface rounded-2xl border border-ui-border px-md py-md overflow-hidden',
            hasAnswered && !isCorrect && 'opacity-90'
          )}
          onMouseEnter={hasHover && !hasAnswered ? handleQuestionMouseEnter : undefined}
          onMouseLeave={hasHover && !hasAnswered ? handleQuestionMouseLeave : undefined}
          animate={hasAnswered && !isCorrect ? { x: [0, -6, 6, -4, 4, -2, 2, 0] } : {}}
          transition={hasAnswered && !isCorrect ? { duration: 0.45, ease: 'easeInOut' } : {}}
        >
          {showConfetti && <ConfettiBurst />}

          {mode === 'practice' && question.domain && (
            <button
              type="button"
              onClick={() => handleRate('bad')}
              disabled={rated}
              className="absolute top-sm right-sm z-[2] p-xs text-ui-muted-foreground hover:text-ui-primary transition-colors disabled:opacity-40"
              aria-label="Report question"
            >
              <Flag className="w-4 h-4" />
            </button>
          )}

          <div className="flex justify-center mb-sm">
            <HelpCircle className="w-5 h-5 text-ui-muted-foreground/60" />
          </div>

          {qd.instruction && (
            <p className="text-body-sm text-ui-muted-foreground text-center leading-relaxed pb-sm mb-sm border-b border-ui-border/60">
              {qd.instruction}
            </p>
          )}

          <div className="flex items-start justify-center gap-xs relative z-[1]">
            <p
              className={cn(
                'text-title-lg leading-relaxed text-center transition-colors duration-300 font-semibold',
                !hasAnswered && showTranslation ? 'text-primary-light' : 'text-ui-primary'
              )}
            >
              {!hasAnswered && showTranslation && qd.questionFamiliar
                ? qd.questionFamiliar
                : displayQuestion}
            </p>
            {!hasHover && !hasAnswered && qd.questionFamiliar && (
              <button
                type="button"
                onClick={toggleTranslation}
                className={cn(
                  'flex-shrink-0 mt-[5px] bg-transparent border-none cursor-pointer transition-colors duration-200',
                  showTranslation ? 'text-ui-primary' : 'text-ui-muted-foreground/50'
                )}
                aria-label={showTranslation ? 'Show original' : 'Translate question'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <path d="M12 17h.01" />
                </svg>
              </button>
            )}
          </div>

          {hasAnswered && qd.questionCompleteFamiliar && (
            <motion.p
              className="text-body-sm text-ui-muted-foreground text-center mt-sm italic"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.35, ease: easeOut }}
            >
              {qd.questionCompleteFamiliar}
            </motion.p>
          )}

          {/* Hint banner */}
          <AnimatePresence>
            {showHint && (
              <motion.div
                className="absolute bottom-0 left-0 right-0 flex items-center gap-xs px-md py-[10px] bg-ui-primary/90 backdrop-blur-sm rounded-b-2xl z-[2]"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2 }}
              >
                <span className="text-label-md text-white/90 font-medium flex-1">
                  {hasHover
                    ? 'Hover over the question to see its translation'
                    : 'Tap the bubble icon to see the question in your language'}
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDismissHint?.(); }}
                  className="p-xs rounded-full hover:bg-white/20 transition-colors cursor-pointer shrink-0"
                  aria-label="Dismiss hint"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/70">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* Answer choices */}
      <motion.div layout className="flex flex-col gap-xs mt-sm" transition={{ layout: { duration: 0.3, ease: easeOut } }}>
        {qd.answerChoices.map((choice, index) => {
          const isSelected = selectedIndex === index;
          const isCorrectChoice = choice.text === qd.correctAnswer;
          const showCorrectState = hasAnswered && isCorrectChoice;
          const showIncorrectState = hasAnswered && isSelected && !isCorrectChoice;
          const isDimmed = hasAnswered && !isSelected && !isCorrectChoice;

          return (
            <motion.button
              key={index}
              type="button"
              onClick={() => handleSelect(index)}
              disabled={hasAnswered}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: isDimmed ? 0.45 : 1, y: 0 }}
              transition={{ delay: 0.05 + index * 0.05, duration: 0.35, ease: easeOut }}
              whileHover={!hasAnswered && hasHover ? { scale: 1.01 } : undefined}
              whileTap={!hasAnswered ? { scale: 0.985 } : undefined}
              className={cn(
                'relative w-full rounded-2xl border px-md py-sm text-left transition-colors duration-200 flex items-center justify-between gap-sm min-h-[52px]',
                !hasAnswered && 'border-ui-border bg-surface cursor-pointer hover:border-primary-light',
                showCorrectState && 'border-correct bg-correct-bg cursor-default',
                showIncorrectState && 'border-incorrect bg-incorrect-bg cursor-default',
                isDimmed && 'border-ui-border/40 bg-surface cursor-default'
              )}
            >
              <span
                className={cn(
                  'text-title-md font-semibold',
                  showCorrectState && 'text-correct-text',
                  showIncorrectState && 'text-incorrect-text',
                  !hasAnswered && 'text-ui-primary'
                )}
              >
                {choice.text}
              </span>
              <AnimatePresence>
                {hasAnswered && choice.textFamiliar && (
                  <motion.span
                    className="text-body-sm text-ui-muted-foreground text-right max-w-[55%] shrink-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 + index * 0.05, duration: 0.3 }}
                  >
                    {choice.textFamiliar}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Post-answer feedback */}
      <AnimatePresence>
        {hasAnswered && !feedbackDismissed && (
          <motion.div
            key={`answer-footer-${question.questionId}`}
            className="z-[950] mt-md"
            style={{ position: 'sticky', bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12, transition: { duration: 0.2 } }}
            transition={{ duration: 0.3, ease: easeOut }}
          >
            {showMastery ? (
              <motion.div
                className="p-md rounded-2xl border border-ui-primary/10 overflow-hidden relative mb-sm"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--primary) / 0.04), hsl(var(--accent-coral) / 0.06), hsl(var(--primary) / 0.04))',
                }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4, ease: easeOut }}
              >
                <div className="flex items-center gap-sm relative z-[1]">
                  <motion.span
                    className="text-display-md shrink-0"
                    animate={{ rotate: [0, -12, 12, -8, 0], scale: [1, 1.25, 1] }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                  >
                    🎉
                  </motion.span>
                  <div>
                    <p className="text-title-md font-bold text-ui-primary">Word Mastered!</p>
                    <p className="text-body-sm text-ui-muted-foreground mt-[2px]">{masteryMessage}</p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                className={cn(
                  'relative rounded-2xl border p-md mb-sm shadow-[0_-10px_30px_rgba(28,23,37,0.08)]',
                  isCorrect ? 'bg-correct-bg border-correct/25' : 'bg-incorrect-bg border-incorrect/25'
                )}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.35, ease: easeOut }}
              >
                <button
                  type="button"
                  onClick={() => setFeedbackDismissed(true)}
                  className={cn(
                    'absolute top-sm right-sm w-[22px] h-[22px] flex items-center justify-center rounded-full text-label-md opacity-70 hover:opacity-100',
                    isCorrect ? 'text-correct-text' : 'text-incorrect-text'
                  )}
                  aria-label="Dismiss feedback"
                >
                  ▾
                </button>

                {submitResult && (
                  <div className="flex justify-end mb-xs pr-lg">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-sm py-[2px] text-label-md font-semibold border',
                        isCorrect
                          ? 'bg-correct-bg border-correct/30 text-correct-text'
                          : 'bg-incorrect-bg border-incorrect/30 text-incorrect-text'
                      )}
                    >
                      New Rating: {Math.round(submitResult.ratingAfter)} (
                      {submitResult.ratingAfter - submitResult.ratingBefore > 0 ? '+' : ''}
                      {Math.round(submitResult.ratingAfter - submitResult.ratingBefore)})
                    </span>
                  </div>
                )}

                {feedbackLevel === 'short' && (
                  <>
                    <p className={cn('text-body-md leading-relaxed pr-lg', isCorrect ? 'text-correct-text' : 'text-incorrect-text')}>
                      {feedbackText(activeFeedback)}
                    </p>
                    <div className="flex items-center justify-between mt-sm gap-sm">
                      {showNextBar && (
                        <button
                          type="button"
                          onClick={onNext}
                          className={cn('text-title-sm font-semibold', isCorrect ? 'text-correct-text' : 'text-incorrect-text')}
                        >
                          {nextLabel} ▸
                        </button>
                      )}
                      {deepFeedback?.theWhy && (
                        <button
                          type="button"
                          onClick={() => setFeedbackLevel('why')}
                          className={cn('inline-flex items-center gap-xs text-title-sm font-semibold ml-auto', isCorrect ? 'text-correct-text' : 'text-incorrect-text')}
                        >
                          <Lightbulb className="w-4 h-4" />
                          Learn why
                        </button>
                      )}
                    </div>
                  </>
                )}

                {feedbackLevel === 'why' && deepFeedback?.theWhy && (
                  <>
                    <MarkdownBlock content={deepFeedback.theWhy} className={isCorrect ? 'text-correct-text' : 'text-incorrect-text'} />
                    <div className="flex items-center justify-between mt-sm">
                      <button type="button" onClick={() => setFeedbackLevel('short')} className={cn('text-body-sm', isCorrect ? 'text-correct-text' : 'text-incorrect-text')}>
                        ◂ Back
                      </button>
                      {deepFeedback.theHow && (
                        <button
                          type="button"
                          onClick={() => setFeedbackLevel('how')}
                          className={cn('inline-flex items-center gap-xs text-title-sm font-semibold', isCorrect ? 'text-correct-text' : 'text-incorrect-text')}
                        >
                          <List className="w-4 h-4" />
                          Show me how
                        </button>
                      )}
                    </div>
                  </>
                )}

                {feedbackLevel === 'how' && deepFeedback?.theHow && (
                  <>
                    <MarkdownBlock content={deepFeedback.theHow} className={isCorrect ? 'text-correct-text' : 'text-incorrect-text'} />
                    <div className="flex items-center justify-between mt-sm">
                      <button type="button" onClick={() => setFeedbackLevel('why')} className={cn('text-body-sm', isCorrect ? 'text-correct-text' : 'text-incorrect-text')}>
                        ◂ Back
                      </button>
                      {showNextBar && (
                        <button type="button" onClick={onNext} className={cn('text-title-sm font-semibold', isCorrect ? 'text-correct-text' : 'text-incorrect-text')}>
                          {nextLabel} ▸
                        </button>
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {showNextBar && (showMastery || feedbackDismissed) && (
              <motion.button
                type="button"
                onClick={onNext}
                className={cn(buttonVariants(), 'w-full shadow-[0_8px_32px_hsl(var(--primary)/0.25)] border-none')}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.35, ease: easeOut }}
                whileHover={hasHover ? { scale: 1.01 } : undefined}
                whileTap={{ scale: 0.98 }}
              >
                {nextLabel}
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {hasAnswered && feedbackDismissed && showNextBar && !showMastery && (
        <div className="mt-md flex gap-xs">
          <motion.button
            type="button"
            onClick={onNext}
            className={cn(buttonVariants(), 'flex-[4] border-none')}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {nextLabel}
          </motion.button>
          <motion.button
            type="button"
            onClick={() => setFeedbackDismissed(false)}
            className="flex-1 border border-ui-border bg-surface text-ui-primary rounded-2xl flex items-center justify-center text-title-md font-bold"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            aria-label="Show feedback"
          >
            ?
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}

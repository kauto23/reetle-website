'use client';

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PracticeQuestion } from '@/types/practice';
import { useHasHover } from '@/hooks/useHasHover';

interface QuestionCardProps {
  question: PracticeQuestion;
  onAnswer: (isCorrect: boolean) => void;
  onNext?: () => void;
  nextLabel?: string;
  showHint?: boolean;
  onDismissHint?: () => void;
}

const easeOut = [0.25, 0.46, 0.45, 0.94] as const;

const ALWAYS_SHOW_MASTERY = false; // Set to true to test mastery animation on every correct answer

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
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}

export default function QuestionCard({ question, onAnswer, onNext, nextLabel = 'Next Question', showHint, onDismissHint }: QuestionCardProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasHover = useHasHover();
  const nextButtonRef = useRef<HTMLDivElement>(null);
  const [isButtonInView, setIsButtonInView] = useState(true);
  const masteryMessage = useMemo(() => MASTERY_MESSAGES[Math.floor(Math.random() * MASTERY_MESSAGES.length)], []);

  useEffect(() => {
    if (!hasAnswered || !onNext) {
      setIsButtonInView(true);
      return;
    }
    const el = nextButtonRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsButtonInView(entry.isIntersecting),
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasAnswered, onNext]);

  const handleQuestionMouseEnter = useCallback(() => {
    if (!hasHover || !question.questionFamiliar) return;
    hoverTimerRef.current = setTimeout(() => setShowTranslation(true), 500);
  }, [hasHover, question.questionFamiliar]);

  const handleQuestionMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setShowTranslation(false);
  }, []);

  const toggleTranslation = useCallback(() => {
    if (!question.questionFamiliar) return;
    setShowTranslation(prev => !prev);
  }, [question.questionFamiliar]);

  const handleSelect = (choiceText: string) => {
    if (hasAnswered) return;
    setSelectedAnswer(choiceText);
    setHasAnswered(true);
    const isCorrect = choiceText === question.correctAnswer;
    onAnswer(isCorrect);

    if (choiceText === question.correctAnswer && (ALWAYS_SHOW_MASTERY || question.willMaster)) {
      setTimeout(() => setShowConfetti(true), 350);
    }
  };

  const isCorrect = selectedAnswer === question.correctAnswer;
  const showMastery = isCorrect && (ALWAYS_SHOW_MASTERY || question.willMaster);

  const displayQuestion = hasAnswered && question.questionComplete
    ? question.questionComplete
    : question.question;

  const choiceCount = question.answerChoices.length;
  const revealDelay = (slot: number) => 0.06 + slot * 0.06;
  const questionTranslationSlot = choiceCount;
  const feedbackSlot = choiceCount + 1;
  const masterySlot = choiceCount + 2;
  const buttonSlot = choiceCount + 3;

  return (
    <motion.div
      className="max-w-[600px] mx-auto relative"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16, transition: { duration: 0.2 } }}
      transition={{ duration: 0.45, ease: easeOut }}
    >
      {/* Question card + hint banner wrapper */}
      <motion.div
        layout
        transition={{ layout: { duration: 0.3, ease: easeOut } }}
      >
        <motion.div
          className="relative bg-surface rounded-2xl border border-border/50 px-lg py-md overflow-hidden"
          style={{ boxShadow: '0 4px 24px rgba(45, 24, 50, 0.06), 0 1px 3px rgba(45, 24, 50, 0.04)' }}
          onMouseEnter={hasHover && !hasAnswered ? handleQuestionMouseEnter : undefined}
          onMouseLeave={hasHover && !hasAnswered ? handleQuestionMouseLeave : undefined}
          animate={hasAnswered && !isCorrect ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : {}}
          transition={hasAnswered && !isCorrect ? { duration: 0.45, ease: 'easeInOut' } : {}}
        >
          {showConfetti && <ConfettiBurst />}

          <div className="absolute top-0 left-0 right-0 h-[3px] bg-primary rounded-t-2xl" />

          <div className="flex items-start justify-center gap-[6px] pt-xs relative z-[1]">
            <p className={`text-[20px] sm:text-[22px] font-semibold leading-relaxed text-center transition-colors duration-300 ${!hasAnswered && showTranslation ? 'text-primary-light' : 'text-primary'}`}>
              {!hasAnswered && showTranslation && question.questionFamiliar
                ? question.questionFamiliar
                : displayQuestion
              }
            </p>
            {!hasHover && !hasAnswered && question.questionFamiliar && (
              <button
                onClick={toggleTranslation}
                className={`flex-shrink-0 mt-[5px] bg-transparent border-none cursor-pointer transition-colors duration-200 ${showTranslation ? 'text-primary' : 'text-text-secondary/50'}`}
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

          {hasAnswered && question.questionCompleteFamiliar && (
            <motion.p
              className="text-body-md text-text-secondary text-center mt-sm"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: revealDelay(questionTranslationSlot), duration: 0.4, ease: easeOut }}
            >
              {question.questionCompleteFamiliar}
            </motion.p>
          )}

          {/* Hint banner */}
          <AnimatePresence>
            {showHint && (
              <motion.div
                className="absolute bottom-0 left-0 right-0 flex items-center gap-[8px] px-md py-[10px] bg-primary/90 backdrop-blur-sm rounded-b-2xl z-[2]"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/90 shrink-0">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                <span className="text-[12px] sm:text-[13px] text-white/90 font-medium flex-1">
                  {hasHover
                    ? 'Hover over the question to see its translation'
                    : <>Tap <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block align-[-2px]"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></svg> to see the question in your language</>
                  }
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); onDismissHint?.(); }}
                  className="p-[4px] rounded-full hover:bg-white/20 transition-colors duration-150 cursor-pointer shrink-0"
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
      <motion.div layout className="flex flex-col gap-[8px] mt-sm" transition={{ layout: { duration: 0.3, ease: easeOut } }}>
        {question.answerChoices.map((choice, index) => {
          const isSelected = selectedAnswer === choice.text;
          const isCorrectChoice = choice.text === question.correctAnswer;
          const showCorrectState = hasAnswered && isCorrectChoice;
          const showIncorrectState = hasAnswered && isSelected && !isCorrectChoice;
          const isDimmed = hasAnswered && !isSelected && !isCorrectChoice;

          return (
            <motion.button
              key={index}
              onClick={() => handleSelect(choice.text)}
              disabled={hasAnswered}
              initial={{ opacity: 0, y: 14 }}
              animate={{
                opacity: isDimmed ? 0.4 : 1,
                y: 0,
              }}
              transition={{
                delay: 0.06 + index * 0.06,
                duration: 0.4,
                ease: easeOut,
              }}
              whileHover={!hasAnswered ? { scale: 1.015, y: -1 } : {}}
              whileTap={!hasAnswered ? { scale: 0.985 } : {}}
              className={`
                relative p-md rounded-xl border-2 text-left w-full transition-colors duration-200
                ${!hasAnswered
                  ? 'border-border/50 bg-surface hover:border-primary-light hover:bg-white cursor-pointer'
                  : showCorrectState
                    ? 'border-correct bg-correct-bg cursor-default'
                    : showIncorrectState
                      ? 'border-incorrect bg-incorrect-bg cursor-default'
                      : 'border-border/30 bg-surface cursor-default'
                }
              `}
              style={
                !hasAnswered ? { boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }
                : showCorrectState ? { boxShadow: '0 0 0 1px rgba(52, 211, 153, 0.15), 0 4px 16px rgba(52, 211, 153, 0.1)' }
                : showIncorrectState ? { boxShadow: '0 0 0 1px rgba(248, 113, 113, 0.15), 0 4px 16px rgba(248, 113, 113, 0.1)' }
                : {}
              }
            >
              <div className="flex items-center gap-md">
                <motion.span
                  className={`
                    w-[36px] h-[36px] rounded-xl flex items-center justify-center text-[14px] font-bold shrink-0 transition-colors duration-300
                    ${showCorrectState
                      ? 'bg-correct text-white'
                      : showIncorrectState
                        ? 'bg-incorrect text-white'
                        : 'bg-background text-primary'
                    }
                  `}
                  animate={
                    showCorrectState ? { scale: [1, 1.2, 1] }
                    : showIncorrectState ? { scale: [1, 1.2, 1] }
                    : {}
                  }
                  transition={{ duration: 0.3, delay: 0.05 }}
                >
                  {showCorrectState ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : showIncorrectState ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  ) : (
                    String.fromCharCode(65 + index)
                  )}
                </motion.span>

                <div className="flex-1 min-w-0 flex items-baseline justify-between gap-sm">
                  <p className={`text-[16px] font-medium leading-snug ${
                    showCorrectState ? 'text-correct-text' : showIncorrectState ? 'text-incorrect-text' : 'text-primary'
                  }`}>
                    {choice.text}
                  </p>
                  <AnimatePresence>
                    {hasAnswered && choice.textFamiliar && (
                      <motion.p
                        className="text-[13px] text-text-secondary whitespace-nowrap text-right"
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: revealDelay(index), duration: 0.4, ease: easeOut }}
                      >
                        {choice.textFamiliar}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Post-answer group: feedback, mastery, next button */}
      <AnimatePresence>
        {hasAnswered && (
          <motion.div
            className="flex flex-col gap-sm mt-sm"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: revealDelay(feedbackSlot), duration: 0.4, ease: easeOut }}
          >
            {!(hasAnswered && showMastery) && (
              <motion.div
                className={`p-md rounded-xl ${isCorrect ? 'bg-correct-bg border border-correct/20' : 'bg-incorrect-bg border border-incorrect/20'}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: revealDelay(feedbackSlot), duration: 0.4, ease: easeOut }}
              >
                <div className="flex items-start gap-sm">
                  <div className={`w-[24px] h-[24px] rounded-full flex items-center justify-center shrink-0 mt-[1px] ${isCorrect ? 'bg-correct' : 'bg-incorrect'}`}>
                    {isCorrect ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className={`text-[14px] font-semibold ${isCorrect ? 'text-correct-text' : 'text-incorrect-text'}`}>
                      {isCorrect ? question.feedback.correct : question.feedback.incorrect}
                    </p>
                    {!isCorrect && question.feedback.incorrectFamiliar && (
                      <p className="text-[13px] text-text-secondary mt-xs">
                        {question.feedback.incorrectFamiliar}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {showMastery && (
              <motion.div
                className="p-md rounded-xl border border-primary/10 overflow-hidden relative"
                style={{ background: 'linear-gradient(135deg, rgba(74, 36, 98, 0.04), rgba(255, 107, 107, 0.06), rgba(74, 36, 98, 0.04))' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: revealDelay(masterySlot), duration: 0.4, ease: easeOut }}
              >
                <div className="flex items-center gap-sm relative z-[1]">
                  <motion.span
                    className="text-[28px] shrink-0"
                    animate={{ rotate: [0, -12, 12, -8, 0], scale: [1, 1.25, 1] }}
                    transition={{ delay: revealDelay(masterySlot) + 0.3, duration: 0.6 }}
                  >
                    🎉
                  </motion.span>
                  <div>
                    <p className="text-[15px] font-bold text-primary">Word Mastered!</p>
                    <p className="text-[13px] text-text-secondary mt-[2px]">{masteryMessage}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {onNext && (
              <div ref={nextButtonRef}>
                <motion.button
                  onClick={onNext}
                  className="btn-primary w-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: revealDelay(buttonSlot), duration: 0.4, ease: easeOut }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {nextLabel}
                </motion.button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {hasAnswered && onNext && !isButtonInView && (
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 px-md pt-sm"
            style={{
              paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
              background: 'linear-gradient(to top, var(--color-background) 60%, transparent)',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="max-w-[600px] mx-auto">
              <motion.button
                onClick={onNext}
                className="btn-primary w-full shadow-lg"
                whileTap={{ scale: 0.98 }}
              >
                {nextLabel}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

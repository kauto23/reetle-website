'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { PracticeQuestion, PracticeSubmitResult } from '@/types/practice';
import { feedbackText, hasGrammarDeepFeedback } from '@/types/practice';
import { cn } from '@/lib/utils';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import MarkdownBlock from '@/components/practice/MarkdownBlock';
import MasteryOverlay from '@/components/practice/MasteryOverlay';
import type { PracticePhase } from '@/components/practice/PracticeRatingTracker';

export type FeedbackLevel = 'short' | 'why' | 'how';

interface PracticeQuestionPanelProps {
  question: PracticeQuestion;
  submitResult: PracticeSubmitResult | null;
  phase: PracticePhase;
  selectedIndex: number | null;
  correct: boolean | null;
  fbLevel: FeedbackLevel;
  fbDismissed: boolean;
  idleHint: boolean;
  showMastery: boolean;
  masteryWord?: string;
  onSelect: (i: number) => void;
  onNext: () => void;
  onSetFbLevel: (level: FeedbackLevel) => void;
  onDismissFb: () => void;
  onReopenFb: () => void;
  onRate?: (feedback: 'good' | 'bad') => void;
  /** Current question rating state: not rated, rated bad, or rated good. */
  ratingState?: 'none' | 'bad' | 'good';
}

export default function PracticeQuestionPanel({
  question,
  submitResult,
  phase,
  selectedIndex,
  correct,
  fbLevel,
  fbDismissed,
  idleHint,
  showMastery,
  masteryWord,
  onSelect,
  onNext,
  onSetFbLevel,
  onDismissFb,
  onReopenFb,
  onRate,
  ratingState = 'none',
}: PracticeQuestionPanelProps) {
  const qd = question.questionData;
  const fb = phase === 'feedback';
  const answered = fb;
  const isCorrect = correct === true;
  const isWrong = correct === false;

  const displayQuestion = answered && qd.questionComplete ? qd.questionComplete : qd.question;

  const serverFeedback = submitResult?.feedback;
  const localFeedback = isCorrect ? qd.feedback.correct : qd.feedback.incorrect;
  const activeFeedback = serverFeedback ?? localFeedback;
  const deepFeedback = hasGrammarDeepFeedback(activeFeedback) ? activeFeedback : null;

  const cardDim = fb && !fbDismissed ? 0.45 : 1;

  // Prototype palette (exact hex values from the mobile prototype)
  const fbColor = isCorrect ? '#065F46' : '#991B1B';

  return (
    <div className="h-full w-full flex flex-col gap-sm px-md pt-md pb-[calc(16px+env(safe-area-inset-bottom,0px))] max-w-[600px] mx-auto relative">
      {/* Question card */}
      <div
        className="relative bg-white rounded-2xl border border-[#E5E3E8] px-md py-md overflow-hidden transition-opacity duration-300"
        style={{ opacity: cardDim }}
      >
        {/* Domain header row: centered domain label with a thumbs-down/thumbs-up
            review control on the right (matches iOS app). Thumbs-up only appears
            after the question has been rated thumbs-down. */}
        {question.domain && (
          <div className="relative flex items-center justify-center pb-sm mb-sm">
            <span
              className="text-label-sm font-bold uppercase text-[#4A2462]"
              style={{ letterSpacing: '1px' }}
            >
              {question.domain === 'Vocabulary' ? 'Vocabulary' : 'Grammar'}
            </span>
            {onRate && (
              <button
                type="button"
                onClick={() => onRate(ratingState === 'bad' ? 'good' : 'bad')}
                className="absolute right-0 top-1/2 -translate-y-1/2 p-xs transition-colors"
                style={{ color: ratingState === 'bad' ? '#4A2462' : '#666276' }}
                aria-label={ratingState === 'bad' ? 'Mark as good question' : 'Mark as bad question'}
              >
                {ratingState === 'bad' ? <ThumbsUp className="w-4 h-4" /> : <ThumbsDown className="w-4 h-4" />}
              </button>
            )}
          </div>
        )}

        {!fb && qd.instruction && (
          <p className="text-body-sm text-[#666276] text-center leading-relaxed pb-sm mb-sm border-b border-[#EDEAF1]">
            {qd.instruction}
          </p>
        )}

        <div className="flex items-start justify-center gap-xs relative z-[1]">
          {/* Prototype swaps the text in place with a single rise, no exit gap */}
          <motion.p
            key={answered ? 'complete' : 'prompt'}
            initial={answered ? { opacity: 0, y: 14 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="text-title-lg leading-relaxed text-center font-semibold text-[#4A2462]"
          >
            {displayQuestion}
          </motion.p>
        </div>

        {answered && qd.questionCompleteFamiliar && (
          <motion.p
            className="text-body-sm text-[#666276] text-center mt-sm italic pt-sm border-t border-[#EDEAF1]"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.4, ease: 'easeOut' }}
          >
            {qd.questionCompleteFamiliar}
          </motion.p>
        )}
      </div>

      {/* Options */}
      <div className="flex flex-col gap-xs">
        {qd.answerChoices.map((choice, index) => {
          const isSelected = selectedIndex === index;
          const isCorrectChoice = choice.text === qd.correctAnswer;
          const showCorrect = answered && isCorrectChoice;
          const showIncorrect = answered && isSelected && !isCorrectChoice;
          const isDimmed = answered && !isSelected && !isCorrectChoice;
          const choiceOpacity = answered
            ? (showCorrect || showIncorrect ? 0.6 : isDimmed ? 0.3 : 1)
            : 1;
          const dismissedBoost = fbDismissed ? (showCorrect || showIncorrect ? 1 : isDimmed ? 0.8 : 1) : choiceOpacity;

          return (
            <motion.button
              key={index}
              type="button"
              onClick={() => onSelect(index)}
              disabled={answered}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: dismissedBoost, y: 0 }}
              transition={{ delay: 0.04 + index * 0.04, duration: 0.3, ease: 'easeOut' }}
              className={cn(
                'relative w-full rounded-lg border px-md py-sm min-h-[52px] transition-[border-color,background-color] duration-[250ms]',
                !answered && 'border-[#E5E3E8] bg-white cursor-pointer hover:border-[#8C5FB3]',
                showCorrect && 'border-[#34D399] bg-[#ECF7ED] cursor-default',
                showIncorrect && 'border-[#F87171] bg-[#FEE2E2] cursor-default',
                isDimmed && 'border-[#E5E3E8] bg-white cursor-default'
              )}
            >
              {/* Text: truly centered on the button while idle, slides left on feedback.
                  The familiar mark is absolutely positioned so it never offsets the centering. */}
              <span
                className={cn(
                  'absolute top-1/2 text-title-md font-semibold whitespace-nowrap',
                  showCorrect && 'text-[#065F46]',
                  showIncorrect && 'text-[#991B1B]',
                  !answered && 'text-[#4A2462]',
                  isDimmed && 'text-[#666276]'
                )}
                style={{
                  left: answered ? '16px' : '50%',
                  transform: answered ? 'translateY(-50%)' : 'translate(-50%, -50%)',
                  transition: 'left 0.35s cubic-bezier(0.22,1,0.36,1), transform 0.35s cubic-bezier(0.22,1,0.36,1), color 0.25s',
                }}
              >
                {choice.text}
              </span>
              <span
                className="absolute top-1/2 right-md -translate-y-1/2 text-body-sm text-right max-w-[55%]"
                style={{
                  color: showCorrect ? '#065F46' : showIncorrect ? '#991B1B' : '#666276',
                  opacity: answered ? 1 : 0,
                  transition: 'opacity 0.3s 0.15s',
                }}
              >
                {choice.textFamiliar}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Feedback card / dismiss bar / idle caret */}
      <div className="relative flex-1 min-h-0">
        <AnimatePresence>
          {fb && !fbDismissed && !showMastery && (
            <motion.div
              key={`fb-${question.questionId}`}
              className="absolute left-0 right-0 bottom-0 rounded-2xl border p-md shadow-[0_-10px_30px_rgba(28,23,37,0.08)] overflow-hidden"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 14, transition: { duration: 0.2 } }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{
                background: isCorrect ? '#ECF7ED' : '#FEE2E2',
                borderColor: isCorrect ? '#34D399' : '#F87171',
              }}
            >
              <button
                type="button"
                onClick={onDismissFb}
                className="absolute top-sm right-sm w-[22px] h-[22px] flex items-center justify-center rounded-full text-label-md opacity-70 hover:opacity-100"
                style={{ color: fbColor }}
                aria-label="Dismiss feedback"
              >
                ▾
              </button>

              <motion.div
                layout
                transition={{ layout: { duration: 0.3, ease: 'easeInOut' } }}
              >
                {fbLevel === 'short' && (
                  <motion.div key="short" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
                    <MarkdownBlock
                      content={feedbackText(activeFeedback)}
                      className={cn('pr-lg', isCorrect ? 'text-[#065F46]' : 'text-[#991B1B]')}
                    />
                    <div className="flex items-center justify-between mt-sm gap-sm">
                      <button
                        type="button"
                        onClick={onNext}
                        className="text-title-sm font-semibold"
                        style={{ color: fbColor }}
                      >
                        Next Question ▸
                      </button>
                      {isWrong && deepFeedback?.theWhy && (
                        <button
                          type="button"
                          onClick={() => onSetFbLevel('why')}
                          className="text-title-sm font-semibold ml-auto"
                          style={{ color: fbColor }}
                        >
                          Learn more
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}

                {fbLevel === 'why' && deepFeedback?.theWhy && (
                  <motion.div key="why" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
                    <MarkdownBlock content={deepFeedback.theWhy} className="text-[#991B1B]" />
                    <div className="flex items-center justify-between mt-sm">
                      <button type="button" onClick={() => onSetFbLevel('short')} className="text-body-sm" style={{ color: fbColor }}>
                        ◂ Back
                      </button>
                      {deepFeedback.theHow && (
                        <button
                          type="button"
                          onClick={() => onSetFbLevel('how')}
                          className="text-title-sm font-semibold"
                          style={{ color: fbColor }}
                        >
                          Show me how ▸
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}

                {fbLevel === 'how' && deepFeedback?.theHow && (
                  <motion.div key="how" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
                    <MarkdownBlock content={deepFeedback.theHow} className="text-[#991B1B]" />
                    <div className="flex items-center justify-between mt-sm">
                      <button type="button" onClick={() => onSetFbLevel('why')} className="text-body-sm" style={{ color: fbColor }}>
                        ◂ Back
                      </button>
                      <button type="button" onClick={onNext} className="text-title-sm font-semibold" style={{ color: fbColor }}>
                        Next Question ▸
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dismiss bar */}
        {fb && fbDismissed && !showMastery && (
          <motion.div
            className="absolute left-0 right-0 bottom-0 flex gap-xs"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <button
              type="button"
              onClick={onNext}
              className="flex-[4] rounded-lg bg-[#4A2462] hover:bg-[#8C5FB3] text-white py-sm text-title-md font-semibold text-center transition-colors"
            >
              Next Question
            </button>
            <button
              type="button"
              onClick={onReopenFb}
              className="flex-1 border border-[#E5E3E8] hover:border-[#8C5FB3] bg-white text-[#4A2462] rounded-lg flex items-center justify-center text-title-md font-bold transition-colors"
              aria-label="Show feedback"
            >
              ?
            </button>
          </motion.div>
        )}

        {/* Mastery overlay */}
        {showMastery && masteryWord && (
          <MasteryOverlay word={masteryWord} />
        )}
      </div>
    </div>
  );
}

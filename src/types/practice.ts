export type PracticeDomain = 'Grammar' | 'Vocabulary';

export interface AnswerChoice {
  text: string;
  textFamiliar: string;
  whyNonsensical?: string | null;
}

export interface GrammarFeedbackIncorrect {
  short: string;
  theWhy?: string;
  theHow?: string;
}

export interface Feedback {
  correct: string;
  correctFamiliar?: string;
  incorrect: string | GrammarFeedbackIncorrect;
  incorrectFamiliar?: string;
}

export interface PracticeForecast {
  expectedScore: number;
  ifCorrect: { ratingAfter: number; change: number };
  ifIncorrect: { ratingAfter: number; change: number };
}

export interface QuestionData {
  question: string;
  questionFamiliar: string;
  instruction?: string;
  answerChoices: AnswerChoice[];
  correctAnswer: string;
  feedback: Feedback;
  questionComplete: string;
  questionCompleteFamiliar: string;
}

export interface GrammarConcept {
  id: number;
  slug: string;
  displayName: string;
  description: string;
  displayOrder: number;
}

export interface GrammarContext {
  answerEventId: number;
  bankQuestionId: number;
  questionType: string;
  concept: GrammarConcept;
  rating: number;
}

export interface VocabContext {
  vocabQuestionId: number;
  unsureWordId: number;
  questionType: string;
  cefrLevel: string;
  targetLanguage: string;
  familiarLanguage: string;
  correctStreak: number;
  willMaster: boolean;
  mastered?: boolean;
}

export interface PracticeQuestion {
  domain?: PracticeDomain;
  questionId: number;
  userRating?: number;
  userBand?: string;
  forecast?: PracticeForecast;
  questionData: QuestionData;
  grammarContext?: GrammarContext;
  vocabContext?: VocabContext;
  /** When the question was created, if returned by the API. */
  createdAt?: string | null;
}

export interface PracticeRating {
  targetLanguage: string;
  rating: number;
  band: string;
}

export interface PracticeSubmitResult {
  domain: PracticeDomain;
  isCorrect: boolean;
  correctAnswer: string;
  feedback: string | GrammarFeedbackIncorrect;
  ratingBefore: number;
  ratingAfter: number;
  band: string;
  expectedScore?: number;
  vocabContext?: VocabContext;
}

/** Extract a display string from feedback that may be structured (grammar incorrect). */
export function feedbackText(feedback: string | GrammarFeedbackIncorrect | undefined): string {
  if (!feedback) return '';
  if (typeof feedback === 'string') return feedback;
  return feedback.short;
}

/** Whether grammar feedback has expandable why/how sections. */
export function hasGrammarDeepFeedback(feedback: string | GrammarFeedbackIncorrect | undefined): feedback is GrammarFeedbackIncorrect {
  if (!feedback || typeof feedback === 'string') return false;
  return !!(feedback.theWhy || feedback.theHow);
}

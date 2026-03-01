export interface AnswerChoice {
  text: string;
  textFamiliar: string;
}

export interface Feedback {
  correct: string;
  correctFamiliar: string;
  incorrect: string;
  incorrectFamiliar: string;
}

export interface WordPair {
  target: string;
  familiar: string;
}

export interface PracticeQuestion {
  question: string;
  questionFamiliar: string;
  questionComplete: string;
  questionCompleteFamiliar: string;
  answerChoices: AnswerChoice[];
  correctAnswer: string;
  feedback: Feedback;
  unsureWordId: number;
  practiceQuestionId: number;
  questionType: 'fill_in_the_blank' | 'pairs';
  wordPairs: WordPair[];
  correctStreak: number;
  masteryHeading: string | null;
  masteryText: string | null;
}

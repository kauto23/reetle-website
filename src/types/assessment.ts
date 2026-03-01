export interface AssessmentQuestion {
  question: string;
  options: string[];
  level: string;
  questionNumber: number;
}

export interface AssessmentStats {
  totalQuestions: number;
  correct: number;
}

export interface AssessmentHistoryItem {
  questionText: string;
  options: string[];
  correctIndex: number;
  userAnswerIndex: number;
  wasCorrect: boolean;
  levelAtTime: string;
  grammarTopic: string;
  explanation: string;
}

export interface AssessmentSummary {
  cefrLevel: string;
  justification: string;
  stats: AssessmentStats;
  history: AssessmentHistoryItem[];
}

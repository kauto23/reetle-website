export type StatsTimeframe = 'daily' | 'weekly' | 'monthly' | 'all';

export interface QuestionBreakdownItem {
  date: string;
  correct: number;
  incorrect: number;
  total: number;
  accuracy: number;
}

export interface QuestionStatsResponse {
  total_questions: number;
  breakdown: QuestionBreakdownItem[];
  summary: {
    questions_answered_in_period: number;
    correct_answers: number;
    incorrect_answers: number;
    accuracy: number;
  };
}

export interface MasteredWordEntry {
  target_word: string;
  familiar_word: string;
}

export interface MasteredWordsBreakdownItem {
  date: string;
  mastered_words: MasteredWordEntry[];
}

export interface MasteredWordsStatsResponse {
  total_mastered: number;
  breakdown: MasteredWordsBreakdownItem[];
  summary: {
    words_mastered_in_period: number;
  };
}

export interface ArticleBreakdownItem {
  date: string;
  articles_read: number;
}

export interface ArticleStatsResponse {
  total_articles_read: number;
  breakdown: ArticleBreakdownItem[];
  summary: {
    articles_read_in_period: number;
  };
}

export interface Article {
  articleId: string;
  headline: string;
  headlineFamiliar: string;
  cefrLevelHeadline: string | null;
  topic: string;
  subtopic: string | null;
  geography: string | null;
  imageLinks: string[];
  createdAt: string | null;
  publishedDate: string | null;
  hoursSinceMostRecent: string | null;
  content: string | null;
  read: boolean;
  contentGenerated: boolean;
  position: number | null;
}

export interface ArticlesResponse {
  articles: Article[];
  topicMap: Record<string, string>;
  subtopicMap: Record<string, string>;
  geographyMap: Record<string, string>;
  allTranslation: string;
}

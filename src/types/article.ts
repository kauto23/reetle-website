export interface Article {
  articleId: string;
  headline: string;
  headlineFamiliar: string;
  cefrLevelHeadline: string | null;
  topic: string;
  subtopic: string | null;
  geography: string | null;
  imageLinks: string[];
  imageThumbUrl: string | null;
  createdAt: string | null;
  publishedDate: string | null;
  hoursSinceMostRecent: string | null;
  content: string | null;
  read: boolean;
  contentGenerated: boolean;
  audioGenerated: boolean;
  audioUrl: string | null;
  contentId: string | null;
  position: number | null;
}

export interface ArticlesResponse {
  articles: Article[];
  topicMap: Record<string, string>;
  subtopicMap: Record<string, string>;
  geographyMap: Record<string, string>;
  allTranslation: string;
  /** From `translations_map.read_more` — localized "Read more" for topic page links */
  readMoreTranslation?: string;
}

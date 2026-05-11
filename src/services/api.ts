import { API_BASE_URL } from '@/config/environment';
import type { User, TargetLanguage } from '@/types/user';
import type { Article, ArticlesResponse } from '@/types/article';
import type { PracticeQuestion } from '@/types/practice';
import type { AssessmentQuestion, AssessmentSummary } from '@/types/assessment';
import type { Translation } from '@/types/translation';
import type { SubscriptionStatus, ReferralInfo, ReferralApplyResponse, CancelSubscriptionResponse } from '@/types/subscription';

// Token storage
const TOKEN_KEY = 'reetle_access_token';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function saveAccessToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

// User storage
const USER_KEY = 'reetle_user';

export function getSavedUser(): User | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as User;
  } catch {
    return null;
  }
}

export function saveUser(user: User): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearUser(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(USER_KEY);
}

// Custom exceptions
export class TokenExpiredError extends Error {
  constructor() {
    super('Token expired');
    this.name = 'TokenExpiredError';
  }
}

export class RateLimitError extends Error {
  retryAfter: number;
  constructor(retryAfter: number) {
    super('Rate limit exceeded');
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class GuestQuotaError extends Error {
  used: number;
  limit: number;
  detail: string;
  constructor(message: string, used: number, limit: number, detail: string) {
    super(message);
    this.name = 'GuestQuotaError';
    this.used = used;
    this.limit = limit;
    this.detail = detail;
  }
}

export class NoPracticeQuestionsError extends Error {
  reason: 'no_unsure_words' | 'all_words_mastered' | 'unknown';
  constructor(message: string, reason: 'no_unsure_words' | 'all_words_mastered' | 'unknown') {
    super(message);
    this.name = 'NoPracticeQuestionsError';
    this.reason = reason;
  }
}

export class FreeTierQuotaError extends Error {
  used: number;
  limit: number;
  detail: string;
  resetsAt: string;
  constructor(message: string, used: number, limit: number, detail: string, resetsAt: string) {
    super(message);
    this.name = 'FreeTierQuotaError';
    this.used = used;
    this.limit = limit;
    this.detail = detail;
    this.resetsAt = resetsAt;
  }
}

// Callbacks
let onTokenExpired: (() => void) | null = null;

export function setTokenExpiredCallback(callback: () => void): void {
  onTokenExpired = callback;
}

// Headers
function getHeaders(requireAuth = true): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (!requireAuth) return headers;

  const token = getAccessToken();
  if (!token) throw new Error('User not authenticated');
  headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

// Response helpers
async function checkForExpiredToken(response: Response): Promise<void> {
  if (response.status === 401) {
    const body = await response.clone().text();
    if (body.includes('expired') || body.includes('invalid')) {
      onTokenExpired?.();
      throw new TokenExpiredError();
    }
  }
}

async function checkRateLimit(response: Response): Promise<void> {
  if (response.status === 429) {
    const body = await response.clone().json().catch(() => ({}));
    if (body.error === 'Daily limit reached' && body.used !== undefined) {
      throw new FreeTierQuotaError(
        body.error,
        body.used,
        body.limit,
        body.detail || 'Upgrade for unlimited access.',
        body.resets_at || ''
      );
    }
    const retryAfter = body.retry_after
      ?? parseInt(response.headers.get('Retry-After') || '60', 10);
    throw new RateLimitError(typeof retryAfter === 'number' ? retryAfter : parseInt(retryAfter, 10) || 60);
  }
}

// API call logging: method, endpoint, status, execution time
async function fetchWithLogging(url: string, options: RequestInit = {}): Promise<Response> {
  const method = (options.method || 'GET').toUpperCase();
  const path = url.replace(API_BASE_URL, '').replace(/^\//, '') || url;
  const start = performance.now();
  if (typeof window !== 'undefined') {
    console.log(`[API] ${method} ${path} – start`);
  }
  try {
    const response = await fetch(url, options);
    const elapsed = performance.now() - start;
    if (typeof window !== 'undefined') {
      const level = response.ok ? 'log' : 'warn';
      console[level](`[API] ${method} ${path} – ${response.status} in ${elapsed.toFixed(0)}ms`);
    }
    return response;
  } catch (err) {
    const elapsed = performance.now() - start;
    if (typeof window !== 'undefined') {
      console.error(`[API] ${method} ${path} – error after ${elapsed.toFixed(0)}ms`, err);
    }
    throw err;
  }
}

// ========= AUTH =========

export async function signInWithGoogle(idToken: string, email?: string, fullName?: string): Promise<{ user: User; accessToken: string }> {
  const body: Record<string, unknown> = { id_token: idToken };
  if (email) body.email = email;
  if (fullName) body.full_name = fullName;
  body.device_type = 'web';

  const response = await fetchWithLogging(`${API_BASE_URL}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  await checkRateLimit(response);

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Sign in failed: ${response.status}`);
  }

  const data = await response.json();
  const user: User = {
    id: String(data.id),
    username: data.username || null,
    hasCompletedAssessment: data.has_completed_assessment || false,
    cefrLevel: data.cefr_level || null,
    appleUserId: null,
    googleUserId: null,
    email: data.email || email || null,
    familiarLanguage: data.familiar_language || null,
    targetLanguage: data.target_language || null,
    deviceToken: data.device_token || null,
    hasPremium: data.has_premium || false,
  };

  return { user, accessToken: data.access_token };
}

export async function signInWithApple(idToken: string, email?: string, fullName?: string): Promise<{ user: User; accessToken: string }> {
  const body: Record<string, unknown> = { id_token: idToken };
  if (email) body.email = email;
  if (fullName) body.full_name = fullName;
  body.device_type = 'web';

  const response = await fetchWithLogging(`${API_BASE_URL}/auth/apple`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  await checkRateLimit(response);

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Sign in failed: ${response.status}`);
  }

  const data = await response.json();
  const user: User = {
    id: String(data.id),
    username: data.username || null,
    hasCompletedAssessment: data.has_completed_assessment || false,
    cefrLevel: data.cefr_level || null,
    appleUserId: null,
    googleUserId: null,
    email: data.email || email || null,
    familiarLanguage: data.familiar_language || null,
    targetLanguage: data.target_language || null,
    deviceToken: data.device_token || null,
    hasPremium: data.has_premium || false,
  };

  return { user, accessToken: data.access_token };
}

export async function updateLanguage(userId: string, familiarLanguage?: string, targetLanguage?: string): Promise<User> {
  const body: Record<string, unknown> = { user_id: userId };
  if (familiarLanguage) body.familiar_language = familiarLanguage;
  if (targetLanguage) body.target_language = targetLanguage;

  const response = await fetchWithLogging(`${API_BASE_URL}/auth/update-language`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  await checkForExpiredToken(response);

  if (!response.ok) throw new Error(`Failed to update language: ${response.status}`);

  const data = await response.json();
  const savedUser = getSavedUser();
  if (!savedUser) throw new Error('No saved user');

  const updatedUser: User = {
    ...savedUser,
    familiarLanguage: data.familiar_language || familiarLanguage || savedUser.familiarLanguage,
    targetLanguage: data.target_language || targetLanguage || savedUser.targetLanguage,
  };

  saveUser(updatedUser);
  return updatedUser;
}

export async function updateCefrLevel(userId: string, cefrLevel: string): Promise<User> {
  const response = await fetchWithLogging(`${API_BASE_URL}/auth/update-cefr-level`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ user_id: userId, cefr_level: cefrLevel }),
  });

  await checkForExpiredToken(response);

  if (!response.ok) throw new Error(`Failed to update CEFR level: ${response.status}`);

  const savedUser = getSavedUser();
  if (!savedUser) throw new Error('No saved user');

  const updatedUser: User = { ...savedUser, cefrLevel };
  saveUser(updatedUser);
  return updatedUser;
}

export async function deleteAccount(): Promise<{ success: boolean; message?: string; error?: string }> {
  const response = await fetchWithLogging(`${API_BASE_URL}/auth/delete-account`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  await checkRateLimit(response);
  const data = await response.json();

  if (response.ok) {
    return { success: true, message: data.message || 'Account deleted successfully' };
  }
  return { success: false, error: data.error || 'Failed to delete account' };
}

// ========= LANGUAGES =========

export async function getTargetLanguages(): Promise<TargetLanguage[]> {
  const response = await fetchWithLogging(`${API_BASE_URL}/languages/target-languages`, {
    headers: getHeaders(false),
  });

  if (!response.ok) return [];

  const data = await response.json();
  return (data.target_languages || []) as TargetLanguage[];
}

// ========= ARTICLES =========

function getTimeSince(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffDays > 0) return `${diffDays} d`;
  if (diffHours > 0) return `${diffHours} h`;
  if (diffMinutes > 0) return `${diffMinutes} min`;
  return 'just now';
}

export async function getArticles(options?: { topic?: string; subtopic?: string; sinceId?: string }): Promise<ArticlesResponse> {
  const body: Record<string, unknown> = {};
  if (options?.topic && options.topic !== 'all') body.topic = options.topic;
  if (options?.subtopic) body.subtopic = options.subtopic;
  if (options?.sinceId) body.since_id = options.sinceId;

  const response = await fetchWithLogging(`${API_BASE_URL}/articles/article-summaries`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
    priority: 'high',
  } as RequestInit);

  await checkForExpiredToken(response);
  await checkRateLimit(response);

  if (!response.ok) throw new Error(`Failed to fetch articles: ${response.status}`);

  const data = await response.json();
  const translationsMap = data.translations_map || {};
  const articlesJson = data.articles || [];

  const articles: Article[] = articlesJson.map((item: Record<string, unknown>) => {
    const article: Article = {
      articleId: String(item.article_id || ''),
      headline: String(item.headline || ''),
      headlineFamiliar: String(item.headline_familiar || ''),
      cefrLevelHeadline: item.cefr_level_headline ? String(item.cefr_level_headline) : null,
      topic: String(item.topic || ''),
      subtopic: item.subtopic ? String(item.subtopic) : null,
      geography: item.geography ? String(item.geography) : null,
      imageLinks: Array.isArray(item.image_links)
        ? item.image_links as string[]
        : typeof item.image_links === 'string'
          ? [item.image_links]
          : item.image_link
            ? [String(item.image_link)]
            : item.image_url
              ? [String(item.image_url)]
              : [],
      createdAt: item.created_at ? String(item.created_at) : null,
      publishedDate: null,
      hoursSinceMostRecent: null,
      content: item.content ? String(item.content) : null,
      read: Boolean(item.read),
      contentGenerated: Boolean(item.content_generated),
      audioGenerated: Boolean(item.audio_generated),
      audioUrl: item.audio_url ? String(item.audio_url) : null,
      contentId: item.content_id != null ? String(item.content_id) : null,
      position: typeof item.position === 'number' ? item.position : null,
    };

    if (article.createdAt) {
      const date = new Date(article.createdAt);
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      article.publishedDate = `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}, ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
      article.hoursSinceMostRecent = getTimeSince(article.createdAt);
    }

    return article;
  });

  // Sort: positioned articles first (ascending), then by created_at descending
  articles.sort((a, b) => {
    if (a.position !== null && b.position === null) return -1;
    if (a.position === null && b.position !== null) return 1;
    if (a.position !== null && b.position !== null) {
      const cmp = a.position - b.position;
      if (cmp !== 0) return cmp;
    }
    if (a.createdAt && b.createdAt) {
      const cmp = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (cmp !== 0) return cmp;
    }
    return a.articleId.localeCompare(b.articleId);
  });

  return {
    articles,
    topicMap: (translationsMap.topics || {}) as Record<string, string>,
    subtopicMap: (translationsMap.subtopics || {}) as Record<string, string>,
    geographyMap: (translationsMap.geography || {}) as Record<string, string>,
    allTranslation: String(translationsMap.all ?? ''),
    readMoreTranslation: String(translationsMap.read_more ?? ''),
  };
}

export async function getArticleContent(articleId: string): Promise<{ content: string; contentId?: string; articleViewId?: number; error?: boolean }> {
  const response = await fetchWithLogging(`${API_BASE_URL}/articles/content/${articleId}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({}),
  });

  await checkForExpiredToken(response);
  await checkRateLimit(response);

  if (!response.ok) {
    return { content: 'Sorry, we could not load the full content for this article.', error: true };
  }

  const data = await response.json();
  if (data.content) {
    let articleViewId: number | undefined;
    if (data.article_view_id != null) {
      articleViewId = typeof data.article_view_id === 'number' ? data.article_view_id : parseInt(data.article_view_id, 10);
    }
    const contentId = data.content_id != null ? String(data.content_id) : undefined;
    return { content: data.content, contentId, articleViewId };
  }
  return { content: data.error || 'Failed to load article content.', error: true };
}

// ========= ARTICLE AUDIO =========

export type AudioFetchStatus = 'ready' | 'preparing' | 'not_found';

/**
 * Fetch the signed URL for an article's audio.
 *
 * HTTP 200 → audio ready (this call counts as one listen against the user's daily audio allowance)
 * HTTP 202 → audio is currently being generated; poll again shortly
 * HTTP 404 → audio has not been generated yet; call generateArticleAudio first
 *
 * The returned signed URL is valid for 15 minutes.
 */
export async function getArticleAudio(contentId: string): Promise<{ status: AudioFetchStatus; audioUrl?: string }> {
  const response = await fetchWithLogging(`${API_BASE_URL}/articles/content/${contentId}/audio`, {
    method: 'GET',
    headers: getHeaders(),
  });

  await checkForExpiredToken(response);
  await checkRateLimit(response);

  if (response.status === 200) {
    const data = await response.json().catch(() => ({}));
    const audioUrl = typeof data.audio_url === 'string' ? data.audio_url : undefined;
    return { status: 'ready', audioUrl };
  }

  if (response.status === 202) {
    return { status: 'preparing' };
  }

  if (response.status === 404) {
    return { status: 'not_found' };
  }

  throw new Error(`Failed to fetch article audio: ${response.status}`);
}

export type AudioGenerateStatus = 'created' | 'exists' | 'preparing';

/**
 * Request generation of TTS audio for an article content.
 *
 * HTTP 201 → audio was generated on this call
 * HTTP 200 → audio already existed
 * HTTP 202 → generation is already in progress (concurrent request)
 *
 * This call does not itself consume a listen; only a successful GET /audio (HTTP 200)
 * that returns a signed URL counts against the daily audio allowance.
 */
export async function generateArticleAudio(contentId: string): Promise<{ status: AudioGenerateStatus }> {
  const response = await fetchWithLogging(`${API_BASE_URL}/articles/content/${contentId}/audio`, {
    method: 'POST',
    headers: getHeaders(),
  });

  await checkForExpiredToken(response);
  await checkRateLimit(response);

  if (response.status === 201) return { status: 'created' };
  if (response.status === 200) return { status: 'exists' };
  if (response.status === 202) return { status: 'preparing' };

  const err = await response.json().catch(() => ({}));
  throw new Error(err.error || `Failed to generate article audio: ${response.status}`);
}

// ========= GUEST HELPERS =========

async function checkGuestQuota(response: Response): Promise<void> {
  if (response.status === 429) {
    const body = await response.json().catch(() => ({}));
    if (body.used !== undefined && body.limit !== undefined) {
      throw new GuestQuotaError(
        body.error || 'Daily limit reached',
        body.used,
        body.limit,
        body.detail || 'Sign up for unlimited access!'
      );
    }
    const retryAfter = body.retry_after
      ?? parseInt(response.headers.get('Retry-After') || '60', 10);
    throw new RateLimitError(typeof retryAfter === 'number' ? retryAfter : parseInt(retryAfter, 10) || 60);
  }
}

function getGuestHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json' };
}

// ========= GUEST ARTICLES =========

export async function getGuestArticles(options?: { maxArticles?: number; sinceId?: string; targetLanguage?: string; familiarLanguage?: string; cefrLevel?: string }): Promise<ArticlesResponse> {
  const body: Record<string, unknown> = {};
  if (options?.maxArticles) body.max_articles = options.maxArticles;
  if (options?.sinceId) body.since_id = options.sinceId;
  if (options?.targetLanguage) body.target_language = options.targetLanguage;
  if (options?.familiarLanguage) body.familiar_language = options.familiarLanguage;
  if (options?.cefrLevel) body.cefr_level = options.cefrLevel;

  const response = await fetchWithLogging(`${API_BASE_URL}/articles/guest/article-summaries`, {
    method: 'POST',
    headers: getGuestHeaders(),
    credentials: 'include',
    body: JSON.stringify(body),
    priority: 'high',
  } as RequestInit);

  await checkGuestQuota(response);

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch guest articles: ${response.status}`);
  }

  const data = await response.json();
  const translationsMap = data.translations_map || {};
  const articlesJson = data.articles || [];

  const articles: Article[] = articlesJson.map((item: Record<string, unknown>) => {
    const article: Article = {
      articleId: String(item.article_id || ''),
      headline: String(item.headline || ''),
      headlineFamiliar: String(item.headline_familiar || ''),
      cefrLevelHeadline: item.cefr_level_headline ? String(item.cefr_level_headline) : null,
      topic: String(item.topic || ''),
      subtopic: item.subtopic ? String(item.subtopic) : null,
      geography: item.geography ? String(item.geography) : null,
      imageLinks: Array.isArray(item.image_links)
        ? item.image_links as string[]
        : typeof item.image_links === 'string'
          ? [item.image_links]
          : item.image_link
            ? [String(item.image_link)]
            : item.image_url
              ? [String(item.image_url)]
              : [],
      createdAt: item.created_at ? String(item.created_at) : null,
      publishedDate: null,
      hoursSinceMostRecent: null,
      content: item.content ? String(item.content) : null,
      read: false,
      contentGenerated: Boolean(item.content_generated),
      audioGenerated: Boolean(item.audio_generated),
      audioUrl: item.audio_url ? String(item.audio_url) : null,
      contentId: item.content_id != null ? String(item.content_id) : null,
      position: typeof item.position === 'number' ? item.position : null,
    };

    if (article.createdAt) {
      const date = new Date(article.createdAt);
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      article.publishedDate = `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}, ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
      article.hoursSinceMostRecent = getTimeSince(article.createdAt);
    }

    return article;
  });

  articles.sort((a, b) => {
    if (a.position !== null && b.position === null) return -1;
    if (a.position === null && b.position !== null) return 1;
    if (a.position !== null && b.position !== null) {
      const cmp = a.position - b.position;
      if (cmp !== 0) return cmp;
    }
    if (a.createdAt && b.createdAt) {
      const cmp = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (cmp !== 0) return cmp;
    }
    return a.articleId.localeCompare(b.articleId);
  });

  return {
    articles,
    topicMap: (translationsMap.topics || {}) as Record<string, string>,
    subtopicMap: (translationsMap.subtopics || {}) as Record<string, string>,
    geographyMap: (translationsMap.geography || {}) as Record<string, string>,
    allTranslation: String(translationsMap.all ?? ''),
    readMoreTranslation: String(translationsMap.read_more ?? ''),
  };
}

export async function getGuestArticleContent(articleId: string, targetLanguage?: string, cefrLevel?: string): Promise<{ content: string; error?: boolean }> {
  const body: Record<string, unknown> = {};
  if (targetLanguage) body.target_language = targetLanguage;
  if (cefrLevel) body.cefr_level = cefrLevel;

  const response = await fetchWithLogging(`${API_BASE_URL}/articles/guest/content/${articleId}`, {
    method: 'POST',
    headers: getGuestHeaders(),
    credentials: 'include',
    body: JSON.stringify(body),
  });

  await checkGuestQuota(response);

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch guest article content: ${response.status}`);
  }

  const data = await response.json();
  if (data.content) {
    return { content: data.content };
  }
  return { content: data.error || 'Failed to load article content.', error: true };
}

// ========= GUEST TRANSLATIONS =========

export async function getGuestTranslation(
  words: string,
  context: string,
  extendedContext?: string,
  targetLanguage?: string,
  familiarLanguage?: string
): Promise<Translation> {
  const body: Record<string, unknown> = { words, context };
  if (extendedContext) body.extended_context = extendedContext;
  if (targetLanguage) body.target_language = targetLanguage;
  if (familiarLanguage) body.familiar_language = familiarLanguage;

  const response = await fetchWithLogging(`${API_BASE_URL}/translations/guest`, {
    method: 'POST',
    headers: getGuestHeaders(),
    credentials: 'include',
    body: JSON.stringify(body),
  });

  await checkGuestQuota(response);

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Failed to get guest translation: ${response.status}`);
  }

  const data = await response.json();
  const item = Array.isArray(data) ? data[0] : data;
  if (item && item.familiar_word && item.explanation) {
    return {
      text: item.familiar_word,
      explanation: item.explanation,
      id: 0,
      status: item.status || null,
      grammar_notes: Array.isArray(item.grammar_notes)
        ? item.grammar_notes.map((n: Record<string, unknown>) => ({
            label: String(n.label || ''),
            title: String(n.title || ''),
            source_word: String(n.source_word || ''),
            why: String(n.why || ''),
          }))
        : [],
    };
  }

  throw new Error('Invalid translation response');
}

// ========= GUEST PRACTICE =========

export async function getGuestArticleQuestions(
  articleId: string,
  numQuestions?: number,
  targetLanguage?: string,
  familiarLanguage?: string,
  cefrLevel?: string
): Promise<PracticeQuestion[]> {
  const body: Record<string, unknown> = {
    article_id: parseInt(articleId, 10),
    num_questions: numQuestions || 6,
  };
  if (targetLanguage) body.target_language = targetLanguage;
  if (familiarLanguage) body.familiar_language = familiarLanguage;
  if (cefrLevel) body.cefr_level = cefrLevel;

  const response = await fetchWithLogging(`${API_BASE_URL}/practice/guest/article-questions`, {
    method: 'POST',
    headers: getGuestHeaders(),
    credentials: 'include',
    body: JSON.stringify(body),
  });

  await checkGuestQuota(response);

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch guest article questions: ${response.status}`);
  }

  const data = await response.json();
  const questionsData = Array.isArray(data) ? data : data.questions || [];
  return questionsData.map(parsePracticeQuestion);
}

// ========= TRANSLATIONS =========

export async function getTranslation(words: string, context: string, extendedContext?: string): Promise<Translation> {
  const body: Record<string, unknown> = { words, context };
  if (extendedContext) body.extended_context = extendedContext;

  const response = await fetchWithLogging(`${API_BASE_URL}/translations/`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  await checkForExpiredToken(response);
  await checkRateLimit(response);

  if (!response.ok) throw new Error(`Failed to get translation: ${response.status}`);

  const data = await response.json();

  // Handle array response
  const item = Array.isArray(data) ? data[0] : data;
  if (item && item.familiar_word && item.explanation) {
    return {
      text: item.familiar_word,
      explanation: item.explanation,
      id: item.id || 0,
      status: item.status || null,
      grammar_notes: Array.isArray(item.grammar_notes)
        ? item.grammar_notes.map((n: Record<string, unknown>) => ({
            label: String(n.label || ''),
            title: String(n.title || ''),
            source_word: String(n.source_word || ''),
            why: String(n.why || ''),
          }))
        : [],
    };
  }

  throw new Error('Invalid translation response');
}

export async function rateTranslation(translationId: number, feedback: string): Promise<void> {
  const response = await fetchWithLogging(`${API_BASE_URL}/translations/rate`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ translation_id: translationId, feedback }),
  });

  if (!response.ok) throw new Error('Failed to rate translation');
}

// ========= PRACTICE =========

export async function getPracticeQuestion(questionType?: string): Promise<PracticeQuestion> {
  const body: Record<string, unknown> = {};
  if (questionType) body.question_type = questionType;

  const response = await fetchWithLogging(`${API_BASE_URL}/practice/fetch-question`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  await checkForExpiredToken(response);
  await checkRateLimit(response);

  const data = await response.json();

  if (data.error === 'No practice questions available') {
    const reason = data.reason === 'no_unsure_words' ? 'no_unsure_words'
      : data.reason === 'all_words_mastered' ? 'all_words_mastered'
      : 'unknown';
    throw new NoPracticeQuestionsError(data.detail || 'No practice questions available', reason);
  }

  if (!response.ok) throw new Error(`Failed to fetch practice question: ${response.status}`);

  return parsePracticeQuestion(data);
}

export async function submitPracticeAnswer(practiceQuestionId: number, isCorrect: boolean, unsureWordId?: number): Promise<void> {
  const body: Record<string, unknown> = {
    practice_question_id: practiceQuestionId,
    is_correct: isCorrect,
  };
  if (unsureWordId && unsureWordId > 0) body.unsure_word_id = unsureWordId;

  const response = await fetchWithLogging(`${API_BASE_URL}/practice/submit`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error(`Failed to submit answer: ${response.status}`);
}

export async function getArticleQuestions(articleId: string, articleViewId?: number): Promise<PracticeQuestion[]> {
  const body: Record<string, unknown> = {
    article_id: parseInt(articleId, 10),
    num_questions: 6,
    question_type: 'fill_in_the_blank',
  };
  if (articleViewId) body.article_view_id = articleViewId;

  const response = await fetchWithLogging(`${API_BASE_URL}/practice/article-questions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  await checkForExpiredToken(response);
  await checkRateLimit(response);

  if (!response.ok) throw new Error(`Failed to fetch article questions: ${response.status}`);

  const data = await response.json();
  const questionsData = Array.isArray(data) ? data : data.questions || [];
  return questionsData.map(parsePracticeQuestion);
}

export async function ratePracticeQuestion(practiceQuestionId: number, feedback: string): Promise<void> {
  const response = await fetchWithLogging(`${API_BASE_URL}/practice/rate`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ practice_question_id: practiceQuestionId, feedback }),
  });

  if (!response.ok) throw new Error('Failed to rate practice question');
}

// ========= ASSESSMENT =========

export async function startAssessment(): Promise<{ assessmentId: number; questionNumber: number; question: AssessmentQuestion }> {
  const response = await fetchWithLogging(`${API_BASE_URL}/assessments/start`, {
    method: 'POST',
    headers: getHeaders(),
  });

  await checkForExpiredToken(response);
  await checkRateLimit(response);

  if (!response.ok) throw new Error(`Failed to start assessment: ${response.status}`);

  const data = await response.json();
  return {
    assessmentId: data.assessment_id,
    questionNumber: data.question_number || 1,
    question: parseAssessmentQuestion(data.question, data.question_number),
  };
}

export async function submitAssessmentAnswer(assessmentId: number, answerIndex: number): Promise<{
  complete: boolean;
  summary?: AssessmentSummary;
  questionNumber?: number;
  question?: AssessmentQuestion;
  wasCorrect?: boolean;
  correctIndex?: number;
  explanation?: string;
}> {
  const response = await fetchWithLogging(`${API_BASE_URL}/assessments/answer`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ assessment_id: assessmentId, answer_index: answerIndex }),
  });

  await checkForExpiredToken(response);
  await checkRateLimit(response);

  if (!response.ok) throw new Error(`Failed to submit answer: ${response.status}`);

  const data = await response.json();

  if (data.complete) {
    const statsPayload = data.stats && typeof data.stats === 'object' ? (data.stats as Record<string, unknown>) : null;
    const totalQuestions = Number(statsPayload?.total_questions ?? data.total_questions) || 0;
    const correct = Number(statsPayload?.correct ?? data.correct) || 0;
    const justification = String(data.summary ?? data.justification ?? '');

    return {
      complete: true,
      summary: {
        cefrLevel: data.final_level,
        justification,
        stats: { totalQuestions, correct },
        history: data.history || [],
      },
    };
  }

  return {
    complete: false,
    questionNumber: data.question_number || 1,
    question: parseAssessmentQuestion(data.question, data.question_number),
    wasCorrect: data.was_correct,
    correctIndex: data.correct_index,
    explanation: data.explanation,
  };
}

export async function cancelAssessment(assessmentId: number): Promise<void> {
  const response = await fetchWithLogging(`${API_BASE_URL}/assessments/cancel`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ assessment_id: assessmentId }),
  });

  if (!response.ok) throw new Error('Failed to cancel assessment');
}

// ========= STATISTICS =========

import type { StatsTimeframe, QuestionStatsResponse, MasteredWordsStatsResponse, ArticleStatsResponse } from '@/types/stats';

export async function getQuestionStats(timeframe: StatsTimeframe = 'weekly'): Promise<QuestionStatsResponse> {
  const response = await fetchWithLogging(`${API_BASE_URL}/stats/questions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ timeframe }),
  });

  await checkForExpiredToken(response);
  await checkRateLimit(response);
  if (!response.ok) throw new Error('Failed to fetch question stats');
  return response.json();
}

export async function getMasteredWordsStats(timeframe: StatsTimeframe = 'weekly'): Promise<MasteredWordsStatsResponse> {
  const response = await fetchWithLogging(`${API_BASE_URL}/stats/mastered-words`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ timeframe }),
  });

  await checkForExpiredToken(response);
  await checkRateLimit(response);
  if (!response.ok) throw new Error('Failed to fetch mastered words stats');
  return response.json();
}

export async function getArticleStats(timeframe: StatsTimeframe = 'weekly'): Promise<ArticleStatsResponse> {
  const response = await fetchWithLogging(`${API_BASE_URL}/stats/articles`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ timeframe }),
  });

  await checkForExpiredToken(response);
  await checkRateLimit(response);
  if (!response.ok) throw new Error('Failed to fetch article stats');
  return response.json();
}

// ========= SUBSCRIPTIONS =========

export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  const response = await fetchWithLogging(`${API_BASE_URL}/subscriptions/status`, {
    headers: getHeaders(),
  });

  await checkForExpiredToken(response);
  await checkRateLimit(response);
  if (!response.ok) throw new Error('Failed to fetch subscription status');
  return response.json();
}

export async function createCheckoutSession(priceId?: string): Promise<{ checkout_url: string }> {
  const body: Record<string, unknown> = {};
  if (priceId) body.price_id = priceId;

  const response = await fetchWithLogging(`${API_BASE_URL}/subscriptions/create-checkout-session`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  await checkForExpiredToken(response);
  await checkRateLimit(response);

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create checkout session');
  }

  return response.json();
}

export async function cancelSubscription(): Promise<CancelSubscriptionResponse> {
  const response = await fetchWithLogging(`${API_BASE_URL}/subscriptions/cancel`, {
    method: 'POST',
    headers: getHeaders(),
  });

  await checkForExpiredToken(response);
  await checkRateLimit(response);

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.code || err.error || 'Failed to cancel subscription');
  }

  return response.json();
}

// ========= REFERRALS =========

export async function getReferralCode(): Promise<ReferralInfo> {
  const response = await fetchWithLogging(`${API_BASE_URL}/referrals/my-code`, {
    headers: getHeaders(),
  });

  await checkForExpiredToken(response);
  await checkRateLimit(response);
  if (!response.ok) throw new Error('Failed to fetch referral code');
  return response.json();
}

export async function applyReferralCode(code: string): Promise<ReferralApplyResponse> {
  const response = await fetchWithLogging(`${API_BASE_URL}/referrals/apply`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ code }),
  });

  await checkForExpiredToken(response);
  await checkRateLimit(response);

  const data = await response.json();

  if (!response.ok) {
    return { status: 'error', message: data.message || 'Failed to apply referral code' };
  }

  return data as ReferralApplyResponse;
}

// ========= HELPERS =========

function parsePracticeQuestion(data: Record<string, unknown>): PracticeQuestion {
  const answerChoices = Array.isArray(data.answer_choices)
    ? data.answer_choices.map((c: Record<string, unknown>) => ({
        text: String(c.target_lang || ''),
        textFamiliar: String(c.familiar_lang || ''),
      }))
    : [];

  const feedbackData = (data.feedback || {}) as Record<string, unknown>;

  const wordPairs = Array.isArray(data.word_pairs)
    ? data.word_pairs.map((wp: Record<string, unknown>) => ({
        target: String(wp.target || ''),
        familiar: String(wp.familiar || ''),
      }))
    : [];

  return {
    question: String(data.question || ''),
    questionFamiliar: String(data.question_familiar || ''),
    questionComplete: String(data.question_complete || ''),
    questionCompleteFamiliar: String(data.question_complete_familiar || ''),
    answerChoices,
    correctAnswer: String(data.correct_answer || ''),
    feedback: {
      correct: String(feedbackData.correct || ''),
      correctFamiliar: String(feedbackData.correct_familiar || ''),
      incorrect: String(feedbackData.incorrect || ''),
      incorrectFamiliar: String(feedbackData.incorrect_familiar || ''),
    },
    unsureWordId: Number(data.unsure_word_id) || 0,
    practiceQuestionId: Number(data.practice_question_id) || 0,
    questionType: data.question_type === 'pairs' ? 'pairs' : 'fill_in_the_blank',
    wordPairs,
    correctStreak: Number(data.correct_streak) || 0,
    willMaster: data.will_master === true,
  };
}

function parseAssessmentQuestion(data: Record<string, unknown>, questionNumber?: number): AssessmentQuestion {
  const text = data.text ?? data.question;
  return {
    question: String(text ?? ''),
    options: Array.isArray(data.options) ? data.options.map(String) : [],
    level: String(data.level || ''),
    questionNumber: questionNumber || Number(data.question_number) || 1,
  };
}

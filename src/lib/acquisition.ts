/**
 * First-touch marketing and campaign acquisition attribution helper for Reetle Web.
 *
 * Captures UTM parameters, click IDs (fbclid, gclid, etc.), landing paths, and
 * originating article IDs from query parameters on initial arrival and stores
 * them in localStorage so they can be forwarded on user sign-up (Google / Apple SSO).
 */

export interface AcquisitionData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  landing_path?: string;
  article_id?: number;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

const STORAGE_KEY = 'reetle_acquisition';

/**
 * Extract acquisition parameters from URL and save as first-touch attribution.
 *
 * @param customLandingPath Optional path override (e.g. before redirecting from /fo/[id])
 * @param customSearch Optional search string override (defaults to window.location.search)
 * @returns The captured acquisition object, or null if no parameters found.
 */
export function captureAcquisitionFromUrl(
  customLandingPath?: string,
  customSearch?: string
): AcquisitionData | null {
  if (typeof window === 'undefined') return null;

  try {
    const search = customSearch !== undefined ? customSearch : window.location.search;
    const params = new URLSearchParams(search);
    const landingParam = params.get('landing_path')?.trim();
    const path = customLandingPath || landingParam || window.location.pathname;

    if (!search && !customLandingPath) {
      return getStoredAcquisition();
    }

    const utm_source = params.get('utm_source')?.trim();
    const utm_medium = params.get('utm_medium')?.trim();
    const utm_campaign = params.get('utm_campaign')?.trim();
    const utm_content = params.get('utm_content')?.trim();
    const utm_term = params.get('utm_term')?.trim();
    const fbclid = params.get('fbclid')?.trim();

    const rawArticle = params.get('article') || params.get('article_id');
    const articleIdNum = rawArticle ? parseInt(rawArticle, 10) : NaN;
    const article_id = Number.isFinite(articleIdNum) && articleIdNum > 0 ? articleIdNum : undefined;

    // Check if any marketing or tracking parameters are present
    const hasMarketingParams = Boolean(
      utm_source ||
      utm_medium ||
      utm_campaign ||
      utm_content ||
      utm_term ||
      fbclid ||
      article_id
    );

    if (!hasMarketingParams) {
      return getStoredAcquisition();
    }

    // First-touch attribution: do not overwrite an existing attribution record
    const existing = getStoredAcquisition();
    if (existing && Object.keys(existing).length > 0) {
      return existing;
    }

    const data: AcquisitionData = {};
    if (utm_source) data.utm_source = utm_source;
    if (utm_medium) data.utm_medium = utm_medium;
    if (utm_campaign) data.utm_campaign = utm_campaign;
    if (utm_content) data.utm_content = utm_content;
    if (utm_term) data.utm_term = utm_term;
    if (fbclid) data.fbclid = fbclid;
    if (path) data.landing_path = path;
    if (article_id) data.article_id = article_id;

    // Collect any extra tracking params (e.g. gclid, custom tags) into metadata
    const standardKeys = new Set([
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_content',
      'utm_term',
      'fbclid',
      'article',
      'article_id',
      'landing_path',
    ]);
    const extraMetadata: Record<string, string> = {};
    params.forEach((value, key) => {
      if (!standardKeys.has(key) && key.startsWith('utm_') || key === 'gclid' || key === 'ttclid') {
        extraMetadata[key] = value;
      }
    });
    if (Object.keys(extraMetadata).length > 0) {
      data.metadata = extraMetadata;
    }

    saveAcquisition(data);
    return data;
  } catch (err) {
    console.warn('Failed to capture acquisition params:', err);
    return null;
  }
}

/**
 * Get stored first-touch acquisition data from localStorage.
 */
export function getStoredAcquisition(): AcquisitionData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Save acquisition data directly to localStorage.
 */
export function saveAcquisition(data: AcquisitionData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Failed to save acquisition data to localStorage:', err);
  }
}

/**
 * Clear stored acquisition data (e.g. after successful registration).
 */
export function clearStoredAcquisition(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

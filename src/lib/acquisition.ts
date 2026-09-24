/**
 * First-touch marketing and campaign acquisition attribution helper for Reetle Web.
 *
 * Captures UTM parameters, click IDs (fbclid, gclid, etc.), landing paths, and
 * originating article IDs from query parameters on initial arrival, saves them
 * to localStorage, synchronises the landing session with the API, and forwards
 * attribution on user sign-up (Google / Apple SSO).
 */

import { API_BASE_URL } from '@/config/environment';

export interface AcquisitionData {
  session_id?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  landing_path?: string;
  article_id?: number;
  test_event_code?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

const STORAGE_KEY = 'reetle_acquisition';
const SESSION_STORAGE_KEY = 'reetle_session_id';

/**
 * Read a cookie by name.
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

const inFlightSyncs = new Set<string>();

/**
 * Apply a redirect link's default UTMs only when the incoming URL carries none,
 * so tagged links (e.g. paid ads) keep their own attribution unmixed.
 */
export function applyDefaultUtms(params: URLSearchParams, defaults: Record<string, string>): void {
  const hasUtm = Array.from(params.keys()).some((key) => key.startsWith('utm_'));
  if (hasUtm) return;
  for (const [key, value] of Object.entries(defaults)) {
    params.set(key, value);
  }
}

/**
 * Retrieve or create a persistent anonymous session ID.
 */
export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!sessionId) {
      const randomPart =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID().replace(/-/g, '').substring(0, 16)
          : Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      sessionId = `sess_${randomPart}`;
      localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    }
    return sessionId;
  } catch {
    return 'sess_fallback';
  }
}

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
    const sessionId = getOrCreateSessionId();
    const search = customSearch !== undefined ? customSearch : window.location.search;
    const params = new URLSearchParams(search);
    const landingParam = params.get('landing_path')?.trim();
    const path = customLandingPath || landingParam || window.location.pathname;

    const utm_source = params.get('utm_source')?.trim();
    const utm_medium = params.get('utm_medium')?.trim();
    const utm_campaign = params.get('utm_campaign')?.trim();
    const utm_content = params.get('utm_content')?.trim();
    const utm_term = params.get('utm_term')?.trim();
    const fbclid = params.get('fbclid')?.trim();
    const gclid = params.get('gclid')?.trim();
    const gbraid = params.get('gbraid')?.trim();
    const wbraid = params.get('wbraid')?.trim();
    const test_event_code = params.get('test_event_code')?.trim();

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
      gclid ||
      gbraid ||
      wbraid ||
      test_event_code ||
      article_id
    );

    // First-touch attribution: do not overwrite an existing attribution record
    const existing = getStoredAcquisition();
    if (existing && Object.keys(existing).length > 0) {
      if (!existing.session_id) {
        existing.session_id = sessionId;
      }
      if (test_event_code && !existing.test_event_code) {
        existing.test_event_code = test_event_code;
      }
      saveAcquisition(existing);
      return existing;
    }

    if (!hasMarketingParams && !search && !customLandingPath) {
      return null;
    }

    const data: AcquisitionData = {
      session_id: sessionId,
    };
    if (utm_source) data.utm_source = utm_source;
    if (utm_medium) data.utm_medium = utm_medium;
    if (utm_campaign) data.utm_campaign = utm_campaign;
    if (utm_content) data.utm_content = utm_content;
    if (utm_term) data.utm_term = utm_term;
    if (fbclid) data.fbclid = fbclid;
    if (gclid) data.gclid = gclid;
    if (gbraid) data.gbraid = gbraid;
    if (wbraid) data.wbraid = wbraid;
    if (path) data.landing_path = path;
    if (article_id) data.article_id = article_id;
    if (test_event_code) data.test_event_code = test_event_code;

    // Collect cookie match keys and custom parameters into metadata
    const standardKeys = new Set([
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_content',
      'utm_term',
      'fbclid',
      'gclid',
      'gbraid',
      'wbraid',
      'article',
      'article_id',
      'landing_path',
      'test_event_code',
    ]);
    const extraMetadata: Record<string, unknown> = {};
    const fbp = getCookie('_fbp');
    const fbc = getCookie('_fbc');
    if (fbp) extraMetadata._fbp = fbp;
    if (fbc) extraMetadata._fbc = fbc;

    params.forEach((value, key) => {
      if (!standardKeys.has(key) && (key.startsWith('utm_') || key === 'ttclid' || key === 'msclkid')) {
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
 * Sync the current landing session to POST /api/tracking/session.
 */
export async function syncAcquisitionSession(overrideData?: AcquisitionData): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const sessionId = getOrCreateSessionId();
    const stored = getStoredAcquisition() || {};
    const data = overrideData || stored;

    const fbp = getCookie('_fbp');
    const fbc = getCookie('_fbc');
    const metadata: Record<string, unknown> = {
      ...(data.metadata || {}),
    };
    if (fbp && !metadata._fbp) metadata._fbp = fbp;
    if (fbc && !metadata._fbc) metadata._fbc = fbc;
    if (data.test_event_code && !metadata.test_event_code) {
      metadata.test_event_code = data.test_event_code;
    }

    const payload: Record<string, unknown> = {
      session_id: sessionId,
      utm_source: data.utm_source,
      utm_medium: data.utm_medium,
      utm_campaign: data.utm_campaign,
      utm_content: data.utm_content,
      utm_term: data.utm_term,
      fbclid: data.fbclid,
      gclid: data.gclid || (data.metadata?.gclid as string | undefined),
      gbraid: data.gbraid || (data.metadata?.gbraid as string | undefined),
      wbraid: data.wbraid || (data.metadata?.wbraid as string | undefined),
      landing_path: data.landing_path || window.location.pathname,
      referrer: document.referrer || undefined,
      article_id: data.article_id,
      test_event_code: data.test_event_code || (metadata.test_event_code as string | undefined),
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    };

    const syncKey = 'reetle_tracking_synced';
    const lastSynced = sessionStorage.getItem(syncKey);
    const signature = JSON.stringify({
      sessionId,
      fbclid: payload.fbclid,
      gclid: payload.gclid,
      path: payload.landing_path,
      article_id: payload.article_id,
      test_event_code: payload.test_event_code,
    });
    if (lastSynced === signature || inFlightSyncs.has(signature)) {
      return;
    }

    inFlightSyncs.add(signature);
    try {
      await fetch(`${API_BASE_URL}/tracking/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      });
      sessionStorage.setItem(syncKey, signature);
    } finally {
      inFlightSyncs.delete(signature);
    }
  } catch (err) {
    console.debug('Failed to sync acquisition session:', err);
  }
}

/**
 * Record an article/page view to POST /api/tracking/view-content.
 */
export async function recordViewContent(articleId: string | number, path?: string): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const sessionId = getOrCreateSessionId();
    const numericId = typeof articleId === 'number' ? articleId : parseInt(articleId, 10);
    if (!Number.isFinite(numericId)) return;

    const stored = getStoredAcquisition();
    const test_event_code = stored?.test_event_code;

    await fetch(`${API_BASE_URL}/tracking/view-content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        article_id: numericId,
        path: path || window.location.pathname,
        test_event_code: test_event_code || undefined,
      }),
      keepalive: true,
    });
  } catch (err) {
    console.debug('Failed to record ViewContent event:', err);
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

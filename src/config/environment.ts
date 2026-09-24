export const PROD_API_BASE_URL = 'https://reetle-api-production-507485624349.us-central1.run.app/api';

/**
 * Hostnames that serve the live website. On these hosts the production API is
 * always used, whatever the build was configured with, so a build made with
 * `.env.local` (staging API) can never make the live site talk to staging.
 */
export const PRODUCTION_HOSTNAMES = [
  'reetle.co',
  'www.reetle.co',
  'lect-io.web.app',
  'lect-io.firebaseapp.com',
];

/** API URL baked in at build time. Default: production. Override in .env.local (e.g. staging or localhost). */
const BUILD_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || PROD_API_BASE_URL;

function resolveApiBaseUrl(): string {
  if (typeof window !== 'undefined' && PRODUCTION_HOSTNAMES.includes(window.location.hostname)) {
    return PROD_API_BASE_URL;
  }
  return BUILD_API_BASE_URL;
}

export const API_BASE_URL = resolveApiBaseUrl();

/** Host origin for preconnect, rendered at build time from the build's API URL. */
export const API_ORIGIN = new URL(BUILD_API_BASE_URL).origin;

// Google OAuth Client ID — must be configured in Google Cloud Console for web
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

// Apple Sign-In config
export const APPLE_CLIENT_ID = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || '';
export const APPLE_REDIRECT_URI = process.env.NEXT_PUBLIC_APPLE_REDIRECT_URI || '';

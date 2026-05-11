const PROD_URL = 'https://reetle-api-production-507485624349.us-central1.run.app/api';

/** Default: production. Override in .env.local (e.g. staging or localhost). */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || PROD_URL;

/** Host origin for preconnect (same host as API_BASE_URL). */
export const API_ORIGIN = new URL(API_BASE_URL).origin;

// Google OAuth Client ID — must be configured in Google Cloud Console for web
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

// Apple Sign-In config
export const APPLE_CLIENT_ID = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || '';
export const APPLE_REDIRECT_URI = process.env.NEXT_PUBLIC_APPLE_REDIRECT_URI || '';

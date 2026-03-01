const PROD_URL = 'https://reetle-api-production-507485624349.us-central1.run.app/api';

export const API_BASE_URL = PROD_URL;

// Google OAuth Client ID — must be configured in Google Cloud Console for web
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

// Apple Sign-In config
export const APPLE_CLIENT_ID = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || '';
export const APPLE_REDIRECT_URI = process.env.NEXT_PUBLIC_APPLE_REDIRECT_URI || '';

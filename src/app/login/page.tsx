'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { GoogleOAuthProvider, GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { useAuth } from '@/contexts/AuthContext';
import { GOOGLE_CLIENT_ID } from '@/config/environment';

function GoogleSignInButton({ onSuccess, onError, disabled }: { onSuccess: (token: string, email?: string, name?: string) => void; onError: () => void; disabled: boolean }) {
  const handleCredentialResponse = (response: CredentialResponse) => {
    if (response.credential) {
      try {
        const payload = JSON.parse(atob(response.credential.split('.')[1]));
        onSuccess(response.credential, payload.email, payload.name);
      } catch {
        onSuccess(response.credential);
      }
    } else {
      onError();
    }
  };

  return (
    <div className={`relative w-full ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Custom styled button for consistent appearance with Apple button */}
      <div className="flex items-center justify-center gap-[12px] w-full py-[14px] px-[24px] bg-white border border-gray-300 rounded-md text-[16px] font-medium text-gray-700 pointer-events-none select-none">
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Sign in with Google
      </div>
      {/* Invisible Google OAuth button overlay - handles the actual auth flow */}
      <div className="absolute inset-0 overflow-hidden rounded-md cursor-pointer flex items-center justify-center" style={{ opacity: 0.0001 }}>
        <div style={{ transform: 'scale(3)' }}>
          <GoogleLogin
            onSuccess={handleCredentialResponse}
            onError={onError}
            size="large"
            width={400}
            text="signin_with"
            shape="rectangular"
            logo_alignment="left"
          />
        </div>
      </div>
    </div>
  );
}

function AppleSignInButton({ onSuccess, disabled }: { onSuccess: (token: string, email?: string, name?: string) => void; disabled: boolean }) {
  // Apple Sign-In for web requires the Apple JS SDK
  // For now, we show the button but it will need Apple Developer configuration
  const handleClick = () => {
    // Apple Sign-In would be initialized here with AppleID.auth.signIn()
    // This requires configuring Services ID in Apple Developer Console
    alert('Apple Sign-In requires configuration. Please use Google Sign-In for now, or set up Apple Services ID for web.');
    void onSuccess; // suppress unused warning
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className="flex items-center justify-center gap-[12px] w-full py-[14px] px-[24px] bg-black text-white border border-black rounded-md text-[16px] font-medium cursor-pointer transition-all duration-200 hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
        <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-1.55 4.25-3.74 4.25z"/>
      </svg>
      Sign in with Apple
    </button>
  );
}

function LoginContent() {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signInWithGoogle, signInWithApple, isAuthenticated, needsOnboarding } = useAuth();
  const router = useRouter();

  const redirectAfterAuth = useCallback(() => {
    const step = needsOnboarding();
    if (step === 'language') {
      router.replace('/onboarding/language');
    } else if (step === 'level') {
      router.replace('/onboarding/level');
    } else {
      router.replace('/articles');
    }
  }, [needsOnboarding, router]);

  useEffect(() => {
    if (isAuthenticated) {
      redirectAfterAuth();
    }
  }, [isAuthenticated, redirectAfterAuth]);

  const handleGoogleSuccess = async (token: string, email?: string, name?: string) => {
    setIsSigningIn(true);
    setError(null);
    try {
      const success = await signInWithGoogle(token, email, name);
      if (!success) {
        setError('Sign in failed. Please try again.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred during sign in.';
      setError(message);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleAppleSuccess = async (token: string, email?: string, name?: string) => {
    setIsSigningIn(true);
    setError(null);
    try {
      const success = await signInWithApple(token, email, name);
      if (!success) {
        setError('Sign in failed. Please try again.');
      }
    } catch {
      setError('An error occurred during sign in.');
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <section className="py-2xl flex items-center justify-center min-h-[70vh]">
      <div className="max-w-[420px] w-full mx-auto px-md">
        {/* Logo and branding */}
        <div className="text-center mb-xl">
          <div className="flex justify-center mb-lg">
            <Image
              src="/images/AppIcon1024.png"
              alt="Reetle"
              width={72}
              height={72}
              className="rounded-[16px]"
              style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
          </div>
          <h1 className="text-display-md text-primary mb-sm">Welcome to Reetle</h1>
          <p className="text-body-lg text-text-secondary">
            Sign in to start learning languages through reading.
          </p>
        </div>

        {/* Sign-in card */}
        <div className="card hover:transform-none" style={{ animation: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
          <div className="flex flex-col gap-[16px]">
            <GoogleSignInButton
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google sign-in was cancelled or failed.')}
              disabled={isSigningIn}
            />
            <div className="relative flex items-center gap-md">
              <div className="flex-1 h-[1px] bg-border" />
              <span className="text-body-md text-text-secondary text-[12px]">or</span>
              <div className="flex-1 h-[1px] bg-border" />
            </div>
            <AppleSignInButton onSuccess={handleAppleSuccess} disabled={isSigningIn} />
          </div>

          {error && (
            <div className="mt-md p-md bg-incorrect-bg rounded-lg">
              <p className="text-body-md text-incorrect-text text-center">{error}</p>
            </div>
          )}

          {isSigningIn && (
            <div className="mt-md flex items-center justify-center gap-sm">
              <div className="loading-spinner" />
              <p className="text-body-md text-text-secondary">Signing in...</p>
            </div>
          )}
        </div>

        {/* Terms */}
        <p className="text-center text-body-md text-text-secondary mt-lg text-[12px]">
          By signing in, you agree to our{' '}
          <Link href="/terms" className="underline hover:text-primary">Terms of Service</Link>
          {' '}and{' '}
          <Link href="/privacy" className="underline hover:text-primary">Privacy Policy</Link>.
        </p>
      </div>
    </section>
  );
}

export default function LoginPage() {
  // Wrap in GoogleOAuthProvider only if client ID is available
  if (!GOOGLE_CLIENT_ID) {
    return (
      <LoginContentWithoutGoogle />
    );
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <LoginContent />
    </GoogleOAuthProvider>
  );
}

// Fallback when Google Client ID is not configured
function LoginContentWithoutGoogle() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/articles');
    }
  }, [isAuthenticated, router]);

  return (
    <section className="py-2xl flex items-center justify-center min-h-[70vh]">
      <div className="max-w-[420px] w-full mx-auto px-md">
        <div className="text-center mb-xl">
          <div className="flex justify-center mb-lg">
            <Image
              src="/images/AppIcon1024.png"
              alt="Reetle"
              width={72}
              height={72}
              className="rounded-[16px]"
              style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
          </div>
          <h1 className="text-display-md text-primary mb-sm">Welcome to Reetle</h1>
          <p className="text-body-lg text-text-secondary">
            Sign in to start learning languages through reading.
          </p>
        </div>

        <div className="card hover:transform-none" style={{ animation: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
          <div className="flex flex-col gap-[12px]">
            <button
              disabled
              className="flex items-center justify-center gap-[12px] w-full py-[14px] px-[24px] bg-white border border-border rounded-md text-[16px] font-medium text-primary opacity-50 cursor-not-allowed"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </button>
            <button
              disabled
              className="flex items-center justify-center gap-[12px] w-full py-[14px] px-[24px] bg-black text-white border border-black rounded-md text-[16px] font-medium opacity-50 cursor-not-allowed"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-1.55 4.25-3.74 4.25z"/>
              </svg>
              Sign in with Apple
            </button>
          </div>

          <div className="mt-md p-md bg-accent-light rounded-lg">
            <p className="text-body-md text-primary text-center text-[13px]">
              Set <code className="bg-white px-[4px] py-[2px] rounded text-[12px]">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> in your <code className="bg-white px-[4px] py-[2px] rounded text-[12px]">.env.local</code> file to enable sign-in.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

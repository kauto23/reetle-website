'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Script from 'next/script';
import { GoogleOAuthProvider, GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { GOOGLE_CLIENT_ID, APPLE_CLIENT_ID, APPLE_REDIRECT_URI } from '@/config/environment';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (config: {
          clientId: string;
          scope: string;
          redirectURI: string;
          usePopup: boolean;
        }) => void;
        signIn: () => Promise<{
          authorization: { code: string; id_token: string; state?: string };
          user?: { email?: string; name?: { firstName?: string; lastName?: string } };
        }>;
      };
    };
  }
}

const GoogleLogo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const AppleLogo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-1.55 4.25-3.74 4.25z" />
  </svg>
);

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
      {/*
       * Visible button — purely presentational. The real Google OAuth widget
       * is overlaid below at near-zero opacity to capture clicks while we
       * keep a visually consistent button style with Apple sign-in.
       */}
      <div className="flex items-center justify-center gap-3 w-full h-12 px-6 bg-ui-card border border-ui-border rounded-md text-[15px] font-medium text-ui-foreground pointer-events-none select-none shadow-sm">
        <GoogleLogo />
        Continue with Google
      </div>
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

function AppleSignInButton({ onSuccess, onError, disabled }: { onSuccess: (token: string, email?: string, name?: string) => void; onError: (msg: string) => void; disabled: boolean }) {
  const sdkReady = useRef(false);

  const initAppleSDK = () => {
    if (!window.AppleID || !APPLE_CLIENT_ID) return;
    window.AppleID.auth.init({
      clientId: APPLE_CLIENT_ID,
      scope: 'name email',
      redirectURI: APPLE_REDIRECT_URI || window.location.origin,
      usePopup: true,
    });
    sdkReady.current = true;
  };

  const handleClick = async () => {
    if (!APPLE_CLIENT_ID) {
      onError('Apple Sign-In is not configured. Please use Google Sign-In.');
      return;
    }
    if (!window.AppleID) {
      onError('Apple Sign-In SDK failed to load. Please try again.');
      return;
    }
    if (!sdkReady.current) {
      initAppleSDK();
    }
    try {
      const response = await window.AppleID.auth.signIn();
      const idToken = response.authorization.id_token;
      const email = response.user?.email;
      const name = response.user?.name
        ? [response.user.name.firstName, response.user.name.lastName].filter(Boolean).join(' ')
        : undefined;
      onSuccess(idToken, email, name);
    } catch (err: unknown) {
      console.error('Apple Sign-In error:', err);
      const error = err as { error?: string };
      if (error?.error === 'popup_closed_by_user' || error?.error === 'user_cancelled_authorize') {
        return;
      }
      onError('Apple sign-in failed. Please try again.');
    }
  };

  return (
    <>
      <Script
        src="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js"
        strategy="lazyOnload"
        onLoad={initAppleSDK}
      />
      <button
        onClick={handleClick}
        disabled={disabled || !APPLE_CLIENT_ID}
        className="flex items-center justify-center gap-3 w-full h-12 px-6 bg-black text-white border border-black rounded-md text-[15px] font-medium cursor-pointer transition-all duration-200 hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
      >
        <AppleLogo />
        Continue with Apple
      </button>
    </>
  );
}

function LoginShell({ children }: { children: React.ReactNode }) {
  return (
    <section className="py-12 sm:py-16 flex items-center justify-center min-h-[80vh]">
      <div className="w-full max-w-[420px] mx-auto px-4">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <Image
              src="/images/AppIcon1024.png"
              alt="Reetle"
              width={72}
              height={72}
              className="rounded-2xl shadow-md"
              priority
            />
          </div>
          <h1 className="text-[28px] font-semibold tracking-tight text-ui-foreground mb-2">Welcome to Reetle</h1>
          <p className="text-[15px] text-ui-muted-foreground">
            Sign in to learn languages by reading articles you actually want to read.
          </p>
        </div>
        {children}
        <p className="text-center text-[12px] text-ui-muted-foreground mt-6 px-4 leading-relaxed">
          By signing in, you agree to our{' '}
          <Link href="/terms" className="underline hover:text-primary">Terms of Service</Link>
          {' '}and{' '}
          <Link href="/privacy" className="underline hover:text-primary">Privacy Policy</Link>.
        </p>
      </div>
    </section>
  );
}

function LoginContent() {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signInWithGoogle, signInWithApple, isAuthenticated, needsOnboarding } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect');

  const redirectAfterAuth = useCallback(() => {
    const step = needsOnboarding();
    if (step === 'language') {
      router.replace('/onboarding/language');
    } else if (step === 'level') {
      router.replace('/onboarding/level');
    } else if (redirectUrl) {
      router.replace(redirectUrl);
    } else {
      router.replace('/articles');
    }
  }, [needsOnboarding, router, redirectUrl]);

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
    <LoginShell>
      <Card className="shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col gap-3">
            <GoogleSignInButton
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google sign-in was cancelled or failed.')}
              disabled={isSigningIn}
            />
            <div className="flex items-center gap-3 my-1">
              <Separator className="flex-1" />
              <span className="text-[12px] uppercase tracking-wider text-ui-muted-foreground">or</span>
              <Separator className="flex-1" />
            </div>
            <AppleSignInButton onSuccess={handleAppleSuccess} onError={(msg) => setError(msg)} disabled={isSigningIn} />
          </div>

          {error && (
            <div className="mt-4 px-4 py-3 bg-incorrect-bg rounded-md border border-incorrect/30">
              <p className="text-[13px] text-incorrect-text text-center">{error}</p>
            </div>
          )}

          {isSigningIn && (
            <div className="mt-4 flex items-center justify-center gap-2 text-ui-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <p className="text-[13px]">Signing in...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </LoginShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-ui-primary" />
      </div>
    }>
      {GOOGLE_CLIENT_ID ? (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <LoginContent />
        </GoogleOAuthProvider>
      ) : (
        <LoginContentWithoutGoogle />
      )}
    </Suspense>
  );
}

function LoginContentWithoutGoogle() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect');

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(redirectUrl || '/articles');
    }
  }, [isAuthenticated, router, redirectUrl]);

  return (
    <LoginShell>
      <Card className="shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-[16px]">OAuth not configured</CardTitle>
          <CardDescription>
            Sign-in is currently disabled in this environment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <Button variant="outline" disabled className="h-12">
              <GoogleLogo />
              Continue with Google
            </Button>
            <Button disabled className="h-12 bg-black text-white border-black hover:bg-black">
              <AppleLogo />
              Continue with Apple
            </Button>
          </div>
          <div className="mt-4 px-4 py-3 bg-accent-light rounded-md">
            <p className="text-[12px] text-primary text-center leading-relaxed">
              Set <code className="bg-white px-1.5 py-0.5 rounded text-[11px]">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> in <code className="bg-white px-1.5 py-0.5 rounded text-[11px]">.env.local</code> to enable sign-in.
            </p>
          </div>
        </CardContent>
      </Card>
    </LoginShell>
  );
}

'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
}

function GuardSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-9 w-9 animate-spin text-ui-primary" />
    </div>
  );
}

function AuthGuardInner({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading, needsOnboarding } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      const qs = searchParams.toString();
      const currentUrl = qs ? `${pathname}?${qs}` : pathname;
      router.replace(`/login?redirect=${encodeURIComponent(currentUrl)}`);
      return;
    }

    const onboardingStep = needsOnboarding();
    if (onboardingStep === 'language') {
      router.replace('/onboarding/language');
    } else if (onboardingStep === 'level') {
      router.replace('/onboarding/level');
    }
  }, [isAuthenticated, isLoading, needsOnboarding, router, pathname, searchParams]);

  if (isLoading || !isAuthenticated) {
    return <GuardSpinner />;
  }

  return <>{children}</>;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  return (
    <Suspense fallback={<GuardSpinner />}>
      <AuthGuardInner>{children}</AuthGuardInner>
    </Suspense>
  );
}

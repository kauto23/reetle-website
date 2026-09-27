'use client';

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  BarChart3,
  Check,
  ChevronRight,
  Copy,
  Link2,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import AuthGuard from '@/components/layout/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { getTargetLanguages, getReferralCode, cancelSubscription } from '@/services/api';
import type { TargetLanguage } from '@/types/user';
import type { ReferralInfo } from '@/types/subscription';
import { buildReferralUrl } from '@/lib/referralShare';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import OnboardingOption from '@/components/onboarding/OnboardingOption';
import {
  CEFR_LEVELS,
  flagForLanguage,
  formatLevel,
  languageName,
} from '@/components/onboarding/onboardingData';

function PreferenceRow({
  label,
  value,
  open,
  onToggle,
}: {
  label: string;
  value: ReactNode;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="flex w-full items-center justify-between gap-3 py-4 text-left bg-transparent border-none cursor-pointer"
    >
      <div className="min-w-0">
        <p className="text-label-md text-ui-muted-foreground mb-0.5">{label}</p>
        <p className="text-title-md text-ui-foreground">{value}</p>
      </div>
      <span className="inline-flex shrink-0 items-center gap-0.5 text-label-lg text-ui-primary">
        {open ? 'Close' : 'Change'}
        <ChevronRight className={cn('h-4 w-4 transition-transform duration-200', open && 'rotate-90')} />
      </span>
    </button>
  );
}

export default function ProfilePage() {
  const { user, logout, deleteAccount, updateLanguage, updateCefrLevel } = useAuth();
  const { isPremium, platform, expirationDate, refreshStatus } = useSubscription();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);

  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState<{
    message: string;
    requiresUserAction: boolean;
    managementUrl?: string;
  } | null>(null);

  const [referral, setReferral] = useState<ReferralInfo | null>(null);
  const [referralLoading, setReferralLoading] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const [editingLanguage, setEditingLanguage] = useState(false);
  const [languages, setLanguages] = useState<TargetLanguage[]>([]);
  const [languagesLoaded, setLanguagesLoaded] = useState(false);
  const [savingLanguage, setSavingLanguage] = useState<string | null>(null);
  const [languageError, setLanguageError] = useState<string | null>(null);

  const [editingLevel, setEditingLevel] = useState(false);
  const [savingLevel, setSavingLevel] = useState<string | null>(null);
  const [levelError, setLevelError] = useState<string | null>(null);

  const loadLanguages = useCallback(async () => {
    if (languagesLoaded) return;
    setLanguageError(null);
    try {
      const langs = await getTargetLanguages();
      const sorted = [...langs].sort((a, b) => {
        if (a.code === 'es') return -1;
        if (b.code === 'es') return 1;
        return a.name.localeCompare(b.name);
      });
      setLanguages(sorted);
      setLanguagesLoaded(true);
    } catch {
      setLanguageError('Failed to load languages. Please try again.');
    }
  }, [languagesLoaded]);

  useEffect(() => {
    if (editingLanguage && !languagesLoaded) loadLanguages();
  }, [editingLanguage, languagesLoaded, loadLanguages]);

  useEffect(() => {
    let cancelled = false;
    setReferralLoading(true);
    getReferralCode()
      .then(data => { if (!cancelled) setReferral(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setReferralLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleToggleLanguageEdit = () => {
    setEditingLevel(false);
    setEditingLanguage(!editingLanguage);
    setLanguageError(null);
  };

  const handleToggleLevelEdit = () => {
    setEditingLanguage(false);
    setEditingLevel(!editingLevel);
    setLevelError(null);
  };

  const handleSelectLanguage = async (code: string) => {
    if (savingLanguage) return;
    if (code === user?.targetLanguage) {
      setEditingLanguage(false);
      return;
    }
    setSavingLanguage(code);
    setLanguageError(null);
    try {
      const success = await updateLanguage(undefined, code);
      if (success) {
        setEditingLanguage(false);
        // Confirm the save and signal that downstream content (articles
        // feed, any active audio queue) is being refreshed for the new
        // language. The actual queue teardown is handled inside
        // `PlayAllAudioContext` when it observes the auth-context update.
        toast.success(`Now learning ${languageName(code)}`, {
          description: 'Your articles and audio are being updated.',
          duration: 4000,
        });
      } else {
        setLanguageError('Failed to update language. Please try again.');
      }
    } catch {
      setLanguageError('An error occurred. Please try again.');
    } finally {
      setSavingLanguage(null);
    }
  };

  const handleSelectLevel = async (code: string) => {
    if (savingLevel) return;
    if (code === user?.cefrLevel) {
      setEditingLevel(false);
      return;
    }
    setSavingLevel(code);
    setLevelError(null);
    try {
      const success = await updateCefrLevel(code);
      if (success) {
        setEditingLevel(false);
        toast.success(`Level set to ${formatLevel(code)}`, {
          description: 'Your articles and audio are being updated.',
          duration: 4000,
        });
      } else {
        setLevelError('Failed to update level. Please try again.');
      }
    } catch {
      setLevelError('An error occurred. Please try again.');
    } finally {
      setSavingLevel(null);
    }
  };

  const handleRefreshStatus = async () => {
    setIsRefreshingStatus(true);
    try {
      await refreshStatus();
      toast.success('Subscription status refreshed');
    } catch {
      toast.error('Could not refresh subscription status. Please try again.');
    } finally {
      setIsRefreshingStatus(false);
    }
  };

  const handleCancelSubscription = async () => {
    setIsCancelling(true);
    setCancelError(null);
    try {
      const result = await cancelSubscription();
      const endDate = new Date(result.is_premium_until).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
      });
      if (result.requires_user_action && result.management_url) {
        window.open(result.management_url, '_blank', 'noopener,noreferrer');
        setCancelSuccess({
          message: result.message || `Apple subscriptions must be cancelled in Apple's subscription settings. We've opened it for you. Premium remains active until ${endDate}.`,
          requiresUserAction: true,
          managementUrl: result.management_url,
        });
      } else {
        setCancelSuccess({
          message: `Your premium access will end on ${endDate}.`,
          requiresUserAction: false,
        });
      }
      // Cancellation already succeeded; a failed status refresh shouldn't
      // surface as a cancellation error.
      await refreshStatus().catch(() => {});
    } catch (err) {
      const code = err instanceof Error ? err.message : 'unknown_error';
      let friendly = 'Could not cancel your subscription. Please try again.';
      if (code === 'no_active_subscription') friendly = 'No active subscription found.';
      else if (code === 'not_user_cancellable') friendly = 'This subscription is managed externally and cannot be cancelled here.';
      setCancelError(friendly);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteAccount();
      if (result.success) {
        router.replace('/');
      } else {
        alert(result.error || 'Failed to delete account');
      }
    } catch {
      alert('An error occurred. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AuthGuard>
      <section className="py-10 sm:py-14">
        <div className="max-w-[600px] mx-auto px-4 space-y-6">
          <div className="text-center mb-2">
            <h1 className="text-display-md tracking-tight text-ui-foreground">Profile</h1>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 bg-ui-primary rounded-full flex items-center justify-center text-white text-headline-sm shrink-0">
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-title-md font-semibold text-ui-foreground truncate">{user?.email || 'User'}</p>
                  {user?.cefrLevel && (
                    <p className="text-body-sm text-ui-muted-foreground">{formatLevel(user.cefrLevel)}</p>
                  )}
                </div>
              </div>

              <Separator />

              <PreferenceRow
                label="Learning language"
                value={
                  <>
                    <span aria-hidden className="mr-1.5">{flagForLanguage(user?.targetLanguage)}</span>
                    {languageName(user?.targetLanguage)}
                  </>
                }
                open={editingLanguage}
                onToggle={handleToggleLanguageEdit}
              />

              {editingLanguage && (
                <div className="pb-4 animate-fadeIn">
                  {languages.length === 0 && !languageError && (
                    <div className="flex justify-center py-5">
                      <Loader2 className="h-5 w-5 animate-spin text-ui-primary" />
                    </div>
                  )}
                  {languages.length > 0 && (
                    <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto">
                      {languages.map((lang) => (
                        <OnboardingOption
                          key={lang.code}
                          animate={false}
                          leading={
                            <span aria-hidden className="text-headline-sm leading-none">
                              {flagForLanguage(lang.code)}
                            </span>
                          }
                          title={lang.name}
                          subtitle={lang.native_name}
                          selected={lang.code === user?.targetLanguage}
                          loading={savingLanguage === lang.code}
                          onSelect={() => handleSelectLanguage(lang.code)}
                        />
                      ))}
                    </div>
                  )}
                  {languageError && (
                    <div className="text-center pt-3">
                      <p className="text-body-sm text-incorrect mb-2">{languageError}</p>
                      <Button variant="link" onClick={() => { setLanguagesLoaded(false); loadLanguages(); }}>
                        Try again
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <Separator />

              <PreferenceRow
                label="Reading level"
                value={formatLevel(user?.cefrLevel)}
                open={editingLevel}
                onToggle={handleToggleLevelEdit}
              />

              {editingLevel && (
                <div className="pb-2 animate-fadeIn">
                  <div className="flex flex-col gap-2">
                    {CEFR_LEVELS.map((level) => (
                      <OnboardingOption
                        key={level.code}
                        animate={false}
                        leading={
                          <span className={cn('text-body-lg font-bold', level.available ? 'text-ui-foreground' : 'text-ui-muted-foreground')}>
                            {level.code}
                          </span>
                        }
                        title={level.name}
                        subtitle={level.description}
                        badge={level.available ? null : 'Soon'}
                        disabled={!level.available}
                        selected={level.code === user?.cefrLevel}
                        loading={savingLevel === level.code}
                        onSelect={() => handleSelectLevel(level.code)}
                      />
                    ))}
                  </div>
                  {levelError && (
                    <p className="text-body-sm text-incorrect text-center pt-3">{levelError}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-title-md font-semibold">Subscription</CardTitle>
                <div className="flex items-center gap-1.5">
                  {isPremium ? <Badge variant="success">Premium</Badge> : <Badge variant="muted">Free</Badge>}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefreshStatus}
                    disabled={isRefreshingStatus}
                    className="h-7 w-7 p-0 text-ui-muted-foreground"
                    aria-label="Refresh subscription status"
                    title="Refresh subscription status"
                  >
                    <RefreshCw className={cn('h-3.5 w-3.5', isRefreshingStatus && 'animate-spin')} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isPremium ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    {platform && (
                      <p className="text-body-sm text-ui-muted-foreground">
                        Via <span className="capitalize">{platform}</span>
                      </p>
                    )}
                    {expirationDate && (
                      <p className="text-body-sm text-ui-muted-foreground">
                        Renews {new Date(expirationDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    )}
                  </div>

                  {cancelSuccess && (
                    <div className="border border-ui-border bg-ui-muted/30 p-3 space-y-2">
                      <p className="text-body-sm text-ui-foreground">{cancelSuccess.message}</p>
                      {cancelSuccess.requiresUserAction && cancelSuccess.managementUrl && (
                        <Button asChild size="sm" variant="outline">
                          <a href={cancelSuccess.managementUrl} target="_blank" rel="noopener noreferrer">
                            Open Apple subscription settings
                          </a>
                        </Button>
                      )}
                    </div>
                  )}

                  {cancelError && (
                    <p className="text-body-sm text-incorrect">{cancelError}</p>
                  )}

                  {platform !== 'referral' && !cancelSuccess && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-ui-muted-foreground">
                          Cancel subscription
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {expirationDate ? (
                              <>You&apos;ll keep premium access until {new Date(expirationDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}, then your account will switch to the free tier.</>
                            ) : (
                              <>You&apos;ll keep premium access until the end of your current billing period, then your account will switch to the free tier.</>
                            )}
                            {platform === 'apple' && (
                              <>{' '}Apple subscriptions are cancelled in Apple&apos;s subscription settings. We&apos;ll open the page for you.</>
                            )}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={isCancelling}>Keep subscription</AlertDialogCancel>
                          <AlertDialogAction
                            disabled={isCancelling}
                            onClick={handleCancelSubscription}
                          >
                            {isCancelling ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Cancelling...
                              </>
                            ) : (
                              'Cancel subscription'
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-body-sm text-ui-muted-foreground mb-3">
                    Upgrade to Premium for unlimited articles, audio and practice.
                  </p>
                  <Button asChild size="sm">
                    <Link href="/premium">Upgrade to Premium</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-title-md font-semibold">Invite Friends</CardTitle>
              <CardDescription>
                Share your code. When a friend upgrades, you both get 30 days free.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {referralLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-ui-primary" />
                </div>
              ) : referral ? (
                (() => {
                  const referralUrl = buildReferralUrl(referral.code);
                  return (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-ui-background border border-ui-border px-3.5 py-2.5 text-title-lg text-ui-primary tracking-widest text-center select-all font-mono">
                          {referral.code}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(referral.code);
                            setCodeCopied(true);
                            setTimeout(() => setCodeCopied(false), 2000);
                          }}
                        >
                          {codeCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          {codeCopied ? 'Copied' : 'Copy'}
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className="flex-1 bg-ui-background border border-ui-border px-3 py-2 text-label-md text-ui-muted-foreground truncate select-all"
                          title={referralUrl}
                        >
                          {referralUrl}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(referralUrl);
                            setLinkCopied(true);
                            setTimeout(() => setLinkCopied(false), 2000);
                          }}
                        >
                          {linkCopied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
                          {linkCopied ? 'Copied' : 'Copy link'}
                        </Button>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <p className="text-body-sm text-ui-muted-foreground">Unable to load your referral code.</p>
              )}
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Link href="/progress">
              <Card className="hover:bg-ui-muted/30 transition-colors">
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-5 h-5 text-ui-primary" />
                    <span className="text-title-md text-ui-foreground">Progress &amp; Statistics</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-ui-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Button variant="outline" size="lg" onClick={() => { logout(); router.replace('/'); }}>
              Log Out
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="text-ui-muted-foreground hover:text-incorrect">
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-5 h-5 text-incorrect" />
                    <AlertDialogTitle>Delete account?</AlertDialogTitle>
                  </div>
                  <AlertDialogDescription>
                    This will permanently delete your account and all progress. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={isDeleting}
                    onClick={handleDeleteAccount}
                    className="bg-incorrect hover:bg-incorrect/90 text-white"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Delete account'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </section>
    </AuthGuard>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
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

const FLAG_MAP: Record<string, string> = {
  spanish: '\u{1F1EA}\u{1F1F8}',
  french: '\u{1F1EB}\u{1F1F7}',
  german: '\u{1F1E9}\u{1F1EA}',
  italian: '\u{1F1EE}\u{1F1F9}',
  portuguese: '\u{1F1F5}\u{1F1F9}',
  dutch: '\u{1F1F3}\u{1F1F1}',
  russian: '\u{1F1F7}\u{1F1FA}',
  japanese: '\u{1F1EF}\u{1F1F5}',
  chinese: '\u{1F1E8}\u{1F1F3}',
  korean: '\u{1F1F0}\u{1F1F7}',
};

const LANGUAGE_NAMES: Record<string, string> = {
  es: 'Spanish', fr: 'French', de: 'German', it: 'Italian', pt: 'Portuguese',
  nl: 'Dutch', ru: 'Russian', ja: 'Japanese', zh: 'Chinese', ko: 'Korean', en: 'English',
  spanish: 'Spanish', french: 'French', german: 'German', italian: 'Italian',
  portuguese: 'Portuguese', dutch: 'Dutch', russian: 'Russian', japanese: 'Japanese',
  chinese: 'Chinese', korean: 'Korean', english: 'English',
};

function getLanguageDisplayName(code: string | null): string {
  if (!code) return 'Not set';
  return LANGUAGE_NAMES[code.toLowerCase()] || code.charAt(0).toUpperCase() + code.slice(1);
}

function getLanguageFlag(code: string | null): string {
  if (!code) return '';
  return FLAG_MAP[code.toLowerCase()] || '';
}

interface CefrLevel {
  code: string;
  name: string;
  description: string;
  available: boolean;
}

const CEFR_LEVELS: CefrLevel[] = [
  { code: 'A1', name: 'Beginner', description: 'Basic phrases and greetings', available: true },
  { code: 'A2', name: 'Elementary', description: 'Simple conversations', available: true },
  { code: 'B1', name: 'Intermediate', description: 'Everyday topics and travel', available: true },
  { code: 'B2', name: 'Upper Intermediate', description: 'Fluent with native speakers', available: true },
  { code: 'C1', name: 'Advanced', description: 'Complex texts and speech', available: false },
  { code: 'C2', name: 'Proficiency', description: 'Near-native fluency', available: false },
];

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
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [isSavingLanguage, setIsSavingLanguage] = useState(false);
  const [languageError, setLanguageError] = useState<string | null>(null);

  const [editingLevel, setEditingLevel] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [isSavingLevel, setIsSavingLevel] = useState(false);
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
    setSelectedLanguage(null);
    setLanguageError(null);
  };

  const handleToggleLevelEdit = () => {
    setEditingLanguage(false);
    setEditingLevel(!editingLevel);
    setSelectedLevel(null);
    setLevelError(null);
  };

  const handleSaveLanguage = async () => {
    if (!selectedLanguage) return;
    setIsSavingLanguage(true);
    setLanguageError(null);
    try {
      const success = await updateLanguage(undefined, selectedLanguage);
      if (success) {
        setEditingLanguage(false);
        setSelectedLanguage(null);
        // Confirm the save and signal that downstream content (articles
        // feed, any active audio queue) is being refreshed for the new
        // language. The actual queue teardown is handled inside
        // `PlayAllAudioContext` when it observes the auth-context update.
        toast.success(`Now learning ${getLanguageDisplayName(selectedLanguage)}`, {
          description: 'Your articles and audio are being updated.',
          duration: 4000,
        });
      } else {
        setLanguageError('Failed to update language. Please try again.');
      }
    } catch {
      setLanguageError('An error occurred. Please try again.');
    } finally {
      setIsSavingLanguage(false);
    }
  };

  const handleSaveLevel = async () => {
    if (!selectedLevel) return;
    setIsSavingLevel(true);
    setLevelError(null);
    try {
      const success = await updateCefrLevel(selectedLevel);
      if (success) {
        setEditingLevel(false);
        setSelectedLevel(null);
        toast.success(`Level set to ${selectedLevel}`, {
          description: 'Your articles and audio are being updated.',
          duration: 4000,
        });
      } else {
        setLevelError('Failed to update level. Please try again.');
      }
    } catch {
      setLevelError('An error occurred. Please try again.');
    } finally {
      setIsSavingLevel(false);
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
                <div className="w-14 h-14 bg-ui-primary rounded-full flex items-center justify-center text-white text-2xl font-semibold shrink-0">
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[16px] font-semibold text-ui-foreground truncate">{user?.email || 'User'}</p>
                  {user?.cefrLevel && (
                    <p className="text-[13px] text-ui-muted-foreground">Level {user.cefrLevel}</p>
                  )}
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between py-4">
                <div className="min-w-0">
                  <p className="text-[12px] text-ui-muted-foreground mb-0.5">Learning</p>
                  <p className="text-[15px] font-medium text-ui-foreground">
                    <span className="mr-1">{getLanguageFlag(user?.targetLanguage || null)}</span>
                    {getLanguageDisplayName(user?.targetLanguage || null)}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleToggleLanguageEdit} className="rounded-full">
                  {editingLanguage ? 'Cancel' : 'Change'}
                </Button>
              </div>

              {editingLanguage && (
                <div className="pb-4 animate-fadeIn">
                  {languages.length === 0 && !languageError && (
                    <div className="flex justify-center py-5">
                      <Loader2 className="h-5 w-5 animate-spin text-ui-primary" />
                    </div>
                  )}
                  {languages.length > 0 && (
                    <>
                      <div className="flex flex-col gap-1.5 max-h-[260px] overflow-y-auto mb-3">
                        {languages.map((lang) => {
                          const selected = selectedLanguage === lang.code;
                          return (
                            <button
                              key={lang.code}
                              onClick={() => setSelectedLanguage(lang.code)}
                              className={cn(
                                'flex items-center gap-3 p-2.5 rounded-md border transition-all text-left w-full',
                                selected
                                  ? 'border-ui-primary bg-ui-card shadow-sm'
                                  : 'border-ui-border bg-ui-card hover:border-primary-light'
                              )}
                            >
                              <span className="text-[22px] leading-none">{FLAG_MAP[lang.code] || ''}</span>
                              <span className="flex-1 text-[14px] font-medium text-ui-foreground">{lang.name}</span>
                              <span className={cn(
                                'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
                                selected ? 'border-ui-primary bg-ui-primary' : 'border-ui-border'
                              )}>
                                {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <Button
                        onClick={handleSaveLanguage}
                        disabled={!selectedLanguage || isSavingLanguage}
                        className="w-full"
                      >
                        {isSavingLanguage && <Loader2 className="h-4 w-4 animate-spin" />}
                        {isSavingLanguage ? 'Saving...' : 'Save Language'}
                      </Button>
                    </>
                  )}
                  {languageError && (
                    <div className="text-center py-2">
                      <p className="text-[13px] text-incorrect mb-2">{languageError}</p>
                      <Button variant="link" onClick={() => { setLanguagesLoaded(false); loadLanguages(); }}>
                        Try again
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between py-4">
                <div>
                  <p className="text-[12px] text-ui-muted-foreground mb-0.5">CEFR Level</p>
                  <p className="text-[15px] font-medium text-ui-foreground">{user?.cefrLevel || 'Not set'}</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleToggleLevelEdit} className="rounded-full">
                  {editingLevel ? 'Cancel' : 'Change'}
                </Button>
              </div>

              {editingLevel && (
                <div className="pb-4 animate-fadeIn">
                  <div className="flex flex-col gap-1.5 mb-3">
                    {CEFR_LEVELS.map((level) => {
                      const selected = selectedLevel === level.code;
                      return (
                        <button
                          key={level.code}
                          onClick={() => level.available && setSelectedLevel(level.code)}
                          disabled={!level.available}
                          className={cn(
                            'flex items-center gap-3 p-2.5 rounded-md border transition-all text-left w-full',
                            !level.available && 'opacity-50 cursor-not-allowed border-ui-border bg-ui-muted/30',
                            level.available && selected && 'border-ui-primary bg-ui-card shadow-sm cursor-pointer',
                            level.available && !selected && 'border-ui-border bg-ui-card hover:border-primary-light cursor-pointer'
                          )}
                        >
                          <div className={cn(
                            'w-9 h-9 rounded-md flex items-center justify-center font-semibold text-[13px] shrink-0',
                            selected
                              ? 'bg-ui-primary text-white'
                              : !level.available
                                ? 'bg-ui-muted text-ui-muted-foreground'
                                : 'bg-ui-background text-ui-foreground'
                          )}>
                            {level.code}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-medium text-ui-foreground">{level.name}</p>
                            <p className="text-[12px] text-ui-muted-foreground">{level.description}</p>
                          </div>
                          {!level.available ? (
                            <Badge variant="muted">Soon</Badge>
                          ) : (
                            <span className={cn(
                              'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
                              selected ? 'border-ui-primary bg-ui-primary' : 'border-ui-border'
                            )}>
                              {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {levelError && (
                    <p className="text-[13px] text-incorrect text-center mb-2">{levelError}</p>
                  )}
                  <Button onClick={handleSaveLevel} disabled={!selectedLevel || isSavingLevel} className="w-full">
                    {isSavingLevel && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isSavingLevel ? 'Saving...' : 'Save Level'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[16px]">Subscription</CardTitle>
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
                      <p className="text-[13px] text-ui-muted-foreground">
                        Via <span className="capitalize">{platform}</span>
                      </p>
                    )}
                    {expirationDate && (
                      <p className="text-[13px] text-ui-muted-foreground">
                        Renews {new Date(expirationDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    )}
                  </div>

                  {cancelSuccess && (
                    <div className="rounded-md border border-ui-border bg-ui-muted/30 p-3 space-y-2">
                      <p className="text-[13px] text-ui-foreground">{cancelSuccess.message}</p>
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
                    <p className="text-[13px] text-incorrect">{cancelError}</p>
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
                  <p className="text-[13px] text-ui-muted-foreground mb-3">
                    Upgrade for unlimited articles, audio, and practice.
                  </p>
                  <Button asChild size="sm">
                    <Link href="/premium">Go Premium</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-[16px]">Invite Friends</CardTitle>
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
                        <div className="flex-1 bg-ui-background border border-ui-border rounded-md px-3.5 py-2.5 text-[18px] font-semibold text-ui-primary tracking-widest text-center select-all font-mono">
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
                          className="flex-1 bg-ui-background border border-ui-border rounded-md px-3 py-2 text-[12px] text-ui-muted-foreground truncate select-all"
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
                <p className="text-[13px] text-ui-muted-foreground">Unable to load your referral code.</p>
              )}
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Link href="/progress">
              <Card className="hover:bg-ui-muted/30 transition-colors">
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-5 h-5 text-ui-primary" />
                    <span className="text-[15px] font-medium text-ui-foreground">Progress &amp; Statistics</span>
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

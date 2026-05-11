'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Check, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useGuestPreferences } from '@/contexts/GuestPreferencesContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { getTargetLanguages } from '@/services/api';
import { useLoginUrl } from '@/hooks/useLoginUrl';
import type { TargetLanguage } from '@/types/user';
import { cn } from '@/lib/utils';

const CEFR_LEVELS = [
  { code: 'A1', name: 'Beginner', description: 'Basic phrases and greetings' },
  { code: 'A2', name: 'Elementary', description: 'Simple conversations' },
  { code: 'B1', name: 'Intermediate', description: 'Everyday topics and travel' },
  { code: 'B2', name: 'Upper Intermediate', description: 'Fluent with native speakers' },
];

type OpenDropdown = 'language' | 'level' | null;

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated, logout } = useAuth();
  const { isPremium } = useSubscription();
  const loginUrl = useLoginUrl();
  const { preferences, setTargetLanguage, setCefrLevel } = useGuestPreferences();
  const [languages, setLanguages] = useState<TargetLanguage[]>([]);
  const [openDropdown, setOpenDropdown] = useState<OpenDropdown>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch available languages once (only for guests)
  useEffect(() => {
    if (isAuthenticated) return;
    let cancelled = false;
    getTargetLanguages().then(langs => {
      if (cancelled) return;
      const sorted = [...langs].sort((a, b) => {
        if (a.code === 'es') return -1;
        if (b.code === 'es') return 1;
        return a.name.localeCompare(b.name);
      });
      setLanguages(sorted);
    });
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!openDropdown) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openDropdown]);

  // Close on Escape
  useEffect(() => {
    if (!openDropdown) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenDropdown(null);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [openDropdown]);

  const currentLang = languages.find(l => l.code === preferences.targetLanguage);
  const currentLangName = currentLang?.name || preferences.targetLanguage.charAt(0).toUpperCase() + preferences.targetLanguage.slice(1);
  const currentLevel = CEFR_LEVELS.find(l => l.code === preferences.cefrLevel);

  const handleLanguageSelect = (langCode: string) => {
    setTargetLanguage(langCode);
    setOpenDropdown(null);
  };

  const handleLevelSelect = (levelCode: string) => {
    setCefrLevel(levelCode);
    setOpenDropdown(null);
  };

  const toggleDropdown = (which: OpenDropdown) => {
    setOpenDropdown(prev => prev === which ? null : which);
  };

  return (
    <header className="sticky top-0" style={{ zIndex: 'var(--z-header)' }}>
      {/* Top bar */}
      <nav className="bg-ui-primary text-white">
        <div className="max-w-[1280px] mx-auto px-md">
          <div className="flex justify-between items-center h-[48px]">
            {/* Logo */}
            <div className="flex items-center">
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('reetle-logo-click'));
                  if (pathname === '/') {
                    if (searchParams.get('article')) router.push('/');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  } else {
                    router.push('/');
                  }
                }}
                className="flex items-center gap-[10px] bg-transparent border-none cursor-pointer p-0"
              >
                <Image
                  src="/images/AppIcon1024.png"
                  alt="Reetle Logo"
                  width={32}
                  height={32}
                  className="rounded-[6px]"
                />
                <span className="text-[20px] font-semibold text-white tracking-tight">Reetle</span>
              </button>
            </div>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-[2px]">
              {isAuthenticated ? (
                <>
                  <Link href="/" className="text-[14px] font-medium text-white/90 hover:text-white hover:bg-white/10 px-[14px] py-[8px] rounded-md transition-all">
                    News
                  </Link>
                  <Link href="/practice" className="text-[14px] font-medium text-white/90 hover:text-white hover:bg-white/10 px-[14px] py-[8px] rounded-md transition-all">
                    Practice
                  </Link>
                  <Link href="/progress" className="text-[14px] font-medium text-white/90 hover:text-white hover:bg-white/10 px-[14px] py-[8px] rounded-md transition-all">
                    Progress
                  </Link>
                  <Link href="/profile" className="text-[14px] font-medium text-white/90 hover:text-white hover:bg-white/10 px-[14px] py-[8px] rounded-md transition-all">
                    Profile
                  </Link>
                  {isPremium ? (
                    <span className="text-[11px] font-semibold text-white bg-white/20 px-[10px] py-[4px] rounded-full ml-[4px] select-none">
                      Premium
                    </span>
                  ) : (
                    <Link href="/premium" className="text-[12px] font-semibold text-primary bg-white px-[12px] py-[5px] rounded-full ml-[4px] hover:bg-white/90 transition-colors">
                      Go Premium
                    </Link>
                  )}
                  <div className="w-[1px] h-[20px] bg-white/20 mx-[6px]" />
                  <button
                    onClick={logout}
                    className="text-[14px] font-medium text-white/70 hover:text-white hover:bg-white/10 px-[14px] py-[8px] rounded-md transition-all cursor-pointer bg-transparent border-none"
                  >
                    Log Out
                  </button>
                </>
              ) : (
                <div ref={dropdownRef} className="flex items-center gap-[2px] relative">
                  {/* Language selector */}
                  <button
                    onClick={() => toggleDropdown('language')}
                    className={cn(
                      'text-[14px] font-medium px-3.5 py-2 rounded-md transition-all cursor-pointer bg-transparent border-none flex items-center gap-1.5',
                      openDropdown === 'language' ? 'text-white bg-white/10' : 'text-white/70 hover:text-white hover:bg-white/10'
                    )}
                  >
                    <span>{currentLangName}</span>
                    <ChevronDown className={cn('w-3 h-3 transition-transform duration-200', openDropdown === 'language' && 'rotate-180')} strokeWidth={3} />
                  </button>

                  {/* Level selector */}
                  <button
                    onClick={() => toggleDropdown('level')}
                    className={cn(
                      'text-[14px] font-medium px-3.5 py-2 rounded-md transition-all cursor-pointer bg-transparent border-none flex items-center gap-1.5',
                      openDropdown === 'level' ? 'text-white bg-white/10' : 'text-white/70 hover:text-white hover:bg-white/10'
                    )}
                  >
                    <span>{currentLevel?.name || preferences.cefrLevel}</span>
                    <ChevronDown className={cn('w-3 h-3 transition-transform duration-200', openDropdown === 'level' && 'rotate-180')} strokeWidth={3} />
                  </button>

                  <div className="w-[1px] h-[20px] bg-white/20 mx-[6px]" />

                  <Link href={loginUrl} className="text-[14px] font-medium text-white/70 hover:text-white hover:bg-white/10 px-[14px] py-[8px] rounded-md transition-all">
                    Log In
                  </Link>

                  {/* Language dropdown */}
                  {openDropdown === 'language' && (
                    <div className="absolute right-0 top-full mt-1 w-[240px] bg-ui-card rounded-md border border-ui-border shadow-lg overflow-hidden z-[1100]">
                      <div className="max-h-[320px] overflow-y-auto py-1">
                        {languages.map(lang => {
                          const selected = preferences.targetLanguage === lang.code;
                          return (
                            <button
                              key={lang.code}
                              onClick={() => handleLanguageSelect(lang.code)}
                              className={cn(
                                'flex items-center justify-between w-full px-3.5 py-2.5 text-left cursor-pointer border-none transition-colors duration-100',
                                selected
                                  ? 'bg-ui-primary/5 text-ui-primary font-medium'
                                  : 'bg-ui-card text-ui-foreground hover:bg-ui-muted'
                              )}
                            >
                              <div className="min-w-0">
                                <p className="text-[14px] leading-tight">{lang.name}</p>
                                <p className="text-[12px] text-ui-muted-foreground leading-tight mt-0.5">{lang.native_name}</p>
                              </div>
                              {selected && <Check className="w-4 h-4 text-ui-primary shrink-0 ml-2" strokeWidth={2.5} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Level dropdown */}
                  {openDropdown === 'level' && (
                    <div className="absolute right-0 top-full mt-1 w-[260px] bg-ui-card rounded-md border border-ui-border shadow-lg overflow-hidden z-[1100]">
                      <div className="py-1">
                        {CEFR_LEVELS.map(level => {
                          const selected = preferences.cefrLevel === level.code;
                          return (
                            <button
                              key={level.code}
                              onClick={() => handleLevelSelect(level.code)}
                              className={cn(
                                'flex items-center justify-between w-full px-3.5 py-2.5 text-left cursor-pointer border-none transition-colors duration-100',
                                selected
                                  ? 'bg-ui-primary/5 text-ui-primary font-medium'
                                  : 'bg-ui-card text-ui-foreground hover:bg-ui-muted'
                              )}
                            >
                              <div className="min-w-0">
                                <p className="text-[14px] leading-tight">
                                  {level.name} <span className="text-ui-muted-foreground font-normal">({level.code})</span>
                                </p>
                                <p className="text-[12px] text-ui-muted-foreground leading-tight mt-0.5">{level.description}</p>
                              </div>
                              {selected && <Check className="w-4 h-4 text-ui-primary shrink-0 ml-2" strokeWidth={2.5} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button
              className="md:hidden bg-transparent border-none cursor-pointer p-xs"
              aria-label="Toggle navigation menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className={`block w-[22px] h-[2px] bg-white my-[4px] transition-all duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-[6px]' : ''}`} />
              <span className={`block w-[22px] h-[2px] bg-white my-[4px] transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`} />
              <span className={`block w-[22px] h-[2px] bg-white my-[4px] transition-all duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-[6px]' : ''}`} />
            </button>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-md animate-fadeIn border-t border-white/10">
              <ul className="flex flex-col pt-sm">
                {isAuthenticated ? (
                  <>
                    <li>
                      <Link href="/" className="block py-[10px] text-[15px] font-medium text-white/90 hover:text-white" onClick={() => setMobileMenuOpen(false)}>
                        News
                      </Link>
                    </li>
                    <li>
                      <Link href="/practice" className="block py-[10px] text-[15px] font-medium text-white/90 hover:text-white" onClick={() => setMobileMenuOpen(false)}>
                        Practice
                      </Link>
                    </li>
                    <li>
                      <Link href="/progress" className="block py-[10px] text-[15px] font-medium text-white/90 hover:text-white" onClick={() => setMobileMenuOpen(false)}>
                        Progress
                      </Link>
                    </li>
                    <li>
                      <Link href="/profile" className="block py-[10px] text-[15px] font-medium text-white/90 hover:text-white" onClick={() => setMobileMenuOpen(false)}>
                        Profile
                      </Link>
                    </li>
                    {!isPremium && (
                      <li>
                        <Link href="/premium" className="block py-[10px] text-[15px] font-semibold text-white" onClick={() => setMobileMenuOpen(false)}>
                          Go Premium
                        </Link>
                      </li>
                    )}
                    <li className="border-t border-white/10 mt-sm pt-sm">
                      <button
                        onClick={() => { logout(); setMobileMenuOpen(false); }}
                        className="block py-[10px] text-[15px] font-medium text-white/60 hover:text-white cursor-pointer bg-transparent border-none w-full text-left"
                      >
                        Log Out
                      </button>
                    </li>
                  </>
                ) : (
                  <>
                    {/* Guest language & level selectors */}
                    <li>
                      <div className="py-[10px]">
                        <p className="text-[12px] font-semibold text-white/40 uppercase tracking-wide mb-[8px]">Language</p>
                        <div className="flex flex-wrap gap-[6px]">
                          {languages.map(lang => (
                            <button
                              key={lang.code}
                              onClick={() => setTargetLanguage(lang.code)}
                              className={`
                                text-[13px] font-medium px-[12px] py-[6px] rounded-md border cursor-pointer transition-all
                                ${preferences.targetLanguage === lang.code
                                  ? 'bg-white text-primary border-white'
                                  : 'bg-transparent text-white/70 border-white/20 hover:border-white/40 hover:text-white'
                                }
                              `}
                            >
                              {lang.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </li>
                    <li>
                      <div className="py-[10px]">
                        <p className="text-[12px] font-semibold text-white/40 uppercase tracking-wide mb-[8px]">Level</p>
                        <div className="flex flex-wrap gap-[6px]">
                          {CEFR_LEVELS.map(level => (
                            <button
                              key={level.code}
                              onClick={() => setCefrLevel(level.code)}
                              className={`
                                text-[13px] font-medium px-[12px] py-[6px] rounded-md border cursor-pointer transition-all
                                ${preferences.cefrLevel === level.code
                                  ? 'bg-white text-primary border-white'
                                  : 'bg-transparent text-white/70 border-white/20 hover:border-white/40 hover:text-white'
                                }
                              `}
                            >
                              {level.name} ({level.code})
                            </button>
                          ))}
                        </div>
                      </div>
                    </li>
                    <li className="border-t border-white/10 mt-sm pt-sm">
                      <Link href={loginUrl} className="block text-center bg-white/10 text-white font-medium py-[10px] rounded-md" onClick={() => setMobileMenuOpen(false)}>
                        Log In
                      </Link>
                    </li>
                  </>
                )}
              </ul>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}

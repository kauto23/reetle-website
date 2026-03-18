'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthGuard from '@/components/layout/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { getTargetLanguages } from '@/services/api';
import type { TargetLanguage } from '@/types/user';

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

// Map language codes to display names (for when the API stores short codes)
const LANGUAGE_NAMES: Record<string, string> = {
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  nl: 'Dutch',
  ru: 'Russian',
  ja: 'Japanese',
  zh: 'Chinese',
  ko: 'Korean',
  en: 'English',
  spanish: 'Spanish',
  french: 'French',
  german: 'German',
  italian: 'Italian',
  portuguese: 'Portuguese',
  dutch: 'Dutch',
  russian: 'Russian',
  japanese: 'Japanese',
  chinese: 'Chinese',
  korean: 'Korean',
  english: 'English',
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
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Language editing
  const [editingLanguage, setEditingLanguage] = useState(false);
  const [languages, setLanguages] = useState<TargetLanguage[]>([]);
  const [languagesLoaded, setLanguagesLoaded] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [isSavingLanguage, setIsSavingLanguage] = useState(false);
  const [languageError, setLanguageError] = useState<string | null>(null);

  // CEFR level editing
  const [editingLevel, setEditingLevel] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [isSavingLevel, setIsSavingLevel] = useState(false);
  const [levelError, setLevelError] = useState<string | null>(null);

  // Load languages when editing is opened
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
    if (editingLanguage && !languagesLoaded) {
      loadLanguages();
    }
  }, [editingLanguage, languagesLoaded, loadLanguages]);

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
      } else {
        setLevelError('Failed to update level. Please try again.');
      }
    } catch {
      setLevelError('An error occurred. Please try again.');
    } finally {
      setIsSavingLevel(false);
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
      setShowDeleteConfirm(false);
    }
  };

  return (
    <AuthGuard>
      <section className="py-2xl">
        <div className="max-w-[560px] mx-auto px-md">
          <h1 className="text-display-md text-primary mb-xl text-center">Profile</h1>

          {/* User info */}
          <div className="card hover:transform-none mb-lg" style={{ animation: 'none' }}>
            <div className="flex items-center gap-md mb-lg">
              <div className="w-[56px] h-[56px] bg-primary rounded-full flex items-center justify-center text-white text-[24px] font-semibold shrink-0">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <p className="text-title-lg text-primary">{user?.email || 'User'}</p>
                {user?.cefrLevel && (
                  <p className="text-body-md text-text-secondary">Level {user.cefrLevel}</p>
                )}
              </div>
            </div>

            <div className="border-t border-border pt-[4px]">
              {/* Learning Language */}
              <div className="flex items-center justify-between py-[14px] border-b border-border">
                <div>
                  <span className="text-[13px] text-text-secondary block mb-[2px]">Learning</span>
                  <span className="text-[15px] text-primary font-medium">
                    {getLanguageFlag(user?.targetLanguage || null)}{' '}
                    {getLanguageDisplayName(user?.targetLanguage || null)}
                  </span>
                </div>
                <button
                  onClick={handleToggleLanguageEdit}
                  className="text-[13px] font-medium text-primary-light hover:text-primary cursor-pointer bg-transparent border border-primary-light rounded-full px-[14px] py-[6px] transition-colors"
                >
                  {editingLanguage ? 'Cancel' : 'Change'}
                </button>
              </div>

              {/* Language editor */}
              {editingLanguage && (
                <div className="py-[16px] animate-fadeIn">
                  {languages.length === 0 && !languageError && (
                    <div className="flex justify-center py-[20px]">
                      <div className="loading-spinner" />
                    </div>
                  )}
                  {languages.length > 0 && (
                    <>
                      <div className="flex flex-col gap-[6px] max-h-[260px] overflow-y-auto mb-[12px]">
                        {languages.map((lang) => (
                          <button
                            key={lang.code}
                            onClick={() => setSelectedLanguage(lang.code)}
                            className={`
                              flex items-center gap-[10px] p-[10px] rounded-lg border transition-all duration-200 cursor-pointer text-left w-full
                              ${selectedLanguage === lang.code
                                ? 'border-primary bg-white shadow-sm'
                                : 'border-border bg-surface hover:border-primary-light'
                              }
                            `}
                          >
                            <span className="text-[22px] leading-none">{FLAG_MAP[lang.code] || ''}</span>
                            <div className="flex-1">
                              <p className="text-[14px] font-medium text-primary">{lang.name}</p>
                            </div>
                            <div className={`
                              w-[20px] h-[20px] rounded-full border-2 flex items-center justify-center shrink-0
                              ${selectedLanguage === lang.code ? 'border-primary bg-primary' : 'border-border'}
                            `}>
                              {selectedLanguage === lang.code && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={handleSaveLanguage}
                        disabled={!selectedLanguage || isSavingLanguage}
                        className={`btn-primary w-full text-[14px] py-[10px] ${(!selectedLanguage || isSavingLanguage) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {isSavingLanguage ? 'Saving...' : 'Save Language'}
                      </button>
                    </>
                  )}
                  {languageError && (
                    <div className="text-center py-[8px]">
                      <p className="text-[13px] text-incorrect mb-[8px]">{languageError}</p>
                      <button
                        onClick={() => { setLanguagesLoaded(false); loadLanguages(); }}
                        className="text-[13px] font-medium text-primary-light hover:text-primary cursor-pointer bg-transparent border-none"
                      >
                        Try again
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* CEFR Level */}
              <div className="flex items-center justify-between py-[14px]">
                <div>
                  <span className="text-[13px] text-text-secondary block mb-[2px]">CEFR Level</span>
                  <span className="text-[15px] text-primary font-medium">{user?.cefrLevel || 'Not set'}</span>
                </div>
                <button
                  onClick={handleToggleLevelEdit}
                  className="text-[13px] font-medium text-primary-light hover:text-primary cursor-pointer bg-transparent border border-primary-light rounded-full px-[14px] py-[6px] transition-colors"
                >
                  {editingLevel ? 'Cancel' : 'Change'}
                </button>
              </div>

              {/* Level editor */}
              {editingLevel && (
                <div className="py-[16px] animate-fadeIn">
                  <div className="flex flex-col gap-[6px] mb-[12px]">
                    {CEFR_LEVELS.map((level) => (
                      <button
                        key={level.code}
                        onClick={() => level.available && setSelectedLevel(level.code)}
                        disabled={!level.available}
                        className={`
                          flex items-center gap-[10px] p-[10px] rounded-lg border transition-all duration-200 text-left w-full
                          ${!level.available
                            ? 'opacity-50 cursor-not-allowed border-border bg-gray-50'
                            : selectedLevel === level.code
                              ? 'border-primary bg-white shadow-sm cursor-pointer'
                              : 'border-border bg-surface hover:border-primary-light cursor-pointer'
                          }
                        `}
                      >
                        <div className={`
                          w-[36px] h-[36px] rounded-md flex items-center justify-center font-semibold text-[13px] shrink-0
                          ${selectedLevel === level.code
                            ? 'bg-primary text-white'
                            : !level.available
                              ? 'bg-gray-200 text-gray-400'
                              : 'bg-background text-primary'
                          }
                        `}>
                          {level.code}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-medium text-primary">{level.name}</p>
                          <p className="text-[12px] text-text-secondary">{level.description}</p>
                        </div>
                        {!level.available ? (
                          <span className="text-[11px] font-medium text-text-secondary bg-gray-200 px-[6px] py-[2px] rounded-full shrink-0">
                            Soon
                          </span>
                        ) : (
                          <div className={`
                            w-[20px] h-[20px] rounded-full border-2 flex items-center justify-center shrink-0
                            ${selectedLevel === level.code ? 'border-primary bg-primary' : 'border-border'}
                          `}>
                            {selectedLevel === level.code && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  {levelError && (
                    <p className="text-[13px] text-incorrect text-center mb-[8px]">{levelError}</p>
                  )}
                  <button
                    onClick={handleSaveLevel}
                    disabled={!selectedLevel || isSavingLevel}
                    className={`btn-primary w-full text-[14px] py-[10px] ${(!selectedLevel || isSavingLevel) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isSavingLevel ? 'Saving...' : 'Save Level'}
                  </button>
                  <Link
                    href="/assessment"
                    className="block text-center mt-[10px] text-primary-light hover:text-primary text-[13px] font-medium transition-colors"
                  >
                    Not sure? Take a quick assessment
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Links */}
          <div className="flex flex-col gap-[8px] mb-lg">
            <Link href="/progress" className="card hover:transform-none flex items-center justify-between" style={{ animation: 'none' }}>
              <div className="flex items-center gap-md">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4A2462" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
                </svg>
                <span className="text-title-md text-primary">Progress & Statistics</span>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666276" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>

            <Link href="/assessment" className="card hover:transform-none flex items-center justify-between" style={{ animation: 'none' }}>
              <div className="flex items-center gap-md">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4A2462" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                </svg>
                <span className="text-title-md text-primary">Retake Level Assessment</span>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666276" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-md">
            <button
              onClick={() => { logout(); router.replace('/'); }}
              className="btn-secondary w-full"
            >
              Log Out
            </button>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-body-md text-text-secondary hover:text-incorrect text-center cursor-pointer bg-transparent border-none py-sm transition-colors"
              >
                Delete Account
              </button>
            ) : (
              <div className="card border-incorrect hover:transform-none" style={{ animation: 'none' }}>
                <p className="text-body-md text-primary mb-md text-center">
                  Are you sure? This will permanently delete your account and all progress.
                </p>
                <div className="flex gap-md">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="btn-secondary flex-1"
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    className="flex-1 bg-incorrect text-white border-none rounded-md px-[24px] py-[16px] text-[16px] font-medium cursor-pointer transition-all duration-200 disabled:opacity-50"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </AuthGuard>
  );
}

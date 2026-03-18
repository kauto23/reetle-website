'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const STORAGE_KEY = 'reetle-mobile-nudge-dismissed';

export default function MobileGuestNudge() {
  const { isAuthenticated } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isAuthenticated) return;
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) setVisible(true);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!visible) return;
    const mq = window.matchMedia('(min-width: 768px)');
    const apply = () => {
      document.body.style.overflow = mq.matches ? '' : 'hidden';
    };
    apply();
    mq.addEventListener('change', apply);
    return () => {
      mq.removeEventListener('change', apply);
      document.body.style.overflow = '';
    };
  }, [visible]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[2000] md:hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-primary-dark/80 backdrop-blur-sm" />

      {/* Arrow pointing at burger menu (top-right) */}
      <div className="absolute top-[10px] right-[18px] flex flex-col items-center animate-bounce">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="19" x2="12" y2="5" />
          <polyline points="5 12 12 5 19 12" />
        </svg>
      </div>

      {/* Content card */}
      <div className="absolute inset-x-[16px] top-[60px] bg-white rounded-xl p-[24px] shadow-2xl animate-fadeIn">
        <div className="flex flex-col items-center text-center gap-[16px]">
          {/* Icon */}
          <div className="w-[56px] h-[56px] rounded-full bg-primary/10 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4A2462" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </div>

          <div>
            <h2 className="text-[18px] font-semibold text-primary mb-[6px]">
              Personalise your feed
            </h2>
            <p className="text-[14px] text-text-secondary leading-[1.5]">
              Tap the <strong className="text-primary">menu</strong> at the top right to
              change your <strong className="text-primary">language</strong> and
              reading <strong className="text-primary">level</strong> at any time.
            </p>
          </div>

          {/* Visual preview of what's in the menu */}
          <div className="w-full bg-primary rounded-lg p-[14px] space-y-[10px]">
            <div>
              <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wide mb-[6px]">Language</p>
              <div className="flex flex-wrap gap-[4px]">
                {['Spanish', 'French', 'German', 'Italian'].map(lang => (
                  <span
                    key={lang}
                    className={`text-[11px] font-medium px-[10px] py-[4px] rounded-md border ${
                      lang === 'Spanish'
                        ? 'bg-white text-primary border-white'
                        : 'bg-transparent text-white/60 border-white/20'
                    }`}
                  >
                    {lang}
                  </span>
                ))}
                <span className="text-[11px] text-white/40 px-[4px] py-[4px]">+more</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wide mb-[6px]">Level</p>
              <div className="flex flex-wrap gap-[4px]">
                {['Beginner', 'Elementary', 'Intermediate', 'Upper Int.'].map(level => (
                  <span
                    key={level}
                    className={`text-[11px] font-medium px-[10px] py-[4px] rounded-md border ${
                      level === 'Elementary'
                        ? 'bg-white text-primary border-white'
                        : 'bg-transparent text-white/60 border-white/20'
                    }`}
                  >
                    {level}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={dismiss}
            className="w-full bg-primary text-white font-medium py-[14px] rounded-lg text-[15px] cursor-pointer border-none transition-colors hover:bg-primary-dark active:bg-primary-dark"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import AuthGuard from '@/components/layout/AuthGuard';
import { getQuestionStats, getMasteredWordsStats, getArticleStats } from '@/services/api';
import type {
  QuestionStatsResponse,
  MasteredWordsStatsResponse,
  ArticleStatsResponse,
  MasteredWordEntry,
} from '@/types/stats';

const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });

type TimeRange = '7' | '30';

interface PeriodStats {
  questions: QuestionStatsResponse | null;
  mastered: MasteredWordsStatsResponse | null;
  articles: ArticleStatsResponse | null;
}

// ---------------------------------------------------------------------------
// Accuracy Ring SVG
// ---------------------------------------------------------------------------

function AccuracyRing({ accuracy, size = 100, strokeWidth = 8 }: { accuracy: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (accuracy / 100) * circumference;
  const center = size / 2;

  const color = accuracy >= 75 ? '#34D399' : accuracy >= 50 ? '#F59E0B' : '#F87171';

  return (
    <svg width={size} height={size} className="block mx-auto">
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="#E5E3E8"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={circumference - filled}
        strokeLinecap="round"
        transform={`rotate(-90 ${center} ${center})`}
        className="transition-all duration-700 ease-out"
      />
      <text
        x={center}
        y={center}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-primary font-semibold"
        fontSize={size * 0.22}
      >
        {Math.round(accuracy)}%
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Custom Tooltip for Activity Chart
// ---------------------------------------------------------------------------

function ActivityTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) {
  if (!active || !payload?.length) return null;

  const correct = payload.find(p => p.dataKey === 'correct')?.value ?? 0;
  const incorrect = payload.find(p => p.dataKey === 'incorrect')?.value ?? 0;
  const total = correct + incorrect;
  const acc = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <div className="bg-white border border-border rounded-lg p-sm shadow-md text-[12px]">
      <p className="font-semibold text-primary mb-[2px]">{label}</p>
      <p className="text-correct-text">{correct} correct</p>
      <p className="text-incorrect-text">{incorrect} incorrect</p>
      <p className="text-text-secondary mt-[2px]">{acc}% accuracy</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading Skeletons
// ---------------------------------------------------------------------------

function StatCardSkeleton() {
  return (
    <div className="card animate-pulse hover:transform-none" style={{ animation: 'none' }}>
      <div className="h-[80px] bg-gray-200 rounded-lg w-[80px] mx-auto mb-sm" />
      <div className="h-[28px] bg-gray-200 rounded w-1/3 mx-auto mb-xs" />
      <div className="h-[14px] bg-gray-200 rounded w-2/3 mx-auto" />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="card hover:transform-none animate-pulse" style={{ animation: 'none' }}>
      <div className="h-[20px] bg-gray-200 rounded w-1/4 mb-md" />
      <div className="flex items-end gap-[6px] h-[200px]">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-gray-200 rounded-t"
            style={{ height: `${30 + Math.random() * 60}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ProgressPage() {
  const [allStats, setAllStats] = useState<Record<TimeRange, PeriodStats>>({
    '7': { questions: null, mastered: null, articles: null },
    '30': { questions: null, mastered: null, articles: null },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('7');

  useEffect(() => {
    async function fetchAllStats() {
      setIsLoading(true);
      try {
        const [qWeekly, mWeekly, aWeekly, qMonthly, mMonthly, aMonthly] = await Promise.all([
          getQuestionStats('weekly').catch(() => null),
          getMasteredWordsStats('weekly').catch(() => null),
          getArticleStats('weekly').catch(() => null),
          getQuestionStats('monthly').catch(() => null),
          getMasteredWordsStats('monthly').catch(() => null),
          getArticleStats('monthly').catch(() => null),
        ]);
        setAllStats({
          '7': { questions: qWeekly, mastered: mWeekly, articles: aWeekly },
          '30': { questions: qMonthly, mastered: mMonthly, articles: aMonthly },
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchAllStats();
  }, []);

  // --- Active period data (switches instantly on toggle) ---

  const { questions: questionStats, mastered: masteredStats, articles: articleStats } = allStats[timeRange];

  const periodQuestions = questionStats?.summary?.questions_answered_in_period ?? 0;
  const periodCorrect = questionStats?.summary?.correct_answers ?? 0;
  const periodIncorrect = questionStats?.summary?.incorrect_answers ?? 0;
  const periodAccuracy = questionStats?.summary?.accuracy ?? 0;

  const periodWordsMastered = masteredStats?.summary?.words_mastered_in_period ?? 0;
  const totalWordsMastered = masteredStats?.total_mastered ?? 0;

  const periodArticles = articleStats?.summary?.articles_read_in_period ?? 0;
  const totalArticles = articleStats?.total_articles_read ?? 0;

  const totalQuestions = questionStats?.total_questions ?? 0;

  const chartData = useMemo(() => {
    const breakdown = questionStats?.breakdown;
    if (!breakdown?.length) return [];
    return breakdown.map(d => ({
      date: formatDate(d.date),
      correct: d.correct,
      incorrect: d.incorrect,
    }));
  }, [questionStats]);

  const recentMasteredWords = useMemo(() => {
    const breakdown = masteredStats?.breakdown;
    if (!breakdown?.length) return [];
    const flat: Array<MasteredWordEntry & { date: string }> = [];
    for (const day of breakdown) {
      for (const word of day.mastered_words) {
        flat.push({ ...word, date: day.date });
      }
    }
    flat.sort((a, b) => b.date.localeCompare(a.date));
    return flat.slice(0, 8);
  }, [masteredStats]);

  const isEmptyState = !isLoading && periodQuestions === 0 && periodWordsMastered === 0 && periodArticles === 0;
  const periodLabel = timeRange === '7' ? 'this week' : 'this month';

  return (
    <AuthGuard>
      <section className="py-2xl">
        <div className="max-w-[860px] mx-auto px-md">
          {/* Header */}
          <h1 className="text-display-md text-primary mb-md text-center">Your Progress</h1>

          {/* Period toggle */}
          <div className="flex justify-center gap-[4px] mb-xl bg-background rounded-full p-[4px] w-fit mx-auto border border-border">
            <button
              onClick={() => setTimeRange('7')}
              className={`px-[20px] py-[8px] rounded-full text-[14px] font-medium transition-all border-none cursor-pointer ${
                timeRange === '7'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-transparent text-text-secondary hover:text-primary'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setTimeRange('30')}
              className={`px-[20px] py-[8px] rounded-full text-[14px] font-medium transition-all border-none cursor-pointer ${
                timeRange === '30'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-transparent text-text-secondary hover:text-primary'
              }`}
            >
              This Month
            </button>
          </div>

          {isLoading ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-md mb-xl">
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
              </div>
              <ChartSkeleton />
            </>
          ) : isEmptyState ? (
            /* ---- Empty state ---- */
            <div className="card text-center py-2xl hover:transform-none" style={{ animation: 'none' }}>
              <div className="text-[48px] mb-md">📚</div>
              <h2 className="text-title-lg text-primary mb-sm">No activity {periodLabel}</h2>
              <p className="text-body-md text-text-secondary mb-xl max-w-[400px] mx-auto">
                Start reading articles and practising vocabulary to see your progress here.
              </p>
              <div className="flex justify-center gap-md flex-wrap">
                <Link href="/" className="btn-primary btn-sm">
                  Start Reading
                </Link>
                <Link href="/practice" className="btn-secondary btn-sm">
                  Practice Vocabulary
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* ---- Stat cards ---- */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-md mb-xl">
                {/* Practice card */}
                <div className="card text-center hover:transform-none" style={{ animation: 'none' }}>
                  {periodQuestions > 0 ? (
                    <AccuracyRing accuracy={periodAccuracy} size={96} strokeWidth={7} />
                  ) : (
                    <div className="w-[96px] h-[96px] rounded-full border-[7px] border-border mx-auto flex items-center justify-center">
                      <span className="text-text-secondary text-[18px] font-semibold">--</span>
                    </div>
                  )}
                  <p className="text-[28px] font-bold text-primary mt-sm">{periodQuestions}</p>
                  <p className="text-body-md text-text-secondary">Questions Practiced</p>
                  {periodQuestions > 0 && (
                    <div className="flex justify-center gap-md mt-xs text-[12px]">
                      <span className="text-correct-text">{periodCorrect} correct</span>
                      <span className="text-incorrect-text">{periodIncorrect} incorrect</span>
                    </div>
                  )}
                </div>

                {/* Words mastered card */}
                <div className="card text-center hover:transform-none flex flex-col justify-center" style={{ animation: 'none' }}>
                  <div className="w-[96px] h-[96px] rounded-full bg-primary/5 mx-auto flex items-center justify-center mb-sm">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4A2462" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <p className="text-[28px] font-bold text-primary">{periodWordsMastered}</p>
                  <p className="text-body-md text-text-secondary">Words Mastered</p>
                  <p className="text-[12px] text-text-secondary mt-xs">{totalWordsMastered} total</p>
                </div>

                {/* Articles read card */}
                <div className="card text-center hover:transform-none flex flex-col justify-center" style={{ animation: 'none' }}>
                  <div className="w-[96px] h-[96px] rounded-full bg-primary/5 mx-auto flex items-center justify-center mb-sm">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4A2462" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2" />
                      <path d="M7 10h4M7 14h6" />
                    </svg>
                  </div>
                  <p className="text-[28px] font-bold text-primary">{periodArticles}</p>
                  <p className="text-body-md text-text-secondary">Articles Read</p>
                  <p className="text-[12px] text-text-secondary mt-xs">{totalArticles} total</p>
                </div>
              </div>

              {/* ---- Daily Activity Chart ---- */}
              {chartData.length > 0 ? (
                <div className="card hover:transform-none mb-lg" style={{ animation: 'none' }}>
                  <h2 className="text-title-lg text-primary mb-md">Daily Activity</h2>
                  <div className="flex gap-md mb-md text-[12px]">
                    <span className="flex items-center gap-[4px]">
                      <span className="inline-block w-[10px] h-[10px] rounded-sm bg-correct" />
                      Correct
                    </span>
                    <span className="flex items-center gap-[4px]">
                      <span className="inline-block w-[10px] h-[10px] rounded-sm bg-incorrect" />
                      Incorrect
                    </span>
                  </div>
                  <div className="w-full h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} barCategoryGap="20%">
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11, fill: '#666276' }}
                          axisLine={{ stroke: '#E5E3E8' }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: '#666276' }}
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip content={<ActivityTooltip />} cursor={{ fill: 'rgba(74,36,98,0.04)' }} />
                        <Bar dataKey="correct" stackId="activity" fill="#34D399" name="Correct" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="incorrect" stackId="activity" fill="#F87171" name="Incorrect" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="card hover:transform-none mb-lg text-center py-xl" style={{ animation: 'none' }}>
                  <p className="text-body-md text-text-secondary">No practice activity {periodLabel}.</p>
                  <Link href="/practice" className="text-primary text-body-md font-medium mt-sm inline-block hover:underline">
                    Start practising
                  </Link>
                </div>
              )}

              {/* ---- Recently Mastered Words ---- */}
              <div className="card hover:transform-none mb-lg" style={{ animation: 'none' }}>
                <div className="flex items-center justify-between mb-md">
                  <h2 className="text-title-lg text-primary">Recently Mastered Words</h2>
                  {totalWordsMastered > 0 && (
                    <Link
                      href="/progress/mastered-words"
                      className="text-body-md text-primary font-medium hover:underline flex items-center gap-[4px]"
                    >
                      View all
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </Link>
                  )}
                </div>
                {recentMasteredWords.length > 0 ? (
                  <div className="flex flex-col gap-[6px]">
                    {recentMasteredWords.map((word, i) => (
                      <div
                        key={`${word.target_word}-${i}`}
                        className="flex items-center justify-between py-[10px] px-md bg-background rounded-lg"
                      >
                        <div className="flex items-center gap-[8px]">
                          <span className="text-title-md text-primary">{word.target_word}</span>
                          <span className="text-text-secondary text-body-md">→</span>
                          <span className="text-body-md text-text-secondary">{word.familiar_word}</span>
                        </div>
                        <span className="text-[12px] text-text-secondary whitespace-nowrap">
                          {formatDateReadable(word.date)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-body-md text-text-secondary text-center py-md">
                    No words mastered {periodLabel}. Keep practising to grow your vocabulary!
                  </p>
                )}
              </div>

              {/* ---- All-Time Summary ---- */}
              <div className="flex justify-center items-center gap-[6px] text-[13px] text-text-secondary flex-wrap py-sm">
                <span>All time:</span>
                <span className="font-medium">{totalQuestions}</span> questions
                <span className="text-border">·</span>
                <span className="font-medium">{totalWordsMastered}</span> words
                <span className="text-border">·</span>
                <span className="font-medium">{totalArticles}</span> articles
              </div>
            </>
          )}
        </div>
      </section>
    </AuthGuard>
  );
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatDateReadable(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

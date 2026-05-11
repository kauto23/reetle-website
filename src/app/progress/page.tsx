'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { BookOpen, ChevronRight, Library } from 'lucide-react';
import AuthGuard from '@/components/layout/AuthGuard';
import { getQuestionStats, getMasteredWordsStats, getArticleStats } from '@/services/api';
import type {
  QuestionStatsResponse,
  MasteredWordsStatsResponse,
  ArticleStatsResponse,
  MasteredWordEntry,
} from '@/types/stats';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

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
    <Card>
      <CardContent className="p-6">
        <Skeleton className="h-[80px] w-[80px] rounded-full mx-auto mb-3" />
        <Skeleton className="h-7 w-1/3 mx-auto mb-1" />
        <Skeleton className="h-3.5 w-2/3 mx-auto" />
      </CardContent>
    </Card>
  );
}

function ChartSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <Skeleton className="h-5 w-1/4 mb-4" />
        <div className="flex items-end gap-1.5 h-[200px]">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton
              key={i}
              className="flex-1 rounded-t"
              style={{ height: `${30 + (i * 13) % 60}%` }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
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
      <section className="py-12 sm:py-16">
        <div className="max-w-[860px] mx-auto px-4">
          <h1 className="text-[28px] font-semibold tracking-tight text-ui-foreground mb-4 text-center">Your Progress</h1>

          <div className="flex justify-center mb-8">
            <ToggleGroup
              type="single"
              value={timeRange}
              onValueChange={(v) => v && setTimeRange(v as TimeRange)}
              className="bg-ui-background rounded-full p-1 border border-ui-border gap-0"
            >
              <ToggleGroupItem
                value="7"
                className="px-5 py-1.5 rounded-full text-[14px] data-[state=on]:bg-ui-primary data-[state=on]:text-white data-[state=on]:shadow-sm"
              >
                This Week
              </ToggleGroupItem>
              <ToggleGroupItem
                value="30"
                className="px-5 py-1.5 rounded-full text-[14px] data-[state=on]:bg-ui-primary data-[state=on]:text-white data-[state=on]:shadow-sm"
              >
                This Month
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {isLoading ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
              </div>
              <ChartSkeleton />
            </>
          ) : isEmptyState ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-[48px] mb-4">📚</div>
                <h2 className="text-[18px] font-semibold text-ui-foreground mb-2">No activity {periodLabel}</h2>
                <p className="text-[14px] text-ui-muted-foreground mb-6 max-w-[400px] mx-auto">
                  Start reading articles and practising vocabulary to see your progress here.
                </p>
                <div className="flex justify-center gap-3 flex-wrap">
                  <Button asChild size="sm">
                    <Link href="/">Start reading</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/practice">Practice vocabulary</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <Card>
                  <CardContent className="p-6 text-center">
                    {periodQuestions > 0 ? (
                      <AccuracyRing accuracy={periodAccuracy} size={96} strokeWidth={7} />
                    ) : (
                      <div className="w-24 h-24 rounded-full border-[7px] border-ui-border mx-auto flex items-center justify-center">
                        <span className="text-ui-muted-foreground text-[18px] font-semibold">--</span>
                      </div>
                    )}
                    <p className="text-[28px] font-bold text-ui-foreground mt-3">{periodQuestions}</p>
                    <p className="text-[14px] text-ui-muted-foreground">Questions practiced</p>
                    {periodQuestions > 0 && (
                      <div className="flex justify-center gap-3 mt-1 text-[12px]">
                        <span className="text-correct-text">{periodCorrect} correct</span>
                        <span className="text-incorrect-text">{periodIncorrect} incorrect</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6 text-center flex flex-col justify-center">
                    <div className="w-24 h-24 rounded-full bg-ui-primary/5 mx-auto flex items-center justify-center mb-3">
                      <Library className="w-10 h-10 text-ui-primary" strokeWidth={1.5} />
                    </div>
                    <p className="text-[28px] font-bold text-ui-foreground">{periodWordsMastered}</p>
                    <p className="text-[14px] text-ui-muted-foreground">Words mastered</p>
                    <p className="text-[12px] text-ui-muted-foreground mt-1">{totalWordsMastered} total</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6 text-center flex flex-col justify-center">
                    <div className="w-24 h-24 rounded-full bg-ui-primary/5 mx-auto flex items-center justify-center mb-3">
                      <BookOpen className="w-10 h-10 text-ui-primary" strokeWidth={1.5} />
                    </div>
                    <p className="text-[28px] font-bold text-ui-foreground">{periodArticles}</p>
                    <p className="text-[14px] text-ui-muted-foreground">Articles read</p>
                    <p className="text-[12px] text-ui-muted-foreground mt-1">{totalArticles} total</p>
                  </CardContent>
                </Card>
              </div>

              {chartData.length > 0 ? (
                <Card className="mb-6">
                  <CardContent className="p-6">
                    <h2 className="text-[18px] font-semibold text-ui-foreground mb-4">Daily Activity</h2>
                    <div className="flex gap-4 mb-4 text-[12px] text-ui-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block w-2.5 h-2.5 rounded-sm bg-correct" />
                        Correct
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block w-2.5 h-2.5 rounded-sm bg-incorrect" />
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
                  </CardContent>
                </Card>
              ) : (
                <Card className="mb-6">
                  <CardContent className="p-8 text-center">
                    <p className="text-[14px] text-ui-muted-foreground">No practice activity {periodLabel}.</p>
                    <Button asChild variant="link" className="mt-2">
                      <Link href="/practice">Start practising</Link>
                    </Button>
                  </CardContent>
                </Card>
              )}

              <Card className="mb-6">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[18px] font-semibold text-ui-foreground">Recently mastered words</h2>
                    {totalWordsMastered > 0 && (
                      <Link
                        href="/progress/mastered-words"
                        className="text-[14px] text-ui-primary font-medium hover:underline flex items-center gap-1"
                      >
                        View all
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                  {recentMasteredWords.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      {recentMasteredWords.map((word, i) => (
                        <div
                          key={`${word.target_word}-${i}`}
                          className="flex items-center justify-between py-2.5 px-4 bg-ui-background rounded-md"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[16px] font-medium text-ui-foreground">{word.target_word}</span>
                            <span className="text-ui-muted-foreground">→</span>
                            <span className="text-[14px] text-ui-muted-foreground">{word.familiar_word}</span>
                          </div>
                          <span className="text-[12px] text-ui-muted-foreground whitespace-nowrap">
                            {formatDateReadable(word.date)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[14px] text-ui-muted-foreground text-center py-4">
                      No words mastered {periodLabel}. Keep practising to grow your vocabulary!
                    </p>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-center items-center gap-1.5 text-[13px] text-ui-muted-foreground flex-wrap py-3">
                <span>All time:</span>
                <span className="font-medium">{totalQuestions}</span> questions
                <span className="text-ui-border">·</span>
                <span className="font-medium">{totalWordsMastered}</span> words
                <span className="text-ui-border">·</span>
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

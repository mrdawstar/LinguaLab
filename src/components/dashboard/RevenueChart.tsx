import { useEffect, useState } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Bar,
  ComposedChart
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO, isValid, subDays, subMonths, subWeeks, startOfMonth, endOfMonth, eachMonthOfInterval, eachDayOfInterval, startOfWeek, startOfDay, isSameDay, endOfDay } from 'date-fns';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { pl } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type Period = '12months' | 'month' | 'week' | 'day';

export function RevenueChart() {
  const { schoolId } = useAuth();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<Period>('month');
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const updateSize = () => setIsCompact(window.innerWidth < 640);
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (!schoolId) return;
    const channel = supabase
      .channel(`lesson-attendance-revenue-${schoolId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lesson_attendance' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['revenue', schoolId] });
          queryClient.invalidateQueries({ queryKey: ['monthlyRevenue', schoolId] });
          queryClient.invalidateQueries({ queryKey: ['actualRevenue', schoolId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [schoolId, queryClient]);

  // Calculate previous period dates (calendar-based)
  const getPreviousPeriodDates = (currentPeriod: Period) => {
    const now = new Date();
    let prevStartDate: Date;
    let prevEndDate: Date;

    switch (currentPeriod) {
      case 'day': {
        // Previous day (yesterday)
        const yesterday = subDays(now, 1);
        prevStartDate = startOfDay(yesterday);
        prevEndDate = endOfDay(yesterday);
        break;
      }
      case 'week':
        // Previous 7 days (7-13 days ago) - consistent with current period which is last 7 days
        prevEndDate = endOfDay(subDays(now, 7));
        prevStartDate = startOfDay(subDays(now, 13));
        break;
      case 'month':
        // Previous 30 days (30-59 days ago) - consistent with current period which is last 30 days
        prevEndDate = endOfDay(subDays(now, 30));
        prevStartDate = startOfDay(subDays(now, 59));
        break;
      case '12months':
      default: {
        // Previous 12 calendar months (12-23 months ago)
        // Example: if current is Jan-Dec 2024, previous is Jan-Dec 2023
        const currentYearStart = startOfMonth(subMonths(now, 11));
        const prevYearStart = subMonths(currentYearStart, 12);
        const prevYearEnd = subMonths(currentYearStart, 1);
        prevStartDate = startOfDay(prevYearStart);
        prevEndDate = endOfDay(endOfMonth(prevYearEnd));
        break;
      }
    }

    return { prevStartDate, prevEndDate };
  };

  const { data: revenueData = [], isLoading } = useQuery({
    queryKey: ['revenue', schoolId, period],
    queryFn: async () => {
      if (!schoolId) return [];

      const now = new Date();
      let startDate: Date;
      const endDate: Date = now;

      switch (period) {
        case 'day':
          startDate = startOfDay(now);
          break;
        case 'week':
          // Always show last 7 days to avoid a cropped chart early in the week
          startDate = subDays(now, 6);
          break;
        case 'month':
          startDate = subDays(now, 29);
          break;
        case '12months':
        default:
          startDate = subMonths(now, 11);
          startDate = startOfMonth(startDate);
          break;
      }

      // Fetch revenue from lesson_attendance (after attendance is marked)
      const { data: attendanceRevenue, error: attendanceError } = await supabase
        .from('lesson_attendance')
        .select(`
          revenue_amount,
          created_at,
          lesson:lessons!lesson_id (
            school_id,
            date,
            start_time
          )
        `)
        .eq('attended', true)
        .not('revenue_amount', 'is', null);

      if (attendanceError) {
        console.error('Error fetching attendance revenue:', attendanceError);
        return [];
      }

      // Filter by school_id
      const schoolAttendance = attendanceRevenue?.filter((a: any) => 
        a.lesson?.school_id === schoolId
      ) || [];

      // Group data by period
      if (period === '12months') {
        const months = eachMonthOfInterval({ start: startDate, end: endDate });
        return months.map(month => {
          const monthStr = format(month, 'yyyy-MM');
          const monthRevenue = schoolAttendance.filter((a: any) => 
            a.lesson?.date && format(new Date(a.lesson.date), 'yyyy-MM') === monthStr
          );
          
          return {
            key: format(month, 'yyyy-MM'),
            revenue: monthRevenue.reduce((sum: number, a: any) => sum + (Number(a.revenue_amount) || 0), 0),
            lessons: monthRevenue.length,
          };
        });
      } else if (period === 'month' || period === 'week') {
        const days = eachDayOfInterval({ start: startDate, end: endDate });
        return days.map(day => {
          const dayStr = format(day, 'yyyy-MM-dd');
          const dayRevenue = schoolAttendance.filter((a: any) => 
            a.lesson?.date === dayStr
          );
          
          return {
            key: dayStr,
            revenue: dayRevenue.reduce((sum: number, a: any) => sum + (Number(a.revenue_amount) || 0), 0),
            lessons: dayRevenue.length,
          };
        });
      } else {
        // Day view - hourly breakdown based on attendance marking time
        const currentHour = now.getHours();
        const hours = Array.from({ length: currentHour + 1 }, (_, i) => i);
        const todayStr = format(now, 'yyyy-MM-dd');
        const todayAttendance = schoolAttendance.filter((a: any) => {
          const createdAt = a.created_at ? format(new Date(a.created_at), 'yyyy-MM-dd') : null;
          return createdAt === todayStr;
        });

        const revenueByHour = todayAttendance.reduce<Record<number, number>>((acc, item: any) => {
          const createdAt = item.created_at ? new Date(item.created_at) : null;
          const hour = createdAt ? createdAt.getHours() : null;
          if (hour === null || Number.isNaN(hour)) return acc;
          acc[hour] = (acc[hour] || 0) + (Number(item.revenue_amount) || 0);
          return acc;
        }, {});

        const lessonsByHour = todayAttendance.reduce<Record<number, number>>((acc, item: any) => {
          const createdAt = item.created_at ? new Date(item.created_at) : null;
          const hour = createdAt ? createdAt.getHours() : null;
          if (hour === null || Number.isNaN(hour)) return acc;
          acc[hour] = (acc[hour] || 0) + 1;
          return acc;
        }, {});

        return hours.map((hour) => ({
          key: hour,
          revenue: revenueByHour[hour] || 0,
          lessons: lessonsByHour[hour] || 0,
        }));
      }
    },
    enabled: !!schoolId,
  });

  const periodLabels: Record<Period, string> = {
    '12months': 'Ostatnie 12 miesięcy',
    'month': 'Ostatnie 30 dni',
    'week': 'Ostatni tydzień',
    'day': 'Dzisiaj (do teraz)',
  };

  const maxRevenue = revenueData.reduce((max, item) => Math.max(max, item.revenue || 0), 0);
  const maxLessons = revenueData.reduce((max, item) => Math.max(max, item.lessons || 0), 0);
  const yLeftMax = maxRevenue > 0 ? Math.max(1, Math.ceil(maxRevenue * 1.1)) : 1;
  const yRightMax = maxLessons > 0 ? Math.max(1, Math.ceil(maxLessons * 1.1)) : 1;

  // Calculate total revenue for the selected period
  const totalRevenue = revenueData.reduce((sum, item) => sum + (item.revenue || 0), 0);

  // Fetch previous period revenue for comparison
  const { data: previousPeriodRevenue = 0 } = useQuery({
    queryKey: ['revenue-previous', schoolId, period],
    queryFn: async () => {
      if (!schoolId) return 0;

      const { prevStartDate, prevEndDate } = getPreviousPeriodDates(period);

      // Fetch revenue from lesson_attendance for previous period
      const { data: attendanceRevenue, error: attendanceError } = await supabase
        .from('lesson_attendance')
        .select(`
          revenue_amount,
          lesson:lessons!lesson_id (
            school_id,
            date
          )
        `)
        .eq('attended', true)
        .not('revenue_amount', 'is', null);

      if (attendanceError) {
        console.error('Error fetching previous period revenue:', attendanceError);
        return 0;
      }

      // Filter by school_id and date range
      // Use string comparison for dates (YYYY-MM-DD format) to match main query logic
      const prevStartDateStr = format(prevStartDate, 'yyyy-MM-dd');
      const prevEndDateStr = format(prevEndDate, 'yyyy-MM-dd');
      
      const prevPeriodAttendance = attendanceRevenue?.filter((a: any) => {
        if (a.lesson?.school_id !== schoolId) return false;
        if (!a.lesson?.date) return false;
        
        // Compare date strings directly (format: YYYY-MM-DD)
        const lessonDateStr = a.lesson.date;
        return lessonDateStr >= prevStartDateStr && lessonDateStr <= prevEndDateStr;
      }) || [];

      const total = prevPeriodAttendance.reduce((sum: number, a: any) => sum + (Number(a.revenue_amount) || 0), 0);
      
      // Debug logging
      if (period === 'week') {
        console.log(`[RevenueChart] Previous ${period} period:`, {
          startDate: format(prevStartDate, 'yyyy-MM-dd'),
          endDate: format(prevEndDate, 'yyyy-MM-dd'),
          recordsCount: prevPeriodAttendance.length,
          totalRevenue: total
        });
      }
      
      return total;
    },
    enabled: !!schoolId,
  });

  // Calculate comparison
  const revenueChange = totalRevenue - previousPeriodRevenue;
  const hasPreviousData = previousPeriodRevenue > 0;
  const hasCurrentData = totalRevenue > 0;
  
  let revenueChangePercent: string;
  let isPositiveChange: boolean;
  
  // Debug logging
  if (period === 'week') {
    console.log(`[RevenueChart] Comparison for ${period}:`, {
      currentRevenue: totalRevenue,
      previousRevenue: previousPeriodRevenue,
      change: revenueChange,
      hasPreviousData,
      hasCurrentData
    });
  }
  
  if (!hasPreviousData && hasCurrentData) {
    // No previous period data (0 zł) but current period has data - show 100%+ increase
    revenueChangePercent = '100+';
    isPositiveChange = true;
  } else if (hasPreviousData && hasCurrentData) {
    // Both periods have data - calculate actual percentage change
    const percentChange = (revenueChange / previousPeriodRevenue) * 100;
    revenueChangePercent = percentChange.toFixed(1);
    isPositiveChange = revenueChange >= 0;
  } else if (hasPreviousData && !hasCurrentData) {
    // Previous period had data but current doesn't - show decrease
    revenueChangePercent = '-100.0';
    isPositiveChange = false;
  } else {
    // No data in either period
    revenueChangePercent = '0.0';
    isPositiveChange = false;
  }

  const xInterval =
    period === 'week'
      ? 0
      : period === 'day'
      ? (isCompact ? 2 : 1)
      : 'preserveStartEnd';

  const formatTick = (value: string | number) => {
    if (period === 'day') {
      if (typeof value !== 'number') return value;
      return `${value.toString().padStart(2, '0')}:00`;
    }
    if (typeof value !== 'string') return value;
    if (period === '12months') {
      const date = parseISO(`${value}-01`);
      if (!isValid(date)) return value;
      return format(date, 'LLL', { locale: pl });
    }
    const date = parseISO(value);
    if (!isValid(date)) return value;
    return period === 'week'
      ? format(date, isCompact ? 'EE' : 'EEE dd', { locale: pl })
      : format(date, 'd', { locale: pl });
  };

  const formatTooltipLabel = (value: string | number) => {
    if (period === 'day') return formatTick(value);
    if (typeof value !== 'string') return String(value);
    if (period === '12months') {
      const date = parseISO(`${value}-01`);
      if (!isValid(date)) return value;
      return format(date, 'LLLL yyyy', { locale: pl });
    }
    const date = parseISO(value);
    if (!isValid(date)) return value;
    return format(date, 'd MMMM yyyy', { locale: pl });
  };

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-3 shadow-sm sm:p-4 lg:p-6 h-full flex flex-col min-h-0 w-full">
      <div className="mb-3 flex flex-col gap-3 sm:mb-4 lg:mb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground sm:text-base lg:text-lg">Przychody</h3>
          <p className="mt-0.5 text-[10px] text-muted-foreground sm:text-xs lg:text-sm">{periodLabels[period]}</p>
        </div>
        <div className="flex items-baseline gap-1.5 sm:gap-2 lg:gap-3">
          {!isLoading && hasCurrentData && (
            <div className="flex items-center gap-1">
              {isPositiveChange ? (
                <TrendingUp className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
              )}
              <span className={cn(
                "text-xs font-medium",
                isPositiveChange 
                  ? "text-green-600 dark:text-green-400" 
                  : "text-red-600 dark:text-red-400"
              )}>
                {isPositiveChange ? '+' : ''}{revenueChangePercent}%
              </span>
            </div>
          )}
          {!isLoading && (
            <div className="text-right">
              <span className="text-xl font-bold text-primary sm:text-2xl lg:text-3xl">
                {totalRevenue.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
              <span className="ml-0.5 text-base font-semibold text-muted-foreground sm:text-lg lg:text-xl">zł</span>
            </div>
          )}
          {isLoading && (
            <div className="text-right">
              <span className="text-2xl font-semibold text-muted-foreground/50 sm:text-3xl">—</span>
            </div>
          )}
        </div>
        <div className="relative flex w-full flex-wrap items-center gap-1 rounded-2xl border border-border/60 bg-muted/40 p-1 sm:w-auto sm:flex-nowrap sm:rounded-full">
          <span
            className={cn(
              'absolute inset-y-1 hidden rounded-full bg-primary transition-all duration-300 ease-out sm:block',
              period === '12months' && 'left-1 w-[3.25rem]',
              period === 'month' && 'left-[3.6rem] w-[3.25rem]',
              period === 'week' && 'left-[7.2rem] w-[3.25rem]',
              period === 'day' && 'left-[10.8rem] w-[3.5rem]'
            )}
          />
          {(['12months', 'month', 'week', 'day'] as Period[]).map((p) => {
            const isActive = period === p;
            return (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  'relative z-10 flex-1 whitespace-nowrap rounded-full px-2 py-1 text-[11px] font-semibold transition-all sm:flex-none sm:px-3 sm:text-xs',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm sm:bg-transparent sm:shadow-none'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {isCompact
                  ? p === '12months'
                    ? '12M'
                    : p === 'month'
                      ? 'M'
                      : p === 'week'
                        ? 'T'
                        : 'D'
                  : p === '12months'
                    ? '12M'
                    : p === 'month'
                      ? 'Mies.'
                      : p === 'week'
                        ? 'Tydz.'
                        : 'Dzień'}
              </button>
            );
          })}
        </div>
      </div>

      <>
        <div className="mb-3 flex items-center gap-3 sm:mb-4 sm:gap-4">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="h-2 w-2 rounded-full bg-primary sm:h-2.5 sm:w-2.5 lg:h-3 lg:w-3" />
            <span className="text-[10px] text-muted-foreground sm:text-[11px] lg:text-sm">Przychody</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="h-2 w-2 rounded-full bg-primary/30 sm:h-2.5 sm:w-2.5 lg:h-3 lg:w-3" />
            <span className="text-[10px] text-muted-foreground sm:text-[11px] lg:text-sm">Lekcje</span>
          </div>
        </div>

        <div className="h-[280px] sm:h-64 lg:h-80 w-full relative">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm text-muted-foreground">Ładowanie...</span>
            </div>
          ) : revenueData.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm text-muted-foreground">Brak danych</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                key={period}
                data={revenueData}
                margin={{
                  top: 16,
                  right: isCompact ? 18 : 28,
                  left: isCompact ? 18 : 28,
                  bottom: isCompact ? 6 : 12,
                }}
              >
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                vertical={false} 
                  strokeLinecap="round"
                stroke="hsl(var(--border))" 
              />
                <XAxis 
                  dataKey="key" 
                  scale="point"
                axisLine={false} 
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: isCompact ? 10 : 11 }}
                  interval={xInterval as any}
                tickMargin={isCompact ? 6 : 10}
                padding={{ left: 0, right: 0 }}
                  tickFormatter={formatTick}
              />
              <YAxis 
                yAxisId="left"
                axisLine={false} 
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: isCompact ? 10 : 11 }}
                tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k zł` : `${value} zł`}
                width={isCompact ? 42 : 48}
                tickMargin={isCompact ? 6 : 8}
                  domain={[0, yLeftMax]}
              />
                <YAxis
                yAxisId="right"
                orientation="right"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: isCompact ? 10 : 11 }}
                  tickFormatter={(value) => `${Math.round(Number(value))} lekc.`}
                width={isCompact ? 48 : 54}
                tickMargin={isCompact ? 6 : 8}
                  domain={[0, yRightMax]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                  labelFormatter={formatTooltipLabel}
                  formatter={(value: number, name: string) => [
                    name === 'revenue'
                      ? `${value.toLocaleString()} PLN`
                      : Math.round(Number(value)),
                    name === 'revenue' ? 'Przychód' : 'Lekcje'
                  ]}
                cursor={{ stroke: 'hsl(var(--primary))', strokeDasharray: '4 4', strokeOpacity: 0.4 }}
              />
              <Bar 
                dataKey="lessons" 
                yAxisId="right"
                fill="hsl(var(--primary))" 
                opacity={0.2}
                  radius={[10, 10, 10, 10]}
                  barSize={isCompact ? 16 : 24}
                isAnimationActive={true}
                animationDuration={700}
                animationEasing="ease-out"
              />
                <Area
                  type="monotoneX"
                dataKey="revenue"
                yAxisId="left"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                fill="url(#revenueGradient)"
                  baseValue={0}
                dot={false}
                activeDot={{
                  r: 5,
                  strokeWidth: 3,
                  stroke: 'hsl(var(--primary))',
                  fill: 'hsl(var(--background))',
                }}
                isAnimationActive={true}
                animationDuration={900}
                animationEasing="ease-out"
              />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </>
    </div>
  );
}

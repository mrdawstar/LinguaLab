import { DollarSign } from 'lucide-react';
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

export function MonthlyRevenueCard() {
  const { schoolId } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!schoolId) return;
    const channel = supabase
      .channel(`lesson-attendance-monthly-${schoolId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lesson_attendance' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['monthlyRevenue', schoolId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [schoolId, queryClient]);

  const { data: revenueData } = useQuery({
    queryKey: ['monthlyRevenue', schoolId],
    queryFn: async () => {
      if (!schoolId) return { current: 0, previous: 0 };

      const now = new Date();
      const currentMonthStart = startOfMonth(now);
      const currentMonthEnd = endOfMonth(now);
      const previousMonthStart = startOfMonth(subMonths(now, 1));
      const previousMonthEnd = endOfMonth(subMonths(now, 1));

      const { data: attendance } = await supabase
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

      const currentMonthRevenue = attendance
        ?.filter((a: any) => {
          if (!a.lesson || a.lesson.school_id !== schoolId) return false;
          const lessonDate = new Date(a.lesson.date);
          return lessonDate >= currentMonthStart && lessonDate <= currentMonthEnd;
        })
        .reduce((sum: number, a: any) => sum + (Number(a.revenue_amount) || 0), 0) || 0;

      const previousMonthRevenue = attendance
        ?.filter((a: any) => {
          if (!a.lesson || a.lesson.school_id !== schoolId) return false;
          const lessonDate = new Date(a.lesson.date);
          return lessonDate >= previousMonthStart && lessonDate <= previousMonthEnd;
        })
        .reduce((sum: number, a: any) => sum + (Number(a.revenue_amount) || 0), 0) || 0;

      return { current: currentMonthRevenue, previous: previousMonthRevenue };
    },
    enabled: !!schoolId,
  });

  const current = revenueData?.current || 0;
  const previous = revenueData?.previous || 0;
  const hasData = current > 0 || previous > 0;

  const percentChange = previous > 0 
    ? Math.round(((current - previous) / previous) * 100) 
    : current > 0 ? 100 : 0;

  const changeType = percentChange > 0 ? 'positive' : percentChange < 0 ? 'negative' : 'neutral';

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-3 shadow-sm transition-all hover:shadow-md sm:p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground sm:text-sm">Przychód (mies.)</p>
          <p className="mt-1 text-xl font-bold text-foreground sm:text-2xl lg:text-3xl">
            {hasData ? `${current.toLocaleString()} PLN` : '—'}
          </p>
          <p className={`mt-1 text-[10px] sm:text-xs ${
            changeType === 'positive' 
              ? 'text-emerald-600 dark:text-emerald-400' 
              : changeType === 'negative'
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-muted-foreground'
          }`}>
            {hasData 
              ? `${percentChange >= 0 ? '+' : ''}${percentChange}% vs poprzedni miesiąc`
              : 'Przychody po obecności'
            }
          </p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary sm:h-10 sm:w-10">
          <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </div>
    </div>
  );
}

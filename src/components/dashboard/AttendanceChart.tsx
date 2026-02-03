import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfWeek, endOfWeek } from 'date-fns';
import { PieChart as PieChartIcon } from 'lucide-react';

export function AttendanceChart() {
  const { schoolId } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['attendanceStats', schoolId],
    queryFn: async () => {
      if (!schoolId) return null;

      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

      // Get lessons for this week
      const { data: lessons, error: lessonsError } = await supabase
        .from('lessons')
        .select('id')
        .eq('school_id', schoolId)
        .gte('date', weekStart.toISOString().split('T')[0])
        .lte('date', weekEnd.toISOString().split('T')[0]);

      if (lessonsError) {
        console.error('Error fetching lessons:', lessonsError);
        return null;
      }

      if (!lessons || lessons.length === 0) {
        return null;
      }

      const lessonIds = lessons.map(l => l.id);

      // Get attendance for these lessons
      const { data: attendance, error: attendanceError } = await supabase
        .from('lesson_attendance')
        .select('attended')
        .in('lesson_id', lessonIds);

      if (attendanceError) {
        console.error('Error fetching attendance:', attendanceError);
        return null;
      }

      if (!attendance || attendance.length === 0) {
        return null;
      }

      const total = attendance.length;
      const present = attendance.filter(a => a.attended).length;
      const absent = attendance.filter(a => !a.attended).length;

      // Get counts for summary
      const { count: studentsCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', schoolId);

      const { count: teachersCount } = await supabase
        .from('teachers')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', schoolId);

      return {
        present: total > 0 ? Math.round((present / total) * 100) : 0,
        absent: total > 0 ? Math.round((absent / total) * 100) : 0,
        lessonsCount: lessons.length,
        studentsCount: studentsCount || 0,
        teachersCount: teachersCount || 0,
        hasData: total > 0,
      };
    },
    enabled: !!schoolId,
  });

  const hasData = stats?.hasData;

  const data = hasData
    ? [
        { name: 'Obecni', value: stats.present, color: 'hsl(142 76% 36%)' },
        { name: 'Nieobecni', value: stats.absent, color: 'hsl(0 84% 60%)' },
      ]
    : [];

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm sm:p-6 h-full flex flex-col">
      <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:gap-4">
        <div>
          <h3 className="text-base font-semibold text-foreground sm:text-lg">Statystyki obecności</h3>
          <p className="text-xs text-muted-foreground sm:text-sm">Ten tydzień</p>
        </div>
        {hasData && (
          <div className="rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-[11px] text-muted-foreground sm:text-xs">
            Średnio {stats?.present ?? 0}% obecności
          </div>
        )}
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center justify-center gap-3 py-8">
          <PieChartIcon className="h-12 w-12 text-muted-foreground/30" />
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground">Brak danych obecności</p>
            <p className="text-xs text-muted-foreground/70">Statystyki pojawią się po przeprowadzeniu zajęć</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
            <div className="group relative w-full max-w-[220px] aspect-square transition-transform duration-500 ease-out hover:scale-[1.03] sm:max-w-[280px]">
              <div className="absolute inset-[12%] rounded-full bg-card/90 shadow-sm transition-all duration-500 group-hover:shadow-md group-hover:shadow-primary/20" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <div className="text-2xl font-semibold text-foreground sm:text-3xl">
                    {stats?.present ?? 0}%
                  </div>
                  <div className="text-[11px] text-muted-foreground sm:text-xs">Obecni</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <linearGradient id="presentGradient" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="hsl(142 76% 36%)" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="hsl(142 76% 50%)" stopOpacity={0.9} />
                    </linearGradient>
                    <linearGradient id="absentGradient" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="hsl(0 84% 60%)" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="hsl(0 84% 45%)" stopOpacity={0.9} />
                    </linearGradient>
                  </defs>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius="62%"
                    outerRadius="86%"
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                    isAnimationActive={true}
                    animationDuration={900}
                    animationEasing="ease-out"
                  >
                    {data.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index === 0 ? "url(#presentGradient)" : "url(#absentGradient)"}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex-1 space-y-2 sm:space-y-3">
              {data.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 rounded-full sm:h-3 sm:w-3"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs text-muted-foreground sm:text-sm">{item.name}</span>
                  </div>
                  <span className="ml-4 text-xs font-semibold text-foreground sm:ml-6 sm:text-sm">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border/50 pt-4 sm:gap-4">
            <div className="rounded-xl border border-border/50 bg-muted/40 p-3 text-center">
              <p className="text-lg font-bold text-foreground sm:text-2xl">{stats?.lessonsCount || 0}</p>
              <p className="text-[10px] text-muted-foreground sm:text-xs">Lekcji</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/40 p-3 text-center">
              <p className="text-lg font-bold text-foreground sm:text-2xl">{stats?.studentsCount || 0}</p>
              <p className="text-[10px] text-muted-foreground sm:text-xs">Uczniów</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/40 p-3 text-center">
              <p className="text-lg font-bold text-foreground sm:text-2xl">{stats?.teachersCount || 0}</p>
              <p className="text-[10px] text-muted-foreground sm:text-xs">Nauczycieli</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

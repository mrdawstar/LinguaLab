import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Check, X, MessageSquare, Loader2, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AttendanceRecord {
  id: string;
  attended: boolean;
  comment: string | null;
  created_at: string;
  lesson: {
    id: string;
    title: string;
    date: string;
    start_time: string;
    end_time: string;
    teacher: {
      name: string;
    } | null;
  } | null;
  student: {
    id: string;
    name: string;
  } | null;
}

export function AttendanceOverview() {
  const { schoolId } = useAuth();

  const { data: attendanceRecords = [], isLoading } = useQuery({
    queryKey: ['attendance-overview', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      
      // Fetch recent attendance records with comments
      const { data, error } = await supabase
        .from('lesson_attendance')
        .select(`
          id,
          attended,
          comment,
          created_at,
          lessons!inner (
            id,
            title,
            date,
            start_time,
            end_time,
            school_id,
            teachers (
              name
            )
          ),
          students (
            id,
            name
          )
        `)
        .eq('lessons.school_id', schoolId)
        .not('comment', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      return (data || []).map(record => ({
        id: record.id,
        attended: record.attended,
        comment: record.comment,
        created_at: record.created_at,
        lesson: record.lessons ? {
          id: record.lessons.id,
          title: record.lessons.title,
          date: record.lessons.date,
          start_time: record.lessons.start_time,
          end_time: record.lessons.end_time,
          teacher: record.lessons.teachers,
        } : null,
        student: record.students,
      })) as AttendanceRecord[];
    },
    enabled: !!schoolId,
  });

  const hasData = attendanceRecords.length > 0;

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm sm:p-6 flex flex-col h-full">
      <div className="mb-4 flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h3 className="text-base font-semibold text-foreground sm:text-lg">
          Komentarze do obecności
        </h3>
      </div>

      {/* Content area with dynamic height */}
      {/* Height adjusts to content, no fixed height to avoid empty space */}
      <div className="flex-1 flex flex-col min-h-0">
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center min-h-[150px]">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !hasData ? (
          <div className="flex flex-1 items-center justify-center min-h-[120px]">
            <div className="text-center">
              <Calendar className="mx-auto mb-3 h-12 w-12 opacity-30" />
              <p className="text-sm">Brak komentarzy do obecności</p>
            </div>
          </div>
        ) : (
        <div className="space-y-3 overflow-y-auto max-h-[400px]">
          {attendanceRecords.map(record => (
            <div
              key={record.id}
              className={cn(
                "rounded-xl p-3 border",
                record.attended 
                  ? "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800" 
                  : "bg-rose-50/50 border-rose-200 dark:bg-rose-900/10 dark:border-rose-800"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground">
                      {record.student?.name || 'Nieznany uczeń'}
                    </span>
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                      record.attended 
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                    )}>
                      {record.attended ? (
                        <>
                          <Check className="h-3 w-3" />
                          Obecny
                        </>
                      ) : (
                        <>
                          <X className="h-3 w-3" />
                          Nieobecny
                        </>
                      )}
                    </span>
                  </div>
                  
                  <p className="mt-1 text-sm text-muted-foreground">
                    {record.lesson?.title} • {record.lesson?.teacher?.name}
                  </p>
                  
                  <p className="text-xs text-muted-foreground">
                    {record.lesson?.date && format(new Date(record.lesson.date), 'd MMM yyyy', { locale: pl })}
                    {' • '}
                    {record.lesson?.start_time?.slice(0, 5)} - {record.lesson?.end_time?.slice(0, 5)}
                  </p>

                  {record.comment && (
                    <div className="mt-2 w-fit max-w-full rounded-lg bg-background/80 p-2 text-sm">
                      <span className="text-muted-foreground">Komentarz: </span>
                      <span className="text-foreground">{record.comment}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
    </div>
  );
}

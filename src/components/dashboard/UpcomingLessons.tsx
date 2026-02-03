import { Users, MapPin, Calendar, CheckCircle2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

export function UpcomingLessons() {
  const { schoolId, role } = useAuth();
  const navigate = useNavigate();
  const schedulePath = role === 'teacher' ? '/teacher/lessons' : '/admin/schedule';

  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ['upcomingLessons', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('lessons')
        .select(`
          id,
          title,
          date,
          start_time,
          end_time,
          is_completed,
          teachers (
            name
          ),
          groups (
            name
          ),
          students (
            name
          )
        `)
        .eq('school_id', schoolId)
        .gte('date', today)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(10);

      if (error) {
        console.error('Error fetching lessons:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!schoolId,
  });

  const hasData = lessons.length > 0;

  const calculateDuration = (start: string, end: string) => {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    const minutes = (endH * 60 + endM) - (startH * 60 + startM);
    return `${minutes} min`;
  };

  // Find index of first non-completed lesson
  const nextLessonIndex = lessons.findIndex(lesson => !lesson.is_completed);

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm sm:p-6 h-full flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground sm:text-lg">Nadchodzące zajęcia</h3>
          <p className="text-xs text-muted-foreground sm:text-sm">Dzisiaj i nadchodzące</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(schedulePath)}
          className="h-8 rounded-full border-border/60 bg-background/50 text-xs font-semibold text-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary sm:text-sm"
        >
          Pełny harmonogram
        </Button>
      </div>

      {/* Content area with dynamic height */}
      {/* Height adjusts to content, no fixed height to avoid empty space */}
      <div className="flex-1 flex flex-col min-h-0">
        {isLoading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 min-h-[150px]">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted-foreground/20 border-t-primary" />
            <p className="text-sm text-muted-foreground">Ładowanie zajęć...</p>
          </div>
        ) : !hasData ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-4 min-h-[120px]">
            <Calendar className="h-8 w-8 text-muted-foreground/30" />
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Brak zaplanowanych zajęć</p>
              <p className="text-xs text-muted-foreground/70">Zajęcia pojawią się po dodaniu ich do harmonogramu</p>
            </div>
          </div>
        ) : (
        <div className="space-y-2 sm:space-y-3 pt-2 overflow-y-auto max-h-[450px]">
          {lessons.slice(0, 5).map((lesson, index) => {
            const groupName = lesson.groups?.name || lesson.students?.name || lesson.title;
            const teacherName = lesson.teachers?.name || 'Brak nauczyciela';
            const duration = calculateDuration(lesson.start_time, lesson.end_time);
            const timeDisplay = lesson.start_time.slice(0, 5);
            const isCompleted = lesson.is_completed;
            const isNextLesson = index === nextLessonIndex;
            
            return (
              <div
                key={lesson.id}
                className={`relative rounded-xl border p-3 pt-4 hover:shadow-sm sm:p-4 sm:pt-5 ${
                  isCompleted
                    ? 'border-green-500/30 bg-green-500/5 opacity-75'
                    : isNextLesson 
                      ? 'border-primary/30 bg-primary/5' 
                      : 'border-border/50 bg-background/50'
                }`}
              >
                {isCompleted ? (
                  <span className="absolute -top-2 left-3 flex items-center gap-1 rounded-full bg-green-500 px-2 py-0.5 text-[9px] font-medium text-white shadow-sm sm:left-4 sm:text-[10px] z-10">
                    <CheckCircle2 className="h-3 w-3" />
                    Ukończone
                  </span>
                ) : isNextLesson && (
                  <span className="absolute -top-2 left-3 rounded-full bg-primary px-2 py-0.5 text-[9px] font-medium text-primary-foreground shadow-sm sm:left-4 sm:text-[10px] z-10">
                    Następne
                  </span>
                )}
                
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="flex flex-col items-center">
                      <span className={`text-base font-bold sm:text-lg ${isCompleted ? 'text-green-600 line-through' : 'text-foreground'}`}>
                        {timeDisplay}
                      </span>
                      <span className="text-[10px] text-muted-foreground sm:text-xs">{duration}</span>
                    </div>
                    
                    <div className="min-w-0">
                      <h4 className={`truncate text-sm font-semibold sm:text-base ${isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                        {groupName}
                      </h4>
                      <p className="truncate text-xs text-muted-foreground sm:text-sm">{teacherName}</p>
                      
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 sm:mt-2 sm:gap-3">
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground sm:text-xs">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(lesson.date), 'dd.MM.yyyy')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(schedulePath)}
                    className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-medium transition-colors sm:px-3 sm:py-1.5 sm:text-xs ${
                      isCompleted 
                        ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20'
                        : 'bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground'
                    }`}
                  >
                    Szczegóły
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
}

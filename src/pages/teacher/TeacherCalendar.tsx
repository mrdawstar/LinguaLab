import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Clock, Users, Loader2, CheckCircle2, Calendar } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TeacherLessonDialog } from '@/components/teacher/TeacherLessonDialog';
import { TeacherLessonEditDialog } from '@/components/teacher/TeacherLessonEditDialog';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const hours = Array.from({ length: 24 }, (_, i) => i); // 00:00 - 23:00

interface Lesson {
  id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  is_completed: boolean | null;
  student_id: string | null;
  group_id: string | null;
  students?: { id: string; name: string } | null;
  groups?: { id: string; name: string } | null;
}

function ScrollIntoViewOnDayChange({ dayKey }: { dayKey: string }) {
  useEffect(() => {
    const target = document.querySelector('[data-day-lesson="current"]') ||
      document.querySelector('[data-day-lesson="first"]');
    if (target instanceof HTMLElement) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [dayKey]);
  return null;
}

export default function TeacherCalendar() {
  const { user, schoolId } = useAuth();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; hour: number } | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [previewLesson, setPreviewLesson] = useState<Lesson | null>(null);
  const [now, setNow] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const touchStartX = useRef<number | null>(null);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  useLayoutEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    const id = window.setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    }, 0);
    return () => window.clearTimeout(id);
  }, []);


  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Fetch teacher record for current user in current school (zaproszony nauczyciel – zawsze właściwa szkoła)
  const { data: teacher, isLoading: teacherLoading } = useQuery({
    queryKey: ['current-teacher', user?.id, schoolId],
    queryFn: async () => {
      if (!user?.id || !schoolId) return null;
      const { data, error } = await supabase
        .from('teachers')
        .select('id, calendar_color')
        .eq('user_id', user.id)
        .eq('school_id', schoolId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!schoolId,
  });

  const teacherId = teacher?.id;
  const primaryColor = 'hsl(var(--primary))';

  // Fetch lessons for this teacher for the current week
  const { data: lessons = [], isLoading: lessonsLoading } = useQuery({
    queryKey: ['teacher-lessons', teacherId, format(weekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!teacherId) return [];
      const weekEnd = addDays(weekStart, 6);
      const { data, error } = await supabase
        .from('lessons')
        .select(`
          id,
          title,
          date,
          start_time,
          end_time,
          is_completed,
          student_id,
          group_id,
          students (id, name),
          groups (id, name)
        `)
        .eq('teacher_id', teacherId)
        .gte('date', format(weekStart, 'yyyy-MM-dd'))
        .lte('date', format(weekEnd, 'yyyy-MM-dd'))
        .order('start_time');
      if (error) throw error;
      return data || [];
    },
    enabled: !!teacherId,
  });

  // Fetch students count for this teacher
  const { data: studentsCount = 0 } = useQuery({
    queryKey: ['teacher-students-count', teacherId],
    queryFn: async () => {
      if (!teacherId) return 0;
      const { count, error } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('teacher_id', teacherId);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!teacherId,
  });

  // Fetch groups count for this teacher
  const { data: groupsCount = 0 } = useQuery({
    queryKey: ['teacher-groups-count', teacherId],
    queryFn: async () => {
      if (!teacherId) return 0;
      const { count, error } = await supabase
        .from('groups')
        .select('id', { count: 'exact', head: true })
        .eq('teacher_id', teacherId);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!teacherId,
  });

  const prevWeek = () => setCurrentDate(addDays(currentDate, -7));
  const nextWeek = () => setCurrentDate(addDays(currentDate, 7));
  const goToToday = () => setCurrentDate(new Date());

  const getLessonsForSlot = (date: Date, hour: number) => {
    return lessons.filter((lesson) => {
      const lessonDate = new Date(lesson.date);
      const lessonHour = parseInt(lesson.start_time.split(':')[0]);
      return isSameDay(lessonDate, date) && lessonHour === hour;
    });
  };

  const getLessonsForDay = (date: Date) => {
    return lessons
      .filter((lesson) => isSameDay(new Date(lesson.date), date))
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  };

  const handleSlotClick = (date: Date, hour: number) => {
    setSelectedSlot({ date, hour });
    setDialogOpen(true);
  };

  const handleLessonClick = (lesson: Lesson, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLesson(lesson);
    setEditDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      queryClient.invalidateQueries({ queryKey: ['teacher-lessons', teacherId] });
    }
  };

  const handleEditSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['teacher-lessons', teacherId] });
  };

  const isLoading = teacherLoading || lessonsLoading;

  if (teacherLoading) {
    return (
      <DashboardLayout title="Moje zajęcia" subtitle="Kalendarz i harmonogram online" requiredRole="teacher">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!teacher) {
    return (
      <DashboardLayout title="Moje zajęcia" subtitle="Kalendarz i harmonogram online" requiredRole="teacher">
        <div className="glass-card p-8 text-center">
          <Users className="mx-auto mb-4 h-16 w-16 text-muted-foreground/30" />
          <h3 className="text-lg font-semibold">Brak przypisanego profilu nauczyciela</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Skontaktuj się z administratorem w celu przypisania profilu.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Moje zajęcia" subtitle="Kalendarz i harmonogram online" requiredRole="teacher">
      <div className="glass-card p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Button variant="outline" size="icon" onClick={prevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={goToToday} className="text-sm">
              Dziś
            </Button>
            <h2 className="text-base font-semibold sm:text-lg">
              {format(weekStart, 'd MMM', { locale: pl })} -{' '}
              {format(addDays(weekStart, 6), 'd MMM yyyy', { locale: pl })}
            </h2>
          </div>
          <Button
            onClick={() => {
              setSelectedSlot(null);
              setDialogOpen(true);
            }}
            className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Dodaj zajęcia
          </Button>
        </div>

        {/* Mobile Day View */}
        <div
          className="lg:hidden"
          onTouchStart={(event) => {
            touchStartX.current = event.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            if (touchStartX.current === null) return;
            const delta = (event.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
            if (Math.abs(delta) > 50) {
              const viewDate = selectedDay || new Date();
              const currentIndex = weekDays.findIndex((day) => isSameDay(day, viewDate));
              const nextIndex = delta < 0 ? currentIndex + 1 : currentIndex - 1;
              if (weekDays[nextIndex]) {
                setAutoScrollEnabled(true);
                setSelectedDay(weekDays[nextIndex]);
              }
            }
            touchStartX.current = null;
          }}
        >
          <div className="space-y-4">
            {/* Day Selector */}
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {weekDays.map((day, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSelectedDay(day);
                    setAutoScrollEnabled(true);
                  }}
                  className={cn(
                    'flex flex-col items-center rounded-2xl px-2 py-2 transition-all shadow-sm',
                    isSameDay(day, selectedDay || new Date())
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'bg-muted/50 hover:bg-muted',
                    isSameDay(day, new Date()) && !isSameDay(day, selectedDay || new Date()) && 'ring-2 ring-primary/30'
                  )}
                >
                  <span className="text-[10px] font-medium sm:text-xs">
                    {format(day, 'EEE', { locale: pl })}
                  </span>
                  <span className="text-base font-bold sm:text-lg">{format(day, 'd')}</span>
                </button>
              ))}
            </div>

            {/* Selected Day Header */}
            <div className="sticky top-2 z-10 flex items-center justify-between rounded-2xl border border-border/60 bg-background/80 p-3 shadow-sm backdrop-blur">
              <div>
                <h3 className="font-semibold text-base">
                  {format(selectedDay || new Date(), 'EEEE, d MMMM', { locale: pl })}
                </h3>
                <p className="text-xs text-muted-foreground">Harmonogram dnia</p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setSelectedSlot({ date: selectedDay || new Date(), hour: 9 });
                  setDialogOpen(true);
                }}
                className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="mr-1 h-4 w-4" />
                Dodaj
              </Button>
            </div>

            {/* Day's Lessons */}
            {(() => {
              const viewDate = selectedDay || new Date();
              const dayLessons = getLessonsForDay(viewDate);

              if (dayLessons.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
                    <Calendar className="h-10 w-10 text-muted-foreground/30" />
                    <p className="mt-3 text-sm text-muted-foreground">
                      Brak zajęć w tym dniu
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3"
                      onClick={() => {
                        setSelectedSlot({ date: viewDate, hour: 9 });
                        setDialogOpen(true);
                      }}
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Zaplanuj zajęcia
                    </Button>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {dayLessons.map((lesson, index) => {
                    const studentName = lesson.students?.name;
                    const groupName = lesson.groups?.name;
                    const displayName = groupName || studentName || lesson.title;
                    const startTime = lesson.start_time.substring(0, 5);
                    const endTime = lesson.end_time.substring(0, 5);
                    const isCompleted = lesson.is_completed;
                    const isCurrentLesson = isSameDay(viewDate, now) && (() => {
                      const start = new Date(`${lesson.date}T${lesson.start_time}`);
                      const end = new Date(`${lesson.date}T${lesson.end_time}`);
                      return now >= start && now < end;
                    })();

                    return (
                      <div
                        key={lesson.id}
                        data-day-lesson={isCurrentLesson ? "current" : index === 0 ? "first" : undefined}
                        className={cn(
                          "flex gap-3 rounded-2xl border p-4 shadow-sm transition-colors hover:bg-muted/30",
                          isCurrentLesson && "border-rose-400/60 bg-rose-500/5",
                          isCompleted ? "bg-emerald-500/10 border-emerald-500/30" : "bg-card"
                        )}
                        onClick={() => setPreviewLesson(lesson)}
                      >
                        <div className={cn(
                          "flex flex-col items-center justify-center rounded-lg px-3 py-2",
                          isCompleted ? "bg-emerald-500/15" : "bg-muted/50"
                        )}>
                          <span className={cn(
                            "text-lg font-bold",
                            isCompleted ? "text-emerald-600 line-through" : "dark:text-white"
                          )}>{startTime}</span>
                          <span className={cn(
                            "text-xs text-muted-foreground",
                            !isCompleted && "dark:text-white"
                          )}>
                            {endTime}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className={cn(
                                  "font-semibold truncate",
                                  isCompleted ? "text-muted-foreground line-through" : "dark:text-white"
                                )}>
                                  {displayName}
                                </h4>
                                {isCompleted && (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                )}
                                {isCurrentLesson && !isCompleted && (
                                  <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
                                    Teraz
                                  </span>
                                )}
                              </div>
                              <p className={cn(
                                "text-sm text-muted-foreground",
                                !isCompleted && "dark:text-white"
                              )}>
                                {lesson.start_time.slice(0, 5)} - {lesson.end_time.slice(0, 5)}
                              </p>
                            </div>
                            <div
                              className="h-3 w-3 rounded-full shrink-0 mt-1.5"
                              style={{ backgroundColor: isCompleted ? '#10b981' : primaryColor }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {autoScrollEnabled && (
                    <ScrollIntoViewOnDayChange
                      dayKey={(selectedDay || new Date()).toISOString().slice(0, 10)}
                    />
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="hidden lg:block overflow-x-auto">
          <div className="min-w-[900px] rounded-2xl border border-border/50 bg-background/50 p-2">
            {/* Header */}
            <div className="grid grid-cols-8 gap-1 border-b pb-2">
              <div className="text-center text-sm font-medium text-muted-foreground">
                <Clock className="mx-auto h-4 w-4" />
              </div>
              {weekDays.map((day, i) => (
                <div
                  key={i}
                  className={cn(
                    'text-center',
                    isSameDay(day, new Date()) && 'text-primary font-semibold'
                  )}
                >
                  <div className="text-xs text-muted-foreground">
                    {format(day, 'EEEE', { locale: pl })}
                  </div>
                  <div className="text-lg">{format(day, 'd')}</div>
                </div>
              ))}
            </div>

            {/* Time slots */}
            {lessonsLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="mt-2 space-y-1">
                {hours.map((hour) => (
                  <div key={hour} className="grid grid-cols-8 gap-1">
                    <div className="flex items-center justify-center text-xs text-muted-foreground">
                      {hour}:00
                    </div>
                    {weekDays.map((day, dayIndex) => {
                      const slotLessons = getLessonsForSlot(day, hour);
                      const isCurrentSlot = isSameDay(day, now) && now.getHours() === hour;
                      const lineOffset = `${(now.getMinutes() / 60) * 100}%`;
                      return (
                        <div
                          key={dayIndex}
                          onClick={() => handleSlotClick(day, hour)}
                          className={cn(
                            'relative min-h-[60px] rounded-lg border border-dashed border-border/50 p-1 cursor-pointer transition-colors hover:bg-muted/50',
                            isSameDay(day, new Date()) && 'bg-primary/5'
                          )}
                        >
                          {isCurrentSlot && (
                          <div
                            className="pointer-events-none absolute left-1 right-1 z-20"
                            style={{ top: lineOffset }}
                          >
                              <div className="flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-rose-500 shadow-sm" />
                                <span className="h-[2px] flex-1 rounded-full bg-rose-500/80" />
                              </div>
                            </div>
                          )}
                          {slotLessons.map((lesson) => {
                            const studentName = lesson.students?.name;
                            const groupName = lesson.groups?.name;
                            const displayName = groupName || studentName || lesson.title;
                            const isCurrentLesson = isSameDay(day, now) && (() => {
                              const start = new Date(`${format(day, 'yyyy-MM-dd')}T${lesson.start_time}`);
                              const end = new Date(`${format(day, 'yyyy-MM-dd')}T${lesson.end_time}`);
                              return now >= start && now < end;
                            })();
                            
                            const startTime = lesson.start_time.substring(0, 5);
                            const endTime = lesson.end_time.substring(0, 5);

                            return (
                              <div
                                key={lesson.id}
                                data-lesson-card="true"
                                className={cn(
                                  "mb-1 rounded-lg p-2 text-xs relative cursor-pointer transition-colors hover:shadow-sm",
                                  isCurrentLesson && "ring-2 ring-rose-400 ring-offset-1 ring-offset-background",
                                  lesson.is_completed
                                    ? "bg-emerald-500 text-white opacity-60"
                                    : "bg-primary text-white"
                                )}
                                onClick={(e) => handleLessonClick(lesson, e)}
                              >
                                {lesson.is_completed && (
                                  <CheckCircle2 className="absolute top-1 right-1 h-3 w-3" />
                                )}
                                <div className={cn(
                                  "font-medium truncate",
                                  lesson.is_completed && "line-through"
                                )}>
                                  {displayName}
                                </div>
                                <div className="opacity-80">
                                  {startTime} - {endTime}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">Zajęcia w tym tygodniu</p>
            <p className="text-2xl font-bold text-foreground">{lessons.length}</p>
          </div>
          <div className="rounded-xl bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">Przypisani uczniowie</p>
            <p className="text-2xl font-bold text-foreground">{studentsCount}</p>
          </div>
          <div className="rounded-xl bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">Moje grupy</p>
            <p className="text-2xl font-bold text-foreground">{groupsCount}</p>
          </div>
        </div>
      </div>

      <Sheet open={!!previewLesson} onOpenChange={(open) => !open && setPreviewLesson(null)}>
        <SheetContent className="sm:max-w-md rounded-2xl">
          <SheetHeader className="text-left">
            <SheetTitle>Podgląd lekcji</SheetTitle>
          </SheetHeader>
          {previewLesson && (
            <div className="mt-4 space-y-5">
              <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-background via-background to-muted/40 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold">
                      {previewLesson.groups?.name || previewLesson.students?.name || previewLesson.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(previewLesson.date), 'EEEE, d MMMM yyyy', { locale: pl })}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-semibold",
                      previewLesson.is_completed
                        ? "bg-emerald-500 text-white dark:bg-emerald-500/80 dark:text-white"
                        : "bg-blue-500 text-white dark:bg-blue-500/80 dark:text-white"
                    )}
                  >
                    {previewLesson.is_completed ? 'Zakończone' : 'Zaplanowane'}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded-full border border-border/60 bg-background px-3 py-1 text-xs font-semibold">
                    {previewLesson.start_time.slice(0, 5)} - {previewLesson.end_time.slice(0, 5)}
                  </span>
                  <span className="rounded-full border border-border/60 bg-background px-3 py-1 text-xs font-semibold">
                    {previewLesson.group_id ? 'Grupowe' : 'Indywidualne'}
                  </span>
                </div>
              </div>
              <div className="grid gap-3 text-sm">
                {previewLesson.groups && (
                  <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/80 p-3">
                    <span className="text-muted-foreground">Grupa</span>
                    <span className="font-semibold">{previewLesson.groups.name}</span>
                  </div>
                )}
                {previewLesson.students && (
                  <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/80 p-3">
                    <span className="text-muted-foreground">Uczeń</span>
                    <span className="font-semibold">{previewLesson.students.name}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <Button
                  className="rounded-xl"
                  onClick={() => {
                    setSelectedLesson(previewLesson);
                    setEditDialogOpen(true);
                    setPreviewLesson(null);
                  }}
                >
                  Edytuj
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {teacherId && (
        <>
          <TeacherLessonDialog
            open={dialogOpen}
            onOpenChange={handleDialogClose}
            defaultDate={selectedSlot?.date}
            defaultHour={selectedSlot?.hour}
            teacherId={teacherId}
          />
          <TeacherLessonEditDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            lesson={selectedLesson}
            onSuccess={handleEditSuccess}
          />
        </>
      )}
    </DashboardLayout>
  );
}

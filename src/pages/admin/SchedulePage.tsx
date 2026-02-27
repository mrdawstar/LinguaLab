import { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Clock, Loader2, Calendar, CheckCircle2, UserCheck, UserX, Users } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { LessonDialogSupabase } from '@/components/admin/LessonDialogSupabase';
import { useLessons } from '@/hooks/useLessons';
import { useTeachers } from '@/hooks/useTeachers';
import { useStudents } from '@/hooks/useStudents';
import { useGroups } from '@/hooks/useGroups';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

/**
 * Helper function to calculate relevant hours for the week
 * Finds min and max hour from all lessons, returns array of hours from (min-1) to (max+1)
 * Always shows at least 6 hours even if no lessons exist
 */
function getRelevantHours(lessons: any[]): number[] {
  if (lessons.length === 0) {
    // Default to 8:00 - 14:00 (6 hours) if no lessons
    return Array.from({ length: 6 }, (_, i) => 8 + i);
  }

  // Find min and max hours from all lessons
  let minHour = 23;
  let maxHour = 0;

  lessons.forEach((lesson) => {
    const startHour = parseInt(lesson.start_time.split(':')[0]);
    const endHour = parseInt(lesson.end_time.split(':')[0]);
    minHour = Math.min(minHour, startHour);
    maxHour = Math.max(maxHour, endHour);
  });

  // Expand range by 1 hour on each side
  minHour = Math.max(0, minHour - 1);
  maxHour = Math.min(23, maxHour + 1);

  // Ensure at least 6 hours are displayed
  const hourRange = maxHour - minHour + 1;
  if (hourRange < 6) {
    const diff = 6 - hourRange;
    minHour = Math.max(0, minHour - Math.ceil(diff / 2));
    maxHour = Math.min(23, maxHour + Math.floor(diff / 2));
  }

  return Array.from({ length: maxHour - minHour + 1 }, (_, i) => minHour + i);
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

export default function SchedulePage() {
  const { lessons, isLoading } = useLessons();
  const { teachers } = useTeachers();
  const { students } = useStudents();
  const { groups } = useGroups();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; hour: number } | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [now, setNow] = useState(new Date());
  const touchStartX = useRef<number | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<any | null>(null);
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

  // Calculate relevant hours for the current week using useMemo to optimize performance
  const hours = useMemo(() => getRelevantHours(lessons), [lessons]);

  const prevWeek = () => setCurrentDate(addDays(currentDate, -7));
  const nextWeek = () => setCurrentDate(addDays(currentDate, 7));
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDay(new Date());
    setAutoScrollEnabled(true);
  };

  // Group lessons by date and hour slot for display
  const getLessonsForSlot = (date: Date, hour: number) => {
    return lessons.filter((lesson) => {
      const lessonDate = parseISO(lesson.date);
      const lessonHour = parseInt(lesson.start_time.split(':')[0]);
      return isSameDay(lessonDate, date) && lessonHour === hour;
    });
  };

  // Get all lessons for a specific day
  const getLessonsForDay = (date: Date) => {
    return lessons
      .filter((lesson) => isSameDay(parseISO(lesson.date), date))
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  };

  const getTeacher = (id?: string | null) => teachers.find((t) => t.id === id);
  const getStudent = (id?: string | null) => students.find((s) => s.id === id);
  const getGroup = (id?: string | null) => groups.find((g) => g.id === id);

  const handleSlotClick = (date: Date, hour: number) => {
    setSelectedSlot({ date, hour });
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Harmonogram" subtitle="Kalendarz zajęć online" requiredRole={['admin', 'manager']}>
        <div className="glass-card flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // Mobile Day View Component
  const MobileDayView = () => {
    const viewDate = selectedDay || new Date();
    const dayLessons = getLessonsForDay(viewDate);

    useEffect(() => {
      if (!autoScrollEnabled) return;
      const target = document.querySelector('[data-day-lesson="current"]') ||
        document.querySelector('[data-day-lesson="first"]');
      if (target instanceof HTMLElement) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, [viewDate, dayLessons.length, autoScrollEnabled]);

    const handleSwipe = (direction: 'prev' | 'next') => {
      const currentIndex = weekDays.findIndex((day) => isSameDay(day, viewDate));
      const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
      if (weekDays[nextIndex]) {
        setSelectedDay(weekDays[nextIndex]);
      }
    };

    return (
      <div
        className="space-y-4 lg:hidden"
        onTouchStart={(event) => {
          touchStartX.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          if (touchStartX.current === null) return;
          const delta = (event.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
          if (Math.abs(delta) > 50) {
            setAutoScrollEnabled(true);
            handleSwipe(delta < 0 ? 'next' : 'prev');
          }
          touchStartX.current = null;
        }}
      >
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
                isSameDay(day, viewDate)
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'bg-muted/50 hover:bg-muted',
                isSameDay(day, new Date()) && !isSameDay(day, viewDate) && 'ring-2 ring-primary/30'
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
              {format(viewDate, 'EEEE, d MMMM', { locale: pl })}
            </h3>
            <p className="text-xs text-muted-foreground">Harmonogram dnia</p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setSelectedSlot({ date: viewDate, hour: 9 });
              setDialogOpen(true);
            }}
            className="rounded-xl bg-gradient-primary"
          >
            <Plus className="mr-1 h-4 w-4" />
            Dodaj
          </Button>
        </div>

        {/* Day's Lessons */}
        <div className="space-y-3">
          {dayLessons.length === 0 ? (
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
          ) : (
            dayLessons.map((lesson, index) => {
              const teacher = getTeacher(lesson.teacher_id);
              const student = lesson.student_id ? getStudent(lesson.student_id) : null;
              const group = lesson.group_id ? getGroup(lesson.group_id) : null;
              const startTime = lesson.start_time.substring(0, 5);
              const endTime = lesson.end_time.substring(0, 5);
              const isCompleted = lesson.is_completed;
              const attendanceInfo = (lesson as any).attendance_info;
              const hasAttendance = attendanceInfo?.hasAttendance || false;
              const isCurrentLesson = isSameDay(viewDate, now) && (() => {
                const start = new Date(`${format(viewDate, 'yyyy-MM-dd')}T${lesson.start_time}`);
                const end = new Date(`${format(viewDate, 'yyyy-MM-dd')}T${lesson.end_time}`);
                return now >= start && now < end;
              })();

              return (
                <div
                  key={lesson.id}
                  data-day-lesson={isCurrentLesson ? "current" : index === 0 ? "first" : undefined}
                  className={cn(
                    "flex gap-3 rounded-2xl border p-4 shadow-sm transition-colors hover:bg-muted/30",
                    isCurrentLesson && "border-rose-400/60 bg-rose-500/5",
                    isCompleted 
                      ? "bg-emerald-500/10 border-emerald-500/30" 
                      : "bg-card"
                  )}
                  onClick={() => {
                    setSelectedLesson({
                      lesson,
                      teacher,
                      student,
                      group,
                      startTime,
                      endTime,
                      isCompleted,
                      attendanceInfo,
                      attendanceRecords: (lesson as any).attendance_records,
                    });
                  }}
                >
                  {/* Time Column */}
                  <div className={cn(
                    "flex flex-col items-center justify-center rounded-lg px-3 py-2",
                    isCompleted ? "bg-emerald-500/15" : "bg-muted/50"
                  )}>
                    <span className={cn(
                      "text-lg font-bold",
                      isCompleted && "text-emerald-600 line-through"
                    )}>{startTime}</span>
                    <span className="text-xs text-muted-foreground">{endTime}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className={cn(
                            "font-semibold truncate",
                            isCompleted && "text-muted-foreground line-through"
                          )}>
                            {group ? group.name : student?.name || lesson.title}
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
                        {teacher && (
                          <p className="text-sm text-muted-foreground truncate">
                            {teacher.name}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {hasAttendance ? (
                          <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5" title="Obecność zaznaczona">
                            <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-[10px] font-medium text-emerald-600">
                              {attendanceInfo.presentCount}/{attendanceInfo.totalStudents}
                            </span>
                          </div>
                        ) : isCompleted ? (
                          <div className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5" title="Brak zaznaczonej obecności">
                            <UserX className="h-3.5 w-3.5 text-amber-600" />
                          </div>
                        ) : null}
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: teacher?.calendar_color || '#3b82f6' }}
                        />
                      </div>
                    </div>
                    {group && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {group.language}
                        </span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {group.level}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        {autoScrollEnabled && (
          <ScrollIntoViewOnDayChange
            dayKey={format(viewDate, 'yyyy-MM-dd')}
          />
        )}
      </div>
    );
  };

  return (
    <DashboardLayout title="Harmonogram" subtitle="Kalendarz zajęć online" requiredRole={['admin', 'manager']}>
      <div className="glass-card p-4 sm:p-6">
        {/* Header */}
        <div className="mb-4 sm:mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="outline" size="icon" onClick={prevWeek} className="h-9 w-9 sm:h-10 sm:w-10">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextWeek} className="h-9 w-9 sm:h-10 sm:w-10">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={goToToday} className="h-9 px-3 sm:h-10 sm:px-4 text-sm">
              Dziś
            </Button>
            <h2 className="text-sm sm:text-lg font-semibold hidden sm:block">
              {format(weekStart, 'd MMM', { locale: pl })} -{' '}
              {format(addDays(weekStart, 6), 'd MMM yyyy', { locale: pl })}
            </h2>
          </div>
          <Button
            onClick={() => {
              setSelectedSlot(null);
              setDialogOpen(true);
            }}
            className="rounded-xl bg-gradient-primary h-9 sm:h-10 text-sm hidden lg:flex"
          >
            <Plus className="mr-2 h-4 w-4" />
            Dodaj zajęcia
          </Button>
        </div>

        {/* Mobile Week Range */}
        <div className="mb-4 text-center sm:hidden">
          <h2 className="text-sm font-medium text-muted-foreground">
            {format(weekStart, 'd MMM', { locale: pl })} - {format(addDays(weekStart, 6), 'd MMM yyyy', { locale: pl })}
          </h2>
        </div>

        {/* Mobile Day View */}
        <MobileDayView />

        {/* Desktop Calendar Grid */}
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
                          const teacher = getTeacher(lesson.teacher_id);
                          const student = lesson.student_id ? getStudent(lesson.student_id) : null;
                          const group = lesson.group_id ? getGroup(lesson.group_id) : null;
                          const isCompleted = lesson.is_completed;
                          const attendanceInfo = (lesson as any).attendance_info;
                          const hasAttendance = attendanceInfo?.hasAttendance || false;
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
                              className={cn(
                                "mb-1 rounded-lg p-2 text-xs text-white relative",
                                isCompleted && "opacity-60",
                                isCurrentLesson && "ring-2 ring-rose-400 ring-offset-1 ring-offset-background"
                              )}
                              data-lesson-card="true"
                                  style={{ backgroundColor: isCompleted ? '#10b981' : (teacher?.calendar_color || '#3b82f6') }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLesson({
                                  lesson,
                                  teacher,
                                  student,
                                  group,
                                  startTime,
                                  endTime,
                                  isCompleted,
                                  attendanceInfo,
                                  attendanceRecords: (lesson as any).attendance_records,
                                });
                              }}
                            >
                              <div className="absolute top-1 right-1 flex items-center gap-0.5">
                                {hasAttendance ? (
                                  <div className="flex items-center gap-0.5 rounded bg-white/20 px-1 py-0.5" title="Obecność zaznaczona">
                                    <UserCheck className="h-2.5 w-2.5" />
                                    <span className="text-[9px]">{attendanceInfo.presentCount}/{attendanceInfo.totalStudents}</span>
                                  </div>
                                ) : isCompleted ? (
                                  <div className="rounded bg-amber-500/80 px-1 py-0.5" title="Brak zaznaczonej obecności">
                                    <UserX className="h-2.5 w-2.5" />
                                  </div>
                                ) : null}
                                {isCompleted && (
                                  <CheckCircle2 className="h-3 w-3" />
                                )}
                              </div>
                              <div className={cn(
                                "font-medium truncate pr-8",
                                isCompleted && "line-through"
                              )}>
                                {group ? group.name : student?.name || lesson.title}
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
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 sm:mt-6 flex flex-wrap gap-3 sm:gap-4">
          {teachers.map((teacher) => (
            <div key={teacher.id} className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: teacher.calendar_color || '#3b82f6' }}
              />
              <span className="text-xs sm:text-sm text-muted-foreground">{teacher.name}</span>
            </div>
          ))}
        </div>
      </div>

      <Sheet open={!!selectedLesson} onOpenChange={(open) => !open && setSelectedLesson(null)}>
        <SheetContent className="sm:max-w-md rounded-2xl">
          <SheetHeader className="text-left">
            <SheetTitle>Podgląd lekcji</SheetTitle>
          </SheetHeader>
          {selectedLesson && (
            <div className="mt-4 space-y-5">
              <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-background via-background to-muted/40 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold">
                      {selectedLesson.group?.name ||
                        selectedLesson.student?.name ||
                        selectedLesson.lesson?.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(selectedLesson.lesson.date), 'EEEE, d MMMM yyyy', { locale: pl })}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-semibold",
                      selectedLesson.isCompleted
                        ? "bg-emerald-500 text-white dark:bg-emerald-500/80 dark:text-white"
                        : "bg-blue-500 text-white dark:bg-blue-500/80 dark:text-white"
                    )}
                  >
                    {selectedLesson.isCompleted ? 'Zakończone' : 'Zaplanowane'}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded-full border border-border/60 bg-background px-3 py-1 text-xs font-semibold">
                    {selectedLesson.startTime} - {selectedLesson.endTime}
                  </span>
                  <span className="rounded-full border border-border/60 bg-background px-3 py-1 text-xs font-semibold">
                    {selectedLesson.group ? 'Grupowe' : 'Indywidualne'}
                  </span>
                </div>
              </div>
              <div className="grid gap-3 text-sm">
                {selectedLesson.teacher && (
                  <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/80 p-3">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: selectedLesson.teacher.calendar_color || '#3b82f6' }}
                    />
                    <span className="text-muted-foreground">Nauczyciel</span>
                    <span className="ml-auto font-semibold">{selectedLesson.teacher.name}</span>
                  </div>
                )}
                {selectedLesson.group && (
                  <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/80 p-3">
                    <span className="text-muted-foreground">Grupa</span>
                    <span className="font-semibold">{selectedLesson.group.name}</span>
                  </div>
                )}
                {selectedLesson.student && (
                  <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/80 p-3">
                    <span className="text-muted-foreground">Uczeń</span>
                    <span className="font-semibold">{selectedLesson.student.name}</span>
                  </div>
                )}
              </div>
              
              {/* Attendance Section */}
              <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Obecność
                  </h4>
                  {selectedLesson.attendanceInfo?.hasAttendance ? (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600">
                      <UserCheck className="h-3.5 w-3.5" />
                      Zaznaczona
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-600">
                      <UserX className="h-3.5 w-3.5" />
                      Nie zaznaczona
                    </span>
                  )}
                </div>
                
                {selectedLesson.attendanceInfo?.hasAttendance ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Obecnych:</span>
                      <span className="font-medium text-emerald-600">
                        {selectedLesson.attendanceInfo.presentCount} / {selectedLesson.attendanceInfo.totalStudents}
                      </span>
                    </div>
                    {selectedLesson.attendanceInfo.absentCount > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Nieobecnych:</span>
                        <span className="font-medium text-red-500">
                          {selectedLesson.attendanceInfo.absentCount}
                        </span>
                      </div>
                    )}
                    
                    {selectedLesson.attendanceRecords && selectedLesson.attendanceRecords.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                        <p className="text-xs text-muted-foreground font-medium">Lista uczniów:</p>
                        {selectedLesson.attendanceRecords.map((record: any) => (
                          <div 
                            key={record.student_id} 
                            className="flex items-center justify-between text-sm py-1"
                          >
                            <span className="truncate">{record.student_name || 'Nieznany uczeń'}</span>
                            <span className={cn(
                              "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
                              record.attended 
                                ? "bg-emerald-500/10 text-emerald-600" 
                                : "bg-red-500/10 text-red-500"
                            )}>
                              {record.attended ? (
                                <>
                                  <UserCheck className="h-3 w-3" />
                                  Obecny
                                </>
                              ) : (
                                <>
                                  <UserX className="h-3 w-3" />
                                  Nieobecny
                                </>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nauczyciel nie zaznaczył jeszcze obecności dla tej lekcji.
                  </p>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <LessonDialogSupabase
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultDate={selectedSlot?.date}
        defaultHour={selectedSlot?.hour}
      />
    </DashboardLayout>
  );
}

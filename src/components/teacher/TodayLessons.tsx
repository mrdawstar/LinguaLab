import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Clock, Users, Check, MessageSquare, ChevronRight, Loader2, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface Student {
  id: string;
  name: string;
  present: boolean | null;
  attendanceId: string | null;
  comment: string;
  packagePurchaseId?: string | null;
}

interface Lesson {
  id: string;
  time: string;
  endTime: string;
  duration: string;
  title: string;
  groupName: string | null;
  studentName: string | null;
  students: Student[];
  completed: boolean;
}

export function TodayLessons() {
  const { user, schoolId } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null);
  const [savingAttendance, setSavingAttendance] = useState(false);

  const parseJwt = (token: string) => {
    try {
      const payload = token.split('.')[1];
      if (!payload) return null;
      const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(json) as { iss?: string; exp?: number; sub?: string };
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchTodayLessons();
  }, [user]);

  const callApplyPackageUsage = async (
    lessonId: string,
    studentId: string,
    attended: boolean,
    attendanceId?: string | null
  ) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      toast.error("Brak konfiguracji Supabase");
      return false;
    }

    const getToken = async (forceRefresh = false) => {
      if (forceRefresh) {
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          // If refresh token is invalid, sign out
          if (refreshError.message?.includes('Refresh Token') || refreshError.message?.includes('Invalid Refresh Token')) {
            await supabase.auth.signOut();
            return null; // Return null to trigger error handling
          }
          return null;
        }
        return refreshed.session?.access_token;
      }
      const { data: sessionData } = await supabase.auth.getSession();
      return sessionData.session?.access_token;
    };

    let accessToken = await getToken();
    if (!accessToken) {
      accessToken = await getToken(true);
    }
    if (!accessToken) {
      toast.error("Brak sesji użytkownika");
      return false;
    }

    const makeRequest = async (token: string) =>
      fetch(`${supabaseUrl}/functions/v1/apply-package-usage`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: supabaseKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lesson_id: lessonId,
          student_id: studentId,
          attended,
          attendance_id: attendanceId || null,
        }),
      });

    let response = await makeRequest(accessToken);
    if (response.status === 401) {
      const refreshedToken = await getToken(true);
      if (refreshedToken) {
        response = await makeRequest(refreshedToken);
      }
    }

    const responseText = await response.text();
    let responseJson: any = null;
    try {
      responseJson = responseText ? JSON.parse(responseText) : null;
    } catch {
      responseJson = null;
    }

    if (!response.ok) {
      console.error("apply-package-usage error:", {
        status: response.status,
        response: responseText,
      });
      return false;
    }

    if (responseJson?.missing_package) {
      toast.error("Brak aktywnego pakietu dla ucznia");
      return false;
    }

    return true;
  };
  


  const fetchTodayLessons = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');

      // Fetch today's lessons (RLS handles teacher filtering)
      const { data: lessonsData, error } = await supabase
        .from('lessons')
        .select(`
          id,
          title,
          start_time,
          end_time,
          is_completed,
          group_id,
          student_id,
          groups:group_id (name),
          students:student_id (name)
        `)
        .eq('date', today)
        .order('start_time', { ascending: true });

      if (error) throw error;

      if (!lessonsData || lessonsData.length === 0) {
        setLessons([]);
        setLoading(false);
        return;
      }

      const lessonIds = lessonsData.map((lesson) => lesson.id);
      const groupIds = lessonsData
        .filter((lesson) => lesson.group_id)
        .map((lesson) => lesson.group_id as string);
      const individualStudentIds = lessonsData
        .filter((lesson) => lesson.student_id)
        .map((lesson) => lesson.student_id as string);

      const [attendanceRes, groupStudentsRes, individualStudentsRes] = await Promise.all([
        lessonIds.length
          ? supabase
              .from('lesson_attendance')
              .select('id, lesson_id, student_id, attended, comment, package_purchase_id')
              .in('lesson_id', lessonIds)
          : Promise.resolve({ data: [] }),
        groupIds.length
          ? supabase
              .from('students')
              .select('id, name, group_id')
              .in('group_id', groupIds)
          : Promise.resolve({ data: [] }),
        individualStudentIds.length
          ? supabase
              .from('students')
              .select('id, name')
              .in('id', individualStudentIds)
          : Promise.resolve({ data: [] }),
      ]);

      const attendanceRecords = attendanceRes.data || [];
      const attendanceByLesson = attendanceRecords.reduce<Record<string, typeof attendanceRecords>>((acc, record) => {
        const key = record.lesson_id as string;
        if (!acc[key]) acc[key] = [];
        acc[key].push(record);
        return acc;
      }, {});

      const groupStudents = groupStudentsRes.data || [];
      const groupStudentsByGroup = groupStudents.reduce<Record<string, typeof groupStudents>>((acc, student) => {
        const key = student.group_id as string;
        if (!acc[key]) acc[key] = [];
        acc[key].push(student);
        return acc;
      }, {});

      const individualStudents = individualStudentsRes.data || [];
      const individualById = individualStudents.reduce<Record<string, typeof individualStudents[number]>>(
        (acc, student) => {
          acc[student.id] = student;
          return acc;
        },
        {}
      );

      const enrichedLessons = lessonsData.map((lesson) => {
        const startTime = lesson.start_time.slice(0, 5);
        const endTime = lesson.end_time.slice(0, 5);

        const start = new Date(`${today}T${lesson.start_time}`);
        const end = new Date(`${today}T${lesson.end_time}`);
        const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
        const duration =
          durationMinutes >= 60 ? `${Math.round((durationMinutes / 60) * 10) / 10}h` : `${durationMinutes} min`;

        let students: Student[] = [];
        const lessonAttendance = attendanceByLesson[lesson.id] || [];

        if (lesson.group_id) {
          const groupList = groupStudentsByGroup[lesson.group_id as string] || [];
          students = groupList.map((s) => {
            const attendance = lessonAttendance.find((a) => a.student_id === s.id);
            return {
              id: s.id,
              name: s.name,
              present: attendance?.attended ?? null,
              attendanceId: attendance?.id ?? null,
              comment: attendance?.comment ?? '',
              packagePurchaseId: (attendance as any)?.package_purchase_id ?? null,
            };
          });
        } else if (lesson.student_id) {
          const studentData = individualById[lesson.student_id as string];
          const attendance = lessonAttendance.find((a) => a.student_id === lesson.student_id);
          students = [
            {
              id: lesson.student_id,
              name: studentData?.name || 'Uczeń',
              present: attendance?.attended ?? null,
              attendanceId: attendance?.id ?? null,
              comment: attendance?.comment ?? '',
              packagePurchaseId: (attendance as any)?.package_purchase_id ?? null,
            },
          ];
        }

        const groupData = lesson.groups as any;
        const studentData = lesson.students as any;

        return {
          id: lesson.id,
          time: startTime,
          endTime: endTime,
          duration,
          title: lesson.title,
          groupName: groupData?.name || null,
          studentName: studentData?.name || null,
          students,
          completed: lesson.is_completed || false,
        };
      });

      setLessons(enrichedLessons);
      
      // Auto-expand first non-completed lesson
      const firstActive = enrichedLessons.find(l => !l.completed);
      if (firstActive) {
        setExpandedLesson(firstActive.id);
      }
    } catch (error) {
      console.error('Error fetching today lessons:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAttendance = async (lessonId: string, studentId: string) => {
    const lesson = lessons.find(l => l.id === lessonId);
    if (!lesson) return;

    const student = lesson.students.find(s => s.id === studentId);
    if (!student) return;

    // Cycle: null -> true -> false -> true
    const newPresent = student.present === null ? true : !student.present;
    
    // OPTIMISTIC UPDATE - zaktualizuj stan lokalny natychmiast (bez czekania na API)
    const previousState = { ...student };
    
    // Zaktualizuj stan lokalny natychmiast - UI reaguje od razu
    setLessons(prev => prev.map(l => {
      if (l.id === lessonId) {
        return {
          ...l,
          students: l.students.map(s => {
            if (s.id === studentId) {
              return { ...s, present: newPresent };
            }
            return s;
          }),
        };
      }
      return l;
    }));

    // Zapisz do bazy danych asynchronicznie (nie blokuj UI)
    // Ustaw savingAttendance tylko na bardzo krótko, aby pokazać że operacja się wykonuje
    setSavingAttendance(true);
    
    (async () => {
      try {
        let finalAttendanceId: string | null = null;
        
        if (student.attendanceId) {
          // Update existing attendance record
          const { error } = await supabase
            .from('lesson_attendance')
            .update({
              attended: newPresent,
            })
            .eq('id', student.attendanceId);
        
          if (error) throw error;
          finalAttendanceId = student.attendanceId;
        } else {
          // Create new attendance record
          const { data, error } = await supabase
            .from('lesson_attendance')
            .insert({
              lesson_id: lessonId,
              student_id: studentId,
              attended: newPresent,
            })
            .select()
            .single();
          
          if (error) throw error;
          finalAttendanceId = data.id;
          
          // Update local state with new attendance ID
          setLessons(prev => prev.map(l => {
            if (l.id === lessonId) {
              return {
                ...l,
                students: l.students.map(s => {
                  if (s.id === studentId) {
                    return { ...s, present: newPresent, attendanceId: data.id };
                  }
                  return s;
                }),
              };
            }
            return l;
          }));
        }

        // Wywołaj apply-package-usage PO utworzeniu/aktualizacji rekordu, z poprawnym attendanceId
        // Trigger w bazie powinien ustawić revenue_amount, ale wywołujemy też Edge Function
        // aby upewnić się, że wszystko jest zsynchronizowane
        if (newPresent && finalAttendanceId) {
          callApplyPackageUsage(lessonId, studentId, newPresent, finalAttendanceId).catch((error) => {
            console.error('Error updating package usage (non-critical):', error);
            // Nie pokazuj błędu użytkownikowi - trigger w bazie powinien zadziałać
          });
        } else if (!newPresent && finalAttendanceId) {
          // Jeśli odznaczamy obecność, również wywołaj funkcję aby przywrócić lekcję do pakietu
          callApplyPackageUsage(lessonId, studentId, newPresent, finalAttendanceId).catch((error) => {
            console.error('Error updating package usage (non-critical):', error);
          });
        }

        // Invaliduj tylko potrzebne query - selektywnie i bez refetch
        // Użyj setTimeout aby nie blokować UI
        setTimeout(() => {
          queryClient.invalidateQueries({ 
            queryKey: ['packages'],
            refetchType: 'none' // Nie wykonuj refetch, tylko oznacz jako stale
          });
          queryClient.invalidateQueries({ 
            queryKey: ['student-packages'],
            refetchType: 'none'
          });
          // Invaliduj również actualRevenue dla admina - aby widział zaktualizowaną kwotę
          if (schoolId) {
            queryClient.invalidateQueries({ 
              queryKey: ['actualRevenue', schoolId],
              refetchType: 'none'
            });
            // Invaliduj lessons query aby admin/manager widział zaktualizowaną obecność
            queryClient.invalidateQueries({ 
              queryKey: ['lessons', schoolId],
              refetchType: 'none'
            });
            // Invaliduj też upcomingLessons na dashboardzie
            queryClient.invalidateQueries({ 
              queryKey: ['upcomingLessons', schoolId],
              refetchType: 'none'
            });
          }
        }, 0);
        
      } catch (error) {
        console.error('Error saving attendance:', error);
        
        // ROLLBACK - przywróć poprzedni stan w przypadku błędu
        setLessons(prev => prev.map(l => {
          if (l.id === lessonId) {
            return {
              ...l,
              students: l.students.map(s => {
                if (s.id === studentId) {
                  return { ...s, present: previousState.present, attendanceId: previousState.attendanceId };
                }
                return s;
              }),
            };
          }
          return l;
        }));
        
        toast.error('Błąd podczas zapisywania obecności');
      } finally {
        // Wyłącz savingAttendance bardzo szybko - UI już się zaktualizował
        setTimeout(() => setSavingAttendance(false), 100);
      }
    })();
  };

  const updateComment = async (lessonId: string, studentId: string, comment: string) => {
    const lesson = lessons.find(l => l.id === lessonId);
    if (!lesson) return;

    const student = lesson.students.find(s => s.id === studentId);
    if (!student || !student.attendanceId) {
      toast.error('Najpierw zaznacz obecność');
      return;
    }

    try {
      const { error } = await supabase
        .from('lesson_attendance')
        .update({ comment: comment || null })
        .eq('id', student.attendanceId);

      if (error) throw error;

      setLessons(prev => prev.map(l => {
        if (l.id === lessonId) {
          return {
            ...l,
            students: l.students.map(s => {
              if (s.id === studentId) {
                return { ...s, comment };
              }
              return s;
            }),
          };
        }
        return l;
      }));

      toast.success('Komentarz zapisany');
    } catch (error) {
      console.error('Error saving comment:', error);
      toast.error('Błąd podczas zapisywania komentarza');
    }
  };

  const markLessonCompleted = async (lessonId: string) => {
    try {
      const { error } = await supabase
        .from('lessons')
        .update({ is_completed: true })
        .eq('id', lessonId);

      if (error) throw error;

      setLessons(prev => prev.map(l => {
        if (l.id === lessonId) {
          return { ...l, completed: true };
        }
        return l;
      }));

      toast.success('Zajęcia oznaczone jako zakończone');
    } catch (error) {
      console.error('Error marking lesson completed:', error);
      toast.error('Błąd podczas zapisywania');
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (lessons.length === 0) {
    return (
      <div className="glass-card flex flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <BookOpen className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Brak zajęć na dzisiaj</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Zajęcia pojawią się po przypisaniu przez administratora
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {lessons.map((lesson) => {
        const isExpanded = expandedLesson === lesson.id;
        const presentCount = lesson.students.filter((s) => s.present === true).length;
        const absentCount = lesson.students.filter((s) => s.present === false).length;

        return (
          <div
            key={lesson.id}
            className={cn(
              'glass-card overflow-hidden transition-all duration-300 animate-fade-in',
              lesson.completed && 'opacity-60'
            )}
          >
            {/* Header */}
            <button
              onClick={() => setExpandedLesson(isExpanded ? null : lesson.id)}
              className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/30"
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    'flex h-14 w-14 flex-col items-center justify-center rounded-xl',
                    lesson.completed ? 'bg-success/10' : 'bg-primary/10'
                  )}
                >
                  <span className="text-lg font-bold text-foreground">{lesson.time}</span>
                  <span className="text-[10px] text-muted-foreground">{lesson.duration}</span>
                </div>

                <div>
                  <h3 className="font-semibold text-foreground">
                    {lesson.groupName || lesson.studentName || lesson.title}
                  </h3>
                  <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{lesson.title}</span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {lesson.students.length} {lesson.students.length === 1 ? 'uczeń' : 'uczniów'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {lesson.completed ? (
                  <span className="badge-success flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Zakończone
                  </span>
                ) : (
                  <span className="badge-info">W trakcie</span>
                )}
                <ChevronRight
                  className={cn(
                    'h-5 w-5 text-muted-foreground transition-transform',
                    isExpanded && 'rotate-90'
                  )}
                />
              </div>
            </button>

            {/* Expanded content */}
            {isExpanded && (
              <div className="border-t border-border/50 p-4">
                {lesson.students.length > 0 ? (
                  <>
                    {/* Quick stats */}
                    <div className="mb-4 flex gap-3">
                      <div className="rounded-lg bg-success/10 px-3 py-1.5">
                        <span className="text-sm font-medium text-success">
                          Obecni: {presentCount}
                        </span>
                      </div>
                      <div className="rounded-lg bg-destructive/10 px-3 py-1.5">
                        <span className="text-sm font-medium text-destructive">
                          Nieobecni: {absentCount}
                        </span>
                      </div>
                      <div className="rounded-lg bg-muted px-3 py-1.5">
                        <span className="text-sm font-medium text-muted-foreground">
                          Nieokreśleni: {lesson.students.length - presentCount - absentCount}
                        </span>
                      </div>
                    </div>

                    {/* Students list */}
                    <div className="space-y-3">
                      {lesson.students.map((student) => (
                        <div
                          key={student.id}
                          className={cn(
                            'rounded-xl border p-3 transition-all',
                            student.present === true && 'border-success/50 bg-success/5',
                            student.present === false && 'border-destructive/50 bg-destructive/5',
                            student.present === null && 'border-border/50 bg-muted/30'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  'avatar-bubble h-9 w-9 text-xs',
                                  student.present === true && 'bg-success',
                                  student.present === false && 'bg-destructive'
                                )}
                              >
                                {student.name.charAt(0)}
                              </div>
                              <span className="font-medium text-foreground">{student.name}</span>
                            </div>

                            <button
                              onClick={() => toggleAttendance(lesson.id, student.id)}
                              disabled={savingAttendance}
                              className={cn(
                                'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                                student.present === true && 'bg-success text-success-foreground',
                                student.present === false && 'bg-destructive text-destructive-foreground',
                                student.present === null && 'bg-muted text-muted-foreground hover:bg-muted/80'
                              )}
                            >
                              {student.present === true && <Check className="h-4 w-4" />}
                              {student.present === false && <span className="text-sm font-bold">✕</span>}
                              {student.present === null && <span className="text-sm">?</span>}
                            </button>
                          </div>

                          {/* Comment input */}
                          {student.attendanceId && (
                            <div className="mt-2">
                              <div className="flex items-center gap-2">
                                <MessageSquare className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Komentarz</span>
                              </div>
                              <div className="mt-1 flex gap-2">
                                <Textarea
                                  placeholder="Wpisz komentarz (opcjonalnie)..."
                                  value={student.comment}
                                  onChange={(e) => {
                                    // Update local state immediately
                                    setLessons(prev => prev.map(l => {
                                      if (l.id === lesson.id) {
                                        return {
                                          ...l,
                                          students: l.students.map(s => {
                                            if (s.id === student.id) {
                                              return { ...s, comment: e.target.value };
                                            }
                                            return s;
                                          }),
                                        };
                                      }
                                      return l;
                                    }));
                                  }}
                                  rows={1}
                                  className="min-h-[32px] resize-none text-sm"
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateComment(lesson.id, student.id, student.comment)}
                                  className="shrink-0"
                                >
                                  Zapisz
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="py-4 text-center text-muted-foreground">
                    Brak uczniów przypisanych do tych zajęć
                  </p>
                )}

                {/* Action buttons */}
                <div className="mt-4 flex justify-end gap-2">
                  {!lesson.completed && (
                    <button
                      onClick={() => markLessonCompleted(lesson.id)}
                      className="flex items-center gap-2 rounded-xl bg-success/10 px-4 py-2 text-sm font-medium text-success transition-colors hover:bg-success/20"
                    >
                      <Check className="h-4 w-4" />
                      Zakończ zajęcia
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Check, X, MessageSquare, Loader2, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface Lesson {
  id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  student_id: string | null;
  group_id: string | null;
  students?: { id: string; name: string } | null;
  groups?: { id: string; name: string } | null;
}

interface AttendanceRecord {
  id: string;
  student_id: string;
  attended: boolean;
  comment: string | null;
  package_purchase_id?: string | null;
  student_name?: string;
}

interface AttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson: Lesson | null;
  onSuccess?: () => void;
}

export function AttendanceDialog({ open, onOpenChange, lesson, onSuccess }: AttendanceDialogProps) {
  const queryClient = useQueryClient();
  const [attendanceData, setAttendanceData] = useState<Record<string, { attended: boolean; comment: string }>>({});

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

  const callApplyPackageUsage = async (lessonId: string, studentId: string, attended: boolean) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey =
      import.meta.env.VITE_SUPABASE_ANON_KEY ||
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Brak konfiguracji Supabase');
    }

    const getToken = async (forceRefresh = false) => {
      if (forceRefresh) {
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          // If refresh token is invalid, sign out
          if (refreshError.message?.includes('Refresh Token') || refreshError.message?.includes('Invalid Refresh Token')) {
            await supabase.auth.signOut();
            throw new Error('Sesja wygasła. Zaloguj się ponownie.');
          }
          throw refreshError;
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
      throw new Error('Brak aktywnej sesji');
    }

    const makeRequest = async (token: string) =>
      fetch(`${supabaseUrl}/functions/v1/apply-package-usage`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: supabaseKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lesson_id: lessonId,
          student_id: studentId,
          attended,
        }),
      });

    let response = await makeRequest(accessToken);
    if (response.status === 401) {
      const refreshedToken = await getToken(true);
      if (refreshedToken) {
        response = await makeRequest(refreshedToken);
      }
    }

    if (!response.ok) {
      const errText = await response.text();
      const tokenInfo = accessToken ? parseJwt(accessToken) : null;
      console.error('apply-package-usage failed', {
        status: response.status,
        response: errText,
        supabaseUrl,
        tokenIss: tokenInfo?.iss,
        tokenExp: tokenInfo?.exp,
        tokenSub: tokenInfo?.sub,
      });
      return false;
    }
    return true;
  };

  // Fetch students for this lesson (either individual or group)
  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['lesson-students', lesson?.id, lesson?.student_id, lesson?.group_id],
    queryFn: async () => {
      if (!lesson) return [];
      
      if (lesson.student_id) {
        // Individual lesson - fetch single student
        const { data, error } = await supabase
          .from('students')
          .select('id, name')
          .eq('id', lesson.student_id);
        if (error) throw error;
        return data || [];
      } else if (lesson.group_id) {
        // Group lesson - fetch all students in group
        const { data, error } = await supabase
          .from('students')
          .select('id, name')
          .eq('group_id', lesson.group_id);
        if (error) throw error;
        return data || [];
      }
      return [];
    },
    enabled: !!lesson && open,
  });

  // Fetch existing attendance records
  const { data: existingAttendance = [], isLoading: attendanceLoading } = useQuery({
    queryKey: ['lesson-attendance', lesson?.id],
    queryFn: async () => {
      if (!lesson) return [];
      const { data, error } = await supabase
        .from('lesson_attendance')
        .select('id, student_id, attended, comment, package_purchase_id')
        .eq('lesson_id', lesson.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!lesson && open,
  });

  // Initialize attendance data when students or existing records load
  useEffect(() => {
    if (students.length > 0) {
      const initial: Record<string, { attended: boolean; comment: string }> = {};
      students.forEach(student => {
        const existing = existingAttendance.find(a => a.student_id === student.id);
        initial[student.id] = {
          attended: existing?.attended ?? true,
          comment: existing?.comment ?? '',
        };
      });
      setAttendanceData(initial);
    }
  }, [students, existingAttendance]);

  // Save attendance mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!lesson) return;

      for (const student of students) {
        const data = attendanceData[student.id];
        const existing = existingAttendance.find(a => a.student_id === student.id);

        if (existing) {
          // Update existing record
          const { error } = await supabase
            .from('lesson_attendance')
            .update({
              attended: data.attended,
              comment: data.comment || null,
            })
            .eq('id', existing.id);
          if (error) throw error;
        } else {
          // Insert new record
          const { error } = await supabase
            .from('lesson_attendance')
            .insert({
              lesson_id: lesson.id,
              student_id: student.id,
              attended: data.attended,
              comment: data.comment || null,
            });
          if (error) throw error;
        }

        // Apply package usage update via Edge Function (server-side)
        const packageUpdated = await callApplyPackageUsage(lesson.id, student.id, data.attended);
        if (!packageUpdated) {
          toast.error('Nie udało się zaktualizować pakietu');
        }
      }
    },
    onSuccess: () => {
      toast.success('Obecność została zapisana');
      queryClient.invalidateQueries({ queryKey: ['lesson-attendance', lesson?.id] });
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      queryClient.invalidateQueries({ queryKey: ['student-packages'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Error saving attendance:', error);
      toast.error('Nie udało się zapisać obecności');
    },
  });

  const toggleAttendance = (studentId: string) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        attended: !prev[studentId]?.attended,
      },
    }));
  };

  const updateComment = (studentId: string, comment: string) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        comment,
      },
    }));
  };

  const isLoading = studentsLoading || attendanceLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Obecność - {lesson?.title}
          </DialogTitle>
        </DialogHeader>

        {lesson && (
          <p className="text-sm text-muted-foreground">
            {lesson.date} • {lesson.start_time.slice(0, 5)} - {lesson.end_time.slice(0, 5)}
          </p>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : students.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            Brak uczniów przypisanych do tych zajęć
          </div>
        ) : (
          <div className="space-y-4">
            {students.map(student => {
              const data = attendanceData[student.id] || { attended: true, comment: '' };
              return (
                <div key={student.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{student.name}</span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={data.attended ? "default" : "outline"}
                        className={cn(
                          data.attended && "bg-emerald-500 hover:bg-emerald-600"
                        )}
                        onClick={() => toggleAttendance(student.id)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Obecny
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={!data.attended ? "default" : "outline"}
                        className={cn(
                          !data.attended && "bg-rose-500 hover:bg-rose-600"
                        )}
                        onClick={() => toggleAttendance(student.id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Nieobecny
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      Komentarz (opcjonalny)
                    </label>
                    <Textarea
                      placeholder="np. Spóźniony 10 min, problemy techniczne..."
                      value={data.comment}
                      onChange={(e) => updateComment(student.id, e.target.value)}
                      rows={2}
                      className="resize-none text-sm"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button 
            onClick={() => saveMutation.mutate()} 
            disabled={saveMutation.isPending || students.length === 0}
            className="bg-gradient-primary"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Zapisz obecność
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

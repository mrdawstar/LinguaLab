import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Lesson = Tables<'lessons'>;
export type LessonInsert = TablesInsert<'lessons'>;
export type LessonUpdate = TablesUpdate<'lessons'>;

export interface LessonAttendanceInfo {
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  hasAttendance: boolean;
}

export interface LessonWithAttendance extends Lesson {
  attendance_info?: LessonAttendanceInfo;
  attendance_records?: Array<{
    student_id: string;
    attended: boolean;
    comment: string | null;
    student_name?: string;
  }>;
}

export function useLessons() {
  const { schoolId } = useAuth();
  const queryClient = useQueryClient();

  // Realtime subscription for lesson_attendance changes
  useEffect(() => {
    if (!schoolId) return;

    const channel = supabase
      .channel('lesson-attendance-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lesson_attendance' },
        () => {
          // Invalidate lessons query when attendance changes
          queryClient.invalidateQueries({ queryKey: ['lessons', schoolId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [schoolId, queryClient]);

  const lessonsQuery = useQuery({
    queryKey: ['lessons', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .eq('school_id', schoolId)
        .order('date', { ascending: true });
      if (lessonsError) throw lessonsError;
      
      if (!lessonsData || lessonsData.length === 0) return [];
      
      const lessonIds = lessonsData.map(l => l.id);
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('lesson_attendance')
        .select(`
          lesson_id,
          student_id,
          attended,
          comment,
          students (name)
        `)
        .in('lesson_id', lessonIds);
      
      if (attendanceError) {
        console.error('Error fetching attendance:', attendanceError);
      }
      
      const attendanceByLesson = new Map<string, Array<{
        student_id: string;
        attended: boolean;
        comment: string | null;
        student_name?: string;
      }>>();
      
      (attendanceData || []).forEach((record: any) => {
        const lessonId = record.lesson_id;
        if (!attendanceByLesson.has(lessonId)) {
          attendanceByLesson.set(lessonId, []);
        }
        attendanceByLesson.get(lessonId)!.push({
          student_id: record.student_id,
          attended: record.attended,
          comment: record.comment,
          student_name: record.students?.name
        });
      });
      
      const lessonsWithAttendance: LessonWithAttendance[] = lessonsData.map(lesson => {
        const records = attendanceByLesson.get(lesson.id) || [];
        const hasAttendance = records.length > 0;
        const presentCount = records.filter(r => r.attended).length;
        const absentCount = records.filter(r => !r.attended).length;
        
        return {
          ...lesson,
          attendance_info: {
            totalStudents: records.length,
            presentCount,
            absentCount,
            hasAttendance
          },
          attendance_records: records
        };
      });
      
      return lessonsWithAttendance;
    },
    enabled: !!schoolId,
  });

  const addLesson = useMutation({
    mutationFn: async (lesson: Omit<LessonInsert, 'school_id'>) => {
      if (!schoolId) throw new Error('No school ID');
      const { data, error } = await supabase
        .from('lessons')
        .insert({ ...lesson, school_id: schoolId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons', schoolId] });
      toast.success('Zajęcia zostały dodane');
    },
    onError: (error) => {
      toast.error('Błąd podczas dodawania zajęć: ' + error.message);
    },
  });

  const updateLesson = useMutation({
    mutationFn: async ({ id, ...data }: LessonUpdate & { id: string }) => {
      const { error } = await supabase
        .from('lessons')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons', schoolId] });
      toast.success('Zajęcia zostały zaktualizowane');
    },
    onError: (error) => {
      toast.error('Błąd podczas aktualizacji: ' + error.message);
    },
  });

  const deleteLesson = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons', schoolId] });
      toast.success('Zajęcia zostały usunięte');
    },
    onError: (error) => {
      toast.error('Błąd podczas usuwania: ' + error.message);
    },
  });

  return {
    lessons: lessonsQuery.data ?? [],
    isLoading: lessonsQuery.isLoading,
    addLesson,
    updateLesson,
    deleteLesson,
  };
}

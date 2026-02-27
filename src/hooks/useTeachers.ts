import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Teacher = Tables<'teachers'>;
export type TeacherInsert = TablesInsert<'teachers'>;
export type TeacherUpdate = TablesUpdate<'teachers'>;

export function useTeachers() {
  const { schoolId } = useAuth();
  const queryClient = useQueryClient();

  const teachersQuery = useQuery({
    queryKey: ['teachers', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('school_id', schoolId)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });

  const addTeacher = useMutation({
    mutationFn: async (teacher: Omit<TeacherInsert, 'school_id'>) => {
      if (!schoolId) throw new Error('No school ID');
      const { data, error } = await supabase
        .from('teachers')
        .insert({ ...teacher, school_id: schoolId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers', schoolId] });
      toast.success('Nauczyciel został dodany');
    },
    onError: (error) => {
      toast.error('Błąd podczas dodawania nauczyciela: ' + error.message);
    },
  });

  const updateTeacher = useMutation({
    mutationFn: async ({ id, ...data }: TeacherUpdate & { id: string }) => {
      const { error } = await supabase
        .from('teachers')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers', schoolId] });
      toast.success('Nauczyciel został zaktualizowany');
    },
    onError: (error) => {
      toast.error('Błąd podczas aktualizacji: ' + error.message);
    },
  });

  const deleteTeacher = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('teachers')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers', schoolId] });
      toast.success('Nauczyciel został usunięty');
    },
    onError: (error) => {
      let msg = 'Błąd podczas usuwania: ' + error.message;
      if (error.message.includes('students_teacher_id_fkey')) {
        msg = 'Nie można usunąć nauczyciela z przypisanymi uczniami. Odłącz uczniów od tego nauczyciela w sekcji Uczniowie, a potem usuń nauczyciela.';
      } else if (error.message.includes('lessons_teacher_id_fkey')) {
        msg = 'Nie można usunąć nauczyciela z przypisanymi lekcjami. Najpierw usuń lub przenieś lekcje tego nauczyciela w Harmonogramie.';
      } else if (error.message.includes('groups_teacher_id_fkey')) {
        msg = 'Nie można usunąć nauczyciela z przypisanymi grupami. Najpierw zmień nauczyciela w grupach lub usuń grupy.';
      }
      toast.error(msg);
    },
  });

  const deleteTeacherWithRelations = useMutation({
    mutationFn: async (id: string) => {
      // 1. Get all lessons for this teacher to delete their attendance records
      const { data: teacherLessons } = await supabase
        .from('lessons')
        .select('id')
        .eq('teacher_id', id);
      
      if (teacherLessons && teacherLessons.length > 0) {
        const lessonIds = teacherLessons.map(l => l.id);
        
        // Delete attendance records for these lessons
        const { error: attendanceError } = await supabase
          .from('lesson_attendance')
          .delete()
          .in('lesson_id', lessonIds);
        if (attendanceError) throw attendanceError;
      }

      // 2. Delete all lessons for this teacher
      const { error: lessonsError } = await supabase
        .from('lessons')
        .delete()
        .eq('teacher_id', id);
      if (lessonsError) throw lessonsError;

      // 3. Unlink students from this teacher (set teacher_id to null)
      const { error: studentsError } = await supabase
        .from('students')
        .update({ teacher_id: null })
        .eq('teacher_id', id);
      if (studentsError) throw studentsError;

      // 4. Unlink groups from this teacher (set teacher_id to null)
      const { error: groupsError } = await supabase
        .from('groups')
        .update({ teacher_id: null })
        .eq('teacher_id', id);
      if (groupsError) throw groupsError;

      // 5. Finally delete the teacher
      const { error } = await supabase
        .from('teachers')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['students', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['groups', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['lessons', schoolId] });
      toast.success('Nauczyciel i powiązane lekcje zostały usunięte');
    },
    onError: (error) => {
      toast.error('Błąd podczas usuwania: ' + error.message);
    },
  });

  const unlinkTeacher = useMutation({
    mutationFn: async (teacherId: string) => {
      const { error } = await supabase.rpc('unlink_teacher_account', { p_teacher_id: teacherId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers', schoolId] });
      toast.success('Konto zostało odłączone. Nauczyciel pojawi się w zaproszeniach jako bez konta.');
    },
    onError: (error: Error) => {
      toast.error('Błąd: ' + error.message);
    },
  });

  return {
    teachers: teachersQuery.data ?? [],
    isLoading: teachersQuery.isLoading,
    addTeacher,
    updateTeacher,
    deleteTeacher,
    deleteTeacherWithRelations,
    unlinkTeacher,
  };
}

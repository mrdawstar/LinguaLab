import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Student = Tables<'students'>;
export type StudentInsert = TablesInsert<'students'>;
export type StudentUpdate = TablesUpdate<'students'>;

export function useStudents() {
  const { schoolId } = useAuth();
  const queryClient = useQueryClient();

  const studentsQuery = useQuery({
    queryKey: ['students', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('school_id', schoolId)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });

  const addStudent = useMutation({
    mutationFn: async (student: Omit<StudentInsert, 'school_id'>) => {
      if (!schoolId) throw new Error('No school ID');
      const { data, error } = await supabase
        .from('students')
        .insert({ ...student, school_id: schoolId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', schoolId] });
      toast.success('Uczeń został dodany');
    },
    onError: (error) => {
      toast.error('Błąd podczas dodawania ucznia: ' + error.message);
    },
  });

  const updateStudent = useMutation({
    mutationFn: async ({ id, ...data }: StudentUpdate & { id: string }) => {
      const { error } = await supabase
        .from('students')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', schoolId] });
      toast.success('Uczeń został zaktualizowany');
    },
    onError: (error) => {
      toast.error('Błąd podczas aktualizacji: ' + error.message);
    },
  });

  const deleteStudent = useMutation({
    mutationFn: async (id: string) => {
      // First, delete related lesson_attendance records
      const { error: attendanceError } = await supabase
        .from('lesson_attendance')
        .delete()
        .eq('student_id', id);
      if (attendanceError) throw attendanceError;

      // Then, delete lessons where this student is assigned (individual lessons)
      const { error: lessonsError } = await supabase
        .from('lessons')
        .delete()
        .eq('student_id', id);
      if (lessonsError) throw lessonsError;

      // Finally, delete the student
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['lessons', schoolId] });
      toast.success('Uczeń został usunięty');
    },
    onError: (error) => {
      let msg = 'Błąd podczas usuwania: ' + error.message;
      if (error.message.includes('package_purchases')) {
        msg = 'Nie można usunąć ucznia z aktywnymi pakietami. Najpierw usuń pakiety tego ucznia.';
      }
      toast.error(msg);
    },
  });

  return {
    students: studentsQuery.data ?? [],
    isLoading: studentsQuery.isLoading,
    addStudent,
    updateStudent,
    deleteStudent,
  };
}

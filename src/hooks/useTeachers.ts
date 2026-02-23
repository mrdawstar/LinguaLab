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
      const msg = error.message.includes('students_teacher_id_fkey')
        ? 'Nie można usunąć nauczyciela z przypisanymi uczniami. Odłącz uczniów od tego nauczyciela w sekcji Uczniowie, a potem usuń nauczyciela.'
        : 'Błąd podczas usuwania: ' + error.message;
      toast.error(msg);
    },
  });

  return {
    teachers: teachersQuery.data ?? [],
    isLoading: teachersQuery.isLoading,
    addTeacher,
    updateTeacher,
    deleteTeacher,
  };
}

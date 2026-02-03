import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Lesson = Tables<'lessons'>;
export type LessonInsert = TablesInsert<'lessons'>;
export type LessonUpdate = TablesUpdate<'lessons'>;

export function useLessons() {
  const { schoolId } = useAuth();
  const queryClient = useQueryClient();

  const lessonsQuery = useQuery({
    queryKey: ['lessons', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('school_id', schoolId)
        .order('date', { ascending: true });
      if (error) throw error;
      return data;
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

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Group = Tables<'groups'>;
export type GroupInsert = TablesInsert<'groups'>;
export type GroupUpdate = TablesUpdate<'groups'>;

export function useGroups() {
  const { schoolId } = useAuth();
  const queryClient = useQueryClient();

  const groupsQuery = useQuery({
    queryKey: ['groups', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('school_id', schoolId)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });

  const addGroup = useMutation({
    mutationFn: async (group: Omit<GroupInsert, 'school_id'>) => {
      if (!schoolId) throw new Error('No school ID');
      const { data, error } = await supabase
        .from('groups')
        .insert({ ...group, school_id: schoolId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', schoolId] });
      toast.success('Grupa została dodana');
    },
    onError: (error) => {
      toast.error('Błąd podczas dodawania grupy: ' + error.message);
    },
  });

  const updateGroup = useMutation({
    mutationFn: async ({ id, ...data }: GroupUpdate & { id: string }) => {
      const { error } = await supabase
        .from('groups')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', schoolId] });
      toast.success('Grupa została zaktualizowana');
    },
    onError: (error) => {
      toast.error('Błąd podczas aktualizacji: ' + error.message);
    },
  });

  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', schoolId] });
      toast.success('Grupa została usunięta');
    },
    onError: (error) => {
      toast.error('Błąd podczas usuwania: ' + error.message);
    },
  });

  return {
    groups: groupsQuery.data ?? [],
    isLoading: groupsQuery.isLoading,
    addGroup,
    updateGroup,
    deleteGroup,
  };
}

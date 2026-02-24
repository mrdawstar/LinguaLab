import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Invitation {
  id: string;
  school_id: string;
  email: string;
  role: 'admin' | 'teacher' | 'manager';
  token: string;
  invited_by: string;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
}

export function useInvitations() {
  const { schoolId, user, profile } = useAuth();
  const queryClient = useQueryClient();

  const invitationsQuery = useQuery({
    queryKey: ['invitations', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Invitation[];
    },
    enabled: !!schoolId,
  });

  const sendInvitation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: 'admin' | 'teacher' | 'manager' }) => {
      if (!schoolId || !user) throw new Error('Brak danych');

      const trimmedEmail = email.trim();
      if (!trimmedEmail) throw new Error('Email jest wymagany');

      // Create or refresh invitation (same email+role: new token and expiry; after delete: new row)
      const { data: rows, error } = await supabase.rpc('create_or_refresh_invitation', {
        p_school_id: schoolId,
        p_email: trimmedEmail,
        p_role: role,
        p_invited_by: user.id,
      });

      if (error) throw error;
      const data = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
      if (!data) throw new Error('Brak odpowiedzi z zaproszenia');
      
      // Send invitation email
      try {
        const inviterName = profile?.full_name || user.email || 'Administrator';
        
        // Get school name for email
        let schoolName: string | undefined;
        if (schoolId) {
          const { data: schoolData } = await supabase
            .from('schools')
            .select('name')
            .eq('id', schoolId)
            .single();
          
          if (schoolData?.name) {
            schoolName = schoolData.name;
          }
        }
        
        const { data: emailResponse, error: emailError } = await supabase.functions.invoke('send-invitation-email', {
          body: {
            email,
            role,
            token: data.token,
            invitedBy: inviterName,
            schoolName,
          },
        });
        
        if (emailError) {
          console.error('Failed to send invitation email:', emailError);
          // Nie rzucaj błędu - zaproszenie zostało utworzone, użytkownik może skopiować link
          // Email może nie zostać wysłany, ale zaproszenie jest ważne
        } else if (emailResponse?.success) {
          // Email sent successfully
          console.log('Invitation email sent successfully', emailResponse);
        }
      } catch (emailErr) {
        console.error('Email sending error:', emailErr);
        // Nie rzucaj błędu - zaproszenie zostało utworzone
      }
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invitations', schoolId] });
      toast.success(`Zaproszenie zostało wysłane na email ${data.email}`);
    },
    onError: (error: Error) => {
      toast.error('Błąd podczas wysyłania zaproszenia: ' + error.message);
    },
  });

  const deleteInvitation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['teachers', schoolId] });
      toast.success('Zaproszenie zostało usunięte');
    },
    onError: (error) => {
      toast.error('Błąd podczas usuwania: ' + error.message);
    },
  });

  return {
    invitations: invitationsQuery.data ?? [],
    isLoading: invitationsQuery.isLoading,
    sendInvitation,
    deleteInvitation,
    pendingInvitations: invitationsQuery.data?.filter(i => !i.accepted_at) ?? [],
    acceptedInvitations: invitationsQuery.data?.filter(i => i.accepted_at) ?? [],
  };
}

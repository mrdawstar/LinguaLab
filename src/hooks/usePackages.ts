import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PackagePurchase {
  id: string;
  student_id: string;
  school_id: string;
  total_amount: number;
  lessons_total: number;
  lessons_used: number;
  price_per_lesson: number;
  status: 'active' | 'exhausted' | 'expired';
  purchase_date: string;
  expires_at: string | null;
  teacher_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  student?: { id: string; name: string; email: string };
  teacher?: { id: string; name: string } | null;
}

export interface CreatePackageData {
  student_id: string;
  total_amount: number;
  lessons_total: number;
  teacher_id?: string | null;
  purchase_date?: string;
}

export interface UpdatePackageData {
  id: string;
  total_amount?: number;
  lessons_total?: number;
  lessons_used?: number;
  teacher_id?: string | null;
  expires_at?: string | null;
  status?: 'active' | 'exhausted' | 'expired';
}

export function usePackages() {
  const { schoolId, user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all packages for the school
  const packagesQuery = useQuery({
    queryKey: ['packages', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      
      const { data, error } = await supabase
        .from('package_purchases')
        .select(`
          *,
          student:students!student_id (id, name, email)
        `)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as unknown as PackagePurchase[];
    },
    enabled: !!schoolId,
  });

  useEffect(() => {
    if (!schoolId) return;
    const channel = supabase
      .channel(`package-purchases-${schoolId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'package_purchases', filter: `school_id=eq.${schoolId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['packages', schoolId] });
          queryClient.invalidateQueries({ queryKey: ['students', schoolId] });
          queryClient.invalidateQueries({ queryKey: ['student-packages'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [schoolId, queryClient]);

  // Fetch packages for a specific student
  const useStudentPackages = (studentId: string | null) => {
    return useQuery({
      queryKey: ['student-packages', studentId],
      queryFn: async () => {
        if (!studentId) return [];
        
        const { data, error } = await supabase
          .from('package_purchases')
          .select('*')
          .eq('student_id', studentId)
          .order('purchase_date', { ascending: false });
        
        if (error) throw error;
        return data || [];
      },
      enabled: !!studentId,
    });
  };

  // Create a new package purchase
  const createPackage = useMutation({
    mutationFn: async (data: CreatePackageData) => {
      if (!schoolId || !user) throw new Error('Brak autoryzacji');
      
      // First, mark all existing active packages for this student as expired
      const { error: expireError } = await supabase
        .from('package_purchases')
        .update({ status: 'expired' })
        .eq('student_id', data.student_id)
        .eq('status', 'active');
      
      if (expireError) {
        console.error('Error expiring old packages:', expireError);
      }
      
      // Create the new package
      const { data: result, error } = await supabase
        .from('package_purchases')
        .insert({
          school_id: schoolId,
          student_id: data.student_id,
          total_amount: data.total_amount,
          lessons_total: data.lessons_total,
          hours_purchased: data.lessons_total, // Backwards compatibility
          lessons_used: 0,
          teacher_id: data.teacher_id || null,
          purchase_date: data.purchase_date || new Date().toISOString().split('T')[0],
          created_by: user.id,
          status: 'active',
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Update student payment status to active (they just paid)
      const { error: studentError } = await supabase
        .from('students')
        .update({ payment_status: 'active' })
        .eq('id', data.student_id);
      
      if (studentError) {
        console.error('Error updating student payment status:', studentError);
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['students', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['student-packages'] });
      toast.success('Pakiet został dodany');
    },
    onError: (error) => {
      console.error('Error creating package:', error);
      toast.error('Nie udało się dodać pakietu');
    },
  });

  // Update a package
  const updatePackage = useMutation({
    mutationFn: async (data: UpdatePackageData) => {
      if (!schoolId) throw new Error('Brak autoryzacji');
      
      const { id, ...updateData } = data;
      
      const { data: result, error } = await supabase
        .from('package_purchases')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['students', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['student-packages'] });
      toast.success('Pakiet został zaktualizowany');
    },
    onError: (error) => {
      console.error('Error updating package:', error);
      toast.error('Nie udało się zaktualizować pakietu');
    },
  });

  // Delete a package
  const deletePackage = useMutation({
    mutationFn: async (packageId: string) => {
      if (!schoolId) throw new Error('Brak autoryzacji');
      
      // First, remove package references from lesson_attendance
      const { error: attendanceError } = await supabase
        .from('lesson_attendance')
        .update({ package_purchase_id: null, revenue_amount: null })
        .eq('package_purchase_id', packageId);
      
      if (attendanceError) {
        console.error('Error updating attendance:', attendanceError);
      }
      
      // Then delete the package
      const { error } = await supabase
        .from('package_purchases')
        .delete()
        .eq('id', packageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['students', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['student-packages'] });
      toast.success('Pakiet został usunięty');
    },
    onError: (error) => {
      console.error('Error deleting package:', error);
      toast.error('Nie udało się usunąć pakietu');
    },
  });

  // Get student package summary
  const getStudentSummary = (studentId: string) => {
    const packages = packagesQuery.data?.filter(p => p.student_id === studentId) || [];
    const activePackages = packages.filter(p => p.status === 'active');
    
    const remainingLessons = activePackages.reduce(
      (sum, p) => sum + (p.lessons_total - p.lessons_used),
      0
    );
    
    const usedLessons = activePackages.reduce(
      (sum, p) => sum + p.lessons_used,
      0
    );
    
    return {
      remainingLessons,
      usedLessons,
      activePackagesCount: activePackages.length,
      packages,
    };
  };

  return {
    packages: packagesQuery.data ?? [],
    isLoading: packagesQuery.isLoading,
    createPackage,
    updatePackage,
    deletePackage,
    useStudentPackages,
    getStudentSummary,
    refetch: packagesQuery.refetch,
  };
}
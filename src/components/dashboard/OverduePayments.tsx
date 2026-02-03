import { AlertCircle, CreditCard } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';


export function OverduePayments() {
  const { schoolId } = useAuth();
  const navigate = useNavigate();

  const { data: overduePayments = [], isLoading } = useQuery({
    queryKey: ['overduePayments', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];

      // First get overdue payments - includes 'overdue' status OR 'pending' with past due_date
      const today = new Date().toISOString().split('T')[0];
      
      let payments: any[] = [];
      let paymentsError: any = null;
      
      // Try complex query first
      const { data: complexData, error: complexError } = await supabase
        .from('payments')
        .select('id, amount, status, due_date, created_at, student_id')
        .eq('school_id', schoolId)
        .or(`status.eq.overdue,and(status.eq.pending,due_date.lt.${today})`)
        .order('due_date', { ascending: true })
        .limit(10);
      
      if (complexError) {
        console.warn('Complex query failed, using fallback:', complexError);
        // Fallback: get overdue and pending separately
        const { data: overdueData } = await supabase
          .from('payments')
          .select('id, amount, status, due_date, created_at, student_id')
          .eq('school_id', schoolId)
          .eq('status', 'overdue');
        
        const { data: pendingData } = await supabase
          .from('payments')
          .select('id, amount, status, due_date, created_at, student_id')
          .eq('school_id', schoolId)
          .eq('status', 'pending')
          .lt('due_date', today);
        
        payments = [...(overdueData || []), ...(pendingData || [])];
        paymentsError = null;
      } else {
        payments = complexData || [];
        paymentsError = complexError;
      }

      if (paymentsError) {
        console.error('Error fetching overdue payments:', paymentsError);
        return [];
      }

      if (!payments || payments.length === 0) {
        console.log('No overdue payments found');
        return [];
      }

      // Sort by due_date if available
      payments.sort((a, b) => {
        const dateA = a.due_date ? new Date(a.due_date).getTime() : 0;
        const dateB = b.due_date ? new Date(b.due_date).getTime() : 0;
        return dateA - dateB;
      });

      // Get unique student IDs
      const studentIds = [...new Set(payments.map(p => p.student_id).filter(Boolean))];
      
      if (studentIds.length === 0) {
        console.warn('Payments found but no student IDs');
        return [];
      }

      // Fetch students data
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, name, email')
        .in('id', studentIds)
        .eq('school_id', schoolId);

      if (studentsError) {
        console.error('Error fetching students:', studentsError);
        return [];
      }

      // Combine payments with student data
      const studentsMap = new Map(students?.map(s => [s.id, s]) || []);
      const paymentsWithStudents = payments
        .map((payment: any) => {
          const student = studentsMap.get(payment.student_id);
          if (!student) return null;
          return {
            ...payment,
            students: student,
          };
        })
        .filter(Boolean);

      console.log('Overdue payments with students:', paymentsWithStudents.length);
      return paymentsWithStudents;
    },
    enabled: !!schoolId,
  });

  // Get unique students with overdue payments
  const uniqueStudents = new Map<string, any>();
  overduePayments.forEach((payment: any) => {
    if (payment.students && !uniqueStudents.has(payment.students.id)) {
      const studentPayments = overduePayments.filter(
        (p: any) => p.students?.id === payment.students.id
      );
      const totalAmount = studentPayments.reduce(
        (sum: number, p: any) => sum + (Number(p.amount) || 0),
        0
      );
      uniqueStudents.set(payment.students.id, {
        student: payment.students,
        totalAmount,
        paymentCount: studentPayments.length,
        oldestDueDate: studentPayments
          .map((p: any) => p.due_date)
          .filter(Boolean)
          .sort()[0],
      });
    }
  });

  const studentsList = Array.from(uniqueStudents.values());
  const hasData = studentsList.length > 0;

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm sm:p-6 h-full flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground sm:text-lg">Zaległe płatności</h3>
          <p className="text-xs text-muted-foreground sm:text-sm">
            {studentsList.length > 0 
              ? `${studentsList.length} ${studentsList.length === 1 ? 'uczeń wymaga' : 'uczniów wymaga'} uwagi`
              : 'Wszystkie płatności opłacone'}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/admin/payments')}
          className="h-8 rounded-full border-border/60 bg-background/50 text-xs font-semibold text-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary sm:text-sm"
        >
          Zobacz wszystkie
        </Button>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {isLoading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 min-h-[150px]">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted-foreground/20 border-t-primary" />
            <p className="text-sm text-muted-foreground">Ładowanie płatności...</p>
          </div>
        ) : !hasData ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-4 min-h-[120px]">
            <CreditCard className="h-8 w-8 text-muted-foreground/30" />
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Brak zaległych płatności</p>
              <p className="text-xs text-muted-foreground/70">Wszystkie płatności są opłacone</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3 pt-2 overflow-y-auto max-h-[450px]">
            {studentsList.slice(0, 5).map((item) => {
              const student = item.student;
              const dueDate = item.oldestDueDate;
              
              return (
                <div
                  key={student.id}
                  className="relative rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 pt-4 hover:shadow-sm sm:p-4 sm:pt-5"
                >
                  <span className="absolute -top-2 left-3 flex items-center gap-1 rounded-full bg-rose-500 px-2 py-0.5 text-[9px] font-medium text-white shadow-sm sm:left-4 sm:text-[10px] z-10">
                    <AlertCircle className="h-3 w-3" />
                    Zaległe
                  </span>
                  
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500 text-sm font-semibold text-white sm:h-12 sm:w-12 sm:text-base">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      
                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-semibold text-foreground sm:text-base">
                          {student.name}
                        </h4>
                        {student.email && (
                          <p className="truncate text-xs text-muted-foreground sm:text-sm">
                            {student.email}
                          </p>
                        )}
                        
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 sm:mt-2 sm:gap-3">
                          {dueDate && (
                            <span className="flex items-center gap-1 text-[10px] text-rose-600 dark:text-rose-400 sm:text-xs">
                              <CreditCard className="h-3 w-3" />
                              Termin: {format(new Date(dueDate), 'dd.MM.yyyy')}
                            </span>
                          )}
                          {item.paymentCount > 1 && (
                            <span className="text-[10px] text-muted-foreground sm:text-xs">
                              {item.paymentCount} płatności
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-rose-600 dark:text-rose-400 sm:text-base">
                        {item.totalAmount.toFixed(2)} PLN
                      </div>
                      <button
                        onClick={() => navigate('/admin/payments')}
                        className="mt-1 rounded-lg bg-rose-500/10 px-2 py-1 text-[10px] font-medium text-rose-600 transition-colors hover:bg-rose-500 hover:text-white sm:px-3 sm:py-1.5 sm:text-xs"
                      >
                        Szczegóły
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

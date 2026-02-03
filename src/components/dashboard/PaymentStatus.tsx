import { CheckCircle2, AlertCircle, Clock, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

const statusConfig = {
  paid: {
    label: 'Opłacone',
    icon: CheckCircle2,
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  pending: {
    label: 'Oczekuje',
    icon: Clock,
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  overdue: {
    label: 'Zaległe',
    icon: AlertCircle,
    className: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  },
};

interface PaymentStatusProps {
  title?: string;
  subtitle?: string;
}

export function PaymentStatus({ title = 'Status płatności', subtitle = 'Ostatnie transakcje' }: PaymentStatusProps = {}) {
  const { schoolId } = useAuth();
  const navigate = useNavigate();

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['recentPayments', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];

      const { data, error } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          status,
          payment_date,
          due_date,
          created_at,
          students (
            name
          )
        `)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching payments:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!schoolId,
  });

  const { data: packagePurchases = [] } = useQuery({
    queryKey: ['recentPackagePurchases', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data, error } = await supabase
        .from('package_purchases')
        .select(`
          id,
          total_amount,
          purchase_date,
          created_at,
          student:students (name)
        `)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) {
        console.error('Error fetching package purchases:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!schoolId,
  });

  const { data: paymentStats } = useQuery({
    queryKey: ['paymentStats', schoolId],
    queryFn: async () => {
      if (!schoolId) return { paid: 0, pending: 0, overdue: 0 };

      const { data, error } = await supabase
        .from('payments')
        .select('status')
        .eq('school_id', schoolId);

      if (error) {
        console.error('Error fetching payment stats:', error);
        return { paid: 0, pending: 0, overdue: 0 };
      }

      const paid = data?.filter(p => p.status === 'paid').length || 0;
      const pending = data?.filter(p => p.status === 'pending').length || 0;
      const overdue = data?.filter(p => p.status === 'overdue').length || 0;

      return { paid, pending, overdue };
    },
    enabled: !!schoolId,
  });

  const transactions = [
    ...payments.map((p: any) => ({
      id: `payment_${p.id}`,
      amount: p.amount,
      status: p.status,
      date: p.payment_date || p.due_date || p.created_at,
      created_at: p.created_at,
      studentName: p.students?.name || 'Nieznany',
    })),
    ...packagePurchases.map((p: any) => ({
      id: `package_${p.id}`,
      amount: p.total_amount,
      status: 'paid',
      date: p.purchase_date || p.created_at,
      created_at: p.created_at,
      studentName: p.student?.name || 'Nieznany',
    })),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const hasData = transactions.length > 0;
  const hasStats = (paymentStats?.paid || 0) + (paymentStats?.pending || 0) + (paymentStats?.overdue || 0) > 0;

  return (
    <div className="h-fit self-start rounded-2xl border border-border/50 bg-card p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground sm:text-lg">{title}</h3>
          <p className="text-xs text-muted-foreground sm:text-sm">{subtitle}</p>
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

      {!hasData && !hasStats ? (
        <div className="flex flex-col items-center justify-center gap-3 py-8">
          <CreditCard className="h-12 w-12 text-muted-foreground/30" />
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground">Brak płatności</p>
            <p className="text-xs text-muted-foreground/70">Płatności pojawią się po ich zarejestrowaniu</p>
          </div>
        </div>
      ) : (
        <>
          {/* Summary */}
          {hasStats && (
            <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-xl bg-emerald-50 p-2 text-center dark:bg-emerald-900/20 sm:p-3">
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 sm:text-xl">
                  {paymentStats?.paid || 0}
                </p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 sm:text-xs">Opłacone</p>
              </div>
              <div className="rounded-xl bg-rose-50 p-2 text-center dark:bg-rose-900/20 sm:p-3">
                <p className="text-lg font-bold text-rose-600 dark:text-rose-400 sm:text-xl">
                  {paymentStats?.overdue || 0}
                </p>
                <p className="text-[10px] text-rose-600 dark:text-rose-400 sm:text-xs">Zaległe</p>
              </div>
              <div className="rounded-xl bg-amber-50 p-2 text-center dark:bg-amber-900/20 sm:p-3">
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400 sm:text-xl">
                  {paymentStats?.pending || 0}
                </p>
                <p className="text-[10px] text-amber-600 dark:text-amber-400 sm:text-xs">Oczekuje</p>
              </div>
            </div>
          )}

          {/* List */}
          {hasData && (
            <div className="max-h-72 space-y-2 overflow-auto pr-1 scrollbar-none sm:max-h-80 sm:space-y-3">
              {transactions.map((payment) => {
                const status = payment.status as keyof typeof statusConfig;
                const config = statusConfig[status] || statusConfig.pending;
                const Icon = config.icon;
                const studentName = payment.studentName || 'Nieznany';
                const displayDate = payment.date;
                
                return (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between rounded-xl bg-muted/30 p-2.5 transition-colors hover:bg-muted/50 sm:p-3"
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-primary text-xs font-medium text-primary-foreground sm:h-9 sm:w-9">
                        {studentName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-foreground sm:text-sm">{studentName}</p>
                        <p className="text-[10px] text-muted-foreground sm:text-xs">
                          {displayDate ? format(new Date(displayDate), 'dd.MM.yyyy') : '-'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="text-xs font-semibold text-foreground sm:text-sm">
                        {payment.amount} PLN
                      </span>
                      <span className={cn('hidden items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium sm:flex sm:text-xs', config.className)}>
                        <Icon className="h-3 w-3" />
                        {config.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Search, 
  Loader2,
  Package,
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  History,
  ChevronRight,
  Mail,
  Send,
} from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useStudents } from '@/hooks/useStudents';
import { usePackages } from '@/hooks/usePackages';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { PackageDialog } from '@/components/payments/PackageDialog';
import { StudentPackageCard } from '@/components/payments/StudentPackageCard';
import { StudentPaymentStatus } from '@/components/payments/StudentPaymentStatus';
import { StudentPaymentHistory } from '@/components/payments/StudentPaymentHistory';
import { NotificationsSection } from '@/components/payments/NotificationsSection';
import { supabase } from '@/integrations/supabase/client';

export default function PaymentsPage() {
  const { role, schoolId } = useAuth();
  const { students, isLoading: studentsLoading } = useStudents();
  const { packages, isLoading: packagesLoading } = usePackages();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isPackageDialogOpen, setIsPackageDialogOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isSendingNotifications, setIsSendingNotifications] = useState(false);

  useEffect(() => {
    if (!schoolId) return;
    const channel = supabase
      .channel(`lesson-attendance-payments-${schoolId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lesson_attendance' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['actualRevenue', schoolId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [schoolId, queryClient]);

  // Fetch actual revenue from lesson_attendance (after attendance is marked)
  const { data: actualRevenue = 0 } = useQuery({
    queryKey: ['actualRevenue', schoolId],
    queryFn: async () => {
      if (!schoolId) return 0;
      
      const { data } = await supabase
        .from('lesson_attendance')
        .select(`
          revenue_amount,
          lesson:lessons!lesson_id (school_id)
        `)
        .eq('attended', true)
        .not('revenue_amount', 'is', null);
      
      const schoolRevenue = data
        ?.filter((a: any) => a.lesson?.school_id === schoolId)
        .reduce((sum: number, a: any) => sum + (Number(a.revenue_amount) || 0), 0) || 0;
      
      return schoolRevenue;
    },
    enabled: !!schoolId,
  });

  const isLoading = studentsLoading || packagesLoading;
  const canViewFinances = role === 'admin';

  // Calculate stats - use real remaining lessons from packages
  const getStudentRemainingLessonsForStats = (studentId: string) => {
    const studentPackages = packages.filter(p => p.student_id === studentId && p.status === 'active');
    return studentPackages.reduce((sum, p) => sum + (p.lessons_total - p.lessons_used), 0);
  };

  const studentsWithNoPayment = students.filter(s => {
    const remaining = getStudentRemainingLessonsForStats(s.id);
    return remaining === 0;
  });
  
  const studentsWithWarning = students.filter(s => {
    const remaining = getStudentRemainingLessonsForStats(s.id);
    return remaining === 1;
  });
  
  const studentsWithActive = students.filter(s => {
    const remaining = getStudentRemainingLessonsForStats(s.id);
    return remaining > 1;
  });
  
  const activePackages = packages.filter(p => p.status === 'active');
  const remainingLessonsTotal = activePackages.reduce(
    (sum, p) => sum + (p.lessons_total - p.lessons_used),
    0
  );

  // Filter students based on search and status
  const getStudentRemainingLessons = (studentId: string) => {
    const studentPackages = packages.filter(p => p.student_id === studentId && p.status === 'active');
    return studentPackages.reduce((sum, p) => sum + (p.lessons_total - p.lessons_used), 0);
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.email ?? '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'all') return true;

    const remaining = getStudentRemainingLessons(student.id);
    if (statusFilter === 'no_payment') return remaining === 0;
    if (statusFilter === 'warning') return remaining === 1;
    if (statusFilter === 'active') return remaining > 1;

    return true;
  });

  // Send warning notifications
  const handleSendNotifications = async () => {
    setIsSendingNotifications(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error('Musisz być zalogowany');
        return;
      }

      const { data, error } = await supabase.functions.invoke('send-package-warning-email', {
        body: {},
      });

      if (error) {
        console.error('Error sending notifications:', error);
        toast.error('Błąd wysyłania powiadomień: ' + error.message);
        return;
      }

      if (data.sentCount > 0) {
        toast.success(data.message);
      } else {
        toast.info(data.message);
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Wystąpił błąd podczas wysyłania powiadomień');
    } finally {
      setIsSendingNotifications(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout
        requiredRole={['admin', 'manager']}
        title="Płatności i pakiety"
        subtitle="Zarządzaj pakietami zajęć uczniów"
      >
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      requiredRole={['admin', 'manager']}
      title="Płatności i pakiety"
      subtitle="Zarządzaj pakietami zajęć uczniów"
      actions={
        <Button
          onClick={() => {
            setSelectedStudentId(null);
            setIsPackageDialogOpen(true);
          }}
          className="rounded-xl bg-gradient-primary"
          size="sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          Dodaj pakiet
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Statistics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-100 p-2 dark:bg-emerald-900/30">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Aktywni uczniowie</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {studentsWithActive.length}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-orange-100 p-2 dark:bg-orange-900/30">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Kończą pakiet</p>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                  {studentsWithWarning.length}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-rose-100 p-2 dark:bg-rose-900/30">
                <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Brak płatności</p>
                <p className="text-xl font-bold text-rose-600 dark:text-rose-400">
                  {studentsWithNoPayment.length}
                </p>
              </div>
            </div>
          </div>

          {canViewFinances && (
            <div className="glass-card p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary/10 p-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Zrealizowany przychód</p>
                  <p className="text-xl font-bold text-foreground">
                    {actualRevenue.toFixed(0)} PLN
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Notifications Section */}
        <NotificationsSection
          noPaymentCount={studentsWithNoPayment.length}
          warningCount={studentsWithWarning.length}
          onSendNotifications={handleSendNotifications}
          isSending={isSendingNotifications}
        />

        {/* Quick action for students without payment */}
        {studentsWithNoPayment.length > 0 && (
          <div className="glass-card border-rose-500/30 bg-rose-50/50 p-3 sm:p-4 dark:bg-rose-900/10">
            <div className="mb-2 sm:mb-3 flex items-center gap-2">
              <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-rose-600 dark:text-rose-400 shrink-0" />
              <h3 className="font-semibold text-sm sm:text-base text-rose-700 dark:text-rose-400">
                Szybkie dodanie pakietu ({studentsWithNoPayment.length})
              </h3>
            </div>
            <ScrollArea className="w-full">
              <div className="flex gap-2 pb-2">
                {studentsWithNoPayment.slice(0, 10).map(student => (
                  <button
                    key={student.id}
                    onClick={() => setSelectedStudentId(student.id)}
                    className="flex items-center gap-2 rounded-xl bg-rose-100 px-3 py-2 text-rose-700 transition-colors hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:hover:bg-rose-900/50 whitespace-nowrap"
                  >
                    <span className="font-medium text-sm">{student.name}</span>
                    <Plus className="h-3 w-3" />
                  </button>
                ))}
                {studentsWithNoPayment.length > 10 && (
                  <span className="self-center text-sm text-rose-600 dark:text-rose-400 whitespace-nowrap px-2">
                    +{studentsWithNoPayment.length - 10} więcej
                  </span>
                )}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="students" className="space-y-4">
          <TabsList>
            <TabsTrigger value="students" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Uczniowie
            </TabsTrigger>
            <TabsTrigger value="packages" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Pakiety
            </TabsTrigger>
          </TabsList>

          <TabsContent value="students" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Szukaj ucznia..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-xl pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full rounded-xl sm:w-48">
                  <SelectValue placeholder="Status płatności" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszyscy</SelectItem>
                  <SelectItem value="active">Aktywni</SelectItem>
                  <SelectItem value="warning">Kończą pakiet</SelectItem>
                  <SelectItem value="no_payment">Brak płatności</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Desktop Students Table */}
            <div className="glass-card overflow-hidden hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Uczeń</TableHead>
                    <TableHead>Status płatności</TableHead>
                    <TableHead>Pozostałe lekcje</TableHead>
                    {canViewFinances && <TableHead>Aktywne pakiety</TableHead>}
                    <TableHead className="text-right">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        Brak uczniów do wyświetlenia
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStudents.map((student) => {
                      const remainingLessons = getStudentRemainingLessons(student.id);
                      const studentPackages = packages.filter(p => p.student_id === student.id && p.status === 'active');
                      
                      return (
                        <TableRow
                          key={student.id}
                          className={cn(
                            'cursor-pointer transition-colors hover:bg-muted/50',
                            student.payment_status === 'no_payment' && 'bg-rose-50/50 dark:bg-rose-900/5',
                            student.payment_status === 'warning' && 'bg-orange-50/50 dark:bg-orange-900/5'
                          )}
                          onClick={() => setSelectedStudentId(student.id)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="avatar-bubble h-9 w-9 text-xs">
                                {student.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium">{student.name}</p>
                                <p className="text-xs text-muted-foreground">{student.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <StudentPaymentStatus
                              status={student.payment_status as any}
                              remainingLessons={remainingLessons}
                              showDetails={canViewFinances}
                            />
                          </TableCell>
                          <TableCell>
                            <span className={cn(
                              'text-lg font-bold',
                              remainingLessons === 0 && 'text-rose-600',
                              remainingLessons === 1 && 'text-amber-600',
                              remainingLessons > 1 && 'text-emerald-600'
                            )}>
                              {remainingLessons}
                            </span>
                          </TableCell>
                          {canViewFinances && (
                            <TableCell>
                              <span className="font-medium">{studentPackages.length}</span>
                            </TableCell>
                          )}
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedStudentId(student.id);
                              }}
                            >
                              <History className="mr-2 h-3 w-3" />
                              Historia
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Students Cards */}
            <div className="space-y-3 md:hidden">
              {filteredStudents.length === 0 ? (
                <div className="glass-card p-8 text-center text-muted-foreground">
                  Brak uczniów do wyświetlenia
                </div>
              ) : (
                filteredStudents.map((student) => {
                  const remainingLessons = getStudentRemainingLessons(student.id);
                  const studentPackages = packages.filter(p => p.student_id === student.id && p.status === 'active');
                  
                  return (
                    <div
                      key={student.id}
                      onClick={() => setSelectedStudentId(student.id)}
                      className={cn(
                        'glass-card p-4 cursor-pointer transition-all active:scale-[0.98]',
                        student.payment_status === 'no_payment' && 'border-rose-500/30 bg-rose-50/30 dark:bg-rose-900/10',
                        student.payment_status === 'warning' && 'border-orange-500/30 bg-orange-50/30 dark:bg-orange-900/10'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="avatar-bubble h-10 w-10 text-sm shrink-0">
                            {student.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{student.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                      </div>
                      
                      <div className="mt-3 flex items-center justify-between pt-3 border-t border-border/50">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Pozostałe</p>
                            <span className={cn(
                              'text-lg font-bold',
                              remainingLessons === 0 && 'text-rose-600',
                              remainingLessons === 1 && 'text-amber-600',
                              remainingLessons > 1 && 'text-emerald-600'
                            )}>
                              {remainingLessons}
                            </span>
                          </div>
                          {canViewFinances && (
                            <div>
                              <p className="text-xs text-muted-foreground">Pakiety</p>
                              <span className="text-lg font-bold">{studentPackages.length}</span>
                            </div>
                          )}
                        </div>
                        <StudentPaymentStatus
                          status={student.payment_status as any}
                          remainingLessons={remainingLessons}
                          showDetails={false}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="packages" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activePackages.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
                  <Package className="h-12 w-12 text-muted-foreground/30" />
                  <p className="mt-4 text-sm font-medium text-muted-foreground">
                    Brak aktywnych pakietów
                  </p>
                  <Button
                    onClick={() => setIsPackageDialogOpen(true)}
                    variant="outline"
                    className="mt-4"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Dodaj pierwszy pakiet
                  </Button>
                </div>
              ) : (
                activePackages.map((pkg) => (
                  <div key={pkg.id} className="relative">
                    <div className="absolute -top-2 -left-2 z-10">
                      <span className="rounded-full bg-background px-2 py-1 text-xs font-medium shadow-sm border">
                        {pkg.student?.name}
                      </span>
                    </div>
                    <StudentPackageCard
                      pkg={pkg}
                      showFinancials={canViewFinances}
                    />
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Package Dialog */}
      <PackageDialog
        open={isPackageDialogOpen}
        onOpenChange={setIsPackageDialogOpen}
        preselectedStudentId={selectedStudentId || undefined}
      />

      {/* Student History Dialog */}
      <Dialog open={!!selectedStudentId && !isPackageDialogOpen} onOpenChange={(open) => !open && setSelectedStudentId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Historia płatności</DialogTitle>
          </DialogHeader>
          {selectedStudentId && (
            <StudentPaymentHistory
              studentId={selectedStudentId}
              studentName={students.find(s => s.id === selectedStudentId)?.name || 'Uczeń'}
              showFinancials={canViewFinances}
              showAddButton={true}
            />
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

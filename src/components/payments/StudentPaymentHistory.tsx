import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Package, Plus, History, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StudentPackageCard } from './StudentPackageCard';
import { PackageDialog } from './PackageDialog';
import { PackageEditDialog } from './PackageEditDialog';
import { cn } from '@/lib/utils';

interface PackageData {
  id: string;
  lessons_total: number;
  lessons_used: number;
  total_amount: number;
  price_per_lesson?: number;
  status: string;
  purchase_date: string;
  expires_at: string | null;
  teacher_id?: string | null;
  student_id: string;
  school_id: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface StudentPaymentHistoryProps {
  studentId: string;
  studentName: string;
  showAddButton?: boolean;
  showFinancials?: boolean;
  showEditButton?: boolean;
}

export function StudentPaymentHistory({
  studentId,
  studentName,
  showAddButton = true,
  showFinancials = true,
  showEditButton = true,
}: StudentPaymentHistoryProps) {
  const [showPackageDialog, setShowPackageDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PackageData | null>(null);

  // Fetch packages for this student
  const { data: packages = [], isLoading } = useQuery({
    queryKey: ['student-packages', studentId],
    queryFn: async () => {
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

  // Calculate summary
  const activePackages = packages.filter(p => p.status === 'active');
  const remainingLessons = activePackages.reduce(
    (sum, p) => sum + ((p.lessons_total || 0) - (p.lessons_used || 0)),
    0
  );
  const usedLessons = activePackages.reduce(
    (sum, p) => sum + (p.lessons_used || 0),
    0
  );
  const totalSpent = packages.reduce((sum, p) => sum + Number(p.total_amount), 0);

  const handleEditPackage = (pkg: PackageData) => {
    setSelectedPackage(pkg);
    setShowEditDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with summary */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Historia pakietów - {studentName}
          </h3>
          <p className="text-sm text-muted-foreground">
            {packages.length} pakietów łącznie
          </p>
        </div>

        {showAddButton && (
          <Button
            onClick={() => setShowPackageDialog(true)}
            className="bg-gradient-primary"
          >
            <Plus className="mr-2 h-4 w-4" />
            Dodaj pakiet
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className={cn(
          'rounded-xl border p-4',
          remainingLessons === 0 && 'border-rose-500/30 bg-rose-50/50 dark:bg-rose-900/10',
          remainingLessons === 1 && 'border-orange-500 bg-orange-100 dark:bg-orange-900/30',
          remainingLessons > 1 && 'border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-900/10'
        )}>
          <p className="text-xs text-muted-foreground">Pozostało lekcji</p>
          <p className={cn(
            'text-2xl font-bold',
            remainingLessons === 0 && 'text-rose-600',
            remainingLessons === 1 && 'text-orange-700',
            remainingLessons > 1 && 'text-emerald-600'
          )}>
            {remainingLessons}
          </p>
        </div>

        <div className="rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Wykorzystano</p>
          <p className="text-2xl font-bold text-foreground">{usedLessons}</p>
        </div>

        <div className="rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Aktywne pakiety</p>
          <p className="text-2xl font-bold text-primary">{activePackages.length}</p>
        </div>

        {showFinancials && (
          <div className="rounded-xl border p-4">
            <p className="text-xs text-muted-foreground">Łączna wartość</p>
            <p className="text-2xl font-bold text-foreground">{totalSpent.toFixed(0)} PLN</p>
          </div>
        )}
      </div>

      {/* Package list */}
      {packages.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
          <Package className="h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-sm font-medium text-muted-foreground">
            Brak pakietów dla tego ucznia
          </p>
          {showAddButton && (
            <Button
              onClick={() => setShowPackageDialog(true)}
              variant="outline"
              className="mt-4"
            >
              <Plus className="mr-2 h-4 w-4" />
              Dodaj pierwszy pakiet
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {packages.map((pkg) => (
            <StudentPackageCard
              key={pkg.id}
              pkg={pkg as PackageData}
              showFinancials={showFinancials}
              onEdit={showEditButton ? () => handleEditPackage(pkg as PackageData) : undefined}
            />
          ))}
        </div>
      )}

      {/* Package dialog */}
      <PackageDialog
        open={showPackageDialog}
        onOpenChange={setShowPackageDialog}
        preselectedStudentId={studentId}
      />

      {/* Edit dialog */}
      <PackageEditDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        packageData={selectedPackage as any}
        studentName={studentName}
      />
    </div>
  );
}
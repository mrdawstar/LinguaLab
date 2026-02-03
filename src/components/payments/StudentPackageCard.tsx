import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Package, Calendar, TrendingUp, Clock, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

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
}

interface StudentPackageCardProps {
  pkg: PackageData;
  showFinancials?: boolean;
  onEdit?: (pkg: PackageData) => void;
}

type VisualStatus = 'active' | 'warning' | 'exhausted' | 'expired';

export function StudentPackageCard({ pkg, showFinancials = true, onEdit }: StudentPackageCardProps) {
  const remainingLessons = pkg.lessons_total - pkg.lessons_used;
  const usagePercent = (pkg.lessons_used / pkg.lessons_total) * 100;
  
  const statusColors: Record<VisualStatus, string> = {
    active: 'border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-900/10',
    warning: 'border-amber-500/30 bg-amber-50/50 dark:bg-amber-900/10',
    exhausted: 'border-rose-500/30 bg-rose-50/50 dark:bg-rose-900/10',
    expired: 'border-muted bg-muted/30',
  };

  const progressColors: Record<VisualStatus, string> = {
    active: 'bg-emerald-500',
    warning: 'bg-amber-500',
    exhausted: 'bg-rose-500',
    expired: 'bg-muted-foreground',
  };

  // Determine visual status
  let visualStatus: VisualStatus = (pkg.status as VisualStatus) || 'active';
  if (pkg.status === 'active' && remainingLessons <= 1) {
    visualStatus = 'warning';
  }

  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-all',
        statusColors[visualStatus]
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl',
            visualStatus === 'active' && 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50',
            visualStatus === 'warning' && 'bg-amber-100 text-amber-600 dark:bg-amber-900/50',
            visualStatus === 'exhausted' && 'bg-rose-100 text-rose-600 dark:bg-rose-900/50',
            visualStatus === 'expired' && 'bg-muted text-muted-foreground'
          )}>
            <Package className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-foreground">
              Pakiet {pkg.lessons_total} lekcji
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(pkg.purchase_date), 'dd.MM.yyyy', { locale: pl })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={cn(
            'rounded-full px-2 py-0.5 text-xs font-medium',
            visualStatus === 'active' && 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
            visualStatus === 'warning' && 'bg-amber-500/20 text-amber-700 dark:text-amber-400',
            visualStatus === 'exhausted' && 'bg-rose-500/20 text-rose-700 dark:text-rose-400',
            visualStatus === 'expired' && 'bg-muted text-muted-foreground'
          )}>
            {visualStatus === 'active' && 'Aktywny'}
            {visualStatus === 'warning' && 'Kończy się'}
            {visualStatus === 'exhausted' && 'Wykorzystany'}
            {visualStatus === 'expired' && 'Wygasły'}
          </span>
          
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(pkg)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Wykorzystano</span>
          <span className="font-medium">
            {pkg.lessons_used} / {pkg.lessons_total} lekcji
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={cn('h-full transition-all', progressColors[visualStatus])}
            style={{ width: `${usagePercent}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-background/50 p-2">
          <p className="text-xs text-muted-foreground">Pozostało</p>
          <p className={cn(
            'text-lg font-bold',
            remainingLessons === 0 && 'text-rose-600',
            remainingLessons === 1 && 'text-amber-600',
            remainingLessons > 1 && 'text-emerald-600'
          )}>
            {remainingLessons} lekcji
          </p>
        </div>

        {showFinancials && (
          <div className="rounded-lg bg-background/50 p-2">
            <p className="text-xs text-muted-foreground">Cena/lekcję</p>
            <p className="text-lg font-bold text-foreground">
              {pkg.price_per_lesson?.toFixed(0) || (pkg.total_amount / pkg.lessons_total).toFixed(0)} PLN
            </p>
          </div>
        )}
      </div>

      {/* Expiry info */}
      {pkg.expires_at && (
        <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          Wygasa: {format(new Date(pkg.expires_at), 'dd.MM.yyyy', { locale: pl })}
        </div>
      )}

      {/* Total amount for admins */}
      {showFinancials && (
        <div className="mt-3 flex items-center justify-between border-t pt-3">
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" />
            Kwota całkowita
          </span>
          <span className="text-lg font-bold text-foreground">
            {pkg.total_amount.toFixed(0)} PLN
          </span>
        </div>
      )}
    </div>
  );
}
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, XCircle, Package } from 'lucide-react';

interface StudentPaymentStatusProps {
  status: 'active' | 'warning' | 'no_payment' | null;
  remainingLessons?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean; // For admins/managers
}

export function StudentPaymentStatus({
  status,
  remainingLessons = 0,
  showLabel = true,
  size = 'md',
  showDetails = false,
}: StudentPaymentStatusProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-sm gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  if (status === 'active') {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full font-medium',
          'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
          sizeClasses[size]
        )}
      >
        <CheckCircle2 className={iconSizes[size]} />
        {showLabel && <span>Aktywny</span>}
      </span>
    );
  }

  if (status === 'warning') {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full font-medium',
          'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
          sizeClasses[size]
        )}
      >
        <AlertTriangle className={iconSizes[size]} />
        {showLabel && <span>Ostatnia lekcja</span>}
      </span>
    );
  }

  // no_payment or null
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
        sizeClasses[size]
      )}
    >
      <XCircle className={iconSizes[size]} />
      {showLabel && <span>Brak płatności</span>}
    </span>
  );
}

// Simple badge for teachers (without amounts)
export function StudentPaymentBadge({ hasActivePayment }: { hasActivePayment: boolean }) {
  if (hasActivePayment) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
        <Package className="h-3 w-3" />
        Opłacone
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
      <XCircle className="h-3 w-3" />
      Brak opłaty
    </span>
  );
}

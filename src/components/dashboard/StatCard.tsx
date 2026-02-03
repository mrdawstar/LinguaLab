import { LucideIcon, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  iconColor?: string;
  onClick?: () => void;
  limit?: number | null; // Limit dla tego zasobu (null = unlimited)
  current?: number; // Aktualna liczba (używana do obliczenia procentu)
  showLimit?: boolean; // Czy pokazywać limit
}

export function StatCard({ 
  title, 
  value, 
  change, 
  changeType = 'neutral', 
  icon: Icon,
  iconColor = 'text-primary',
  onClick,
  limit,
  current,
  showLimit = false,
}: StatCardProps) {
  const isClickable = Boolean(onClick);
  
  // Oblicz procent wykorzystania limitu
  const usagePercent = limit && current !== undefined 
    ? Math.min(100, Math.round((current / limit) * 100))
    : null;
  
  // Ostrzeżenie przy 90% lub więcej
  const isWarning = usagePercent !== null && usagePercent >= 90;
  const isExceeded = usagePercent !== null && usagePercent >= 100;
  
  // Formatuj wartość z limitem jeśli pokazujemy limit
  const displayValue = showLimit && limit !== null && current !== undefined
    ? `${current}/${limit}`
    : value;

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/50 bg-card px-3 py-2 shadow-sm transition-all hover:shadow-md sm:px-4 sm:py-2.5",
        isClickable && "cursor-pointer hover:border-primary/40 hover:bg-primary/5",
        isWarning && !isExceeded && "border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20",
        isExceeded && "border-destructive/50 bg-destructive/5"
      )}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!isClickable) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick?.();
        }
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-xs font-medium text-muted-foreground sm:text-sm">{title}</p>
            {isWarning && (
              <AlertTriangle className={cn(
                "h-3 w-3 sm:h-4 sm:w-4",
                isExceeded ? "text-destructive" : "text-amber-600 dark:text-amber-400"
              )} />
            )}
          </div>
          <p className={cn(
            "mt-1 text-xl font-bold sm:text-2xl lg:text-3xl",
            isExceeded && "text-destructive",
            isWarning && !isExceeded && "text-amber-700 dark:text-amber-300"
          )}>
            {displayValue}
          </p>
          {change && (
            <p
              className={cn(
                'mt-1 truncate text-xs font-medium sm:text-sm',
                changeType === 'positive' && 'text-emerald-700 dark:text-emerald-300',
                changeType === 'negative' && 'text-rose-600 dark:text-rose-400',
                changeType === 'neutral' && 'text-muted-foreground'
              )}
            >
              {change}
            </p>
          )}
          {showLimit && limit !== null && current !== undefined && (
            <p className={cn(
              'mt-1 text-xs font-medium sm:text-sm',
              isExceeded 
                ? 'text-destructive' 
                : isWarning
                ? 'text-amber-700 dark:text-amber-300'
                : 'text-muted-foreground'
            )}>
              {isExceeded 
                ? 'Limit przekroczony' 
                : usagePercent !== null && usagePercent >= 90
                ? `Użyto ${usagePercent}% limitu`
                : ''}
            </p>
          )}
        </div>
        <div className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 sm:h-10 sm:w-10',
          iconColor.replace('text-', 'text-')
        )}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </div>
    </div>
  );
}

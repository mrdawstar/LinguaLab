import { useSubscription } from '@/hooks/useSubscription';
import { PLAN_CONFIGS } from '@/lib/subscriptionLimits';
import { CheckCircle2, AlertTriangle, XCircle, Clock, RefreshCw, Loader2 } from 'lucide-react';
import { format, differenceInDays, isPast } from 'date-fns';
import { pl } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { toast } from 'sonner';

export function CurrentSubscriptionCard() {
  const { subscription_plan, subscription_end, subscription_period_start, trial_active, trial_ends_at, subscribed, syncSubscription, isLoading } = useSubscription();
  const [isSyncing, setIsSyncing] = useState(false);

  const plan = subscription_plan as 'basic' | 'pro' | 'unlimited' | null;
  const planConfig = plan ? PLAN_CONFIGS[plan] : null;
  const planName = planConfig?.name || (trial_active ? 'Okres próbny' : 'Brak planu');

  // Określ status subskrypcji
  let status: 'active' | 'trial' | 'expiring' | 'expired';
  let statusLabel: string;
  let statusIcon: typeof CheckCircle2;
  let statusColor: string;
  let daysLeft: number | null = null;
  let expiresAt: Date | null = null;

  // PRIORYTET: Jeśli użytkownik ma aktywną subskrypcję (subscribed i plan), pokaż subskrypcję, nie trial
  // Trial jest pokazywany tylko gdy NIE MA aktywnej subskrypcji
  if (subscribed && plan) {
    // Użytkownik ma aktywną subskrypcję - pokaż plan, nie trial
    if (subscription_end) {
      expiresAt = new Date(subscription_end);
      const daysUntilExpiry = differenceInDays(expiresAt, new Date());
      
      if (isPast(expiresAt)) {
        status = 'expired';
        statusLabel = 'Wygasła';
        statusIcon = XCircle;
        statusColor = 'text-destructive';
        daysLeft = 0;
      } else if (daysUntilExpiry <= 7) {
        status = 'expiring';
        statusLabel = 'Wygasa wkrótce';
        statusIcon = AlertTriangle;
        statusColor = 'text-amber-600 dark:text-amber-400';
        daysLeft = daysUntilExpiry;
      } else {
        status = 'active';
        statusLabel = 'Aktywna';
        statusIcon = CheckCircle2;
        statusColor = 'text-emerald-600 dark:text-emerald-400';
        daysLeft = daysUntilExpiry;
      }
    } else {
      status = 'active';
      statusLabel = 'Aktywna';
      statusIcon = CheckCircle2;
      statusColor = 'text-emerald-600 dark:text-emerald-400';
    }
  } else if (trial_active && !subscribed) {
    // Trial jest aktywny tylko gdy NIE MA aktywnej subskrypcji
    status = 'trial';
    statusLabel = 'Okres próbny (7 dni)';
    statusIcon = Clock;
    statusColor = 'text-blue-600 dark:text-blue-400';
    // BŁĄD #7 - poprawiono: walidacja trial_ends_at
    if (trial_ends_at) {
      expiresAt = new Date(trial_ends_at);
      const now = new Date();
      // Sprawdź czy trial_ends_at nie jest w przeszłości
      if (expiresAt < now) {
        // Jeśli trial_ends_at jest w przeszłości, nie pokazuj trial
        expiresAt = null;
        daysLeft = 0;
      } else {
        daysLeft = Math.max(0, differenceInDays(expiresAt, now));
      }
    } else {
      // Fallback: jeśli nie ma trial_ends_at, nie pokazuj trial (może być wygasły)
      expiresAt = null;
      daysLeft = 0;
    }
  }
  // Jeśli plan jest ustawiony ale nie ma subscribed, może być w trakcie synchronizacji
  else if (plan) {
    // Jeśli jest subscription_end, użyj go
    if (subscription_end) {
      expiresAt = new Date(subscription_end);
      const daysUntilExpiry = differenceInDays(expiresAt, new Date());
      
      if (isPast(expiresAt)) {
        status = 'expired';
        statusLabel = 'Wygasła';
        statusIcon = XCircle;
        statusColor = 'text-destructive';
        daysLeft = 0;
      } else if (daysUntilExpiry <= 7) {
        status = 'expiring';
        statusLabel = 'Wygasa wkrótce';
        statusIcon = AlertTriangle;
        statusColor = 'text-amber-600 dark:text-amber-400';
        daysLeft = daysUntilExpiry;
      } else {
        status = 'active';
        statusLabel = 'Aktywna';
        statusIcon = CheckCircle2;
        statusColor = 'text-emerald-600 dark:text-emerald-400';
        daysLeft = daysUntilExpiry;
      }
    } 
    // Jeśli nie ma subscription_end ale jest plan, pokaż jako aktywną
    else {
      status = 'active';
      statusLabel = 'Aktywna';
      statusIcon = CheckCircle2;
      statusColor = 'text-emerald-600 dark:text-emerald-400';
      // Nie ma daty wygaśnięcia - może być subskrypcja bezterminowa lub jeszcze nie zsynchronizowana
    }
  }
  // Brak subskrypcji i trial
  else {
    status = 'expired';
    statusLabel = 'Brak subskrypcji';
    statusIcon = XCircle;
    statusColor = 'text-destructive';
  }

  // Oblicz procent wykorzystania subskrypcji dla progress bara
  const getProgressColor = () => {
    if (status === 'expired') return 'bg-destructive';
    if (status === 'expiring') return 'bg-amber-500';
    if (status === 'trial') return 'bg-emerald-500'; // Zielony pasek dla okresu próbnego
    return 'bg-emerald-500';
  };

  const getProgressPercent = () => {
    // Dla okresu próbnego - oblicz ile zostało z 7 dni
    if (status === 'trial') {
      if (expiresAt) {
        const trialStart = new Date(expiresAt);
        trialStart.setDate(trialStart.getDate() - 7);
        const totalDays = differenceInDays(new Date(expiresAt), trialStart);
        const remainingDays = differenceInDays(new Date(expiresAt), new Date());
        if (totalDays <= 0) return 0;
        return Math.max(0, Math.min(100, (remainingDays / totalDays) * 100));
      } else {
        // Fallback: jeśli nie ma expiresAt, załóż że zostało 7 dni
        return 100;
      }
    }
    
    if (!expiresAt) return 0;
    
    // Dla subskrypcji - użyj rzeczywistego okresu rozliczeniowego z Stripe
    if ((subscribed || plan) && subscription_end) {
      // Jeśli mamy datę rozpoczęcia okresu, użyj jej
      if (subscription_period_start) {
        const periodStart = new Date(subscription_period_start);
        const periodEnd = new Date(subscription_end);
        const totalDays = differenceInDays(periodEnd, periodStart);
        const remainingDays = differenceInDays(periodEnd, new Date());
        if (totalDays <= 0) return 0;
        return Math.max(0, Math.min(100, (remainingDays / totalDays) * 100));
      }
      // Fallback: jeśli nie mamy daty rozpoczęcia, oblicz na podstawie daty wygaśnięcia
      // Zakładamy że okres to różnica między teraz a końcem (ale to nie jest idealne)
      const now = new Date();
      const end = new Date(subscription_end);
      const daysRemaining = differenceInDays(end, now);
      // Jeśli pozostało mniej niż 30 dni, zakładamy że okres to 30 dni (monthly)
      // Jeśli więcej, zakładamy że okres to 365 dni (yearly)
      const assumedPeriodDays = daysRemaining <= 30 ? 30 : 365;
      const assumedStart = new Date(end);
      assumedStart.setDate(assumedStart.getDate() - assumedPeriodDays);
      const totalDays = differenceInDays(end, assumedStart);
      if (totalDays <= 0) return 0;
      return Math.max(0, Math.min(100, (daysRemaining / totalDays) * 100));
    }
    
    return 0;
  };

  const StatusIcon = statusIcon;

  // Pokaż skeleton loader podczas ładowania danych
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm sm:p-6 lg:p-8">
        <div className="mb-4 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <h2 className="text-xl font-bold text-foreground sm:text-2xl">Aktualna subskrypcja</h2>
              <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:px-3 sm:text-sm bg-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Ładowanie...</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-6 w-48 bg-muted animate-pulse rounded" />
              <div className="h-4 w-64 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm sm:p-6 lg:p-8">
      <div className="mb-4 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <h2 className="text-xl font-bold text-foreground sm:text-2xl">Aktualna subskrypcja</h2>
            <div className={cn('flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:px-3 sm:text-sm', 
              status === 'active' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
              status === 'trial' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
              status === 'expiring' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
              status === 'expired' && 'bg-destructive/10 text-destructive'
            )}>
              <StatusIcon className="h-4 w-4" />
              {statusLabel}
            </div>
          </div>
          
          <div className="space-y-2">
            {/* Pokaż informacje o trial jeśli jest aktywny (najwyższy priorytet) */}
            {status === 'trial' ? (
              <>
                <p className="text-lg font-semibold text-foreground sm:text-xl">
                  Okres próbny - <span className="text-primary">wszystkie funkcje premium</span>
                </p>
                <div className="mt-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-sm font-medium text-foreground mb-1">
                    Limity okresu próbnego:
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1 sm:text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      <span>Do <strong className="text-foreground">25 uczniów</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      <span>Do <strong className="text-foreground">3 nauczycieli</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      <span>Do <strong className="text-foreground">10 grup</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      <span><strong className="text-foreground">Wszystkie funkcje premium</strong> aktywne</span>
                    </li>
                  </ul>
                </div>
                {expiresAt && (
                  <>
                    {daysLeft !== null && daysLeft >= 0 && (
                      <p className="text-sm text-muted-foreground">
                        {daysLeft === 0 
                          ? 'Wygasa dzisiaj'
                          : daysLeft === 1
                            ? 'Pozostał 1 dzień'
                            : `Pozostało ${daysLeft} ${daysLeft === 1 ? 'dzień' : daysLeft < 5 ? 'dni' : 'dni'}`
                        }
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Wygasa: <span className="font-medium">{format(expiresAt, 'd MMMM yyyy', { locale: pl })}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 bg-muted/50 p-2 rounded-lg border border-border/50">
                      💡 Możesz wybrać plan w dowolnym momencie. Twoje dane pozostaną w systemie po zakupie.
                    </p>
                  </>
                )}
              </>
            ) : (subscribed || plan) ? (
              <>
                <p className="text-lg font-semibold text-foreground sm:text-xl">
                  Plan: <span className="text-primary">{planName}</span>
                </p>
                {expiresAt ? (
                  <>
                    {daysLeft !== null && daysLeft >= 0 && (
                      <p className="text-sm text-muted-foreground">
                        {daysLeft === 0 
                          ? 'Wygasła dzisiaj'
                          : daysLeft === 1
                            ? 'Wygasa za 1 dzień'
                            : `Wygasa za ${daysLeft} ${daysLeft === 1 ? 'dzień' : daysLeft < 5 ? 'dni' : 'dni'}`
                        }
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Wygasa: <span className="font-medium">{format(expiresAt, 'd MMMM yyyy', { locale: pl })}</span>
                    </p>
                  </>
                ) : plan ? (
                  <p className="text-sm text-muted-foreground">
                    Subskrypcja aktywna. Data wygaśnięcia zostanie zaktualizowana automatycznie.
                  </p>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Progress bar - pokazuj zawsze dla trial, nawet jeśli nie ma expiresAt */}
      {(expiresAt || status === 'trial') && status !== 'expired' && (
        <div className="space-y-2">
          <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn('h-full transition-all duration-500 ease-out', getProgressColor())}
              style={{ width: `${getProgressPercent()}%` }}
            />
          </div>
          <div className="flex flex-col gap-1 text-[10px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:text-xs">
            {status === 'trial' ? (
              <>
                <span className="text-center sm:text-left">Początek okresu próbnego</span>
                <span className="text-center font-semibold text-emerald-600 dark:text-emerald-400">{getProgressPercent().toFixed(0)}% pozostało</span>
                <span className="text-center sm:text-right">Koniec okresu próbnego</span>
              </>
            ) : subscription_period_start ? (
              <>
                <span className="text-center sm:text-left">{format(new Date(subscription_period_start), 'd MMM yyyy', { locale: pl })}</span>
                <span className="text-center">{getProgressPercent().toFixed(0)}% pozostało</span>
                <span className="text-center sm:text-right">{format(expiresAt!, 'd MMM yyyy', { locale: pl })}</span>
              </>
            ) : (
              <>
                <span className="text-center sm:text-left">Początek okresu</span>
                <span className="text-center">{getProgressPercent().toFixed(0)}% pozostało</span>
                <span className="text-center sm:text-right">{format(expiresAt!, 'd MMM yyyy', { locale: pl })}</span>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Informacja gdy brak daty wygaśnięcia ale subskrypcja jest aktywna */}
      {!expiresAt && status === 'active' && plan && (
        <div className="mt-4 rounded-lg bg-muted/50 p-3 border border-border/50 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-2 sm:text-sm">
                💡 Subskrypcja jest aktywna. Data wygaśnięcia zostanie zaktualizowana automatycznie po synchronizacji z systemem płatności.
              </p>
              <Button
                onClick={async () => {
                  setIsSyncing(true);
                  try {
                    await syncSubscription();
                    toast.success('Subskrypcja zsynchronizowana pomyślnie');
                  } catch (error: any) {
                    toast.error(error.message || 'Nie udało się zsynchronizować subskrypcji');
                  } finally {
                    setIsSyncing(false);
                  }
                }}
                disabled={isSyncing}
                size="sm"
                variant="outline"
                className="mt-2 w-full sm:w-auto"
              >
                <RefreshCw className={cn("mr-2 h-3 w-3", isSyncing && "animate-spin")} />
                {isSyncing ? 'Synchronizowanie...' : 'Zsynchronizuj z Stripe'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

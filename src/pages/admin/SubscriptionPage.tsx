import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CurrentSubscriptionCard } from '@/components/subscription/CurrentSubscriptionCard';
import { PlanComparison } from '@/components/subscription/PlanComparison';
import { Info } from 'lucide-react';

export default function SubscriptionPage() {
  return (
    <DashboardLayout 
      title="Subskrypcja" 
      subtitle="Zarządzaj swoim planem subskrypcyjnym"
      requiredRole="admin"
    >
      <div className="space-y-4 sm:space-y-6">
        {/* Current Subscription */}
        <CurrentSubscriptionCard />

        {/* Plan Comparison */}
        <PlanComparison />

        {/* Helpful Information */}
        <div className="rounded-2xl border border-border/50 bg-muted/30 p-4 sm:p-6">
          <div className="flex items-start gap-2 sm:gap-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary sm:h-5 sm:w-5" />
            <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">Zmiana planu możliwa jest od początku nowego okresu rozliczeniowego.</strong> Aby upgradować plan, należy poczekać do końca aktualnego miesiąca.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

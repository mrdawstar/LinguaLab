import { useState } from 'react';
import { useSubscriptionContext } from '@/contexts/SubscriptionContext';
import { useSubscription } from '@/hooks/useSubscription';
import { PLAN_CONFIGS, PlanType } from '@/lib/subscriptionLimits';
import { CheckCircle2, Crown, Sparkles, TrendingUp, Infinity as InfinityIcon, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

type BillingCycle = 'monthly' | 'yearly';

const plans = [
  {
    id: 'basic' as PlanType,
    name: 'Starter',
    icon: Sparkles,
    description: 'Idealny start dla małych szkół',
    features: [
      { label: 'Do 120 uczniów', included: true },
      { label: 'Do 5 nauczycieli', included: true },
      { label: 'Grupy i harmonogram', included: true },
      { label: 'Płatności i pakiety', included: true },
      { label: 'Podstawowe statystyki', included: true },
    ],
    popular: false,
  },
  {
    id: 'pro' as PlanType,
    name: 'Growth',
    icon: TrendingUp,
    description: 'Dla rozwijających się szkół',
    features: [
      { label: 'Do 500 uczniów', included: true },
      { label: 'Do 15 nauczycieli', included: true },
      { label: 'Wszystko z planu Starter', included: true },
      { label: 'Pełny dashboard (przychody, wykresy)', included: true },
      { label: 'Raporty tygodniowe i miesięczne', included: true },
      { label: 'Automatyczne powiadomienia email', included: true },
    ],
    popular: true,
  },
  {
    id: 'unlimited' as PlanType,
    name: 'Unlimited',
    icon: InfinityIcon,
    description: 'Dla największych szkół',
    features: [
      { label: 'Nieograniczona liczba uczniów', included: true },
      { label: 'Nieograniczona liczba nauczycieli', included: true },
      { label: 'Nieograniczona liczba grup', included: true },
      { label: 'Brak limitów funkcjonalnych', included: true },
      { label: 'Wszystkie funkcje systemu', included: true },
      { label: 'Priorytetowe przetwarzanie danych', included: true },
      { label: 'Najwyższy limit API / zapytań', included: true },
      { label: 'Najlepsza wydajność dashboardu', included: true },
      { label: 'Wsparcie 24/7 (priorytet)', included: true },
      { label: 'Dostęp do wszystkich nowych funkcji w pierwszej kolejności', included: true },
    ],
    popular: false,
  },
];

export function PlanComparison() {
  const { subscription } = useSubscriptionContext();
  const { createCheckout } = useSubscription();
  const { subscription_plan } = subscription;
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const currentPlan = subscription_plan as PlanType;

  const handlePlanSelect = (planId: PlanType) => {
    if (!planId) {
      if (import.meta.env.DEV) {
        console.error('handlePlanSelect: planId is null or undefined');
      }
      return;
    }
    if (planId === currentPlan) return;
    if (import.meta.env.DEV) {
      console.log('handlePlanSelect: setting plan to', planId);
    }
    setSelectedPlan(planId);
    setConfirmDialogOpen(true);
  };

  const handleConfirmChange = async () => {
    if (!selectedPlan) {
      toast.error('Nie wybrano planu');
      return;
    }
    
    // Walidacja planu
    const validPlans: PlanType[] = ['basic', 'pro', 'unlimited'];
    if (!validPlans.includes(selectedPlan)) {
      if (import.meta.env.DEV) {
        console.error('Invalid plan:', selectedPlan);
      }
      toast.error('Nieprawidłowy plan');
      return;
    }
    
    setIsProcessing(true);
    try {
      if (import.meta.env.DEV) {
        console.log('Creating checkout with plan:', selectedPlan, 'billingCycle:', billingCycle);
      }
      await createCheckout(selectedPlan, billingCycle);
      setConfirmDialogOpen(false);
      toast.success('Przekierowywanie do płatności...');
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error creating checkout:', error);
      }
      const errorMessage = error instanceof Error ? error.message : 'Nie udało się utworzyć sesji płatności';
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const isUpgrade = (planId: PlanType | null): boolean => {
    if (!planId || !currentPlan) return true;
    const planOrder: PlanType[] = ['basic', 'pro', 'unlimited'];
    const currentIndex = planOrder.indexOf(currentPlan);
    const selectedIndex = planOrder.indexOf(planId);
    return selectedIndex > currentIndex;
  };

  const getSelectedPlanName = () => {
    if (!selectedPlan) return '';
    return PLAN_CONFIGS[selectedPlan]?.name || '';
  };

  const calculateSavings = (monthlyPrice: number, yearlyPrice: number) => {
    const yearlyTotal = monthlyPrice * 12;
    return Math.round(yearlyTotal - yearlyPrice);
  };

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Billing Cycle Toggle */}
      <div className="flex flex-col items-center mb-12 relative px-2">
        {/* Fixed height container for savings message to prevent layout shift */}
        <div className="h-10 mb-4 flex items-center justify-center -mt-2">
          <div className={cn(
            "inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full transition-all duration-300 shadow-lg shadow-emerald-500/20",
            billingCycle === 'yearly'
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 -translate-y-2 pointer-events-none absolute'
          )}>
            <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400 drop-shadow-[0_0_4px_rgba(16,185,129,0.5)]" />
            <span className="text-emerald-600 dark:text-emerald-400 text-sm font-semibold whitespace-nowrap drop-shadow-[0_0_4px_rgba(16,185,129,0.5)]">
              Oszczędzasz 20% przy płatności rocznej
            </span>
          </div>
        </div>

        {/* Toggle Switch */}
        <div className="relative inline-flex items-center rounded-full border-2 border-border bg-muted/50 p-1.5 overflow-hidden">
          {/* Animated background slider */}
          <div
            className={cn(
              'absolute top-1.5 bottom-1.5 rounded-full bg-gradient-primary shadow-lg transition-all duration-500 ease-in-out',
              billingCycle === 'monthly' 
                ? 'left-1.5 right-[calc(50%+6px)]' 
                : 'left-[calc(50%+6px)] right-1.5'
            )}
          />
          <button
            onClick={() => setBillingCycle('monthly')}
            className={cn(
              'relative z-10 px-8 py-3 rounded-full text-sm font-semibold transition-all duration-500',
              billingCycle === 'monthly'
                ? 'text-primary-foreground scale-105'
                : 'text-muted-foreground hover:text-foreground'
            )}
            aria-label="Przełącz na rozliczenie miesięczne"
            aria-pressed={billingCycle === 'monthly'}
          >
            Miesięcznie
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={cn(
              'relative z-10 px-8 py-3 rounded-full text-sm font-semibold transition-all duration-500',
              billingCycle === 'yearly'
                ? 'text-primary-foreground scale-105'
                : 'text-muted-foreground hover:text-foreground'
            )}
            aria-label="Przełącz na rozliczenie roczne"
            aria-pressed={billingCycle === 'yearly'}
          >
            Rocznie
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid gap-4 grid-cols-1 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 items-start">
        {plans.map((plan) => {
          const planConfig = PLAN_CONFIGS[plan.id!];
          const monthlyPrice = planConfig.price.monthly;
          const yearlyPrice = planConfig.price.yearly;
          const monthlyEquivalent = Math.round(yearlyPrice / 12);
          const savings = monthlyPrice - monthlyEquivalent;
          const savingsPercent = Math.round((savings / monthlyPrice) * 100);
          
          const isCurrentPlan = plan.id === currentPlan;
          const Icon = plan.icon;
          const isUnlimited = plan.id === 'unlimited';

          return (
            <div
              key={plan.id}
              className={cn(
                'relative flex flex-col rounded-2xl border-2 transition-all duration-500 ease-in-out hover:shadow-2xl hover:-translate-y-1',
                isUnlimited
                  ? 'border-emerald-500/40 bg-gradient-to-b from-emerald-500/10 to-emerald-500/5 shadow-xl shadow-emerald-500/10'
                  : plan.popular
                  ? 'border-primary/50 bg-primary/5 shadow-lg shadow-primary/10'
                  : 'border-border bg-card shadow-sm hover:border-primary/30',
                isCurrentPlan && 'ring-2 ring-primary ring-offset-2'
              )}
            >
              {/* Unlimited Badge */}
              {isUnlimited && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <span className="rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/30">
                    Pełna swoboda
                  </span>
                </div>
              )}

              {/* Popular Badge */}
              {plan.popular && !isUnlimited && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 sm:-top-3">
                  <span className="rounded-full bg-gradient-to-r from-primary to-primary/80 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-md sm:px-3 sm:py-1 sm:text-xs">
                    Polecany
                  </span>
                </div>
              )}

              {/* Current Plan Badge */}
              {isCurrentPlan && (
                <div className="absolute -top-2 right-2 z-10 sm:-top-3 sm:right-4">
                  <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-md sm:px-3 sm:py-1 sm:text-xs">
                    Aktualny plan
                  </span>
                </div>
              )}

              <div className="p-8">
                {/* Header */}
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-xl',
                      isUnlimited ? 'bg-emerald-500/20' : plan.popular ? 'bg-primary/15' : 'bg-primary/10'
                    )}>
                      <Icon className={cn(
                        'h-6 w-6',
                        isUnlimited ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary'
                      )} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-foreground">{plan.name}</h3>
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
                    </div>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-6 relative min-h-[100px] overflow-hidden">
                  {/* Monthly Price */}
                  <div className={cn(
                    "absolute inset-0 flex flex-col justify-start transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                    billingCycle === 'monthly'
                      ? 'opacity-100 translate-y-0 scale-100 rotate-0'
                      : 'opacity-0 -translate-y-8 scale-95 rotate-[-3deg] pointer-events-none'
                  )}>
                    <div className="flex items-baseline gap-2">
                      <span className={cn(
                        "text-4xl font-bold text-foreground transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                        billingCycle === 'monthly' 
                          ? 'translate-x-0 opacity-100 scale-100' 
                          : 'translate-x-[-20px] opacity-0 scale-90'
                      )}>
                        {monthlyPrice}
                      </span>
                      <span className={cn(
                        "text-lg text-muted-foreground transition-all duration-500 delay-75",
                        billingCycle === 'monthly' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                      )}>
                        zł
                      </span>
                      <span className={cn(
                        "text-muted-foreground transition-all duration-500 delay-100",
                        billingCycle === 'monthly' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                      )}>
                        /miesiąc
                      </span>
                    </div>
                  </div>
                  
                  {/* Yearly Price */}
                  <div className={cn(
                    "absolute inset-0 flex flex-col justify-start transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                    billingCycle === 'yearly'
                      ? 'opacity-100 translate-y-0 scale-100 rotate-0'
                      : 'opacity-0 translate-y-8 scale-95 rotate-[3deg] pointer-events-none'
                  )}>
                    <div className="flex items-baseline gap-2 mb-2 flex-wrap">
                      <span className={cn(
                        "text-4xl font-bold text-foreground transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                        billingCycle === 'yearly' 
                          ? 'translate-x-0 opacity-100 scale-100' 
                          : 'translate-x-[20px] opacity-0 scale-90'
                      )}>
                        {monthlyEquivalent}
                      </span>
                      <span className={cn(
                        "text-lg text-muted-foreground transition-all duration-500 delay-75",
                        billingCycle === 'yearly' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                      )}>
                        zł
                      </span>
                      <span className={cn(
                        "text-muted-foreground transition-all duration-500 delay-100",
                        billingCycle === 'yearly' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                      )}>
                        /miesiąc
                      </span>
                      <span className={cn(
                        "ml-2 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] delay-150",
                        billingCycle === 'yearly' 
                          ? 'opacity-100 scale-100 rotate-0 translate-x-0 translate-y-0' 
                          : 'opacity-0 scale-50 rotate-12 translate-x-4 translate-y-[-10px]'
                      )}>
                        –20%
                      </span>
                    </div>
                    <div className={cn(
                      "flex items-center gap-2 flex-wrap transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] delay-200",
                      billingCycle === 'yearly'
                        ? 'opacity-100 translate-y-0 scale-100'
                        : 'opacity-0 translate-y-4 scale-95'
                    )}>
                      <span className="text-sm text-muted-foreground">{yearlyPrice} zł</span>
                      <span className="text-sm text-muted-foreground">/rok</span>
                      <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                        Oszczędzasz {savings} zł
                      </span>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-foreground">{feature.label}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button
                  onClick={() => {
                    if (!plan.id) {
                      if (import.meta.env.DEV) {
                        console.error('Plan ID is null:', plan);
                      }
                      toast.error('Błąd: Nieprawidłowy plan');
                      return;
                    }
                    handlePlanSelect(plan.id);
                  }}
                  disabled={isCurrentPlan || !plan.id}
                  className={cn(
                    'w-full py-6 text-base font-semibold rounded-xl transition-all duration-300',
                    isUnlimited && !isCurrentPlan && 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:opacity-90 shadow-lg hover:shadow-xl shadow-emerald-500/30 hover:shadow-emerald-500/50',
                    plan.popular && !isCurrentPlan && !isUnlimited && 'bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-lg hover:shadow-xl',
                    !isUnlimited && !plan.popular && !isCurrentPlan && 'bg-card border-2 border-border text-foreground hover:border-primary hover:bg-primary/5 hover:text-primary',
                    isCurrentPlan && 'cursor-not-allowed opacity-50'
                  )}
                  variant={isCurrentPlan ? 'outline' : 'default'}
                >
                  {isCurrentPlan ? (
                    'Aktualny plan'
                  ) : plan.id === 'basic' ? (
                    'Rozpocznij'
                  ) : plan.id === 'pro' ? (
                    <>
                      <Crown className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      Przejdź na Growth
                    </>
                  ) : isUnlimited ? (
                    <>
                      <Crown className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      Odblokuj wszystko
                    </>
                  ) : (
                    'Zmień plan'
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              {isUpgrade(selectedPlan!) ? 'Upgrade planu' : 'Zmiana planu'}
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              {isUpgrade(selectedPlan!) ? (
                <>
                  Przejdziesz na plan <strong>{getSelectedPlanName()}</strong>. Zmiany będą widoczne natychmiast po opłaceniu.
                </>
              ) : (
                <>
                  Zmienisz plan na <strong>{getSelectedPlanName()}</strong>. Zmiany będą widoczne od następnego okresu rozliczeniowego.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
              disabled={isProcessing}
              className="w-full rounded-xl sm:w-auto"
            >
              Anuluj
            </Button>
            <Button
              onClick={handleConfirmChange}
              disabled={isProcessing}
              className="w-full bg-gradient-primary rounded-xl sm:w-auto"
            >
              {isProcessing ? 'Przetwarzanie...' : 'Potwierdź'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

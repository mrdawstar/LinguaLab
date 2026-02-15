import { ReactNode, useEffect, useState, useRef } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useSubscriptionContext } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Crown, Loader2, Sparkles, Mail, CheckCircle2, TrendingUp, Infinity as InfinityIcon, ArrowRight, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { PLAN_CONFIGS, PlanType } from '@/lib/subscriptionLimits';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface SubscriptionGuardProps {
  children: ReactNode;
}

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const { role, user, schoolId, isLoading: authIsLoading } = useAuth();
  const { subscription, isLoading: contextIsLoading } = useSubscriptionContext();
  // Używamy useSubscription tylko do createCheckout - stan pobieramy z contextu
  const { createCheckout } = useSubscription();
  
  const {
    access_allowed,
    trial_active,
    trial_days_left,
    subscribed,
    isLoading: subscriptionIsLoading,
  } = subscription;
  
  // isLoading tylko jeśli:
  // 1. AuthContext się ładuje LUB
  // 2. Użytkownik jest zalogowany ale brak schoolId LUB
  // 3. Context się ładuje (contextIsLoading === true) LUB
  // 4. Subscription się jeszcze ładuje (subscriptionIsLoading === true)
  // NIE pokazuj loading jeśli mamy już zainicjalizowane dane - nawet jeśli są stare, użyj ich
  const isLoading = authIsLoading || (user && !schoolId) || contextIsLoading || subscriptionIsLoading;
  const lastLogRef = useRef<string>('');
  useEffect(() => {
    const key = `${role ?? ''}-${schoolId ?? ''}-${access_allowed}-${isLoading}`;
    if (key === lastLogRef.current) return;
    lastLogRef.current = key;
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/3e50eb41-c314-427c-becc-59b2a821ca76',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SubscriptionGuard.tsx',message:'Guard state',data:{role,schoolId,access_allowed,authIsLoading,contextIsLoading,subscriptionIsLoading,isLoading,showBlocked: !contextIsLoading && !subscriptionIsLoading && !access_allowed},timestamp:Date.now(),hypothesisId:'D'})}).catch(()=>{});
    // #endregion
  }, [role, schoolId, access_allowed, isLoading, authIsLoading, contextIsLoading, subscriptionIsLoading]);

  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  const isAdmin = role === 'admin';
  const showTrialBanner =
    trial_active && !subscribed && trial_days_left > 0;

  useEffect(() => {
    document.body.classList.toggle('trial-banner', showTrialBanner);
    return () => {
      document.body.classList.remove('trial-banner');
    };
  }, [showTrialBanner]);

  // Jeśli użytkownik nie jest zalogowany i AuthContext zakończył ładowanie, przekieruj do logowania
  if (!authIsLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  // ⏳ Loading - pokaż ekran ładowania TYLKO jeśli:
  // 1. AuthContext jeszcze się ładuje LUB
  // 2. Użytkownik jest zalogowany ALE brak schoolId LUB
  // 3. SubscriptionContext się ładuje I nie mamy jeszcze żadnych danych
  // Jeśli mamy dane w cache (nawet stare), użyj ich natychmiast - nie pokazuj loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Sprawdzanie subskrypcji…</p>
        </div>
      </div>
    );
  }

  // 🚫 Brak dostępu - pokaż pełne porównanie planów
  // TYLKO jeśli dane są już załadowane (nie pokazuj tego podczas ładowania)
  // Jeśli contextIsLoading jest true, to znaczy że dane się jeszcze ładują - nie pokazuj ekranu braku dostępu
  // Jeśli subscriptionIsLoading jest true, to też znaczy że dane się jeszcze ładują
  if (!contextIsLoading && !subscriptionIsLoading && !access_allowed) {
    return <ExpiredSubscriptionScreen 
      isAdmin={isAdmin} 
      createCheckout={createCheckout}
      user={user}
      trial_active={trial_active}
    />;
  }

  // ✅ Dostęp OK
  return (
    <>
      {showTrialBanner && (
        <div className="fixed top-0 left-0 right-0 z-[80] bg-gradient-primary text-primary-foreground shadow-lg">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 px-4 py-2 sm:py-3 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 text-center sm:text-left">
              <span className="font-medium text-sm sm:text-base">
                Pozostało {trial_days_left} {trial_days_left === 1 ? 'dzień' : 'dni'} okresu próbnego
              </span>
              <span className="text-xs sm:text-sm opacity-90">
                (Limity: 25 uczniów, 3 nauczycieli • Wszystkie funkcje premium aktywne)
              </span>
            </div>
            {isAdmin && (
              <Link 
                to="/admin/subscription" 
                className="px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition-colors backdrop-blur-sm border border-white/20 text-sm whitespace-nowrap"
              >
                Wybierz plan →
              </Link>
            )}
          </div>
        </div>
      )}
      <div className={showTrialBanner ? 'pt-20 sm:pt-16' : undefined}>{children}</div>
    </>
  );
}

// Komponent ekranu wygasłej subskrypcji z pełnym porównaniem planów
function ExpiredSubscriptionScreen({ 
  isAdmin, 
  createCheckout,
  user,
  trial_active
}: { 
  isAdmin: boolean; 
  createCheckout: (plan: 'basic' | 'pro' | 'unlimited', billingCycle: 'monthly' | 'yearly') => Promise<void>;
  user: any;
  trial_active: boolean;
}) {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<PlanType | null>(null);

  const plans = [
    {
      id: 'basic' as PlanType,
      name: 'Starter',
      icon: Sparkles,
      description: 'Idealny start dla małych szkół',
      features: [
        'Do 120 uczniów',
        'Do 5 nauczycieli',
        'Grupy i harmonogram',
        'Płatności i pakiety',
        'Podstawowe statystyki',
      ],
    },
    {
      id: 'pro' as PlanType,
      name: 'Growth',
      icon: TrendingUp,
      description: 'Dla rozwijających się szkół',
      features: [
        'Do 500 uczniów',
        'Do 15 nauczycieli',
        'Wszystko z planu Starter',
        'Pełny dashboard (przychody, wykresy)',
        'Raporty tygodniowe i miesięczne',
        'Automatyczne powiadomienia email',
      ],
      popular: true,
    },
    {
      id: 'unlimited' as PlanType,
      name: 'Unlimited',
      icon: InfinityIcon,
      description: 'Dla największych szkół',
      features: [
        'Nieograniczona liczba uczniów',
        'Nieograniczona liczba nauczycieli',
        'Nieograniczona liczba grup',
        'Brak limitów funkcjonalnych',
        'Wszystkie funkcje systemu',
        'Priorytetowe wsparcie 24/7',
      ],
    },
  ];

  const handlePlanSelect = (planId: PlanType) => {
    if (!planId) return;
    setSelectedPlan(planId);
    setConfirmDialogOpen(true);
  };

  const handleConfirmPurchase = async () => {
    if (!selectedPlan) {
      toast.error('Nie wybrano planu');
      return;
    }
    
    setIsProcessing(true);
    setLoadingPlan(selectedPlan);
    try {
      await createCheckout(selectedPlan, billingCycle);
      setConfirmDialogOpen(false);
      toast.success('Przekierowywanie do płatności...');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Nie udało się utworzyć sesji płatności';
      toast.error(errorMessage);
      setLoadingPlan(null);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-lg w-full text-center">
          <div className="glass-card p-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mx-auto mb-6">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Brak aktywnej subskrypcji</h1>
            <p className="text-muted-foreground mb-4">
              Subskrypcja szkoły wygasła. Skontaktuj się z administratorem.
            </p>
            <div className="mb-6 p-4 rounded-xl bg-muted/50 border">
              <Mail className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Skontaktuj się z administratorem szkoły.
              </p>
            </div>
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
              ← Powrót do strony głównej
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:py-12 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-3xl font-bold mb-3 sm:text-4xl">
            {trial_active ? 'Okres próbny wygasł' : 'Subskrypcja wygasła'}
          </h1>
          <p className="text-muted-foreground text-lg mb-6">
            {trial_active 
              ? 'Twój 7-dniowy okres próbny dobiegł końca. Wybierz plan, aby kontynuować korzystanie z systemu z pełnym dostępem do wszystkich funkcji.'
              : 'Twoja subskrypcja wygasła. Wybierz plan, aby kontynuować korzystanie z systemu.'
            }
          </p>
          
          {/* Info boxes */}
          <div className="grid gap-3 sm:grid-cols-2 max-w-2xl mx-auto mb-8">
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg border border-border/50 text-left">
              <strong className="text-foreground">Twoje dane są bezpieczne!</strong> Wszystkie wprowadzone dane pozostaną w systemie po zakupie planu.
            </div>
            <div className="text-sm text-muted-foreground bg-blue-500/10 p-3 rounded-lg border border-blue-500/20 text-left">
              <strong className="text-blue-600 dark:text-blue-400">Po zakupie planu:</strong> Będziesz mógł kontynuować korzystanie pod tym samym emailem.
            </div>
          </div>
        </div>

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
            >
              Rocznie
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid gap-4 grid-cols-1 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {plans.map((plan) => {
            const planConfig = PLAN_CONFIGS[plan.id!];
            const monthlyPrice = planConfig.price.monthly;
            const yearlyPrice = planConfig.price.yearly;
            const monthlyEquivalent = Math.round(yearlyPrice / 12);
            const savings = monthlyPrice - monthlyEquivalent;
            const savingsPercent = Math.round((savings / monthlyPrice) * 100);
            
            const Icon = plan.icon;
            const isUnlimited = plan.id === 'unlimited';
            const isLoading = loadingPlan === plan.id;

            return (
              <div
                key={plan.id}
                className={cn(
                  'relative flex flex-col rounded-2xl border-2 transition-all duration-500 ease-in-out hover:shadow-2xl hover:-translate-y-1',
                  isUnlimited
                    ? 'border-emerald-500/40 bg-gradient-to-b from-emerald-500/10 to-emerald-500/5 shadow-xl shadow-emerald-500/10'
                    : plan.popular
                    ? 'border-primary/50 bg-primary/5 shadow-lg shadow-primary/10'
                    : 'border-border bg-card shadow-sm hover:border-primary/30'
                )}
              >
                {/* Badges */}
                {isUnlimited && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <span className="rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/30">
                      Pełna swoboda
                    </span>
                  </div>
                )}
                {plan.popular && !isUnlimited && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <span className="rounded-full bg-gradient-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-md">
                      Polecany
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
                        <span className="text-sm text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <Button
                    onClick={() => handlePlanSelect(plan.id!)}
                    disabled={isProcessing || !user || isLoading}
                    className={cn(
                      'w-full py-6 text-base font-semibold rounded-xl transition-all duration-300',
                      isUnlimited && !isLoading && 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:opacity-90 shadow-lg hover:shadow-xl shadow-emerald-500/30 hover:shadow-emerald-500/50',
                      plan.popular && !isUnlimited && !isLoading && 'bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-lg hover:shadow-xl',
                      !isUnlimited && !plan.popular && !isLoading && 'bg-card border-2 border-border text-foreground hover:border-primary hover:bg-primary/5 hover:text-primary',
                      isLoading && 'opacity-50'
                    )}
                    variant={isLoading ? 'default' : 'default'}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Przetwarzanie...
                      </>
                    ) : plan.id === 'basic' ? (
                      'Rozpocznij'
                    ) : plan.id === 'pro' ? (
                      <>
                        <Crown className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        Wybierz Growth
                      </>
                    ) : (
                      <>
                        <Crown className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        Odblokuj wszystko
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Link to detailed subscription page */}
        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => navigate('/admin/subscription')}
            className="gap-2"
          >
            Zobacz szczegóły wszystkich planów
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Confirmation Dialog */}
        <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">
                Potwierdź wybór planu
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                Przejdziesz na plan <strong>{PLAN_CONFIGS[selectedPlan!]?.name}</strong>. 
                Zmiany będą widoczne natychmiast po opłaceniu.
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
                onClick={handleConfirmPurchase}
                disabled={isProcessing}
                className="w-full bg-gradient-primary rounded-xl sm:w-auto"
              >
                {isProcessing ? 'Przetwarzanie...' : 'Przejdź do płatności'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowRight, Crown } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';
import { PLAN_CONFIGS, TRIAL_CONFIG } from '@/lib/subscriptionLimits';
import type { PlanType } from '@/lib/subscriptionLimits';

interface LimitExceededDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: 'students' | 'teachers' | 'groups';
  currentPlan: PlanType;
  recommendedPlan: PlanType | null;
}

export function LimitExceededDialog({
  open,
  onOpenChange,
  resource,
  currentPlan,
  recommendedPlan,
}: LimitExceededDialogProps) {
  const { createCheckout, trial_active, subscribed, subscription_plan } = useSubscription();
  const navigate = useNavigate();

  const resourceNames = {
    students: 'uczniów',
    teachers: 'nauczycieli',
    groups: 'grup',
  };

  const resourceName = resourceNames[resource];
  // BŁĄD: Jeśli subscription_plan jest null, to nawet jeśli subscribed jest true, to jest to trial
  // Naprawiono: Trial jest aktywny gdy trial_active jest true LUB (trial_active jest true i subscription_plan jest null)
  const isTrial = trial_active && (!subscribed || subscription_plan === null);
  const currentPlanName = isTrial 
    ? 'Okres próbny' 
    : (currentPlan ? PLAN_CONFIGS[currentPlan]?.name : 'Brak planu');
  const recommendedPlanName = recommendedPlan ? PLAN_CONFIGS[recommendedPlan]?.name : null;
  const recommendedPlanPrice = recommendedPlan ? PLAN_CONFIGS[recommendedPlan]?.price.monthly : null;

  const handleUpgrade = async () => {
    if (!recommendedPlan) return;
    try {
      await createCheckout(recommendedPlan, 'monthly');
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error creating checkout:', error);
      }
    }
  };

  const handleViewPlans = () => {
    onOpenChange(false);
    navigate('/');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/20">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <DialogTitle>Osiągnięto limit {resourceName}</DialogTitle>
              <DialogDescription className="mt-1">
                {isTrial 
                  ? `Okres próbny pozwala na maksymalnie ${TRIAL_CONFIG.limits[resource === 'students' ? 'maxStudents' : resource === 'teachers' ? 'maxTeachers' : 'maxGroups']} ${resourceName}. Wybierz plan, aby zwiększyć limity.`
                  : `Twój plan ${currentPlanName} nie pozwala na dodanie więcej ${resourceName}.`
                }
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {recommendedPlan && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <Crown className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">
                    {isTrial ? 'Wybierz plan' : `Przejdź na plan ${recommendedPlanName}`}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isTrial 
                      ? `Twoje dane pozostaną w systemie. Otrzymasz większe limity i dostęp do wszystkich funkcji za ${recommendedPlanPrice} zł/mies.`
                      : `Otrzymasz większe limity i dostęp do dodatkowych funkcji za ${recommendedPlanPrice} zł/mies.`
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {recommendedPlan && (
              <Button
                onClick={handleUpgrade}
                className="w-full bg-gradient-primary"
              >
                <Crown className="mr-2 h-4 w-4" />
                Przejdź na {recommendedPlanName}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                navigate('/admin/subscription');
              }}
              className="w-full"
            >
              Zobacz wszystkie plany
            </Button>
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              Zamknij
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

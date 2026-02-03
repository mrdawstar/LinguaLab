import { ReactNode } from 'react';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import { AlertCircle, Crown, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface PremiumFeatureGuardProps {
  children: ReactNode;
  feature: 'automaticEmails' | 'advancedAnalytics' | 'weeklyReports' | 'monthlyReports' | 'customIntegrations' | 'prioritySupport';
  fallback?: ReactNode;
  showUpgrade?: boolean;
  className?: string;
}

export function PremiumFeatureGuard({
  children,
  feature,
  fallback,
  showUpgrade = true,
  className,
}: PremiumFeatureGuardProps) {
  const { features, plan, recommendedUpgradePlan } = useSubscriptionLimits();
  const { createCheckout, trial_active, subscribed, subscription_plan } = useSubscription();
  const navigate = useNavigate();

  // Trial ma dostęp do wszystkich funkcji premium
  // BŁĄD: Jeśli subscription_plan jest null, to nawet jeśli subscribed jest true, to jest to trial
  // Naprawiono: Trial jest aktywny gdy trial_active jest true LUB (trial_active jest true i subscription_plan jest null)
  const isTrial = trial_active && (!subscribed || subscription_plan === null);
  const hasAccess = isTrial ? true : features[feature];

  if (hasAccess) {
    return <div className={cn('w-full h-full', className)}>{children}</div>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  const planName = isTrial ? 'Okres próbny' : (plan ? (plan === 'basic' ? 'Starter' : plan === 'pro' ? 'Growth' : 'Unlimited') : 'Brak planu');
  const recommendedPlanName = recommendedUpgradePlan 
    ? (recommendedUpgradePlan === 'pro' ? 'Growth' : 'Unlimited')
    : null;

  const handleUpgrade = async () => {
    if (!recommendedUpgradePlan) {
      navigate('/');
      return;
    }
    try {
      await createCheckout(recommendedUpgradePlan, 'monthly');
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error creating checkout:', error);
      }
    }
  };

  return (
    <div className={cn(
      'rounded-2xl border border-border/50 bg-card p-4 shadow-sm sm:p-6 flex flex-col items-center justify-center h-full',
      className
    )}>
      <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
        <Lock className="h-5 w-5 text-primary" />
      </div>
      <h3 className="mb-1 text-base font-semibold text-foreground sm:text-lg">
        Funkcja premium
      </h3>
      <p className="mb-2 text-xs text-muted-foreground sm:text-sm text-center">
        Ta funkcja jest dostępna w planie {recommendedPlanName || 'wyższym'} niż {planName}.
      </p>
      {showUpgrade && recommendedUpgradePlan && (
        <Button
          onClick={handleUpgrade}
          size="sm"
          className="bg-gradient-primary text-xs mt-2"
        >
          <Crown className="mr-1.5 h-3 w-3" />
          Przejdź na {recommendedPlanName}
        </Button>
      )}
    </div>
  );
}

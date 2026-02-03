import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { SUBSCRIPTION_QUERY_KEY } from '@/hooks/useSubscription';
import { useSubscription } from '@/hooks/useSubscription';

export default function SubscriptionSuccess() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const plan = params.get('plan');
  const queryClient = useQueryClient();
  const { user, schoolId } = useAuth();
  const { checkSubscription } = useSubscription();
  const queryKey = SUBSCRIPTION_QUERY_KEY(user?.id, schoolId || undefined);

  useEffect(() => {
    // Force refresh subscription status immediately after redirect
    // This invalidates React Query cache and fetches fresh data from database
    const refreshSubscription = async () => {
      if (!user || !schoolId) {
        // If no user, redirect to login
        setTimeout(() => {
          navigate('/auth', { replace: true });
        }, 2000);
        return;
      }

      try {
        // Wait a moment for webhook to process
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Invalidate and refetch subscription status
        // Retry up to 5 times with increasing delays
        let attempts = 0;
        const maxAttempts = 5;
        
        const checkWithRetry = async () => {
          // Force refresh subscription status
          await checkSubscription(true);
          
          // BŁĄD #8 - poprawiono: invalidate cache dla wszystkich powiązanych query
          await queryClient.invalidateQueries({ queryKey });
          await queryClient.invalidateQueries({ queryKey: ['school-subscription-plan'] });
          await queryClient.refetchQueries({ queryKey });
          
          attempts++;
          
          // Wait before next check (2s, 3s, 4s, 5s)
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, (attempts + 1) * 1000));
            await checkWithRetry();
          } else {
            // After all attempts, navigate to admin dashboard
            navigate('/admin', { replace: true });
          }
        };
        
        await checkWithRetry();
      } catch (error) {
        console.error('Error refreshing subscription:', error);
        // Navigate anyway after delay - user can manually refresh
        setTimeout(() => {
          navigate('/admin', { replace: true });
        }, 5000);
      }
    };

    refreshSubscription();
  }, [navigate, queryClient, checkSubscription, queryKey, user, schoolId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Płatność zakończona sukcesem 🎉</h1>
        <p className="text-muted-foreground">
          Plan: <strong>{plan}</strong>
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Aktualizowanie statusu subskrypcji...
        </p>
        <div className="mt-6 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

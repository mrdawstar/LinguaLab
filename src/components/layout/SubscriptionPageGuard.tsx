import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface SubscriptionPageGuardProps {
  children: ReactNode;
}

/**
 * Special guard for subscription page that allows access even when subscription expired
 * This allows users to view plans and purchase subscription after trial expires
 */
export function SubscriptionPageGuard({ children }: SubscriptionPageGuardProps) {
  const { isAuthenticated, role } = useAuth();

  // Only allow admin to access subscription page
  if (!isAuthenticated || role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-lg w-full text-center">
          <div className="glass-card p-8">
            <h1 className="text-2xl font-bold mb-2">Brak dostępu</h1>
            <p className="text-muted-foreground mb-4">
              Tylko administratorzy mogą zarządzać subskrypcją.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Allow access even if subscription expired
  return <>{children}</>;
}

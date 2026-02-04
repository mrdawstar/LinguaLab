import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { SubscriptionStatus, useSubscription } from '@/hooks/useSubscription';

interface SubscriptionContextType {
  subscription: SubscriptionStatus;
  isLoading: boolean;
  refreshSubscription: () => Promise<void>;
  invalidateSubscription: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

const DEFAULT_SUBSCRIPTION_STATUS: SubscriptionStatus = {
  subscribed: false,
  subscription_plan: null,
  subscription_end: null,
  subscription_period_start: null,
  trial_active: false,
  trial_days_left: 0,
  trial_ends_at: null,
  access_allowed: false,
  isLoading: true,
  error: null,
};

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, schoolId } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionStatus>(DEFAULT_SUBSCRIPTION_STATUS);
  const [isInitialized, setIsInitialized] = useState(false);
  const [shouldRefresh, setShouldRefresh] = useState(false);
  
  // Użyj hooka useSubscription tylko do pobrania danych, nie do zarządzania stanem
  const {
    subscribed,
    subscription_plan,
    subscription_end,
    subscription_period_start,
    trial_active,
    trial_days_left,
    trial_ends_at,
    access_allowed,
    isLoading: queryIsLoading,
    error: queryError,
    checkSubscription,
  } = useSubscription();

  // Synchronizuj stan z React Query tylko gdy:
  // 1. Dane są załadowane i nie są w stanie loading
  // 2. Albo gdy jest to pierwsze załadowanie
  // 3. Albo gdy powinno być odświeżone (shouldRefresh === true)
  useEffect(() => {
    // Jeśli użytkownik nie jest zalogowany, resetuj stan
    if (!user || !schoolId) {
      setSubscription(DEFAULT_SUBSCRIPTION_STATUS);
      setIsInitialized(false);
      setShouldRefresh(false);
      return;
    }

    // Jeśli query się jeszcze wykonuje i nie mamy jeszcze danych, nie aktualizuj stanu
    if (queryIsLoading && !isInitialized) {
      return;
    }

    // Aktualizuj stan tylko gdy:
    // 1. To pierwsze załadowanie (isInitialized === false) I query się zakończyło
    // 2. Albo gdy powinno być odświeżone (shouldRefresh === true)
    // NIE aktualizuj przy każdym renderze - tylko gdy faktycznie coś się zmieniło
    if (!isInitialized || shouldRefresh) {
      const newStatus: SubscriptionStatus = {
        subscribed,
        subscription_plan,
        subscription_end,
        subscription_period_start,
        trial_active,
        trial_days_left,
        trial_ends_at,
        access_allowed,
        isLoading: false,
        error: queryError || null,
      };

      setSubscription(newStatus);
      setIsInitialized(true);
      setShouldRefresh(false);
    }
  }, [
    user,
    schoolId,
    subscribed,
    subscription_plan,
    subscription_end,
    subscription_period_start,
    trial_active,
    trial_days_left,
    trial_ends_at,
    access_allowed,
    queryIsLoading,
    queryError,
    isInitialized,
    shouldRefresh,
  ]);

  // Funkcja do ręcznego odświeżenia (używana po zmianie planu)
  const refreshSubscription = useCallback(async () => {
    if (!user || !schoolId) return;
    
    setShouldRefresh(true);
    await checkSubscription(true);
  }, [user, schoolId, checkSubscription]);

  // Funkcja do unieważnienia cache (używana przy wylogowaniu)
  const invalidateSubscription = useCallback(() => {
    setSubscription(DEFAULT_SUBSCRIPTION_STATUS);
    setIsInitialized(false);
    setShouldRefresh(false);
  }, []);

  // Resetuj stan przy wylogowaniu
  useEffect(() => {
    if (!user) {
      invalidateSubscription();
    }
  }, [user, invalidateSubscription]);

  // isLoading powinno być true tylko gdy:
  // 1. Nie mamy jeszcze zainicjalizowanych danych (isInitialized === false)
  // 2. I query się jeszcze wykonuje (queryIsLoading === true)
  // Jeśli mamy już dane w cache, isLoading powinno być false nawet jeśli query się wykonuje w tle
  const isLoading = !isInitialized && queryIsLoading;

  const value: SubscriptionContextType = {
    subscription,
    isLoading,
    refreshSubscription,
    invalidateSubscription,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptionContext() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscriptionContext must be used within SubscriptionProvider');
  }
  return context;
}

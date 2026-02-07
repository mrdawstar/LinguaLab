import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { SubscriptionStatus, useSubscription, SUBSCRIPTION_QUERY_KEY } from '@/hooks/useSubscription';

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
  const queryClient = useQueryClient();
  // Użyj useMemo aby queryKey nie zmieniał się przy każdym renderze
  const queryKey = useMemo(() => SUBSCRIPTION_QUERY_KEY(user?.id, schoolId || undefined), [user?.id, schoolId]);
  
  // Użyj useRef do śledzenia poprzedniego stanu - unikaj dodawania subscription do zależności useEffect
  const prevSubscriptionRef = useRef<SubscriptionStatus>(DEFAULT_SUBSCRIPTION_STATUS);
  
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

  // Synchronizuj stan z React Query - użyj cache natychmiast jeśli dostępny
  useEffect(() => {
    // Jeśli użytkownik nie jest zalogowany, resetuj stan
    if (!user || !schoolId) {
      setSubscription(DEFAULT_SUBSCRIPTION_STATUS);
      setIsInitialized(false);
      setShouldRefresh(false);
      return;
    }

    // Sprawdź czy mamy cache - użyj go natychmiast jeśli dostępny
    const cachedData = queryClient.getQueryData<SubscriptionStatus>(queryKey);
    
    // Aktualizuj stan gdy:
    // 1. Query się zakończyło (!queryIsLoading) - wtedy mamy faktyczne dane z API
    // 2. Albo gdy mamy cache (cachedData) - użyj go natychmiast, nie czekaj na query
    // 3. Albo gdy powinno być odświeżone (shouldRefresh === true)
    // NIE aktualizuj jeśli query się jeszcze wykonuje i nie mamy cache
    if (!queryIsLoading || cachedData !== undefined || shouldRefresh) {
      // Jeśli mamy cache, użyj go zamiast wartości z hooka (które mogą być domyślne)
      const dataToUse = cachedData || {
        subscribed: subscribed ?? false,
        subscription_plan: subscription_plan ?? null,
        subscription_end: subscription_end ?? null,
        subscription_period_start: subscription_period_start ?? null,
        trial_active: trial_active ?? false,
        trial_days_left: trial_days_left ?? 0,
        trial_ends_at: trial_ends_at ?? null,
        access_allowed: access_allowed ?? false,
        isLoading: false,
        error: queryError || null,
      };
      
      const newStatus: SubscriptionStatus = {
        subscribed: dataToUse.subscribed ?? false,
        subscription_plan: dataToUse.subscription_plan ?? null,
        subscription_end: dataToUse.subscription_end ?? null,
        subscription_period_start: dataToUse.subscription_period_start ?? null,
        trial_active: dataToUse.trial_active ?? false,
        trial_days_left: dataToUse.trial_days_left ?? 0,
        trial_ends_at: dataToUse.trial_ends_at ?? null,
        access_allowed: dataToUse.access_allowed ?? false,
        isLoading: false,
        error: dataToUse.error || queryError || null,
      };

      // Porównaj czy nowy status różni się od poprzedniego - unikaj niepotrzebnych aktualizacji
      const prevSubscription = prevSubscriptionRef.current;
      const hasChanged = 
        prevSubscription.subscribed !== newStatus.subscribed ||
        prevSubscription.subscription_plan !== newStatus.subscription_plan ||
        prevSubscription.subscription_end !== newStatus.subscription_end ||
        prevSubscription.access_allowed !== newStatus.access_allowed ||
        prevSubscription.isLoading !== newStatus.isLoading ||
        !isInitialized;

      if (hasChanged) {
        prevSubscriptionRef.current = newStatus; // Zaktualizuj ref przed setState
        setSubscription(newStatus);
        setIsInitialized(true);
        setShouldRefresh(false);
      }
    } else {
      // Jeśli query się jeszcze wykonuje i nie mamy cache, ustaw isLoading na true
      // To zapobiegnie pokazaniu ekranu "brak aktywnej subskrypcji" podczas ładowania
      // WAŻNE: Sprawdź czy już nie ustawiliśmy loading state - unikaj niepotrzebnych aktualizacji
      const currentSubscription = prevSubscriptionRef.current;
      if (!isInitialized && !currentSubscription.isLoading) {
        const loadingStatus = {
          ...DEFAULT_SUBSCRIPTION_STATUS,
          isLoading: true,
        };
        prevSubscriptionRef.current = loadingStatus; // Zaktualizuj ref przed setState
        setSubscription(loadingStatus);
      }
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
    queryClient,
    queryKey,
    // USUNIĘTO: subscription - nie dodawaj go do zależności, użyj useRef zamiast tego
  ]);

  // Funkcja do ręcznego odświeżenia (używana po zmianie planu)
  const refreshSubscription = useCallback(async () => {
    if (!user || !schoolId) return;
    
    setShouldRefresh(true);
    await checkSubscription(true);
  }, [user, schoolId, checkSubscription]);

  // Funkcja do unieważnienia cache (używana przy wylogowaniu)
  const invalidateSubscription = useCallback(() => {
    prevSubscriptionRef.current = DEFAULT_SUBSCRIPTION_STATUS;
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
  // Jeśli query się zakończyło (nawet z błędem), nie pokazuj loading
  // Jeśli mamy już zainicjalizowane dane, nie pokazuj loading nawet jeśli query się wykonuje w tle
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

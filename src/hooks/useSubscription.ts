import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SubscriptionStatus {
  subscribed: boolean;
  subscription_plan: string | null;
  subscription_end: string | null;
  subscription_period_start: string | null;
  trial_active: boolean;
  trial_days_left: number;
  trial_ends_at: string | null;
  access_allowed: boolean;
  isLoading: boolean;
  error: string | null;
}

export const SUBSCRIPTION_QUERY_KEY = (userId?: string, schoolId?: string) => ['subscription-status', userId, schoolId];
const CACHE_DURATION = 5 * 60 * 1000; // 5 minut
const REFETCH_INTERVAL = 5 * 60 * 1000; // 5 minut

export function useSubscription() {
  const { user, schoolId } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = SUBSCRIPTION_QUERY_KEY(user?.id, schoolId || undefined);

  // Fallback do bazy danych gdy API nie działa
  const applySchoolFallback = useCallback(async (): Promise<SubscriptionStatus> => {
    if (!schoolId) {
      throw new Error('Brak szkoły');
    }

    const { data: school, error } = await supabase
      .from('schools')
      .select('trial_ends_at, subscription_status, subscription_plan, subscription_ends_at, subscription_period_start, created_at')
      .eq('id', schoolId)
      .maybeSingle();

    if (error || !school) {
      throw new Error(error?.message || 'Nie udało się pobrać danych szkoły');
    }

    const now = new Date();
    
    // Sprawdź czy szkoła jest nowa (utworzona w ciągu ostatnich 7 dni) i nie ma aktywnej subskrypcji
    const schoolCreatedAt = school.created_at ? new Date(school.created_at) : null;
    const daysSinceCreation = schoolCreatedAt ? Math.ceil((now.getTime() - schoolCreatedAt.getTime()) / (1000 * 60 * 60 * 24)) : null;
    const isNewSchool = schoolCreatedAt && daysSinceCreation !== null && daysSinceCreation <= 7;
    
    // Określ trial_ends_at - użyj z bazy lub oblicz na podstawie created_at
    // BŁĄD #10 - sprawdź czy trial_ends_at nie jest w przeszłości
    let trialEndsAt: Date | null = null;
    if (school.trial_ends_at) {
      trialEndsAt = new Date(school.trial_ends_at);
      // Jeśli trial_ends_at jest w przeszłości, ustaw na null
      if (trialEndsAt < now) {
        trialEndsAt = null;
      }
    } else if (isNewSchool && schoolCreatedAt && school.subscription_status !== 'active') {
      // Jeśli nie ma trial_ends_at ale szkoła jest nowa i nie ma aktywnej subskrypcji, oblicz jako created_at + 7 dni
      trialEndsAt = new Date(schoolCreatedAt);
      trialEndsAt.setDate(trialEndsAt.getDate() + 7);
    }
    
    const subscribed = school.subscription_status === 'active';
    
    // BŁĄD #10 - trialActive tylko jeśli trial_ends_at jest w przyszłości I NIE MA aktywnej subskrypcji
    // Jeśli użytkownik ma aktywną subskrypcję (subscribed i subscription_plan jest ustawiony), trial jest zakończony
    const trialActive = (trialEndsAt ? now < trialEndsAt : false) && 
                        !(subscribed && school.subscription_plan);
    const trialDaysLeft = trialActive && trialEndsAt
      ? Math.max(
          0,
          Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        )
      : 0;

    const accessAllowed = subscribed || trialActive;

    return {
      subscribed,
      subscription_plan: school.subscription_plan || null,
      subscription_end: school.subscription_ends_at || null,
      subscription_period_start: school.subscription_period_start || null,
      trial_active: trialActive,
      trial_days_left: trialDaysLeft,
      trial_ends_at: trialEndsAt ? trialEndsAt.toISOString() : (school.trial_ends_at || null),
      access_allowed: accessAllowed,
      isLoading: false,
      error: null,
    };
  }, [schoolId]);

  // Główna funkcja pobierania statusu subskrypcji
  const fetchSubscriptionStatus = useCallback(async (): Promise<SubscriptionStatus> => {
    if (!user) {
      return {
        subscribed: false,
        subscription_plan: null,
        subscription_end: null,
        trial_active: false,
        trial_days_left: 0,
        trial_ends_at: null,
        access_allowed: false,
        isLoading: false,
        error: null,
      };
    }

    if (import.meta.env.VITE_DISABLE_SUBSCRIPTION_CHECK === 'true') {
      return {
        subscribed: false,
        subscription_plan: null,
        subscription_end: null,
        trial_active: false,
        trial_days_left: 0,
        trial_ends_at: null,
        access_allowed: true,
        isLoading: false,
        error: null,
      };
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      throw new Error('Brak aktywnej sesji');
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('Brak konfiguracji Supabase');
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/check-subscription`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (response.status === 401) {
      // BŁĄD #6 - poprawiono: Fallback do bazy danych gdy brak autoryzacji z obsługą błędów
      try {
        return await applySchoolFallback();
      } catch (fallbackError) {
        // Jeśli fallback też nie działa, zwróć bezpieczny stan
        console.error('Fallback error:', fallbackError);
        return {
          subscribed: false,
          subscription_plan: null,
          subscription_end: null,
          subscription_period_start: null,
          trial_active: false,
          trial_days_left: 0,
          trial_ends_at: null,
          access_allowed: false,
          isLoading: false,
          error: fallbackError instanceof Error ? fallbackError.message : 'Nie udało się pobrać subskrypcji',
        };
      }
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      // BŁĄD #6 - poprawiono: Próbuj fallback przed rzuceniem błędu z obsługą błędów
      try {
        return await applySchoolFallback();
      } catch (fallbackError) {
        // Jeśli fallback też nie działa, zwróć bezpieczny stan
        console.error('Fallback error:', fallbackError);
        return {
          subscribed: false,
          subscription_plan: null,
          subscription_end: null,
          subscription_period_start: null,
          trial_active: false,
          trial_days_left: 0,
          trial_ends_at: null,
          access_allowed: false,
          isLoading: false,
          error: err.error || (fallbackError instanceof Error ? fallbackError.message : 'Nie udało się pobrać subskrypcji'),
        };
      }
    }

    const data = await response.json();

    const result = {
      subscribed: Boolean(data.subscribed),
      subscription_plan: data.subscription_plan || null,
      subscription_end: data.subscription_end || null,
      subscription_period_start: data.subscription_period_start || null,
      trial_active: Boolean(data.trial_active),
      trial_days_left: data.trial_days_left ?? 0,
      trial_ends_at: data.trial_ends_at || null,
      access_allowed: Boolean(data.access_allowed),
      isLoading: false,
      error: null,
    };
    
    return result;
  }, [user, applySchoolFallback]);

  // React Query hook z optymalizacjami cache
  // BŁĄD #8 - poprawiono: cache invalidation po zmianie subskrypcji
  // BŁĄD #13 - poprawiono: default values - trial_active powinno być false podczas ładowania
  const queryEnabled = !!user && !!schoolId;
  
  // Pobierz poprzednie dane z cache jako placeholder podczas refetch
  const previousData = queryClient.getQueryData<SubscriptionStatus>(queryKey);
  
  const {
    data: status,
    isLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: fetchSubscriptionStatus,
    enabled: queryEnabled, // Tylko gdy użytkownik jest zalogowany i ma schoolId
    staleTime: CACHE_DURATION, // Dane są "świeże" przez 5 minut
    gcTime: 5 * 60 * 1000, // BŁĄD #8 - poprawiono: przechowuj cache przez 5 minut po unmount dla lepszej synchronizacji
    refetchInterval: REFETCH_INTERVAL, // Automatyczne odświeżanie co 5 minut
    refetchOnMount: true, // Zawsze odświeżaj przy montowaniu
    refetchOnWindowFocus: false, // NIE odświeżaj przy focusie okna
    refetchOnReconnect: true, // Odśwież przy ponownym połączeniu
    retry: 1, // Tylko jedna próba ponowienia przy błędzie
    retryDelay: 1000,
    placeholderData: previousData || undefined, // Użyj cache jako placeholder podczas refetch
  });
  
  // Użyj status z query lub fallback do wartości domyślnych tylko jeśli nie ma cache
  const finalStatus: SubscriptionStatus = status || previousData || {
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

  // Funkcja do ręcznego odświeżania (używana po checkout)
  // BŁĄD #8 - poprawiono: lepsze cache invalidation
  const checkSubscription = useCallback(
    async (force = false) => {
      if (force) {
        // Wymuszone odświeżenie - ignoruje cache i usuwa wszystkie powiązane query
        await queryClient.invalidateQueries({ queryKey });
        // Również usuń cache dla fallback plan query
        await queryClient.invalidateQueries({ queryKey: ['school-subscription-plan'] });
      }
      await refetch();
    },
    [refetch, queryClient, queryKey]
  );

  const createCheckout = useCallback(async (plan: 'basic' | 'pro' | 'unlimited', billingCycle: 'monthly' | 'yearly' = 'monthly') => {
    // Refresh session to ensure we have a valid token
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      // If refresh token is invalid, sign out
      if (sessionError.message?.includes('Refresh Token') || sessionError.message?.includes('Invalid Refresh Token')) {
        await supabase.auth.signOut();
        throw new Error('Sesja wygasła. Zaloguj się ponownie.');
      }
      throw new Error('Błąd sesji. Spróbuj się wylogować i zalogować ponownie.');
    }

    let accessToken = sessionData.session?.access_token;

    // If no token or token seems invalid, try to refresh
    if (!accessToken) {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        // If refresh token is invalid, sign out
        if (refreshError.message?.includes('Refresh Token') || refreshError.message?.includes('Invalid Refresh Token')) {
          await supabase.auth.signOut();
          throw new Error('Sesja wygasła. Zaloguj się ponownie.');
        }
        throw new Error('Brak aktywnej sesji. Zaloguj się ponownie.');
      }
      if (!refreshData.session) {
        throw new Error('Brak aktywnej sesji. Zaloguj się ponownie.');
      }
      accessToken = refreshData.session.access_token;
    }

    if (!accessToken) {
      throw new Error('Brak aktywnej sesji. Zaloguj się ponownie.');
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      throw new Error('Brak konfiguracji Supabase');
    }

    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/create-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
            apikey: anonKey,
          },
          body: JSON.stringify({ plan, billingCycle }),
        }
      );

      if (response.status === 401) {
        // Token expired, try to refresh and retry once
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          // If refresh token is invalid, sign out
          if (refreshError.message?.includes('Refresh Token') || refreshError.message?.includes('Invalid Refresh Token')) {
            await supabase.auth.signOut();
            throw new Error('Sesja wygasła. Zaloguj się ponownie.');
          }
          throw new Error('Sesja wygasła. Zaloguj się ponownie.');
        }
        if (!refreshData.session) {
          throw new Error('Sesja wygasła. Zaloguj się ponownie.');
        }
        
        const retryResponse = await fetch(
          `${supabaseUrl}/functions/v1/create-checkout`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${refreshData.session.access_token}`,
              apikey: anonKey,
            },
            body: JSON.stringify({ plan, billingCycle }),
          }
        );

        if (!retryResponse.ok) {
          const err = await retryResponse.json().catch(() => ({}));
          throw new Error(err.error || 'Nie udało się utworzyć checkout. Spróbuj się wylogować i zalogować ponownie.');
        }

        const retryData = await retryResponse.json();
        window.location.href = retryData.url;
        return;
      }

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Nie udało się utworzyć checkout');
      }

      const data = await response.json();
      window.location.href = data.url;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Nie udało się utworzyć checkout. Spróbuj ponownie.');
    }
  }, []);

  const openCustomerPortal = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      throw new Error('Brak aktywnej sesji');
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('Brak konfiguracji Supabase');
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/customer-portal`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Nie udało się otworzyć portalu');
    }

    const data = await response.json();
    window.open(data.url, '_blank');
  }, []);

  const syncSubscription = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      throw new Error('Brak aktywnej sesji');
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('Brak konfiguracji Supabase');
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/sync-subscription`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Nie udało się zsynchronizować subskrypcji');
    }

    // BŁĄD #8 - poprawiono: lepsze cache invalidation po synchronizacji
    await queryClient.invalidateQueries({ queryKey });
    await queryClient.invalidateQueries({ queryKey: ['school-subscription-plan'] });
    await refetch();

    return await response.json();
  }, [queryClient, refetch, queryKey]);

  // Zwracamy status z obsługą błędów
  const errorMessage = queryError instanceof Error ? queryError.message : null;

  return {
    ...finalStatus,
    isLoading,
    error: errorMessage || finalStatus.error,
    checkSubscription,
    createCheckout,
    openCustomerPortal,
    syncSubscription,
  };
}

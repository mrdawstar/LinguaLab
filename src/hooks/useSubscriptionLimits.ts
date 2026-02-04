import { useMemo } from 'react';
import { useSubscriptionContext } from '@/contexts/SubscriptionContext';
import { useStudents } from './useStudents';
import { useTeachers } from './useTeachers';
import { useGroups } from './useGroups';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  PlanType,
  canAddStudent,
  canAddTeacher,
  canAddGroup,
  getLimit,
  hasFeature,
  getLimitExceededMessage,
  getRecommendedUpgradePlan,
} from '@/lib/subscriptionLimits';

export function useSubscriptionLimits() {
  const { subscription } = useSubscriptionContext();
  const { subscription_plan, trial_active, subscribed } = subscription;
  const { schoolId } = useAuth();
  const { students } = useStudents();
  const { teachers } = useTeachers();
  const { groups } = useGroups();

  // NAJWYŻSZY PRIORYTET: Trial jest aktywny gdy trial_active jest true i nie ma aktywnej subskrypcji
  // BŁĄD: Jeśli subscription_plan jest null, to nawet jeśli subscribed jest true, to jest to trial
  // Naprawiono: Trial jest aktywny gdy trial_active jest true LUB (trial_active jest true i subscription_plan jest null)
  const isTrial = trial_active && (!subscribed || subscription_plan === null);
  
  // Fallback: jeśli subscribed jest true, ale subscription_plan jest null, pobierz plan bezpośrednio z bazy
  // BŁĄD #4 - poprawiono: nie pobieraj fallback jeśli trial jest aktywny
  // BŁĄD #12 - poprawiono: użyj trial_active i subscribed bezpośrednio zamiast isTrial w queryFn
  const { data: fallbackPlan } = useQuery({
    queryKey: ['school-subscription-plan', schoolId],
    queryFn: async () => {
      // BŁĄD #12 - poprawiono: sprawdź trial_active i subscribed bezpośrednio zamiast isTrial
      if (!schoolId || subscription_plan || (trial_active && !subscribed)) return null;
      const { data, error } = await supabase
        .from('schools')
        .select('subscription_plan, subscription_status')
        .eq('id', schoolId)
        .maybeSingle();
      if (error || !data) return null;
      // Jeśli subskrypcja jest aktywna, zwróć plan z bazy
      if (data.subscription_status === 'active' && data.subscription_plan) {
        return data.subscription_plan as PlanType;
      }
      return null;
    },
    enabled: !!schoolId && subscribed && !subscription_plan && !isTrial,
    staleTime: 5 * 60 * 1000, // 5 minut
  });
  
  // BŁĄD #3 - poprawiono: nie ustawiaj planu na 'pro' jeśli trial jest aktywny lub jeśli nie ma subskrypcji
  // Użyj planu z hooka, lub fallback z bazy, ale NIE ustawiaj domyślnego 'pro' jeśli subscribed jest true bez planu
  const plan = isTrial ? null : ((subscription_plan as PlanType) || (fallbackPlan as PlanType) || null);

  const limits = useMemo(() => {
    const studentsCount = students.length;
    const teachersCount = teachers.length;
    const groupsCount = groups.length;

    // BŁĄD #11 - poprawiono: exceeded powinno być true jeśli canAdd jest false (nawet gdy nie ma planu ani trial)
    const studentsCanAdd = canAddStudent(plan, studentsCount, isTrial);
    const teachersCanAdd = canAddTeacher(plan, teachersCount, isTrial);
    const groupsCanAdd = canAddGroup(plan, groupsCount, isTrial);

    return {
      students: {
        current: studentsCount,
        limit: getLimit(plan, 'students', isTrial),
        canAdd: studentsCanAdd,
        exceeded: !studentsCanAdd, // BŁĄD #11 - poprawiono: exceeded jest true gdy canAdd jest false
        message: !studentsCanAdd && (plan || isTrial)
          ? getLimitExceededMessage(plan || 'trial', 'students', studentsCount)
          : null,
      },
      teachers: {
        current: teachersCount,
        limit: getLimit(plan, 'teachers', isTrial),
        canAdd: teachersCanAdd,
        exceeded: !teachersCanAdd, // BŁĄD #11 - poprawiono: exceeded jest true gdy canAdd jest false
        message: !teachersCanAdd && (plan || isTrial)
          ? getLimitExceededMessage(plan || 'trial', 'teachers', teachersCount)
          : null,
      },
      groups: {
        current: groupsCount,
        limit: getLimit(plan, 'groups', isTrial),
        canAdd: groupsCanAdd,
        exceeded: !groupsCanAdd, // BŁĄD #11 - poprawiono: exceeded jest true gdy canAdd jest false
        message: !groupsCanAdd && (plan || isTrial)
          ? getLimitExceededMessage(plan || 'trial', 'groups', groupsCount)
          : null,
      },
    };
  }, [plan, isTrial, students.length, teachers.length, groups.length]);

  const features = useMemo(() => {
    // Trial ma dostęp do wszystkich funkcji
    if (isTrial) {
      return {
        automaticEmails: true,
        advancedAnalytics: true,
        weeklyReports: true,
        monthlyReports: true,
        customIntegrations: true,
        prioritySupport: true,
      };
    }

    if (!plan) {
      return {
        automaticEmails: false,
        advancedAnalytics: false,
        weeklyReports: false,
        monthlyReports: false,
        customIntegrations: false,
        prioritySupport: false,
      };
    }

    return {
      automaticEmails: hasFeature(plan, 'automaticEmails', false),
      advancedAnalytics: hasFeature(plan, 'advancedAnalytics', false),
      weeklyReports: hasFeature(plan, 'weeklyReports', false),
      monthlyReports: hasFeature(plan, 'monthlyReports', false),
      customIntegrations: hasFeature(plan, 'customIntegrations', false),
      prioritySupport: hasFeature(plan, 'prioritySupport', false),
    };
  }, [plan, isTrial]);

  const recommendedUpgradePlan = useMemo(() => {
    return getRecommendedUpgradePlan(plan, isTrial);
  }, [plan, isTrial]);

  return {
    plan,
    limits,
    features,
    recommendedUpgradePlan,
  };
}

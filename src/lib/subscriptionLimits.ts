/**
 * Centralna konfiguracja limitów i funkcji dla planów subskrypcyjnych
 */

export type PlanType = 'basic' | 'pro' | 'unlimited' | null;

export interface PlanLimits {
  maxStudents: number | null; // null = unlimited
  maxTeachers: number | null;
  maxGroups: number | null;
}

export interface PlanFeatures {
  automaticEmails: boolean;
  advancedAnalytics: boolean;
  weeklyReports: boolean;
  monthlyReports: boolean;
  customIntegrations: boolean;
  prioritySupport: boolean;
}

export interface PlanConfig {
  limits: PlanLimits;
  features: PlanFeatures;
  name: string;
  price: {
    monthly: number;
    yearly: number;
  };
}

/**
 * Konfiguracja limitów dla okresu próbnego
 */
export const TRIAL_CONFIG: PlanConfig = {
  name: 'Trial',
  price: {
    monthly: 0,
    yearly: 0,
  },
  limits: {
    maxStudents: 25,
    maxTeachers: 3,
    maxGroups: 10,
  },
  features: {
    automaticEmails: true,
    advancedAnalytics: true,
    weeklyReports: true,
    monthlyReports: true,
    customIntegrations: true,
    prioritySupport: true,
  },
};

/**
 * Konfiguracja limitów dla każdego planu
 */
export const PLAN_CONFIGS: Record<string, PlanConfig> = {
  basic: {
    name: 'Starter',
    price: {
      monthly: 99,
      yearly: 950,
    },
    limits: {
      maxStudents: 120,
      maxTeachers: 5,
      maxGroups: 10,
    },
    features: {
      automaticEmails: false,
      advancedAnalytics: false,
      weeklyReports: false,
      monthlyReports: false,
      customIntegrations: false,
      prioritySupport: false,
    },
  },
  pro: {
    name: 'Growth',
    price: {
      monthly: 199,
      yearly: 1910,
    },
    limits: {
      maxStudents: 500,
      maxTeachers: 15,
      maxGroups: 50,
    },
    features: {
      automaticEmails: true,
      advancedAnalytics: true,
      weeklyReports: true,
      monthlyReports: true,
      customIntegrations: false,
      prioritySupport: false,
    },
  },
  unlimited: {
    name: 'Unlimited',
    price: {
      monthly: 399,
      yearly: 3830,
    },
    limits: {
      maxStudents: null, // unlimited
      maxTeachers: null,
      maxGroups: null,
    },
    features: {
      automaticEmails: true,
      advancedAnalytics: true,
      weeklyReports: true,
      monthlyReports: true,
      customIntegrations: true,
      prioritySupport: true,
    },
  },
};

/**
 * Sprawdza czy plan ma dostęp do danej funkcji
 */
export function hasFeature(plan: PlanType, feature: keyof PlanFeatures, isTrial: boolean = false): boolean {
  // Trial ma dostęp do wszystkich funkcji
  if (isTrial) return true;
  
  if (!plan) return false;
  const config = PLAN_CONFIGS[plan];
  if (!config) return false;
  return config.features[feature];
}

/**
 * Sprawdza czy można dodać więcej uczniów
 */
export function canAddStudent(plan: PlanType, currentCount: number, isTrial: boolean = false): boolean {
  // Trial ma limit 25 uczniów
  if (isTrial) {
    return currentCount < TRIAL_CONFIG.limits.maxStudents!;
  }
  
  if (!plan) return false;
  const config = PLAN_CONFIGS[plan];
  if (!config) return false;
  const limit = config.limits.maxStudents;
  if (limit === null) return true; // unlimited
  return currentCount < limit;
}

/**
 * Sprawdza czy można dodać więcej nauczycieli
 */
export function canAddTeacher(plan: PlanType, currentCount: number, isTrial: boolean = false): boolean {
  // Trial ma limit 3 nauczycieli
  if (isTrial) {
    return currentCount < TRIAL_CONFIG.limits.maxTeachers!;
  }
  
  if (!plan) return false;
  const config = PLAN_CONFIGS[plan];
  if (!config) return false;
  const limit = config.limits.maxTeachers;
  if (limit === null) return true; // unlimited
  return currentCount < limit;
}

/**
 * Sprawdza czy można dodać więcej grup
 */
export function canAddGroup(plan: PlanType, currentCount: number, isTrial: boolean = false): boolean {
  // Trial ma limit 10 grup
  if (isTrial) {
    return currentCount < TRIAL_CONFIG.limits.maxGroups!;
  }
  
  if (!plan) return false;
  const config = PLAN_CONFIGS[plan];
  if (!config) return false;
  const limit = config.limits.maxGroups;
  if (limit === null) return true; // unlimited
  return currentCount < limit;
}

/**
 * Zwraca limit dla danego typu zasobu
 */
export function getLimit(plan: PlanType, resource: 'students' | 'teachers' | 'groups', isTrial: boolean = false): number | null {
  // Trial ma własne limity
  if (isTrial) {
    switch (resource) {
      case 'students':
        return TRIAL_CONFIG.limits.maxStudents;
      case 'teachers':
        return TRIAL_CONFIG.limits.maxTeachers;
      case 'groups':
        return TRIAL_CONFIG.limits.maxGroups;
      default:
        return null;
    }
  }
  
  if (!plan) return null;
  const config = PLAN_CONFIGS[plan];
  if (!config) return null;
  
  switch (resource) {
    case 'students':
      return config.limits.maxStudents;
    case 'teachers':
      return config.limits.maxTeachers;
    case 'groups':
      return config.limits.maxGroups;
    default:
      return null;
  }
}

/**
 * Zwraca komunikat o przekroczeniu limitu
 */
export function getLimitExceededMessage(
  plan: PlanType | 'trial',
  resource: 'students' | 'teachers' | 'groups',
  currentCount: number
): string {
  const isTrial = plan === 'trial';
  const limit = getLimit(plan === 'trial' ? null : plan, resource, isTrial);
  if (limit === null) return '';
  
  const resourceNames = {
    students: 'uczniów',
    teachers: 'nauczycieli',
    groups: 'grup',
  };
  
  const planName = isTrial ? 'okresu próbnego' : (PLAN_CONFIGS[plan!]?.name || plan);
  
  return `Osiągnięto limit ${limit} ${resourceNames[resource]} dla ${planName}. Obecnie masz ${currentCount} ${resourceNames[resource]}.`;
}

/**
 * Zwraca rekomendowany plan do upgrade
 */
export function getRecommendedUpgradePlan(currentPlan: PlanType, isTrial: boolean = false): PlanType {
  // Dla trial rekomendujemy Starter (basic) jako pierwszy płatny plan
  if (isTrial) {
    return 'basic';
  }
  
  switch (currentPlan) {
    case 'basic':
      return 'pro';
    case 'pro':
      return 'unlimited';
    default:
      return null;
  }
}

// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
};


const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader || authHeader === "Bearer null" || authHeader === "Bearer undefined") {
      logStep("No auth header - user not logged in");
      return new Response(JSON.stringify({ 
        subscribed: false, 
        trial_active: false,
        access_allowed: false,
        trial_days_left: 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    if (!token || token === "null" || token === "undefined") {
      logStep("Invalid token - user not logged in");
      return new Response(JSON.stringify({ 
        subscribed: false, 
        trial_active: false,
        access_allowed: false,
        trial_days_left: 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      logStep("Auth error - returning graceful response", { error: userError?.message });
      return new Response(JSON.stringify({ 
        subscribed: false, 
        trial_active: false,
        access_allowed: false,
        trial_days_left: 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    const user = userData.user;
    if (!user?.email) {
      logStep("No email - returning graceful response");
      return new Response(JSON.stringify({ 
        subscribed: false, 
        trial_active: false,
        access_allowed: false,
        trial_days_left: 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get user's school
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("school_id")
      .eq("id", user.id)
      .single();

    if (!profile?.school_id) {
      return new Response(JSON.stringify({ 
        subscribed: false, 
        trial_active: false,
        access_allowed: false 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get school subscription info including created_at
    const { data: school } = await supabaseClient
      .from("schools")
      .select("trial_ends_at, subscription_status, subscription_plan, subscription_ends_at, subscription_period_start, stripe_customer_id, created_at")
      .eq("id", profile.school_id)
      .single();

    if (!school) {
      throw new Error("School not found");
    }

    logStep("School found", { schoolId: profile.school_id, subscriptionStatus: school.subscription_status });

    const now = new Date();
    
    // Sprawdź czy szkoła jest nowa (utworzona w ciągu ostatnich 7 dni) i nie ma aktywnej subskrypcji
    // Użyj created_at z już pobranego obiektu school (BŁĄD #1 - naprawiony)
    const schoolCreatedAt = school.created_at ? new Date(school.created_at) : null;

    const daysSinceCreation = schoolCreatedAt
  ? Math.floor((now.getTime() - schoolCreatedAt.getTime()) / (1000 * 60 * 60 * 24))
  : null;

    // Poprawione: sprawdź czy szkoła jest nowa - jeśli created_at + 7 dni jest w przyszłości, to jest nowa szkoła
    const isNewSchool = schoolCreatedAt ? (new Date(schoolCreatedAt.getTime() + 7 * 24 * 60 * 60 * 1000) > now) : false;
    
    // Określ trial_ends_at - użyj z bazy lub oblicz na podstawie created_at
    let trialEndsAt: Date | null = null;
    if (school.trial_ends_at) {
      trialEndsAt = new Date(school.trial_ends_at);
      // BŁĄD #10 - sprawdź czy trial_ends_at nie jest w przeszłości
      if (trialEndsAt < now) {
        trialEndsAt = null;
      }
    } else if (isNewSchool && schoolCreatedAt && school.subscription_status !== 'active') {
      // Jeśli nie ma trial_ends_at ale szkoła jest nowa i nie ma aktywnej subskrypcji, oblicz jako created_at + 7 dni
      // Poprawione: dokładnie 7 dni od rejestracji (włącznie z dniem rejestracji)
      trialEndsAt = new Date(schoolCreatedAt);
      trialEndsAt.setDate(trialEndsAt.getDate() + 7);
      // Ustaw godzinę na koniec dnia (23:59:59) aby mieć pełne 7 dni
      trialEndsAt.setHours(23, 59, 59, 999);
    }
    
    
    // Źródłem prawdy jest schools.subscription_status
    // Rola użytkownika NIE MA WPŁYWU na logikę wygaśnięcia
    const subscribed = school.subscription_status === 'active';
    
    // Trial NIGDY nie może być aktywny, jeśli subskrypcja jest active
    const trialActive = !subscribed && !!trialEndsAt && now < trialEndsAt;
    
    // Oblicz trial_days_left używając Math.ceil - zaokrąglij w górę aby pokazać pełne dni
    // trial_ends_at jest ustawiony na koniec dnia 7 (23:59:59.999)
    // W dniu rejestracji (np. 10:00) różnica to ~6.5 dnia, ceil daje 7 dni ✅
    // Po pełnej dobie (np. dzień 2 o 10:00) różnica to ~5.5 dnia, ceil daje 6 dni ✅
    const trialDaysLeft = trialActive && trialEndsAt 
      ? Math.max(0, Math.min(7, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))))
      : 0;
    
    const subscriptionPlan = school.subscription_plan;
    const subscriptionEnd = school.subscription_ends_at;
    const subscriptionPeriodStart = school.subscription_period_start;

    logStep("Subscription status from database", {
      status: school.subscription_status,
      plan: subscriptionPlan,
      endsAt: subscriptionEnd,
      periodStart: subscriptionPeriodStart,
      subscribed,
      trialActive,
      trialEndsAt: trialEndsAt?.toISOString(),
      daysSinceCreation,
      isNewSchool,
      schoolTrialEndsAt: school.trial_ends_at,
      schoolCreatedAt: school.created_at,
    });

    // access_allowed MUSI BYĆ GLOBALNE - admin / manager / teacher → ten sam moment blokady
    const accessAllowed = subscribed || trialActive;

    return new Response(JSON.stringify({
      subscribed,
      subscription_plan: subscriptionPlan,
      subscription_end: subscriptionEnd,
      subscription_period_start: subscriptionPeriodStart,
      trial_active: trialActive,
      trial_days_left: trialDaysLeft,
      trial_ends_at: trialEndsAt ? trialEndsAt.toISOString() : (school.trial_ends_at || null),
      access_allowed: accessAllowed,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

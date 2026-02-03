// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "OPTIONS, POST",
};

const PLANS: Record<string, { monthly: string; yearly: string }> = {
  basic: { 
    monthly: "price_1SviW7LwYIwynGrnKswUrs8d",
    yearly: "price_1Sw7ScLwYIwynGrnFoeNyfqY"
  },
  pro: { 
    monthly: "price_1Sw7PwLwYIwynGrnbpJtyKE1",
    yearly: "price_1Sw7THLwYIwynGrn9Kq5Hn1L"
  },
  unlimited: {
    monthly: "price_1Sw7RULwYIwynGrnF2TpZPEP",
    yearly: "price_1Sw7UVLwYIwynGrnXgo4Hp7Q"
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ───────────────────────────────── ENV ─────────────────────────────────
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: "Missing server configuration" }),
        { status: 500, headers: corsHeaders }
      );
    }

    // ───────────────────────────── AUTH HEADER ─────────────────────────────
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: corsHeaders }
      );
    }

    // ───────────────────────── SUPABASE (USER AUTH) ─────────────────────────
    const supabase = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
        auth: { persistSession: false },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: corsHeaders }
      );
    }

    // ───────────────────────────────── BODY ─────────────────────────────────
    const body = await req.json();
    const plan = body?.plan;
    const billingCycle = body?.billingCycle || "monthly"; // monthly or yearly

    console.log("CREATE CHECKOUT - Received plan:", plan, "billingCycle:", billingCycle);
    console.log("CREATE CHECKOUT - Available plans:", Object.keys(PLANS));
    console.log("CREATE CHECKOUT - PLANS[plan]:", PLANS[plan]);

    if (!plan || !PLANS[plan]) {
      console.error("CREATE CHECKOUT - Invalid plan:", plan, "Available:", Object.keys(PLANS));
      return new Response(
        JSON.stringify({ error: `Invalid plan: ${plan}. Available plans: ${Object.keys(PLANS).join(", ")}` }),
        { status: 400, headers: corsHeaders }
      );
    }

    const priceId = PLANS[plan][billingCycle as "monthly" | "yearly"];
    if (!priceId || priceId.includes("_ID")) {
      return new Response(
        JSON.stringify({ error: `Price ID not configured for ${plan} ${billingCycle}` }),
        { status: 400, headers: corsHeaders }
      );
    }

    // ───────────────────────────── PROFILE / SCHOOL ─────────────────────────
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("school_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile?.school_id) {
      return new Response(
        JSON.stringify({ error: "User has no school assigned" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // ───────────────────────────── ADMIN ROLE CHECK ─────────────────────────
    const { data: userRoles, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (roleError) {
      return new Response(
        JSON.stringify({ error: "Failed to check user role" }),
        { status: 500, headers: corsHeaders }
      );
    }

    const isAdmin = userRoles?.some((r) => r.role === "admin");
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Only school admins can purchase subscriptions" }),
        { status: 403, headers: corsHeaders }
      );
    }

    // ───────────────────────────────── STRIPE ───────────────────────────────
    const stripe = new Stripe(stripeSecretKey);

    // Get or create Stripe customer
    let customers = await stripe.customers.list({
      email: user.email!,
      limit: 1,
    });

    let customerId = customers.data[0]?.id;

    // Create customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: {
          school_id: profile.school_id,
          user_id: user.id,
        },
      });
      customerId = customer.id;

      // Store customer_id in school record
      const supabaseService = createClient(
        supabaseUrl,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      await supabaseService
        .from("schools")
        .update({ stripe_customer_id: customerId })
        .eq("id", profile.school_id);
    } else {
      // Ensure customer_id is stored in school record
      const supabaseService = createClient(
        supabaseUrl,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      const { data: school } = await supabaseService
        .from("schools")
        .select("stripe_customer_id")
        .eq("id", profile.school_id)
        .single();

      if (!school?.stripe_customer_id) {
        await supabaseService
          .from("schools")
          .update({ stripe_customer_id: customerId })
          .eq("id", profile.school_id);
      }
    }

    const origin = req.headers.get("origin") ?? "http://localhost:5173";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/subscription-success?plan=${plan}`,
      cancel_url: `${origin}/pricing`,
      metadata: {
        user_id: user.id,
        school_id: profile.school_id,
        plan,
        billing_cycle: billingCycle,
      },
    });

    // ───────────────────────────── RESPONSE ─────────────────────────────
    return new Response(
      JSON.stringify({ url: session.url }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("CREATE CHECKOUT ERROR:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});

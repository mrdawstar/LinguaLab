import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2024-11-20.acacia',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's profile and school
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('school_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.school_id) {
      return new Response(
        JSON.stringify({ error: 'School not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get school data
    const { data: school, error: schoolError } = await supabaseClient
      .from('schools')
      .select('stripe_customer_id, subscription_plan')
      .eq('id', profile.school_id)
      .single();

    if (schoolError || !school) {
      return new Response(
        JSON.stringify({ error: 'School not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!school.stripe_customer_id) {
      return new Response(
        JSON.stringify({ error: 'No Stripe customer ID found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get active subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: school.stripe_customer_id,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No active subscription found in Stripe' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const subscription = subscriptions.data[0];

    // Update school subscription with dates from Stripe
    const subscriptionEndsAt = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null;
    
    const subscriptionPeriodStart = subscription.current_period_start
      ? new Date(subscription.current_period_start * 1000).toISOString()
      : null;

    // Determine plan name
    let planName: string | null = school.subscription_plan || null;
    
    if (!planName && subscription.metadata?.plan) {
      planName = subscription.metadata.plan;
    }

    if (!planName && subscription.items.data.length > 0) {
      const price = subscription.items.data[0]?.price;
      if (price?.metadata?.plan) {
        planName = price.metadata.plan;
      }
    }

    const { error: updateError } = await supabaseClient
      .from('schools')
      .update({
        subscription_status: 'active',
        subscription_plan: planName,
        subscription_ends_at: subscriptionEndsAt,
        subscription_period_start: subscriptionPeriodStart,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.school_id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        subscription_ends_at: subscriptionEndsAt,
        subscription_period_start: subscriptionPeriodStart,
        plan: planName,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

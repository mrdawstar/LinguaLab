// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  try {
    logStep("Webhook received");

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeSecretKey || !stripeWebhookSecret || !supabaseUrl || !supabaseServiceKey) {
      logStep("ERROR: Missing environment variables");
      return new Response(
        JSON.stringify({ error: "Missing server configuration" }),
        { status: 500 }
      );
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" });
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Get the raw body and signature
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      logStep("ERROR: No signature header");
      return new Response(JSON.stringify({ error: "No signature" }), { status: 400 });
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (err) {
      logStep("ERROR: Webhook signature verification failed", { error: err.message });
      return new Response(
        JSON.stringify({ error: `Webhook Error: ${err.message}` }),
        { status: 400 }
      );
    }

    logStep("Event received", { 
      type: event.type, 
      id: event.id,
      livemode: event.livemode,
    });

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session, supabase, stripe);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription, supabase, stripe);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription, supabase, stripe);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice, supabase, stripe);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice, supabase, stripe);
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in webhook handler", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500 }
    );
  }
});

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  supabase: any,
  stripe: Stripe
) {
  logStep("Handling checkout.session.completed", { 
    sessionId: session.id,
    mode: session.mode,
    paymentStatus: session.payment_status,
  });

  const schoolId = session.metadata?.school_id;
  const plan = session.metadata?.plan;
  const customerId = session.customer as string;

  if (!schoolId) {
    logStep("ERROR: No school_id in session metadata", { 
      sessionId: session.id,
      metadata: session.metadata 
    });
    return;
  }

  if (!customerId) {
    logStep("ERROR: No customer_id in session", { sessionId: session.id });
    return;
  }

  // Ensure customer_id is stored in school record
  const { error: customerUpdateError } = await supabase
    .from("schools")
    .update({ stripe_customer_id: customerId })
    .eq("id", schoolId);

  if (customerUpdateError) {
    logStep("ERROR updating customer_id", { 
      error: customerUpdateError.message,
      schoolId 
    });
  }

  // If subscription was created, fetch it to get details
  if (session.mode === "subscription" && session.subscription) {
    const subscriptionId = session.subscription as string;
    logStep("Fetching subscription details", { subscriptionId });
    
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await updateSchoolSubscription(subscription, schoolId, customerId, supabase, plan);
      logStep("Successfully updated school subscription from checkout", { schoolId });
    } catch (err) {
      logStep("ERROR retrieving subscription", { 
        error: err.message,
        subscriptionId 
      });
      
      // Fallback: update with basic info from session metadata
      if (plan) {
        const updateData: any = {
          stripe_customer_id: customerId,
          subscription_status: "active", // Default to active for successful checkout
          subscription_plan: plan,
          trial_ends_at: null, // Kończymy trial gdy subskrypcja jest aktywna
          updated_at: new Date().toISOString(),
        };
        
        // Jeśli mamy billing_cycle z metadata, możemy obliczyć subscription_ends_at
        const billingCycle = session.metadata?.billing_cycle || "monthly";
        if (billingCycle === "yearly") {
          const oneYearFromNow = new Date();
          oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
          updateData.subscription_ends_at = oneYearFromNow.toISOString();
          updateData.subscription_period_start = new Date().toISOString();
        } else {
          const oneMonthFromNow = new Date();
          oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
          updateData.subscription_ends_at = oneMonthFromNow.toISOString();
          updateData.subscription_period_start = new Date().toISOString();
        }
        
        const { error, data: fallbackData } = await supabase
          .from("schools")
          .update(updateData)
          .eq("id", schoolId)
          .select();
          
        if (error) {
          logStep("ERROR in fallback update", { error: error.message });
        } else {
          logStep("Fallback update successful", { schoolId, plan, billingCycle, updateData });
        }
      }
    }
  } else {
    logStep("WARNING: Session is not a subscription", { 
      mode: session.mode,
      sessionId: session.id 
    });
  }
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  supabase: any,
  stripe?: Stripe
) {
  logStep("Handling subscription updated", { subscriptionId: subscription.id });

  const customerId = subscription.customer as string;
  let schoolId = await getSchoolIdFromCustomer(customerId, supabase);

  // Fallback: try to get school_id from customer metadata
  if (!schoolId && stripe) {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (customer && !customer.deleted && customer.metadata?.school_id) {
        schoolId = customer.metadata.school_id;
        logStep("Found school_id from customer metadata", { schoolId, customerId });
      }
    } catch (err) {
      logStep("Error retrieving customer", { error: err.message });
    }
  }

  if (!schoolId) {
    logStep("WARNING: Could not find school for customer", { customerId });
    return;
  }

  await updateSchoolSubscription(subscription, schoolId, customerId, supabase);
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: any,
  stripe?: Stripe
) {
  logStep("Handling subscription deleted", { subscriptionId: subscription.id });

  const customerId = subscription.customer as string;
  let schoolId = await getSchoolIdFromCustomer(customerId, supabase);

  // Fallback: try to get school_id from customer metadata
  if (!schoolId && stripe) {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (customer && !customer.deleted && customer.metadata?.school_id) {
        schoolId = customer.metadata.school_id;
        logStep("Found school_id from customer metadata", { schoolId, customerId });
      }
    } catch (err) {
      logStep("Error retrieving customer", { error: err.message });
    }
  }

  if (!schoolId) {
    logStep("WARNING: Could not find school for customer", { customerId });
    return;
  }

  // Update school subscription status to expired
  const { error } = await supabase
    .from("schools")
    .update({
      subscription_status: "expired",
      subscription_plan: null,
      subscription_ends_at: null,
    })
    .eq("id", schoolId);

  if (error) {
    logStep("ERROR updating school subscription", { error: error.message, schoolId });
    throw error;
  }

  logStep("School subscription marked as expired", { schoolId });
}

async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice,
  supabase: any,
  stripe?: Stripe
) {
  logStep("Handling invoice payment succeeded", { invoiceId: invoice.id });

  if (!invoice.subscription) {
    logStep("Invoice is not for a subscription, skipping");
    return;
  }

  const customerId = invoice.customer as string;
  let schoolId = await getSchoolIdFromCustomer(customerId, supabase);

  // Fallback: try to get school_id from customer metadata
  if (!schoolId && stripe) {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (customer && !customer.deleted && customer.metadata?.school_id) {
        schoolId = customer.metadata.school_id;
        logStep("Found school_id from customer metadata", { schoolId, customerId });
      }
    } catch (err) {
      logStep("Error retrieving customer", { error: err.message });
    }
  }

  if (!schoolId) {
    logStep("WARNING: Could not find school for customer", { customerId });
    return;
  }

  // Ensure subscription is active
  const { data: school } = await supabase
    .from("schools")
    .select("subscription_status")
    .eq("id", schoolId)
    .single();

  if (school && school.subscription_status !== "active") {
    logStep("Reactivating subscription after successful payment", { schoolId });
    // The subscription.updated event should handle this, but we'll ensure it's active
    const { error } = await supabase
      .from("schools")
      .update({
        subscription_status: "active",
      })
      .eq("id", schoolId);

    if (error) {
      logStep("ERROR reactivating subscription", { error: error.message });
    }
  }
}

async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  supabase: any,
  stripe?: Stripe
) {
  logStep("Handling invoice payment failed", { invoiceId: invoice.id });

  if (!invoice.subscription) {
    return;
  }

  const customerId = invoice.customer as string;
  let schoolId = await getSchoolIdFromCustomer(customerId, supabase);

  // Fallback: try to get school_id from customer metadata
  if (!schoolId && stripe) {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (customer && !customer.deleted && customer.metadata?.school_id) {
        schoolId = customer.metadata.school_id;
        logStep("Found school_id from customer metadata", { schoolId, customerId });
      }
    } catch (err) {
      logStep("Error retrieving customer", { error: err.message });
    }
  }

  if (!schoolId) {
    logStep("WARNING: Could not find school for customer", { customerId });
    return;
  }

  // Don't immediately expire - Stripe gives grace period
  // But we could mark it as past_due if needed
  logStep("Payment failed for subscription", { schoolId, invoiceId: invoice.id });
}

async function updateSchoolSubscription(
  subscription: Stripe.Subscription,
  schoolId: string,
  customerId: string,
  supabase: any,
  planFromMetadata?: string
) {
  // Determine plan name from metadata (in priority order)
  let planName: string | null = planFromMetadata ?? null;

  if (!planName && subscription.metadata?.plan) {
    planName = subscription.metadata.plan;
  }

  if (!planName && subscription.items.data.length > 0) {
    const price = subscription.items.data[0]?.price;
    if (price?.metadata?.plan) {
      planName = price.metadata.plan;
    }
  }

  // Map Stripe subscription status to our status
  let subscriptionStatus: string;
  if (subscription.status === "active") {
    subscriptionStatus = "active";
  } else if (subscription.status === "trialing") {
    subscriptionStatus = "trial";
  } else {
    subscriptionStatus = "expired";
  }

  // Calculate subscription dates
  const subscriptionEndsAt = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;
  
  const subscriptionPeriodStart = subscription.current_period_start
    ? new Date(subscription.current_period_start * 1000).toISOString()
    : null;

  // Jeśli subskrypcja jest aktywna, kończymy trial i ustawiamy trial_ends_at na null
  // Jeśli subskrypcja jest aktywna, trial_ends_at powinien być ustawiony na null
  // ponieważ użytkownik kupił plan i trial się kończy
  const trialEndsAt = subscription.status === "active" ? null : undefined;

  // Prepare update data
  const updateData: any = {
    stripe_customer_id: customerId,
    subscription_status: subscriptionStatus,
    subscription_plan: planName,
    subscription_ends_at: subscriptionEndsAt,
    subscription_period_start: subscriptionPeriodStart,
    updated_at: new Date().toISOString(),
  };

  // Jeśli subskrypcja jest aktywna, kończymy trial
  if (subscription.status === "active") {
    updateData.trial_ends_at = null;
  }

  logStep("Updating school subscription", {
    schoolId,
    updateData,
    subscriptionStatus: subscription.status,
    subscriptionId: subscription.id,
    trialEndsAt: updateData.trial_ends_at,
  });

  const { error, data } = await supabase
    .from("schools")
    .update(updateData)
    .eq("id", schoolId)
    .select();

  if (error) {
    logStep("ERROR updating school subscription", { 
      error: error.message, 
      schoolId,
      details: error 
    });
    throw error;
  }

  logStep("School subscription updated successfully", {
    schoolId,
    status: updateData.subscription_status,
    plan: planName,
    periodStart: subscriptionPeriodStart,
    endsAt: subscriptionEndsAt,
    trialEndsAt: updateData.trial_ends_at,
    updatedRows: data?.length || 0,
  });
}

async function getSchoolIdFromCustomer(customerId: string, supabase: any): Promise<string | null> {
  // Try to find school by stripe_customer_id first
  const { data: schoolByCustomer } = await supabase
    .from("schools")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (schoolByCustomer) {
    return schoolByCustomer.id;
  }

  // If not found, try to get from Stripe customer metadata
  // This is a fallback - ideally customer_id should be set during checkout
  logStep("School not found by customer_id, checking metadata", { customerId });
  return null;
}

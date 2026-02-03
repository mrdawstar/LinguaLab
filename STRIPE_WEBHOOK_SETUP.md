# Stripe Webhook Setup Guide

This guide explains how to set up the Stripe webhook for subscription management.

## Overview

The Stripe webhook Edge Function (`stripe-webhook`) handles subscription events and updates the school's subscription status in the database. This ensures that:

- Subscription status is always accurate (webhook is the source of truth)
- All users assigned to a school get access when subscription is active
- Subscription changes are reflected immediately

## Setup Instructions

### 1. Deploy the Edge Function

The webhook function is located at `supabase/functions/stripe-webhook/index.ts`. Deploy it using:

```bash
supabase functions deploy stripe-webhook
```

### 2. Configure Environment Variables

Ensure the following environment variables are set in your Supabase project:

- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Your Stripe webhook signing secret (see step 3)
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key

### 3. Create Webhook Endpoint in Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter your webhook URL:
   ```
   https://[YOUR_PROJECT_REF].supabase.co/functions/v1/stripe-webhook
   ```
4. Select the following events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Signing secret** (starts with `whsec_`)
6. Set it as `STRIPE_WEBHOOK_SECRET` in your Supabase project secrets

### 4. Set Supabase Secrets

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

Or set it in the Supabase Dashboard under Project Settings > Edge Functions > Secrets.

## How It Works

### Subscription Flow

1. **Admin initiates purchase**: Only users with `admin` role can create checkout sessions
2. **Checkout session created**: `create-checkout` function validates admin role and creates Stripe checkout
3. **Payment completed**: Stripe sends `checkout.session.completed` event
4. **Webhook updates database**: Webhook updates the school's subscription status
5. **Users get access**: All users in that school can access the app

### Event Handling

The webhook handles the following events:

- **`checkout.session.completed`**: When payment is successful, updates school subscription
- **`customer.subscription.created`**: When subscription is created, marks school as active
- **`customer.subscription.updated`**: When subscription changes, updates school status
- **`customer.subscription.deleted`**: When subscription is cancelled, marks school as expired
- **`invoice.payment_succeeded`**: Ensures subscription stays active after payment
- **`invoice.payment_failed`**: Logs payment failures (doesn't immediately expire)

### Database Updates

The webhook updates the `schools` table with:
- `subscription_status`: `"active"`, `"expired"`, or Stripe status
- `subscription_plan`: `"basic"` or `"pro"`
- `subscription_ends_at`: End date of current billing period
- `stripe_customer_id`: Stripe customer ID for future lookups

### Access Control

- **Subscription check**: `check-subscription` function reads from database (not Stripe API)
- **Access allowed**: Users get access if subscription is active OR trial is active
- **School-wide access**: All users assigned to a school share the same subscription status

## Testing

### Test Webhook Locally

1. Use Stripe CLI to forward webhooks:
   ```bash
   stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
   ```

2. Trigger test events:
   ```bash
   stripe trigger checkout.session.completed
   stripe trigger customer.subscription.created
   ```

### Verify in Database

After a successful payment, check the `schools` table:
```sql
SELECT id, name, subscription_status, subscription_plan, subscription_ends_at 
FROM schools 
WHERE subscription_status = 'active';
```

## Troubleshooting

### Webhook not receiving events

- Verify webhook URL is correct in Stripe dashboard
- Check Supabase Edge Function logs: `supabase functions logs stripe-webhook`
- Ensure `STRIPE_WEBHOOK_SECRET` is set correctly

### Subscription not updating

- Check webhook logs for errors
- Verify school_id is in checkout session metadata
- Ensure `stripe_customer_id` is stored in schools table

### Users can't access after payment

- Verify subscription_status is "active" in database
- Check trial_ends_at hasn't expired
- Ensure user is assigned to the correct school

## Security Notes

- Webhook signature verification ensures events are from Stripe
- Admin role validation prevents unauthorized purchases
- Service role key is used only in Edge Functions (never exposed to client)
- Customer ID is stored securely and used for lookups
